"""Route tests for creating remediations in several namespaces at once (POST /api/remediations/batch)."""

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
_CVE = "CVE-2024-0001"

# team_member_user (conftest) sees exactly these two pairs.
_PAYMENTS = {"namespace": "payments", "cluster_name": "cluster-a"}
_FRONTEND = {"namespace": "frontend", "cluster_name": "cluster-b"}


def _deployment(namespace: str, cluster_name: str) -> dict:
    return {
        "deployment_id": f"dep-{namespace}",
        "deployment_name": f"{namespace}-app",
        "namespace": namespace,
        "cluster_name": cluster_name,
        "image_name": "registry/app:1",
        "image_id": "img-1",
        "first_seen": None,
    }


@pytest.fixture
async def batch_store(app: FastAPI, team_member_user: CurrentUser):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as connection:
        await connection.run_sync(User.__table__.create)
        await connection.run_sync(Remediation.__table__.create)
        await connection.run_sync(Notification.__table__.create)
        await connection.run_sync(NotificationPreference.__table__.create)

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
            ]
        )
        await session.commit()

    async def override_app_db() -> AsyncGenerator[AsyncSession]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_app_db] = override_app_db
    app.dependency_overrides[get_current_user] = lambda: team_member_user

    affected = AsyncMock(return_value=[_deployment("payments", "cluster-a"), _deployment("frontend", "cluster-b")])
    with (
        patch("app.services.remediation_service.sx.get_affected_deployments", affected),
        patch("app.services.remediation_service.log_action", new_callable=AsyncMock) as mock_audit,
        patch(
            "app.services.remediation_service.sub_svc.broadcast_subscription_event", new_callable=AsyncMock
        ) as mock_broadcast,
    ):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            yield {
                "client": client,
                "session_factory": session_factory,
                "affected": affected,
                "audit": mock_audit,
                "broadcast": mock_broadcast,
            }

    await engine.dispose()


async def _remediation_pairs(session_factory) -> set[tuple[str, str]]:
    async with session_factory() as session:
        result = await session.execute(select(Remediation.namespace, Remediation.cluster_name))
        return {(ns, cl) for ns, cl in result.all()}


async def _notifications_for(session_factory, user_id: str) -> list[Notification]:
    async with session_factory() as session:
        result = await session.execute(select(Notification).where(Notification.user_id == user_id))
        return list(result.scalars().all())


async def _seed_remediation(session_factory, namespace: str, cluster_name: str) -> None:
    async with session_factory() as session:
        now = datetime.now(UTC).replace(tzinfo=None)
        session.add(
            Remediation(
                id=uuid4(),
                cve_id=_CVE,
                namespace=namespace,
                cluster_name=cluster_name,
                status=RemediationStatus.open,
                created_by=_CURRENT_USER_ID,
                created_at=now,
                updated_at=now,
            )
        )
        await session.commit()


async def test_batch_creates_one_remediation_per_namespace(batch_store):
    client = batch_store["client"]

    response = await client.post(
        "/api/remediations/batch",
        json={"cve_id": _CVE, "targets": [_PAYMENTS, _FRONTEND], "notes": "bump base image"},
    )

    assert response.status_code == 201
    body = response.json()
    assert [(r["namespace"], r["cluster_name"]) for r in body] == [("payments", "cluster-a"), ("frontend", "cluster-b")]
    assert all(r["status"] == "open" and r["notes"] == "bump base image" for r in body)
    assert await _remediation_pairs(batch_store["session_factory"]) == {
        ("payments", "cluster-a"),
        ("frontend", "cluster-b"),
    }
    assert batch_store["audit"].await_count == 2
    batch_store["affected"].assert_awaited_once()

    batch_store["broadcast"].assert_awaited_once()
    kwargs = batch_store["broadcast"].await_args.kwargs
    assert kwargs["scope"] == [("payments", "cluster-a"), ("frontend", "cluster-b")]
    assert kwargs["actor_id"] == _CURRENT_USER_ID
    assert kwargs["exclude_user_ids"] == []


async def test_duplicate_targets_in_request_are_collapsed(batch_store):
    response = await batch_store["client"].post(
        "/api/remediations/batch", json={"cve_id": _CVE, "targets": [_PAYMENTS, _PAYMENTS]}
    )

    assert response.status_code == 201
    assert len(response.json()) == 1


