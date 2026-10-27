"""StackRox schema compatibility probe (minimum ACS 4.11.6) and its /ready wiring."""

import json
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.stackrox.schema_check import REQUIRED_STACKROX_COLUMNS, describe_missing, missing_stackrox_columns


def _all_present() -> set[tuple[str, str]]:
    return {(table, column) for table, column, _ in REQUIRED_STACKROX_COLUMNS}


def test_complete_schema_reports_nothing():
    assert describe_missing(_all_present()) == []


def test_pre_4_11_6_schema_reports_origin():
    present = _all_present() - {("image_cves_v2", "origin")}
    assert describe_missing(present) == ["image_cves_v2.origin (ACS >= 4.11.6)"]


@pytest.mark.asyncio
async def test_missing_stackrox_columns_reads_information_schema():
    rows = [MagicMock(table_name=t, column_name=c) for t, c in _all_present() if c != "origin"]
    conn = AsyncMock()
    conn.execute.return_value = rows

    missing = await missing_stackrox_columns(conn)

    assert missing == ["image_cves_v2.origin (ACS >= 4.11.6)"]
    params = conn.execute.call_args.args[1]
    assert "image_cves_v2" in params["tables"]


class _FakeEngine:
    @asynccontextmanager
    async def connect(self):
        conn = AsyncMock()
        yield conn


@pytest.mark.asyncio
async def test_ready_is_503_when_stackrox_schema_too_old():
    import app.main as main

    engine = _FakeEngine()
    with (
        patch.object(main, "app_engine", engine),
        patch.object(main, "stackrox_engine", engine),
        patch.object(
            main, "missing_stackrox_columns", AsyncMock(return_value=["image_cves_v2.origin (ACS >= 4.11.6)"])
        ),
    ):
        resp = await main.readiness()

    body = json.loads(resp.body)
    assert resp.status_code == 503
    assert body["checks"]["stackrox_schema"] == "missing: image_cves_v2.origin (ACS >= 4.11.6)"


@pytest.mark.asyncio
async def test_ready_is_ok_with_compatible_schema():
    import app.main as main

    engine = _FakeEngine()
    with (
        patch.object(main, "app_engine", engine),
        patch.object(main, "stackrox_engine", engine),
        patch.object(main, "missing_stackrox_columns", AsyncMock(return_value=[])),
    ):
        resp = await main.readiness()

    assert resp.status_code == 200
    assert json.loads(resp.body)["checks"]["stackrox_schema"] == "ok"


@pytest.mark.asyncio
async def test_startup_probe_logs_error_once_for_old_schema(caplog):
    import app.main as main

    missing = ["image_cves_v2.origin (ACS >= 4.11.6)"]
    with (
        patch.object(main, "stackrox_engine", _FakeEngine()),
        patch.object(main, "missing_stackrox_columns", AsyncMock(return_value=missing)),
        caplog.at_level("ERROR", logger="app.main"),
    ):
        result = await main._probe_stackrox_schema()

    assert result == missing
    errors = [r for r in caplog.records if r.levelname == "ERROR"]
    assert len(errors) == 1
    assert errors[0].missing_columns == missing


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
