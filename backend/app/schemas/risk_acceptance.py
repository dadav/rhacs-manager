from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RiskScope(BaseModel):
    images: list[str] = []
    namespaces: list[str] = []


class RiskAcceptanceCreate(BaseModel):
    cve_id: str = Field(pattern=r"^CVE-\d{4}-\d+$")
    justification: str = Field(min_length=10, max_length=5000)
    scope: RiskScope
    expires_at: datetime | None = None


class RiskAcceptanceReview(BaseModel):
    approved: bool
    comment: str | None = Field(default=None, max_length=2000)


class CommentCreate(BaseModel):
    message: str = Field(min_length=1, max_length=5000)


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    risk_acceptance_id: UUID
    user_id: str
    username: str
    message: str
    created_at: datetime
    is_sec_team: bool = False


class RiskAcceptanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    cve_id: str
    team_id: UUID
    team_name: str
    status: str
    justification: str
    scope: dict
    expires_at: datetime | None
    created_at: datetime
    created_by: str
    created_by_name: str
    reviewed_by: str | None
    reviewed_by_name: str | None
    reviewed_at: datetime | None
    comment_count: int = 0
