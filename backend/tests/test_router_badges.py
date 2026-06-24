"""Route-level tests for /api/badges visibility.

A scoped (non-privileged) user must only see badges whose scope is fully contained
in their visible namespaces. All-scope badges are visible only to users who can see
all namespaces.
"""

from datetime import UTC, datetime
from unittest.mock import MagicMock
from uuid import uuid4

import httpx


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
