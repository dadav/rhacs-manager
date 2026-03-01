from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db
from ..models.escalation import Escalation

router = APIRouter(prefix="/escalations", tags=["escalations"])


@router.get("")
async def list_escalations(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> list[dict]:
    query = select(Escalation).order_by(Escalation.triggered_at.desc())
    if not current_user.is_sec_team:
        if not current_user.has_namespaces:
            return []
        ns_names = [ns for ns, _ in current_user.namespaces]
        query = query.where(Escalation.namespace.in_(ns_names))

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
