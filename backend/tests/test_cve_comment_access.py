"""CVE comment endpoints follow the CVE detail visibility rule.

A caller may read or write comments only when the CVE affects a deployment in a
visible pair or the caller can see a remediation for it. Deleting an own comment
stays possible after access is lost.
"""

from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.routers import cves as cves_router
from app.services import cve_access

CVE = "CVE-2026-1"
BODY = {"message": "hello"}


@pytest.fixture
def stackrox_visible(monkeypatch) -> AsyncMock:
    probe = AsyncMock(return_value=False)
    monkeypatch.setattr(cve_access.sx, "cve_visible_in_namespaces", probe)
    return probe


@pytest.fixture
def remediation_visible(monkeypatch) -> AsyncMock:
    probe = AsyncMock(return_value=False)
    monkeypatch.setattr(cve_access, "has_visible_remediation", probe)
    return probe


@pytest.fixture
def comment_service(monkeypatch) -> SimpleNamespace:
    add = AsyncMock(return_value=(_response(), ()))
    update = AsyncMock(return_value=(_response(), ()))
    monkeypatch.setattr(cves_router.comment_service, "add_cve_comment", add)
    monkeypatch.setattr(cves_router.comment_service, "update_cve_comment", update)
    return SimpleNamespace(add=add, update=update)


def _response() -> dict:
    return {
        "id": str(uuid4()),
        "cve_id": CVE,
        "user_id": "test-user-1",
        "username": "testuser",
        "display_name": "testuser",
        "message": "hello",
        "content": [],
        "created_at": "2026-01-01T00:00:00",
        "updated_at": None,
        "is_sec_team": False,
        "escalation_context": None,
    }


@pytest.mark.asyncio
async def test_invisible_cve_rejects_read_write_and_edit(
    team_member_client, stackrox_visible, remediation_visible, comment_service
):
    url = f"/api/cves/{CVE}/comments"

    assert (await team_member_client.get(url)).status_code == 404
    assert (await team_member_client.post(url, json=BODY)).status_code == 404
    assert (await team_member_client.patch(f"{url}/{uuid4()}", json=BODY)).status_code == 404
    comment_service.add.assert_not_awaited()
    comment_service.update.assert_not_awaited()


@pytest.mark.asyncio
async def test_cve_in_visible_namespace_allows_comments(
    team_member_client, stackrox_visible, remediation_visible, comment_service
):
    stackrox_visible.return_value = True
    url = f"/api/cves/{CVE}/comments"

    assert (await team_member_client.get(url)).status_code == 200
    assert (await team_member_client.post(url, json=BODY)).status_code == 201
    comment_service.add.assert_awaited_once()


@pytest.mark.asyncio
async def test_visible_remediation_allows_comments(
    team_member_client, stackrox_visible, remediation_visible, comment_service
):
    remediation_visible.return_value = True

    assert (await team_member_client.get(f"/api/cves/{CVE}/comments")).status_code == 200
    assert (await team_member_client.post(f"/api/cves/{CVE}/comments", json=BODY)).status_code == 201


@pytest.mark.asyncio
async def test_sec_team_needs_no_stackrox_probe(sec_team_client, stackrox_visible, remediation_visible):
    assert (await sec_team_client.get(f"/api/cves/{CVE}/comments")).status_code == 200
    stackrox_visible.assert_not_awaited()


@pytest.mark.asyncio
async def test_own_comment_delete_skips_the_visibility_check(
    team_member_client, mock_app_db, stackrox_visible, remediation_visible
):
    # Default mock session finds no comment: the request reaches the comment lookup
    # (404 comment_not_found) instead of being rejected for CVE visibility.
    resp = await team_member_client.delete(f"/api/cves/{CVE}/comments/{uuid4()}")

    assert resp.status_code == 404
    stackrox_visible.assert_not_awaited()
