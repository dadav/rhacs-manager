"""APScheduler background jobs: escalation checks, expiry checks, weekly digest."""

import logging
from datetime import date, datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import delete, func, select

from ..config import settings as app_settings
from ..database import AppSessionLocal, StackRoxSessionLocal
from ..mail import service as mail_svc
from ..metrics import instrument_job
from ..models.cve_priority import CvePriority
from ..models.escalation import Escalation, EscalationWarning
from ..models.global_settings import GlobalSettings
from ..models.namespace_contact import NamespaceContact
from ..models.remediation import Remediation, RemediationStatus
from ..models.risk_acceptance import RiskAcceptance, RiskStatus
from ..notifications import service as notif_svc
from ..services.escalation_rules import level_deadlines, rule_matches

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler(timezone="UTC")


async def _get_settings(session) -> GlobalSettings | None:
    result = await session.execute(select(GlobalSettings).limit(1))
    return result.scalar_one_or_none()


@instrument_job("expiry_check")
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
            logger.info(
                "Expired risk acceptance %s for CVE %s",
                acceptance.id,
                acceptance.cve_id,
            )
        await session.commit()


@instrument_job("expiry_warning")
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


@instrument_job("escalation_check")
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

        min_cvss = float(settings.min_cvss_score) if settings.min_cvss_score else 0.0
        min_epss = float(settings.min_epss_score) if settings.min_epss_score else 0.0

        # Get all approved risk acceptance CVE IDs
        accepted_result = await app_session.execute(
            select(RiskAcceptance.cve_id).where(
                RiskAcceptance.status == RiskStatus.approved,
            )
        )
        accepted_ids = {row[0] for row in accepted_result}

        # Build always_show: prioritized CVEs + non-approved active RAs
        prio_result = await app_session.execute(select(CvePriority.cve_id))
        always_show = {row[0] for row in prio_result}
        active_ra_result = await app_session.execute(
            select(RiskAcceptance.cve_id).where(
                RiskAcceptance.status == RiskStatus.requested,
            )
        )
        always_show |= {row[0] for row in active_ra_result}

        async with StackRoxSessionLocal() as sx_session:
            from ..stackrox.queries import (
                get_affected_deployments,
                get_cves_by_namespace_detail,
                list_namespaces,
            )

            # Get all namespaces from StackRox
            all_ns_rows = await list_namespaces(sx_session)
            all_ns = [(r["namespace"], r["cluster_name"]) for r in all_ns_rows]

            if not all_ns:
                return

            # Get CVEs per (namespace, cluster) — not aggregated
            cve_rows = await get_cves_by_namespace_detail(
                sx_session,
                all_ns,
                min_cvss,
                min_epss,
                always_show,
            )

            for row in cve_rows:
                if row["cve_id"] in accepted_ids:
                    continue

                now = datetime.utcnow()

                for rule in settings.escalation_rules:
                    if not rule_matches(rule, row.get("severity", 0), float(row.get("epss_probability", 0))):
                        continue

                    deadlines = level_deadlines(
                        rule,
                        first_seen=row.get("first_seen"),
                        fix_available_since=row.get("fix_available_since"),
                    )
                    triggered = [lvl for lvl, dt in deadlines.items() if dt <= now]
                    if not triggered:
                        continue
                    level = max(triggered)

                    ns_name = row["namespace"]
                    cluster = row["cluster_name"]

                    # Dedup: check (cve_id, level, namespace, cluster_name)
                    existing = await app_session.execute(
                        select(Escalation).where(
                            Escalation.cve_id == row["cve_id"],
                            Escalation.level == level,
                            Escalation.namespace == ns_name,
                            Escalation.cluster_name == cluster,
                        )
                    )
                    if existing.scalar_one_or_none():
                        continue

                    esc = Escalation(
                        cve_id=row["cve_id"],
                        namespace=ns_name,
                        cluster_name=cluster,
                        level=level,
                        notified=False,
                    )
                    app_session.add(esc)
                    await app_session.flush()

                    await notif_svc.notify_escalation(app_session, row["cve_id"], ns_name, cluster, level)
                    esc.notified = True

                    # Fetch affected deployments for email context
                    deploy_rows = await get_affected_deployments(
                        sx_session,
                        row["cve_id"],
                        [(ns_name, cluster)],
                    )

                    email_kwargs = dict(
                        cve_id=row["cve_id"],
                        namespace=ns_name,
                        cluster_name=cluster,
                        level=level,
                        severity=row.get("severity"),
                        cvss=row.get("cvss"),
                        epss_probability=row.get("epss_probability"),
                        deployments=deploy_rows,
                    )

                    # Send escalation email to namespace contact (if configured)
                    contact_result = await app_session.execute(
                        select(NamespaceContact).where(
                            NamespaceContact.namespace == ns_name,
                            NamespaceContact.cluster_name == cluster,
                        )
                    )
                    contact = contact_result.scalar_one_or_none()
                    recipient = None
                    if contact:
                        recipient = contact.escalation_email
                    elif app_settings.default_escalation_email:
                        recipient = app_settings.default_escalation_email
                    elif app_settings.management_email:
                        recipient = app_settings.management_email

                    if recipient:
                        try:
                            await mail_svc.send_escalation_email(recipient, **email_kwargs)
                        except Exception:
                            logger.exception(
                                "Failed to send escalation email for %s to %s",
                                row["cve_id"],
                                recipient,
                            )

                    break  # apply highest matching rule only

        # Cleanup: remove escalations for CVEs that no longer pass thresholds
        # Collect all CVE IDs that are currently visible (pass thresholds or always-show)
        visible_cve_ids = {row["cve_id"] for row in cve_rows} | always_show

        all_esc_result = await app_session.execute(select(Escalation.id, Escalation.cve_id))
        stale_ids = [
            esc_id for esc_id, cve_id in all_esc_result if cve_id not in visible_cve_ids and cve_id not in accepted_ids
        ]
        if stale_ids:
            await app_session.execute(delete(Escalation).where(Escalation.id.in_(stale_ids)))
            logger.info(
                "Cleaned up %d stale escalations for CVEs below thresholds",
                len(stale_ids),
            )

        await app_session.commit()
        logger.info("Escalation check complete")


