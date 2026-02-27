import logging
from uuid import UUID

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


async def _get_team_users(session: AsyncSession, team_id: UUID) -> list[User]:
    result = await session.execute(select(User).where(User.team_id == team_id))
    return list(result.scalars().all())


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
        # Notify team members
        for user in await _get_team_users(session, acceptance.team_id):
            await create_notification(
                session, user.id, NotificationType.risk_comment, title, msg, link
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

    for user in await _get_team_users(session, acceptance.team_id):
        await create_notification(session, user.id, ntype, title, msg, link)


async def notify_risk_expiring(
    session: AsyncSession,
    acceptance: RiskAcceptance,
) -> None:
    link = f"/risikoakzeptanzen/{acceptance.id}"
    title = f"Risikoakzeptanz läuft ab: {acceptance.cve_id}"
    msg = f"Die Risikoakzeptanz für {acceptance.cve_id} läuft in 7 Tagen ab."

    for user in await _get_team_users(session, acceptance.team_id):
        await create_notification(
            session, user.id, NotificationType.risk_expiring, title, msg, link
        )


async def notify_new_priority(
    session: AsyncSession,
    cve_id: str,
    priority_level: str,
    affected_team_ids: list[UUID],
) -> None:
    link = f"/priorisierungen"
    title = f"CVE priorisiert: {cve_id}"
    msg = f"{cve_id} wurde als '{priority_level}' priorisiert."

    for team_id in affected_team_ids:
        for user in await _get_team_users(session, team_id):
            await create_notification(
                session, user.id, NotificationType.new_priority, title, msg, link
            )


async def notify_escalation(
    session: AsyncSession,
    cve_id: str,
    team_id: UUID,
    level: int,
) -> None:
    link = f"/eskalationen"
    title = f"Eskalation Stufe {level}: {cve_id}"
    msg = f"CVE {cve_id} wurde auf Eskalationsstufe {level} hochgestuft."

    for user in await _get_team_users(session, team_id):
        await create_notification(
            session, user.id, NotificationType.escalation, title, msg, link
        )
    if level >= 2:
        for user in await _get_sec_team_users(session):
            await create_notification(
                session, user.id, NotificationType.escalation, title, msg, link
            )
