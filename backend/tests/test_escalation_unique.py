"""Escalation uniqueness: DB constraint plus the scheduler's savepoint insert.

Uses in-memory SQLite like test_escalation_workspace.py. The scheduler helper
must skip a duplicate without notifying and leave the outer session usable.
"""

from datetime import datetime
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.cve_comment import CveComment
from app.models.escalation import Escalation
from app.tasks import scheduler

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


def _escalation(level: int = 1, namespace: str = "ns1") -> Escalation:
    return Escalation(
        id=uuid4(),
        cve_id="CVE-1",
        cluster_name="c1",
        namespace=namespace,
        level=level,
        triggered_at=BASE_TIME,
        notified=False,
    )


async def _count(db: AsyncSession) -> int:
    return (await db.execute(select(func.count()).select_from(Escalation))).scalar_one()


@pytest.mark.asyncio
async def test_duplicate_insert_violates_constraint(db: AsyncSession):
    db.add(_escalation())
    await db.flush()
    db.add(_escalation())
    with pytest.raises(IntegrityError) as excinfo:
        await db.flush()
    assert scheduler._is_escalation_duplicate(excinfo.value)


@pytest.mark.asyncio
async def test_insert_escalation_skips_duplicate_and_keeps_session_usable(db: AsyncSession):
    assert await scheduler._insert_escalation(db, _escalation()) is True
    assert await scheduler._insert_escalation(db, _escalation()) is False

    # Outer transaction survived the rolled-back savepoint.
    assert await scheduler._insert_escalation(db, _escalation(level=2)) is True
    await db.commit()
    assert await _count(db) == 2


@pytest.mark.asyncio
async def test_other_integrity_errors_are_reraised(db: AsyncSession):
    broken = _escalation()
    broken.cve_id = None  # NOT NULL violation, not the unique constraint
    with pytest.raises(IntegrityError):
        await scheduler._insert_escalation(db, broken)
