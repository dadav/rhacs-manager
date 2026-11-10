from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, tuple_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db, get_stackrox_db
from ..i18n import ApiError
from ..models.remediation import Remediation, RemediationStatus
from ..schemas.remediation import (
    RemediationBatchCreate,
    RemediationCreate,
    RemediationResponse,
    RemediationStats,
    RemediationUpdate,
)
from ..services import remediation_service as rem_svc
from ..services.audit_service import log_action
from ._scope import narrow_namespaces

router = APIRouter(prefix="/remediations", tags=["remediations"])

# Shared selectinload options for list and single-item queries
_REM_LOAD_OPTIONS = [
    selectinload(Remediation.creator),
    selectinload(Remediation.assignee),
    selectinload(Remediation.resolver),
]


def _user_can_access(user: CurrentUser, r: Remediation) -> bool:
    if user.can_see_all_namespaces:
        return True
    return (r.namespace, r.cluster_name) in user.namespaces


def _build_response(r: Remediation) -> RemediationResponse:
    assignee_name = None
    if r.assigned_to:
        assignee_name = r.assignee.display_name if r.assignee else r.assigned_to

    resolver_name = None
    if r.resolved_by:
        resolver_name = r.resolver.display_name if r.resolver else r.resolved_by

    is_overdue = (
        r.target_date is not None
        and r.target_date < datetime.utcnow().date()
        and r.status in (RemediationStatus.open, RemediationStatus.in_progress)
    )

    return RemediationResponse(
        id=r.id,
        cve_id=r.cve_id,
        namespace=r.namespace,
        cluster_name=r.cluster_name,
        status=r.status.value,
        assigned_to=r.assigned_to,
        assigned_to_name=assignee_name,
        created_by=r.created_by,
        created_by_name=r.creator.display_name if r.creator else r.created_by,
        resolved_by=r.resolved_by,
        resolved_by_name=resolver_name,
        target_date=r.target_date,
        notes=r.notes,
        wont_fix_reason=r.wont_fix_reason,
        resolved_at=r.resolved_at,
        verified_at=r.verified_at,
        created_at=r.created_at,
        updated_at=r.updated_at,
        is_overdue=is_overdue,
        auto_resolved=r.status == RemediationStatus.resolved and r.resolved_at is not None and r.resolved_by is None,
    )


