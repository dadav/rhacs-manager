"""Team-facing background notifications (roadmap phase 3).

Three scheduler-driven features, all targeting users through their namespace
snapshot (``services/namespace_snapshot.py``), never through access control:

- **Team CVE alerts** (daily): in-app notification when a CVE newly becomes
  visible to thresholded team members in one of their namespaces (it crosses the
  CVSS/EPSS thresholds, appears there, or gets prioritized). Suppression is
  evaluated per namespace, like the CVE list.
- **CVE alert summary email** (daily, opt-in per condition): built from the
  same alert diff. One email per user per UTC day bundles every condition the
  user opted into (new critical CVE, critical CVE with a fix, newly
  prioritized CVE), as counts and links only. ``alert_email_deliveries`` caps it
  at one per user per day. Best effort: the cap is claimed in the diff commit
  and the email is sent afterwards, so an SMTP failure or crash loses that
  day's email (the in-app alerts stay). A CVE that disappears and returns
  counts again, like the in-app alerts.
- **Team digest** (weekly, opt-in): per-user email with counts and links only.
  It never names CVEs or components, because the snapshot may be stale and the
  recipient's access cannot be verified at send time (same rule as mention mail).

Wildcard and sec-team users (``can_see_all_namespaces``) do not get team CVE
alerts: org-wide, that would be one alert per newly visible CVE anywhere. They
can opt into the alert summary email, which then counts all namespaces.
"""

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings as app_config
from ..mail import service as mail_svc
from ..models.alert_email_delivery import AlertEmailDelivery
from ..models.cve_alert_mark import CveAlertMark
from ..models.cve_priority import CvePriority
from ..models.global_settings import GlobalSettings
from ..models.notification import NotificationType
from ..models.remediation import Remediation, RemediationStatus
from ..models.risk_acceptance import RiskAcceptance, RiskStatus
from ..notifications import preferences as prefs
from ..notifications import service as notif_svc
from ..schemas.cve import CveListItem, SeverityLevel
from ..stackrox import queries as sx
from .cve_filter_service import fetch_filtered_cves, is_location_suppressed, load_approved_suppression_rules
from .fix_rollup_service import aggregate_component_rows
from .namespace_snapshot import ActiveRecipient, load_active_recipients
from .risk_acceptance_service import user_can_access_ra

logger = logging.getLogger(__name__)

# More new alerts than this for one user in one run collapse into one summary
# notification instead of flooding the bell.
MAX_ALERTS_PER_USER = 10
REASON_VISIBLE = "visible"
REASON_PRIORITIZED = "prioritized"
# Email-only reasons, emitted independently of visible/prioritized so that
# prioritizing an already critical CVE does not count as "new critical", and a
# severity raise to critical or a new fix does count.
REASON_EMAIL_CRITICAL = "email_critical"
REASON_EMAIL_CRITICAL_FIXABLE = "email_critical_fixable"
EMAIL_REASONS = frozenset({REASON_EMAIL_CRITICAL, REASON_EMAIL_CRITICAL_FIXABLE})
# Delivery claims older than this are deleted by the alert job.
ALERT_EMAIL_DELIVERY_RETENTION_DAYS = 30

# Per reason: notification type, preference category, single and summary message keys.
_REASON_CONFIG: dict[str, tuple[NotificationType, str, str, str]] = {
    REASON_VISIBLE: (
        NotificationType.new_critical_cve,
        "new_critical_cve",
        "new_relevant_cve",
        "team_cve_alert_summary",
    ),
    REASON_PRIORITIZED: (
        NotificationType.new_priority,
        "priority",
        "cve_prioritized_team",
        "team_priority_alert_summary",
    ),
}

AlertKey = tuple[str, str, str, str]  # (cve_id, namespace, cluster_name, reason)
# Stored once after the first run. Its absence means "record a silent baseline",
# independent of whether any real marks exist (there may legitimately be none).
# The version suffix forces a fresh silent baseline whenever the trigger
# definition changes (v2: any newly visible CVE instead of critical-only).
BASELINE_MARK: AlertKey = ("__baseline__", "", "", "baseline:v2")
# Same idea for the email-only reasons, so adding them did not reset the in-app
# baseline. Bump the version when the email reasons change.
BASELINE_MARK_EMAIL: AlertKey = ("__baseline__", "", "", "baseline:email:v1")
BASELINE_MARKS = frozenset({BASELINE_MARK, BASELINE_MARK_EMAIL})

