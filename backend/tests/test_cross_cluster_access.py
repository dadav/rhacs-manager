"""Cross-cluster namespace visibility (CROSS_CLUSTER_ACCESS_SETS).

A user signing in through one spoke also gets the namespaces annotated for them
(user or group annotation) on the clusters that share an access set with the
origin cluster. The origin cluster's own namespaces always come from the
injector header. Missing or stale annotation data must fail closed to the origin
cluster only and never break sign-in.
"""

import asyncio
import time
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock

import pytest

from app import database
from app.auth.middleware import _handle_spoke_proxy
from app.config import settings
from app.i18n import ApiError
from app.models.user import User
from app.stackrox import namespace_access as na
from app.stackrox import queries as sx

ROWS = [
    # Same namespace name on prod and test must stay two distinct pairs.
    {"cluster_name": "prod", "namespace": "payments", "users": None, "groups": "Payments-Devs, ops"},
    {"cluster_name": "prod", "namespace": "billing", "users": " Alice ,bob", "groups": None},
    {"cluster_name": "test", "namespace": "payments", "users": None, "groups": "payments-devs"},
    {"cluster_name": "dev", "namespace": "sandbox", "users": "alice", "groups": "payments-devs"},
]


@pytest.fixture(autouse=True)
def _reset_namespace_access(monkeypatch):
    na.reset_namespace_access()
    monkeypatch.setattr(settings, "cross_cluster_access_sets", [["prod", "test"]])
    yield
    na.reset_namespace_access()


class _UserStore:
    """Fake AsyncSession holding at most one users row (enough for spoke sync)."""

    def __init__(self) -> None:
        self.user: User | None = None
        self.session = AsyncMock()
        self.session.execute = AsyncMock(side_effect=self._execute)
        self.session.add = MagicMock(side_effect=self._add)
        self.session.commit = AsyncMock()
        self.session.refresh = AsyncMock()

    async def _execute(self, _stmt):
        result = MagicMock()
        result.scalar_one_or_none.return_value = self.user
        return result

    def _add(self, obj) -> None:
        if isinstance(obj, User):
            self.user = obj


def _spoke_request(*, cluster: str, namespaces: str, groups: str = "", user: str = "alice") -> MagicMock:
    request = MagicMock()
    request.headers = {
        "X-Forwarded-User": user,
        "X-Forwarded-Groups": groups,
        "X-Forwarded-Namespaces": namespaces,
        "X-Forwarded-Cluster": cluster,
    }
    return request


def _patch_loader(monkeypatch, fetch) -> None:
    """Route on-demand loads to ``fetch`` without a real StackRox DB."""

    @asynccontextmanager
    async def fake_session():
        yield MagicMock()

    monkeypatch.setattr(database, "StackRoxSessionLocal", fake_session)
    monkeypatch.setattr(sx, "get_namespace_access_annotations", fetch)


# --- pure helpers -------------------------------------------------------------


def test_index_is_case_insensitive_trimmed_and_per_cluster():
    index = na.build_access_index(ROWS, loaded_at=0)
    assert index.clusters["prod"].groups["payments-devs"] == frozenset({"payments"})
    assert index.clusters["prod"].groups["ops"] == frozenset({"payments"})
    assert index.clusters["prod"].users["alice"] == frozenset({"billing"})
    assert index.clusters["prod"].users["bob"] == frozenset({"billing"})
    assert index.clusters["test"].groups["payments-devs"] == frozenset({"payments"})


def test_peer_clusters():
    sets = [["prod", "test"], ["test", "staging"], ["dev"]]
    assert na.peer_clusters("prod", sets) == {"test"}
    assert na.peer_clusters("test", sets) == {"prod", "staging"}
    assert na.peer_clusters("dev", sets) == set()
    assert na.peer_clusters("hub", sets) == set()
    assert na.peer_clusters("", sets) == set()
    assert na.peer_clusters("prod", []) == set()


def test_namespaces_for_matches_users_and_groups_only_on_peers():
    index = na.build_access_index(ROWS, loaded_at=0)
    assert na.namespaces_for(index, {"prod"}, "ALICE", []) == [("billing", "prod")]
    assert na.namespaces_for(index, {"prod", "test"}, "carol", ["PAYMENTS-DEVS"]) == [
        ("payments", "prod"),
        ("payments", "test"),
    ]
    assert na.namespaces_for(index, {"prod"}, "carol", ["unknown"]) == []


# --- resolver -----------------------------------------------------------------


async def test_resolve_returns_peer_namespaces_only():
    na.set_namespace_access(ROWS)
    assert await na.resolve_cross_cluster_namespaces("test", "alice", ["payments-devs"]) == [
        ("billing", "prod"),
        ("payments", "prod"),
    ]


async def test_resolve_without_origin_or_peers_is_empty():
    na.set_namespace_access(ROWS)
    assert await na.resolve_cross_cluster_namespaces("", "alice", ["payments-devs"]) == []
    # dev has annotations for alice but is in no set with anyone.
    assert await na.resolve_cross_cluster_namespaces("dev", "alice", ["payments-devs"]) == []
    # Hub default CLUSTER_NAME is not a configured cluster.
    assert await na.resolve_cross_cluster_namespaces("hub", "alice", ["payments-devs"]) == []