async def test_target_outside_visible_namespaces_rejects_whole_batch(batch_store):
    response = await batch_store["client"].post(
        "/api/remediations/batch",
        json={"cve_id": _CVE, "targets": [_PAYMENTS, {"namespace": "billing", "cluster_name": "cluster-a"}]},
    )

    assert response.status_code == 403
    assert await _remediation_pairs(batch_store["session_factory"]) == set()


async def test_target_without_cve_rejects_whole_batch(batch_store):
    batch_store["affected"].return_value = [_deployment("payments", "cluster-a")]

    response = await batch_store["client"].post(
        "/api/remediations/batch", json={"cve_id": _CVE, "targets": [_PAYMENTS, _FRONTEND]}
    )

    assert response.status_code == 404
    assert await _remediation_pairs(batch_store["session_factory"]) == set()


async def test_existing_remediation_rejects_whole_batch(batch_store):
    await _seed_remediation(batch_store["session_factory"], "frontend", "cluster-b")

    response = await batch_store["client"].post(
        "/api/remediations/batch", json={"cve_id": _CVE, "targets": [_PAYMENTS, _FRONTEND]}
    )

    assert response.status_code == 409
    assert await _remediation_pairs(batch_store["session_factory"]) == {("frontend", "cluster-b")}


async def test_concurrent_duplicate_at_insert_returns_409(batch_store):
    # Simulate a concurrent request that inserted the pair after the precheck ran.
    await _seed_remediation(batch_store["session_factory"], "payments", "cluster-a")

    with patch("app.services.remediation_service.existing_pairs", AsyncMock(return_value=set())):
        response = await batch_store["client"].post(
            "/api/remediations/batch", json={"cve_id": _CVE, "targets": [_PAYMENTS, _FRONTEND]}
        )

    assert response.status_code == 409
    assert await _remediation_pairs(batch_store["session_factory"]) == {("payments", "cluster-a")}


async def test_assignee_notified_per_remediation_and_excluded_from_broadcast(batch_store):
    response = await batch_store["client"].post(
        "/api/remediations/batch",
        json={"cve_id": _CVE, "targets": [_PAYMENTS, _FRONTEND], "assigned_to": _TEAMMATE_ID},
    )

    assert response.status_code == 201
    assert all(r["assigned_to_name"] == "teammate" for r in response.json())
    assert len(await _notifications_for(batch_store["session_factory"], _TEAMMATE_ID)) == 2
    kwargs = batch_store["broadcast"].await_args.kwargs
    assert kwargs["exclude_user_ids"] == [_TEAMMATE_ID]
    assert kwargs["actor_id"] == _CURRENT_USER_ID


async def test_unknown_assignee_rejects_whole_batch(batch_store):
    response = await batch_store["client"].post(
        "/api/remediations/batch",
        json={"cve_id": _CVE, "targets": [_PAYMENTS, _FRONTEND], "assigned_to": "ghost"},
    )

    assert response.status_code == 404
    assert await _remediation_pairs(batch_store["session_factory"]) == set()


async def test_failure_after_insert_persists_nothing(batch_store):
    batch_store["broadcast"].side_effect = RuntimeError("boom")

    with pytest.raises(RuntimeError):
        await batch_store["client"].post(
            "/api/remediations/batch",
            json={"cve_id": _CVE, "targets": [_PAYMENTS, _FRONTEND], "assigned_to": _TEAMMATE_ID},
        )

    assert await _remediation_pairs(batch_store["session_factory"]) == set()
    assert await _notifications_for(batch_store["session_factory"], _TEAMMATE_ID) == []


async def test_more_than_200_targets_is_rejected(batch_store):
    targets = [{"namespace": f"ns-{i}", "cluster_name": "cluster-a"} for i in range(201)]

    response = await batch_store["client"].post("/api/remediations/batch", json={"cve_id": _CVE, "targets": targets})

    assert response.status_code == 422


async def test_single_create_endpoint_still_works(batch_store):
    response = await batch_store["client"].post("/api/remediations", json={"cve_id": _CVE, **_FRONTEND})

    assert response.status_code == 201
    assert response.json()["namespace"] == "frontend"
    assert await _remediation_pairs(batch_store["session_factory"]) == {("frontend", "cluster-b")}
    assert batch_store["broadcast"].await_args.kwargs["scope"] == [("frontend", "cluster-b")]
