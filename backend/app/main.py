import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from .config import settings as app_settings
from .database import app_engine, stackrox_engine
from .routers import (
    audit,
    auth,
    badges,
    cves,
    dashboard,
    escalations,
    exports,
    namespaces,
    notifications,
    priorities,
    remediations,
    risk_acceptances,
    settings,
    suppression_rules,
)
from .tasks.scheduler import run_escalation_check, setup_scheduler

logging.basicConfig(level=getattr(logging, app_settings.log_level.upper(), logging.INFO))
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not app_settings.dev_mode:
        _validate_production_config()

    active_scheduler = None
    if app_settings.scheduler_enabled:
        active_scheduler = setup_scheduler()
        active_scheduler.start()
        logger.info("APScheduler started")
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


app = FastAPI(
    title="RHACS CVE Manager",
    description="CVE-Verwaltung für RHACS-Cluster",
    version="0.1.0",
    lifespan=lifespan,
)

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
    namespaces,
    risk_acceptances,
    priorities,
    escalations,
    remediations,
    notifications,
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


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/ready")
async def readiness() -> JSONResponse:
    checks: dict[str, str] = {}
    for name, engine in [("app_db", app_engine), ("stackrox_db", stackrox_engine)]:
        try:
            async with engine.connect() as conn:
                await asyncio.wait_for(conn.execute(text("SELECT 1")), timeout=3.0)
            checks[name] = "ok"
        except Exception as exc:
            checks[name] = str(exc)

    if all(v == "ok" for v in checks.values()):
        return JSONResponse({"status": "ok", "checks": checks})
    return JSONResponse(
        {"status": "degraded", "checks": checks},
        status_code=503,
    )
