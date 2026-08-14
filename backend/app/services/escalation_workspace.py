"""Escalation workspace: the active-escalation action queue.

A "current row" is the highest escalation level per
(cve_id, cluster_name, namespace) group, breaking ties by newest triggered_at.
A row is "contacted" once at least one CVE comment is linked to that exact
highest-level escalation (an older-level escalation keeps its own comments, so a
newly triggered higher level starts back at "needs action").

All the SQL that powers the active queue, its contact-state counts, and the
dashboard's matching active count lives here so the semantics stay in one place.
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from sqlalchemy import Select, func, select, tuple_
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser
from ..i18n import ApiError
from ..models.cve_comment import CveComment
from ..models.escalation import Escalation
from ..notifications import service as notif_svc
from ..schemas.cve import CveCommentResponse, EscalationContext
from .audit_service import log_action

logger = logging.getLogger(__name__)


@dataclass
class WorkspaceRow:
    id: UUID
    cve_id: str
    namespace: str
    cluster_name: str
    level: int
    triggered_at: datetime
    notified: bool
    contacted: bool


def _filtered_current_rows(
    *,
    can_see_all: bool,
    namespaces: list[tuple[str, str]],
    cluster: str | None = None,
    namespace: str | None = None,
    search: str | None = None,
    level: int | None = None,
    email_status: str | None = None,
) -> Select:
    """Build a subquery of current rows with a `contacted` flag.

    Applies scope + search + level + email_status filters, but NOT contact_status
    (so contact-state counts can be computed off the same set). `namespaces` for
    non-all-namespace users is expected to be already scope-narrowed by the caller.
    """
    rn = (
        func.row_number()
        .over(
            partition_by=(Escalation.cve_id, Escalation.cluster_name, Escalation.namespace),
            order_by=(Escalation.level.desc(), Escalation.triggered_at.desc(), Escalation.id.desc()),
        )
        .label("rn")
    )
    ranked = select(
        Escalation.id,
        Escalation.cve_id,
        Escalation.namespace,
        Escalation.cluster_name,
        Escalation.level,
        Escalation.triggered_at,
        Escalation.notified,
        rn,
    ).subquery()

    # One comment linked to the highest-level escalation marks the row contacted.
    comment_counts = (
        select(
            CveComment.escalation_id.label("eid"),
            func.count().label("cnt"),
        )
        .where(CveComment.escalation_id.is_not(None))
        .group_by(CveComment.escalation_id)
        .subquery()
    )
    contacted_col = (func.coalesce(comment_counts.c.cnt, 0) > 0).label("contacted")

    base = (
        select(
            ranked.c.id,
            ranked.c.cve_id,
            ranked.c.namespace,
            ranked.c.cluster_name,
            ranked.c.level,
            ranked.c.triggered_at,
            ranked.c.notified,
            contacted_col,
        )
        .select_from(ranked.outerjoin(comment_counts, comment_counts.c.eid == ranked.c.id))
        .where(ranked.c.rn == 1)
    )

    if not can_see_all:
        if not namespaces:
            # Guaranteed-empty result: no visible namespaces.
            base = base.where(tuple_(ranked.c.namespace, ranked.c.cluster_name).in_([]))
        else:
            base = base.where(tuple_(ranked.c.namespace, ranked.c.cluster_name).in_(namespaces))
    else:
        if cluster:
            base = base.where(ranked.c.cluster_name == cluster)
        if namespace:
            base = base.where(ranked.c.namespace == namespace)

    if search:
        base = base.where(ranked.c.cve_id.ilike(f"%{search}%"))
    if level is not None:
        base = base.where(ranked.c.level == level)
    if email_status == "notified":
        base = base.where(ranked.c.notified.is_(True))
    elif email_status == "pending":
        base = base.where(ranked.c.notified.is_(False))

    return base.subquery()


async def search_active_workspace(
    db: AsyncSession,
    *,
    can_see_all: bool,
    namespaces: list[tuple[str, str]],
    cluster: str | None,
    namespace: str | None,
    search: str | None,
    level: int | None,
    email_status: str | None,
    contact_status: str | None,
    page: int,
    page_size: int,
) -> tuple[list[WorkspaceRow], int, dict[str, int]]:
    """Return (rows, total_after_contact_filter, contact_counts).

    contact_counts is computed after every filter except contact_status.
    """
    filtered = _filtered_current_rows(
        can_see_all=can_see_all,
        namespaces=namespaces,
        cluster=cluster,
        namespace=namespace,
        search=search,
        level=level,
        email_status=email_status,
    )

    # Contact-state counts: after all filters except contact_status.
    counts_result = await db.execute(select(filtered.c.contacted, func.count()).group_by(filtered.c.contacted))
    contact_counts = {"needs_action": 0, "contacted": 0}
    for is_contacted, n in counts_result:
        contact_counts["contacted" if is_contacted else "needs_action"] = n

    q = select(filtered)
    if contact_status == "contacted":
        q = q.where(filtered.c.contacted.is_(True))
    elif contact_status == "needs_action":
        q = q.where(filtered.c.contacted.is_(False))

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0

    page = max(1, page)
    rows_result = await db.execute(
        q.order_by(filtered.c.triggered_at.desc(), filtered.c.cve_id).limit(page_size).offset((page - 1) * page_size)
    )
    rows = [
        WorkspaceRow(
            id=r.id,
            cve_id=r.cve_id,
            namespace=r.namespace,
            cluster_name=r.cluster_name,
            level=r.level,
            triggered_at=r.triggered_at,
            notified=r.notified,
            contacted=bool(r.contacted),
        )
        for r in rows_result
    ]
    return rows, total, contact_counts


async def count_active_workspace(
    db: AsyncSession,
    *,
    can_see_all: bool,
    namespaces: list[tuple[str, str]],
    cluster: str | None = None,
    namespace: str | None = None,
) -> int:
    """Count current highest-level rows in scope. Powers dashboard stat_escalations."""
    filtered = _filtered_current_rows(
        can_see_all=can_see_all,
        namespaces=namespaces,
        cluster=cluster,
        namespace=namespace,
    )
    result = await db.execute(select(func.count()).select_from(filtered))
    return result.scalar() or 0


async def add_current_escalation_comment(
    db: AsyncSession,
    *,
    current_user: CurrentUser,
    escalation_id: UUID,
    message: str,
) -> CveCommentResponse:
    """Add a contact comment only when the target is the current workspace row."""
    if not current_user.is_sec_team:
        raise ApiError(403, "escalation_comment_forbidden")

    escalation_result = await db.execute(select(Escalation).where(Escalation.id == escalation_id))
    escalation = escalation_result.scalar_one_or_none()
    if escalation is None:
        raise ApiError(404, "escalation_not_found")

    current_id_result = await db.execute(
        select(Escalation.id)
        .where(
            Escalation.cve_id == escalation.cve_id,
            Escalation.cluster_name == escalation.cluster_name,
            Escalation.namespace == escalation.namespace,
        )
        .order_by(Escalation.level.desc(), Escalation.triggered_at.desc(), Escalation.id.desc())
        .limit(1)
    )
    if current_id_result.scalar_one_or_none() != escalation.id:
        raise ApiError(409, "escalation_not_active")

    comment = CveComment(
        cve_id=escalation.cve_id,
        user_id=current_user.id,
        message=message,
        escalation_id=escalation.id,
    )
    db.add(comment)
    await db.flush()

    await notif_svc.notify_mentions(
        db,
        message,
        current_user,
        f"/vulnerabilities/{escalation.cve_id}#comment-{comment.id}",
    )
    await log_action(
        db,
        current_user.id,
        "escalation_comment_created",
        "escalation",
        str(escalation.id),
        details={
            "cve_id": escalation.cve_id,
            "comment_id": str(comment.id),
            "cluster_name": escalation.cluster_name,
            "namespace": escalation.namespace,
            "level": escalation.level,
        },
    )
    await db.commit()
    await db.refresh(comment)
    logger.info(
        "Escalation contact comment created",
        extra={
            "escalation_id": str(escalation.id),
            "comment_id": str(comment.id),
            "cve_id": escalation.cve_id,
            "cluster_name": escalation.cluster_name,
            "namespace": escalation.namespace,
            "level": escalation.level,
            "user_id": current_user.id,
        },
    )
    return CveCommentResponse(
        id=comment.id,
        cve_id=comment.cve_id,
        user_id=comment.user_id,
        username=current_user.username,
        message=comment.message,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        is_sec_team=True,
        escalation_context=EscalationContext(
            cluster_name=escalation.cluster_name,
            namespace=escalation.namespace,
            level=escalation.level,
        ),
    )
