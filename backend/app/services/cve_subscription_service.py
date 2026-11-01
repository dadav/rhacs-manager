"""CVE subscriptions ("Abonnieren"): follow one CVE and get notified about changes.

Two emitters, both writing a ``CveSubscriptionEvent`` row (feeds the opt-in daily
summary email) plus an in-app notification with ``scope=`` pairs:

- **Broadcast app events** (``broadcast_subscription_event``): comments, priority,
  risk acceptances, remediations, escalations. Every subscriber of the CVE gets the
  same event, scoped to the pairs that describe the event itself. Called inside the
  caller's transaction; never commits.
- **Recipient-specific diff events** (``run_subscription_diff``, hourly worker job):
  built from one subscriber's own visible StackRox rows and sent to that subscriber
  only.

Content rule: params never carry namespace names, image names, versions, or
per-location counts. ``{namespaces}`` is rendered on read from the scope the reader
still sees (``routers/notifications.py``), so a reader who lost part of a scope
learns nothing about the lost pairs. The summary email is counts and one link only.

Stored ``state`` (v1), baselined on subscribe, never NULL::

    {"v": 1,
     "scope": "*" | [[namespace, cluster], ...],    # pairs visible when computed
     "scores": {"severity": int|None, "cvss": float|None, "epss_anchor": float|None},
     "locations": [{"namespace": str, "cluster": str,
                    "images": [image_name_fullname, ...],
                    "fixable_components": [component name, ...]}, ...]}

Scores are scope-independent effective scores. ``epss_anchor`` is the last
notified EPSS, so slow drift accumulates until it crosses the notify delta.
Locations only hold pairs visible to the subscriber; a pair entering or leaving the
subscriber's scope is absorbed silently, so access changes never look like data
changes. Images are identified by pull spec (``image_name_fullname``) without a
digest pin (``image_identity``): a rebuild of the same tag is not "new", and the
identity survives the legacy-to-v2 transition.
"""

import logging
from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings as app_config
from ..i18n import ApiError
from ..mail import service as mail_svc
from ..models.cve_subscription import CveSubscription, CveSubscriptionEmailDelivery, CveSubscriptionEvent
from ..models.global_settings import GlobalSettings
from ..models.notification import NotificationType
from ..notifications import preferences as prefs
from ..notifications import service as notif_svc
from ..stackrox import queries as sx
from .audit_service import log_action
from .namespace_snapshot import ActiveRecipient, load_active_recipients

if TYPE_CHECKING:
    from ..auth.middleware import CurrentUser

logger = logging.getLogger(__name__)

STATE_VERSION = 1
MAX_SUBSCRIPTIONS_PER_USER = 500
# EPSS changes daily by small amounts; only notify once the drift since the last
# notified value reaches this (or the value crosses the global EPSS threshold).
EPSS_NOTIFY_DELTA = 0.05
# More diff events than this for one user in one run collapse into one summary.
MAX_DIFF_NOTIFICATIONS_PER_USER = 10
DIFF_BATCH_SIZE = 200
EVENT_RETENTION_DAYS = 30
EMAIL_DEFAULT_WINDOW = timedelta(hours=24)

CATEGORY = "cve_subscription"
SUMMARY_LINK = "/vulnerabilities?subscribed=1"

Pair = tuple[str, str]


def _utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def cve_link(cve_id: str, anchor: str | None = None) -> str:
    link = f"/vulnerabilities/{cve_id}"
    return f"{link}#{anchor}" if anchor else link


# ---------------------------------------------------------------------------
# Pure state building and diffing (no IO)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class DiffEvent:
    kind: str
    params: dict
    scope: tuple[Pair, ...]


def _max_or_none(values: Iterable[float | int | None]) -> float | int | None:
    present = [v for v in values if v is not None]
    return max(present) if present else None


def image_identity(pull_spec: str) -> str:
    """Pull spec without a ``@sha256:...`` digest pin (``repo:tag``, or ``repo``).

    OpenShift often pins images by digest (``repo:tag@sha256:...``); keeping the
    digest would make every rebuild of the same tag look like a new image.
    """
    return pull_spec.split("@", 1)[0]


