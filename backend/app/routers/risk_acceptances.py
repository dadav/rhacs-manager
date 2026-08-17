import logging
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db, get_stackrox_db
from ..i18n import ApiError
from ..mail import service as mail_svc
from ..models.risk_acceptance import RiskAcceptance, RiskAcceptanceComment, RiskStatus
from ..models.user import User, UserRole
from ..notifications import service as notif_svc
from ..schemas.risk_acceptance import (
    CommentCreate,
    CommentResponse,
    RiskAcceptanceAssign,
    RiskAcceptanceCreate,
    RiskAcceptanceResponse,
    RiskAcceptanceReview,
    RiskAcceptanceUpdate,
)
from ..services import comment_service
from ..services.audit_service import log_action
from ..services.comment_content import enrich_segments
from ..services.risk_acceptance_service import (
    get_scope_namespaces as _get_scope_namespaces,
)
from ..services.risk_acceptance_service import (
    is_single_team_scope as _is_single_team_scope,
)
from ..services.risk_acceptance_service import (
    normalize_scope as _normalize_scope,
)
from ..services.risk_acceptance_service import (
    scope_key as _scope_key,
)
from ..services.risk_acceptance_service import (
    user_can_access_ra as _user_can_access_ra,
)
from ..services.risk_acceptance_service import (
    validate_and_resolve_scope as _validate_and_resolve_scope,
)
from ..stackrox import queries as sx

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/risk-acceptances", tags=["risk-acceptances"])


async def _effective_namespaces(user: CurrentUser, sx_db: AsyncSession) -> list[tuple[str, str]]:
    """Namespaces to scope StackRox lookups by.

    Wildcard all-namespace users carry an empty ``user.namespaces`` list, so
    expand them to every known namespace (same pattern as cves/dashboard routers).
    """
    if user.can_see_all_namespaces:
        all_ns = await sx.list_namespaces(sx_db)
        return [(r["namespace"], r["cluster_name"]) for r in all_ns]
    return user.namespaces


def _build_response(ra: RiskAcceptance, comment_count: int) -> RiskAcceptanceResponse:
    return RiskAcceptanceResponse(
        id=ra.id,
        cve_id=ra.cve_id,
        status=ra.status.value,
        justification=ra.justification,
        scope=_normalize_scope(ra.scope),
        expires_at=ra.expires_at,
        created_at=ra.created_at,
        created_by=ra.created_by,
        created_by_name=ra.creator.display_name if ra.creator else ra.created_by,
        reviewed_by=ra.reviewed_by,
        reviewed_by_name=ra.reviewer.display_name if ra.reviewer else None,
        reviewed_at=ra.reviewed_at,
        assigned_to=ra.assigned_to,
        assigned_to_name=ra.assignee.display_name if ra.assignee else None,
        comment_count=comment_count,
    )


# Shared selectinload options for list and single-item queries
_RA_LOAD_OPTIONS = [
    selectinload(RiskAcceptance.creator),
    selectinload(RiskAcceptance.reviewer),
    selectinload(RiskAcceptance.assignee),
]


async def _single_ra_response(ra: RiskAcceptance, db: AsyncSession) -> RiskAcceptanceResponse:
    """Build response for a single RA, loading relationships and comment count."""
    await db.refresh(ra, ["creator", "reviewer", "assignee"])
    count_result = await db.execute(
        select(func.count(RiskAcceptanceComment.id)).where(RiskAcceptanceComment.risk_acceptance_id == ra.id)
    )
    return _build_response(ra, count_result.scalar() or 0)


