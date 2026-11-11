"""Remediation visibility uses exact current pairs, including narrowed scope."""

from contextlib import asynccontextmanager

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models.remediation import Remediation, RemediationStatus
from app.models.user import User, UserRole
from app.services.cve_access import fixed_remediation_cve_ids, visible_remediation_cve_ids

from .conftest import make_current_user


@asynccontextmanager
async def remediation_store():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(User.__table__.create)
        await connection.run_sync(Remediation.__table__.create)
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            session.add(User(id="test-user-1", username="test", email="test@example.com", role=UserRole.team_member))
            for cve, namespace, cluster, status in [
                ("CVE-FIXED", "payments", "cluster-a", RemediationStatus.resolved),
                ("CVE-VERIFIED", "frontend", "cluster-b", RemediationStatus.verified),
                ("CVE-FOREIGN", "payments", "cluster-b", RemediationStatus.resolved),
                ("CVE-WONT", "payments", "cluster-a", RemediationStatus.wont_fix),
                ("CVE-OPEN", "payments", "cluster-a", RemediationStatus.open),
            ]:
                session.add(
                    Remediation(
                        cve_id=cve, namespace=namespace, cluster_name=cluster, status=status, created_by="test-user-1"
                    )
                )
            await session.commit()
            yield session
    finally:
        await engine.dispose()


@pytest.mark.parametrize(
    ("scope", "expected"),
    [
        ({}, {"CVE-FIXED", "CVE-VERIFIED"}),
        ({"cluster": "cluster-a"}, {"CVE-FIXED"}),
        ({"namespace": "frontend"}, {"CVE-VERIFIED"}),
        ({"cluster": "cluster-b", "namespace": "payments"}, set()),
        ({"cluster": "", "namespace": ""}, {"CVE-FIXED", "CVE-VERIFIED"}),
        ({"restrict_pairs": [("payments", "cluster-b"), ("frontend", "cluster-b")]}, {"CVE-VERIFIED"}),
        ({"restrict_pairs": []}, set()),
    ],
)
async def test_fixed_visibility_and_narrowing(scope, expected):
    user = make_current_user(namespaces=[("payments", "cluster-a"), ("frontend", "cluster-b")])
    async with remediation_store() as db:
        assert await fixed_remediation_cve_ids(db, user, **scope) == expected


@pytest.mark.parametrize("user_args", [{"is_sec_team": True}, {"has_all_namespaces": True}])
async def test_org_wide_users_still_obey_narrowing(user_args):
    user = make_current_user(**user_args)
    async with remediation_store() as db:
        assert await fixed_remediation_cve_ids(db, user) == {"CVE-FIXED", "CVE-VERIFIED", "CVE-FOREIGN"}
        assert await fixed_remediation_cve_ids(db, user, cluster="cluster-b", namespace="payments") == {"CVE-FOREIGN"}


async def test_no_namespaces_means_no_access():
    async with remediation_store() as db:
        assert await fixed_remediation_cve_ids(db, make_current_user(namespaces=[])) == set()


async def test_revisit_access_keeps_all_remediation_statuses():
    async with remediation_store() as db:
        assert await visible_remediation_cve_ids(
            db,
            make_current_user(namespaces=[("payments", "cluster-a")]),
            ["CVE-FIXED", "CVE-WONT", "CVE-OPEN", "CVE-FOREIGN"],
        ) == {"CVE-FIXED", "CVE-WONT", "CVE-OPEN"}
