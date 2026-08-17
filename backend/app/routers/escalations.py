from typing import Literal
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, tuple_
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db, get_stackrox_db
from ..mail import service as mail_svc
from ..models.escalation import Escalation
from ..models.global_settings import GlobalSettings
from ..schemas.cve import CveCommentCreate, CveCommentResponse
from ..services.escalation_preview import UpcomingEscalation, compute_upcoming_escalations, filter_upcoming_escalations
from ..services.escalation_workspace import add_current_escalation_comment, search_active_workspace
from ._scope import narrow_namespaces

router = APIRouter(prefix="/escalations", tags=["escalations"])


async def _get_settings(db: AsyncSession) -> GlobalSettings | None:
    result = await db.execute(select(GlobalSettings).limit(1))
    return result.scalar_one_or_none()


@router.get("")
async def list_escalations(
    cluster: str | None = Query(None),
    namespace: str | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> list[dict]:
    query = select(Escalation).order_by(Escalation.triggered_at.desc())
    if not current_user.can_see_all_namespaces:
        if not current_user.has_namespaces:
            return []
        scoped = narrow_namespaces(current_user.namespaces, cluster, namespace)
        query = query.where(tuple_(Escalation.namespace, Escalation.cluster_name).in_(scoped))
    else:
        if cluster:
            query = query.where(Escalation.cluster_name == cluster)
        if namespace:
            query = query.where(Escalation.namespace == namespace)

    result = await db.execute(query)
    escalations = result.scalars().all()

    return [
        {
            "id": str(e.id),
            "cve_id": e.cve_id,
            "namespace": e.namespace,
            "cluster_name": e.cluster_name,
            "level": e.level,
            "triggered_at": e.triggered_at.isoformat(),
            "notified": e.notified,
        }
        for e in escalations
    ]


class ActiveEscalationRow(BaseModel):
    id: str
    cve_id: str
    namespace: str
    cluster_name: str
    level: int
    triggered_at: str
    notified: bool
    contacted: bool | None


class ContactCounts(BaseModel):
    needs_action: int
    contacted: int


class ActiveSearchResponse(BaseModel):
    items: list[ActiveEscalationRow]
    total: int
    page: int
    page_size: int
    contact_counts: ContactCounts | None


class UpcomingSearchResponse(BaseModel):
    items: list[UpcomingEscalation]
    total: int
    page: int
    page_size: int


@router.get("/active/search", response_model=ActiveSearchResponse)
async def search_active_escalations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    level: int | None = Query(None, ge=1, le=3),
    email_status: Literal["notified", "pending"] | None = Query(None),
    contact_status: Literal["needs_action", "contacted"] | None = Query(None),
    cluster: str | None = Query(None),
    namespace: str | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> ActiveSearchResponse:
    can_see_all = current_user.can_see_all_namespaces
    if not can_see_all and not current_user.has_namespaces:
        return ActiveSearchResponse(
            items=[],
            total=0,
            page=page,
            page_size=page_size,
            contact_counts=None,
        )

    namespaces = narrow_namespaces(current_user.namespaces, cluster, namespace) if not can_see_all else []

    rows, total, counts = await search_active_workspace(
        db,
        can_see_all=can_see_all,
        namespaces=namespaces,
        cluster=cluster,
        namespace=namespace,
        search=search,
        level=level,
        email_status=email_status,
        contact_status=contact_status if current_user.is_sec_team else None,
        page=page,
        page_size=page_size,
    )

    return ActiveSearchResponse(
        items=[
            ActiveEscalationRow(
                id=str(r.id),
                cve_id=r.cve_id,
                namespace=r.namespace,
                cluster_name=r.cluster_name,
                level=r.level,
                triggered_at=r.triggered_at.isoformat(),
                notified=r.notified,
                contacted=r.contacted if current_user.is_sec_team else None,
            )
            for r in rows
        ],
        total=total,
        page=page,
        page_size=page_size,
        contact_counts=ContactCounts(**counts) if current_user.is_sec_team else None,
    )


async def _upcoming_namespaces(
    current_user: CurrentUser,
    sx_db: AsyncSession,
    cluster: str | None,
    namespace: str | None,
) -> list[tuple[str, str]] | None:
    """Resolve namespace scope for upcoming escalations. None means 'no access'."""
    if current_user.can_see_all_namespaces:
        if cluster or namespace:
            from ..stackrox import queries as sx

            all_ns = await sx.list_namespaces(sx_db)
            return narrow_namespaces(
                [(r["namespace"], r["cluster_name"]) for r in all_ns],
                cluster,
                namespace,
            )
        return []  # empty = all for all-ns users
    if not current_user.has_namespaces:
        return None
    return narrow_namespaces(current_user.namespaces, cluster, namespace)


@router.get("/upcoming", response_model=list[UpcomingEscalation])
async def list_upcoming_escalations(
    cluster: str | None = Query(None),
    namespace: str | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> list[UpcomingEscalation]:
    settings = await _get_settings(app_db)
    if not settings:
        return []

    namespaces = await _upcoming_namespaces(current_user, sx_db, cluster, namespace)
    if namespaces is None:
        return []

    return await compute_upcoming_escalations(sx_db, app_db, namespaces, settings)


@router.get("/upcoming/search", response_model=UpcomingSearchResponse)
async def search_upcoming_escalations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    next_level: int | None = Query(None, ge=1, le=3),
    severity: int | None = Query(None, ge=0, le=4),
    days_max: int | None = Query(None, ge=1),
    cluster: str | None = Query(None),
    namespace: str | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> UpcomingSearchResponse:
    settings = await _get_settings(app_db)
    if not settings:
        return UpcomingSearchResponse(items=[], total=0, page=page, page_size=page_size)

    namespaces = await _upcoming_namespaces(current_user, sx_db, cluster, namespace)
    if namespaces is None:
        return UpcomingSearchResponse(items=[], total=0, page=page, page_size=page_size)

    items = await compute_upcoming_escalations(sx_db, app_db, namespaces, settings)

    paged, total = filter_upcoming_escalations(
        items,
        search=search,
        next_level=next_level,
        severity=severity,
        days_max=days_max,
        page=page,
        page_size=page_size,
    )
    return UpcomingSearchResponse(items=paged, total=total, page=page, page_size=page_size)


@router.post("/{escalation_id}/comments", response_model=CveCommentResponse, status_code=201)
async def add_escalation_comment(
    escalation_id: UUID,
    body: CveCommentCreate,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
) -> CveCommentResponse:
    response, email_jobs = await add_current_escalation_comment(
        app_db,
        current_user=current_user,
        escalation_id=escalation_id,
        message=body.message,
        content=body.content,
    )
    if email_jobs:
        background_tasks.add_task(mail_svc.send_mention_emails, email_jobs)
    return response
