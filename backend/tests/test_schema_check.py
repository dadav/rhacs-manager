"""StackRox schema compatibility probe (minimum ACS 4.11.6) and its /ready and startup wiring."""

import asyncio
import json
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.stackrox.schema_check import (
    REQUIRED_STACKROX_COLUMNS,
    describe_missing,
    missing_stackrox_columns,
    probe_stackrox_schema,
)

ORIGIN_MISSING = ["image_cves_v2.origin (ACS >= 4.11.6)"]


def _all_present() -> set[tuple[str, str]]:
    return {(table, column) for table, column, _ in REQUIRED_STACKROX_COLUMNS}


def _rows_without_origin() -> list[MagicMock]:
    return [MagicMock(table_name=t, column_name=c) for t, c in _all_present() if c != "origin"]


class _FakeEngine:
    """Engine whose connection returns ``rows`` from execute()."""

    def __init__(self, rows: list | None = None):
        self.rows = rows if rows is not None else []

    @asynccontextmanager
    async def connect(self):
        conn = AsyncMock()
        conn.execute.return_value = self.rows
        yield conn


class _HangingConnectEngine:
    """Connection acquisition never completes (pool exhausted / network stall)."""

    @asynccontextmanager
    async def connect(self):
        await asyncio.Event().wait()
        yield AsyncMock()  # pragma: no cover


class _HangingQueryEngine:
    """Connection succeeds, the schema query never returns."""

    @asynccontextmanager
    async def connect(self):
        conn = AsyncMock()

        async def hang(*args, **kwargs):
            await asyncio.Event().wait()

        conn.execute.side_effect = hang
        yield conn


# --- column bookkeeping ---


def test_complete_schema_reports_nothing():
    assert describe_missing(_all_present()) == []


def test_pre_4_11_6_schema_reports_origin():
    present = _all_present() - {("image_cves_v2", "origin")}
    assert describe_missing(present) == ORIGIN_MISSING


@pytest.mark.asyncio
async def test_missing_stackrox_columns_resolves_tables_via_search_path():
    conn = AsyncMock()
    conn.execute.return_value = _rows_without_origin()

    missing = await missing_stackrox_columns(conn)

    assert missing == ORIGIN_MISSING
    sql, params = conn.execute.call_args.args
    # Must resolve like the app's unqualified queries, not assume the first search_path schema.
    assert "to_regclass" in str(sql)
    assert "current_schema" not in str(sql)
    assert "image_cves_v2" in params["tables"]


# --- time-bounded probe ---


@pytest.mark.asyncio
async def test_probe_returns_missing_columns():
    assert await probe_stackrox_schema(_FakeEngine(_rows_without_origin()), 1.0) == ORIGIN_MISSING


@pytest.mark.asyncio
async def test_probe_times_out_on_stalled_connection():
    with pytest.raises(TimeoutError):
        await probe_stackrox_schema(_HangingConnectEngine(), 0.05)


@pytest.mark.asyncio
async def test_probe_times_out_on_stalled_query():
    with pytest.raises(TimeoutError):
        await probe_stackrox_schema(_HangingQueryEngine(), 0.05)


# --- /ready ---


@pytest.mark.asyncio
async def test_ready_is_503_when_stackrox_schema_too_old():
    import app.main as main

    engine = _FakeEngine(_rows_without_origin())
    with patch.object(main, "app_engine", engine), patch.object(main, "stackrox_engine", engine):
        resp = await main.readiness()

    body = json.loads(resp.body)
    assert resp.status_code == 503
    assert body["checks"]["stackrox_schema"] == "missing: " + ORIGIN_MISSING[0]


@pytest.mark.asyncio
async def test_ready_is_ok_with_compatible_schema():
    import app.main as main

    engine = _FakeEngine([MagicMock(table_name=t, column_name=c) for t, c in _all_present()])
    with patch.object(main, "app_engine", engine), patch.object(main, "stackrox_engine", engine):
        resp = await main.readiness()

    assert resp.status_code == 200
    assert json.loads(resp.body)["checks"]["stackrox_schema"] == "ok"


@pytest.mark.asyncio
async def test_ready_returns_503_instead_of_hanging_on_stalled_schema_query():
    import app.main as main

    class _SelectOneOkSchemaHangs:
        """SELECT 1 succeeds, the schema query stalls."""

        @asynccontextmanager
        async def connect(self):
            conn = AsyncMock()

            async def execute(sql, *args, **kwargs):
                if "to_regclass" in str(sql):
                    await asyncio.Event().wait()

            conn.execute.side_effect = execute
            yield conn

    with (
        patch.object(main, "app_engine", _FakeEngine()),
        patch.object(main, "stackrox_engine", _SelectOneOkSchemaHangs()),
        patch.object(main, "READY_SCHEMA_PROBE_TIMEOUT_SECONDS", 0.05),
    ):
        resp = await asyncio.wait_for(main.readiness(), timeout=5)

    body = json.loads(resp.body)
    assert resp.status_code == 503
    assert body["checks"]["stackrox_db"] == "ok"
    assert body["checks"]["stackrox_schema"] == "TimeoutError"


@pytest.mark.asyncio
async def test_ready_returns_503_instead_of_hanging_on_stalled_connection():
    import app.main as main

    with (
        patch.object(main, "app_engine", _FakeEngine()),
        patch.object(main, "stackrox_engine", _HangingConnectEngine()),
        patch.object(main, "READY_DB_TIMEOUT_SECONDS", 0.05),
    ):
        resp = await asyncio.wait_for(main.readiness(), timeout=5)

    body = json.loads(resp.body)
    assert resp.status_code == 503
    assert body["checks"]["stackrox_db"] == "TimeoutError"


# --- startup probe ---


@pytest.mark.asyncio
async def test_startup_probe_logs_error_once_for_old_schema(caplog):
    import app.main as main

    with (
        patch.object(main, "stackrox_engine", _FakeEngine(_rows_without_origin())),
        caplog.at_level("ERROR", logger="app.main"),
    ):
        result = await main._probe_stackrox_schema()

    assert result == ORIGIN_MISSING
    errors = [r for r in caplog.records if r.levelname == "ERROR"]
    assert len(errors) == 1
    assert errors[0].missing_columns == ORIGIN_MISSING


@pytest.mark.asyncio
async def test_startup_probe_tolerates_unreachable_db():
    import app.main as main

    class _BrokenEngine:
        @asynccontextmanager
        async def connect(self):
            raise ConnectionRefusedError("db down")
            yield  # pragma: no cover

    with patch.object(main, "stackrox_engine", _BrokenEngine()):
        assert await main._probe_stackrox_schema() == []


@pytest.mark.asyncio
@pytest.mark.parametrize("engine_cls", [_HangingConnectEngine, _HangingQueryEngine])
async def test_startup_probe_does_not_block_on_stalled_db(engine_cls, caplog):
    import app.main as main

    with (
        patch.object(main, "stackrox_engine", engine_cls()),
        patch.object(main, "SCHEMA_PROBE_TIMEOUT_SECONDS", 0.05),
        caplog.at_level("ERROR", logger="app.main"),
    ):
        result = await asyncio.wait_for(main._probe_stackrox_schema(), timeout=5)

    assert result == []
    assert any("schema probe failed" in r.getMessage() for r in caplog.records)
