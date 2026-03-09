from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, tuple_
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db, get_stackrox_db
from ..models.escalation import Escalation
from ..models.global_settings import GlobalSettings
from ..services.escalation_preview import UpcomingEscalation, compute_upcoming_escalations
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
        query = query.where(
            tuple_(Escalation.namespace, Escalation.cluster_name).in_(scoped)
        )
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

    if current_user.can_see_all_namespaces:
        if cluster or namespace:
            from ..stackrox import queries as sx
            all_ns = await sx.list_namespaces(sx_db)
            namespaces = narrow_namespaces(
                [(r["namespace"], r["cluster_name"]) for r in all_ns], cluster, namespace,
            )
        else:
            namespaces = []  # empty = all for all-ns users
    else:
        if not current_user.has_namespaces:
            return []
        namespaces = narrow_namespaces(current_user.namespaces, cluster, namespace)

    return await compute_upcoming_escalations(sx_db, app_db, namespaces, settings)
