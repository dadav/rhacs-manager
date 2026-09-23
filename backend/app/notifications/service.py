import logging
from dataclasses import dataclass

from email_validator import EmailNotValidError, validate_email
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..i18n import DEFAULT_LANG
from ..models.notification import Notification, NotificationType
from ..models.risk_acceptance import RiskAcceptance, RiskAcceptanceComment
from ..models.user import User, UserRole
from ..services.comment_content import legacy_mention_names
from .messages import SCOPE_PARAM, render_notification
from .preferences import category_for_type, wants

# Hard cap on distinct, non-self recipients per comment. Guards against a single
# comment fanning out to the whole org.
MAX_MENTION_RECIPIENTS = 20

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class MentionEmailJob:
    """Plain, session-free email input scheduled after the comment commits.

    Holds only primitive values: it must survive past the request DB session,
    so it never references ORM objects or the session itself.
    """

    to_email: str
    recipient_id: str
    author_name: str
    context_label: str
    link: str  # absolute, anchored URL under APP_BASE_URL


@dataclass(frozen=True)
class MentionResult:
    """Outcome of processing mentions for one comment create/edit.

    ``recipient_ids`` are the users who received the in-app notification (the
    newly-mentioned set on edits). ``email_jobs`` are the subset with a valid
    email address, ready to be sent by a post-commit background task.
    """

    recipient_ids: tuple[str, ...]
    email_jobs: tuple[MentionEmailJob, ...]


async def create_notification(
    session: AsyncSession,
    user_id: str,
    type: NotificationType,
    message_key: str,
    params: dict,
    link: str | None = None,
    scope: list[tuple[str, str]] | None = None,
) -> Notification | None:
    """Persist an in-app notification unless the user turned its category off.

    ``message_key``/``params`` drive localized rendering on read (see
    ``notifications/messages.py``). The German rendering is stored in
    ``title``/``message`` as the fallback text.

    ``scope`` lists the (namespace, cluster) pairs the notification is about. Set
    it whenever recipients were picked from namespace snapshots: on read, the
    notification is only shown if the reader still sees one of those namespaces.
    """
    category = category_for_type(type)
    if category is not None and not await wants(session, user_id, category, "in_app"):
        logger.debug("Notification %s for user %s suppressed by preference", type, user_id)
        return None
    render_params = params
    if scope is not None:
        params = {**params, SCOPE_PARAM: [list(pair) for pair in scope]}
        # The stored fallback text must not name namespaces either; the router
        # renders them per reader from the scope.
        render_params = {**params, "namespaces": "-"}
    rendered = render_notification(message_key, render_params, DEFAULT_LANG)
    if rendered is None:
        raise ValueError(f"Unknown notification message key: {message_key}")
    title, message = rendered
    n = Notification(
        user_id=user_id,
        type=type,
        title=title[:255],
        message=message,
        link=link,
        message_key=message_key,
        params=params,
    )
    session.add(n)
    await session.flush()
    logger.debug("Created notification %s for user %s", type, user_id)
    return n


async def _get_sec_team_users(session: AsyncSession) -> list[User]:
    result = await session.execute(select(User).where(User.role == UserRole.sec_team))
    return list(result.scalars().all())


async def notify_risk_comment(
    session: AsyncSession,
    acceptance: RiskAcceptance,
    comment: RiskAcceptanceComment,
    author: User,
    exclude_user_ids: set[str] | None = None,
) -> None:
    """Notify the RA counterpart about a new comment.

    ``exclude_user_ids`` suppresses the general comment notification for users
    who were already reached by an explicit @mention on the same comment, so a
    mentioned recipient does not receive two overlapping notifications.
    """
    excluded = exclude_user_ids or set()
    link = f"/risk-acceptances/{acceptance.id}"
    params = {"cve_id": acceptance.cve_id, "author": author.display_name}

    if author.role == UserRole.team_member:
        # Notify sec team
        for user in await _get_sec_team_users(session):
            if user.id in excluded:
                continue
            await create_notification(session, user.id, NotificationType.risk_comment, "risk_comment", params, link)
    else:
        # Notify the RA creator
        if acceptance.created_by != author.id and acceptance.created_by not in excluded:
            await create_notification(
                session,
                acceptance.created_by,
                NotificationType.risk_comment,
                "risk_comment",
                params,
                link,
            )