@router.post("", response_model=RemediationResponse, status_code=201)
async def create_remediation(
    body: RemediationCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> RemediationResponse:
    created = await rem_svc.create_remediations(
        db,
        sx_db,
        current_user,
        cve_id=body.cve_id,
        targets=[(body.namespace, body.cluster_name)],
        assigned_to=body.assigned_to,
        target_date=body.target_date,
        notes=body.notes,
    )
    await db.commit()
    remediation = created[0]
    await db.refresh(remediation, ["creator", "assignee", "resolver"])
    return _build_response(remediation)


@router.post("/batch", response_model=list[RemediationResponse], status_code=201)
async def create_remediations_batch(
    body: RemediationBatchCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> list[RemediationResponse]:
    """Create one remediation per target namespace of a CVE; rejects the whole batch on any invalid target."""
    created = await rem_svc.create_remediations(
        db,
        sx_db,
        current_user,
        cve_id=body.cve_id,
        targets=[(t.namespace, t.cluster_name) for t in body.targets],
        assigned_to=body.assigned_to,
        target_date=body.target_date,
        notes=body.notes,
    )
    await db.commit()
    for remediation in created:
        await db.refresh(remediation, ["creator", "assignee", "resolver"])
    return [_build_response(r) for r in created]


@router.get("", response_model=list[RemediationResponse])
async def list_remediations(
    status: str | None = Query(None),
    cve_id: str | None = Query(None),
    cluster: str | None = Query(None),
    namespace: str | None = Query(None),
    assigned_to: str | None = Query(None),
    overdue: bool | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> list[RemediationResponse]:
    query = select(Remediation).options(*_REM_LOAD_OPTIONS).order_by(Remediation.created_at.desc())

    # Namespace scoping
    if not current_user.can_see_all_namespaces:
        if not current_user.has_namespaces:
            return []
        scoped = narrow_namespaces(current_user.namespaces, cluster, namespace)
        query = query.where(tuple_(Remediation.namespace, Remediation.cluster_name).in_(scoped))
    else:
        if cluster:
            query = query.where(Remediation.cluster_name == cluster)
        if namespace:
            query = query.where(Remediation.namespace == namespace)

    if status:
        try:
            query = query.where(Remediation.status == RemediationStatus[status])
        except KeyError:
            raise ApiError(400, "invalid_status", status=status) from None

    if cve_id:
        query = query.where(Remediation.cve_id == cve_id)

    if assigned_to:
        query = query.where(Remediation.assigned_to == assigned_to)

    result = await db.execute(query)
    remediations = result.scalars().all()

    # Post-filter for overdue
    if overdue is True:
        today = datetime.utcnow().date()
        remediations = [
            r
            for r in remediations
            if r.target_date is not None
            and r.target_date < today
            and r.status in (RemediationStatus.open, RemediationStatus.in_progress)
        ]

    return [_build_response(r) for r in remediations]


@router.get("/stats", response_model=RemediationStats)
async def remediation_stats(
    cluster: str | None = Query(None),
    namespace: str | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> RemediationStats:
    base_query = select(Remediation)

    if not current_user.can_see_all_namespaces:
        if not current_user.has_namespaces:
            return RemediationStats()
        scoped = narrow_namespaces(current_user.namespaces, cluster, namespace)
        base_query = base_query.where(tuple_(Remediation.namespace, Remediation.cluster_name).in_(scoped))
    else:
        if cluster:
            base_query = base_query.where(Remediation.cluster_name == cluster)
        if namespace:
            base_query = base_query.where(Remediation.namespace == namespace)

    result = await db.execute(base_query)
    all_remediations = result.scalars().all()

    today = datetime.utcnow().date()
    stats = RemediationStats()
    for r in all_remediations:
        match r.status:
            case RemediationStatus.open:
                stats.open += 1
            case RemediationStatus.in_progress:
                stats.in_progress += 1
            case RemediationStatus.resolved:
                stats.resolved += 1
            case RemediationStatus.verified:
                stats.verified += 1
            case RemediationStatus.wont_fix:
                stats.wont_fix += 1
        if (
            r.target_date is not None
            and r.target_date < today
            and r.status in (RemediationStatus.open, RemediationStatus.in_progress)
        ):
            stats.overdue += 1

    return stats


@router.get("/{remediation_id}", response_model=RemediationResponse)
async def get_remediation(
    remediation_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> RemediationResponse:
    result = await db.execute(select(Remediation).options(*_REM_LOAD_OPTIONS).where(Remediation.id == remediation_id))
    r = result.scalar_one_or_none()
    if not r:
        raise ApiError(404, "not_found")
    if not _user_can_access(current_user, r):
        raise ApiError(403, "forbidden")
    return _build_response(r)


@router.patch("/{remediation_id}", response_model=RemediationResponse)
async def update_remediation(
    remediation_id: UUID,
    body: RemediationUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> RemediationResponse:
    result = await db.execute(select(Remediation).where(Remediation.id == remediation_id))
    r = result.scalar_one_or_none()
    if not r:
        raise ApiError(404, "not_found")
    if not _user_can_access(current_user, r):
        raise ApiError(403, "forbidden")

    await rem_svc.update_remediation(db, current_user, r, body)
    await db.commit()
    await db.refresh(r, ["creator", "assignee", "resolver"])
    return _build_response(r)


@router.delete("/{remediation_id}", status_code=204)
async def delete_remediation(
    remediation_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> None:
    """Only the creator or sec team can delete an open remediation."""
    result = await db.execute(select(Remediation).where(Remediation.id == remediation_id))
    r = result.scalar_one_or_none()
    if not r:
        raise ApiError(404, "not_found")

    if not current_user.is_sec_team and r.created_by != current_user.id:
        raise ApiError(403, "remediation_only_creator_or_sec_delete")

    if r.status not in (RemediationStatus.open, RemediationStatus.wont_fix):
        raise ApiError(400, "remediation_only_open_rejected_deletable")

    await log_action(db, current_user.id, "remediation_deleted", "remediation", str(r.id))
    await db.delete(r)
    await db.commit()
