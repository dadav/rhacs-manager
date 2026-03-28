from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..auth.middleware import CurrentUser, get_current_user, require_sec_team
from ..deps import get_app_db, get_stackrox_db
from ..models.cve_priority import CvePriority
from ..notifications import service as notif_svc
from ..schemas.priority import PriorityCreate, PriorityResponse, PriorityUpdate
from ..services.audit_service import log_action

router = APIRouter(prefix="/priorities", tags=["priorities"])


def _build_response(p: CvePriority) -> PriorityResponse:
    return PriorityResponse(
        id=p.id,
        cve_id=p.cve_id,
        priority=p.priority,
        reason=p.reason,
        set_by=p.set_by,
        set_by_name=p.setter.username if p.setter else p.set_by,
        deadline=p.deadline,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


@router.get("", response_model=list[PriorityResponse])
async def list_priorities(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> list[PriorityResponse]:
    result = await db.execute(
        select(CvePriority).options(selectinload(CvePriority.setter)).order_by(CvePriority.created_at.desc())
    )
    return [_build_response(p) for p in result.scalars().all()]


@router.get("/{priority_id}", response_model=PriorityResponse)
async def get_priority(
    priority_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> PriorityResponse:
    result = await db.execute(
        select(CvePriority).options(selectinload(CvePriority.setter)).where(CvePriority.id == priority_id)
    )
    priority = result.scalar_one_or_none()
    if not priority:
        raise HTTPException(404, "Nicht gefunden")
    return _build_response(priority)


@router.post("", response_model=PriorityResponse, status_code=201)
async def create_priority(
    body: PriorityCreate,
    current_user: CurrentUser = Depends(require_sec_team),
    db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> PriorityResponse:
    existing = await db.execute(select(CvePriority).where(CvePriority.cve_id == body.cve_id))
    if existing.scalar_one_or_none():
        raise HTTPException(409, f"{body.cve_id} ist bereits priorisiert")

    priority = CvePriority(
        cve_id=body.cve_id,
        priority=body.priority,
        reason=body.reason,
        set_by=current_user.id,
        deadline=body.deadline,
    )
    db.add(priority)
    await db.flush()

    # Notify sec team about new priority
    await notif_svc.notify_new_priority(db, body.cve_id, body.priority.value)

    await log_action(db, current_user.id, "priority_created", "cve_priority", str(priority.id))
    await db.commit()
    await db.refresh(priority, ["setter"])
    return _build_response(priority)


@router.patch("/{priority_id}", response_model=PriorityResponse)
async def update_priority(
    priority_id: UUID,
    body: PriorityUpdate,
    current_user: CurrentUser = Depends(require_sec_team),
    db: AsyncSession = Depends(get_app_db),
) -> PriorityResponse:
    result = await db.execute(select(CvePriority).where(CvePriority.id == priority_id))
    priority = result.scalar_one_or_none()
    if not priority:
        raise HTTPException(404, "Nicht gefunden")

    if body.priority is not None:
        priority.priority = body.priority
    if body.reason is not None:
        priority.reason = body.reason
    if body.deadline is not None:
        priority.deadline = body.deadline
    priority.updated_at = datetime.utcnow()

    await log_action(db, current_user.id, "priority_updated", "cve_priority", str(priority.id))
    await db.commit()
    await db.refresh(priority, ["setter"])
    return _build_response(priority)


@router.delete("/{priority_id}", status_code=204)
async def delete_priority(
    priority_id: UUID,
    current_user: CurrentUser = Depends(require_sec_team),
    db: AsyncSession = Depends(get_app_db),
) -> None:
    result = await db.execute(select(CvePriority).where(CvePriority.id == priority_id))
    priority = result.scalar_one_or_none()
    if not priority:
        raise HTTPException(404, "Nicht gefunden")

    await log_action(db, current_user.id, "priority_deleted", "cve_priority", str(priority.id))
    await db.delete(priority)
    await db.commit()
