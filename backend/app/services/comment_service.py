"""Comment mutations and their transactional notification behavior.

Comments accept exactly one input shape (validated by ``CommentInput``):

- Legacy ``message`` (``@[username]`` text), resolved case-insensitively.
- Structured ``content`` (ordered text/mention segments) from the updated UI.

Both are normalized into a stored ``message`` (legacy form) plus
``content_segments`` (user-id-backed). Mention notifications are resolved by
user id via ``notify_mention_users``.
"""

import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser
from ..i18n import ApiError
from ..mail import service as mail_svc
from ..models.cve_comment import CveComment
from ..models.escalation import Escalation
from ..models.risk_acceptance import RiskAcceptance, RiskAcceptanceComment
from ..models.user import User
from ..notifications import service as notif_svc
from ..schemas.comment import MAX_COMMENT_LEN
from ..schemas.cve import CveCommentResponse, EscalationContext
from ..schemas.risk_acceptance import CommentResponse
from .comment_content import (
    enrich_segments,
    legacy_mention_names,
    mention_user_ids,
    parse_message_to_segments,
    segments_to_display_text,
    segments_to_message,
)

logger = logging.getLogger(__name__)


def display_map(users: dict[str, User]) -> dict[str, str]:
    """user_id -> current display_name, for enriching mention segments."""
    return {uid: u.display_name for uid, u in users.items()}


async def load_comment_users(db: AsyncSession, comments: list) -> dict[str, User]:
    """Batch-load every user referenced by the comments (authors + mentions)."""
    ids: set[str] = set()
    for c in comments:
        if c.user_id:
            ids.add(c.user_id)
        for uid in mention_user_ids(c.content_segments):
            ids.add(uid)
    if not ids:
        return {}
    rows = (await db.execute(select(User).where(User.id.in_(ids)))).scalars().all()
    return {u.id: u for u in rows}


@dataclass
class PreparedComment:
    """Normalized comment content plus the data needed to notify and respond."""

    message: str
    segments: list[dict]
    recipients: list[User]  # ordered, distinct mention users (may include author)
    display_by_id: dict[str, str]  # mention user_id -> current display_name

    def content_for_response(self) -> list[dict] | None:
        return enrich_segments(self.segments, self.display_by_id)

    def display_text(self) -> str:
        return segments_to_display_text(self.segments, self.display_by_id)


async def _resolve_input(
    db: AsyncSession,
    *,
    message: str | None,
    content: list | None,
) -> PreparedComment:
    """Normalize a create/update body into stored message + segments + recipients.

    Structured input rejects unknown user ids; the legacy path silently drops
    unknown ``@[name]`` tokens to ordinary text (unchanged behavior).
    """
    if content is not None:
        ids: list[str] = []
        seen: set[str] = set()
        for seg in content:
            if seg.type == "mention" and seg.user_id not in seen:
                seen.add(seg.user_id)
                ids.append(seg.user_id)
        users: dict[str, User] = {}
        if ids:
            rows = (await db.execute(select(User).where(User.id.in_(ids)))).scalars().all()
            users = {u.id: u for u in rows}
            for uid in ids:
                if uid not in users:
                    raise ApiError(400, "unknown_mention_user", user_id=uid)
        segments: list[dict] = []
        for seg in content:
            if seg.type == "mention":
                u = users[seg.user_id]
                segments.append({"type": "mention", "user_id": u.id, "username": u.username})
            else:
                segments.append({"type": "text", "text": seg.text})
        display_by_id = {uid: users[uid].display_name for uid in ids}
        stored_message = segments_to_message(segments)
        if (
            len(stored_message) > MAX_COMMENT_LEN
            or len(segments_to_display_text(segments, display_by_id)) > MAX_COMMENT_LEN
        ):
            raise ApiError(400, "comment_too_long")
        return PreparedComment(
            message=stored_message,
            segments=segments,
            recipients=[users[uid] for uid in ids],
            display_by_id=display_by_id,
        )

    # Legacy message path.
    assert message is not None
    names = legacy_mention_names(message)
    rows_by_id: dict[str, User] = {}
    name_to_user: dict[str, tuple[str, str]] = {}
    if names:
        rows = (await db.execute(select(User).where(func.lower(User.username).in_(names)))).scalars().all()
        rows_by_id = {u.id: u for u in rows}
        name_to_user = {u.username.lower(): (u.id, u.username) for u in rows}
    segments = parse_message_to_segments(message, name_to_user)
    ordered_ids = mention_user_ids(segments)
    return PreparedComment(
        message=message,
        segments=segments,
        recipients=[rows_by_id[i] for i in ordered_ids],
        display_by_id={i: rows_by_id[i].display_name for i in ordered_ids},
    )


