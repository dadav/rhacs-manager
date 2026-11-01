"""Dev-only endpoints for triggering background jobs manually.

Only registered when DEV_MODE=true (see main.py).
"""

import logging

from fastapi import APIRouter

from ..tasks.scheduler import (
    run_cve_subscription_diff,
    run_cve_subscription_email,
    run_escalation_check,
    run_team_cve_alerts,
    run_team_digest_now,
    run_weekly_digest,
)

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


@router.post("/trigger-team-cve-alerts")
async def trigger_team_cve_alerts() -> dict:
    logger.info("Dev trigger: run_team_cve_alerts")
    await run_team_cve_alerts()
    return {"status": "ok", "job": "team_cve_alerts"}


@router.post("/trigger-team-digest")
async def trigger_team_digest() -> dict:
    logger.info("Dev trigger: run_team_digest_now")
    await run_team_digest_now()
    return {"status": "ok", "job": "team_digest"}


@router.post("/trigger-cve-subscription-diff")
async def trigger_cve_subscription_diff() -> dict:
    logger.info("Dev trigger: run_cve_subscription_diff")
    await run_cve_subscription_diff()
    return {"status": "ok", "job": "cve_subscription_diff"}


@router.post("/trigger-cve-subscription-email")
async def trigger_cve_subscription_email() -> dict:
    logger.info("Dev trigger: run_cve_subscription_email")
    await run_cve_subscription_email()
    return {"status": "ok", "job": "cve_subscription_email"}
