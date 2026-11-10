"""Route tests for editing a remediation: target date, notes, status guard, audit, notifications."""

from collections.abc import AsyncGenerator
from datetime import UTC, date, datetime, timedelta
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

_ACTOR_ID = "test-user-1"
_CREATOR_ID = "creator-1"
_ASSIGNEE_ID = "assignee-1"
_NEW_ASSIGNEE_ID = "assignee-2"
_NOTE = "Upgrade the base image"

_TODAY = datetime.utcnow().date()
_YESTERDAY = _TODAY - timedelta(days=1)
_NEXT_WEEK = _TODAY + timedelta(days=7)
_NEXT_MONTH = _TODAY + timedelta(days=30)


@pytest.fixture
async def store(app: FastAPI, team_member_user: CurrentUser):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as connection:
        await connection.run_sync(User.__table__.create)
        await connection.run_sync(Remediation.__table__.create)
        await connection.run_sync(Notification.__table__.create)
        await connection.run_sync(NotificationPreference.__table__.create)

    now = datetime.now(UTC).replace(tzinfo=None)
    async with session_factory() as session:
        session.add_all(
            [
                User(
                    id=user_id,
                    username=user_id,
                    email=f"{user_id}@example.com",
                    role=UserRole.team_member,
                    created_at=now,
                )
                for user_id in (_ACTOR_ID, _CREATOR_ID, _ASSIGNEE_ID, _NEW_ASSIGNEE_ID)
            ]
        )
        await session.commit()

    async def override_app_db() -> AsyncGenerator[AsyncSession]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_app_db] = override_app_db
    app.dependency_overrides[get_current_user] = lambda: team_member_user

    async def add_remediation(
        status: RemediationStatus = RemediationStatus.open,
        target_date: date | None = _NEXT_WEEK,
        resolved_at: datetime | None = None,
        resolved_by: str | None = None,
    ) -> str:
        remediation_id = uuid4()
        async with session_factory() as session:
            session.add(
                Remediation(
                    id=remediation_id,
                    cve_id=f"CVE-2024-{uuid4().int % 100000}",
                    namespace="payments",
                    cluster_name="cluster-a",
                    status=status,
                    resolved_at=resolved_at,
                    resolved_by=resolved_by,
                    target_date=target_date,
                    notes=_NOTE,
                    created_by=_CREATOR_ID,
                    assigned_to=_ASSIGNEE_ID,
                    created_at=now,
                    updated_at=now,
                )
            )
            await session.commit()
        return f"/api/remediations/{remediation_id}"

    async def notification_keys(user_id: str) -> list[str]:
        async with session_factory() as session:
            result = await session.execute(select(Notification).where(Notification.user_id == user_id))
            return sorted(n.message_key for n in result.scalars().all())

    with (
        patch("app.services.remediation_service.log_action", new_callable=AsyncMock) as mock_audit,
        patch("app.services.remediation_service.sub_svc.broadcast_subscription_event", new_callable=AsyncMock),
    ):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            yield client, add_remediation, notification_keys, mock_audit

    await engine.dispose()


@pytest.mark.parametrize(
    ("status", "has_timestamp", "resolved_by", "expected"),
    [
        (RemediationStatus.resolved, True, None, True),
        (RemediationStatus.resolved, False, None, False),
        (RemediationStatus.resolved, True, _ACTOR_ID, False),
        (RemediationStatus.verified, True, None, False),
        (RemediationStatus.open, False, None, False),
    ],
)
async def test_auto_resolved_response_flag(store, status, has_timestamp, resolved_by, expected):
    client, add_remediation, _, _ = store
    url = await add_remediation(
        status=status,
        resolved_at=datetime.now(UTC).replace(tzinfo=None) if has_timestamp else None,
        resolved_by=resolved_by,
    )

    response = await client.get(url)

    assert response.status_code == 200
    assert response.json()["auto_resolved"] is expected


