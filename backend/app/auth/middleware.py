import logging
from uuid import UUID

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import AppSessionLocal
from ..models.user import User, UserRole

logger = logging.getLogger(__name__)


class CurrentUser:
    def __init__(self, id: str, username: str, email: str, role: UserRole, team_id: UUID | None):
        self.id = id
        self.username = username
        self.email = email
        self.role = role
        self.team_id = team_id

    @property
    def is_sec_team(self) -> bool:
        return self.role == UserRole.sec_team


async def _get_or_create_user(session: AsyncSession, user_data: dict) -> User:
    result = await session.execute(select(User).where(User.id == user_data["id"]))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            id=user_data["id"],
            username=user_data["username"],
            email=user_data["email"],
            role=UserRole(user_data["role"]),
            team_id=user_data.get("team_id"),
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        logger.info("Auto-created user %s", user.id)
    return user


async def get_current_user(request: Request) -> CurrentUser:
    async with AppSessionLocal() as session:
        if settings.dev_mode:
            team_id = None
            if settings.dev_user_team_id:
                try:
                    team_id = UUID(settings.dev_user_team_id)
                except ValueError:
                    pass

            user_data = {
                "id": settings.dev_user_id,
                "username": settings.dev_user_name,
                "email": settings.dev_user_email,
                "role": settings.dev_user_role,
                "team_id": team_id,
            }
            await _get_or_create_user(session, user_data)
            return CurrentUser(
                id=settings.dev_user_id,
                username=settings.dev_user_name,
                email=settings.dev_user_email,
                role=UserRole(settings.dev_user_role),
                team_id=team_id,
            )

        # Production: validate JWT from Authorization header
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Nicht authentifiziert")

        token = auth_header.removeprefix("Bearer ")
        try:
            from jose import jwt

            payload = jwt.decode(
                token,
                settings.secret_key,
                algorithms=["RS256"],
                audience=settings.oidc_client_id,
            )
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(status_code=401, detail="Ungültiges Token")

            result = await session.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user is None:
                raise HTTPException(status_code=401, detail="Benutzer nicht gefunden")

            return CurrentUser(
                id=user.id,
                username=user.username,
                email=user.email,
                role=user.role,
                team_id=user.team_id,
            )
        except Exception as e:
            logger.warning("Auth failed: %s", e)
            raise HTTPException(status_code=401, detail="Authentifizierung fehlgeschlagen")


def require_sec_team(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if not current_user.is_sec_team:
        raise HTTPException(status_code=403, detail="Nur für das Security-Team zugänglich")
    return current_user
