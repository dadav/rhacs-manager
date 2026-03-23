from datetime import date, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, tuple_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db, get_stackrox_db
from ..models.remediation import Remediation, RemediationStatus
from ..notifications import service as notif_svc
from ..schemas.remediation import (
    RemediationCreate,
    RemediationResponse,
    RemediationStats,
    RemediationUpdate,
)
from ..services.audit_service import log_action
from ..stackrox import queries as sx
from ._scope import narrow_namespaces

router = APIRouter(prefix="/remediations", tags=["remediations"])

# Valid status transitions
_TRANSITIONS: dict[RemediationStatus, set[RemediationStatus]] = {
    RemediationStatus.open: {RemediationStatus.in_progress, RemediationStatus.wont_fix},
    RemediationStatus.in_progress: {
        RemediationStatus.resolved,
        RemediationStatus.wont_fix,
        RemediationStatus.open,
    },
    RemediationStatus.resolved: {
        RemediationStatus.verified,
        RemediationStatus.in_progress,
    },
    RemediationStatus.verified: {RemediationStatus.in_progress},  # reopen
    RemediationStatus.wont_fix: {RemediationStatus.open},  # reopen
}

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
        assignee_name = r.assignee.username if r.assignee else r.assigned_to

    resolver_name = None
    if r.resolved_by:
        resolver_name = r.resolver.username if r.resolver else r.resolved_by

    is_overdue = (
        r.target_date is not None
        and r.target_date < date.today()
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
        created_by_name=r.creator.username if r.creator else r.created_by,
        resolved_by=r.resolved_by,
        resolved_by_name=resolver_name,
        target_date=r.target_date,
        notes=r.notes,
        resolved_at=r.resolved_at,
        verified_at=r.verified_at,
        created_at=r.created_at,
        updated_at=r.updated_at,
        is_overdue=is_overdue,
    )


@router.post("", response_model=RemediationResponse, status_code=201)
async def create_remediation(
    body: RemediationCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> RemediationResponse:
    # Verify user has access to the namespace
    if not current_user.can_see_all_namespaces and (body.namespace, body.cluster_name) not in current_user.namespaces:
        raise HTTPException(403, "Kein Zugriff auf diesen Namespace")

    # Verify the CVE exists in this namespace
    deployments = await sx.get_affected_deployments(
        sx_db,
        body.cve_id,
        [(body.namespace, body.cluster_name)],
    )
    if not deployments:
        raise HTTPException(404, "CVE in diesem Namespace nicht gefunden")

    # Check for existing remediation
    existing = await db.execute(
        select(Remediation).where(
            Remediation.cve_id == body.cve_id,
            Remediation.namespace == body.namespace,
            Remediation.cluster_name == body.cluster_name,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Für diese CVE existiert bereits eine Behebung in diesem Namespace")

    remediation = Remediation(
        cve_id=body.cve_id,
        namespace=body.namespace,
        cluster_name=body.cluster_name,
        status=RemediationStatus.open,
        assigned_to=body.assigned_to,
        created_by=current_user.id,
        target_date=body.target_date,
        notes=body.notes,
    )
    db.add(remediation)
    await db.flush()

    await log_action(
        db,
        current_user.id,
        "remediation_created",
        "remediation",
        str(remediation.id),
        {
            "cve_id": body.cve_id,
            "namespace": body.namespace,
            "cluster_name": body.cluster_name,
        },
    )

    # Notify sec team about new remediation
    await notif_svc.notify_remediation_created(db, remediation, current_user)

    await db.commit()
    await db.refresh(remediation, ["creator", "assignee", "resolver"])
    return _build_response(remediation)


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
            raise HTTPException(400, f"Ungültiger Status: {status}") from None

    if cve_id:
        query = query.where(Remediation.cve_id == cve_id)

    if assigned_to:
        query = query.where(Remediation.assigned_to == assigned_to)

    result = await db.execute(query)
    remediations = result.scalars().all()

    # Post-filter for overdue
    if overdue is True:
        today = date.today()
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

    today = date.today()
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
        raise HTTPException(404, "Nicht gefunden")
    if not _user_can_access(current_user, r):
        raise HTTPException(403, "Kein Zugriff")
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
        raise HTTPException(404, "Nicht gefunden")
    if not _user_can_access(current_user, r):
        raise HTTPException(403, "Kein Zugriff")

    details: dict = {}

    # Status transition
    if body.status is not None:
        new_status = RemediationStatus[body.status]

        # Only sec team can verify
        if new_status == RemediationStatus.verified and not current_user.is_sec_team:
            raise HTTPException(403, "Nur das Security-Team kann Behebungen verifizieren")

        allowed = _TRANSITIONS.get(r.status, set())
        if new_status not in allowed:
            raise HTTPException(
                400,
                f"Ungültiger Statusübergang: {r.status.value} → {new_status.value}",
            )

        # wont_fix requires a reason
        if new_status == RemediationStatus.wont_fix and not body.wont_fix_reason:
            raise HTTPException(400, "Für 'Wird nicht behoben' ist eine Begründung erforderlich")

        old_status = r.status.value
        r.status = new_status
        details["old_status"] = old_status
        details["new_status"] = new_status.value

        if new_status == RemediationStatus.resolved:
            r.resolved_at = datetime.utcnow()
            r.resolved_by = current_user.id
        elif new_status == RemediationStatus.verified:
            r.verified_at = datetime.utcnow()
        elif new_status in (RemediationStatus.open, RemediationStatus.in_progress):
            # Reopen: clear resolution/verification timestamps
            if old_status in ("resolved", "verified", "wont_fix"):
                r.resolved_at = None
                r.resolved_by = None
                r.verified_at = None

        if new_status == RemediationStatus.wont_fix and body.wont_fix_reason:
            r.notes = body.wont_fix_reason
            details["wont_fix_reason"] = body.wont_fix_reason

    if body.assigned_to is not None:
        r.assigned_to = body.assigned_to or None
        details["assigned_to"] = body.assigned_to

    if body.target_date is not None:
        r.target_date = body.target_date
        details["target_date"] = str(body.target_date)

    if body.notes is not None and body.status != "wont_fix":
        r.notes = body.notes

    await log_action(db, current_user.id, "remediation_updated", "remediation", str(r.id), details)

    # Send notifications for status changes
    if "new_status" in details:
        await notif_svc.notify_remediation_status_change(
            db,
            r,
            current_user,
            details["old_status"],
            details["new_status"],
        )

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
        raise HTTPException(404, "Nicht gefunden")

    if not current_user.is_sec_team and r.created_by != current_user.id:
        raise HTTPException(403, "Nur der Ersteller oder das Security-Team kann Behebungen löschen")

    if r.status not in (RemediationStatus.open, RemediationStatus.wont_fix):
        raise HTTPException(400, "Nur offene oder abgelehnte Behebungen können gelöscht werden")

    await log_action(db, current_user.id, "remediation_deleted", "remediation", str(r.id))
    await db.delete(r)
    await db.commit()
