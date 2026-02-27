from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db
from ..models.risk_acceptance import RiskAcceptance, RiskAcceptanceComment, RiskStatus
from ..models.team import Team
from ..models.user import User
from ..notifications import service as notif_svc
from ..mail import service as mail_svc
from ..schemas.risk_acceptance import (
    CommentCreate,
    CommentResponse,
    RiskAcceptanceCreate,
    RiskAcceptanceResponse,
    RiskAcceptanceReview,
)
from ..services.audit_service import log_action

router = APIRouter(prefix="/risk-acceptances", tags=["risk-acceptances"])


async def _build_response(ra: RiskAcceptance, db: AsyncSession) -> RiskAcceptanceResponse:
    team_result = await db.execute(select(Team).where(Team.id == ra.team_id))
    team = team_result.scalar_one_or_none()

    creator_result = await db.execute(select(User).where(User.id == ra.created_by))
    creator = creator_result.scalar_one_or_none()

    reviewer = None
    if ra.reviewed_by:
        rev_result = await db.execute(select(User).where(User.id == ra.reviewed_by))
        reviewer = rev_result.scalar_one_or_none()

    comment_count_result = await db.execute(
        select(func.count(RiskAcceptanceComment.id)).where(
            RiskAcceptanceComment.risk_acceptance_id == ra.id
        )
    )
    comment_count = comment_count_result.scalar() or 0

    return RiskAcceptanceResponse(
        id=ra.id,
        cve_id=ra.cve_id,
        team_id=ra.team_id,
        team_name=team.name if team else "",
        status=ra.status.value,
        justification=ra.justification,
        scope=ra.scope,
        expires_at=ra.expires_at,
        created_at=ra.created_at,
        created_by=ra.created_by,
        created_by_name=creator.username if creator else ra.created_by,
        reviewed_by=ra.reviewed_by,
        reviewed_by_name=reviewer.username if reviewer else None,
        reviewed_at=ra.reviewed_at,
        comment_count=comment_count,
    )


@router.post("", response_model=RiskAcceptanceResponse, status_code=201)
async def create_risk_acceptance(
    body: RiskAcceptanceCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> RiskAcceptanceResponse:
    if not current_user.team_id and not current_user.is_sec_team:
        raise HTTPException(400, "Kein Team zugeordnet")

    team_id = current_user.team_id
    if current_user.is_sec_team:
        raise HTTPException(403, "Security-Team kann keine Risikoakzeptanzen beantragen")

    # Check for existing active acceptance
    existing = await db.execute(
        select(RiskAcceptance).where(
            RiskAcceptance.cve_id == body.cve_id,
            RiskAcceptance.team_id == team_id,
            RiskAcceptance.status.in_([RiskStatus.requested, RiskStatus.approved]),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Für diese CVE existiert bereits eine aktive Risikoakzeptanz")

    ra = RiskAcceptance(
        cve_id=body.cve_id,
        team_id=team_id,
        status=RiskStatus.requested,
        justification=body.justification,
        scope=body.scope.model_dump(),
        expires_at=body.expires_at,
        created_by=current_user.id,
    )
    db.add(ra)
    await db.flush()

    await log_action(db, current_user.id, "risk_acceptance_created", "risk_acceptance", str(ra.id))
    await db.commit()
    await db.refresh(ra)
    return await _build_response(ra, db)


@router.get("", response_model=list[RiskAcceptanceResponse])
async def list_risk_acceptances(
    status: str | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> list[RiskAcceptanceResponse]:
    query = select(RiskAcceptance).order_by(RiskAcceptance.created_at.desc())

    if not current_user.is_sec_team:
        if not current_user.team_id:
            return []
        query = query.where(RiskAcceptance.team_id == current_user.team_id)

    if status:
        try:
            query = query.where(RiskAcceptance.status == RiskStatus[status])
        except KeyError:
            raise HTTPException(400, f"Ungültiger Status: {status}")

    result = await db.execute(query)
    return [await _build_response(ra, db) for ra in result.scalars().all()]


@router.get("/{ra_id}", response_model=RiskAcceptanceResponse)
async def get_risk_acceptance(
    ra_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> RiskAcceptanceResponse:
    result = await db.execute(select(RiskAcceptance).where(RiskAcceptance.id == ra_id))
    ra = result.scalar_one_or_none()
    if not ra:
        raise HTTPException(404, "Nicht gefunden")
    if not current_user.is_sec_team and ra.team_id != current_user.team_id:
        raise HTTPException(403, "Kein Zugriff")
    return await _build_response(ra, db)


@router.patch("/{ra_id}", response_model=RiskAcceptanceResponse)
async def review_risk_acceptance(
    ra_id: UUID,
    body: RiskAcceptanceReview,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> RiskAcceptanceResponse:
    if not current_user.is_sec_team:
        raise HTTPException(403, "Nur das Security-Team kann Risikoakzeptanzen bearbeiten")

    result = await db.execute(select(RiskAcceptance).where(RiskAcceptance.id == ra_id))
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
        db, current_user.id,
        "risk_acceptance_reviewed", "risk_acceptance", str(ra.id),
        {"status": ra.status.value},
    )

    await notif_svc.notify_risk_status_change(db, ra, current_user)

    # Email to team
    team_result = await db.execute(select(Team).where(Team.id == ra.team_id))
    team = team_result.scalar_one_or_none()
    if team and team.email:
        reviewer_result = await db.execute(select(User).where(User.id == current_user.id))
        reviewer = reviewer_result.scalar_one_or_none()
        await mail_svc.send_risk_status_email(
            team.email, ra.cve_id, str(ra.id), ra.status.value,
            reviewer.username if reviewer else current_user.id, body.comment,
        )

    await db.commit()
    await db.refresh(ra)
    return await _build_response(ra, db)


@router.post("/{ra_id}/comments", response_model=CommentResponse, status_code=201)
async def add_comment(
    ra_id: UUID,
    body: CommentCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> CommentResponse:
    result = await db.execute(select(RiskAcceptance).where(RiskAcceptance.id == ra_id))
    ra = result.scalar_one_or_none()
    if not ra:
        raise HTTPException(404, "Nicht gefunden")
    if not current_user.is_sec_team and ra.team_id != current_user.team_id:
        raise HTTPException(403, "Kein Zugriff")

    comment = RiskAcceptanceComment(
        risk_acceptance_id=ra_id,
        user_id=current_user.id,
        message=body.message,
    )
    db.add(comment)
    await db.flush()

    await notif_svc.notify_risk_comment(db, ra, comment, current_user)

    # Email
    if current_user.is_sec_team:
        team_result = await db.execute(select(Team).where(Team.id == ra.team_id))
        team = team_result.scalar_one_or_none()
        if team and team.email:
            await mail_svc.send_risk_comment_email(
                team.email, ra.cve_id, str(ra.id), current_user.username, body.message
            )

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
    if not current_user.is_sec_team and ra.team_id != current_user.team_id:
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