def build_state(rows: list[dict], visible_pairs: set[Pair] | None) -> dict:
    """State for one CVE from its ``get_subscription_locations`` rows.

    ``visible_pairs=None`` means all namespaces (org-wide subscriber). Scores come
    from all rows (scope-independent); locations only from visible pairs.
    """
    severity = _max_or_none(r["severity"] for r in rows)
    cvss = _max_or_none(r["cvss"] for r in rows)
    epss = _max_or_none(r["epss"] for r in rows)
    locations = []
    for row in rows:
        pair = (row["namespace"], row["cluster_name"])
        if visible_pairs is not None and pair not in visible_pairs:
            continue
        locations.append(
            {
                "namespace": pair[0],
                "cluster": pair[1],
                "images": sorted({image_identity(name) for name in row["images"] or []}),
                "fixable_components": sorted(set(row["fixable_components"] or [])),
            }
        )
    locations.sort(key=lambda loc: (loc["cluster"], loc["namespace"]))
    return {
        "v": STATE_VERSION,
        "scope": "*" if visible_pairs is None else sorted([list(p) for p in visible_pairs]),
        "scores": {
            "severity": int(severity) if severity is not None else None,
            "cvss": float(cvss) if cvss is not None else None,
            "epss_anchor": float(epss) if epss is not None else None,
        },
        "locations": locations,
    }


def _scope_contains(scope: str | list, pair: Pair) -> bool:
    if scope == "*":
        return True
    return list(pair) in scope


def _locations_by_pair(state: dict) -> dict[Pair, dict]:
    return {(loc["namespace"], loc["cluster"]): loc for loc in state.get("locations", [])}


def _fmt_cvss(value: float | None) -> str:
    return "-" if value is None else f"{value:.1f}"


def _fmt_epss(value: float | None) -> str:
    return "-" if value is None else f"{value * 100:.1f}%"


def _crosses(old: float, new: float, threshold: float) -> bool:
    if threshold <= 0:
        return False
    return (old >= threshold) != (new >= threshold)


def _diff_scores(old: dict, new: dict, epss_threshold: float) -> tuple[dict, bool]:
    """Return (scores to store, changed?). ``epss_anchor`` moves only on notify."""
    old_sev, new_sev = old.get("severity"), new.get("severity")
    old_cvss, new_cvss = old.get("cvss"), new.get("cvss")
    anchor, new_epss = old.get("epss_anchor"), new.get("epss_anchor")

    # CVE gone everywhere: keep the old scores so a return compares against them.
    if new_sev is None and new_cvss is None and new_epss is None:
        return dict(old), False

    severity_changed = old_sev is not None and new_sev is not None and old_sev != new_sev
    cvss_changed = old_cvss is not None and new_cvss is not None and round(old_cvss, 1) != round(new_cvss, 1)
    epss_changed = (
        anchor is not None
        and new_epss is not None
        and (abs(new_epss - anchor) >= EPSS_NOTIFY_DELTA or _crosses(anchor, new_epss, epss_threshold))
    )
    changed = severity_changed or cvss_changed or epss_changed
    stored = {
        "severity": new_sev,
        "cvss": new_cvss,
        "epss_anchor": new_epss if (epss_changed or anchor is None or changed) else anchor,
    }
    return stored, changed


