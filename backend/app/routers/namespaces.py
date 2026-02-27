from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db, get_stackrox_db
from ..models.team import TeamNamespace
from ..stackrox import queries as sx

router = APIRouter(prefix="/namespaces", tags=["namespaces"])


@router.get("")
async def list_namespaces(
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> list[dict]:
    if current_user.is_sec_team:
        return await sx.list_namespaces(sx_db)

    if not current_user.team_id:
        return []

    result = await app_db.execute(
        select(TeamNamespace).where(TeamNamespace.team_id == current_user.team_id)
    )
    return [
        {"namespace": n.namespace, "cluster_name": n.cluster_name}
        for n in result.scalars().all()
    ]
