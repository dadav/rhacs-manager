"""Excel import of risk acceptances: wildcard visibility and auto-approval."""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.deps import get_current_user
from app.models.risk_acceptance import RiskStatus
from app.routers import exports
from tests.conftest import make_current_user

CVE = "CVE-2026-1"
ROW = {"cve_id": CVE, "justification": "Accepted for a documented reason", "expires_at": datetime(2027, 1, 1)}
URL = "/api/exports/excel/import"
FILE = {"file": ("import.xlsx", b"content")}


def _deployment(namespace: str, cluster: str) -> dict:
    return {"deployment_id": f"{cluster}-{namespace}", "cluster_name": cluster, "namespace": namespace}


@pytest.fixture
def import_env(monkeypatch, mock_app_db) -> dict:
    env: dict = {"deployments": [_deployment("payments", "cluster-a")], "queried_pairs": None, "audit": []}

    async def get_affected_deployments(sx_db, cve_id, pairs):
        env["queried_pairs"] = list(pairs)
        return [d for d in env["deployments"] if (d["namespace"], d["cluster_name"]) in set(pairs)]

    async def list_namespaces(sx_db):
        return [{"namespace": d["namespace"], "cluster_name": d["cluster_name"]} for d in env["deployments"]]

    async def log_action(session, user_id, action, entity_type, entity_id=None, details=None):
        env["audit"].append(action)

    monkeypatch.setattr(exports, "parse_import_excel", lambda content, lang: [dict(ROW)])
    monkeypatch.setattr(exports.sx, "get_affected_deployments", get_affected_deployments)
    monkeypatch.setattr(exports.sx, "list_namespaces", list_namespaces)
    monkeypatch.setattr(exports, "log_action", log_action)
    monkeypatch.setattr(exports.sub_svc, "broadcast_subscription_event", AsyncMock())
    mock_app_db.add = MagicMock()
    return env


def _client(app, user) -> httpx.AsyncClient:
    app.dependency_overrides[get_current_user] = lambda: user
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


@pytest.mark.asyncio
async def test_wildcard_user_import_resolves_all_namespaces(app, import_env):
    user = make_current_user(namespaces=[], has_all_namespaces=True)

    resp = await _client(app, user).post(URL, files=FILE)

    assert resp.status_code == 200
    assert import_env["queried_pairs"] == [("payments", "cluster-a")]
    assert resp.json()["total_valid"] == 1


@pytest.mark.asyncio
async def test_single_namespace_import_is_auto_approved(team_member_client, import_env, mock_app_db):
    resp = await team_member_client.post(URL, params={"confirm": "true"}, files=FILE)

    assert resp.status_code == 200
    assert len(resp.json()["created"]) == 1
    ra = mock_app_db.add.call_args.args[0]
    assert ra.status == RiskStatus.approved
    assert ra.reviewed_at is not None
    assert import_env["audit"] == ["risk_acceptance_imported", "risk_acceptance_auto_approved"]


@pytest.mark.asyncio
async def test_multi_namespace_import_stays_requested(team_member_client, import_env, mock_app_db):
    import_env["deployments"].append(_deployment("frontend", "cluster-b"))

    resp = await team_member_client.post(URL, params={"confirm": "true"}, files=FILE)

    assert resp.status_code == 200
    ra = mock_app_db.add.call_args.args[0]
    assert ra.status == RiskStatus.requested
    assert ra.reviewed_at is None
    assert import_env["audit"] == ["risk_acceptance_imported"]