async def prepare_comment(
    db: AsyncSession, *, message: str | None = None, content: list | None = None
) -> PreparedComment:
    """Public wrapper around content normalization (segments + recipients)."""
    return await _resolve_input(db, message=message, content=content)


async def _previous_mention_ids(db: AsyncSession, *, segments: list | None, message: str) -> set[str]:
    """Ids mentioned by a comment's prior state, for edit-delta suppression."""
    if segments:
        return set(mention_user_ids(segments))
    names = legacy_mention_names(message or "")
    if not names:
        return set()
    rows = (await db.execute(select(User.id).where(func.lower(User.username).in_(names)))).scalars().all()
    return set(rows)


async def add_cve_comment(
    db: AsyncSession,
    *,
    cve_id: str,
    message: str | None = None,
    content: list | None = None,
    current_user: CurrentUser,
) -> tuple[CveCommentResponse, tuple[notif_svc.MentionEmailJob, ...]]:
    prepared = await _resolve_input(db, message=message, content=content)
    comment = CveComment(
        cve_id=cve_id,
        user_id=current_user.id,
        message=prepared.message,
        content_segments=prepared.segments,
    )
    db.add(comment)
    await db.flush()

    mention_result = await notif_svc.notify_mention_users(
        db,
        prepared.recipients,
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
            display_name=current_user.display_name,
            message=comment.message,
            content=prepared.content_for_response(),
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
    message: str | None = None,
    content: list | None = None,
    current_user: CurrentUser,
) -> tuple[CveCommentResponse, tuple[notif_svc.MentionEmailJob, ...]]:
    result = await db.execute(select(CveComment).where(CveComment.id == comment_id, CveComment.cve_id == cve_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise ApiError(404, "comment_not_found")
    if comment.user_id != current_user.id:
        raise ApiError(403, "comment_edit_forbidden")

    previous_ids = await _previous_mention_ids(db, segments=comment.content_segments, message=comment.message)
    prepared = await _resolve_input(db, message=message, content=content)
    comment.message = prepared.message
    comment.content_segments = prepared.segments
    comment.updated_at = datetime.now(UTC).replace(tzinfo=None)
    mention_result = await notif_svc.notify_mention_users(
        db,
        prepared.recipients,
        current_user,
        f"/vulnerabilities/{cve_id}#comment-{comment.id}",
        context_label=f"CVE {cve_id}",
        previously_notified_ids=previous_ids,
    )

    await db.commit()
    await db.refresh(comment)

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
            username=current_user.username,
            display_name=current_user.display_name,
            message=comment.message,
            content=prepared.content_for_response(),
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
    message: str | None = None,
    content: list | None = None,
    current_user: CurrentUser,
) -> tuple[CommentResponse, tuple[notif_svc.MentionEmailJob, ...]]:
    prepared = await _resolve_input(db, message=message, content=content)
    comment = RiskAcceptanceComment(
        risk_acceptance_id=acceptance.id,
        user_id=current_user.id,
        message=prepared.message,
        content_segments=prepared.segments,
    )
    db.add(comment)
    await db.flush()

    mention_result = await notif_svc.notify_mention_users(
        db,
        prepared.recipients,
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
                current_user.display_name,
                prepared.display_text(),
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
            display_name=current_user.display_name,
            message=comment.message,
            content=prepared.content_for_response(),
            created_at=comment.created_at,
            is_sec_team=current_user.is_sec_team,
        ),
        mention_result.email_jobs,
    )