async def test_manual_resolution_is_not_automatic(store):
    client, add_remediation, _, _ = store
    url = await add_remediation(status=RemediationStatus.in_progress)

    response = await client.patch(url, json={"status": "resolved"})

    assert response.status_code == 200
    assert response.json()["resolved_by"] == _ACTOR_ID
    assert response.json()["auto_resolved"] is False
    assert (await client.get(url)).json()["auto_resolved"] is False


async def test_reopening_clears_automatic_resolution(store):
    client, add_remediation, _, _ = store
    url = await add_remediation(
        status=RemediationStatus.resolved,
        resolved_at=datetime.now(UTC).replace(tzinfo=None),
    )

    response = await client.patch(url, json={"status": "in_progress"})

    assert response.status_code == 200
    assert response.json()["auto_resolved"] is False
    assert response.json()["resolved_at"] is None
    assert response.json()["notes"] == _NOTE


async def test_change_date_audits_old_and_new_and_notifies_others(store):
    client, add_remediation, notification_keys, mock_audit = store
    url = await add_remediation()

    response = await client.patch(url, json={"target_date": _NEXT_MONTH.isoformat()})

    assert response.status_code == 200
    assert response.json()["target_date"] == _NEXT_MONTH.isoformat()
    assert mock_audit.await_args.args[5] == {
        "old_target_date": _NEXT_WEEK.isoformat(),
        "target_date": _NEXT_MONTH.isoformat(),
    }
    assert await notification_keys(_CREATOR_ID) == ["remediation_target_date_changed"]
    assert await notification_keys(_ASSIGNEE_ID) == ["remediation_target_date_changed"]
    assert await notification_keys(_ACTOR_ID) == []


async def test_moving_overdue_date_clears_overdue(store):
    client, add_remediation, _, _ = store
    url = await add_remediation(target_date=_YESTERDAY)
    assert (await client.get(url)).json()["is_overdue"] is True

    response = await client.patch(url, json={"target_date": _NEXT_WEEK.isoformat()})

    assert response.status_code == 200
    assert response.json()["is_overdue"] is False


async def test_explicit_null_clears_date(store):
    client, add_remediation, notification_keys, mock_audit = store
    url = await add_remediation(target_date=_YESTERDAY)

    response = await client.patch(url, json={"target_date": None})

    assert response.status_code == 200
    assert response.json()["target_date"] is None
    assert response.json()["is_overdue"] is False
    assert mock_audit.await_args.args[5] == {"old_target_date": _YESTERDAY.isoformat(), "target_date": None}
    assert await notification_keys(_CREATOR_ID) == ["remediation_target_date_changed"]


async def test_status_only_patch_keeps_fields(store):
    client, add_remediation, _, _ = store
    url = await add_remediation()

    response = await client.patch(url, json={"status": "in_progress"})

    assert response.status_code == 200
    body = response.json()
    assert body["target_date"] == _NEXT_WEEK.isoformat()
    assert body["notes"] == _NOTE
    assert body["assigned_to"] == _ASSIGNEE_ID


@pytest.mark.parametrize("cleared", [None, "", "   "])
async def test_notes_can_be_cleared(store, cleared):
    client, add_remediation, _, _ = store
    url = await add_remediation()

    response = await client.patch(url, json={"notes": cleared})

    assert response.status_code == 200
    assert response.json()["notes"] is None
    assert response.json()["target_date"] == _NEXT_WEEK.isoformat()


async def test_null_assignee_unassigns(store):
    client, add_remediation, _, mock_audit = store
    url = await add_remediation()

    response = await client.patch(url, json={"assigned_to": None})

    assert response.status_code == 200
    assert response.json()["assigned_to"] is None
    assert mock_audit.await_args.args[5] == {"assigned_to_id": None}


async def test_changed_past_date_is_rejected(store):
    client, add_remediation, _, _ = store
    url = await add_remediation()

    response = await client.patch(url, json={"target_date": _YESTERDAY.isoformat()})

    assert response.status_code == 400
    assert response.json()["detail"] == "Das Zieldatum darf nicht in der Vergangenheit liegen"
    assert (await client.get(url)).json()["target_date"] == _NEXT_WEEK.isoformat()


