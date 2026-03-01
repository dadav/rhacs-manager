from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_stackrox_db
from ..stackrox import queries as sx

router = APIRouter(prefix="/namespaces", tags=["namespaces"])


@router.get("")
async def list_namespaces(
    current_user: CurrentUser = Depends(get_current_user),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> list[dict]:
    if current_user.is_sec_team:
        return await sx.list_namespaces(sx_db)

    return [
        {"namespace": ns, "cluster_name": cluster}
        for ns, cluster in current_user.namespaces
    ]