# Alert summary email conditions: count field -> (mark reason, preference category).
_EMAIL_CONDITIONS: dict[str, tuple[str, str]] = {
    "new_critical": (REASON_EMAIL_CRITICAL, "alert_email_new_critical"),
    "critical_fixable": (REASON_EMAIL_CRITICAL_FIXABLE, "alert_email_critical_fixable"),
    "prioritized": (REASON_PRIORITIZED, "alert_email_prioritized"),
}


def _baseline_for(reason: str) -> AlertKey:
    return BASELINE_MARK_EMAIL if reason in EMAIL_REASONS else BASELINE_MARK


# --- Team CVE alerts -------------------------------------------------------


def classify_candidates(
    rows: list[dict],
    prioritized: set[str],
    cve_rules: list,
    component_rules: list,
) -> set[AlertKey]:
    """Alert keys for unsuppressed candidate rows.

    Per row one in-app key (prioritization wins over plain visibility), plus the
    email-only keys when the CVE is critical there (and fixable).
    """
    keys: set[AlertKey] = set()
    for r in rows:
        components = [(c[0], c[1]) for c in r.get("components") or []]
        if is_location_suppressed(
            r["cve_id"], r["namespace"], r["cluster_name"], components, cve_rules, component_rules
        ):
            continue
        location = (r["cve_id"], r["namespace"], r["cluster_name"])
        reason = REASON_PRIORITIZED if r["cve_id"] in prioritized else REASON_VISIBLE
        keys.add((*location, reason))
        if int(r.get("severity") or 0) == SeverityLevel.CRITICAL:
            keys.add((*location, REASON_EMAIL_CRITICAL))
            if r.get("fixable"):
                keys.add((*location, REASON_EMAIL_CRITICAL_FIXABLE))
    return keys


@dataclass
class UserAlert:
    cve_id: str
    reason: str
    namespaces: list[tuple[str, str]] = field(default_factory=list)


def plan_user_alerts(recipients: list[ActiveRecipient], new_keys: set[AlertKey]) -> dict[str, list[UserAlert]]:
    """Group new alert keys per recipient: one alert per (CVE, reason) listing its namespaces."""
    by_namespace: dict[tuple[str, str], list[AlertKey]] = defaultdict(list)
    for key in new_keys:
        by_namespace[(key[1], key[2])].append(key)
    plan: dict[str, list[UserAlert]] = {}
    for recipient in recipients:
        if recipient.as_current_user().can_see_all_namespaces:
            continue
        alerts: dict[tuple[str, str], UserAlert] = {}
        for ns in recipient.namespaces:
            for cve_id, namespace, cluster, reason in by_namespace.get(ns, []):
                alert = alerts.setdefault((cve_id, reason), UserAlert(cve_id=cve_id, reason=reason))
                alert.namespaces.append((namespace, cluster))
        if alerts:
            plan[recipient.user.id] = sorted(alerts.values(), key=lambda a: (a.reason != REASON_PRIORITIZED, a.cve_id))
    return plan


async def _send_user_alerts(app_db: AsyncSession, user_id: str, alerts: list[UserAlert]) -> int:
    """Send one user's alerts, per reason: its preference category decides first,
    then more than MAX_ALERTS_PER_USER alerts collapse into that reason's summary.

    Namespace names are not stored in params: the notifications router renders
    ``{namespaces}`` from the scope the reader can still see.
    """
    sent = 0
    for reason, (ntype, category, single_key, summary_key) in _REASON_CONFIG.items():
        group = [a for a in alerts if a.reason == reason]
        if not group or not await prefs.wants(app_db, user_id, category, "in_app"):
            continue
        if len(group) > MAX_ALERTS_PER_USER:
            scope = sorted({ns for a in group for ns in a.namespaces})
            await notif_svc.create_notification(
                app_db, user_id, ntype, summary_key, {"count": len(group)}, "/vulnerabilities", scope=scope
            )
            sent += 1
            continue
        for alert in group:
            await notif_svc.create_notification(
                app_db,
                user_id,
                ntype,
                single_key,
                {"cve_id": alert.cve_id},
                f"/vulnerabilities/{alert.cve_id}",
                scope=alert.namespaces,
            )
            sent += 1
    return sent


@dataclass(frozen=True)
class AlertEmailCounts:
    """Distinct new CVEs per alert email condition for one recipient."""

    new_critical: int = 0
    critical_fixable: int = 0
    prioritized: int = 0

    @property
    def has_news(self) -> bool:
        return any((self.new_critical, self.critical_fixable, self.prioritized))


