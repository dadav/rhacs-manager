import logging
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db, get_stackrox_db
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
    RiskScope,
)
from ..services.audit_service import log_action
from ..services.risk_acceptance_service import (
    scope_key as _scope_key,
)
from ..services.risk_acceptance_service import (
    validate_and_resolve_scope as _validate_and_resolve_scope,
)
from ..stackrox import queries as sx

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/risk-acceptances", tags=["risk-acceptances"])


def _normalize_scope(scope: dict) -> RiskScope:
    if isinstance(scope, dict) and "mode" in scope and "targets" in scope:
        return RiskScope.model_validate(scope)
    # Legacy records used {} or {images, namespaces}. Treat missing mode as global.
    return RiskScope(mode="all", targets=[])


def _get_scope_namespaces(scope: dict) -> set[tuple[str, str]]:
    """Extract (namespace, cluster_name) pairs from a risk acceptance scope."""
    ns_scope = _normalize_scope(scope)
    if ns_scope.mode == "all":
        return set()
    return {(t.namespace, t.cluster_name) for t in ns_scope.targets}


def _user_can_access_ra(user: CurrentUser, ra: RiskAcceptance) -> bool:
    """Check if user can access a risk acceptance based on namespace overlap."""
    if user.can_see_all_namespaces:
        return True
    if ra.created_by == user.id:
        return True
    scope_ns = _get_scope_namespaces(ra.scope)
    if not scope_ns:
        # 'all' scope — accessible to anyone with any namespace
        return user.has_namespaces
    user_ns = set(user.namespaces)
    return bool(scope_ns & user_ns)


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
        created_by_name=ra.creator.username if ra.creator else ra.created_by,
        reviewed_by=ra.reviewed_by,
        reviewed_by_name=ra.reviewer.username if ra.reviewer else None,
        reviewed_at=ra.reviewed_at,
        assigned_to=ra.assigned_to,
        assigned_to_name=ra.assignee.username if ra.assignee else None,
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
        raise HTTPException(403, "Security-Team kann keine Risikoakzeptanzen beantragen")
    if not current_user.has_namespaces:
        raise HTTPException(400, "Keine Namespaces zugeordnet")

    deployments = await sx.get_affected_deployments(sx_db, body.cve_id, current_user.namespaces)
    if not deployments:
        raise HTTPException(404, "CVE in Ihren Namespaces nicht gefunden")

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
        raise HTTPException(
            409,
            "Für diese CVE und diesen Scope existiert bereits eine aktive Risikoakzeptanz",
        )

    ra = RiskAcceptance(
        cve_id=body.cve_id,
        status=RiskStatus.requested,
        justification=body.justification,
        scope=normalized_scope.model_dump(mode="json"),
        scope_key=scope_key,
        expires_at=body.expires_at,
        created_by=current_user.id,
    )
    db.add(ra)
    await db.flush()

    await log_action(db, current_user.id, "risk_acceptance_created", "risk_acceptance", str(ra.id))
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
            raise HTTPException(400, f"Ungültiger Status: {status}") from None

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
        raise HTTPException(404, "Nicht gefunden")
    if not _user_can_access_ra(current_user, ra):
        raise HTTPException(403, "Kein Zugriff")

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
        raise HTTPException(403, "Security-Team kann keine Risikoakzeptanzen ändern")

    result = await db.execute(select(RiskAcceptance).where(RiskAcceptance.id == ra_id))
    ra = result.scalar_one_or_none()
    if not ra:
        raise HTTPException(404, "Nicht gefunden")
    if ra.created_by != current_user.id:
        raise HTTPException(403, "Nur der Ersteller kann die Risikoakzeptanz ändern")
    if ra.status not in (RiskStatus.approved, RiskStatus.rejected):
        raise HTTPException(
            400,
            "Nur genehmigte oder abgelehnte Risikoakzeptanzen können geändert werden",
        )

    if not current_user.has_namespaces:
        raise HTTPException(400, "Keine Namespaces zugeordnet")

    deployments = await sx.get_affected_deployments(sx_db, ra.cve_id, current_user.namespaces)
    if not deployments:
        raise HTTPException(404, "CVE in Ihren Namespaces nicht mehr gefunden")

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
            raise HTTPException(409, "Für diesen Scope existiert bereits eine aktive Risikoakzeptanz")

    ra.justification = body.justification
    ra.scope = normalized_scope.model_dump(mode="json")
    ra.scope_key = new_scope_key
    ra.expires_at = body.expires_at
    ra.status = RiskStatus.requested
    ra.reviewed_by = None
    ra.reviewed_at = None

    await log_action(db, current_user.id, "risk_acceptance_updated", "risk_acceptance", str(ra.id))
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
        raise HTTPException(403, "Nur das Security-Team kann Risikoakzeptanzen bearbeiten")

    result = await db.execute(
        select(RiskAcceptance).options(selectinload(RiskAcceptance.creator)).where(RiskAcceptance.id == ra_id)
    )
    ra = result.scalar_one_or_none()
    if not ra:
        raise HTTPException(404, "Nicht gefunden")
    if ra.status != RiskStatus.requested:
        raise HTTPException(400, "Nur beantragte Risikoakzeptanzen können bewertet werden")

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
                current_user.username,
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
        raise HTTPException(403, "Nur das Security-Team kann Reviewer zuweisen")

    result = await db.execute(select(RiskAcceptance).where(RiskAcceptance.id == ra_id))
    ra = result.scalar_one_or_none()
    if not ra:
        raise HTTPException(404, "Nicht gefunden")
    if ra.status != RiskStatus.requested:
        raise HTTPException(400, "Nur beantragte Risikoakzeptanzen können zugewiesen werden")

    # Verify the target user exists and is sec_team
    user_result = await db.execute(select(User).where(User.id == body.user_id))
    target_user = user_result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(404, "Benutzer nicht gefunden")
    if target_user.role != UserRole.sec_team:
        raise HTTPException(400, "Nur Security-Team-Mitglieder können als Reviewer zugewiesen werden")

    ra.assigned_to = body.user_id

    await log_action(
        db,
        current_user.id,
        "risk_acceptance_assigned",
        "risk_acceptance",
        str(ra.id),
        {"assigned_to": target_user.username},
    )

    # Notify the assigned reviewer
    await notif_svc.create_notification(
        db,
        body.user_id,
        notif_svc.NotificationType.risk_comment,
        f"Risikoakzeptanz zugewiesen: {ra.cve_id}",
        f"{current_user.username} hat Ihnen die Prüfung der Risikoakzeptanz für {ra.cve_id} zugewiesen.",
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
        raise HTTPException(404, "Nicht gefunden")
    if not current_user.is_sec_team and ra.created_by != current_user.id:
        raise HTTPException(403, "Nur der Ersteller kann die Risikoakzeptanz löschen")

    await log_action(db, current_user.id, "risk_acceptance_deleted", "risk_acceptance", str(ra.id))
    await db.delete(ra)
    await db.commit()


@router.post("/{ra_id}/comments", response_model=CommentResponse, status_code=201)
async def add_comment(
    ra_id: UUID,
    body: CommentCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> CommentResponse:
    result = await db.execute(
        select(RiskAcceptance).options(selectinload(RiskAcceptance.creator)).where(RiskAcceptance.id == ra_id)
    )
    ra = result.scalar_one_or_none()
    if not ra:
        raise HTTPException(404, "Nicht gefunden")
    if not _user_can_access_ra(current_user, ra):
        raise HTTPException(403, "Kein Zugriff")

    comment = RiskAcceptanceComment(
        risk_acceptance_id=ra_id,
        user_id=current_user.id,
        message=body.message,
    )
    db.add(comment)
    await db.flush()

    await notif_svc.notify_risk_comment(db, ra, comment, current_user)
    await notif_svc.notify_mentions(db, body.message, current_user, f"/risk-acceptances/{ra_id}#comment-{comment.id}")

    # Email to RA creator if sec team comments — use pre-loaded creator
    if current_user.is_sec_team and ra.creator and ra.creator.email:
        try:
            await mail_svc.send_risk_comment_email(
                ra.creator.email, ra.cve_id, str(ra.id), current_user.username, body.message
            )
        except Exception:
            logger.exception("Failed to send risk comment email for RA %s", ra.id)

    await db.commit()
    await db.refresh(comment)

    return CommentResponse(
        id=comment.id,
        risk_acceptance_id=comment.risk_acceptance_id,
        user_id=comment.user_id,
        username=current_user.username,
        message=comment.message,
        created_at=comment.created_at,
        is_sec_team=current_user.is_sec_team,
    )


@router.get("/{ra_id}/comments", response_model=list[CommentResponse])
async def list_comments(
    ra_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> list[CommentResponse]:
    result = await db.execute(select(RiskAcceptance).where(RiskAcceptance.id == ra_id))
    ra = result.scalar_one_or_none()
    if not ra:
        raise HTTPException(404, "Nicht gefunden")
    if not _user_can_access_ra(current_user, ra):
        raise HTTPException(403, "Kein Zugriff")

    comments_result = await db.execute(
        select(RiskAcceptanceComment)
        .where(RiskAcceptanceComment.risk_acceptance_id == ra_id)
        .order_by(RiskAcceptanceComment.created_at)
    )
    comments = comments_result.scalars().all()

    user_ids = list({c.user_id for c in comments})
    users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
    users = {u.id: u for u in users_result.scalars().all()}

    from ..models.user import UserRole

    return [
        CommentResponse(
            id=c.id,
            risk_acceptance_id=c.risk_acceptance_id,
            user_id=c.user_id,
            username=users[c.user_id].username if c.user_id in users else c.user_id,
            message=c.message,
            created_at=c.created_at,
            is_sec_team=users[c.user_id].role == UserRole.sec_team if c.user_id in users else False,
        )
        for c in comments
    ]
