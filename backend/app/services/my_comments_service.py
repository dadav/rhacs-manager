"""Personal comment-thread overview: every thread the current user commented in.

Thread keys:
- CVE thread: ``cve_comments.cve_id`` (escalation-scoped comments included,
  matching ``GET /cves/{id}/comments`` which returns all of them).
- RA thread: ``risk_acceptance_comments.risk_acceptance_id``.

Latest-row selection is deterministic: within a thread, comments are ordered by
``(created_at DESC, id DESC)`` and every field of the "latest own comment" and
"latest reply" comes from that single ranked row, never from independent
aggregates. A reply is a comment by another user ordered after the user's
latest own comment under the same ordering.

Assumption: per-user thread volume is small (hundreds at most), so rows are
merged, sorted and paginated in Python after a bounded number of queries.
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, select, tuple_
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser
from ..models.cve_comment import CveComment
from ..models.escalation import Escalation
from ..models.risk_acceptance import RiskAcceptance, RiskAcceptanceComment
from ..models.user import User
from ..schemas.my_comments import MyCommentKind, MyCommentThread
from ..stackrox import queries as sx
from .comment_content import enrich_segments, mention_user_ids
from .comment_service import escalation_context
from .risk_acceptance_service import user_can_access_ra

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class _OwnLatest:
    key: Any
    comment_id: UUID
    created_at: datetime
    message: str
    content_segments: list | None
    escalation_id: UUID | None
    count: int


@dataclass(frozen=True)
class _LatestReply:
    key: Any
    user_id: str
    created_at: datetime
    count: int


async def _own_latest(db: AsyncSession, model, key_col, user_id: str) -> dict[Any, _OwnLatest]:
    """Latest own comment per thread plus the user's comment count in it."""
    has_escalation = model is CveComment
    escalation_col = model.escalation_id if has_escalation else None
    ranked = (
        select(
            key_col.label("thread_key"),
            model.id,
            model.created_at,
            model.message,
            model.content_segments,
            *([escalation_col.label("escalation_id")] if has_escalation else []),
            func.row_number()
            .over(partition_by=key_col, order_by=(model.created_at.desc(), model.id.desc()))
            .label("rn"),
            func.count().over(partition_by=key_col).label("cnt"),
        )
        .where(model.user_id == user_id)
        .subquery()
    )
    rows = (await db.execute(select(ranked).where(ranked.c.rn == 1))).all()
    return {
        row.thread_key: _OwnLatest(
            key=row.thread_key,
            comment_id=row.id,
            created_at=row.created_at,
            message=row.message,
            content_segments=row.content_segments,
            escalation_id=row.escalation_id if has_escalation else None,
            count=row.cnt,
        )
        for row in rows
    }


async def _latest_replies(db: AsyncSession, model, key_col, user_id: str) -> dict[Any, _LatestReply]:
    """Latest reply row and reply count per thread, after the user's latest own comment."""
    own_ranked = (
        select(
            key_col.label("thread_key"),
            model.id.label("my_id"),
            model.created_at.label("my_at"),
            func.row_number()
            .over(partition_by=key_col, order_by=(model.created_at.desc(), model.id.desc()))
            .label("rn"),
        )
        .where(model.user_id == user_id)
        .subquery()
    )
    own_last = select(own_ranked).where(own_ranked.c.rn == 1).subquery()

    replies = (
        select(
            key_col.label("thread_key"),
            model.user_id,
            model.created_at,
            func.row_number()
            .over(partition_by=key_col, order_by=(model.created_at.desc(), model.id.desc()))
            .label("rn"),
            func.count().over(partition_by=key_col).label("cnt"),
        )
        .join(own_last, own_last.c.thread_key == key_col)
        .where(
            model.user_id != user_id,
            tuple_(model.created_at, model.id) > tuple_(own_last.c.my_at, own_last.c.my_id),
        )
        .subquery()
    )
    rows = (await db.execute(select(replies).where(replies.c.rn == 1))).all()
    return {
        row.thread_key: _LatestReply(key=row.thread_key, user_id=row.user_id, created_at=row.created_at, count=row.cnt)
        for row in rows
    }


async def _load_users(db: AsyncSession, ids: set[str]) -> dict[str, User]:
    if not ids:
        return {}
    rows = (await db.execute(select(User).where(User.id.in_(ids)))).scalars().all()
    return {u.id: u for u in rows}


def _sort_key(thread: MyCommentThread) -> tuple[datetime, str]:
    last_activity = max(thread.my_last_comment_at, thread.last_reply_at or thread.my_last_comment_at)
    return (last_activity, str(thread.my_last_comment_id))


