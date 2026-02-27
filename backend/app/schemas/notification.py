from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from ..models.notification import NotificationType


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    type: NotificationType
    title: str
    message: str
    link: str | None
    read: bool
    created_at: datetime


class UnreadCountResponse(BaseModel):
    count: int