@instrument_job("escalation_warning")
async def run_escalation_warning() -> None:
    """Email namespace contacts before a CVE escalates.

    Mirrors run_escalation_check's per-(namespace, cluster) iteration, but instead
    of firing when a level deadline is already past, it warns when the next not-yet-
    reached level falls within settings.escalation_warning_days. Deduplicated via
    the escalation_warnings table so a contact is emailed at most once per
    (cve_id, level, namespace, cluster_name).
    """
    logger.info("Running escalation warning check")
    async with AppSessionLocal() as app_session:
        settings = await _get_settings(app_session)
        if not settings or not settings.escalation_rules:
            return

        warning_days = settings.escalation_warning_days
        min_cvss = float(settings.min_cvss_score) if settings.min_cvss_score else 0.0
        min_epss = float(settings.min_epss_score) if settings.min_epss_score else 0.0

        # Approved risk acceptances are excluded from escalation entirely.
        accepted_result = await app_session.execute(
            select(RiskAcceptance.cve_id).where(
                RiskAcceptance.status == RiskStatus.approved,
            )
        )
        accepted_ids = {row[0] for row in accepted_result}

        # always_show: prioritized CVEs + non-approved active RAs bypass thresholds.
        prio_result = await app_session.execute(select(CvePriority.cve_id))
        always_show = {row[0] for row in prio_result}
        active_ra_result = await app_session.execute(
            select(RiskAcceptance.cve_id).where(
                RiskAcceptance.status == RiskStatus.requested,
            )
        )
        always_show |= {row[0] for row in active_ra_result}

        async with StackRoxSessionLocal() as sx_session:
            from ..stackrox.queries import (
                get_affected_deployments,
                get_cves_by_namespace_detail,
                list_namespaces,
            )

            all_ns_rows = await list_namespaces(sx_session)
            all_ns = [(r["namespace"], r["cluster_name"]) for r in all_ns_rows]
            if not all_ns:
                return

            cve_rows = await get_cves_by_namespace_detail(
                sx_session,
                all_ns,
                min_cvss,
                min_epss,
                always_show,
            )

            for row in cve_rows:
                if row["cve_id"] in accepted_ids:
                    continue

                now = datetime.utcnow()
                ns_name = row["namespace"]
                cluster = row["cluster_name"]

                for rule in settings.escalation_rules:
                    if not rule_matches(rule, row.get("severity", 0), float(row.get("epss_probability", 0))):
                        continue

                    deadlines = level_deadlines(
                        rule,
                        first_seen=row.get("first_seen"),
                        fix_available_since=row.get("fix_available_since"),
                    )

                    # Next not-yet-due level for this rule (smallest level still in the future).
                    candidate = None
                    for lvl in sorted(deadlines):
                        if (deadlines[lvl] - now).days <= 0:
                            continue  # already due — run_escalation_check handles it
                        candidate = lvl
                        break
                    if candidate is None:
                        continue

                    days_until = (deadlines[candidate] - now).days
                    if not (0 < days_until <= warning_days):
                        break  # next level is beyond the warning window

                    # Skip if already escalated or already warned for this exact level.
                    already_escalated = await app_session.execute(
                        select(Escalation).where(
                            Escalation.cve_id == row["cve_id"],
                            Escalation.level == candidate,
                            Escalation.namespace == ns_name,
                            Escalation.cluster_name == cluster,
                        )
                    )
                    if already_escalated.scalar_one_or_none():
                        break
                    already_warned = await app_session.execute(
                        select(EscalationWarning).where(
                            EscalationWarning.cve_id == row["cve_id"],
                            EscalationWarning.level == candidate,
                            EscalationWarning.namespace == ns_name,
                            EscalationWarning.cluster_name == cluster,
                        )
                    )
                    if already_warned.scalar_one_or_none():
                        break

                    # Resolve recipient: namespace contact -> default -> management.
                    contact_result = await app_session.execute(
                        select(NamespaceContact).where(
                            NamespaceContact.namespace == ns_name,
                            NamespaceContact.cluster_name == cluster,
                        )
                    )
                    contact = contact_result.scalar_one_or_none()
                    recipient = None
                    if contact:
                        recipient = contact.escalation_email
                    elif app_settings.default_escalation_email:
                        recipient = app_settings.default_escalation_email
                    elif app_settings.management_email:
                        recipient = app_settings.management_email

                    if recipient:
                        deploy_rows = await get_affected_deployments(
                            sx_session,
                            row["cve_id"],
                            [(ns_name, cluster)],
                        )
                        try:
                            await mail_svc.send_escalation_warning_email(
                                recipient,
                                cve_id=row["cve_id"],
                                namespace=ns_name,
                                cluster_name=cluster,
                                level=candidate,
                                days_until=days_until,
                                severity=row.get("severity"),
                                cvss=row.get("cvss"),
                                epss_probability=row.get("epss_probability"),
                                deployments=deploy_rows,
                            )
                        except Exception:
                            logger.exception(
                                "Failed to send escalation warning email for %s to %s",
                                row["cve_id"],
                                recipient,
                            )
                            break

                    # Record dedup row even if no recipient, so we don't re-evaluate daily.
                    app_session.add(
                        EscalationWarning(
                            cve_id=row["cve_id"],
                            namespace=ns_name,
                            cluster_name=cluster,
                            level=candidate,
                        )
                    )
                    break  # one warning per (cve, namespace, cluster) per run

        # Cleanup: drop warnings for CVEs no longer visible (below thresholds/accepted).
        visible_cve_ids = {row["cve_id"] for row in cve_rows} | always_show
        all_warn_result = await app_session.execute(select(EscalationWarning.id, EscalationWarning.cve_id))
        stale_ids = [
            warn_id
            for warn_id, cve_id in all_warn_result
            if cve_id not in visible_cve_ids and cve_id not in accepted_ids
        ]
        if stale_ids:
            await app_session.execute(delete(EscalationWarning).where(EscalationWarning.id.in_(stale_ids)))
            logger.info(
                "Cleaned up %d stale escalation warnings for CVEs below thresholds",
                len(stale_ids),
            )

        await app_session.commit()
        logger.info("Escalation warning check complete")


