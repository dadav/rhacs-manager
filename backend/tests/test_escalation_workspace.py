"""Real-DB tests for the escalation workspace service.

Uses in-memory SQLite (window functions supported since SQLite 3.25) to exercise
the actual grouping/contact SQL, which the mock-based router tests cannot verify.
Only the `escalations` and `cve_comments` tables are created; the FK to `users`
is not enforced by SQLite, so no users table is needed.
"""

from datetime import datetime, timedelta
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.cve_comment import CveComment
from app.models.escalation import Escalation
from app.services.escalation_workspace import count_active_workspace, search_active_workspace

BASE_TIME = datetime(2026, 1, 1, 12, 0, 0)


@pytest_asyncio.fixture
async def db() -> AsyncSession:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(lambda c: Base.metadata.create_all(c, tables=[Escalation.__table__, CveComment.__table__]))
    session_maker = async_sessionmaker(engine, expire_on_commit=False)
    async with session_maker() as session:
        yield session
    await engine.dispose()


async def _add_escalation(
    db: AsyncSession,
    *,
    cve_id: str,
    cluster_name: str,
    namespace: str,
    level: int,
    triggered_at: datetime,
    notified: bool = False,
) -> Escalation:
    esc = Escalation(
        id=uuid4(),
        cve_id=cve_id,
        cluster_name=cluster_name,
        namespace=namespace,
        level=level,
        triggered_at=triggered_at,
        notified=notified,
    )
    db.add(esc)
    await db.flush()
    return esc


async def _add_comment(db: AsyncSession, *, cve_id: str, escalation_id=None, message: str = "hi") -> CveComment:
    c = CveComment(
        id=uuid4(),
        cve_id=cve_id,
        user_id="sec-user-1",
        message=message,
        escalation_id=escalation_id,
        created_at=BASE_TIME,
    )
    db.add(c)
    await db.flush()
    return c


async def _search(db, **overrides):
    params = dict(
        can_see_all=True,
        namespaces=[],
        cluster=None,
        namespace=None,
        search=None,
        level=None,
        email_status=None,
        contact_status=None,
        page=1,
        page_size=20,
    )
    params.update(overrides)
    return await search_active_workspace(db, **params)


@pytest.mark.asyncio
async def test_highest_level_per_group(db: AsyncSession):
    await _add_escalation(db, cve_id="CVE-1", cluster_name="c1", namespace="ns1", level=1, triggered_at=BASE_TIME)
    await _add_escalation(
        db, cve_id="CVE-1", cluster_name="c1", namespace="ns1", level=2, triggered_at=BASE_TIME + timedelta(days=1)
    )
    await _add_escalation(
        db, cve_id="CVE-1", cluster_name="c1", namespace="ns1", level=3, triggered_at=BASE_TIME + timedelta(days=2)
    )
    rows, total, _ = await _search(db)
    assert total == 1
    assert rows[0].level == 3


@pytest.mark.asyncio
async def test_namespace_cluster_isolation(db: AsyncSession):
    await _add_escalation(db, cve_id="CVE-1", cluster_name="c1", namespace="ns1", level=1, triggered_at=BASE_TIME)
    await _add_escalation(db, cve_id="CVE-1", cluster_name="c1", namespace="ns2", level=2, triggered_at=BASE_TIME)
    await _add_escalation(db, cve_id="CVE-1", cluster_name="c2", namespace="ns1", level=3, triggered_at=BASE_TIME)
    rows, total, _ = await _search(db)
    assert total == 3
    groups = {(r.cluster_name, r.namespace, r.level) for r in rows}
    assert groups == {("c1", "ns1", 1), ("c1", "ns2", 2), ("c2", "ns1", 3)}


