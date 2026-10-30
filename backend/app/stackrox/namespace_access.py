"""Cross-cluster namespace access from StackRox namespace annotations.

The auth-header-injector of a spoke only sees its own cluster, so
``X-Forwarded-Namespaces`` only carries ``ns:<origin>`` pairs. Central mirrors
every secured cluster's namespace annotations, so the backend can resolve the
same ``rhacs-manager.io/users`` / ``rhacs-manager.io/groups`` annotations on
other clusters.

Trust is opt-in per cluster set (``settings.cross_cluster_access_sets``): a
request from cluster ``A`` only gains namespaces from clusters that share a set
with ``A`` (its peers). Any admin of a cluster can create users or groups there,
so clusters must only share a set when they share an identity provider and admin
trust. The origin cluster itself always comes from the injector header, which is
fresher than Central.

Each process keeps its own snapshot, refreshed every ``REFRESH_INTERVAL_SECONDS``
by ``run_refresh_loop``. Unlike ``effective_scores`` this fails closed: a snapshot
older than ``MAX_STALENESS_SECONDS`` is ignored, so a revoked annotation never
keeps granting access while refreshes fail. Requests then see only the origin
cluster. Normal requests never touch the database; only the very first request
of a process (before the loop loaded) may load on demand, bounded by
``COLD_LOAD_TIMEOUT_SECONDS``.
"""

import asyncio
import logging
import time
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings

logger = logging.getLogger(__name__)

REFRESH_INTERVAL_SECONDS = 300
ERROR_RETRY_SECONDS = 30
MAX_STALENESS_SECONDS = 3 * REFRESH_INTERVAL_SECONDS
COLD_LOAD_TIMEOUT_SECONDS = 2.0
# After a failed on-demand load, requests skip peer clusters for this long before retrying.
LOAD_RETRY_SECONDS = 30
# Stale-snapshot warnings are logged at most this often per process.
STALE_WARNING_INTERVAL_SECONDS = 60


@dataclass(frozen=True)
class ClusterAccess:
    """Lowercase username / group name -> namespaces on one cluster."""

    users: dict[str, frozenset[str]]
    groups: dict[str, frozenset[str]]


@dataclass(frozen=True)
class NamespaceAccessIndex:
    """Immutable snapshot; swapped as a whole so readers never see a half-built map."""

    clusters: dict[str, ClusterAccess]
    loaded_at: float  # time.monotonic()


_state: NamespaceAccessIndex | None = None
_last_failed_at: float | None = None
_last_stale_warning_at: float | None = None
_load_lock = asyncio.Lock()


def configured_clusters(access_sets: list[list[str]]) -> list[str]:
    """Every cluster name that appears in any access set, sorted and deduplicated."""
    return sorted({name.strip() for access_set in access_sets for name in access_set if name.strip()})


def peer_clusters(origin: str, access_sets: list[list[str]]) -> set[str]:
    """Clusters sharing at least one set with ``origin``, excluding ``origin`` itself."""
    origin = origin.strip()
    if not origin:
        return set()
    peers: set[str] = set()
    for access_set in access_sets:
        names = {name.strip() for name in access_set if name.strip()}
        if origin in names:
            peers |= names
    peers.discard(origin)
    return peers


def _split_names(raw: str | None) -> list[str]:
    """Split a comma-separated annotation value like the injector: trim, lowercase, drop empty."""
    if not raw:
        return []
    return [name.strip().lower() for name in raw.split(",") if name.strip()]


def build_access_index(rows: Iterable[Mapping[str, Any]], loaded_at: float) -> NamespaceAccessIndex:
    """Build the snapshot from ``get_namespace_access_annotations`` rows."""
    users: dict[str, dict[str, set[str]]] = {}
    groups: dict[str, dict[str, set[str]]] = {}
    for row in rows:
        cluster = row["cluster_name"]
        namespace = row["namespace"]
        if not cluster or not namespace:
            continue
        for username in _split_names(row.get("users")):
            users.setdefault(cluster, {}).setdefault(username, set()).add(namespace)
        for group in _split_names(row.get("groups")):
            groups.setdefault(cluster, {}).setdefault(group, set()).add(namespace)

    clusters: dict[str, ClusterAccess] = {}
    for cluster in users.keys() | groups.keys():
        clusters[cluster] = ClusterAccess(
            users={name: frozenset(ns) for name, ns in users.get(cluster, {}).items()},
            groups={name: frozenset(ns) for name, ns in groups.get(cluster, {}).items()},
        )
    return NamespaceAccessIndex(clusters=clusters, loaded_at=loaded_at)


def namespaces_for(
    index: NamespaceAccessIndex,
    peers: Iterable[str],
    username: str,
    groups: Iterable[str],
) -> list[tuple[str, str]]:
    """(namespace, cluster) pairs on ``peers`` annotated for the user or any of the groups."""
    user_key = username.strip().lower()
    group_keys = {group.strip().lower() for group in groups if group.strip()}
    pairs: set[tuple[str, str]] = set()
    for cluster in peers:
        access = index.clusters.get(cluster)
        if access is None:
            continue
        for namespace in access.users.get(user_key, frozenset()):
            pairs.add((namespace, cluster))
        for group in group_keys:
            for namespace in access.groups.get(group, frozenset()):
                pairs.add((namespace, cluster))
    return sorted(pairs, key=lambda pair: (pair[1], pair[0]))


