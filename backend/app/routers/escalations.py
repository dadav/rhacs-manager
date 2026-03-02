from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db
from ..models.escalation import Escalation
from ._scope import narrow_namespaces

router = APIRouter(prefix="/escalations", tags=["escalations"])


@router.get("")
async def list_escalations(
    cluster: str | None = Query(None),
    namespace: str | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> list[dict]:
    query = select(Escalation).order_by(Escalation.triggered_at.desc())
    if not current_user.is_sec_team:
        if not current_user.has_namespaces:
            return []
        scoped = narrow_namespaces(current_user.namespaces, cluster, namespace)
        ns_names = [ns for ns, _ in scoped]
        query = query.where(Escalation.namespace.in_(ns_names))
        if cluster:
            query = query.where(Escalation.cluster_name == cluster)
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