@router.post("", response_model=RiskAcceptanceResponse, status_code=201)
async def create_risk_acceptance(
    body: RiskAcceptanceCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> RiskAcceptanceResponse:
    if current_user.is_sec_team:
        raise ApiError(403, "ra_sec_team_cannot_request")
    if not current_user.has_namespaces:
        raise ApiError(400, "no_namespaces")

    effective_ns = await _effective_namespaces(current_user, sx_db)
    deployments = await sx.get_affected_deployments(sx_db, body.cve_id, effective_ns)
    if not deployments:
        raise ApiError(404, "cve_not_in_namespaces")

    normalized_scope = _validate_and_resolve_scope(body.scope, deployments)
    scope_key = _scope_key(normalized_scope)

    # Check for existing active acceptance
    existing = await db.execute(
        select(RiskAcceptance).where(
            RiskAcceptance.cve_id == body.cve_id,
            RiskAcceptance.scope_key == scope_key,
            RiskAcceptance.status.in_([RiskStatus.requested, RiskStatus.approved]),
        )
    )
    if existing.scalar_one_or_none():
        raise ApiError(409, "ra_duplicate_cve_scope")

    # Single-team scopes (one namespace the requester owns) auto-approve; multi-team
    # scopes (mode=all or spanning namespaces) require sec-team review.
    single_team = _is_single_team_scope(normalized_scope)

    ra = RiskAcceptance(
        cve_id=body.cve_id,
        status=RiskStatus.approved if single_team else RiskStatus.requested,
        justification=body.justification,
        scope=normalized_scope.model_dump(mode="json"),
        scope_key=scope_key,
        expires_at=body.expires_at,
        created_by=current_user.id,
        reviewed_at=datetime.utcnow() if single_team else None,
    )
    db.add(ra)
    await db.flush()

    await log_action(db, current_user.id, "risk_acceptance_created", "risk_acceptance", str(ra.id))
    if single_team:
        await log_action(db, current_user.id, "risk_acceptance_auto_approved", "risk_acceptance", str(ra.id))
    await db.commit()
    return await _single_ra_response(ra, db)


@router.get("", response_model=list[RiskAcceptanceResponse])
async def list_risk_acceptances(
    status: str | None = Query(None),
    cluster: str | None = Query(None),
    namespace: str | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> list[RiskAcceptanceResponse]:
    query = select(RiskAcceptance).options(*_RA_LOAD_OPTIONS).order_by(RiskAcceptance.created_at.desc())

    if status:
        try:
            query = query.where(RiskAcceptance.status == RiskStatus[status])
        except KeyError:
            raise ApiError(400, "invalid_status", status=status) from None

    result = await db.execute(query)
    all_ras = result.scalars().all()

    # Filter by namespace access for non-sec users
    accessible = [ra for ra in all_ras if _user_can_access_ra(current_user, ra)]

    # Apply global scope filter on scope targets
    if cluster or namespace:

        def _ra_matches_scope(ra: RiskAcceptance) -> bool:
            scope_ns = _get_scope_namespaces(ra.scope)
            if not scope_ns:
                # 'all' scope — matches any cluster/namespace filter
                return True
            for ns, cl in scope_ns:
                if cluster and cl != cluster:
                    continue
                if namespace and ns != namespace:
                    continue
                return True
            return False

        accessible = [ra for ra in accessible if _ra_matches_scope(ra)]

    # Batch-load comment counts for all accessible RAs in a single query
    if accessible:
        ra_ids = [ra.id for ra in accessible]
        count_result = await db.execute(
            select(
                RiskAcceptanceComment.risk_acceptance_id,
                func.count(RiskAcceptanceComment.id),
            )
            .where(RiskAcceptanceComment.risk_acceptance_id.in_(ra_ids))
            .group_by(RiskAcceptanceComment.risk_acceptance_id)
        )
        comment_counts: dict[UUID, int] = dict(count_result.all())
    else:
        comment_counts = {}

    return [_build_response(ra, comment_counts.get(ra.id, 0)) for ra in accessible]


@router.get("/{ra_id}", response_model=RiskAcceptanceResponse)
async def get_risk_acceptance(
    ra_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> RiskAcceptanceResponse:
    result = await db.execute(select(RiskAcceptance).options(*_RA_LOAD_OPTIONS).where(RiskAcceptance.id == ra_id))
    ra = result.scalar_one_or_none()
    if not ra:
        raise ApiError(404, "not_found")
    if not _user_can_access_ra(current_user, ra):
        raise ApiError(403, "forbidden")

    count_result = await db.execute(
        select(func.count(RiskAcceptanceComment.id)).where(RiskAcceptanceComment.risk_acceptance_id == ra.id)
    )
    return _build_response(ra, count_result.scalar() or 0)


@router.put("/{ra_id}", response_model=RiskAcceptanceResponse)
async def update_risk_acceptance(
    ra_id: UUID,
    body: RiskAcceptanceUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> RiskAcceptanceResponse:
    """Team member modifies an approved/rejected acceptance → resets to 'requested'."""
    if current_user.is_sec_team:
        raise ApiError(403, "ra_sec_team_cannot_modify")

    result = await db.execute(select(RiskAcceptance).where(RiskAcceptance.id == ra_id))
    ra = result.scalar_one_or_none()
    if not ra:
        raise ApiError(404, "not_found")
    if ra.created_by != current_user.id:
        raise ApiError(403, "ra_only_creator_can_modify")
    if ra.status not in (RiskStatus.approved, RiskStatus.rejected):
        raise ApiError(400, "ra_only_approved_rejected_modifiable")

    if not current_user.has_namespaces:
        raise ApiError(400, "no_namespaces")

    effective_ns = await _effective_namespaces(current_user, sx_db)
    deployments = await sx.get_affected_deployments(sx_db, ra.cve_id, effective_ns)
    if not deployments:
        raise ApiError(404, "cve_not_in_namespaces_anymore")

    normalized_scope = _validate_and_resolve_scope(body.scope, deployments)
    new_scope_key = _scope_key(normalized_scope)

    if new_scope_key != ra.scope_key:
        existing = await db.execute(
            select(RiskAcceptance).where(
                RiskAcceptance.cve_id == ra.cve_id,
                RiskAcceptance.scope_key == new_scope_key,
                RiskAcceptance.status.in_([RiskStatus.requested, RiskStatus.approved]),
                RiskAcceptance.id != ra.id,
            )
        )
        if existing.scalar_one_or_none():
            raise ApiError(409, "ra_duplicate_scope")

    # Re-evaluate scope: single-team scopes re-auto-approve, multi-team scopes
    # drop back to requested for sec-team review.
    single_team = _is_single_team_scope(normalized_scope)

    ra.justification = body.justification
    ra.scope = normalized_scope.model_dump(mode="json")
    ra.scope_key = new_scope_key
    ra.expires_at = body.expires_at
    ra.status = RiskStatus.approved if single_team else RiskStatus.requested
    ra.reviewed_by = None
    ra.reviewed_at = datetime.utcnow() if single_team else None

    await log_action(db, current_user.id, "risk_acceptance_updated", "risk_acceptance", str(ra.id))
    if single_team:
        await log_action(db, current_user.id, "risk_acceptance_auto_approved", "risk_acceptance", str(ra.id))
    await db.commit()
    return await _single_ra_response(ra, db)


@router.patch("/{ra_id}", response_model=RiskAcceptanceResponse)
async def review_risk_acceptance(
    ra_id: UUID,
    body: RiskAcceptanceReview,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> RiskAcceptanceResponse:
    if not current_user.is_sec_team:
        raise ApiError(403, "ra_sec_team_only_review")

    result = await db.execute(
        select(RiskAcceptance).options(selectinload(RiskAcceptance.creator)).where(RiskAcceptance.id == ra_id)
    )
    ra = result.scalar_one_or_none()
    if not ra:
        raise ApiError(404, "not_found")
    if ra.status != RiskStatus.requested:
        raise ApiError(400, "ra_only_requested_reviewable")

    ra.status = RiskStatus.approved if body.approved else RiskStatus.rejected
    ra.reviewed_by = current_user.id
    ra.reviewed_at = datetime.utcnow()

    if body.comment:
        comment = RiskAcceptanceComment(
            risk_acceptance_id=ra.id,
            user_id=current_user.id,
            message=body.comment,
        )
        db.add(comment)

    await log_action(
        db,
        current_user.id,
        "risk_acceptance_reviewed",
        "risk_acceptance",
        str(ra.id),
        {"status": ra.status.value},
    )

    await notif_svc.notify_risk_status_change(db, ra, current_user)

    # Email to RA creator — use pre-loaded creator relationship
    if ra.creator and ra.creator.email:
        try:
            await mail_svc.send_risk_status_email(
                ra.creator.email,
                ra.cve_id,
                str(ra.id),
                ra.status.value,
                current_user.display_name,
                body.comment,
            )
        except Exception:
            logger.exception("Failed to send risk status email for RA %s", ra.id)

    await db.commit()
    return await _single_ra_response(ra, db)


@router.post("/{ra_id}/assign", response_model=RiskAcceptanceResponse)
async def assign_reviewer(
    ra_id: UUID,
    body: RiskAcceptanceAssign,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> RiskAcceptanceResponse:
    if not current_user.is_sec_team:
        raise ApiError(403, "ra_sec_team_only_assign")

    result = await db.execute(select(RiskAcceptance).where(RiskAcceptance.id == ra_id))
    ra = result.scalar_one_or_none()
    if not ra:
        raise ApiError(404, "not_found")
    if ra.status != RiskStatus.requested:
        raise ApiError(400, "ra_only_requested_assignable")

    # Verify the target user exists and is sec_team
    user_result = await db.execute(select(User).where(User.id == body.user_id))
    target_user = user_result.scalar_one_or_none()
    if not target_user:
        raise ApiError(404, "user_not_found")
    if target_user.role != UserRole.sec_team:
        raise ApiError(400, "ra_reviewer_must_be_sec")

    ra.assigned_to = body.user_id

    await log_action(
        db,
        current_user.id,
        "risk_acceptance_assigned",
        "risk_acceptance",
        str(ra.id),
        {"assigned_to_id": target_user.id},
    )

    # Notify the assigned reviewer
    await notif_svc.create_notification(
        db,
        body.user_id,
        notif_svc.NotificationType.risk_comment,
        f"Risikoakzeptanz zugewiesen: {ra.cve_id}",
        f"{current_user.display_name} hat Ihnen die Prüfung der Risikoakzeptanz für {ra.cve_id} zugewiesen.",
        f"/risk-acceptances/{ra.id}",
    )

    await db.commit()
    return await _single_ra_response(ra, db)


@router.delete("/{ra_id}", status_code=204)
async def cancel_risk_acceptance(
    ra_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> None:
    """Delete a risk acceptance. Sec team can delete any; creators can delete their own."""
    result = await db.execute(select(RiskAcceptance).where(RiskAcceptance.id == ra_id))
    ra = result.scalar_one_or_none()
    if not ra:
        raise ApiError(404, "not_found")
    if not current_user.is_sec_team and ra.created_by != current_user.id:
        raise ApiError(403, "ra_only_creator_can_delete")

    await log_action(db, current_user.id, "risk_acceptance_deleted", "risk_acceptance", str(ra.id))
    await db.delete(ra)
    await db.commit()


@router.post("/{ra_id}/comments", response_model=CommentResponse, status_code=201)
async def add_comment(
    ra_id: UUID,
    body: CommentCreate,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> CommentResponse:
    result = await db.execute(
        select(RiskAcceptance).options(selectinload(RiskAcceptance.creator)).where(RiskAcceptance.id == ra_id)
    )
    ra = result.scalar_one_or_none()
    if not ra:
        raise ApiError(404, "not_found")
    if not _user_can_access_ra(current_user, ra):
        raise ApiError(403, "forbidden")

    response, email_jobs = await comment_service.add_risk_acceptance_comment(
        db, acceptance=ra, message=body.message, content=body.content, current_user=current_user
    )
    if email_jobs:
        background_tasks.add_task(mail_svc.send_mention_emails, email_jobs)
    return response


@router.get("/{ra_id}/comments", response_model=list[CommentResponse])
async def list_comments(
    ra_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> list[CommentResponse]:
    result = await db.execute(select(RiskAcceptance).where(RiskAcceptance.id == ra_id))
    ra = result.scalar_one_or_none()
    if not ra:
        raise ApiError(404, "not_found")
    if not _user_can_access_ra(current_user, ra):
        raise ApiError(403, "forbidden")

    comments_result = await db.execute(
        select(RiskAcceptanceComment)
        .where(RiskAcceptanceComment.risk_acceptance_id == ra_id)
        .order_by(RiskAcceptanceComment.created_at)
    )
    comments = comments_result.scalars().all()

    users = await comment_service.load_comment_users(db, comments)
    display_by_id = comment_service.display_map(users)

    from ..models.user import UserRole

    return [
        CommentResponse(
            id=c.id,
            risk_acceptance_id=c.risk_acceptance_id,
            user_id=c.user_id,
            username=users[c.user_id].username if c.user_id in users else c.user_id,
            display_name=users[c.user_id].display_name if c.user_id in users else c.user_id,
            message=c.message,
            content=enrich_segments(c.content_segments, display_by_id),
            created_at=c.created_at,
            is_sec_team=users[c.user_id].role == UserRole.sec_team if c.user_id in users else False,
        )
        for c in comments
    ]
