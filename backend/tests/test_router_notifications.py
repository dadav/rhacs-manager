"""Behavioral route tests for notification deletion."""

from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from uuid import UUID, uuid4

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.auth.middleware import CurrentUser
from app.deps import get_app_db, get_current_user
from app.models.notification import Notification, NotificationType
from app.models.user import User, UserRole

_CURRENT_USER_ID = "test-user-1"
_OTHER_USER_ID = "other-user"


@pytest.fixture
async def notification_store(app: FastAPI, team_member_user: CurrentUser):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as connection:
        await connection.run_sync(User.__table__.create)
        await connection.run_sync(Notification.__table__.create)

    async with session_factory() as session:
        created_at = datetime.now(UTC).replace(tzinfo=None)
        session.add_all(
            [
                User(
                    id=_CURRENT_USER_ID,
                    username="testuser",
                    email="test@example.com",
                    role=UserRole.team_member,
                    created_at=created_at,
                ),
                User(
                    id=_OTHER_USER_ID,
                    username="otheruser",
                    email="other@example.com",
                    role=UserRole.team_member,
                    created_at=created_at,
                ),
            ]
        )
        await session.commit()

    async def override_app_db() -> AsyncGenerator[AsyncSession]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_app_db] = override_app_db
    app.dependency_overrides[get_current_user] = lambda: team_member_user

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client, session_factory

    await engine.dispose()


async def _seed_notifications(
    session_factory: async_sessionmaker[AsyncSession],
    notifications: list[Notification],
) -> None:
    async with session_factory() as session:
        session.add_all(notifications)
        await session.commit()


async def _notification_ids(
    session_factory: async_sessionmaker[AsyncSession],
    user_id: str,
) -> set[UUID]:
    async with session_factory() as session:
        result = await session.scalars(select(Notification.id).where(Notification.user_id == user_id))
        return set(result.all())


def _notification(notification_id: UUID, user_id: str) -> Notification:
    return Notification(
        id=notification_id,
        user_id=user_id,
        type=NotificationType.mention,
        title="Test notification",
        message="Test message",
        created_at=datetime.now(UTC).replace(tzinfo=None),
    )


async def test_delete_notification_removes_only_owned_target(notification_store):
    client, session_factory = notification_store
    target_id = uuid4()
    other_owned_id = uuid4()
    other_users_id = uuid4()
    await _seed_notifications(
        session_factory,
        [
            _notification(target_id, _CURRENT_USER_ID),
            _notification(other_owned_id, _CURRENT_USER_ID),
            _notification(other_users_id, _OTHER_USER_ID),
        ],
    )

    response = await client.delete(f"/api/notifications/{target_id}")

    assert response.status_code == 204
    assert response.content == b""
    assert await _notification_ids(session_factory, _CURRENT_USER_ID) == {other_owned_id}
    assert await _notification_ids(session_factory, _OTHER_USER_ID) == {other_users_id}


async def test_delete_notification_does_not_reveal_or_remove_foreign_target(notification_store):
    client, session_factory = notification_store
    other_users_id = uuid4()
    await _seed_notifications(session_factory, [_notification(other_users_id, _OTHER_USER_ID)])

    response = await client.delete(f"/api/notifications/{other_users_id}")

    assert response.status_code == 204
    assert await _notification_ids(session_factory, _OTHER_USER_ID) == {other_users_id}


async def test_delete_notification_is_idempotent(notification_store):
    client, _session_factory = notification_store
    missing_id = uuid4()

    first_response = await client.delete(f"/api/notifications/{missing_id}")
    second_response = await client.delete(f"/api/notifications/{missing_id}")

    assert first_response.status_code == 204
    assert second_response.status_code == 204


async def test_clear_notifications_removes_all_owned_rows_and_preserves_foreign_rows(notification_store):
    client, session_factory = notification_store
    owned_ids = [uuid4() for _ in range(51)]
    other_users_id = uuid4()
    await _seed_notifications(
        session_factory,
        [
            *[_notification(notification_id, _CURRENT_USER_ID) for notification_id in owned_ids],
            _notification(other_users_id, _OTHER_USER_ID),
        ],
    )

    response = await client.delete("/api/notifications")

    assert response.status_code == 204
    assert response.content == b""
    assert await _notification_ids(session_factory, _CURRENT_USER_ID) == set()
    assert await _notification_ids(session_factory, _OTHER_USER_ID) == {other_users_id}


async def test_clear_notifications_is_idempotent_when_empty(notification_store):
    client, _session_factory = notification_store

    first_response = await client.delete("/api/notifications")
    second_response = await client.delete("/api/notifications")

    assert first_response.status_code == 204
    assert second_response.status_code == 204
