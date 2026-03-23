from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

RemediationStatusType = Literal["open", "in_progress", "resolved", "verified", "wont_fix"]


class RemediationCreate(BaseModel):
    cve_id: str = Field(pattern=r"^CVE-\d{4}-\d+$")
    namespace: str = Field(min_length=1, max_length=255)
    cluster_name: str = Field(min_length=1, max_length=255)
    assigned_to: str | None = None
    target_date: date | None = None
    notes: str | None = Field(default=None, max_length=5000)


class RemediationUpdate(BaseModel):
    status: RemediationStatusType | None = None
    assigned_to: str | None = None
    target_date: date | None = None
    notes: str | None = Field(default=None, max_length=5000)
    wont_fix_reason: str | None = Field(default=None, max_length=2000)


class RemediationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    cve_id: str
    namespace: str
    cluster_name: str
    status: str
    assigned_to: str | None
    assigned_to_name: str | None = None
    created_by: str
    created_by_name: str
    resolved_by: str | None
    resolved_by_name: str | None = None
    target_date: date | None
    notes: str | None
    resolved_at: datetime | None
    verified_at: datetime | None
    created_at: datetime
    updated_at: datetime
    is_overdue: bool = False


class RemediationStats(BaseModel):
    open: int = 0
    in_progress: int = 0
    resolved: int = 0
    verified: int = 0
    wont_fix: int = 0
    overdue: int = 0
