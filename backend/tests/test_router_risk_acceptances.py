"""Route tests for CVE filtering without changing risk-acceptance visibility."""

from datetime import UTC, datetime
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import JSON
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.deps import get_app_db, get_current_user
from app.models.risk_acceptance import RiskAcceptance, RiskAcceptanceComment, RiskStatus
from app.models.user import User, UserRole


@pytest.fixture
async def store(app, team_member_user, monkeypatch):
    monkeypatch.setattr(RiskAcceptance.__table__.c.scope, "type", JSON())
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        for model in (User, RiskAcceptance, RiskAcceptanceComment):
            await connection.run_sync(model.__table__.create)

    now = datetime.now(UTC).replace(tzinfo=None)
    rows = [
        ("matching", "CVE-2024-0001", "approved", "payments", "cluster-a", "other"),
        ("other_cve", "CVE-2024-0002", "approved", "payments", "cluster-a", "other"),
        ("requested", "CVE-2024-0001", "requested", "frontend", "cluster-b", "other"),
        ("hidden", "CVE-2024-0001", "approved", "payments", "cluster-b", "other"),
        ("own", "CVE-2024-0001", "approved", "private", "cluster-c", team_member_user.id),
    ]
    ids = {name: uuid4() for name, *_ in rows}
    async with session_factory() as session:
        session.add_all(
            [
                User(id=user_id, username=user_id, email=f"{user_id}@example.com", role=UserRole.team_member)
                for user_id in (team_member_user.id, "other")
            ]
        )
        await session.flush()
        for name, cve_id, status, namespace, cluster, creator in rows:
            session.add(
                RiskAcceptance(
                    id=ids[name],
                    cve_id=cve_id,
                    status=RiskStatus[status],
                    justification="Accepted test risk",
                    scope={"mode": "namespace", "targets": [{"namespace": namespace, "cluster_name": cluster}]},
                    scope_key=name,
                    created_by=creator,
                    created_at=now,
                )
            )
        await session.flush()
        session.add(
            RiskAcceptanceComment(
                risk_acceptance_id=ids["matching"],
                user_id=team_member_user.id,
                message="Existing comment",
            )
        )
        await session.commit()

    async def override_app_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_app_db] = override_app_db
    app.dependency_overrides[get_current_user] = lambda: team_member_user
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            yield client, {name: str(value) for name, value in ids.items()}
    finally:
        await engine.dispose()


@pytest.mark.parametrize(
    ("params", "expected"),
    [
        ({}, {"matching", "other_cve", "requested", "own"}),
        ({"cve_id": "CVE-2024-0001"}, {"matching", "requested", "own"}),
        ({"cve_id": "CVE-2024-0001", "status": "approved"}, {"matching", "own"}),
        ({"cve_id": "CVE-2024-0001", "cluster": "cluster-b", "namespace": "frontend"}, {"requested"}),
        ({"cve_id": "CVE-2024-0001", "cluster": "cluster-b", "namespace": "payments"}, set()),
        ({"cve_id": "CVE-2024-9999"}, set()),
        ({"cve_id": ""}, set()),
    ],
)
async def test_cve_filter_preserves_access_scope_status_and_list_shape(store, params, expected):
    client, ids = store
    response = await client.get("/api/risk-acceptances", params=params)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert {row["id"] for row in data} == {ids[name] for name in expected}
    for row in data:
        assert row["comment_count"] == (1 if row["id"] == ids["matching"] else 0)
        assert row["created_by_name"] in ("test-user-1", "other")
