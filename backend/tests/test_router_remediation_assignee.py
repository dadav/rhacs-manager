"""Route tests for remediation assignment: assignee validation, audit id key, notification."""

from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.auth.middleware import CurrentUser
from app.deps import get_app_db, get_current_user
from app.models.notification import Notification
from app.models.notification_preference import NotificationPreference
from app.models.remediation import Remediation, RemediationStatus
from app.models.user import User, UserRole

_CURRENT_USER_ID = "test-user-1"
_TEAMMATE_ID = "teammate-1"


@pytest.fixture
async def remediation_store(app: FastAPI, team_member_user: CurrentUser):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as connection:
        await connection.run_sync(User.__table__.create)
        await connection.run_sync(Remediation.__table__.create)
        await connection.run_sync(Notification.__table__.create)
        await connection.run_sync(NotificationPreference.__table__.create)

    remediation_id = uuid4()
    async with session_factory() as session:
        now = datetime.now(UTC).replace(tzinfo=None)
        session.add_all(
            [
                User(
                    id=_CURRENT_USER_ID,
                    username="testuser",
                    email="test@example.com",
                    role=UserRole.team_member,
                    created_at=now,
                ),
                User(
                    id=_TEAMMATE_ID,
                    username="teammate",
                    email="teammate@example.com",
                    role=UserRole.team_member,
                    created_at=now,
                ),
                Remediation(
                    id=remediation_id,
                    cve_id="CVE-2024-0001",
                    namespace="payments",
                    cluster_name="cluster-a",
                    status=RemediationStatus.open,
                    created_by=_CURRENT_USER_ID,
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

    with patch("app.routers.remediations.log_action", new_callable=AsyncMock) as mock_audit:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            yield client, session_factory, remediation_id, mock_audit

    await engine.dispose()


async def _notifications_for(session_factory, user_id: str) -> list[Notification]:
    async with session_factory() as session:
        result = await session.execute(select(Notification).where(Notification.user_id == user_id))
        return list(result.scalars().all())


async def test_assign_teammate_notifies_and_audits_by_id(remediation_store):
    client, session_factory, remediation_id, mock_audit = remediation_store

    response = await client.patch(f"/api/remediations/{remediation_id}", json={"assigned_to": _TEAMMATE_ID})

    assert response.status_code == 200
    body = response.json()
    assert body["assigned_to"] == _TEAMMATE_ID
    assert body["assigned_to_name"] == "teammate"

    notifications = await _notifications_for(session_factory, _TEAMMATE_ID)
    assert len(notifications) == 1
    assert notifications[0].link == "/remediations?mine=1"

    details = mock_audit.await_args.args[5]
    assert details == {"assigned_to_id": _TEAMMATE_ID}


async def test_self_assignment_does_not_notify(remediation_store):
    client, session_factory, remediation_id, _ = remediation_store

    response = await client.patch(f"/api/remediations/{remediation_id}", json={"assigned_to": _CURRENT_USER_ID})

    assert response.status_code == 200
    assert await _notifications_for(session_factory, _CURRENT_USER_ID) == []


async def test_unknown_assignee_is_rejected(remediation_store):
    client, _, remediation_id, _ = remediation_store

    response = await client.patch(f"/api/remediations/{remediation_id}", json={"assigned_to": "ghost"})

    assert response.status_code == 404


async def test_empty_assignee_unassigns(remediation_store):
    client, _, remediation_id, _ = remediation_store
    await client.patch(f"/api/remediations/{remediation_id}", json={"assigned_to": _TEAMMATE_ID})

    response = await client.patch(f"/api/remediations/{remediation_id}", json={"assigned_to": ""})

    assert response.status_code == 200
    assert response.json()["assigned_to"] is None
