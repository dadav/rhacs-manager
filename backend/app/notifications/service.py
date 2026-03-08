import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.notification import Notification, NotificationType
from ..models.risk_acceptance import RiskAcceptance, RiskAcceptanceComment
from ..models.user import User, UserRole

logger = logging.getLogger(__name__)


async def create_notification(
    session: AsyncSession,
    user_id: str,
    type: NotificationType,
    title: str,
    message: str,
    link: str | None = None,
) -> Notification:
    n = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        link=link,
    )
    session.add(n)
    await session.flush()
    logger.debug("Created notification %s for user %s", type, user_id)
    return n


async def _get_sec_team_users(session: AsyncSession) -> list[User]:
    result = await session.execute(
        select(User).where(User.role == UserRole.sec_team)
    )
    return list(result.scalars().all())


async def notify_risk_comment(
    session: AsyncSession,
    acceptance: RiskAcceptance,
    comment: RiskAcceptanceComment,
    author: User,
) -> None:
    link = f"/risikoakzeptanzen/{acceptance.id}"
    title = f"Neuer Kommentar: {acceptance.cve_id}"
    msg = f"{author.username} hat einen Kommentar hinterlassen."

    if author.role == UserRole.team_member:
        # Notify sec team
        for user in await _get_sec_team_users(session):
            await create_notification(
                session, user.id, NotificationType.risk_comment, title, msg, link
            )
    else:
        # Notify the RA creator
        if acceptance.created_by != author.id:
            await create_notification(
                session, acceptance.created_by, NotificationType.risk_comment, title, msg, link
            )


async def notify_risk_status_change(
    session: AsyncSession,
    acceptance: RiskAcceptance,
    reviewer: User,
) -> None:
    link = f"/risikoakzeptanzen/{acceptance.id}"
    status_label = {"approved": "genehmigt", "rejected": "abgelehnt"}.get(
        acceptance.status.value, acceptance.status.value
    )
    title = f"Risikoakzeptanz {status_label}: {acceptance.cve_id}"
    msg = f"Ihre Risikoakzeptanz für {acceptance.cve_id} wurde {status_label}."
    ntype = (
        NotificationType.risk_approved
        if acceptance.status.value == "approved"
        else NotificationType.risk_rejected
    )

    # Notify the RA creator
    await create_notification(session, acceptance.created_by, ntype, title, msg, link)


async def notify_risk_expiring(
    session: AsyncSession,
    acceptance: RiskAcceptance,
) -> None:
    link = f"/risikoakzeptanzen/{acceptance.id}"
    title = f"Risikoakzeptanz läuft ab: {acceptance.cve_id}"
    msg = f"Die Risikoakzeptanz für {acceptance.cve_id} läuft in 7 Tagen ab."

    # Notify the RA creator
    await create_notification(
        session, acceptance.created_by, NotificationType.risk_expiring, title, msg, link
    )


async def notify_new_priority(
    session: AsyncSession,
    cve_id: str,
    priority_level: str,
) -> None:
    """Notify sec team about new CVE priority (they set priorities, they get notified)."""
    link = "/priorisierungen"
    title = f"CVE priorisiert: {cve_id}"
    msg = f"{cve_id} wurde als '{priority_level}' priorisiert."

    for user in await _get_sec_team_users(session):
        await create_notification(
            session, user.id, NotificationType.new_priority, title, msg, link
        )


async def notify_escalation(
    session: AsyncSession,
    cve_id: str,
    namespace: str,
    cluster_name: str,
    level: int,
) -> None:
    """Notify sec team about escalation (no persistent user→namespace mapping)."""
    link = f"/schwachstellen/{cve_id}"
    title = f"Eskalation Stufe {level}: {cve_id}"
    msg = f"CVE {cve_id} in {namespace}/{cluster_name} wurde auf Eskalationsstufe {level} hochgestuft."

    for user in await _get_sec_team_users(session):
        await create_notification(
            session, user.id, NotificationType.escalation, title, msg, link
        )


async def notify_remediation_created(
    session: AsyncSession,
    remediation: "Remediation",  # type: ignore[name-defined]
    creator: "User",  # type: ignore[name-defined]
) -> None:
    """Notify sec team about a new remediation."""
    link = f"/behebungen"
    title = f"Neue Behebung: {remediation.cve_id}"
    msg = f"{creator.username} hat eine Behebung für {remediation.cve_id} in {remediation.namespace}/{remediation.cluster_name} erstellt."

    for user in await _get_sec_team_users(session):
        if user.id != creator.id:
            await create_notification(
                session, user.id, NotificationType.remediation_created, title, msg, link
            )


async def notify_remediation_status_change(
    session: AsyncSession,
    remediation: "Remediation",  # type: ignore[name-defined]
    actor: "User",  # type: ignore[name-defined]
    old_status: str,
    new_status: str,
) -> None:
    """Notify relevant users about remediation status changes."""
    status_labels = {
        "open": "Offen",
        "in_progress": "In Bearbeitung",
        "resolved": "Behoben",
        "verified": "Verifiziert",
        "wont_fix": "Wird nicht behoben",
    }
    link = f"/behebungen"
    new_label = status_labels.get(new_status, new_status)
    title = f"Behebung {new_label}: {remediation.cve_id}"
    msg = f"Behebung für {remediation.cve_id} in {remediation.namespace}/{remediation.cluster_name}: {new_label}"

    recipients: set[str] = set()

    if new_status in ("resolved", "in_progress"):
        # Notify sec team for verification / awareness
        for user in await _get_sec_team_users(session):
            recipients.add(user.id)

    if new_status == "verified":
        # Notify creator and assignee
        recipients.add(remediation.created_by)
        if remediation.assigned_to:
            recipients.add(remediation.assigned_to)

    if new_status == "wont_fix":
        # Notify sec team for awareness
        for user in await _get_sec_team_users(session):
            recipients.add(user.id)

    # Don't notify the actor
    recipients.discard(actor.id)

    for user_id in recipients:
        await create_notification(
            session, user_id, NotificationType.remediation_status, title, msg, link
        )


async def notify_remediation_overdue(
    session: AsyncSession,
    remediation: "Remediation",  # type: ignore[name-defined]
) -> None:
    """Notify creator, assignee, and sec team about overdue remediation."""
    link = f"/behebungen"
    title = f"Behebung überfällig: {remediation.cve_id}"
    msg = f"Die Behebung für {remediation.cve_id} in {remediation.namespace}/{remediation.cluster_name} ist überfällig."

    recipients: set[str] = set()
    recipients.add(remediation.created_by)
    if remediation.assigned_to:
        recipients.add(remediation.assigned_to)
    for user in await _get_sec_team_users(session):
        recipients.add(user.id)

    for user_id in recipients:
        await create_notification(
            session, user_id, NotificationType.remediation_overdue, title, msg, link
        )
