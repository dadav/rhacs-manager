"""ACS activity console against a real PostgreSQL.

- Source SQL runs on a throwaway copy of the StackRox tables (fixture schema in
  a rolled-back transaction), never on a connected Central DB.
- Sequence, FOR UPDATE serialization and the Alembic migration run on a
  disposable database created and dropped by the test (explicit APP_DB_URL).

Skipped when no PostgreSQL is reachable at ACTIVITY_TEST_PG_URL (default: the
local dev server). A skip is not proof that the SQL or the migration works.
"""

import asyncio
import os
import subprocess
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.services import activity_service as svc
from app.stackrox.queries.activity import ACTIVITY_SNAPSHOT_SQL, get_activity_snapshot_rows

PG_URL = os.environ.get("ACTIVITY_TEST_PG_URL", "postgresql+asyncpg://postgres@localhost/rhacs_manager")
SCHEMA_SQL = (Path(__file__).parent / "fixtures" / "stackrox_min_schema.sql").read_text()
BACKEND_DIR = Path(__file__).parents[1]
T0 = datetime(2026, 11, 25, 12, 0, 0, tzinfo=UTC)
SCAN = datetime(2026, 11, 25, 9, 0, 0)

DEP_A = uuid.uuid4()
DEP_B = uuid.uuid4()
DEP_EMPTY = uuid.uuid4()
DEP_PENDING = uuid.uuid4()


async def _connect_or_skip(url: str):
    engine = create_async_engine(url, poolclass=NullPool, connect_args={"timeout": 3})
    try:
        conn = await engine.connect()
    except Exception as exc:  # noqa: BLE001 - any connection problem means "no test database"
        await engine.dispose()
        pytest.skip(f"PostgreSQL not reachable at {url}: {exc}")
    return engine, conn


async def _seed_source(session: AsyncSession) -> None:
    await session.execute(
        text(
            "INSERT INTO images_v2 (id, digest, name_fullname, scan_scantime, scanstats_componentcount, "
            "scanstats_cvecount, scanstats_fixablecvecount) VALUES "
            "('v2-shared', 'sha256:shared', 'registry/shared:1', :scan, 0, 0, 0)"
        ),
        {"scan": SCAN},
    )
    for dep_id, name, namespace, cluster in (
        (DEP_A, "api", "payments", "cluster-a"),
        (DEP_B, "api", "payments", "cluster-b"),
        (DEP_EMPTY, "empty", "payments", "cluster-a"),
        (DEP_PENDING, "pending", "billing", "cluster-a"),
    ):
        await session.execute(
            text("INSERT INTO deployments (id, name, namespace, clustername) VALUES (:id, :name, :ns, :cl)"),
            {"id": dep_id, "name": name, "ns": namespace, "cl": cluster},
        )
    containers = [
        (DEP_A, 0, "v2-shared", "sha256:shared", "registry/shared:1"),
        (DEP_A, 1, "v2-shared", "sha256:shared", "registry/shared:1"),
        (DEP_B, 0, "v2-shared", "sha256:shared", "registry/shared:1"),
        # v2 reference whose images_v2 row has not arrived yet.
        (DEP_PENDING, 0, "v2-pending", "sha256:pending", "registry/pending:1"),
    ]
    for dep_id, idx, v2, digest, name in containers:
        await session.execute(
            text(
                "INSERT INTO deployments_containers (deployments_id, idx, image_idv2, image_id, image_name_fullname) "
                "VALUES (:dep, :idx, :v2, :digest, :name)"
            ),
            {"dep": dep_id, "idx": idx, "v2": v2, "digest": digest, "name": name},
        )


@pytest.fixture
async def sx_session():
    engine, conn = await _connect_or_skip(PG_URL)
    schema = f"activity_sx_{uuid.uuid4().hex[:12]}"
    trans = await conn.begin()
    try:
        await conn.execute(text(f"CREATE SCHEMA {schema}"))
        await conn.execute(text(f"SET LOCAL search_path TO {schema}"))
        for statement in SCHEMA_SQL.split(";"):
            if "CREATE TABLE" in statement:
                await conn.execute(text(statement))
        session = AsyncSession(bind=conn)
        await _seed_source(session)
        yield session
    finally:
        await trans.rollback()
        await conn.close()
        await engine.dispose()


