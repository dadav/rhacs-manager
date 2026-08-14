"""Comment mutations and their transactional notification behavior."""

import logging
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser
from ..i18n import ApiError
from ..mail import service as mail_svc
from ..models.cve_comment import CveComment
from ..models.escalation import Escalation
from ..models.risk_acceptance import RiskAcceptance, RiskAcceptanceComment
from ..models.user import User
from ..notifications import service as notif_svc
from ..schemas.cve import CveCommentResponse, EscalationContext
from ..schemas.risk_acceptance import CommentResponse

logger = logging.getLogger(__name__)


async def add_cve_comment(
    db: AsyncSession,
    *,
    cve_id: str,
    message: str,
    current_user: CurrentUser,
) -> tuple[CveCommentResponse, tuple[notif_svc.MentionEmailJob, ...]]:
    comment = CveComment(cve_id=cve_id, user_id=current_user.id, message=message)
    db.add(comment)
    await db.flush()

    mention_result = await notif_svc.notify_mentions(
        db,
        message,
        current_user,
        f"/vulnerabilities/{cve_id}#comment-{comment.id}",
        context_label=f"CVE {cve_id}",
    )

    await db.commit()
    await db.refresh(comment)
    return (
        CveCommentResponse(
            id=comment.id,
            cve_id=comment.cve_id,
            user_id=comment.user_id,
            username=current_user.username,
            message=comment.message,
            created_at=comment.created_at,
            updated_at=comment.updated_at,
            is_sec_team=current_user.is_sec_team,
        ),
        mention_result.email_jobs,
    )


async def update_cve_comment(
    db: AsyncSession,
    *,
    cve_id: str,
    comment_id: UUID,
    message: str,
    current_user: CurrentUser,
) -> tuple[CveCommentResponse, tuple[notif_svc.MentionEmailJob, ...]]:
    result = await db.execute(select(CveComment).where(CveComment.id == comment_id, CveComment.cve_id == cve_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise ApiError(404, "comment_not_found")
    if comment.user_id != current_user.id:
        raise ApiError(403, "comment_edit_forbidden")

    previous_message = comment.message
    comment.message = message
    comment.updated_at = datetime.now(UTC).replace(tzinfo=None)
    mention_result = await notif_svc.notify_mentions(
        db,
        message,
        current_user,
        f"/vulnerabilities/{cve_id}#comment-{comment.id}",
        context_label=f"CVE {cve_id}",
        previous_message=previous_message,
    )

    await db.commit()
    await db.refresh(comment)

    user_result = await db.execute(select(User).where(User.id == current_user.id))
    user = user_result.scalar_one_or_none()
    escalation = None
    if current_user.is_sec_team and comment.escalation_id is not None:
        escalation_result = await db.execute(select(Escalation).where(Escalation.id == comment.escalation_id))
        escalation = escalation_result.scalar_one_or_none()

    escalation_context = None
    if escalation is not None:
        escalation_context = EscalationContext(
            cluster_name=escalation.cluster_name,
            namespace=escalation.namespace,
            level=escalation.level,
        )

    return (
        CveCommentResponse(
            id=comment.id,
            cve_id=comment.cve_id,
            user_id=comment.user_id,
            username=user.username if user else current_user.id,
            message=comment.message,
            created_at=comment.created_at,
            updated_at=comment.updated_at,
            is_sec_team=current_user.is_sec_team,
            escalation_context=escalation_context,
        ),
        mention_result.email_jobs,
    )


async def add_risk_acceptance_comment(
    db: AsyncSession,
    *,
    acceptance: RiskAcceptance,
    message: str,
    current_user: CurrentUser,
) -> tuple[CommentResponse, tuple[notif_svc.MentionEmailJob, ...]]:
    comment = RiskAcceptanceComment(
        risk_acceptance_id=acceptance.id,
        user_id=current_user.id,
        message=message,
    )
    db.add(comment)
    await db.flush()

    mention_result = await notif_svc.notify_mentions(
        db,
        message,
        current_user,
        f"/risk-acceptances/{acceptance.id}#comment-{comment.id}",
        context_label=f"Risikoakzeptanz {acceptance.cve_id}",
    )
    mentioned_ids = set(mention_result.recipient_ids)
    await notif_svc.notify_risk_comment(
        db,
        acceptance,
        comment,
        current_user,
        exclude_user_ids=mentioned_ids,
    )

    if current_user.is_sec_team and acceptance.creator and acceptance.creator.id not in mentioned_ids:
        try:
            await mail_svc.send_risk_comment_email(
                acceptance.creator.email,
                acceptance.cve_id,
                str(acceptance.id),
                current_user.username,
                message,
            )
        except Exception:
            logger.exception(
                "Risk acceptance comment email delivery failed",
                extra={"risk_acceptance_id": str(acceptance.id), "recipient_id": acceptance.creator.id},
            )

    await db.commit()
    await db.refresh(comment)
    return (
        CommentResponse(
            id=comment.id,
            risk_acceptance_id=comment.risk_acceptance_id,
            user_id=comment.user_id,
            username=current_user.username,
            message=comment.message,
            created_at=comment.created_at,
            is_sec_team=current_user.is_sec_team,
        ),
        mention_result.email_jobs,
    )