@pytest.mark.asyncio
async def test_tie_break_newest_trigger(db: AsyncSession):
    older = await _add_escalation(
        db, cve_id="CVE-1", cluster_name="c1", namespace="ns1", level=2, triggered_at=BASE_TIME
    )
    newer = await _add_escalation(
        db, cve_id="CVE-1", cluster_name="c1", namespace="ns1", level=2, triggered_at=BASE_TIME + timedelta(days=5)
    )
    rows, total, _ = await _search(db)
    assert total == 1
    assert str(rows[0].id) == str(newer.id)
    assert str(rows[0].id) != str(older.id)


@pytest.mark.asyncio
async def test_ordering_triggered_desc(db: AsyncSession):
    await _add_escalation(db, cve_id="CVE-A", cluster_name="c1", namespace="ns1", level=1, triggered_at=BASE_TIME)
    await _add_escalation(
        db, cve_id="CVE-B", cluster_name="c1", namespace="ns2", level=1, triggered_at=BASE_TIME + timedelta(days=2)
    )
    await _add_escalation(
        db, cve_id="CVE-C", cluster_name="c1", namespace="ns3", level=1, triggered_at=BASE_TIME + timedelta(days=1)
    )
    rows, _, _ = await _search(db)
    assert [r.cve_id for r in rows] == ["CVE-B", "CVE-C", "CVE-A"]


@pytest.mark.asyncio
async def test_contacted_from_linked_comment(db: AsyncSession):
    esc = await _add_escalation(db, cve_id="CVE-1", cluster_name="c1", namespace="ns1", level=2, triggered_at=BASE_TIME)
    rows, _, counts = await _search(db)
    assert rows[0].contacted is False
    assert counts == {"needs_action": 1, "contacted": 0}

    await _add_comment(db, cve_id="CVE-1", escalation_id=esc.id)
    rows, _, counts = await _search(db)
    assert rows[0].contacted is True
    assert counts == {"needs_action": 0, "contacted": 1}


@pytest.mark.asyncio
async def test_unscoped_comment_does_not_contact(db: AsyncSession):
    await _add_escalation(db, cve_id="CVE-1", cluster_name="c1", namespace="ns1", level=2, triggered_at=BASE_TIME)
    await _add_comment(db, cve_id="CVE-1", escalation_id=None)  # normal discussion comment
    rows, _, _ = await _search(db)
    assert rows[0].contacted is False


@pytest.mark.asyncio
async def test_older_level_comment_does_not_contact_new_level(db: AsyncSession):
    low = await _add_escalation(db, cve_id="CVE-1", cluster_name="c1", namespace="ns1", level=1, triggered_at=BASE_TIME)
    await _add_comment(db, cve_id="CVE-1", escalation_id=low.id)
    # A higher level triggers later — new needs-action row.
    await _add_escalation(
        db, cve_id="CVE-1", cluster_name="c1", namespace="ns1", level=2, triggered_at=BASE_TIME + timedelta(days=1)
    )
    rows, total, _ = await _search(db)
    assert total == 1
    assert rows[0].level == 2
    assert rows[0].contacted is False


@pytest.mark.asyncio
async def test_multiple_comments_contacted_until_last_deleted(db: AsyncSession):
    esc = await _add_escalation(db, cve_id="CVE-1", cluster_name="c1", namespace="ns1", level=2, triggered_at=BASE_TIME)
    c1 = await _add_comment(db, cve_id="CVE-1", escalation_id=esc.id)
    c2 = await _add_comment(db, cve_id="CVE-1", escalation_id=esc.id)

    await db.delete(c1)
    await db.flush()
    rows, _, _ = await _search(db)
    assert rows[0].contacted is True  # still one linked comment

    await db.delete(c2)
    await db.flush()
    rows, _, _ = await _search(db)
    assert rows[0].contacted is False  # last one gone


