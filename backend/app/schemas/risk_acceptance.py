from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class RiskScopeTarget(BaseModel):
    cluster_name: str = Field(min_length=1, max_length=255)
    namespace: str = Field(min_length=1, max_length=255)
    image_name: str | None = Field(default=None, min_length=1, max_length=1024)
    deployment_id: str | None = Field(default=None, min_length=1, max_length=255)


class RiskScope(BaseModel):
    mode: Literal["all", "namespace", "image", "deployment"] = "all"
    targets: list[RiskScopeTarget] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_mode_targets(self) -> "RiskScope":
        if self.mode == "all" and self.targets:
            raise ValueError("Für Scope-Modus 'all' dürfen keine Targets angegeben werden")
        if self.mode != "all" and not self.targets:
            raise ValueError("Für den gewählten Scope-Modus sind Targets erforderlich")
        return self


class RiskAcceptanceCreate(BaseModel):
    cve_id: str = Field(pattern=r"^CVE-\d{4}-\d+$")
    justification: str = Field(min_length=10, max_length=5000)
    scope: RiskScope
    expires_at: datetime | None = None


class RiskAcceptanceUpdate(BaseModel):
    justification: str = Field(min_length=10, max_length=5000)
    scope: RiskScope
    expires_at: datetime | None = None


class RiskAcceptanceReview(BaseModel):
    approved: bool
    comment: str | None = Field(default=None, max_length=2000)


class RiskAcceptanceAssign(BaseModel):
    user_id: str = Field(min_length=1)


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
    status: str
    justification: str
    scope: RiskScope
    expires_at: datetime | None
    created_at: datetime
    created_by: str
    created_by_name: str
    reviewed_by: str | None
    reviewed_by_name: str | None
    reviewed_at: datetime | None
    assigned_to: str | None
    assigned_to_name: str | None
    comment_count: int = 0
