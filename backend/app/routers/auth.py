from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
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


class UserSearchResult(BaseModel):
    id: str
    username: str


@router.get("/users/search", response_model=list[UserSearchResult])
async def search_users(
    q: str = Query(default="", max_length=100),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> list[UserSearchResult]:
    stmt = select(User).order_by(User.username).limit(10)
    if q:
        stmt = stmt.where(User.username.ilike(f"{q}%"))
    result = await db.execute(stmt)
    return [UserSearchResult(id=u.id, username=u.username) for u in result.scalars().all()]


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