def diff_state(old: dict, new: dict, epss_threshold: float) -> tuple[dict, list[DiffEvent]]:
    """Compare a stored state with a freshly built one.

    Returns the state to store and the events, at most one per kind (each scoped
    to all pairs that produced it). See the module docstring for the rules.
    """
    if old.get("v") != STATE_VERSION:
        # Unknown or older state shape: re-baseline silently.
        return new, []
    events: list[DiffEvent] = []
    old_scores = old.get("scores", {})
    stored_scores, scores_changed = _diff_scores(old_scores, new["scores"], epss_threshold)
    visible_now = tuple((loc["namespace"], loc["cluster"]) for loc in new["locations"])
    if scores_changed and visible_now:
        events.append(
            DiffEvent(
                kind="scores_changed",
                params={
                    "cvss_old": _fmt_cvss(old_scores.get("cvss")),
                    "cvss": _fmt_cvss(stored_scores["cvss"]),
                    "epss_old": _fmt_epss(old_scores.get("epss_anchor")),
                    "epss": _fmt_epss(new["scores"].get("epss_anchor")),
                },
                scope=visible_now,
            )
        )
    elif scores_changed:
        # Not affected in the subscriber's scope: store the new scores, keep the anchor.
        stored_scores["epss_anchor"] = old_scores.get("epss_anchor", stored_scores["epss_anchor"])

    old_locations = _locations_by_pair(old)
    new_locations = _locations_by_pair(new)
    old_scope = old.get("scope", [])
    new_scope = new["scope"]
    new_image_pairs: list[Pair] = []
    fix_pairs: list[Pair] = []
    gone_pairs: list[Pair] = []

    for pair, loc in new_locations.items():
        previous = old_locations.get(pair)
        if previous is None:
            # Newly affected only counts when the old scope already covered the pair;
            # otherwise the subscriber just gained access to it.
            if _scope_contains(old_scope, pair):
                new_image_pairs.append(pair)
            continue
        if set(loc["images"]) - set(previous["images"]):
            new_image_pairs.append(pair)
        if set(loc["fixable_components"]) - set(previous["fixable_components"]):
            fix_pairs.append(pair)

    for pair in old_locations:
        if pair not in new_locations and _scope_contains(new_scope, pair):
            gone_pairs.append(pair)

    for kind, pairs in (
        ("new_images", new_image_pairs),
        ("fix_available", fix_pairs),
        ("no_longer_affected", gone_pairs),
    ):
        if pairs:
            events.append(DiffEvent(kind=kind, params={}, scope=tuple(sorted(pairs, key=lambda p: (p[1], p[0])))))

    stored = {**new, "scores": stored_scores}
    return stored, events


# ---------------------------------------------------------------------------
# Subscription CRUD
# ---------------------------------------------------------------------------


def _visible_pairs_for(current_user: "CurrentUser") -> set[Pair] | None:
    if current_user.can_see_all_namespaces:
        return None
    return {(ns, cl) for ns, cl in current_user.namespaces}


async def subscribed_cve_ids(session: AsyncSession, user_id: str) -> set[str]:
    result = await session.execute(select(CveSubscription.cve_id).where(CveSubscription.user_id == user_id))
    return set(result.scalars().all())


async def is_subscribed(session: AsyncSession, user_id: str, cve_id: str) -> bool:
    return await session.get(CveSubscription, (user_id, cve_id)) is not None


async def list_for_user(session: AsyncSession, user_id: str) -> list[CveSubscription]:
    result = await session.execute(
        select(CveSubscription).where(CveSubscription.user_id == user_id).order_by(CveSubscription.created_at.desc())
    )
    return list(result.scalars().all())


async def subscribe(
    session: AsyncSession,
    sx_db: AsyncSession,
    current_user: "CurrentUser",
    cve_id: str,
) -> bool:
    """Subscribe ``current_user`` to ``cve_id``; returns True when newly created.

    The CVE must affect a deployment the user can see (same rule as CVE detail,
    no thresholds). The baseline state is computed now, from the same query the
    hourly job uses. Commits.
    """
    if await is_subscribed(session, current_user.id, cve_id):
        return False
    count = (await session.execute(select(func.count()).where(CveSubscription.user_id == current_user.id))).scalar_one()
    if count >= MAX_SUBSCRIPTIONS_PER_USER:
        raise ApiError(400, "too_many_subscriptions", max=MAX_SUBSCRIPTIONS_PER_USER)

    visible = _visible_pairs_for(current_user)
    if visible is not None and not visible:
        raise ApiError(404, "cve_not_found")
    rows = await sx.get_subscription_locations(sx_db, [cve_id])
    state = build_state(rows, visible)
    if not state["locations"]:
        raise ApiError(404, "cve_not_found")

    now = _utcnow()
    session.add(
        CveSubscription(user_id=current_user.id, cve_id=cve_id, created_at=now, state=state, state_checked_at=now)
    )
    await log_action(session, current_user.id, "cve_subscribed", "cve", cve_id)
    try:
        await session.commit()
    except IntegrityError:
        # Concurrent PUT for the same pair: the other request won, same outcome.
        await session.rollback()
        return False
    logger.info(
        "cve_subscribed",
        extra={"user_id": current_user.id, "cve_id": cve_id, "locations": len(state["locations"])},
    )
    return True