@pytest.mark.asyncio
async def test_filters_search_level_email(db: AsyncSession):
    await _add_escalation(
        db, cve_id="CVE-ALPHA", cluster_name="c1", namespace="ns1", level=1, triggered_at=BASE_TIME, notified=True
    )
    await _add_escalation(
        db, cve_id="CVE-BETA", cluster_name="c1", namespace="ns2", level=3, triggered_at=BASE_TIME, notified=False
    )

    _, total, _ = await _search(db, search="alpha")
    assert total == 1

    _, total, _ = await _search(db, level=3)
    assert total == 1

    rows, total, _ = await _search(db, email_status="notified")
    assert total == 1
    assert rows[0].cve_id == "CVE-ALPHA"

    rows, total, _ = await _search(db, email_status="pending")
    assert total == 1
    assert rows[0].cve_id == "CVE-BETA"


@pytest.mark.asyncio
async def test_contact_status_filter_and_counts(db: AsyncSession):
    e1 = await _add_escalation(db, cve_id="CVE-1", cluster_name="c1", namespace="ns1", level=1, triggered_at=BASE_TIME)
    await _add_escalation(db, cve_id="CVE-2", cluster_name="c1", namespace="ns2", level=1, triggered_at=BASE_TIME)
    await _add_comment(db, cve_id="CVE-1", escalation_id=e1.id)

    # contact_counts ignore contact_status filter.
    rows, total, counts = await _search(db, contact_status="needs_action")
    assert total == 1
    assert rows[0].cve_id == "CVE-2"
    assert counts == {"needs_action": 1, "contacted": 1}

    rows, total, counts = await _search(db, contact_status="contacted")
    assert total == 1
    assert rows[0].cve_id == "CVE-1"
    assert counts == {"needs_action": 1, "contacted": 1}


@pytest.mark.asyncio
async def test_scope_filter_non_all_user(db: AsyncSession):
    await _add_escalation(db, cve_id="CVE-1", cluster_name="c1", namespace="ns1", level=1, triggered_at=BASE_TIME)
    await _add_escalation(db, cve_id="CVE-2", cluster_name="c1", namespace="ns2", level=1, triggered_at=BASE_TIME)
    rows, total, _ = await _search(db, can_see_all=False, namespaces=[("ns1", "c1")])
    assert total == 1
    assert rows[0].namespace == "ns1"


@pytest.mark.asyncio
async def test_cluster_namespace_filter_all_user(db: AsyncSession):
    await _add_escalation(db, cve_id="CVE-1", cluster_name="c1", namespace="ns1", level=1, triggered_at=BASE_TIME)
    await _add_escalation(db, cve_id="CVE-2", cluster_name="c2", namespace="ns1", level=1, triggered_at=BASE_TIME)
    _, total, _ = await _search(db, cluster="c1")
    assert total == 1
    _, total, _ = await _search(db, namespace="ns1")
    assert total == 2


@pytest.mark.asyncio
async def test_pagination(db: AsyncSession):
    for i in range(25):
        await _add_escalation(
            db,
            cve_id=f"CVE-{i:03d}",
            cluster_name="c1",
            namespace=f"ns{i}",
            level=1,
            triggered_at=BASE_TIME + timedelta(minutes=i),
        )
    rows, total, _ = await _search(db, page=1, page_size=20)
    assert total == 25
    assert len(rows) == 20
    rows, total, _ = await _search(db, page=2, page_size=20)
    assert len(rows) == 5


@pytest.mark.asyncio
async def test_count_active_workspace_matches_dashboard(db: AsyncSession):
    await _add_escalation(db, cve_id="CVE-1", cluster_name="c1", namespace="ns1", level=1, triggered_at=BASE_TIME)
    await _add_escalation(
        db, cve_id="CVE-1", cluster_name="c1", namespace="ns1", level=2, triggered_at=BASE_TIME + timedelta(days=1)
    )
    await _add_escalation(db, cve_id="CVE-2", cluster_name="c2", namespace="ns2", level=1, triggered_at=BASE_TIME)
    n = await count_active_workspace(db, can_see_all=True, namespaces=[])
    assert n == 2  # two groups, not three historical rows

    n = await count_active_workspace(db, can_see_all=False, namespaces=[("ns1", "c1")])
    assert n == 1
