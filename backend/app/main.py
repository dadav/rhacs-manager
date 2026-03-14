import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings as app_settings
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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = setup_scheduler()
    scheduler.start()
    logger.info("APScheduler started")
    try:
        await run_escalation_check()
        logger.info("Initial escalation check complete")
    except Exception:
        logger.exception("Initial escalation check failed")
    yield
    scheduler.shutdown()
    logger.info("APScheduler stopped")


app = FastAPI(
    title="RHACS CVE Manager",
    description="CVE-Verwaltung für RHACS-Cluster",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
