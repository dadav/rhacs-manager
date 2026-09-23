from pydantic import BaseModel


class NotificationPreferenceItem(BaseModel):
    """One category. ``None`` for a channel means it does not exist for that category."""

    category: str
    in_app: bool | None
    email: bool | None


class NotificationPreferencesResponse(BaseModel):
    items: list[NotificationPreferenceItem]
    # Whether the user has a namespace snapshot recent enough for team
    # notifications (digest, team CVE alerts). False until the next sign-in.
    team_notifications_active: bool


class NotificationPreferencesUpdate(BaseModel):
    items: list[NotificationPreferenceItem]
