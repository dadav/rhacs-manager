import enum
from datetime import datetime

from pydantic import BaseModel, ConfigDict


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
    operating_system: str | None = None
    has_priority: bool = False
    priority_level: str | None = None
    priority_deadline: datetime | None = None
    has_risk_acceptance: bool = False
    risk_acceptance_status: str | None = None
    risk_acceptance_id: str | None = None


class CveDetail(CveListItem):
    affected_deployments_list: list[AffectedDeployment] = []
    components: list[AffectedComponent] = []


class CveListParams(BaseModel):
    page: int = 1
    page_size: int = 50
    search: str | None = None
    severity: SeverityLevel | None = None
    fixable: bool | None = None
    prioritized_only: bool = False
    sort_by: str = "severity"
    sort_desc: bool = True
