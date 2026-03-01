"""APScheduler background jobs: escalation checks, expiry checks, weekly digest."""
import asyncio
import logging
from datetime import datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from ..config import settings as app_settings
from ..database import AppSessionLocal, StackRoxSessionLocal
from ..models.escalation import Escalation
from ..models.global_settings import GlobalSettings
from ..models.risk_acceptance import RiskAcceptance, RiskStatus
from ..notifications import service as notif_svc
from ..mail import service as mail_svc

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler(timezone="UTC")


async def _get_settings(session) -> GlobalSettings | None:
    result = await session.execute(select(GlobalSettings).limit(1))
    return result.scalar_one_or_none()


async def run_expiry_check() -> None:
    """Mark risk acceptances as expired if past their expiry date."""
    logger.info("Running expiry check")
    async with AppSessionLocal() as session:
        now = datetime.utcnow()
        result = await session.execute(
            select(RiskAcceptance).where(
                RiskAcceptance.status == RiskStatus.approved,
                RiskAcceptance.expires_at != None,
                RiskAcceptance.expires_at < now,
            )
        )
        for acceptance in result.scalars().all():
            acceptance.status = RiskStatus.expired
            logger.info("Expired risk acceptance %s for CVE %s", acceptance.id, acceptance.cve_id)
        await session.commit()


async def run_expiry_warning() -> None:
    """Notify RA creators 7 days before risk acceptance expires."""
    logger.info("Running expiry warning check")
    async with AppSessionLocal() as session:
        now = datetime.utcnow()
        warning_cutoff = now + timedelta(days=7)
        result = await session.execute(
            select(RiskAcceptance).where(
                RiskAcceptance.status == RiskStatus.approved,
                RiskAcceptance.expires_at != None,
                RiskAcceptance.expires_at >= now,
                RiskAcceptance.expires_at <= warning_cutoff,
            )
        )
        for acceptance in result.scalars().all():
            await notif_svc.notify_risk_expiring(session, acceptance)
        await session.commit()


async def run_escalation_check() -> None:
    """Check for CVEs that should be escalated based on age and settings.

    Iterates over all StackRox namespaces. Creates escalations keyed by
    (cve_id, namespace, cluster_name).
    """
    logger.info("Running escalation check")
    async with AppSessionLocal() as app_session:
        settings = await _get_settings(app_session)
        if not settings or not settings.escalation_rules:
            return

        # Get all approved risk acceptance CVE IDs
        accepted_result = await app_session.execute(
            select(RiskAcceptance.cve_id).where(
                RiskAcceptance.status == RiskStatus.approved,
            )
        )
        accepted_ids = {row[0] for row in accepted_result}

        async with StackRoxSessionLocal() as sx_session:
            from ..stackrox.queries import get_cves_for_namespaces, list_namespaces

            # Get all namespaces from StackRox
            all_ns_rows = await list_namespaces(sx_session)
            all_ns = [(r["namespace"], r["cluster_name"]) for r in all_ns_rows]

            if not all_ns:
                return

            # Get all CVEs across all namespaces
            cves = await get_cves_for_namespaces(sx_session, all_ns)

            for cve in cves:
                if cve["cve_id"] in accepted_ids:
                    continue

                age_days = 0
                if cve.get("first_seen"):
                    age_days = (datetime.utcnow() - cve["first_seen"]).days

                for rule in settings.escalation_rules:
                    severity_ok = cve.get("severity", 0) >= rule.get("severity_min", 0)
                    epss_ok = cve.get("epss_probability", 0) >= rule.get("epss_threshold", 0)
                    if not (severity_ok or epss_ok):
                        continue

                    level = None
                    if age_days >= rule.get("days_to_level3", 999):
                        level = 3
                    elif age_days >= rule.get("days_to_level2", 999):
                        level = 2
                    elif age_days >= rule.get("days_to_level1", 999):
                        level = 1

                    if level is None:
                        continue

                    # For namespace-scoped escalations, we need the namespace info
                    # CVEs from get_cves_for_namespaces are aggregated; we escalate org-wide
                    # Check if escalation already exists at this level for any namespace
                    existing = await app_session.execute(
                        select(Escalation).where(
                            Escalation.cve_id == cve["cve_id"],
                            Escalation.level == level,
                        )
                    )
                    if existing.scalar_one_or_none():
                        continue

                    # Create org-wide escalation (use first namespace from all_ns as representative)
                    ns_name, cluster = all_ns[0] if all_ns else ("unknown", "unknown")
                    esc = Escalation(
                        cve_id=cve["cve_id"],
                        namespace=ns_name,
                        cluster_name=cluster,
                        level=level,
                        notified=False,
                    )
                    app_session.add(esc)
                    await app_session.flush()

                    await notif_svc.notify_escalation(
                        app_session, cve["cve_id"], ns_name, cluster, level
                    )
                    esc.notified = True
                    break  # apply highest matching rule only

        await app_session.commit()
        logger.info("Escalation check complete")


async def run_weekly_digest() -> None:
    """Send weekly CVE digest email to management_email."""
    logger.info("Running weekly digest")
    async with AppSessionLocal() as app_session:
        settings = await _get_settings(app_session)
        today = datetime.utcnow().weekday()
        if settings and settings.digest_day != today:
            return

        if not app_settings.management_email:
            logger.info("No management_email configured, skipping digest")
            return

        async with StackRoxSessionLocal() as sx_session:
            from ..stackrox.queries import get_all_cves

            cves = await get_all_cves(sx_session)

            open_ra_result = await app_session.execute(
                select(RiskAcceptance).where(
                    RiskAcceptance.status == RiskStatus.requested,
                )
            )
            open_ra = len(list(open_ra_result.scalars().all()))

            stats = {
                "total_cves": len(cves),
                "critical_cves": sum(1 for c in cves if c.get("severity") == 4),
                "fixable_cves": sum(1 for c in cves if c.get("fixable")),
                "open_risk_acceptances": open_ra,
                "avg_epss": (
                    sum(c.get("epss_probability", 0) for c in cves) / len(cves)
                    if cves else 0.0
                ),
            }
            await mail_svc.send_weekly_digest(
                app_settings.management_email, stats
            )


def setup_scheduler() -> AsyncIOScheduler:
    scheduler.add_job(
        lambda: asyncio.ensure_future(run_expiry_check()),
        "cron",
        hour=1,
        minute=0,
        id="expiry_check",
    )
    scheduler.add_job(
        lambda: asyncio.ensure_future(run_expiry_warning()),
        "cron",
        hour=7,
        minute=30,
        id="expiry_warning",
    )
    scheduler.add_job(
        lambda: asyncio.ensure_future(run_escalation_check()),
        "cron",
        hour=8,
        minute=0,
        id="escalation_check",
    )
    scheduler.add_job(
        lambda: asyncio.ensure_future(run_weekly_digest()),
        "cron",
        hour=7,
        minute=0,
        id="weekly_digest",
    )
    return scheduler
