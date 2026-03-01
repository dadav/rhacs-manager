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


class TeamDashboardData(BaseModel):
    stat_total_cves: int
    stat_escalations: int
    stat_fixable_critical_cves: int
    stat_open_risk_acceptances: int
    severity_distribution: list[SeverityCount]
    cves_per_namespace: list[NamespaceCveCount]
    priority_cves: list[CveListItem]
    high_epss_cves: list[CveListItem]  # top 5 by EPSS
    cve_trend: list[CveTrendPoint]


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


class RiskAcceptancePipeline(BaseModel):
    requested: int
    approved: int
    rejected: int
    expired: int


class ThresholdPreview(BaseModel):
    total_cves: int
    visible_cves: int
    hidden_cves: int


class SecDashboardData(BaseModel):
    epss_matrix: list[EpssMatrixPoint]
    cluster_heatmap: list[ClusterHeatmapRow]
    aging_distribution: list[AgingBucket]
    risk_acceptance_pipeline: RiskAcceptancePipeline
    total_cves: int
    total_critical: int
    avg_epss: float
    cves_last_7_days: int
    threshold_preview: ThresholdPreview
