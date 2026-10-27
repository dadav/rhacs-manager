import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from .config import settings as app_settings
from .database import app_engine, stackrox_engine
from .i18n import LanguageMiddleware
from .logging_setup import configure_logging
from .metrics import setup_metrics
from .routers import (
    audit,
    auth,
    badges,
    cves,
    dashboard,
    escalations,
    exports,
    images,
    namespaces,
    notifications,
    preferences,
    presence,
    priorities,
    remediations,
    risk_acceptances,
    settings,
    suppression_rules,
)
from .stackrox.schema_check import SCHEMA_PROBE_TIMEOUT_SECONDS, probe_stackrox_schema
from .tasks.scheduler import run_escalation_check, setup_scheduler

configure_logging(app_settings.log_level, app_settings.log_format)
logger = logging.getLogger(__name__)

_INSECURE_SECRET_KEYS = {
    "",
    "dev-secret-key-change-in-production",
    "change-me-to-a-random-secret",
}


def _validate_production_config() -> None:
    """Validate configuration for production (dev_mode=False). Raises on fatal misconfiguration."""
    if app_settings.secret_key in _INSECURE_SECRET_KEYS:
        raise RuntimeError(
            "SECRET_KEY must be set to a strong random value in production. Current value is empty or a known default."
        )
    if not app_settings.oidc_issuer and not app_settings.spoke_api_keys:
        raise RuntimeError(
            "No working auth path configured: OIDC_ISSUER is empty and SPOKE_API_KEYS is empty. "
            "At least one must be set when DEV_MODE=false."
        )
    if not app_settings.management_email:
        logger.warning("MANAGEMENT_EMAIL is not set — org-wide digest emails will not be sent")
    if not app_settings.default_escalation_email:
        logger.warning("DEFAULT_ESCALATION_EMAIL is not set — fallback escalation contact missing")


# Shorter than the startup budget: kubelet readiness probes time out quickly.
READY_DB_TIMEOUT_SECONDS = 3.0
READY_SCHEMA_PROBE_TIMEOUT_SECONDS = 3.0


async def _probe_stackrox_schema() -> list[str]:
    """Startup schema probe. Never raises: the DB may be briefly unreachable at boot, /ready carries the signal."""
    try:
        missing = await probe_stackrox_schema(stackrox_engine, SCHEMA_PROBE_TIMEOUT_SECONDS)
    except Exception:
        # Includes TimeoutError: startup must complete so /health and /ready come up.
        logger.exception(
            "StackRox schema probe failed at startup; continuing, /ready reports the schema state",
            extra={"timeout_seconds": SCHEMA_PROBE_TIMEOUT_SECONDS},
        )
        return []
    if missing:
        logger.error(
            "StackRox Central DB schema is too old for RHACS Manager (requires ACS 4.11.6+)",
            extra={"missing_columns": missing},
        )
    return missing


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not app_settings.dev_mode:
        _validate_production_config()

    schema_missing = await _probe_stackrox_schema()

    active_scheduler = None
    if app_settings.scheduler_enabled:
        active_scheduler = setup_scheduler()
        active_scheduler.start()
        logger.info("APScheduler started")
        if schema_missing:
            logger.error(
                "Skipping initial escalation check: StackRox schema incompatible",
                extra={"missing_columns": schema_missing},
            )
        else:
            try:
                await run_escalation_check()
                logger.info("Initial escalation check complete")
            except Exception:
                logger.exception("Initial escalation check failed")
    else:
        logger.info("Scheduler disabled (SCHEDULER_ENABLED=false)")
    yield
    if active_scheduler:
        active_scheduler.shutdown()
        logger.info("APScheduler stopped")
    await app_engine.dispose()
    await stackrox_engine.dispose()
    logger.info("Database engines disposed")


app = FastAPI(
    title="RHACS CVE Manager",
    description="CVE-Verwaltung für RHACS-Cluster",
    version="0.1.0",
    lifespan=lifespan,
)

# Pin request language from Accept-Language so ApiError messages localize.
app.add_middleware(LanguageMiddleware)

# CORS: dev mode allows all origins; production uses configured origins or app_base_url
if app_settings.dev_mode:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    _cors_origins = app_settings.cors_origins or [app_settings.app_base_url]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Register all routers under /api prefix
for router_module in [
    auth,
    dashboard,
    cves,
    images,
    namespaces,
    risk_acceptances,
    priorities,
    escalations,
    remediations,
    notifications,
    preferences,
    presence,
    badges,
    settings,
    audit,
    exports,
    suppression_rules,
]:
    app.include_router(router_module.router, prefix="/api")


# Register dev-only router when DEV_MODE is enabled
if app_settings.dev_mode:
    from .routers import dev

    app.include_router(dev.router, prefix="/api")


setup_metrics(app)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/ready")
async def readiness() -> JSONResponse:
    checks: dict[str, str] = {}
    for name, engine in [("app_db", app_engine), ("stackrox_db", stackrox_engine)]:
        try:
            # Bound connection acquisition too, not just the query.
            async with asyncio.timeout(READY_DB_TIMEOUT_SECONDS):
                async with engine.connect() as conn:
                    await conn.execute(text("SELECT 1"))
            checks[name] = "ok"
        except Exception as exc:
            checks[name] = str(exc) or type(exc).__name__

    if checks["stackrox_db"] == "ok":
        try:
            missing = await probe_stackrox_schema(stackrox_engine, READY_SCHEMA_PROBE_TIMEOUT_SECONDS)
            checks["stackrox_schema"] = "ok" if not missing else "missing: " + ", ".join(missing)
        except Exception as exc:
            checks["stackrox_schema"] = str(exc) or type(exc).__name__

    if all(v == "ok" for v in checks.values()):
        return JSONResponse({"status": "ok", "checks": checks})
    return JSONResponse(
        {"status": "degraded", "checks": checks},
        status_code=503,
    )