async def notify_risk_status_change(
    session: AsyncSession,
    acceptance: RiskAcceptance,
    reviewer: User,
) -> None:
    link = f"/risk-acceptances/{acceptance.id}"
    params = {"cve_id": acceptance.cve_id, "status": acceptance.status.value}
    ntype = NotificationType.risk_approved if acceptance.status.value == "approved" else NotificationType.risk_rejected

    # Notify the RA creator
    await create_notification(session, acceptance.created_by, ntype, "risk_status", params, link)


async def notify_risk_expiring(
    session: AsyncSession,
    acceptance: RiskAcceptance,
) -> None:
    link = f"/risk-acceptances/{acceptance.id}"

    # The expiry-warning job runs daily over a 7-day window; dedup so the
    # creator is warned once per acceptance, not once per day.
    existing = await session.execute(
        select(Notification.id)
        .where(
            Notification.user_id == acceptance.created_by,
            Notification.type == NotificationType.risk_expiring,
            Notification.link == link,
        )
        .limit(1)
    )
    if existing.scalar_one_or_none():
        return

    # Notify the RA creator
    await create_notification(
        session,
        acceptance.created_by,
        NotificationType.risk_expiring,
        "risk_expiring",
        {"cve_id": acceptance.cve_id},
        link,
    )


async def notify_new_priority(
    session: AsyncSession,
    cve_id: str,
    priority_level: str,
) -> None:
    """Notify sec team about new CVE priority (they set priorities, they get notified)."""
    link = "/priorities"
    params = {"cve_id": cve_id, "priority_level": priority_level}

    for user in await _get_sec_team_users(session):
        await create_notification(session, user.id, NotificationType.new_priority, "new_priority", params, link)


async def notify_escalation(
    session: AsyncSession,
    cve_id: str,
    namespace: str,
    cluster_name: str,
    level: int,
) -> None:
    """Notify sec team about escalation (no persistent user→namespace mapping)."""
    link = f"/vulnerabilities/{cve_id}"
    params = {"cve_id": cve_id, "namespace": namespace, "cluster_name": cluster_name, "level": level}

    for user in await _get_sec_team_users(session):
        await create_notification(session, user.id, NotificationType.escalation, "escalation", params, link)


def _remediation_params(remediation: "Remediation", actor: "User") -> dict:  # type: ignore[name-defined]
    return {
        "cve_id": remediation.cve_id,
        "namespace": remediation.namespace,
        "cluster_name": remediation.cluster_name,
        "actor": actor.display_name,
    }


async def notify_remediation_created(
    session: AsyncSession,
    remediation: "Remediation",  # type: ignore[name-defined]
    creator: "User",  # type: ignore[name-defined]
) -> None:
    """Notify the assignee about a new remediation.

    Remediations are namespace-scoped (single-team) daily ops. The sec team audits
    them via the audit log and weekly digest rather than per-event notifications.
    """
    link = "/remediations"
    params = _remediation_params(remediation, creator)

    if remediation.assigned_to and remediation.assigned_to != creator.id:
        await create_notification(
            session, remediation.assigned_to, NotificationType.remediation_created, "remediation_created", params, link
        )


async def notify_remediation_assigned(
    session: AsyncSession,
    remediation: "Remediation",  # type: ignore[name-defined]
    actor: "User",  # type: ignore[name-defined]
    assignee_id: str,
) -> None:
    """Notify a user that a remediation was (re)assigned to them. Self-assignment is silent."""
    if assignee_id == actor.id:
        return
    link = "/remediations?mine=1"
    await create_notification(
        session,
        assignee_id,
        NotificationType.remediation_created,
        "remediation_assigned",
        _remediation_params(remediation, actor),
        link,
    )


