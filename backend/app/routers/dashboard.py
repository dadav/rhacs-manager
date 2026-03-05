from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db, get_stackrox_db
from ..models.cve_priority import CvePriority
from ..models.escalation import Escalation
from ..models.global_settings import GlobalSettings
from ..models.risk_acceptance import RiskAcceptance, RiskStatus
from ._scope import narrow_namespaces
from ..schemas.dashboard import (
    AgingBucket,
    ClusterHeatmapRow,
    ComponentCveCount,
    CveTrendPoint,
    EpssMatrixPoint,
    NamespaceCveCount,
    RiskAcceptancePipeline,
    SeverityCount,
    DashboardData,
)
from ..schemas.cve import CveListItem, SeverityLevel
from ..services.escalation_preview import compute_upcoming_escalations
from ..stackrox import queries as sx

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


async def _get_settings(session: AsyncSession) -> GlobalSettings | None:
    result = await session.execute(select(GlobalSettings).limit(1))
    return result.scalar_one_or_none()


def _enrich_cves(
    cves: list[dict],
    priorities: dict,
    acceptances: dict,
    component_map: dict[str, list[str]] | None = None,
) -> list[CveListItem]:
    items = []
    for c in cves:
        p = priorities.get(c["cve_id"])
        a = acceptances.get(c["cve_id"])
        items.append(
            CveListItem(
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
                has_priority=p is not None,
                priority_level=p.priority.value if p else None,
                priority_deadline=p.deadline if p else None,
                has_risk_acceptance=a is not None,
                risk_acceptance_status=a.status.value if a else None,
                risk_acceptance_id=str(a.id) if a else None,
            )
        )
    return items


