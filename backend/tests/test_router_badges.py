"""Route-level tests for /api/badges visibility.

A scoped (non-privileged) user must only see badges whose scope is fully contained
in their visible namespaces. All-scope badges are visible only to users who can see
all namespaces.
"""

from datetime import UTC, datetime
from unittest.mock import MagicMock
from uuid import uuid4

import httpx
import pytest

from app.auth.middleware import get_current_user
from tests.conftest import make_current_user


def _mock_badge(*, namespace=None, cluster_name=None, scope_namespaces=None, label="CVEs"):
    b = MagicMock()
    b.id = uuid4()
    b.created_by = "dev-user-1"
    b.namespace = namespace
    b.cluster_name = cluster_name
    b.scope_namespaces = scope_namespaces
    b.token = "deadbeef"
    b.label = label
    b.created_at = datetime(2024, 5, 1, 12, 0, 0, tzinfo=UTC)
    return b


# team_member_user (conftest) has namespaces [("payments","cluster-a"), ("frontend","cluster-b")]

ALL_SCOPE = _mock_badge(label="all")
IN_SCOPE = _mock_badge(scope_namespaces=[["payments", "cluster-a"]], label="in")
PARTIAL = _mock_badge(scope_namespaces=[["payments", "cluster-a"], ["other", "cluster-z"]], label="partial")
EXPLICIT = _mock_badge(namespace="payments", cluster_name="cluster-a", label="explicit")


def _set_badges(mock_app_db, badges):
    mock_app_db.execute.return_value.scalars.return_value.all.return_value = badges


async def test_scoped_user_sees_only_subset_badges(team_member_client: httpx.AsyncClient, mock_app_db):
    _set_badges(mock_app_db, [ALL_SCOPE, IN_SCOPE, PARTIAL, EXPLICIT])
    resp = await team_member_client.get("/api/badges")
    assert resp.status_code == 200
    labels = {b["label"] for b in resp.json()}
    assert labels == {"in", "explicit"}


async def test_scoped_user_does_not_see_all_scope_badge(team_member_client: httpx.AsyncClient, mock_app_db):
    _set_badges(mock_app_db, [ALL_SCOPE])
    resp = await team_member_client.get("/api/badges")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_privileged_user_sees_all_badges(sec_team_client: httpx.AsyncClient, mock_app_db):
    _set_badges(mock_app_db, [ALL_SCOPE, IN_SCOPE, PARTIAL, EXPLICIT])
    resp = await sec_team_client.get("/api/badges")
    assert resp.status_code == 200
    labels = {b["label"] for b in resp.json()}
    assert labels == {"all", "in", "partial", "explicit"}


# --- create: scope with the same namespace name on several clusters ---------------

MULTI_CLUSTER_NAMESPACES = [("payments", "prod"), ("payments", "test"), ("billing", "prod")]


@pytest.fixture
def multi_cluster_client(app, mock_app_db):
    user = make_current_user(namespaces=MULTI_CLUSTER_NAMESPACES)
    app.dependency_overrides[get_current_user] = lambda: user

    async def fill_db_defaults(badge):
        badge.id = uuid4()
        badge.token = "deadbeef"
        badge.created_at = datetime(2024, 5, 1, 12, 0, 0, tzinfo=UTC)

    mock_app_db.add = MagicMock()  # Session.add is synchronous
    mock_app_db.refresh.side_effect = fill_db_defaults
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


def _added_badge(mock_app_db):
    return mock_app_db.add.call_args.args[0]


async def test_create_cluster_only_badge_stores_that_cluster(multi_cluster_client, mock_app_db):
    resp = await multi_cluster_client.post("/api/badges", json={"cluster_name": "prod"})
    assert resp.status_code == 201
    assert _added_badge(mock_app_db).scope_namespaces == [["payments", "prod"], ["billing", "prod"]]


async def test_create_namespace_only_badge_stores_every_cluster(multi_cluster_client, mock_app_db):
    resp = await multi_cluster_client.post("/api/badges", json={"namespace": "payments"})
    assert resp.status_code == 201
    assert _added_badge(mock_app_db).scope_namespaces == [["payments", "prod"], ["payments", "test"]]


