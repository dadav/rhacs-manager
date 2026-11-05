"""Opt-in daily email summary of notifications that otherwise only reach the app.

Counts come from two sources:

- Events (something happened): ``create_notification`` queues a
  ``NotificationEmailEvent`` for message keys in ``prefs.EMAIL_SUMMARY_KEYS``.
- Live counts (a state holds): overdue remediations and expiring risk acceptances
  are queried here at send time and repeat daily while the state holds. They are
  not queued because their in-app paths re-fire or dedup on a Notification row,
  which would double count or, with in-app off, re-fire every day.

Emails hold counts and links only. Claims commit before sending; a failed send is
not retried, and at most one email goes out per user per UTC day.
"""

import logging
from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings as app_config
from ..mail import service as mail_svc
from ..models.notification_email import NotificationEmailEvent, NotificationSummaryDelivery
from ..models.remediation import Remediation, overdue_remediation_filters
from ..models.risk_acceptance import RiskAcceptance, expiring_risk_acceptance_filters
from ..notifications import preferences as prefs
from .namespace_snapshot import ActiveRecipient, load_active_recipients

logger = logging.getLogger(__name__)

# Queued events of users who stay inactive are dropped after this.
EVENT_RETENTION_DAYS = 14
DELIVERY_RETENTION_DAYS = 30

REMEDIATION_OVERDUE_KEY = "remediation_overdue"
RISK_EXPIRING_KEY = "risk_expiring"


@dataclass(frozen=True)
class NotificationSummaryJob:
    """One claimed summary email. Primitives only, built before the commit."""

    user_id: str
    to_email: str
    recipient_name: str
    counts: dict[str, int]


@dataclass(frozen=True)
class OverdueRemediation:
    created_by: str
    assigned_to: str | None
    pair: tuple[str, str]  # (namespace, cluster_name)


def _utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


async def _load_events(app_db: AsyncSession, now: datetime) -> dict[str, list[tuple[UUID, str]]]:
    """Queued events per user as (id, message_key)."""
    rows = await app_db.execute(
        select(
            NotificationEmailEvent.id,
            NotificationEmailEvent.user_id,
            NotificationEmailEvent.message_key,
        ).where(NotificationEmailEvent.created_at <= now)
    )
    events: dict[str, list[tuple[UUID, str]]] = defaultdict(list)
    for row in rows.all():
        events[row.user_id].append((row.id, row.message_key))
    return events


async def _load_overdue(app_db: AsyncSession, now: datetime) -> list[OverdueRemediation]:
    rows = await app_db.execute(
        select(
            Remediation.created_by,
            Remediation.assigned_to,
            Remediation.namespace,
            Remediation.cluster_name,
        ).where(*overdue_remediation_filters(now.date()))
    )
    return [
        OverdueRemediation(created_by=r.created_by, assigned_to=r.assigned_to, pair=(r.namespace, r.cluster_name))
        for r in rows.all()
    ]


async def _load_expiring_counts(app_db: AsyncSession, now: datetime) -> dict[str, int]:
    """Expiring risk acceptances per creator. Creators keep access to their own, so no namespace filter."""
    rows = await app_db.execute(
        select(RiskAcceptance.created_by, func.count())
        .where(*expiring_risk_acceptance_filters(now))
        .group_by(RiskAcceptance.created_by)
    )
    return {created_by: count for created_by, count in rows.all()}


def _overdue_count(recipient: ActiveRecipient, overdue: list[OverdueRemediation]) -> int:
    """Overdue remediations the user created or is assigned, once each.

    Pairs outside the snapshot do not count: a user who changed teams is not
    reminded forever about items the app no longer shows them.
    """
    user_id = recipient.user.id
    sees_all = recipient.as_current_user().can_see_all_namespaces
    pairs = set(recipient.namespaces)
    return sum(1 for r in overdue if user_id in (r.created_by, r.assigned_to) and (sees_all or r.pair in pairs))


