from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BadgeCreate(BaseModel):
    namespace: str | None = Field(default=None, max_length=255)
    cluster_name: str | None = Field(default=None, max_length=255)
    label: str = Field(default="CVEs", max_length=50)


class BadgeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_by: str
    namespace: str | None
    cluster_name: str | None
    token: str
    label: str
    created_at: datetime
    badge_url: str