async def list_my_comment_threads(
    app_db: AsyncSession,
    sx_db: AsyncSession,
    current_user: CurrentUser,
    *,
    kind: MyCommentKind | None = None,
    only_with_replies: bool = False,
) -> list[MyCommentThread]:
    """All threads the user commented in, newest activity first."""
    user_id = current_user.id

    cve_own = await _own_latest(app_db, CveComment, CveComment.cve_id, user_id)
    cve_replies = await _latest_replies(app_db, CveComment, CveComment.cve_id, user_id)
    ra_own = await _own_latest(app_db, RiskAcceptanceComment, RiskAcceptanceComment.risk_acceptance_id, user_id)
    ra_replies = await _latest_replies(app_db, RiskAcceptanceComment, RiskAcceptanceComment.risk_acceptance_id, user_id)

    # Escalation labels are sec-team only, same rule as GET /cves/{id}/comments.
    esc_map: dict[UUID, Escalation] = {}
    if current_user.is_sec_team:
        esc_ids = {o.escalation_id for o in cve_own.values() if o.escalation_id is not None}
        if esc_ids:
            esc_rows = (await app_db.execute(select(Escalation).where(Escalation.id.in_(esc_ids)))).scalars().all()
            esc_map = {e.id: e for e in esc_rows}

    ra_map: dict[UUID, RiskAcceptance] = {}
    if ra_own:
        ra_rows = (
            (await app_db.execute(select(RiskAcceptance).where(RiskAcceptance.id.in_(list(ra_own.keys())))))
            .scalars()
            .all()
        )
        ra_map = {ra.id: ra for ra in ra_rows}
    ra_access = {ra_id: user_can_access_ra(current_user, ra) for ra_id, ra in ra_map.items()}

    # Detail availability mirrors get_cve: the CVE must still affect a deployment
    # in the user's visible namespaces (all namespaces: no filter).
    probe_namespaces = None if current_user.can_see_all_namespaces else list(current_user.namespaces)
    cve_detail_ok = await sx.cves_visible_in_namespaces(sx_db, list(cve_own.keys()), probe_namespaces)

    user_ids: set[str] = set()
    for own in (*cve_own.values(), *ra_own.values()):
        user_ids.update(mention_user_ids(own.content_segments))
    for reply in cve_replies.values():
        user_ids.add(reply.user_id)
    for ra_id, reply in ra_replies.items():
        if ra_access.get(ra_id, False):
            user_ids.add(reply.user_id)
    users = await _load_users(app_db, user_ids)
    display_by_id = {uid: u.display_name for uid, u in users.items()}

    def _reply_name(reply: _LatestReply) -> str:
        user = users.get(reply.user_id)
        return user.display_name if user else reply.user_id

    threads: list[MyCommentThread] = []

    for cve_id, own in cve_own.items():
        esc = esc_map.get(own.escalation_id) if own.escalation_id is not None else None
        reply = cve_replies.get(cve_id)
        detail_ok = cve_id in cve_detail_ok
        threads.append(
            MyCommentThread(
                kind="escalation" if esc is not None else "cve",
                cve_id=cve_id,
                escalation_context=escalation_context(esc),
                my_comment_count=own.count,
                my_last_comment_id=own.comment_id,
                my_last_comment_at=own.created_at,
                my_last_message=own.message,
                my_last_content=enrich_segments(own.content_segments, display_by_id),
                replies_since=reply.count if reply else 0,
                last_reply_at=reply.created_at if reply else None,
                last_reply_by_name=_reply_name(reply) if reply else None,
                thread_available=True,
                detail_available=detail_ok,
                detail_link=f"/vulnerabilities/{cve_id}" if detail_ok else None,
            )
        )

    for ra_id, own in ra_own.items():
        ra = ra_map.get(ra_id)
        accessible = ra_access.get(ra_id, False)
        # No reply data for inaccessible RAs so the overview leaks no activity.
        reply = ra_replies.get(ra_id) if accessible else None
        threads.append(
            MyCommentThread(
                kind="risk_acceptance",
                cve_id=ra.cve_id if ra else "",
                risk_acceptance_id=ra_id,
                my_comment_count=own.count,
                my_last_comment_id=own.comment_id,
                my_last_comment_at=own.created_at,
                my_last_message=own.message,
                my_last_content=enrich_segments(own.content_segments, display_by_id),
                replies_since=reply.count if reply else 0,
                last_reply_at=reply.created_at if reply else None,
                last_reply_by_name=_reply_name(reply) if reply else None,
                thread_available=accessible,
                detail_available=accessible,
                detail_link=f"/risk-acceptances/{ra_id}" if accessible else None,
            )
        )

    if kind is not None:
        threads = [t for t in threads if t.kind == kind]
    if only_with_replies:
        threads = [t for t in threads if t.replies_since > 0]

    threads.sort(key=_sort_key, reverse=True)
    return threads