async def test_resolve_unconfigured_is_empty(monkeypatch):
    monkeypatch.setattr(settings, "cross_cluster_access_sets", [])
    na.set_namespace_access(ROWS)
    assert await na.resolve_cross_cluster_namespaces("test", "alice", ["payments-devs"]) == []


async def test_stale_snapshot_fails_closed():
    na.set_namespace_access(ROWS, loaded_at=time.monotonic() - na.MAX_STALENESS_SECONDS - 1)
    assert await na.resolve_cross_cluster_namespaces("test", "alice", ["payments-devs"]) == []


async def test_refresh_revokes_removed_annotation():
    na.set_namespace_access(ROWS)
    assert ("billing", "prod") in await na.resolve_cross_cluster_namespaces("test", "alice", [])
    without_alice = [row for row in ROWS if row["namespace"] != "billing"]
    na.set_namespace_access(without_alice)
    assert await na.resolve_cross_cluster_namespaces("test", "alice", []) == []


async def test_cold_load_queries_configured_clusters(monkeypatch):
    calls = []

    async def fetch(_session, clusters, user_key, group_key):
        calls.append((clusters, user_key, group_key))
        return ROWS

    _patch_loader(monkeypatch, fetch)
    assert await na.resolve_cross_cluster_namespaces("test", "alice", []) == [("billing", "prod")]
    assert calls == [(["prod", "test"], "rhacs-manager.io/users", "rhacs-manager.io/groups")]


async def test_cold_load_error_fails_closed_and_backs_off(monkeypatch):
    fetch = AsyncMock(side_effect=RuntimeError("central down"))
    _patch_loader(monkeypatch, fetch)
    assert await na.resolve_cross_cluster_namespaces("test", "alice", []) == []
    assert await na.resolve_cross_cluster_namespaces("test", "alice", []) == []
    assert fetch.await_count == 1  # second request inside LOAD_RETRY_SECONDS skips the DB


async def test_concurrent_cold_loads_share_one_failure(monkeypatch):
    """Requests queued behind a failing load must not each retry the DB."""
    started = asyncio.Event()

    async def failing_fetch(*_args):
        started.set()
        await asyncio.sleep(0.05)
        raise RuntimeError("central down")

    fetch = AsyncMock(side_effect=failing_fetch)
    _patch_loader(monkeypatch, fetch)
    results = await asyncio.gather(*(na.resolve_cross_cluster_namespaces("test", "alice", []) for _ in range(20)))
    assert results == [[]] * 20
    assert fetch.await_count == 1


async def test_cold_load_timeout_fails_closed(monkeypatch):
    async def slow_fetch(*_args):
        await asyncio.sleep(5)
        return ROWS

    _patch_loader(monkeypatch, slow_fetch)
    monkeypatch.setattr(na, "COLD_LOAD_TIMEOUT_SECONDS", 0.05)
    started = time.monotonic()
    assert await na.resolve_cross_cluster_namespaces("test", "alice", []) == []
    assert time.monotonic() - started < 1


# --- spoke-proxy auth -------------------------------------------------------------


async def test_spoke_auth_merges_peer_namespaces():
    na.set_namespace_access(ROWS)
    store = _UserStore()
    user = await _handle_spoke_proxy(
        store.session,
        _spoke_request(cluster="test", namespaces="payments:test", groups="payments-devs"),
    )
    assert user.namespaces == [("payments", "test"), ("billing", "prod"), ("payments", "prod")]
    assert not user.has_all_namespaces


async def test_spoke_auth_ignores_non_peer_origin():
    na.set_namespace_access(ROWS)
    store = _UserStore()
    user = await _handle_spoke_proxy(
        store.session,
        _spoke_request(cluster="dev", namespaces="sandbox:dev", groups="payments-devs"),
    )
    assert user.namespaces == [("sandbox", "dev")]


async def test_spoke_auth_without_cluster_header_is_unchanged():
    na.set_namespace_access(ROWS)
    store = _UserStore()
    user = await _handle_spoke_proxy(store.session, _spoke_request(cluster="", namespaces="payments:test"))
    assert user.namespaces == [("payments", "test")]


async def test_spoke_auth_wildcard_unchanged():
    na.set_namespace_access(ROWS)
    store = _UserStore()
    user = await _handle_spoke_proxy(store.session, _spoke_request(cluster="test", namespaces="*"))
    assert user.has_all_namespaces
    assert user.namespaces == []


async def test_spoke_auth_merged_count_limit(monkeypatch):
    na.set_namespace_access(ROWS)
    monkeypatch.setattr(settings, "max_namespace_count", 2)
    store = _UserStore()
    with pytest.raises(ApiError) as exc_info:
        await _handle_spoke_proxy(
            store.session,
            _spoke_request(cluster="test", namespaces="payments:test", groups="payments-devs"),
        )
    assert exc_info.value.status_code == 400


async def test_spoke_auth_survives_load_failure(monkeypatch):
    _patch_loader(monkeypatch, AsyncMock(side_effect=RuntimeError("central down")))
    store = _UserStore()
    user = await _handle_spoke_proxy(store.session, _spoke_request(cluster="test", namespaces="payments:test"))
    assert user.namespaces == [("payments", "test")]
