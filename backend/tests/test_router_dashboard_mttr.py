"""MTTR buckets use the severity from the shared StackRox query (scope-independent)."""

from contextlib import asynccontextmanager
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from app.routers import dashboard
from app.schemas.cve import SeverityLevel


def _session_factory(session):
    @asynccontextmanager
    async def factory():
        yield session

    return factory


async def test_mttr_buckets_by_shared_query_severity():
    resolved = [
        SimpleNamespace(cve_id="CVE-DOWN", resolved_at=datetime(2026, 10, 11)),
        SimpleNamespace(cve_id="CVE-CRIT", resolved_at=datetime(2026, 10, 3)),
    ]
    app_db = AsyncMock()
    result = MagicMock()
    result.all.return_value = resolved
    app_db.execute.return_value = result
    severity_query = AsyncMock(
        return_value={
            "CVE-DOWN": (SeverityLevel.MODERATE.value, datetime(2026, 10, 1)),
            "CVE-CRIT": (SeverityLevel.CRITICAL.value, datetime(2026, 10, 1)),
        }
    )

    with (
        patch.object(dashboard, "AppSessionLocal", _session_factory(app_db)),
        patch.object(dashboard, "StackRoxSessionLocal", _session_factory(AsyncMock())),
        patch.object(dashboard.sx, "get_cve_severity_and_first_seen", severity_query),
    ):
        buckets = await dashboard._mttr_by_severity(None)

    assert {(b.severity, b.avg_days, b.count) for b in buckets} == {
        (SeverityLevel.MODERATE, 10.0, 1),
        (SeverityLevel.CRITICAL, 2.0, 1),
    }
    assert severity_query.await_args.args[1] in (["CVE-DOWN", "CVE-CRIT"], ["CVE-CRIT", "CVE-DOWN"])
