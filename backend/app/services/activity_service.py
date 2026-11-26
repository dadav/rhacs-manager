"""ACS activity console: snapshot normalization, diffing, collection, scoped feed.

Flow: the single worker runs ``collect_activity`` every 10 seconds. It reads one
complete StackRox snapshot, compares it with the last committed normalized
snapshot in the app DB, and stores the derived events. ``read_activity_feed``
serves those events to users from the app DB only, authorized by the current
request's namespace pairs.

Sampling observes differences between snapshots: several intermediate changes
between two samples collapse into one observation. This is not a complete
change stream or scan audit log.

Snapshot JSON shapes (``ACTIVITY_SNAPSHOT_VERSION`` 1):

- deployment: ``{"name", "namespace", "cluster_name", "images": [ImageRef]}``
  where ``ImageRef`` is ``{"image_id_v2", "image_digest", "image_name"}`` taken
  from ``deployments_containers``, sorted and deduplicated.
- image (keyed by ``images_v2.id``): ``{"digest", "name", "scan", "pairs"}``;
  ``scan`` is ``None`` or ``{"scan_time", "component_count", "cve_count",
  "fixable_cve_count"}``, ``pairs`` sorted ``[[namespace, cluster], ...]``.
"""

import asyncio
import base64
import binascii
import hashlib
import json
import logging
import time
from collections.abc import Awaitable, Callable, Iterable, Mapping
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from pydantic import TypeAdapter
from sqlalchemy import and_, delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser
from ..database import StackRoxSessionLocal
from ..i18n import ApiError
from ..models.activity import (
    ACTIVITY_SNAPSHOT_VERSION,
    COLLECTOR_STATE_ID,
    ActivityCollectorState,
    ActivityEvent,
    ActivitySnapshot,
)
from ..routers._scope import narrow_namespaces
from ..schemas.activity import ActivityEventItem, ActivityFeed, CollectorStatus
from ..stackrox.queries.activity import get_activity_snapshot_rows

logger = logging.getLogger(__name__)

RETENTION = timedelta(hours=24)
LIVE_THRESHOLD = timedelta(seconds=30)
SOURCE_TIMEOUT_SECONDS = 5.0

DEPLOYMENT = "deployment"
IMAGE = "image"

CURSOR_VERSION = 1
MAX_CURSOR_LENGTH = 512
MAX_EVENT_ID = 2**63 - 1
# Tolerated clock skew between API replicas for a cursor's issue time.
CURSOR_FUTURE_TOLERANCE = timedelta(minutes=5)

# Deterministic insert order inside one observation.
_KIND_ORDER = {
    "deployment_removed": 0,
    "deployment_observed": 1,
    "deployment_images_changed": 2,
    "image_scanned": 3,
    "image_scan_updated": 4,
}

_EVENT_ADAPTER: TypeAdapter = TypeAdapter(ActivityEventItem)


class ActivitySourceError(ValueError):
    """The source snapshot contradicts itself; the collection must not guess."""


# --------------------------------------------------------------------------- time


