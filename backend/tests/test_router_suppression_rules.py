"""Route-level tests for /api/suppression-rules endpoints."""

from datetime import UTC
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import httpx
import pytest


def _mock_suppression_rule(
    *,
    rule_id=None,
    status="approved",
    rule_type="component",
    component_name="openssl",
    version_pattern=None,
    cve_id=None,
    reason="Test suppression rule for unit testing",
    created_by="sec-user-1",
    scope=None,
    scope_key="",
):
    """Create a mock SuppressionRule ORM object."""
    from datetime import datetime

    rule = MagicMock()
    rule.id = rule_id or uuid4()
    rule.status = MagicMock()
    rule.status.value = status
    rule.status.name = status
    rule.type = MagicMock()
    rule.type.value = rule_type
    rule.type.name = rule_type
    rule.component_name = component_name
    rule.version_pattern = version_pattern
    rule.cve_id = cve_id
    rule.reason = reason
    rule.reference_url = None
    rule.review_comment = None
    rule.created_at = datetime(2024, 1, 1, tzinfo=UTC)
    rule.created_by = created_by
    rule.reviewed_by = None
    rule.reviewed_at = None
    rule.scope = scope or {"mode": "all", "targets": []}
    rule.scope_key = scope_key
    return rule


@pytest.fixture
def patch_sx():
    with patch("app.routers.suppression_rules.sx") as mock_sx:
        mock_sx.get_all_deployed_cve_ids = AsyncMock(return_value=["CVE-2024-0001", "CVE-2024-0002"])
        mock_sx.get_global_component_version_map = AsyncMock(return_value={})
        mock_sx.list_namespaces = AsyncMock(return_value=[])
        mock_sx.get_affected_deployments = AsyncMock(return_value=[])
        yield mock_sx


@pytest.fixture
def patch_audit():
    with patch("app.routers.suppression_rules.log_action", new_callable=AsyncMock) as mock_audit:
        yield mock_audit


@pytest.fixture
def patch_notifications():
    with (
        patch("app.routers.suppression_rules.notify_suppression_requested", new_callable=AsyncMock),
        patch("app.routers.suppression_rules.notify_suppression_status_change", new_callable=AsyncMock),
    ):
        yield


@pytest.fixture
def patch_cve_filter():
    with patch("app.routers.suppression_rules.compute_per_rule_matched_counts") as mock_counts:
        mock_counts.return_value = {}
        yield mock_counts


# -- GET /api/suppression-rules --


async def test_list_suppression_rules_returns_200(
    sec_team_client: httpx.AsyncClient, mock_app_db, patch_sx, patch_cve_filter
):
    resp = await sec_team_client.get("/api/suppression-rules")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_list_suppression_rules_with_results(
    sec_team_client: httpx.AsyncClient, mock_app_db, patch_sx, patch_cve_filter
):
    from app.models.suppression_rule import SuppressionType

    rule = _mock_suppression_rule()
    # The type comparison needs to work for the has_component_rules check
    rule.type = SuppressionType.component

    result_mock = MagicMock()
    result_mock.scalars.return_value.all.return_value = [rule]
    mock_app_db.execute.return_value = result_mock

    # _build_response queries the User table for creator/reviewer names
    creator_result = MagicMock()
    creator_mock = MagicMock()
    creator_mock.username = "secadmin"
    creator_result.scalar_one_or_none.return_value = creator_mock
    mock_app_db.execute.side_effect = [result_mock, creator_result]

    resp = await sec_team_client.get("/api/suppression-rules")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["type"] == "component"


async def test_list_suppression_rules_invalid_status(
    sec_team_client: httpx.AsyncClient, mock_app_db, patch_sx, patch_cve_filter
):
    resp = await sec_team_client.get("/api/suppression-rules?status=nonexistent")
    assert resp.status_code == 400


# -- PATCH /api/suppression-rules/{rule_id} (review) --


async def test_review_requires_sec_team(team_member_client: httpx.AsyncClient, mock_app_db, patch_audit):
    rule_id = uuid4()
    resp = await team_member_client.patch(
        f"/api/suppression-rules/{rule_id}",
        json={"approved": True, "comment": "Looks good"},
    )
    assert resp.status_code == 403


async def test_review_nonexistent_rule(sec_team_client: httpx.AsyncClient, mock_app_db, patch_audit):
    rule_id = uuid4()
    # execute returns None for the rule lookup
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    mock_app_db.execute.return_value = result_mock

    resp = await sec_team_client.patch(
        f"/api/suppression-rules/{rule_id}",
        json={"approved": True},
    )
    assert resp.status_code == 404


# -- DELETE /api/suppression-rules/{rule_id} --


async def test_delete_nonexistent_rule(sec_team_client: httpx.AsyncClient, mock_app_db, patch_audit):
    rule_id = uuid4()
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    mock_app_db.execute.return_value = result_mock

    resp = await sec_team_client.delete(f"/api/suppression-rules/{rule_id}")
    assert resp.status_code == 404


async def test_team_member_cannot_delete_others_rule(app, mock_app_db, patch_audit):
    from app.deps import get_current_user
    from app.models.suppression_rule import SuppressionStatus
    from tests.conftest import make_current_user

    member = make_current_user(user_id="member-1")
    app.dependency_overrides[get_current_user] = lambda: member
    client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")

    rule = _mock_suppression_rule(created_by="other-user", status="requested")
    rule.status = SuppressionStatus.requested
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = rule
    mock_app_db.execute.return_value = result_mock

    rule_id = rule.id
    resp = await client.delete(f"/api/suppression-rules/{rule_id}")
    assert resp.status_code == 403
