from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db
from ..models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
async def get_me(current_user: CurrentUser = Depends(get_current_user)) -> dict:
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role.value,
        "is_sec_team": current_user.is_sec_team,
        "has_all_namespaces": current_user.has_all_namespaces,
        "onboarding_completed": current_user.onboarding_completed,
        "namespaces": [{"namespace": ns, "cluster_name": cluster} for ns, cluster in current_user.namespaces],
    }


@router.patch("/onboarding")
async def complete_onboarding(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> dict:
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()
    user.onboarding_completed = True
    await db.commit()
    return {"ok": True}