async def notify_remediation_status_change(
    session: AsyncSession,
    remediation: "Remediation",  # type: ignore[name-defined]
    actor: "User",  # type: ignore[name-defined]
    old_status: str,
    new_status: str,
) -> None:
    """Notify relevant users about remediation status changes."""
    link = "/remediations"
    params = {**_remediation_params(remediation, actor), "status": new_status}

    # Status changes are single-team daily ops: notify only the creator and assignee,
    # not the sec team (they audit via the audit log and weekly digest).
    recipients: set[str] = {remediation.created_by}
    if remediation.assigned_to:
        recipients.add(remediation.assigned_to)

    # Don't notify the actor
    recipients.discard(actor.id)

    for user_id in recipients:
        await create_notification(
            session, user_id, NotificationType.remediation_status, "remediation_status", params, link
        )


async def notify_remediation_overdue(
    session: AsyncSession,
    remediation: "Remediation",  # type: ignore[name-defined]
) -> None:
    """Notify the creator and assignee about an overdue remediation.

    Overdue remediations are single-team ops; the sec team audits rather than being
    paged per remediation.
    """
    link = "/remediations"
    params = {
        "cve_id": remediation.cve_id,
        "namespace": remediation.namespace,
        "cluster_name": remediation.cluster_name,
    }

    recipients: set[str] = set()
    recipients.add(remediation.created_by)
    if remediation.assigned_to:
        recipients.add(remediation.assigned_to)

    for user_id in recipients:
        await create_notification(
            session, user_id, NotificationType.remediation_overdue, "remediation_overdue", params, link
        )


async def notify_suppression_requested(
    session: AsyncSession,
    rule: "SuppressionRule",  # type: ignore[name-defined]
    creator: "User",  # type: ignore[name-defined]
) -> None:
    """Notify sec team about a new suppression rule request."""
    target = rule.cve_id if rule.cve_id else rule.component_name
    link = "/suppression-rules"
    params = {"target": target, "actor": creator.display_name}

    for user in await _get_sec_team_users(session):
        if user.id != creator.id:
            await create_notification(
                session,
                user.id,
                NotificationType.suppression_requested,
                "suppression_requested",
                params,
                link,
            )


async def notify_suppression_status_change(
    session: AsyncSession,
    rule: "SuppressionRule",  # type: ignore[name-defined]
    reviewer: "User",  # type: ignore[name-defined]
) -> None:
    """Notify the suppression rule creator about approval/rejection."""
    target = rule.cve_id if rule.cve_id else rule.component_name
    link = "/suppression-rules"
    params = {"target": target, "status": rule.status.value}
    ntype = (
        NotificationType.suppression_approved
        if rule.status.value == "approved"
        else NotificationType.suppression_rejected
    )

    if rule.created_by != reviewer.id:
        await create_notification(session, rule.created_by, ntype, "suppression_status", params, link)


def _mention_names(message: str) -> set[str]:
    """Return the distinct, lower-cased usernames mentioned as ``@[name]``."""
    return legacy_mention_names(message)


