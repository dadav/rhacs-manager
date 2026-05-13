"""Tests for the Prometheus /metrics endpoint."""

from contextlib import asynccontextmanager

import httpx
import pytest
from fastapi import FastAPI


def _build_metrics_app(enabled: bool, monkeypatch: pytest.MonkeyPatch) -> FastAPI:
    """Build a fresh FastAPI app with setup_metrics applied per current settings flag."""
    from app import metrics as metrics_module

    monkeypatch.setattr(metrics_module.app_settings, "metrics_enabled", enabled)

    @asynccontextmanager
    async def _noop_lifespan(app: FastAPI):
        yield

    test_app = FastAPI(lifespan=_noop_lifespan)

    @test_app.get("/api/probe")
    async def probe() -> dict:
        return {"ok": True}

    metrics_module.setup_metrics(test_app)
    return test_app


async def test_metrics_endpoint_is_public_and_returns_prometheus_text(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = _build_metrics_app(enabled=True, monkeypatch=monkeypatch)

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        await client.get("/api/probe")
        response = await client.get("/metrics")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    body = response.text
    assert "http_request_duration_seconds" in body


async def test_metrics_endpoint_absent_when_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = _build_metrics_app(enabled=False, monkeypatch=monkeypatch)

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get("/metrics")

    assert response.status_code == 404


def test_scheduler_metrics_initialized_before_first_run() -> None:
    # Importing scheduler triggers @instrument_job decorators, which pre-create label series
    # on the module-level default registry. Scrape the registry directly to avoid re-instrumenting
    # a second FastAPI app (which would clash on http_requests_inprogress).
    from prometheus_client import generate_latest

    import app.tasks.scheduler  # noqa: F401

    body = generate_latest().decode()
    expected_jobs = (
        "expiry_check",
        "expiry_warning",
        "escalation_check",
        "weekly_digest",
        "remediation_overdue_check",
        "remediation_auto_resolve",
    )
    for job in expected_jobs:
        assert f'rhacs_manager_scheduler_job_runs_total{{job="{job}",status="success"}} 0.0' in body
        assert f'rhacs_manager_scheduler_job_runs_total{{job="{job}",status="failure"}} 0.0' in body
        assert f'rhacs_manager_scheduler_job_duration_seconds_count{{job="{job}"}} 0.0' in body


async def test_instrument_job_records_success_and_failure() -> None:
    from app.metrics import SCHEDULER_JOB_RUNS, instrument_job

    @instrument_job("test_job_ok")
    async def good() -> None:
        return None

    @instrument_job("test_job_fail")
    async def bad() -> None:
        raise RuntimeError("boom")

    await good()
    with pytest.raises(RuntimeError):
        await bad()

    success = SCHEDULER_JOB_RUNS.labels(job="test_job_ok", status="success")._value.get()
    failure = SCHEDULER_JOB_RUNS.labels(job="test_job_fail", status="failure")._value.get()
    assert success >= 1.0
    assert failure >= 1.0