async def test_source_snapshot_sql_preserves_left_joins_and_normalizes(sx_session):
    rows = await get_activity_snapshot_rows(sx_session, 5000)
    snapshot = svc.normalize_snapshot(rows)

    assert set(snapshot.deployments) == {str(DEP_A), str(DEP_B), str(DEP_EMPTY), str(DEP_PENDING)}
    assert snapshot.deployments[str(DEP_EMPTY)]["images"] == []
    # Duplicate containers collapse into one reference.
    assert snapshot.deployments[str(DEP_A)]["images"] == [
        {"image_id_v2": "v2-shared", "image_digest": "sha256:shared", "image_name": "registry/shared:1"}
    ]
    shared = snapshot.images["v2-shared"]
    assert shared["pairs"] == [["payments", "cluster-a"], ["payments", "cluster-b"]]
    # Zero-component, zero-CVE scan is a valid scan signature.
    assert shared["scan"] == {
        "scan_time": "2026-11-25T09:00:00.000000Z",
        "component_count": 0,
        "cve_count": 0,
        "fixable_cve_count": 0,
    }
    pending = snapshot.images["v2-pending"]
    assert pending["scan"] is None
    assert pending["digest"] == "sha256:pending"


async def test_source_snapshot_first_scan_after_baseline(sx_session):
    baseline = svc.compute_activity(
        {}, {}, svc.normalize_snapshot(await get_activity_snapshot_rows(sx_session, 5000)), initialized=False
    )
    await sx_session.execute(
        text(
            "INSERT INTO images_v2 (id, digest, name_fullname, scan_scantime, scanstats_componentcount, "
            "scanstats_cvecount, scanstats_fixablecvecount) VALUES "
            "('v2-pending', 'sha256:pending', 'registry/pending:1', :scan, 5, 2, 1)"
        ),
        {"scan": SCAN + timedelta(minutes=5)},
    )
    after = svc.normalize_snapshot(await get_activity_snapshot_rows(sx_session, 5000))
    events = svc.compute_activity(baseline.deployments, baseline.images, after, initialized=True).events
    assert [(e.kind, e.namespace, e.cluster_name) for e in events] == [("image_scanned", "billing", "cluster-a")]


async def test_source_snapshot_explain_runs(sx_session):
    plan = (await sx_session.execute(text(f"EXPLAIN {ACTIVITY_SNAPSHOT_SQL}"))).scalars().all()
    assert any("Join" in line for line in plan)


async def test_statement_timeout_raises_instead_of_returning_partial_rows(sx_session):
    await sx_session.execute(text("SAVEPOINT before_timeout"))
    await sx_session.execute(text("SET LOCAL statement_timeout = 1"))
    with pytest.raises(Exception, match="statement timeout|canceling statement"):
        await sx_session.execute(text("SELECT pg_sleep(0.2)"))
    await sx_session.execute(text("ROLLBACK TO SAVEPOINT before_timeout"))


# --- disposable app database: migration, sequence, locking -----------------------


def _alembic(app_db_url: str, *args: str) -> None:
    env = {**os.environ, "APP_DB_URL": app_db_url}
    result = subprocess.run(
        ["uv", "run", "alembic", *args], cwd=BACKEND_DIR, env=env, capture_output=True, text=True, timeout=180
    )
    assert result.returncode == 0, result.stderr[-2000:]


@pytest.fixture
async def migrated_app_db():
    admin_engine, admin_conn = await _connect_or_skip(PG_URL)
    name = f"activity_app_{uuid.uuid4().hex[:12]}"
    await admin_conn.execution_options(isolation_level="AUTOCOMMIT")
    await admin_conn.execute(text(f"CREATE DATABASE {name}"))
    url = PG_URL.rsplit("/", 1)[0] + f"/{name}"
    try:
        _alembic(url, "upgrade", "head")
        yield url
    finally:
        await admin_conn.execute(text(f"DROP DATABASE IF EXISTS {name} WITH (FORCE)"))
        await admin_conn.close()
        await admin_engine.dispose()


async def _tables(url: str) -> set[str]:
    engine = create_async_engine(url, poolclass=NullPool)
    async with engine.connect() as conn:
        names = (
            await conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = current_schema()"))
        ).scalars()
        result = set(names)
    await engine.dispose()
    return result


