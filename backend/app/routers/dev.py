"""Dev-only endpoints for triggering background jobs manually.

Only registered when DEV_MODE=true (see main.py).
"""

import logging

from fastapi import APIRouter

from ..tasks.scheduler import run_escalation_check, run_weekly_digest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dev", tags=["dev"])


@router.post("/trigger-escalation-check")
async def trigger_escalation_check() -> dict:
    logger.info("Dev trigger: run_escalation_check")
    await run_escalation_check()
    return {"status": "ok", "job": "escalation_check"}


@router.post("/trigger-weekly-digest")
async def trigger_weekly_digest() -> dict:
    logger.info("Dev trigger: run_weekly_digest")
    await run_weekly_digest()
    return {"status": "ok", "job": "weekly_digest"}
