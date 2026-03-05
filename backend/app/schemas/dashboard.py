from pydantic import BaseModel

from .cve import CveListItem, SeverityLevel


class SeverityCount(BaseModel):
    severity: SeverityLevel
    count: int


class NamespaceCveCount(BaseModel):
    namespace: str
    count: int


class CveTrendPoint(BaseModel):
    date: str  # YYYY-MM-DD
    count: int


class EpssMatrixPoint(BaseModel):
    cve_id: str
    cvss: float
    epss: float
    severity: SeverityLevel


class ClusterHeatmapRow(BaseModel):
    cluster: str
    unknown: int
    low: int
    moderate: int
    important: int
    critical: int
    total: int


class AgingBucket(BaseModel):
    bucket: str  # "0-7 Tage", "8-30 Tage", etc.
    count: int


class ComponentCveCount(BaseModel):
    component_name: str
    cve_count: int


class RiskAcceptancePipeline(BaseModel):
    requested: int
    approved: int
    rejected: int
    expired: int


class ThresholdPreview(BaseModel):
    total_cves: int
    visible_cves: int
    hidden_cves: int


class DashboardData(BaseModel):
    stat_total_cves: int
    stat_escalations: int
    stat_upcoming_escalations: int
    stat_fixable_critical_cves: int
    stat_open_risk_acceptances: int
    severity_distribution: list[SeverityCount]
    cves_per_namespace: list[NamespaceCveCount]
    priority_cves: list[CveListItem]
    high_epss_cves: list[CveListItem]  # top 5 by EPSS
    cve_trend: list[CveTrendPoint]
    epss_matrix: list[EpssMatrixPoint]
    cluster_heatmap: list[ClusterHeatmapRow]
    aging_distribution: list[AgingBucket]
    top_vulnerable_components: list[ComponentCveCount]
    risk_acceptance_pipeline: RiskAcceptancePipeline
