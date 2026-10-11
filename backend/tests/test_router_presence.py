"""Presence endpoints: entity-type whitelist, access checks, sweep and cap."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.routers import presence

RA_ID = str(uuid4())
VISIBLE_SCOPE = {"mode": "namespace", "targets": [{"cluster_name": "cluster-a", "namespace": "payments"}]}
FOREIGN_SCOPE = {"mode": "namespace", "targets": [{"cluster_name": "cluster-x", "namespace": "other"}]}


@pytest.fixture(autouse=True)
def _reset_presence_state(monkeypatch):
    monkeypatch.setattr(presence, "_viewers", {})
    monkeypatch.setattr(presence, "_access_cache", {})
    monkeypatch.setattr(presence, "_last_sweep", 0.0)


@pytest.fixture
def cve_visible(monkeypatch) -> AsyncMock:
    probe = AsyncMock(return_value=True)
    monkeypatch.setattr(presence.sx, "cve_visible_in_namespaces", probe)
    return probe


def _ra_lookup(mock_app_db, scope: dict | None) -> None:
    result = MagicMock()
    result.scalar_one_or_none.return_value = (
        None if scope is None else SimpleNamespace(created_by="someone-else", scope=scope)
    )
    mock_app_db.execute.return_value = result


async def _beat(client, entity_type: str, entity_id: str):
    return await client.post("/api/presence/heartbeat", json={"entity_type": entity_type, "entity_id": entity_id})


async def _viewers(client, entity_type: str, entity_id: str):
    return await client.get("/api/presence/viewers", params={"entity_type": entity_type, "entity_id": entity_id})


@pytest.mark.asyncio
async def test_unknown_entity_type_rejected(team_member_client):
    assert (await _beat(team_member_client, "image", "x")).status_code == 422
    assert (await _viewers(team_member_client, "image", "x")).status_code == 422


@pytest.mark.asyncio
async def test_cve_allowed_registers_viewer(team_member_client, cve_visible):
    resp = await _beat(team_member_client, "cve", "CVE-2026-1")
    assert resp.status_code == 200
    assert resp.json() == {"ok": True}
    assert "test-user-1" in presence._viewers["cve:CVE-2026-1"]
    assert (await _viewers(team_member_client, "cve", "CVE-2026-1")).status_code == 200
    # Second request is answered from the access cache.
    assert cve_visible.await_count == 1


@pytest.mark.asyncio
async def test_cve_outside_namespaces_is_404(team_member_client, cve_visible):
    cve_visible.return_value = False
    assert (await _beat(team_member_client, "cve", "CVE-2026-2")).status_code == 404
    assert (await _viewers(team_member_client, "cve", "CVE-2026-2")).status_code == 404
    assert presence._viewers == {}


@pytest.mark.asyncio
async def test_cve_sec_team_skips_probe(sec_team_client, cve_visible):
    assert (await _beat(sec_team_client, "cve", "CVE-2026-3")).status_code == 200
    assert cve_visible.await_count == 0


@pytest.mark.asyncio
async def test_risk_acceptance_allowed(team_member_client, mock_app_db):
    _ra_lookup(mock_app_db, VISIBLE_SCOPE)
    assert (await _beat(team_member_client, "risk_acceptance", RA_ID)).status_code == 200
    assert (await _viewers(team_member_client, "risk_acceptance", RA_ID)).status_code == 200


@pytest.mark.asyncio
async def test_risk_acceptance_foreign_scope_is_404(team_member_client, mock_app_db):
    _ra_lookup(mock_app_db, FOREIGN_SCOPE)
    assert (await _beat(team_member_client, "risk_acceptance", RA_ID)).status_code == 404
    assert (await _viewers(team_member_client, "risk_acceptance", RA_ID)).status_code == 404


@pytest.mark.asyncio
async def test_risk_acceptance_missing_or_bad_id_is_404(team_member_client, mock_app_db):
    _ra_lookup(mock_app_db, None)
    assert (await _beat(team_member_client, "risk_acceptance", RA_ID)).status_code == 404
    assert (await _beat(team_member_client, "risk_acceptance", "not-a-uuid")).status_code == 404


@pytest.mark.asyncio
async def test_viewers_lists_other_users(app, team_member_user, sec_team_user, cve_visible):
    import httpx

    from app.deps import get_current_user

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        app.dependency_overrides[get_current_user] = lambda: sec_team_user
        await _beat(client, "cve", "CVE-2026-4")
        app.dependency_overrides[get_current_user] = lambda: team_member_user
        resp = await _viewers(client, "cve", "CVE-2026-4")
    assert resp.status_code == 200
    assert [v["user_id"] for v in resp.json()] == ["sec-user-1"]


def test_sweep_removes_stale_buckets_and_expired_cache():
    presence._viewers["cve:OLD"] = {"u1": {"username": "u1", "display_name": "u1", "last_seen": 0.0}}
    presence._viewers["cve:NEW"] = {"u2": {"username": "u2", "display_name": "u2", "last_seen": 1000.0}}
    presence._access_cache[("u1", "cve:OLD")] = (True, 10.0)
    presence._access_cache[("u2", "cve:NEW")] = (True, 5000.0)

    presence._sweep_all(1000.0)

    assert list(presence._viewers) == ["cve:NEW"]
    assert list(presence._access_cache) == [("u2", "cve:NEW")]


@pytest.mark.asyncio
async def test_bucket_cap_refuses_new_entities(team_member_client, cve_visible, monkeypatch):
    monkeypatch.setattr(presence, "MAX_BUCKETS", 1)
    assert (await _beat(team_member_client, "cve", "CVE-A")).json() == {"ok": True}
    assert (await _beat(team_member_client, "cve", "CVE-B")).json() == {"ok": False}
    assert list(presence._viewers) == ["cve:CVE-A"]
