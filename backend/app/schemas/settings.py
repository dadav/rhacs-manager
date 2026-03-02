from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class EscalationRule(BaseModel):
    severity_min: int = Field(ge=0, le=4)  # SeverityLevel int
    epss_threshold: float = Field(ge=0.0, le=1.0)
    days_to_level1: int = Field(ge=1)
    days_to_level2: int = Field(ge=1)
    days_to_level3: int = Field(ge=1)


class SettingsUpdate(BaseModel):
    min_cvss_score: float = Field(ge=0.0, le=10.0)
    min_epss_score: float = Field(ge=0.0, le=1.0)
    escalation_rules: list[EscalationRule]
    escalation_warning_days: int = Field(ge=1, le=14, default=3)
    digest_day: int = Field(ge=0, le=6)
    management_email: str = ""


class SettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    min_cvss_score: float
    min_epss_score: float
    escalation_rules: list[dict]
    escalation_warning_days: int
    digest_day: int
    management_email: str
    updated_by: str | None
    updated_at: datetime


class ThresholdPreviewResponse(BaseModel):
    total_cves: int
    visible_cves: int
    hidden_cves: int
