import enum
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SeverityLevel(int, enum.Enum):
    UNKNOWN = 0
    LOW = 1
    MODERATE = 2
    IMPORTANT = 3
    CRITICAL = 4


class AffectedDeployment(BaseModel):
    deployment_id: str
    deployment_name: str
    namespace: str
    cluster_name: str
    image_name: str


class AffectedComponent(BaseModel):
    component_name: str
    component_version: str
    fixable: bool
    fixed_by: str | None


class CveListItem(BaseModel):
    cve_id: str
    severity: SeverityLevel
    cvss: float
    epss_probability: float
    impact_score: float
    fixable: bool
    fixed_by: str | None
    affected_images: int
    affected_deployments: int
    first_seen: datetime | None
    published_on: datetime | None = None
    operating_system: str | None = None
    has_priority: bool = False
    priority_level: str | None = None
    priority_deadline: datetime | None = None
    component_names: list[str] = []
    has_risk_acceptance: bool = False
    risk_acceptance_status: str | None = None
    risk_acceptance_id: str | None = None


class CveDetail(CveListItem):
    affected_deployments_list: list[AffectedDeployment] = []
    components: list[AffectedComponent] = []
    contact_emails: list[str] = Field(default_factory=list)
    priority_reason: str | None = None
    priority_set_by_name: str | None = None
    priority_created_at: datetime | None = None
    risk_acceptance_requested_at: datetime | None = None
    risk_acceptance_reviewed_at: datetime | None = None
    escalation_level1_at: datetime | None = None
    escalation_level2_at: datetime | None = None
    escalation_level3_at: datetime | None = None
    escalation_level1_expected: datetime | None = None
    escalation_level2_expected: datetime | None = None
    escalation_level3_expected: datetime | None = None


class ImageCveGroup(BaseModel):
    image_name: str
    image_id: str
    total_cves: int
    critical_cves: int
    high_cves: int
    medium_cves: int
    low_cves: int
    max_cvss: float
    max_epss: float
    fixable_cves: int
    affected_deployments: int
    namespaces: list[str]
    clusters: list[str]


class ImageCveDetail(BaseModel):
    """CVEs for a specific image — lighter than full CveListItem."""
    cve_id: str
    severity: SeverityLevel
    cvss: float
    epss_probability: float
    impact_score: float
    fixable: bool
    fixed_by: str | None
    affected_deployments: int
    first_seen: datetime | None
    published_on: datetime | None = None


class CveListParams(BaseModel):
    page: int = 1
    page_size: int = 50
    search: str | None = None
    severity: SeverityLevel | None = None
    fixable: bool | None = None
    prioritized_only: bool = False
    sort_by: str = "severity"
    sort_desc: bool = True


class CveCommentCreate(BaseModel):
    message: str = Field(min_length=1, max_length=5000)


class CveCommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    cve_id: str
    user_id: str
    username: str
    message: str
    created_at: datetime
    is_sec_team: bool = False