@instrument_job("remediation_overdue_check")
async def run_remediation_overdue_check() -> None:
    """Notify users about overdue remediations (target_date passed, still open/in_progress)."""
    logger.info("Running remediation overdue check")
    async with AppSessionLocal() as session:
        today = datetime.utcnow().date()
        result = await session.execute(
            select(Remediation).where(
                Remediation.target_date != None,
                Remediation.target_date < today,
                Remediation.status.in_([RemediationStatus.open, RemediationStatus.in_progress]),
            )
        )
        for remediation in result.scalars().all():
            await notif_svc.notify_remediation_overdue(session, remediation)
        await session.commit()
    logger.info("Remediation overdue check complete")


@instrument_job("remediation_auto_resolve")
async def run_remediation_auto_resolve() -> None:
    """Auto-resolve remediations when the CVE is no longer present in the namespace."""
    logger.info("Running remediation auto-resolve")
    async with AppSessionLocal() as app_session:
        result = await app_session.execute(
            select(Remediation).where(
                Remediation.status.in_(
                    [
                        RemediationStatus.open,
                        RemediationStatus.in_progress,
                    ]
                ),
            )
        )
        active = result.scalars().all()
        if not active:
            return

        async with StackRoxSessionLocal() as sx_session:
            from ..stackrox.queries import get_affected_deployments

            for remediation in active:
                deployments = await get_affected_deployments(
                    sx_session,
                    remediation.cve_id,
                    [(remediation.namespace, remediation.cluster_name)],
                )
                if not deployments:
                    remediation.status = RemediationStatus.resolved
                    remediation.resolved_at = datetime.utcnow()
                    remediation.notes = (
                        remediation.notes or ""
                    ) + "\n[Automatisch behoben: CVE nicht mehr in Deployments gefunden]"
                    logger.info(
                        "Auto-resolved remediation %s for CVE %s in %s/%s",
                        remediation.id,
                        remediation.cve_id,
                        remediation.namespace,
                        remediation.cluster_name,
                    )

        await app_session.commit()
    logger.info("Remediation auto-resolve complete")