async def test_create_exact_badge_stores_no_pairs(multi_cluster_client, mock_app_db):
    resp = await multi_cluster_client.post("/api/badges", json={"namespace": "payments", "cluster_name": "test"})
    assert resp.status_code == 201
    assert _added_badge(mock_app_db).scope_namespaces is None


async def test_create_badge_for_invisible_cluster_rejected(multi_cluster_client, mock_app_db):
    resp = await multi_cluster_client.post("/api/badges", json={"cluster_name": "other"})
    assert resp.status_code == 400
    mock_app_db.add.assert_not_called()


# --- render scope -----------------------------------------------------------------------


async def test_render_scope_pairs(monkeypatch):
    from app.routers import badges as badges_router

    async def list_namespaces(_db):
        return [
            {"namespace": "payments", "cluster_name": "prod"},
            {"namespace": "payments", "cluster_name": "test"},
            {"namespace": "billing", "cluster_name": "prod"},
        ]

    monkeypatch.setattr(badges_router.sx, "list_namespaces", list_namespaces)
    scope = badges_router._badge_scope_pairs
    assert await scope(_mock_badge(namespace="payments", cluster_name="test"), None) == [("payments", "test")]
    assert await scope(_mock_badge(scope_namespaces=[["payments", "prod"]]), None) == [("payments", "prod")]
    assert await scope(_mock_badge(scope_namespaces=[]), None) == []
    # Legacy namespace-only row without pairs: creator may have been scoped -> fail closed.
    assert await scope(_mock_badge(namespace="payments"), None) == []
    # Cluster-only without pairs only comes from wildcard creators: expanded, never "all".
    assert await scope(_mock_badge(cluster_name="prod"), None) == [("payments", "prod"), ("billing", "prod")]
    assert await scope(_mock_badge(), None) is None


# --- wildcard creators: namespace-only badges store exact pairs --------------------------


@pytest.fixture
def wildcard_client(app, mock_app_db, monkeypatch):
    from app.routers import badges as badges_router

    async def list_namespaces(_db):
        return [
            {"namespace": "payments", "cluster_name": "prod"},
            {"namespace": "payments", "cluster_name": "test"},
            {"namespace": "billing", "cluster_name": "prod"},
        ]

    monkeypatch.setattr(badges_router.sx, "list_namespaces", list_namespaces)
    user = make_current_user(namespaces=[], has_all_namespaces=True)
    app.dependency_overrides[get_current_user] = lambda: user

    async def fill_db_defaults(badge):
        badge.id = uuid4()
        badge.token = "deadbeef"
        badge.created_at = datetime(2024, 5, 1, 12, 0, 0, tzinfo=UTC)

    mock_app_db.add = MagicMock()
    mock_app_db.refresh.side_effect = fill_db_defaults
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


async def test_wildcard_namespace_only_badge_stores_stackrox_pairs(wildcard_client, mock_app_db):
    resp = await wildcard_client.post("/api/badges", json={"namespace": "payments"})
    assert resp.status_code == 201
    assert _added_badge(mock_app_db).scope_namespaces == [["payments", "prod"], ["payments", "test"]]


async def test_wildcard_cluster_only_badge_stays_dynamic(wildcard_client, mock_app_db):
    resp = await wildcard_client.post("/api/badges", json={"cluster_name": "prod"})
    assert resp.status_code == 201
    assert _added_badge(mock_app_db).scope_namespaces is None


async def test_wildcard_namespace_badge_hidden_from_partially_scoped_user(app, mock_app_db):
    """Listing must not hand a scoped user a token whose SVG counts clusters they cannot see."""
    wildcard_badge = _mock_badge(namespace="payments", scope_namespaces=[["payments", "prod"], ["payments", "test"]])
    user = make_current_user(namespaces=[("payments", "test")])
    app.dependency_overrides[get_current_user] = lambda: user
    _set_badges(mock_app_db, [wildcard_badge])
    client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")
    resp = await client.get("/api/badges")
    assert resp.status_code == 200
    assert resp.json() == []
