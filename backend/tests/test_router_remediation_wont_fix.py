"""Route tests: the won't-fix reason lives in its own field and never touches the notes."""

from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.auth.middleware import CurrentUser
from app.deps import get_app_db, get_current_user
from app.models.remediation import Remediation, RemediationStatus
from app.models.user import User, UserRole

_USER_ID = "test-user-1"
_NOTE = "Upgrade the base image"
_REASON = "Component is removed next sprint"


@pytest.fixture
async def remediation_store(app: FastAPI, team_member_user: CurrentUser):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as connection:
        await connection.run_sync(User.__table__.create)
        await connection.run_sync(Remediation.__table__.create)

    remediation_id = uuid4()
    async with session_factory() as session:
        now = datetime.now(UTC).replace(tzinfo=None)
        session.add_all(
            [
                User(
                    id=_USER_ID,
                    username="testuser",
                    email="test@example.com",
                    role=UserRole.team_member,
                    created_at=now,
                ),
                Remediation(
                    id=remediation_id,
                    cve_id="CVE-2024-0001",
                    namespace="payments",
                    cluster_name="cluster-a",
                    status=RemediationStatus.open,
                    notes=_NOTE,
                    created_by=_USER_ID,
                    created_at=now,
                    updated_at=now,
                ),
            ]
        )
        await session.commit()

    async def override_app_db() -> AsyncGenerator[AsyncSession]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_app_db] = override_app_db
    app.dependency_overrides[get_current_user] = lambda: team_member_user

    with (
        patch("app.services.remediation_service.log_action", new_callable=AsyncMock) as mock_audit,
        patch("app.services.remediation_service.notif_svc.notify_remediation_status_change", new_callable=AsyncMock),
        patch("app.services.remediation_service.sub_svc.broadcast_subscription_event", new_callable=AsyncMock),
    ):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            yield client, f"/api/remediations/{remediation_id}", mock_audit

    await engine.dispose()


async def test_wont_fix_keeps_note_and_stores_reason(remediation_store):
    client, url, mock_audit = remediation_store

    response = await client.patch(url, json={"status": "wont_fix", "wont_fix_reason": _REASON})

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "wont_fix"
    assert body["notes"] == _NOTE
    assert body["wont_fix_reason"] == _REASON
    assert mock_audit.await_args.args[5]["wont_fix_reason"] == _REASON


async def test_reopen_restores_note_and_clears_reason(remediation_store):
    client, url, _ = remediation_store
    await client.patch(url, json={"status": "wont_fix", "wont_fix_reason": _REASON})

    response = await client.patch(url, json={"status": "open"})

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "open"
    assert body["notes"] == _NOTE
    assert body["wont_fix_reason"] is None


async def test_wont_fix_without_reason_is_rejected(remediation_store):
    client, url, _ = remediation_store

    response = await client.patch(url, json={"status": "wont_fix"})

    assert response.status_code == 400
    current = (await client.get(url)).json()
    assert current["status"] == "open"
    assert current["notes"] == _NOTE
    assert current["wont_fix_reason"] is None


@pytest.mark.parametrize("reason", ["   ", "\t\n"])
async def test_wont_fix_with_blank_reason_is_rejected(remediation_store, reason):
    client, url, mock_audit = remediation_store

    response = await client.patch(url, json={"status": "wont_fix", "wont_fix_reason": reason})

    assert response.status_code == 400
    current = (await client.get(url)).json()
    assert current["status"] == "open"
    assert current["notes"] == _NOTE
    assert current["wont_fix_reason"] is None
    mock_audit.assert_not_awaited()


async def test_wont_fix_stores_and_audits_trimmed_reason(remediation_store):
    client, url, mock_audit = remediation_store

    response = await client.patch(url, json={"status": "wont_fix", "wont_fix_reason": f" \t{_REASON}\n "})

    assert response.status_code == 200
    assert response.json()["wont_fix_reason"] == _REASON
    assert (await client.get(url)).json()["wont_fix_reason"] == _REASON
    assert mock_audit.await_args.args[5]["wont_fix_reason"] == _REASON


async def test_patch_with_notes_and_reason_stores_both(remediation_store):
    client, url, _ = remediation_store

    response = await client.patch(
        url,
        json={"status": "wont_fix", "wont_fix_reason": _REASON, "notes": "Edited note"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["notes"] == "Edited note"
    assert body["wont_fix_reason"] == _REASON


async def test_note_edit_while_closed_is_rejected_and_reopen_keeps_note(remediation_store):
    client, url, _ = remediation_store
    await client.patch(url, json={"status": "wont_fix", "wont_fix_reason": _REASON})

    edited = await client.patch(url, json={"notes": "Edited while closed"})

    assert edited.status_code == 400
    current = (await client.get(url)).json()
    assert current["notes"] == _NOTE
    assert current["wont_fix_reason"] == _REASON

    reopened = await client.patch(url, json={"status": "open"})

    assert reopened.json()["notes"] == _NOTE
    assert reopened.json()["wont_fix_reason"] is None