@dataclass(frozen=True)
class AlertEmailJob:
    """One claimed summary email. Primitives only, built before the commit."""

    user_id: str
    to_email: str
    recipient_name: str
    counts: AlertEmailCounts
    org_wide: bool


def plan_alert_emails(recipients: list[ActiveRecipient], new_keys: set[AlertKey]) -> dict[str, AlertEmailCounts]:
    """Count new CVEs per condition and recipient, before preferences.

    Team members count keys in their snapshot namespaces; org-wide users
    (``can_see_all_namespaces``) count all keys. A CVE in several namespaces
    counts once per condition.
    """
    by_namespace: dict[tuple[str, str], list[AlertKey]] = defaultdict(list)
    for key in new_keys:
        by_namespace[(key[1], key[2])].append(key)
    plan: dict[str, AlertEmailCounts] = {}
    for recipient in recipients:
        if recipient.as_current_user().can_see_all_namespaces:
            keys = list(new_keys)
        else:
            keys = [key for ns in set(recipient.namespaces) for key in by_namespace.get(ns, [])]
        counts = AlertEmailCounts(
            **{
                name: len({key[0] for key in keys if key[3] == reason})
                for name, (reason, _category) in _EMAIL_CONDITIONS.items()
            }
        )
        if counts.has_news:
            plan[recipient.user.id] = counts
    return plan


async def _claim_alert_emails(
    app_db: AsyncSession,
    recipients: list[ActiveRecipient],
    plan: dict[str, AlertEmailCounts],
    now: datetime,
) -> tuple[list[AlertEmailJob], dict[str, int]]:
    """Apply email preferences and the daily cap; stage delivery claims (no commit)."""
    today = now.date()
    by_id = {r.user.id: r for r in recipients}
    skipped = {"skipped_no_pref": 0, "skipped_no_address": 0, "skipped_already_sent": 0}
    jobs: list[AlertEmailJob] = []
    for user_id, counts in plan.items():
        recipient = by_id[user_id]
        wanted: dict[str, int] = {}
        for name, (_reason, category) in _EMAIL_CONDITIONS.items():
            value = getattr(counts, name)
            wanted[name] = value if value and await prefs.wants(app_db, user_id, category, "email") else 0
        filtered = AlertEmailCounts(**wanted)
        if not filtered.has_news:
            skipped["skipped_no_pref"] += 1
            continue
        user = recipient.user
        to_email = mail_svc.deliverable_address(user.email, user_id=user_id, purpose="cve_alert_email")
        if to_email is None:
            skipped["skipped_no_address"] += 1
            continue
        if await app_db.get(AlertEmailDelivery, (user_id, today)) is not None:
            skipped["skipped_already_sent"] += 1
            continue
        app_db.add(AlertEmailDelivery(user_id=user_id, sent_on=today, created_at=now))
        jobs.append(
            AlertEmailJob(
                user_id=user_id,
                to_email=to_email,
                recipient_name=user.display_name,
                counts=filtered,
                org_wide=recipient.as_current_user().can_see_all_namespaces,
            )
        )
    return jobs, skipped


async def send_alert_emails(jobs: list[AlertEmailJob]) -> int:
    """Send claimed summary emails after the commit. One failure never blocks the rest."""
    sent = 0
    for job in jobs:
        try:
            await mail_svc.send_alert_summary(job.to_email, job.recipient_name, job.counts, org_wide=job.org_wide)
            sent += 1
        except Exception:
            logger.exception("cve_alert_email_failed", extra={"user_id": job.user_id})
    return sent


async def run_team_cve_alerts(app_db: AsyncSession, sx_db: AsyncSession, now: datetime | None = None) -> int:
    """Diff current alert-worthy CVEs against stored marks and notify affected users.

    The first run (no baseline mark stored) only records the baseline, so enabling
    the feature does not notify about every existing visible CVE. Returns the
    number of notifications attempted.
    """
    now = now or datetime.now(UTC).replace(tzinfo=None)
    global_settings = (await app_db.execute(select(GlobalSettings).limit(1))).scalar_one_or_none()
    min_cvss = float(global_settings.min_cvss_score) if global_settings else 0.0
    min_epss = float(global_settings.min_epss_score) if global_settings else 0.0

    prioritized = set((await app_db.execute(select(CvePriority.cve_id))).scalars().all())
    ra_ids = (
        await app_db.execute(
            select(RiskAcceptance.cve_id).where(RiskAcceptance.status.in_([RiskStatus.requested, RiskStatus.approved]))
        )
    ).scalars()
    always_show = prioritized | set(ra_ids.all())

    cve_rules, component_rules = await load_approved_suppression_rules(app_db)
    rows = await sx.get_team_alert_candidates(sx_db, min_cvss, min_epss, always_show)
    return await apply_alert_diff(app_db, classify_candidates(rows, prioritized, cve_rules, component_rules), now)


