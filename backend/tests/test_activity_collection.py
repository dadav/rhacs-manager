"""Collector transaction of the ACS activity console (SQLite app DB)."""

from collections.abc import AsyncGenerator
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models.activity import ActivityCollectorState, ActivityEvent, ActivitySnapshot
from app.services import activity_service as svc

from .test_activity_diff import SCAN_2, row

T0 = datetime(2026, 11, 25, 12, 0, 0, tzinfo=UTC)


@pytest.fixture
async def store() -> AsyncGenerator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        for model in (ActivityEvent, ActivitySnapshot, ActivityCollectorState):
            await connection.run_sync(model.__table__.create)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        session.add(ActivityCollectorState(id=1, snapshot_version=1, last_event_id=0))
        await session.commit()
    yield factory
    await engine.dispose()


def source(rows: list[dict]):
    async def read() -> list[dict]:
        return [dict(r) for r in rows]

    return read


async def failing_source() -> list[dict]:
    raise TimeoutError("source query timed out")


async def collect(factory, rows: list[dict], at: datetime = T0) -> svc.CollectionResult:
    async with factory() as session:
        return await svc.collect_activity(session, source(rows), clock=lambda: at)


async def events(factory) -> list[ActivityEvent]:
    async with factory() as session:
        return list((await session.execute(select(ActivityEvent).order_by(ActivityEvent.id))).scalars())


async def state(factory) -> ActivityCollectorState:
    async with factory() as session:
        return (await session.execute(select(ActivityCollectorState))).scalar_one()


async def snapshot_count(factory) -> int:
    async with factory() as session:
        return (await session.execute(select(func.count()).select_from(ActivitySnapshot))).scalar_one()


async def test_baseline_is_silent_then_changes_become_events(store):
    result = await collect(store, [row("dep-1"), row("dep-2")])
    assert result.baseline and result.event_count == 0
    first = await state(store)
    assert first.initialized_at == T0.replace(tzinfo=None)
    assert first.last_success_at == T0.replace(tzinfo=None)
    assert first.last_event_id == 0
    assert await snapshot_count(store) == 3

    later = T0 + timedelta(seconds=10)
    result = await collect(store, [row("dep-1", scan_time=SCAN_2), row("dep-3", v2="img-3")], at=later)
    assert not result.baseline
    stored = await events(store)
    assert [e.kind for e in stored] == ["deployment_removed", "deployment_observed", "image_scanned"]
    assert all(e.observed_at == later.replace(tzinfo=None) for e in stored)
    assert stored[2].source_at == SCAN_2
    assert (await state(store)).last_event_id == stored[-1].id
    assert (await state(store)).initialized_at == T0.replace(tzinfo=None)


async def test_empty_baseline_then_appearance(store):
    await collect(store, [])
    assert (await state(store)).initialized_at is not None
    await collect(store, [row("dep-1")], at=T0 + timedelta(seconds=10))
    assert [e.kind for e in await events(store)] == ["deployment_observed"]


async def test_unchanged_snapshot_and_restart_produce_no_activity(store):
    rows = [row("dep-1"), row("dep-2", v2="img-2")]
    await collect(store, rows)
    for i in range(3):
        # Each call uses a fresh session, like a worker restart.
        await collect(store, list(reversed(rows)), at=T0 + timedelta(seconds=10 * (i + 1)))
    assert await events(store) == []
    assert (await state(store)).last_success_at == (T0 + timedelta(seconds=30)).replace(tzinfo=None)


async def test_source_failure_is_not_an_empty_snapshot(store):
    await collect(store, [row("dep-1")])
    before = await state(store)
    async with store() as session:
        with pytest.raises(TimeoutError):
            await svc.collect_activity(session, failing_source, clock=lambda: T0 + timedelta(seconds=10))
    assert await events(store) == []
    after = await state(store)
    assert after.last_success_at == before.last_success_at
    assert await snapshot_count(store) == 2


async def test_successful_empty_snapshot_removes_deployments(store):
    await collect(store, [row("dep-1")])
    await collect(store, [], at=T0 + timedelta(seconds=10))
    assert [e.kind for e in await events(store)] == ["deployment_removed"]
    assert await snapshot_count(store) == 0


async def test_failure_before_commit_rolls_back_events_and_snapshots_and_retry_is_exact(store):
    await collect(store, [row("dep-1")])
    changed = [row("dep-1", scan_time=SCAN_2), row("dep-2", v2="img-2")]

    async with store() as session:
        original_commit = session.commit

        async def broken_commit():
            raise RuntimeError("forced failure")

        session.commit = broken_commit
        with pytest.raises(RuntimeError, match="forced failure"):
            await svc.collect_activity(session, source(changed), clock=lambda: T0 + timedelta(seconds=10))
        session.commit = original_commit

    assert await events(store) == []
    assert (await state(store)).last_event_id == 0
    assert (await state(store)).last_success_at == T0.replace(tzinfo=None)
    assert await snapshot_count(store) == 2

    await collect(store, changed, at=T0 + timedelta(seconds=20))
    await collect(store, changed, at=T0 + timedelta(seconds=30))
    assert sorted(e.kind for e in await events(store)) == ["deployment_observed", "image_scanned"]


async def test_retention_uses_observation_time_and_keeps_sequence_progress(store):
    await collect(store, [])
    await collect(store, [row("dep-1")], at=T0 + timedelta(seconds=10))
    old_events = await events(store)
    high_water = (await state(store)).last_event_id
    assert high_water == old_events[-1].id

    # 25 hours later: unchanged snapshot, the old event expires.
    await collect(store, [row("dep-1")], at=T0 + timedelta(hours=25))
    assert await events(store) == []
    assert (await state(store)).last_event_id == high_water

    await collect(store, [], at=T0 + timedelta(hours=25, seconds=10))
    fresh = await events(store)
    assert [e.kind for e in fresh] == ["deployment_removed"]
    assert fresh[0].id > high_water
    assert (await state(store)).last_event_id == fresh[0].id


async def test_unknown_snapshot_version_fails_explicitly(store):
    async with store() as session:
        stored = (await session.execute(select(ActivityCollectorState))).scalar_one()
        stored.snapshot_version = 99
        await session.commit()
    with pytest.raises(RuntimeError, match="snapshot version"):
        await collect(store, [row("dep-1")])
    assert await snapshot_count(store) == 0


async def test_missing_singleton_fails_explicitly(store):
    async with store() as session:
        await session.delete((await session.execute(select(ActivityCollectorState))).scalar_one())
        await session.commit()
    with pytest.raises(RuntimeError, match="singleton"):
        await collect(store, [row("dep-1")])


async def test_contradictory_source_rolls_back(store):
    await collect(store, [row("dep-1")])
    with pytest.raises(svc.ActivitySourceError):
        await collect(store, [row("dep-1"), row("dep-1", namespace="other")], at=T0 + timedelta(seconds=10))
    assert await events(store) == []
    assert (await state(store)).last_success_at == T0.replace(tzinfo=None)


def test_scheduler_registers_activity_collection_interval_job():
    from app.tasks import scheduler as scheduler_module

    sched = scheduler_module.setup_scheduler()
    try:
        job = sched.get_job("activity_collection")
        assert job is not None
        assert job.func is scheduler_module.run_activity_collection
        assert job.trigger.interval.total_seconds() == 10
        assert job.max_instances == 1
        assert job.coalesce is True
    finally:
        sched.remove_all_jobs()