async def unsubscribe(session: AsyncSession, user_id: str, cve_id: str) -> bool:
    """Remove the subscription; returns True when one existed. Commits."""
    result = await session.execute(
        delete(CveSubscription).where(CveSubscription.user_id == user_id, CveSubscription.cve_id == cve_id)
    )
    removed = (result.rowcount or 0) > 0
    if removed:
        await log_action(session, user_id, "cve_unsubscribed", "cve", cve_id)
    await session.commit()
    if removed:
        logger.info("cve_unsubscribed", extra={"user_id": user_id, "cve_id": cve_id})
    return removed


# ---------------------------------------------------------------------------
# Emitters
# ---------------------------------------------------------------------------


def risk_acceptance_scope_pairs(ra_scope: dict | None) -> list[Pair] | None:
    """(namespace, cluster) pairs of a risk acceptance scope; None for ``mode=all``.

    None makes the broadcast fall back to every pair where the CVE is present,
    which matches the RA visibility rule (namespace overlap) for ``mode=all``.
    """
    if not ra_scope or ra_scope.get("mode") == "all":
        return None
    pairs = {(t["namespace"], t["cluster_name"]) for t in ra_scope.get("targets", []) if t.get("namespace")}
    return sorted(pairs) or None


async def _emit(
    session: AsyncSession,
    *,
    user_id: str,
    cve_id: str,
    kind: str,
    params: dict,
    link: str,
    scope: list[Pair],
    now: datetime,
) -> None:
    session.add(
        CveSubscriptionEvent(
            user_id=user_id,
            cve_id=cve_id,
            kind=kind,
            scope=[list(p) for p in scope],
            created_at=now,
        )
    )
    await notif_svc.create_notification(
        session,
        user_id,
        NotificationType.cve_subscription,
        f"subscription.{kind}",
        {"cve_id": cve_id, **params},
        link,
        scope=scope,
    )


async def broadcast_subscription_event(
    session: AsyncSession,
    sx_db: AsyncSession | None,
    *,
    cve_id: str,
    kind: str,
    params: dict,
    link: str | None = None,
    actor_id: str | None = None,
    exclude_user_ids: Iterable[str] = (),
    scope: list[Pair] | None = None,
) -> int:
    """Notify every subscriber of ``cve_id`` (except actor and excluded) about an app event.

    ``scope`` lists the (namespace, cluster) pairs the event is about; when None,
    all pairs where the CVE is present are used (``get_namespaces_with_cve``), which
    is only queried when there is at least one recipient. A StackRox failure there
    is logged and skips the fan-out instead of failing the caller's request.
    Never commits. Returns the number of recipients.
    """
    excluded = set(exclude_user_ids)
    if actor_id:
        excluded.add(actor_id)
    result = await session.execute(select(CveSubscription.user_id).where(CveSubscription.cve_id == cve_id))
    recipients = sorted(uid for uid in result.scalars().all() if uid not in excluded)
    if not recipients:
        return 0
    if scope is None:
        if sx_db is None:
            logger.warning("cve_subscription_event_skipped_no_scope", extra={"cve_id": cve_id, "kind": kind})
            return 0
        try:
            scope = await sx.get_namespaces_with_cve(sx_db, cve_id)
        except Exception:
            logger.exception("cve_subscription_scope_lookup_failed", extra={"cve_id": cve_id, "kind": kind})
            return 0
    pairs = sorted({(ns, cl) for ns, cl in scope}, key=lambda p: (p[1], p[0]))
    now = _utcnow()
    for user_id in recipients:
        await _emit(
            session,
            user_id=user_id,
            cve_id=cve_id,
            kind=kind,
            params=params,
            link=link or cve_link(cve_id),
            scope=pairs,
            now=now,
        )
    logger.info(
        "cve_subscription_event",
        extra={"cve_id": cve_id, "kind": kind, "recipients": len(recipients), "scope_pairs": len(pairs)},
    )
    return len(recipients)


# ---------------------------------------------------------------------------
# Hourly diff job
# ---------------------------------------------------------------------------


@dataclass
class _PendingEvent:
    cve_id: str
    event: DiffEvent