async def apply_alert_diff(app_db: AsyncSession, current: set[AlertKey], now: datetime) -> int:
    """Store the new mark set, notify recipients in-app about keys not seen before,
    and send the opt-in alert summary emails. Commits before sending email.

    A reason whose baseline mark is missing is recorded silently this run.
    Returns the number of in-app notifications attempted.
    """
    existing_marks = (await app_db.execute(select(CveAlertMark))).scalars().all()
    existing = {(m.cve_id, m.namespace, m.cluster_name, m.reason) for m in existing_marks}
    missing_baselines = BASELINE_MARKS - existing
    existing -= BASELINE_MARKS
    new_keys = current - existing
    stale = existing - current
    for cve_id, namespace, cluster, reason in sorted(missing_baselines):
        app_db.add(
            CveAlertMark(cve_id=cve_id, namespace=namespace, cluster_name=cluster, reason=reason, created_at=now)
        )

    for m in existing_marks:
        if (m.cve_id, m.namespace, m.cluster_name, m.reason) in stale:
            await app_db.delete(m)
    for cve_id, namespace, cluster, reason in sorted(new_keys):
        app_db.add(
            CveAlertMark(cve_id=cve_id, namespace=namespace, cluster_name=cluster, reason=reason, created_at=now)
        )

    await app_db.execute(
        delete(AlertEmailDelivery).where(
            AlertEmailDelivery.sent_on < now.date() - timedelta(days=ALERT_EMAIL_DELIVERY_RETENTION_DAYS)
        )
    )

    notify_keys = {key for key in new_keys if _baseline_for(key[3]) not in missing_baselines}
    sent = 0
    jobs: list[AlertEmailJob] = []
    skipped: dict[str, int] = {}
    email_planned = 0
    if notify_keys:
        recipients = await load_active_recipients(app_db, app_config.team_notification_active_days, now)
        in_app_keys = {key for key in notify_keys if key[3] in _REASON_CONFIG}
        for user_id, alerts in plan_user_alerts(recipients, in_app_keys).items():
            sent += await _send_user_alerts(app_db, user_id, alerts)
        email_plan = plan_alert_emails(recipients, notify_keys)
        email_planned = len(email_plan)
        jobs, skipped = await _claim_alert_emails(app_db, recipients, email_plan, now)
    await app_db.commit()
    logger.info(
        "team_cve_alerts_done",
        extra={
            "candidates": len(current),
            "new": len(new_keys),
            "stale_removed": len(stale),
            "baselines_recorded": sorted(m[3] for m in missing_baselines),
            "notifications": sent,
        },
    )

    emails_sent = await send_alert_emails(jobs)
    logger.info(
        "cve_alert_emails_done",
        extra={"planned": email_planned, "claimed": len(jobs), "sent": emails_sent, **skipped},
    )
    return sent


# --- Team digest -------------------------------------------------------------


@dataclass(frozen=True)
class TeamDigestStats:
    visible_cves: int
    new_fixable_cves: int
    critical_fixable_cves: int
    prioritized_cves: int
    component_upgrades: int
    remediations_overdue: int
    remediations_due_soon: int
    remediations_assigned_open: int
    risk_acceptances_expiring: int

    @property
    def has_news(self) -> bool:
        """Only send when there is something to act on."""
        return any(
            (
                self.new_fixable_cves,
                self.critical_fixable_cves,
                self.component_upgrades,
                self.prioritized_cves,
                self.remediations_overdue,
                self.remediations_due_soon,
                self.remediations_assigned_open,
                self.risk_acceptances_expiring,
            )
        )


def _within(ts: datetime | None, since: datetime) -> bool:
    if ts is None:
        return False
    aware = ts if ts.tzinfo else ts.replace(tzinfo=UTC)
    return aware >= since