def to_utc(value: datetime | None) -> datetime | None:
    """Aware UTC datetime. StackRox and app DB timestamps are naive UTC."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def to_naive_utc(value: datetime) -> datetime:
    """Naive UTC for app DB columns (the repository convention)."""
    return value.astimezone(UTC).replace(tzinfo=None) if value.tzinfo else value


def utc_iso(value: datetime | None) -> str | None:
    """Stable serialization: microsecond precision, explicit ``Z``."""
    aware = to_utc(value)
    if aware is None:
        return None
    return aware.isoformat(timespec="microseconds").replace("+00:00", "Z")


def parse_utc_iso(value: str | None) -> datetime | None:
    if value is None:
        return None
    return to_utc(datetime.fromisoformat(value.replace("Z", "+00:00")))


def _utcnow() -> datetime:
    return datetime.now(UTC)


# ------------------------------------------------------------------ normalization


@dataclass(frozen=True)
class NormalizedSnapshot:
    deployments: dict[str, dict]
    images: dict[str, dict]
    skipped_deployments: int


def _is_blank(value: str | None) -> bool:
    return value is None or not value.strip()


def _ref_sort_key(ref: Mapping) -> tuple[str, str, str]:
    return (ref["image_id_v2"] or "", ref["image_digest"] or "", ref["image_name"] or "")


def _scan_signature(row: Mapping) -> dict | None:
    """Valid scan = an ``images_v2`` row with a scan timestamp. Missing counts stay null."""
    if row["image_id_v2"] is None or row["scan_time"] is None:
        return None
    return {
        "scan_time": utc_iso(row["scan_time"]),
        "component_count": row["component_count"],
        "cve_count": row["cve_count"],
        "fixable_cve_count": row["fixable_cve_count"],
    }


def _image_metadata(row: Mapping) -> tuple | None:
    """Fields that come from the ``images_v2`` row itself (unique per id)."""
    if row["image_id_v2"] is None:
        return None
    return (
        row["image_digest"],
        row["image_name"],
        utc_iso(row["scan_time"]),
        row["component_count"],
        row["cve_count"],
        row["fixable_cve_count"],
    )


def normalize_snapshot(rows: Iterable[Mapping]) -> NormalizedSnapshot:
    """Build the deployment and image maps from raw snapshot rows (pure).

    Ignores row order and duplicate containers. Deployments with a blank cluster
    or namespace are skipped (never widened to a global scope). Raises
    ``ActivitySourceError`` on contradictory rows for one source identity.
    """
    identities: dict[str, dict] = {}
    refs: dict[str, set[tuple]] = {}
    skipped: set[str] = set()
    image_pairs: dict[str, set[tuple[str, str]]] = {}
    image_rows: dict[str, Mapping | None] = {}
    image_metadata: dict[str, tuple | None] = {}
    fallback_digests: dict[str, set[str]] = {}
    fallback_names: dict[str, set[str]] = {}

    for row in rows:
        deployment_id = row["deployment_id"]
        namespace = row["namespace"]
        cluster_name = row["cluster_name"]
        if _is_blank(deployment_id) or _is_blank(namespace) or _is_blank(cluster_name):
            skipped.add(deployment_id or "")
            continue
        identity = {"name": row["deployment_name"], "namespace": namespace, "cluster_name": cluster_name}
        known = identities.get(deployment_id)
        if known is None:
            identities[deployment_id] = identity
            refs[deployment_id] = set()
        elif known != identity:
            raise ActivitySourceError(f"deployment {deployment_id} has contradictory source rows")

        ref = (row["container_image_idv2"], row["container_image_digest"], row["container_image_name"])
        if any(value is not None for value in ref):
            refs[deployment_id].add(ref)

        image_id = row["container_image_idv2"]
        if image_id is None:
            continue
        image_pairs.setdefault(image_id, set()).add((namespace, cluster_name))
        metadata = _image_metadata(row)
        if image_id not in image_metadata:
            image_metadata[image_id] = metadata
            image_rows[image_id] = row if metadata is not None else None
        elif image_metadata[image_id] != metadata:
            raise ActivitySourceError(f"image {image_id} has contradictory source rows")
        if row["container_image_digest"]:
            fallback_digests.setdefault(image_id, set()).add(row["container_image_digest"])
        if row["container_image_name"]:
            fallback_names.setdefault(image_id, set()).add(row["container_image_name"])

    deployments: dict[str, dict] = {}
    for deployment_id, identity in identities.items():
        images = [
            {"image_id_v2": v2, "image_digest": digest, "image_name": name} for v2, digest, name in refs[deployment_id]
        ]
        deployments[deployment_id] = {**identity, "images": sorted(images, key=_ref_sort_key)}

    images_out: dict[str, dict] = {}
    for image_id, pairs in image_pairs.items():
        row = image_rows.get(image_id)
        digest = row["image_digest"] if row is not None else None
        name = row["image_name"] if row is not None else None
        images_out[image_id] = {
            # The v2 metadata row may not have arrived yet; fall back to the
            # container's reference so the association is preserved.
            "digest": digest or min(fallback_digests.get(image_id, {None}) - {None}, default=None),
            "name": name or min(fallback_names.get(image_id, {None}) - {None}, default=None),
            "scan": _scan_signature(row) if row is not None else None,
            "pairs": [list(pair) for pair in sorted(pairs)],
        }

    return NormalizedSnapshot(
        deployments=deployments,
        images=images_out,
        skipped_deployments=len(skipped - set(identities)),
    )


# --------------------------------------------------------------------------- diff


@dataclass(frozen=True)
class EventDraft:
    kind: str
    cluster_name: str
    namespace: str
    source_at: datetime | None
    details: dict


@dataclass(frozen=True)
class ActivityComputation:
    events: list[EventDraft]
    deployments: dict[str, dict]
    images: dict[str, dict]


def carry_forward_scans(previous_images: Mapping[str, dict], current_images: Mapping[str, dict]) -> dict[str, dict]:
    """Keep the last valid scan while a still-referenced image has none (returns new dicts)."""
    merged: dict[str, dict] = {}
    for image_id, current in current_images.items():
        previous = previous_images.get(image_id)
        if current["scan"] is None and previous is not None and previous.get("scan") is not None:
            merged[image_id] = {**current, "scan": previous["scan"]}
        else:
            merged[image_id] = current
    return merged


def scan_event_kind(previous_scan: dict | None, current_scan: dict | None) -> str | None:
    """``image_scanned`` for a first or newer scan timestamp, ``image_scan_updated`` for other changes."""
    if current_scan is None or current_scan == previous_scan:
        return None
    if previous_scan is None:
        return "image_scanned"
    if parse_utc_iso(current_scan["scan_time"]) > parse_utc_iso(previous_scan["scan_time"]):
        return "image_scanned"
    return "image_scan_updated"


def _deployment_event(kind: str, deployment_id: str, snapshot: dict) -> EventDraft:
    return EventDraft(
        kind=kind,
        cluster_name=snapshot["cluster_name"],
        namespace=snapshot["namespace"],
        source_at=None,
        details={"deployment_id": deployment_id, "deployment_name": snapshot["name"]},
    )


def _deployment_events(previous: Mapping[str, dict], current: Mapping[str, dict]) -> list[EventDraft]:
    events: list[EventDraft] = []
    for deployment_id in sorted(previous.keys() - current.keys()):
        events.append(_deployment_event("deployment_removed", deployment_id, previous[deployment_id]))
    for deployment_id in sorted(current.keys() - previous.keys()):
        events.append(_deployment_event("deployment_observed", deployment_id, current[deployment_id]))
    for deployment_id in sorted(previous.keys() & current.keys()):
        old = previous[deployment_id]
        new = current[deployment_id]
        if (old["namespace"], old["cluster_name"]) != (new["namespace"], new["cluster_name"]):
            # Each event carries only its own pair's data.
            events.append(_deployment_event("deployment_removed", deployment_id, old))
            events.append(_deployment_event("deployment_observed", deployment_id, new))
            continue
        old_refs = {_ref_sort_key(ref): ref for ref in old["images"]}
        new_refs = {_ref_sort_key(ref): ref for ref in new["images"]}
        if old_refs.keys() == new_refs.keys():
            continue
        added = [new_refs[key] for key in sorted(new_refs.keys() - old_refs.keys())]
        removed = [old_refs[key] for key in sorted(old_refs.keys() - new_refs.keys())]
        draft = _deployment_event("deployment_images_changed", deployment_id, new)
        draft.details.update({"added_images": added, "removed_images": removed})
        events.append(draft)
    return events


def _image_events(previous: Mapping[str, dict], current: Mapping[str, dict]) -> list[EventDraft]:
    events: list[EventDraft] = []
    # First-seen images baseline silently; removed images produce no image event.
    for image_id in sorted(previous.keys() & current.keys()):
        old = previous[image_id]
        new = current[image_id]
        kind = scan_event_kind(old.get("scan"), new["scan"])
        if kind is None:
            continue
        # Only pairs present before and now: a newly added pair is an inventory
        # change, not a new scan there.
        shared_pairs = {tuple(pair) for pair in old["pairs"]} & {tuple(pair) for pair in new["pairs"]}
        scan = new["scan"]
        for namespace, cluster_name in sorted(shared_pairs):
            events.append(
                EventDraft(
                    kind=kind,
                    cluster_name=cluster_name,
                    namespace=namespace,
                    source_at=parse_utc_iso(scan["scan_time"]),
                    details={
                        "image_id_v2": image_id,
                        "image_digest": new["digest"],
                        "image_name": new["name"],
                        "component_count": scan["component_count"],
                        "cve_count": scan["cve_count"],
                        "fixable_cve_count": scan["fixable_cve_count"],
                    },
                )
            )
    return events


def _event_sort_key(draft: EventDraft) -> tuple:
    resource = draft.details.get("deployment_id") or draft.details.get("image_id_v2") or ""
    return (_KIND_ORDER[draft.kind], draft.cluster_name, draft.namespace, resource)


def compute_activity(
    previous_deployments: Mapping[str, dict],
    previous_images: Mapping[str, dict],
    current: NormalizedSnapshot,
    *,
    initialized: bool,
) -> ActivityComputation:
    """Derive events and the next stored state (pure, never mutates its inputs).

    Before the first successful baseline nothing is emitted.
    """
    images = carry_forward_scans(previous_images, current.images)
    if not initialized:
        return ActivityComputation(events=[], deployments=current.deployments, images=images)
    events = _deployment_events(previous_deployments, current.deployments) + _image_events(previous_images, images)
    events.sort(key=_event_sort_key)
    return ActivityComputation(events=events, deployments=current.deployments, images=images)


# --------------------------------------------------------------------- collection


@dataclass(frozen=True)
class CollectionResult:
    baseline: bool
    event_count: int
    deployment_count: int
    image_count: int
    duration_seconds: float


SourceReader = Callable[[], Awaitable[list[Mapping]]]
Clock = Callable[[], datetime]


async def read_source_snapshot() -> list[dict]:
    """Read the complete StackRox snapshot in its own short-lived read-only session.

    Connection acquisition and the query share one 5-second budget; the session
    is released as soon as the rows are in memory.
    """
    async with asyncio.timeout(SOURCE_TIMEOUT_SECONDS):
        async with StackRoxSessionLocal() as sx_db:
            return await get_activity_snapshot_rows(sx_db, int(SOURCE_TIMEOUT_SECONDS * 1000))


async def _apply_snapshot_changes(
    app_db: AsyncSession,
    stored: Iterable[ActivitySnapshot],
    entity_type: str,
    desired: Mapping[str, dict],
) -> None:
    """Upsert only changed snapshots and delete entities no longer present."""
    existing = {row.entity_id: row for row in stored if row.entity_type == entity_type}
    for entity_id, row in existing.items():
        target = desired.get(entity_id)
        if target is None:
            await app_db.delete(row)
        elif row.snapshot != target:
            row.snapshot = target
    for entity_id in desired.keys() - existing.keys():
        app_db.add(ActivitySnapshot(entity_type=entity_type, entity_id=entity_id, snapshot=desired[entity_id]))


async def collect_activity(
    app_db: AsyncSession,
    read_source: SourceReader = read_source_snapshot,
    clock: Clock = _utcnow,
) -> CollectionResult:
    """One collection in one app DB transaction; any failure rolls back everything.

    The collector singleton row is locked ``FOR UPDATE`` before the source read,
    which serializes concurrent callers and keeps event ids in commit order.
    """
    started = time.monotonic()
    try:
        state = (
            await app_db.execute(
                select(ActivityCollectorState).where(ActivityCollectorState.id == COLLECTOR_STATE_ID).with_for_update()
            )
        ).scalar_one_or_none()
        if state is None:
            raise RuntimeError("activity_collector_state singleton row is missing (run Alembic migrations)")
        if state.snapshot_version != ACTIVITY_SNAPSHOT_VERSION:
            raise RuntimeError(
                f"unsupported activity snapshot version {state.snapshot_version} (expected {ACTIVITY_SNAPSHOT_VERSION})"
            )

        rows = await read_source()
        observed_at = to_naive_utc(clock())
        current = normalize_snapshot(rows)
        if current.skipped_deployments:
            logger.warning(
                "Activity collection skipped deployments with blank cluster or namespace",
                extra={"skipped_deployments": current.skipped_deployments},
            )

        stored = list((await app_db.execute(select(ActivitySnapshot))).scalars().all())
        previous_deployments = {row.entity_id: row.snapshot for row in stored if row.entity_type == DEPLOYMENT}
        previous_images = {row.entity_id: row.snapshot for row in stored if row.entity_type == IMAGE}
        baseline = state.initialized_at is None
        computation = compute_activity(previous_deployments, previous_images, current, initialized=not baseline)

        events = [
            ActivityEvent(
                kind=draft.kind,
                observed_at=observed_at,
                source_at=to_naive_utc(draft.source_at) if draft.source_at else None,
                cluster_name=draft.cluster_name,
                namespace=draft.namespace,
                details=draft.details,
            )
            for draft in computation.events
        ]
        for event in events:
            app_db.add(event)
        await _apply_snapshot_changes(app_db, stored, DEPLOYMENT, computation.deployments)
        await _apply_snapshot_changes(app_db, stored, IMAGE, computation.images)
        await app_db.flush()

        if events:
            state.last_event_id = max(state.last_event_id, *(event.id for event in events))
        state.last_success_at = observed_at
        if state.initialized_at is None:
            state.initialized_at = observed_at
        # Retention never touches the sequence or the high-water mark.
        await app_db.execute(delete(ActivityEvent).where(ActivityEvent.observed_at < observed_at - RETENTION))
        await app_db.commit()
    except Exception:
        await app_db.rollback()
        logger.exception(
            "Activity collection failed; prior state retained",
            extra={"duration_seconds": round(time.monotonic() - started, 3)},
        )
        raise

    result = CollectionResult(
        baseline=baseline,
        event_count=len(events),
        deployment_count=len(computation.deployments),
        image_count=len(computation.images),
        duration_seconds=round(time.monotonic() - started, 3),
    )
    log = logger.info if (baseline or events) else logger.debug
    log(
        "Activity collection complete",
        extra={
            "baseline": result.baseline,
            "event_count": result.event_count,
            "deployment_count": result.deployment_count,
            "image_count": result.image_count,
            "duration_seconds": result.duration_seconds,
        },
    )
    return result


# --------------------------------------------------------------------- feed scope


@dataclass(frozen=True)
class ActivityScope:
    all_access: bool
    # Exact (namespace, cluster) pairs; only meaningful without all_access.
    pairs: tuple[tuple[str, str], ...]
    cluster: str | None
    namespace: str | None
    key: str


def _normalize_filter(value: str | None) -> str | None:
    return value if value is not None and value.strip() else None


def resolve_activity_scope(user: CurrentUser, cluster: str | None, namespace: str | None) -> ActivityScope:
    """Effective access from the current request's user, narrowed by the filters.

    The key is a cache partition / fingerprint, never a grant of authority.
    """
    cluster = _normalize_filter(cluster)
    namespace = _normalize_filter(namespace)
    if user.can_see_all_namespaces:
        pairs: tuple[tuple[str, str], ...] = ()
        access: object = "*"
    else:
        narrowed = narrow_namespaces(list(user.namespaces), cluster, namespace)
        pairs = tuple(sorted({(ns, cl) for ns, cl in narrowed if not _is_blank(ns) and not _is_blank(cl)}))
        access = [list(pair) for pair in pairs]
    canonical = json.dumps(
        {"v": 1, "user": user.id, "cluster": cluster, "namespace": namespace, "access": access},
        sort_keys=True,
        separators=(",", ":"),
    )
    return ActivityScope(
        all_access=user.can_see_all_namespaces,
        pairs=pairs,
        cluster=cluster,
        namespace=namespace,
        key=hashlib.sha256(canonical.encode()).hexdigest(),
    )


def _scope_predicate(scope: ActivityScope):
    """SQL predicate; pairs match both members together (never a cross product)."""
    if scope.all_access:
        conditions = []
        if scope.cluster:
            conditions.append(ActivityEvent.cluster_name == scope.cluster)
        if scope.namespace:
            conditions.append(ActivityEvent.namespace == scope.namespace)
        return and_(*conditions) if conditions else None
    return or_(*(and_(ActivityEvent.namespace == ns, ActivityEvent.cluster_name == cl) for ns, cl in scope.pairs))


# ------------------------------------------------------------------------ cursor


@dataclass(frozen=True)
class ActivityCursor:
    after_id: int
    scope_key: str
    issued_at: datetime


def encode_cursor(cursor: ActivityCursor) -> str:
    payload = {
        "v": CURSOR_VERSION,
        "after_id": str(cursor.after_id),
        "scope_key": cursor.scope_key,
        "issued_at": utc_iso(cursor.issued_at),
    }
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _invalid_cursor() -> ApiError:
    return ApiError(400, "invalid_activity_cursor")


def decode_cursor(token: str, now: datetime) -> ActivityCursor:
    """Parse an untrusted cursor; any deviation is ``invalid_activity_cursor``."""
    if not token or len(token) > MAX_CURSOR_LENGTH:
        raise _invalid_cursor()
    try:
        raw = base64.b64decode(token + "=" * (-len(token) % 4), altchars=b"-_", validate=True)
        payload = json.loads(raw)
    except (binascii.Error, ValueError, UnicodeDecodeError):
        raise _invalid_cursor() from None
    if not isinstance(payload, dict) or type(payload.get("v")) is not int or payload["v"] != CURSOR_VERSION:
        raise _invalid_cursor()
    after_id = payload.get("after_id")
    scope_key = payload.get("scope_key")
    issued_raw = payload.get("issued_at")
    if not isinstance(after_id, str) or not after_id.isdigit() or not after_id.isascii() or len(after_id) > 19:
        raise _invalid_cursor()
    if not isinstance(scope_key, str) or len(scope_key) != 64 or any(c not in "0123456789abcdef" for c in scope_key):
        raise _invalid_cursor()
    if not isinstance(issued_raw, str) or len(issued_raw) > 40:
        raise _invalid_cursor()
    try:
        issued_at = datetime.fromisoformat(issued_raw.replace("Z", "+00:00"))
        if issued_at.tzinfo is None:
            raise _invalid_cursor()
        issued_at = to_utc(issued_at)
    except (ValueError, OverflowError):
        raise _invalid_cursor() from None
    after = int(after_id)
    if after > MAX_EVENT_ID or issued_at is None or issued_at > now + CURSOR_FUTURE_TOLERANCE:
        raise _invalid_cursor()
    return ActivityCursor(after_id=after, scope_key=scope_key, issued_at=issued_at)


# -------------------------------------------------------------------------- feed


def collector_status(
    initialized_at: datetime | None, last_success_at: datetime | None, now: datetime
) -> CollectorStatus:
    if initialized_at is None or last_success_at is None:
        return "waiting"
    return "live" if now - to_utc(last_success_at) <= LIVE_THRESHOLD else "stale"


def _event_item(event: ActivityEvent):
    return _EVENT_ADAPTER.validate_python(
        {
            "id": str(event.id),
            "kind": event.kind,
            "observed_at": to_utc(event.observed_at),
            "source_at": to_utc(event.source_at),
            "cluster_name": event.cluster_name,
            "namespace": event.namespace,
            "details": event.details,
        }
    )


async def _query_events(db: AsyncSession, scope: ActivityScope, conditions: list, order, limit: int):
    predicate = _scope_predicate(scope)
    if predicate is not None:
        conditions = [*conditions, predicate]
    result = await db.execute(select(ActivityEvent).where(*conditions).order_by(order).limit(limit))
    return list(result.scalars().all())


async def read_activity_feed(
    db: AsyncSession,
    user: CurrentUser,
    *,
    cluster: str | None,
    namespace: str | None,
    cursor: str | None,
    limit: int,
    now: datetime | None = None,
) -> ActivityFeed:
    """Scoped feed page from the app DB (never queries StackRox).

    Every query is bounded by the collector's committed ``last_event_id`` (H),
    read once at the start, so events committed mid-request are never skipped.
    """
    now = to_utc(now) if now else _utcnow()
    scope = resolve_activity_scope(user, cluster, namespace)
    parsed = decode_cursor(cursor, now) if cursor is not None else None

    state = (
        await db.execute(
            select(
                ActivityCollectorState.last_event_id,
                ActivityCollectorState.initialized_at,
                ActivityCollectorState.last_success_at,
            ).where(ActivityCollectorState.id == COLLECTOR_STATE_ID)
        )
    ).one_or_none()
    watermark = state.last_event_id if state else 0
    initialized_at = state.initialized_at if state else None
    last_success_at = state.last_success_at if state else None

    reset = parsed is not None and (parsed.scope_key != scope.key or parsed.issued_at < now - RETENTION)
    if parsed is not None and not reset and parsed.after_id > watermark:
        raise _invalid_cursor()

    base_conditions = [
        ActivityEvent.id <= watermark,
        ActivityEvent.observed_at >= to_naive_utc(now - RETENTION),
    ]
    has_access = scope.all_access or bool(scope.pairs)
    has_more = False
    next_after = watermark

    if parsed is None or reset:
        # Initial request: bounded tail of the newest rows, returned ascending.
        rows = await _query_events(db, scope, base_conditions, ActivityEvent.id.desc(), limit) if has_access else []
        rows.reverse()
    else:
        rows = (
            await _query_events(
                db, scope, [*base_conditions, ActivityEvent.id > parsed.after_id], ActivityEvent.id.asc(), limit + 1
            )
            if has_access
            else []
        )
        if len(rows) > limit:
            rows = rows[:limit]
            has_more = True
            next_after = rows[-1].id

    return ActivityFeed(
        items=[_event_item(row) for row in rows],
        next_cursor=encode_cursor(ActivityCursor(after_id=next_after, scope_key=scope.key, issued_at=now)),
        has_more=has_more,
        reset=reset,
        scope_key=scope.key,
        last_success_at=to_utc(last_success_at),
        collector_status=collector_status(initialized_at, last_success_at, now),
    )
