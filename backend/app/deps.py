from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from .auth.middleware import CurrentUser, get_current_user, require_sec_team
from .database import AppSessionLocal, StackRoxSessionLocal


async def get_app_db() -> AsyncGenerator[AsyncSession, None]:
    async with AppSessionLocal() as session:
        yield session


async def get_stackrox_db() -> AsyncGenerator[AsyncSession, None]:
    async with StackRoxSessionLocal() as session:
        yield session


# Re-export auth deps so routers only import from deps
__all__ = [
    "get_app_db",
    "get_stackrox_db",
    "get_current_user",
    "require_sec_team",
    "CurrentUser",
]
