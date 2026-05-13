"""Prometheus metrics setup and scheduler-job instrumentation.

Central place for all Prometheus state in the app:
- HTTP request metrics are auto-collected by prometheus-fastapi-instrumentator
  and exposed on /metrics (unauthenticated, app-level, same port as the rest
  of the API).
- Scheduler jobs use instrument_job() to record duration, run count by status,
  and last-success timestamp.
"""

import logging
import time
from collections.abc import Awaitable, Callable
from functools import wraps
from typing import TypeVar

from fastapi import FastAPI
from prometheus_client import Counter, Gauge, Histogram
from prometheus_fastapi_instrumentator import Instrumentator

from .config import settings as app_settings

logger = logging.getLogger(__name__)

SCHEDULER_JOB_DURATION = Histogram(
    "rhacs_manager_scheduler_job_duration_seconds",
    "Wall-clock duration of an APScheduler job invocation.",
    labelnames=("job",),
)

SCHEDULER_JOB_RUNS = Counter(
    "rhacs_manager_scheduler_job_runs_total",
    "Total APScheduler job invocations, partitioned by outcome.",
    labelnames=("job", "status"),
)

SCHEDULER_LAST_SUCCESS = Gauge(
    "rhacs_manager_scheduler_job_last_success_timestamp_seconds",
    "Unix timestamp of the most recent successful run of an APScheduler job.",
    labelnames=("job",),
)


F = TypeVar("F", bound=Callable[..., Awaitable[None]])


def instrument_job(job_name: str) -> Callable[[F], F]:
    """Decorator that records duration, run-count, and last-success for an async job."""
    # Pre-create labeled child series so they appear in /metrics before the first run.
    SCHEDULER_JOB_RUNS.labels(job=job_name, status="success")
    SCHEDULER_JOB_RUNS.labels(job=job_name, status="failure")
    SCHEDULER_JOB_DURATION.labels(job=job_name)

    def decorator(func: F) -> F:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start = time.monotonic()
            try:
                result = await func(*args, **kwargs)
            except Exception:
                SCHEDULER_JOB_RUNS.labels(job=job_name, status="failure").inc()
                SCHEDULER_JOB_DURATION.labels(job=job_name).observe(time.monotonic() - start)
                raise
            SCHEDULER_JOB_RUNS.labels(job=job_name, status="success").inc()
            SCHEDULER_JOB_DURATION.labels(job=job_name).observe(time.monotonic() - start)
            SCHEDULER_LAST_SUCCESS.labels(job=job_name).set(time.time())
            return result

        return wrapper  # type: ignore[return-value]

    return decorator


def setup_metrics(app: FastAPI) -> None:
    """Mount /metrics on the app when metrics_enabled is true.

    The endpoint is mounted at the app root (not under /api) so it does not
    pass through the auth dependency on routers. It is intentionally
    unauthenticated — restrict access via NetworkPolicy if needed.
    """
    if not app_settings.metrics_enabled:
        logger.info("Prometheus metrics disabled (METRICS_ENABLED=false)")
        return

    instrumentator = Instrumentator(
        should_group_status_codes=False,
        should_ignore_untemplated=True,
        should_instrument_requests_inprogress=True,
        inprogress_labels=True,
        excluded_handlers=["/health", "/ready", "/metrics"],
    )
    instrumentator.instrument(app).expose(
        app,
        endpoint="/metrics",
        include_in_schema=False,
    )
    logger.info("Prometheus metrics exposed at /metrics")
