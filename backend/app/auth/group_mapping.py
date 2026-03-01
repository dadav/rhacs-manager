import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import Settings
from ..models.team import Team
from ..models.user import UserRole

logger = logging.getLogger(__name__)


async def resolve_team_and_role(
    groups: list[str], settings: Settings, session: AsyncSession
) -> tuple[UUID | None, UserRole]:
    """Resolve Keycloak/OIDC groups to a team ID and user role.

    Returns (team_id, role) where:
    - role is sec_team if user belongs to settings.sec_team_group
    - team_id is looked up from DB via settings.group_team_mapping
    """
    role = UserRole.team_member
    if settings.sec_team_group in groups:
        role = UserRole.sec_team

    # Find first matching group → team mapping
    for group in groups:
        team_name = settings.group_team_mapping.get(group)
        if team_name is None:
            continue

        result = await session.execute(
            select(Team).where(Team.name == team_name)
        )
        team = result.scalar_one_or_none()
        if team is not None:
            logger.info(
                "Mapped group %r → team %r (id=%s)", group, team_name, team.id
            )
            return team.id, role

        logger.warning(
            "Group %r maps to team %r but team not found in DB", group, team_name
        )

    return None, role
