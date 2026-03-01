import logging

from ..config import Settings
from ..models.user import UserRole

logger = logging.getLogger(__name__)


def resolve_role_from_groups(groups: list[str], settings: Settings) -> UserRole:
    """Resolve user role from Keycloak/OIDC groups.

    Returns sec_team if user belongs to settings.sec_team_group, otherwise team_member.
    """
    if settings.sec_team_group in groups:
        logger.info("User has sec_team group %r", settings.sec_team_group)
        return UserRole.sec_team
    return UserRole.team_member
