from pydantic import BaseModel

from .cve import SeverityLevel


class FixRollupCve(BaseModel):
    cve_id: str
    severity: SeverityLevel
    cvss: float
    epss_probability: float
    fixable: bool
    # Highest comparable fix version for this CVE in this component.
    fixed_by: str | None
    # Every distinct fix version the scanner reported, highest first; values
    # that cannot be ordered as versions come last.
    fix_candidates: list[str]
    has_priority: bool


class FixRollupImage(BaseModel):
    image_id: str
    image_name: str


class FixRollupItem(BaseModel):
    """One installed component version and what upgrading it fixes."""

    component_name: str
    component_version: str
    operating_system: str
    # Highest comparable fix version across this component's fixable CVEs
    # (version-aware, not lexical). None if no CVE has a comparable fix version.
    target_version: str | None
    # All fix candidates, highest first; non-comparable values last.
    fix_versions: list[str]
    # True when some candidate cannot be ordered as a version, so target_version
    # may not fix every fixable CVE. Clients must show fix_versions then.
    target_uncertain: bool
    total_cves: int
    fixable_cves: int
    prioritized_cves: int
    critical_cves: int
    max_severity: SeverityLevel
    max_cvss: float
    max_epss: float
    affected_images: int
    affected_deployments: int
    namespaces: list[str]
    images: list[FixRollupImage]
    cves: list[FixRollupCve]


class FixRollupResponse(BaseModel):
    items: list[FixRollupItem]
    total: int
    page: int
    page_size: int
    # Visible CVEs (same set and filters as /cves) and how many of them have no
    # known component in the scanner data, so they cannot appear in any row.
    visible_cves: int
    unmapped_cves: int