async def _plan_counts(
    app_db: AsyncSession,
    recipient: ActiveRecipient,
    events: list[tuple[UUID, str]],
    overdue: list[OverdueRemediation],
    expiring: dict[str, int],
) -> dict[str, int]:
    """Non-zero counts of what the user still wants. Preferences are rechecked: opting out drops queued events."""
    user_id = recipient.user.id
    counts: dict[str, int] = defaultdict(int)
    for _event_id, message_key in events:
        category = prefs.EMAIL_SUMMARY_KEYS.get(message_key)
        if category is not None and await prefs.wants(app_db, user_id, category, "email"):
            counts[message_key] += 1
    if await prefs.wants(app_db, user_id, "remediation", "email"):
        overdue_count = _overdue_count(recipient, overdue)
        if overdue_count:
            counts[REMEDIATION_OVERDUE_KEY] = overdue_count
    if expiring.get(user_id) and await prefs.wants(app_db, user_id, "risk_acceptance_updates", "email"):
        counts[RISK_EXPIRING_KEY] = expiring[user_id]
    return dict(counts)


async def run_notification_summary(app_db: AsyncSession, now: datetime | None = None) -> int:
    """Send the opt-in daily notification summary. Returns the number of emails sent.

    A user's queued events are consumed whenever they are evaluated, also when no
    email results (opted out, no deliverable address). Only a same-day rerun leaves
    them queued for the next summary. Events are deleted by id: one committed after
    the read stays queued instead of being lost.
    """
    now = now or _utcnow()
    today = now.date()
    skipped = {"skipped_already_sent": 0, "skipped_no_news": 0, "skipped_no_address": 0}

    events = await _load_events(app_db, now)
    overdue = await _load_overdue(app_db, now)
    expiring = await _load_expiring_counts(app_db, now)
    sent_today = set(
        (
            await app_db.execute(
                select(NotificationSummaryDelivery.user_id).where(NotificationSummaryDelivery.sent_on == today)
            )
        )
        .scalars()
        .all()
    )

    jobs: list[NotificationSummaryJob] = []
    consumed_ids: list[UUID] = []
    for recipient in await load_active_recipients(app_db, app_config.team_notification_active_days, now):
        user = recipient.user
        if user.id in sent_today:
            skipped["skipped_already_sent"] += 1
            continue
        user_events = events.get(user.id, [])
        counts = await _plan_counts(app_db, recipient, user_events, overdue, expiring)
        consumed_ids.extend(event_id for event_id, _key in user_events)
        if not counts:
            skipped["skipped_no_news"] += 1
            continue
        to_email = mail_svc.deliverable_address(user.email, user_id=user.id, purpose="notification_summary")
        if to_email is None:
            skipped["skipped_no_address"] += 1
            continue
        app_db.add(NotificationSummaryDelivery(user_id=user.id, sent_on=today, created_at=now))
        jobs.append(
            NotificationSummaryJob(
                user_id=user.id,
                to_email=to_email,
                recipient_name=user.display_name,
                counts=counts,
            )
        )

    if consumed_ids:
        await app_db.execute(delete(NotificationEmailEvent).where(NotificationEmailEvent.id.in_(consumed_ids)))
    await app_db.execute(
        delete(NotificationEmailEvent).where(
            NotificationEmailEvent.created_at < now - timedelta(days=EVENT_RETENTION_DAYS)
        )
    )
    await app_db.execute(
        delete(NotificationSummaryDelivery).where(
            NotificationSummaryDelivery.sent_on < today - timedelta(days=DELIVERY_RETENTION_DAYS)
        )
    )
    await app_db.commit()

    sent = 0
    for job in jobs:
        try:
            await mail_svc.send_notification_summary(job.to_email, job.recipient_name, counts=job.counts)
            sent += 1
        except Exception:
            logger.exception("notification_summary_email_failed", extra={"user_id": job.user_id})
    logger.info("notification_summary_done", extra={"claimed": len(jobs), "sent": sent, **skipped})
    return sent