async def test_today_is_allowed(store):
    client, add_remediation, _, _ = store
    url = await add_remediation()

    response = await client.patch(url, json={"target_date": _TODAY.isoformat()})

    assert response.status_code == 200
    assert response.json()["is_overdue"] is False


async def test_unchanged_past_date_does_not_block_notes_edit(store):
    client, add_remediation, notification_keys, mock_audit = store
    url = await add_remediation(target_date=_YESTERDAY)

    response = await client.patch(url, json={"target_date": _YESTERDAY.isoformat(), "notes": "New plan"})

    assert response.status_code == 200
    assert response.json()["notes"] == "New plan"
    assert mock_audit.await_args.args[5] == {"notes_changed": True}
    assert await notification_keys(_CREATOR_ID) == []


@pytest.mark.parametrize(
    "status",
    [RemediationStatus.resolved, RemediationStatus.verified, RemediationStatus.wont_fix],
)
@pytest.mark.parametrize(
    "payload",
    [{"target_date": _NEXT_MONTH.isoformat()}, {"target_date": None}, {"notes": "Edited"}, {"assigned_to": None}],
)
async def test_edit_on_closed_status_is_rejected(store, status, payload):
    client, add_remediation, notification_keys, mock_audit = store
    url = await add_remediation(status=status)

    response = await client.patch(url, json=payload)

    assert response.status_code == 400
    body = (await client.get(url)).json()
    assert body["target_date"] == _NEXT_WEEK.isoformat()
    assert body["notes"] == _NOTE
    assert body["assigned_to"] == _ASSIGNEE_ID
    mock_audit.assert_not_awaited()
    assert await notification_keys(_CREATOR_ID) == []


async def test_reopen_with_edit_in_one_patch(store):
    client, add_remediation, _, _ = store
    url = await add_remediation(status=RemediationStatus.resolved)

    response = await client.patch(url, json={"status": "in_progress", "target_date": _NEXT_MONTH.isoformat()})

    assert response.status_code == 200
    assert response.json()["status"] == "in_progress"
    assert response.json()["target_date"] == _NEXT_MONTH.isoformat()


async def test_assign_plus_date_change_sends_new_assignee_only_the_assignment(store):
    client, add_remediation, notification_keys, _ = store
    url = await add_remediation()

    response = await client.patch(url, json={"assigned_to": _NEW_ASSIGNEE_ID, "target_date": _NEXT_MONTH.isoformat()})

    assert response.status_code == 200
    assert await notification_keys(_NEW_ASSIGNEE_ID) == ["remediation_assigned"]
    assert await notification_keys(_CREATOR_ID) == ["remediation_target_date_changed"]


async def test_status_plus_date_change_sends_both_notifications(store):
    client, add_remediation, notification_keys, _ = store
    url = await add_remediation()

    response = await client.patch(url, json={"status": "in_progress", "target_date": _NEXT_MONTH.isoformat()})

    assert response.status_code == 200
    assert await notification_keys(_CREATOR_ID) == ["remediation_status", "remediation_target_date_changed"]


async def test_notes_only_edit_notifies_nobody_and_audits_without_text(store):
    client, add_remediation, notification_keys, mock_audit = store
    url = await add_remediation()

    response = await client.patch(url, json={"notes": "Secret plan"})

    assert response.status_code == 200
    assert response.json()["notes"] == "Secret plan"
    assert mock_audit.await_args.args[5] == {"notes_changed": True}
    assert await notification_keys(_CREATOR_ID) == []
    assert await notification_keys(_ASSIGNEE_ID) == []


async def test_noop_patch_writes_no_audit_entry(store):
    client, add_remediation, notification_keys, mock_audit = store
    url = await add_remediation()

    response = await client.patch(url, json={"target_date": _NEXT_WEEK.isoformat(), "notes": _NOTE})

    assert response.status_code == 200
    mock_audit.assert_not_awaited()
    assert await notification_keys(_CREATOR_ID) == []