async def test_migration_creates_singleton_and_downgrade_drops_only_activity_tables(migrated_app_db):
    engine = create_async_engine(migrated_app_db, poolclass=NullPool)
    async with engine.connect() as conn:
        row = (await conn.execute(text("SELECT * FROM activity_collector_state"))).mappings().one()
        id_type = (
            await conn.execute(
                text(
                    "SELECT data_type, column_default FROM information_schema.columns "
                    "WHERE table_name = 'activity_events' AND column_name = 'id'"
                )
            )
        ).one()
    await engine.dispose()
    assert dict(row) == {
        "id": 1,
        "snapshot_version": 1,
        "initialized_at": None,
        "last_success_at": None,
        "last_event_id": 0,
    }
    assert id_type.data_type == "bigint" and "nextval" in id_type.column_default

    before = await _tables(migrated_app_db)
    _alembic(migrated_app_db, "downgrade", "033")
    after = await _tables(migrated_app_db)
    assert before - after == {"activity_events", "activity_snapshots", "activity_collector_state"}
    _alembic(migrated_app_db, "upgrade", "head")
    assert await _tables(migrated_app_db) == before


def _rows(*namespaces: str) -> list[dict]:
    return [
        {
            "deployment_id": f"dep-{ns}",
            "deployment_name": ns,
            "namespace": ns,
            "cluster_name": "cluster-a",
            "container_image_idv2": None,
            "container_image_digest": None,
            "container_image_name": None,
            "image_id_v2": None,
            "image_digest": None,
            "image_name": None,
            "scan_time": None,
            "component_count": None,
            "cve_count": None,
            "fixable_cve_count": None,
        }
        for ns in namespaces
    ]


async def test_concurrent_collections_are_serialized_and_never_duplicate(migrated_app_db):
    engine = create_async_engine(migrated_app_db, poolclass=NullPool)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with factory() as session:
            await svc.collect_activity(session, _async_value(_rows("a")), clock=lambda: T0)

        first_reading = asyncio.Event()
        release_first = asyncio.Event()
        second_read_started = asyncio.Event()

        async def slow_source():
            first_reading.set()
            await release_first.wait()
            return _rows("a", "b")

        async def second_source():
            second_read_started.set()
            return _rows("a", "b")

        async def run(source):
            async with factory() as session:
                return await svc.collect_activity(session, source, clock=lambda: T0 + timedelta(seconds=10))

        first = asyncio.create_task(run(slow_source))
        await first_reading.wait()
        second = asyncio.create_task(run(second_source))
        await asyncio.sleep(0.3)
        # The second caller is blocked on the singleton lock, not reading the source.
        assert not second_read_started.is_set()
        release_first.set()
        results = await asyncio.gather(first, second)
        assert [r.event_count for r in results] == [1, 0]

        async with factory() as session:
            kinds = (await session.execute(text("SELECT kind FROM activity_events"))).scalars().all()
            state = (await session.execute(text("SELECT last_event_id FROM activity_collector_state"))).scalar_one()
            max_id = (await session.execute(text("SELECT max(id) FROM activity_events"))).scalar_one()
        assert kinds == ["deployment_observed"]
        assert state == max_id
    finally:
        await engine.dispose()


async def test_failed_collection_rolls_back_on_postgres(migrated_app_db):
    engine = create_async_engine(migrated_app_db, poolclass=NullPool)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with factory() as session:
            await svc.collect_activity(session, _async_value([]), clock=lambda: T0)

        async with factory() as session:
            original = session.flush

            async def failing_flush(*args, **kwargs):
                await original(*args, **kwargs)
                raise RuntimeError("forced failure after flush")

            session.flush = failing_flush
            with pytest.raises(RuntimeError, match="forced failure"):
                await svc.collect_activity(session, _async_value(_rows("a")), clock=lambda: T0 + timedelta(seconds=10))

        async with factory() as session:
            assert (await session.execute(text("SELECT count(*) FROM activity_events"))).scalar_one() == 0
            assert (await session.execute(text("SELECT count(*) FROM activity_snapshots"))).scalar_one() == 0
            state = (await session.execute(text("SELECT last_event_id FROM activity_collector_state"))).scalar_one()
            assert state == 0
            # The sequence advanced inside the rolled-back transaction; ids stay monotonic.
            await svc.collect_activity(session, _async_value(_rows("a")), clock=lambda: T0 + timedelta(seconds=20))
            ids = (await session.execute(text("SELECT id FROM activity_events"))).scalars().all()
            assert len(ids) == 1 and ids[0] >= 1
    finally:
        await engine.dispose()


def _async_value(rows: list[dict]):
    async def read():
        return rows

    return read