async def _epss_threshold(app_db: AsyncSession) -> float:
    global_settings = (await app_db.execute(select(GlobalSettings).limit(1))).scalar_one_or_none()
    return float(global_settings.min_epss_score) if global_settings else 0.0


async def _flush_user_events(app_db: AsyncSession, user_id: str, pending: list[_PendingEvent], now: datetime) -> int:
    """Emit one user's diff events, collapsed into one summary above the cap."""
    if len(pending) > MAX_DIFF_NOTIFICATIONS_PER_USER:
        for item in pending:
            app_db.add(
                CveSubscriptionEvent(
                    user_id=user_id,
                    cve_id=item.cve_id,
                    kind=item.event.kind,
                    scope=[list(p) for p in item.event.scope],
                    created_at=now,
                )
            )
        scope = sorted({p for item in pending for p in item.event.scope}, key=lambda p: (p[1], p[0]))
        await notif_svc.create_notification(
            app_db,
            user_id,
            NotificationType.cve_subscription,
            "subscription.summary",
            {"count": len(pending)},
            SUMMARY_LINK,
            scope=scope,
        )
        return 1
    for item in pending:
        await _emit(
            app_db,
            user_id=user_id,
            cve_id=item.cve_id,
            kind=item.event.kind,
            params=item.event.params,
            link=cve_link(item.cve_id),
            scope=list(item.event.scope),
            now=now,
        )
    return len(pending)


async def run_subscription_diff(app_db: AsyncSession, sx_db: AsyncSession, now: datetime | None = None) -> int:
    """Diff every active subscription against StackRox and notify its subscriber.

    Subscribers without a fresh namespace snapshot are skipped (state untouched).
    The snapshot only picks recipients and candidate pairs; read-time ``scope``
    filtering stays the access gate. Commits per CVE batch. Returns the number of
    notifications attempted.
    """
    now = now or _utcnow()
    epss_threshold = await _epss_threshold(app_db)
    recipients: dict[str, ActiveRecipient] = {
        r.user.id: r for r in await load_active_recipients(app_db, app_config.team_notification_active_days, now)
    }
    cve_ids = sorted(set((await app_db.execute(select(CveSubscription.cve_id).distinct())).scalars().all()))
    checked = skipped_inactive = sent = 0
    users_notified: set[str] = set()

    # State and events of one batch commit together. The per-user summary cap
    # applies per batch (one batch for up to DIFF_BATCH_SIZE subscribed CVEs).
    for start in range(0, len(cve_ids), DIFF_BATCH_SIZE):
        batch = cve_ids[start : start + DIFF_BATCH_SIZE]
        rows_by_cve: dict[str, list[dict]] = defaultdict(list)
        for row in await sx.get_subscription_locations(sx_db, batch):
            rows_by_cve[row["cve_id"]].append(row)
        subs = (await app_db.execute(select(CveSubscription).where(CveSubscription.cve_id.in_(batch)))).scalars().all()
        pending: dict[str, list[_PendingEvent]] = defaultdict(list)
        for sub in subs:
            recipient = recipients.get(sub.user_id)
            if recipient is None:
                skipped_inactive += 1
                continue
            visible = None if recipient.as_current_user().can_see_all_namespaces else set(recipient.namespaces)
            fresh = build_state(rows_by_cve.get(sub.cve_id, []), visible)
            stored, events = diff_state(sub.state, fresh, epss_threshold)
            # Plain UPDATE: a concurrent unsubscribe just makes this a no-op.
            await app_db.execute(
                update(CveSubscription)
                .where(CveSubscription.user_id == sub.user_id, CveSubscription.cve_id == sub.cve_id)
                .values(state=stored, state_checked_at=now)
            )
            checked += 1
            for event in events:
                pending[sub.user_id].append(_PendingEvent(cve_id=sub.cve_id, event=event))
        for user_id, items in pending.items():
            sent += await _flush_user_events(app_db, user_id, items, now)
            users_notified.add(user_id)
        await app_db.commit()

    logger.info(
        "cve_subscription_diff_done",
        extra={
            "cves": len(cve_ids),
            "subscriptions_checked": checked,
            "skipped_inactive": skipped_inactive,
            "users_notified": len(users_notified),
            "notifications": sent,
        },
    )
    return sent


