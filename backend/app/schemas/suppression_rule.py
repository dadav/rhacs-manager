from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .risk_acceptance import RiskScopeTarget


class SuppressionScope(BaseModel):
    mode: Literal["all", "namespace"] = "all"
    targets: list[RiskScopeTarget] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_mode_targets(self) -> "SuppressionScope":
        if self.mode == "all" and self.targets:
            raise ValueError(
                "Für Scope-Modus 'all' dürfen keine Targets angegeben werden"
            )
        if self.mode == "namespace" and not self.targets:
            raise ValueError(
                "Für den Scope-Modus 'namespace' sind Targets erforderlich"
            )
        return self


class SuppressionRuleCreate(BaseModel):
    type: Literal["component", "cve"]
    component_name: str | None = Field(default=None, min_length=1, max_length=512)
    version_pattern: str | None = Field(default=None, min_length=1, max_length=255)
    cve_id: str | None = Field(default=None, pattern=r"^CVE-\d{4}-\d+$")
    reason: str = Field(min_length=10, max_length=5000)
    reference_url: str | None = Field(default=None, max_length=2048)
    scope: SuppressionScope | None = None

    @model_validator(mode="after")
    def validate_type_fields(self) -> "SuppressionRuleCreate":
        if self.type == "component":
            if not self.component_name:
                raise ValueError("component_name ist erforderlich für Typ 'component'")
            if self.scope is not None:
                raise ValueError("scope ist für Typ 'component' nicht erlaubt")
        elif self.type == "cve":
            if not self.cve_id:
                raise ValueError("cve_id ist erforderlich für Typ 'cve'")
            if self.component_name or self.version_pattern:
                raise ValueError(
                    "component_name und version_pattern sind für Typ 'cve' nicht erlaubt"
                )
            if self.scope is None:
                self.scope = SuppressionScope(mode="all", targets=[])
        return self


class SuppressionRuleUpdate(BaseModel):
    reason: str = Field(min_length=10, max_length=5000)
    reference_url: str | None = Field(default=None, max_length=2048)
    scope: SuppressionScope | None = None


class SuppressionRuleReview(BaseModel):
    approved: bool
    comment: str | None = Field(default=None, max_length=2000)


class SuppressionRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: str
    type: str
    component_name: str | None
    version_pattern: str | None
    cve_id: str | None
    reason: str
    reference_url: str | None
    review_comment: str | None
    created_at: datetime
    created_by: str
    created_by_name: str
    reviewed_by: str | None
    reviewed_by_name: str | None
    reviewed_at: datetime | None
    matched_cve_count: int = 0
    scope: SuppressionScope | None = None