def set_namespace_access(rows: Iterable[Mapping[str, Any]], loaded_at: float | None = None) -> NamespaceAccessIndex:
    """Replace the process-wide snapshot. Used by refreshes and tests."""
    global _state, _last_failed_at
    _state = build_access_index(rows, time.monotonic() if loaded_at is None else loaded_at)
    _last_failed_at = None
    return _state


def reset_namespace_access() -> None:
    """Drop the snapshot and failure state (tests)."""
    global _state, _last_failed_at, _last_stale_warning_at
    _state = None
    _last_failed_at = None
    _last_stale_warning_at = None


async def refresh_namespace_access(session: AsyncSession) -> NamespaceAccessIndex:
    """Load annotations of every configured cluster and publish a new snapshot."""
    async with _load_lock:
        return await _refresh_unlocked(session)


async def _refresh_unlocked(session: AsyncSession) -> NamespaceAccessIndex:
    """Query and publish. Caller must hold ``_load_lock``."""
    from . import queries as sx

    clusters = configured_clusters(settings.cross_cluster_access_sets)
    started = time.monotonic()
    rows = await sx.get_namespace_access_annotations(
        session,
        clusters,
        settings.namespace_user_annotation,
        settings.namespace_group_annotation,
    )
    snapshot = set_namespace_access(rows)
    logger.info(
        "Cross-cluster namespace access refreshed",
        extra={
            "clusters": clusters,
            "clusters_with_annotations": sorted(snapshot.clusters),
            "mapped_users": sum(len(access.users) for access in snapshot.clusters.values()),
            "mapped_groups": sum(len(access.groups) for access in snapshot.clusters.values()),
            "annotated_namespaces": len(rows),
            "duration_ms": round((time.monotonic() - started) * 1000),
        },
    )
    return snapshot


async def _load_on_demand() -> NamespaceAccessIndex | None:
    """First load when a request arrives before the refresh loop finished.

    Uses its own session so a failure never aborts the caller's transaction, and
    is bounded by ``COLD_LOAD_TIMEOUT_SECONDS`` (lock wait included).
    """
    global _last_failed_at
    if _last_failed_at is not None and time.monotonic() - _last_failed_at < LOAD_RETRY_SECONDS:
        return None
    from ..database import StackRoxSessionLocal

    try:
        async with asyncio.timeout(COLD_LOAD_TIMEOUT_SECONDS):
            async with _load_lock:
                if _state is not None:
                    return _state
                # Requests queued behind a failed load must not each retry the DB.
                if _last_failed_at is not None and time.monotonic() - _last_failed_at < LOAD_RETRY_SECONDS:
                    return None
                async with StackRoxSessionLocal() as session:
                    return await _refresh_unlocked(session)
    except Exception:
        _last_failed_at = time.monotonic()
        logger.warning(
            "Cross-cluster namespace access could not be loaded; using origin cluster only",
            extra={"retry_after_seconds": LOAD_RETRY_SECONDS, "timeout_seconds": COLD_LOAD_TIMEOUT_SECONDS},
            exc_info=True,
        )
        return None


def _is_stale(snapshot: NamespaceAccessIndex) -> bool:
    global _last_stale_warning_at
    age = time.monotonic() - snapshot.loaded_at
    if age <= MAX_STALENESS_SECONDS:
        return False
    now = time.monotonic()
    if _last_stale_warning_at is None or now - _last_stale_warning_at >= STALE_WARNING_INTERVAL_SECONDS:
        _last_stale_warning_at = now
        logger.warning(
            "Cross-cluster namespace access snapshot is stale; using origin cluster only",
            extra={"age_seconds": round(age), "max_staleness_seconds": MAX_STALENESS_SECONDS},
        )
    return True


async def resolve_cross_cluster_namespaces(
    origin_cluster: str,
    username: str,
    groups: Iterable[str],
) -> list[tuple[str, str]]:
    """Namespaces on the origin's peer clusters annotated for the user or their groups.

    Returns ``[]`` when the origin has no peers, and fails closed (``[]``) when
    no fresh snapshot is available.
    """
    peers = peer_clusters(origin_cluster, settings.cross_cluster_access_sets)
    if not peers:
        return []
    snapshot = _state
    if snapshot is None:
        snapshot = await _load_on_demand()
    if snapshot is None or _is_stale(snapshot):
        return []
    return namespaces_for(snapshot, peers, username, groups)


async def run_refresh_loop() -> None:
    """Refresh now and then every ``REFRESH_INTERVAL_SECONDS`` (``ERROR_RETRY_SECONDS`` after a failure)."""
    from ..database import StackRoxSessionLocal

    while True:
        delay = REFRESH_INTERVAL_SECONDS
        try:
            async with StackRoxSessionLocal() as session:
                await refresh_namespace_access(session)
        except asyncio.CancelledError:
            raise
        except Exception:
            delay = ERROR_RETRY_SECONDS
            logger.exception(
                "Cross-cluster namespace access refresh failed; snapshot expires when stale",
                extra={"has_snapshot": _state is not None, "retry_in_seconds": delay},
            )
        await asyncio.sleep(delay)
