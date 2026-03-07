"""Shared CVE list fetching and filtering logic used by cves.py and exports.py."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser
from ..models.cve_priority import CvePriority
from ..models.global_settings import GlobalSettings
from ..models.risk_acceptance import RiskAcceptance, RiskStatus
from ..routers._scope import narrow_namespaces
from ..schemas.cve import CveListItem, SeverityLevel
from ..stackrox import queries as sx


async def _get_settings(db: AsyncSession) -> GlobalSettings | None:
    r = await db.execute(select(GlobalSettings).limit(1))
    return r.scalar_one_or_none()


def _build_cve_item(
    c: dict,
    priorities: dict,
    acceptances: dict,
    component_map: dict[str, list[str]] | None = None,
) -> CveListItem:
    p = priorities.get(c["cve_id"])
    a = acceptances.get(c["cve_id"])
    return CveListItem(
        cve_id=c["cve_id"],
        severity=SeverityLevel(c.get("severity", 0)),
        cvss=float(c.get("cvss", 0)),
        epss_probability=float(c.get("epss_probability", 0)),
        impact_score=float(c.get("impact_score", 0)),
        fixable=bool(c.get("fixable", False)),
        fixed_by=c.get("fixed_by"),
        affected_images=int(c.get("affected_images", 0)),
        affected_deployments=int(c.get("affected_deployments", 0)),
        first_seen=c.get("first_seen"),
        published_on=c.get("published_on"),
        operating_system=c.get("operating_system"),
        component_names=sorted(set(component_map.get(c["cve_id"], []))) if component_map else [],
        has_priority=p is not None,
        priority_level=p.priority.value if p else None,
        priority_deadline=p.deadline if p else None,
        has_risk_acceptance=a is not None,
        risk_acceptance_status=a.status.value if a else None,
        risk_acceptance_id=str(a.id) if a else None,
    )


async def fetch_filtered_cves(
    current_user: CurrentUser,
    app_db: AsyncSession,
    sx_db: AsyncSession,
    *,
    search: str | None = None,
    severity: int | None = None,
    fixable: bool | None = None,
    prioritized_only: bool = False,
    sort_by: str = "severity",
    sort_desc: bool = True,
    cvss_min: float | None = None,
    epss_min: float | None = None,
    component: str | None = None,
    risk_status: str | None = None,
    cluster: str | None = None,
    namespace: str | None = None,
) -> list[CveListItem]:
    """Fetch, filter, and sort the full CVE list (pre-pagination).

    Returns the complete sorted list of CveListItem matching all filters.
    Used by both the paginated list endpoint and export endpoints.
    """
    settings = await _get_settings(app_db)
    if current_user.is_sec_team:
        min_cvss = 0.0
        min_epss = 0.0
    else:
        min_cvss = float(settings.min_cvss_score) if settings else 0.0
        min_epss = float(settings.min_epss_score) if settings else 0.0

    has_scope = cluster is not None or namespace is not None

    prio_result = await app_db.execute(select(CvePriority))
    priorities = {p.cve_id: p for p in prio_result.scalars().all()}

    ra_query = select(RiskAcceptance).where(
        RiskAcceptance.status.in_([RiskStatus.requested, RiskStatus.approved])
    )
    ra_result = await app_db.execute(ra_query)
    acceptances = {ra.cve_id: ra for ra in ra_result.scalars().all()}

    always_show = set(priorities.keys()) | set(acceptances.keys())

    ns_for_components: list[tuple[str, str]] = []
    if current_user.is_sec_team:
        if has_scope:
            all_ns = await sx.list_namespaces(sx_db)
            scoped_ns = narrow_namespaces(
                [(r["namespace"], r["cluster_name"]) for r in all_ns], cluster, namespace,
            )
            ns_for_components = scoped_ns
            cves = await sx.get_cves_for_namespaces(sx_db, scoped_ns, min_cvss, min_epss, always_show)
        else:
            all_ns = await sx.list_namespaces(sx_db)
            ns_for_components = [(r["namespace"], r["cluster_name"]) for r in all_ns]
            cves = await sx.get_all_cves(sx_db, min_cvss, min_epss, always_show)
    else:
        if not current_user.has_namespaces:
            return []
        ns_for_components = narrow_namespaces(current_user.namespaces, cluster, namespace)
        cves = await sx.get_cves_for_namespaces(sx_db, ns_for_components, min_cvss, min_epss, always_show)

    # Batch fetch component names for all CVEs
    cve_ids_all = [c["cve_id"] for c in cves]
    component_map = await sx.get_cve_component_map(sx_db, cve_ids_all, ns_for_components) if cve_ids_all else {}

    # Build items
    items = [_build_cve_item(c, priorities, acceptances, component_map) for c in cves]

    # Filter
    if search:
        s = search.lower()
        items = [i for i in items if s in i.cve_id.lower()]
    if severity is not None:
        items = [i for i in items if i.severity == severity]
    if fixable is not None:
        items = [i for i in items if i.fixable == fixable]
    if prioritized_only:
        items = [i for i in items if i.has_priority]
    if cvss_min is not None:
        items = [i for i in items if i.cvss >= cvss_min]
    if epss_min is not None:
        items = [i for i in items if i.epss_probability >= epss_min]
    if risk_status == "any":
        items = [i for i in items if i.has_risk_acceptance]
    elif risk_status in ("requested", "approved"):
        items = [i for i in items if i.risk_acceptance_status == risk_status]

    # Component filter
    if component and items:
        comp_lower = component.lower()
        cve_ids = [i.cve_id for i in items]
        if current_user.is_sec_team:
            all_ns = await sx.list_namespaces(sx_db)
            ns_list: list[tuple[str, str]] = [(r["namespace"], r["cluster_name"]) for r in all_ns]
        else:
            ns_list = current_user.namespaces
        comp_cve_map = await sx.get_cve_component_map(sx_db, cve_ids, ns_list)
        items = [i for i in items if any(comp_lower in c.lower() for c in comp_cve_map.get(i.cve_id, []))]

    # Sort
    sort_key_map = {
        "severity": lambda x: x.severity.value,
        "cvss": lambda x: x.cvss,
        "epss_probability": lambda x: x.epss_probability,
        "affected_deployments": lambda x: x.affected_deployments,
        "first_seen": lambda x: x.first_seen or "",
        "published_on": lambda x: x.published_on or "",
    }
    key_fn = sort_key_map.get(sort_by, lambda x: x.severity.value)
    items.sort(key=key_fn, reverse=sort_desc)
    # Always keep prioritized CVEs at the top
    items.sort(key=lambda x: 0 if x.has_priority else 1)

    return items