# ---------------------------------------------------------------------------
# Daily summary email
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class SubscriptionEmailJob:
    """One claimed summary email. Primitives only, built before the commit."""

    user_id: str
    to_email: str
    recipient_name: str
    event_count: int
    cve_count: int


def _event_visible(scope: list, recipient: ActiveRecipient) -> bool:
    """Best-effort recheck against the snapshot (never access control, see module doc)."""
    if recipient.as_current_user().can_see_all_namespaces:
        return True
    pairs = set(recipient.namespaces)
    return any((ns, cl) in pairs for ns, cl in scope)


async def _plan_subscription_email(
    app_db: AsyncSession, recipient: ActiveRecipient, now: datetime
) -> tuple[int, int] | None:
    """(event_count, cve_count) since the user's last summary, or None if nothing to send."""
    user_id = recipient.user.id
    last_sent = (
        await app_db.execute(
            select(func.max(CveSubscriptionEmailDelivery.sent_at)).where(
                CveSubscriptionEmailDelivery.user_id == user_id
            )
        )
    ).scalar_one_or_none()
    cursor = last_sent or (now - EMAIL_DEFAULT_WINDOW)
    rows = (
        await app_db.execute(
            select(CveSubscriptionEvent.cve_id, CveSubscriptionEvent.scope).where(
                CveSubscriptionEvent.user_id == user_id,
                CveSubscriptionEvent.created_at > cursor,
                CveSubscriptionEvent.created_at <= now,
            )
        )
    ).all()
    visible = [row for row in rows if _event_visible(row.scope, recipient)]
    if not visible:
        return None
    return len(visible), len({row.cve_id for row in visible})


async def run_subscription_email_digest(app_db: AsyncSession, now: datetime | None = None) -> int:
    """Send the opt-in daily subscription summary (counts and one link only).

    At most one email per user per UTC day (``cve_subscription_email_deliveries``
    PK); the claim is committed before sending and never retried. Also purges old
    events and delivery claims. Returns the number of emails sent.
    """
    now = now or _utcnow()
    today = now.date()
    skipped = {"skipped_no_pref": 0, "skipped_no_address": 0, "skipped_already_sent": 0, "skipped_no_news": 0}
    jobs: list[SubscriptionEmailJob] = []
    for recipient in await load_active_recipients(app_db, app_config.team_notification_active_days, now):
        user = recipient.user
        if not await prefs.wants(app_db, user.id, CATEGORY, "email"):
            skipped["skipped_no_pref"] += 1
            continue
        if await app_db.get(CveSubscriptionEmailDelivery, (user.id, today)) is not None:
            skipped["skipped_already_sent"] += 1
            continue
        counts = await _plan_subscription_email(app_db, recipient, now)
        if counts is None:
            skipped["skipped_no_news"] += 1
            continue
        to_email = mail_svc.deliverable_address(user.email, user_id=user.id, purpose="cve_subscription_email")
        if to_email is None:
            skipped["skipped_no_address"] += 1
            continue
        app_db.add(CveSubscriptionEmailDelivery(user_id=user.id, sent_on=today, sent_at=now))
        jobs.append(
            SubscriptionEmailJob(
                user_id=user.id,
                to_email=to_email,
                recipient_name=user.display_name,
                event_count=counts[0],
                cve_count=counts[1],
            )
        )

    cutoff = now - timedelta(days=EVENT_RETENTION_DAYS)
    await app_db.execute(delete(CveSubscriptionEvent).where(CveSubscriptionEvent.created_at < cutoff))
    await app_db.execute(
        delete(CveSubscriptionEmailDelivery).where(CveSubscriptionEmailDelivery.sent_on < cutoff.date())
    )
    await app_db.commit()

    sent = 0
    for job in jobs:
        try:
            await mail_svc.send_cve_subscription_summary(
                job.to_email, job.recipient_name, event_count=job.event_count, cve_count=job.cve_count
            )
            sent += 1
        except Exception:
            logger.exception("cve_subscription_email_failed", extra={"user_id": job.user_id})
    logger.info("cve_subscription_email_done", extra={"claimed": len(jobs), "sent": sent, **skipped})
    return sent
