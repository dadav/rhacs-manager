import logging
import secrets
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


async def _sync_user_fields(session: AsyncSession, user: User, user_data: dict) -> User:
    """Update user fields if they differ from provided data. Commits and refreshes if changed."""
    updated = False
    if user.username != user_data["username"]:
        user.username = user_data["username"]
        updated = True
    if user.email != user_data["email"]:
        user.email = user_data["email"]
        updated = True
    desired_role = UserRole(user_data["role"])
    if user.role != desired_role:
        user.role = desired_role
        updated = True
    if "team_id" in user_data and user_data["team_id"] is not None:
        if user.team_id != user_data["team_id"]:
            user.team_id = user_data["team_id"]
            updated = True
    if updated:
        await session.commit()
        await session.refresh(user)
    return user


def _to_current_user(user: User) -> CurrentUser:
    return CurrentUser(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        team_id=user.team_id,
    )


async def _handle_dev_mode(session: AsyncSession) -> CurrentUser:
    team_id_override: UUID | None = None
    if settings.dev_user_team_id:
        try:
            team_id_override = UUID(settings.dev_user_team_id)
        except ValueError:
            pass

    user_data = {
        "id": settings.dev_user_id,
        "username": settings.dev_user_name,
        "email": settings.dev_user_email,
        "role": settings.dev_user_role,
        "team_id": team_id_override,
    }
    user = await _get_or_create_user(session, user_data)
    user = await _sync_user_fields(session, user, user_data)
    return _to_current_user(user)


async def _handle_spoke_proxy(session: AsyncSession, request: Request) -> CurrentUser:
    """Authenticate requests from spoke proxy via X-Api-Key + X-Forwarded-* headers."""
    from .group_mapping import resolve_team_and_role

    forwarded_user = request.headers.get("X-Forwarded-User", "")
    forwarded_email = request.headers.get("X-Forwarded-Email", "")
    forwarded_groups_raw = request.headers.get("X-Forwarded-Groups", "")

    if not forwarded_user:
        raise HTTPException(status_code=401, detail="X-Forwarded-User header fehlt")

    groups = [g.strip() for g in forwarded_groups_raw.split(",") if g.strip()]

    # Resolve team and role from groups
    team_id, role = await resolve_team_and_role(groups, settings, session)

    # Use spoke:<username> as user ID to avoid collisions across clusters
    user_id = f"spoke:{forwarded_user}"

    user_data = {
        "id": user_id,
        "username": forwarded_user,
        "email": forwarded_email or f"{forwarded_user}@spoke.local",
        "role": role.value,
        "team_id": team_id,
    }
    user = await _get_or_create_user(session, user_data)
    user = await _sync_user_fields(session, user, user_data)

    logger.info("Spoke proxy auth: user=%s, role=%s, team_id=%s", user_id, role.value, team_id)
    return _to_current_user(user)


async def _handle_oidc_jwt(session: AsyncSession, request: Request) -> CurrentUser:
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

        return _to_current_user(user)
    except Exception as e:
        logger.warning("Auth failed: %s", e)
        raise HTTPException(status_code=401, detail="Authentifizierung fehlgeschlagen")


def _validate_api_key(request: Request) -> bool:
    """Check if request has a valid spoke API key. Uses constant-time comparison."""
    api_key = request.headers.get("X-Api-Key")
    if not api_key or not settings.spoke_api_keys:
        return False
    return any(
        secrets.compare_digest(api_key, allowed_key)
        for allowed_key in settings.spoke_api_keys
    )


async def get_current_user(request: Request) -> CurrentUser:
    async with AppSessionLocal() as session:
        # 1. Dev mode (local development only)
        if settings.dev_mode:
            return await _handle_dev_mode(session)

        # 2. Spoke proxy mode (X-Api-Key + X-Forwarded-* headers)
        if _validate_api_key(request):
            return await _handle_spoke_proxy(session, request)

        # 3. Direct OIDC JWT (hub-local access)
        return await _handle_oidc_jwt(session, request)


def require_sec_team(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if not current_user.is_sec_team:
        raise HTTPException(status_code=403, detail="Nur für das Security-Team zugänglich")
    return current_user
