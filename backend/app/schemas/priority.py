from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from ..models.cve_priority import PriorityLevel


class PriorityCreate(BaseModel):
    cve_id: str = Field(pattern=r"^CVE-\d{4}-\d+$")
    priority: PriorityLevel
    reason: str = Field(min_length=5, max_length=2000)
    deadline: datetime | None = None


class PriorityUpdate(BaseModel):
    priority: PriorityLevel | None = None
    reason: str | None = Field(default=None, min_length=5, max_length=2000)
    deadline: datetime | None = None


class PriorityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    cve_id: str
    priority: PriorityLevel
    reason: str
    set_by: str
    set_by_name: str
    deadline: datetime | None
    created_at: datetime
    updated_at: datetime
