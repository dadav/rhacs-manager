import contextlib

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db
from ..models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

# SQL display-name: trimmed full_name, falling back to username. Mirrors the
# User.display_name property so search/order behave like the rendered name.
_DISPLAY_NAME = func.coalesce(func.nullif(func.trim(User.full_name), ""), User.username)


@router.get("/me")
async def get_me(current_user: CurrentUser = Depends(get_current_user)) -> dict:
    return {
        "id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "display_name": current_user.display_name,
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
    full_name: str | None = None
    display_name: str


@router.get("/users/search", response_model=list[UserSearchResult])
async def search_users(
    q: str = Query(default="", max_length=100),
    role: str | None = Query(default=None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> list[UserSearchResult]:
    stmt = select(User)
    if q:
        pattern = f"{q}%"
        # Match either name case-insensitively; rank full-name prefixes first,
        # then username prefixes, then any other (substring) match.
        stmt = stmt.where(or_(User.username.ilike(f"%{q}%"), User.full_name.ilike(f"%{q}%")))
        rank = case(
            (User.full_name.ilike(pattern), 0),
            (User.username.ilike(pattern), 1),
            else_=2,
        )
        stmt = stmt.order_by(rank, _DISPLAY_NAME, User.id)
    else:
        stmt = stmt.order_by(_DISPLAY_NAME, User.id)
    if role:
        from ..models.user import UserRole

        with contextlib.suppress(KeyError):
            stmt = stmt.where(User.role == UserRole[role])
    stmt = stmt.limit(10)
    result = await db.execute(stmt)
    return [
        UserSearchResult(id=u.id, username=u.username, full_name=u.full_name, display_name=u.display_name)
        for u in result.scalars().all()
    ]


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