def cve_counts(items: list[CveListItem], now: datetime) -> dict[str, int]:
    """CVE-derived digest counts. 'New fixable' = fixable and first seen or fix released in 7 days."""
    since = (now if now.tzinfo else now.replace(tzinfo=UTC)) - timedelta(days=7)
    fixable = [i for i in items if i.fixable]
    return {
        "visible_cves": len(items),
        "new_fixable_cves": sum(
            1 for i in fixable if _within(i.first_seen, since) or _within(i.fix_available_since, since)
        ),
        "critical_fixable_cves": sum(1 for i in fixable if i.severity == SeverityLevel.CRITICAL),
        "prioritized_cves": sum(1 for i in items if i.has_priority),
    }


def _visibility_key(recipient: ActiveRecipient) -> tuple:
    user = recipient.as_current_user()
    if user.can_see_all_namespaces:
        return ("all", user.is_sec_team)
    return ("ns", tuple(sorted(recipient.namespaces)))


async def _remediation_counts(app_db: AsyncSession, recipient: ActiveRecipient, today: date) -> dict[str, int]:
    user = recipient.as_current_user()
    query = select(Remediation).where(Remediation.status.in_([RemediationStatus.open, RemediationStatus.in_progress]))
    open_items = (await app_db.execute(query)).scalars().all()
    if not user.can_see_all_namespaces:
        visible = set(recipient.namespaces)
        open_items = [r for r in open_items if (r.namespace, r.cluster_name) in visible]
    soon = today + timedelta(days=7)
    return {
        "remediations_overdue": sum(1 for r in open_items if r.target_date and r.target_date < today),
        "remediations_due_soon": sum(1 for r in open_items if r.target_date and today <= r.target_date <= soon),
        "remediations_assigned_open": sum(1 for r in open_items if r.assigned_to == user.id),
    }


async def _expiring_ra_count(app_db: AsyncSession, recipient: ActiveRecipient, now: datetime) -> int:
    user = recipient.as_current_user()
    query = select(RiskAcceptance).where(
        RiskAcceptance.status == RiskStatus.approved,
        RiskAcceptance.expires_at.is_not(None),
        RiskAcceptance.expires_at <= now + timedelta(days=14),
        RiskAcceptance.expires_at >= now,
    )
    return sum(1 for ra in (await app_db.execute(query)).scalars().all() if user_can_access_ra(user, ra))


async def build_team_digest_stats(
    app_db: AsyncSession,
    sx_db: AsyncSession,
    recipient: ActiveRecipient,
    now: datetime,
    cache: dict,
) -> TeamDigestStats:
    """Digest numbers for one recipient. ``cache`` shares CVE work between users
    with identical visibility (same namespaces, or both org-wide)."""
    key = _visibility_key(recipient)
    if key not in cache:
        user = recipient.as_current_user()
        items = await fetch_filtered_cves(user, app_db, sx_db)
        namespaces = None if user.can_see_all_namespaces else list(recipient.namespaces)
        rows = await sx.get_component_cve_rows(sx_db, [i.cve_id for i in items], namespaces)
        components = aggregate_component_rows(rows, {i.cve_id: i for i in items})
        cache[key] = {
            **cve_counts(items, now),
            "component_upgrades": sum(1 for c in components if c.fixable_cves > 0 and c.target_version),
        }
    return TeamDigestStats(
        **cache[key],
        **await _remediation_counts(app_db, recipient, now.date()),
        risk_acceptances_expiring=await _expiring_ra_count(app_db, recipient, now),
    )


async def run_team_digest(app_db: AsyncSession, sx_db: AsyncSession, now: datetime | None = None) -> int:
    """Email the weekly team digest to opted-in, recently active users. Returns emails sent."""
    now = now or datetime.now(UTC).replace(tzinfo=None)
    recipients = await load_active_recipients(app_db, app_config.team_notification_active_days, now)
    cache: dict = {}
    sent = 0
    for recipient in recipients:
        user = recipient.user
        if not await prefs.wants(app_db, user.id, "team_digest", "email"):
            continue
        to_email = mail_svc.deliverable_address(user.email, user_id=user.id, purpose="team_digest")
        if to_email is None:
            continue
        try:
            stats = await build_team_digest_stats(app_db, sx_db, recipient, now, cache)
            if not stats.has_news:
                logger.info("team_digest_skipped_no_news", extra={"user_id": user.id})
                continue
            await mail_svc.send_team_digest(to_email, user.display_name, stats)
            sent += 1
        except Exception:
            logger.exception("team_digest_failed", extra={"user_id": user.id})
    logger.info("team_digest_done", extra={"recipients": len(recipients), "sent": sent})
    return sent