async def _send_digest() -> None:
    """Core digest logic: gather stats and send email. Called by scheduled and manual triggers."""
    if not app_settings.management_email:
        logger.info("No management_email configured, skipping digest")
        raise ValueError("Keine Management-E-Mail konfiguriert")

    async with AppSessionLocal() as app_session:
        settings = await _get_settings(app_session)
        min_cvss = float(settings.min_cvss_score) if settings and settings.min_cvss_score else 0.0
        min_epss = float(settings.min_epss_score) if settings and settings.min_epss_score else 0.0

        # Build always_show from priorities and active RAs
        prio_result = await app_session.execute(select(CvePriority.cve_id))
        always_show: set[str] = {row[0] for row in prio_result}
        active_ra_result = await app_session.execute(
            select(RiskAcceptance.cve_id).where(
                RiskAcceptance.status.in_([RiskStatus.requested, RiskStatus.approved]),
            )
        )
        always_show |= {row[0] for row in active_ra_result}

        async with StackRoxSessionLocal() as sx_session:
            from ..stackrox.queries import get_all_cves

            cves = await get_all_cves(sx_session, min_cvss, min_epss, always_show)

            # Risk acceptances with status == requested
            open_ra_result = await app_session.execute(
                select(func.count()).select_from(RiskAcceptance).where(RiskAcceptance.status == RiskStatus.requested)
            )
            open_ra = open_ra_result.scalar() or 0

            # Active escalations
            esc_count_result = await app_session.execute(select(func.count()).select_from(Escalation))
            pending_escalations = esc_count_result.scalar() or 0

            # Remediation stats
            now = datetime.utcnow()
            today_date = date.today()
            seven_days_ago = now - timedelta(days=7)

            rem_open_result = await app_session.execute(
                select(func.count())
                .select_from(Remediation)
                .where(
                    Remediation.status.in_([RemediationStatus.open, RemediationStatus.in_progress]),
                )
            )
            remediations_open = rem_open_result.scalar() or 0

            rem_overdue_result = await app_session.execute(
                select(func.count())
                .select_from(Remediation)
                .where(
                    Remediation.status.in_([RemediationStatus.open, RemediationStatus.in_progress]),
                    Remediation.target_date != None,
                    Remediation.target_date < today_date,
                )
            )
            remediations_overdue = rem_overdue_result.scalar() or 0

            rem_resolved_result = await app_session.execute(
                select(func.count()).select_from(Remediation).where(Remediation.resolved_at >= seven_days_ago)
            )
            remediations_resolved_7d = rem_resolved_result.scalar() or 0

            # Derive CVE stats from the fetched list
            severity_dist = {4: 0, 3: 0, 2: 0, 1: 0}
            for c in cves:
                sev = c.get("severity", 1)
                if sev in severity_dist:
                    severity_dist[sev] += 1

            new_cves_7d = sum(1 for c in cves if c.get("first_seen") and c["first_seen"] >= seven_days_ago)

            top_epss_cves = sorted(
                [c for c in cves if c.get("epss_probability", 0) > 0.1],
                key=lambda c: c.get("epss_probability", 0),
                reverse=True,
            )[:5]

            stats = {
                "total_cves": len(cves),
                "critical_cves": severity_dist[4],
                "important_cves": severity_dist[3],
                "fixable_cves": sum(1 for c in cves if c.get("fixable")),
                "new_cves_7d": new_cves_7d,
                "severity_dist": severity_dist,
                "top_epss_cves": [
                    {
                        "cve_id": c["cve_id"],
                        "severity": c.get("severity", 0),
                        "cvss": round(c.get("cvss", 0), 1),
                        "epss_probability": c.get("epss_probability", 0),
                        "fixable": bool(c.get("fixable")),
                        "affected_deployments": c.get("affected_deployments", 0),
                    }
                    for c in top_epss_cves
                ],
                "open_risk_acceptances": open_ra,
                "pending_escalations": pending_escalations,
                "remediations_open": remediations_open,
                "remediations_overdue": remediations_overdue,
                "remediations_resolved_7d": remediations_resolved_7d,
            }
            await mail_svc.send_weekly_digest(app_settings.management_email, stats)