@router.get("", response_model=DashboardData)
async def dashboard(
    cluster: str | None = Query(None),
    namespace: str | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> DashboardData:
    settings = await _get_settings(app_db)
    min_cvss = float(settings.min_cvss_score) if settings else 0.0
    min_epss = float(settings.min_epss_score) if settings else 0.0

    has_scope = cluster is not None or namespace is not None

    if current_user.is_sec_team:
        if has_scope:
            all_ns = await sx.list_namespaces(sx_db)
            namespaces: list[tuple[str, str]] = narrow_namespaces(
                [(r["namespace"], r["cluster_name"]) for r in all_ns], cluster, namespace,
            )
        else:
            namespaces = []  # empty = all for sec team
    else:
        if not current_user.has_namespaces:
            return DashboardData(
                stat_total_cves=0,
                stat_escalations=0,
                stat_upcoming_escalations=0,
                stat_fixable_critical_cves=0,
                stat_open_risk_acceptances=0,
                severity_distribution=[], cves_per_namespace=[], priority_cves=[],
                high_epss_cves=[], cve_trend=[],
                epss_matrix=[], cluster_heatmap=[], aging_distribution=[],
                top_vulnerable_components=[],
                risk_acceptance_pipeline=RiskAcceptancePipeline(requested=0, approved=0, rejected=0, expired=0),
            )
        namespaces = narrow_namespaces(current_user.namespaces, cluster, namespace)

    # Get prioritized CVEs (always shown)
    prio_result = await app_db.execute(select(CvePriority))
    priorities = {p.cve_id: p for p in prio_result.scalars().all()}

    # Get active risk acceptances
    ra_query = select(RiskAcceptance).where(
        RiskAcceptance.status.in_([RiskStatus.requested, RiskStatus.approved])
    )
    ra_result = await app_db.execute(ra_query)
    acceptances = {ra.cve_id: ra for ra in ra_result.scalars().all()}

    always_show = set(priorities.keys()) | set(acceptances.keys())

    if current_user.is_sec_team and not has_scope:
        cves = await sx.get_all_cves(sx_db, min_cvss, min_epss, always_show)
        ns_list_for_queries = None
    else:
        cves = await sx.get_cves_for_namespaces(sx_db, namespaces, min_cvss, min_epss, always_show)
        ns_list_for_queries = namespaces

    enriched = _enrich_cves(cves, priorities, acceptances)

    # Stat cards
    total = len(cves)
    fixable_critical = sum(
        1 for c in cves if c.get("severity") == 4 and c.get("fixable")
    )

    # Escalation count: filter by scope-narrowed namespaces
    if current_user.is_sec_team and not has_scope:
        escalations_result = await app_db.execute(
            select(func.count(Escalation.id))
        )
    else:
        esc_ns = namespaces if has_scope or not current_user.is_sec_team else []
        if esc_ns:
            ns_pairs_esc = [(ns, cl) for ns, cl in esc_ns]
            esc_query = select(func.count(Escalation.id)).where(
                Escalation.namespace.in_([ns for ns, _ in ns_pairs_esc])
            )
            if cluster:
                esc_query = esc_query.where(Escalation.cluster_name == cluster)
            escalations_result = await app_db.execute(esc_query)
        else:
            escalations_result = await app_db.execute(
                select(func.count(Escalation.id))
            )
    escalations = escalations_result.scalar() or 0

    open_ra_result = await app_db.execute(
        select(func.count(RiskAcceptance.id)).where(
            RiskAcceptance.status == RiskStatus.requested,
        )
    )
    open_ra = open_ra_result.scalar() or 0

    # Charts
    sev_dist = await sx.get_severity_distribution(
        sx_db,
        ns_list_for_queries,
        min_cvss=min_cvss,
        min_epss=min_epss,
        always_show_cve_ids=always_show,
    )
    ns_counts = await sx.get_cves_per_namespace(
        sx_db,
        ns_list_for_queries,
        min_cvss=min_cvss,
        min_epss=min_epss,
        always_show_cve_ids=always_show,
    )
    trend = await sx.get_cve_trend(
        sx_db, ns_list_for_queries,
        min_cvss=min_cvss, min_epss=min_epss, always_show_cve_ids=always_show,
    )

    # Upcoming escalation count
    upcoming_escalations = []
    if settings:
        upcoming_ns = namespaces if (has_scope or not current_user.is_sec_team) else []
        upcoming_escalations = await compute_upcoming_escalations(sx_db, app_db, upcoming_ns, settings)

    # Deduplicate by cve_id (same CVE can appear across multiple images).
    # Keep the entry with the highest epss_probability for each unique CVE.
    seen_cve_ids: dict[str, CveListItem] = {}
    for item in enriched:
        if item.cve_id not in seen_cve_ids or item.epss_probability > seen_cve_ids[item.cve_id].epss_probability:
            seen_cve_ids[item.cve_id] = item
    unique_items = list(seen_cve_ids.values())
    top_epss = sorted(unique_items, key=lambda x: x.epss_probability, reverse=True)[:5]
    top_priorities = sorted(
        (item for item in unique_items if item.has_priority and not item.has_risk_acceptance),
        key=lambda x: (
            x.priority_deadline is None,
            x.priority_deadline or x.first_seen or datetime.max,
            -x.severity.value,
            -x.epss_probability,
        ),
    )[:8]

    # Charts: EPSS matrix, cluster heatmap, aging, RA pipeline (scoped by namespace)
    matrix_rows = await sx.get_epss_risk_matrix(
        sx_db, ns_list_for_queries,
        min_cvss=min_cvss, min_epss=min_epss, always_show_cve_ids=always_show,
    )
    epss_matrix = [
        EpssMatrixPoint(
            cve_id=r["cve_id"],
            cvss=float(r["cvss"]),
            epss=float(r["epss"]),
            severity=SeverityLevel(r["severity"]),
        )
        for r in matrix_rows
    ]

    heatmap_rows = await sx.get_cluster_heatmap(
        sx_db, ns_list_for_queries,
        min_cvss=min_cvss, min_epss=min_epss, always_show_cve_ids=always_show,
    )
    cluster_heatmap = [ClusterHeatmapRow(**r) for r in heatmap_rows]

    aging_rows = await sx.get_cve_aging(
        sx_db, ns_list_for_queries,
        min_cvss=min_cvss, min_epss=min_epss, always_show_cve_ids=always_show,
    )
    aging_distribution = [AgingBucket(bucket=r["bucket"], count=r["count"]) for r in aging_rows]

    # Top vulnerable components
    top_components_rows = await sx.get_top_vulnerable_components(
        sx_db, ns_list_for_queries,
        min_cvss=min_cvss, min_epss=min_epss, always_show_cve_ids=always_show,
    )
    top_vulnerable_components = [
        ComponentCveCount(component_name=r["component_name"], cve_count=r["cve_count"])
        for r in top_components_rows
    ]

    ra_counts = {}
    for st in ["requested", "approved", "rejected", "expired"]:
        count_result = await app_db.execute(
            select(func.count(RiskAcceptance.id)).where(
                RiskAcceptance.status == RiskStatus[st]
            )
        )
        ra_counts[st] = count_result.scalar() or 0
    risk_acceptance_pipeline = RiskAcceptancePipeline(**ra_counts)

    return DashboardData(
        stat_total_cves=total,
        stat_escalations=escalations,
        stat_upcoming_escalations=len(upcoming_escalations),
        stat_fixable_critical_cves=fixable_critical,
        stat_open_risk_acceptances=open_ra,
        severity_distribution=[
            SeverityCount(severity=SeverityLevel(r["severity"]), count=r["count"])
            for r in sev_dist
        ],
        cves_per_namespace=[
            NamespaceCveCount(namespace=r["namespace"], count=r["count"])
            for r in ns_counts
        ],
        priority_cves=top_priorities,
        high_epss_cves=top_epss,
        cve_trend=[CveTrendPoint(date=r["date"], count=r["count"]) for r in trend],
        epss_matrix=epss_matrix,
        cluster_heatmap=cluster_heatmap,
        aging_distribution=aging_distribution,
        top_vulnerable_components=top_vulnerable_components,
        risk_acceptance_pipeline=risk_acceptance_pipeline,
    )