async def _emit_mentions(
    session: AsyncSession,
    to_notify: list[User],
    author: User,
    link: str,
    context_label: str,
) -> MentionResult:
    """Create in-app rows and build post-commit email jobs for ``to_notify``.

    Shared tail of the username- and user-id-based mention entry points. The
    author's current ``display_name`` is what recipients see.
    """
    params = {"author": author.display_name}
    absolute_link = f"{settings.app_base_url.rstrip('/')}/{link.lstrip('/')}"

    recipient_ids: list[str] = []
    email_jobs: list[MentionEmailJob] = []
    for user in to_notify:
        await create_notification(session, user.id, NotificationType.mention, "mention", params, link)
        recipient_ids.append(user.id)

        # Invalid/placeholder addresses get the in-app notification only; syntax
        # validation without DNS keeps this cheap and offline-safe.
        try:
            validated_email = validate_email(user.email or "", check_deliverability=False).normalized
        except EmailNotValidError as exc:
            logger.warning(
                "Skipping mention email: invalid recipient address",
                extra={"user_id": user.id, "reason": str(exc)},
            )
            continue
        email_jobs.append(
            MentionEmailJob(
                to_email=validated_email,
                recipient_id=user.id,
                author_name=author.display_name,
                context_label=context_label,
                link=absolute_link,
            )
        )

    return MentionResult(recipient_ids=tuple(recipient_ids), email_jobs=tuple(email_jobs))


async def notify_mention_users(
    session: AsyncSession,
    recipients: list[User],
    author: User,
    link: str,
    *,
    context_label: str,
    previously_notified_ids: set[str] | None = None,
) -> MentionResult:
    """User-id-based mention notification (structured-content path).

    ``recipients`` are already-resolved ``User`` rows for the mention segments.
    The author is excluded, recipients are de-duplicated by id, and the same
    ``MAX_MENTION_RECIPIENTS`` cap and edit-delta semantics apply as the
    username-based path, here keyed on stable user ids rather than usernames.
    """
    from ..i18n import ApiError

    seen: set[str] = set()
    resolved: list[User] = []
    for user in recipients:
        if user.id == author.id or user.id in seen:
            continue
        seen.add(user.id)
        resolved.append(user)

    if len(resolved) > MAX_MENTION_RECIPIENTS:
        raise ApiError(400, "too_many_mentions", max=MAX_MENTION_RECIPIENTS)

    previous = previously_notified_ids or set()
    to_notify = [u for u in resolved if u.id not in previous]
    if not to_notify:
        return MentionResult(recipient_ids=(), email_jobs=())

    return await _emit_mentions(session, to_notify, author, link, context_label)


async def notify_mentions(
    session: AsyncSession,
    message: str,
    author: User,
    link: str,
    *,
    context_label: str,
    previous_message: str | None = None,
) -> MentionResult:
    """Create in-app mention notifications and return post-commit email jobs.

    Resolution is case-insensitive on ``@[username]`` tokens. The author,
    unknown usernames, and duplicates are excluded. When more than
    ``MAX_MENTION_RECIPIENTS`` distinct non-self recipients resolve, the whole
    comment is rejected with ``too_many_mentions`` (checked against the full
    current message, not the edit delta).

    On edits (``previous_message`` provided) only users who were *not* already
    mentioned in the previous text are notified again; case-only or unrelated
    edits therefore notify nobody.

    In-app notification rows are added to ``session`` inside the caller's
    comment transaction. Email delivery is deferred: the returned
    ``MentionEmailJob`` values carry only primitives and are sent by a
    background task after the caller commits.
    """
    from ..i18n import ApiError

    current_names = _mention_names(message)
    if not current_names:
        return MentionResult(recipient_ids=(), email_jobs=())

    result = await session.execute(
        select(User).where(func.lower(User.username).in_(current_names)).order_by(func.lower(User.username), User.id)
    )
    # Distinct, non-self resolved recipients (case-insensitive uniqueness is
    # enforced at the DB level, so one row per lower(username)).
    resolved = [u for u in result.scalars().all() if u.id != author.id]

    if len(resolved) > MAX_MENTION_RECIPIENTS:
        raise ApiError(400, "too_many_mentions", max=MAX_MENTION_RECIPIENTS)

    previous_names = _mention_names(previous_message) if previous_message is not None else set()
    to_notify = [u for u in resolved if u.username.lower() not in previous_names]
    if not to_notify:
        return MentionResult(recipient_ids=(), email_jobs=())

    return await _emit_mentions(session, to_notify, author, link, context_label)