@instrument_job("weekly_digest")
async def run_weekly_digest() -> None:
    """Send weekly CVE digest email to management_email (scheduled, checks day-of-week)."""
    logger.info("Running weekly digest")
    async with AppSessionLocal() as app_session:
        settings = await _get_settings(app_session)
        today = datetime.utcnow().weekday()
        if settings and settings.digest_day != today:
            return
    try:
        await _send_digest()
    except Exception:
        logger.exception("Scheduled weekly digest failed")


async def run_digest_now() -> None:
    """Send digest immediately, skipping the day-of-week check. For manual triggers."""
    logger.info("Manual digest send triggered")
    await _send_digest()


def setup_scheduler() -> AsyncIOScheduler:
    scheduler.add_job(
        run_expiry_check,
        "cron",
        hour=1,
        minute=0,
        id="expiry_check",
    )
    scheduler.add_job(
        run_expiry_warning,
        "cron",
        hour=7,
        minute=30,
        id="expiry_warning",
    )
    scheduler.add_job(
        run_escalation_warning,
        "cron",
        hour=7,
        minute=45,
        id="escalation_warning",
    )
    scheduler.add_job(
        run_escalation_check,
        "cron",
        hour=8,
        minute=0,
        id="escalation_check",
    )
    scheduler.add_job(
        run_weekly_digest,
        "cron",
        hour=7,
        minute=0,
        id="weekly_digest",
    )
    scheduler.add_job(
        run_remediation_overdue_check,
        "cron",
        hour=8,
        minute=30,
        id="remediation_overdue_check",
    )
    scheduler.add_job(
        run_remediation_auto_resolve,
        "cron",
        hour=9,
        minute=0,
        id="remediation_auto_resolve",
    )
    return scheduler
