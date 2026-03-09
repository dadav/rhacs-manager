import asyncio
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..database import AppSessionLocal, StackRoxSessionLocal
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
    FixabilityCount,
    FixableTrendPoint,
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


# -- Helpers that open their own StackRox session for parallel execution --

async def _sx_severity_distribution(
    ns: list[tuple[str, str]] | None,
    min_cvss: float, min_epss: float, always_show: set[str],
) -> list[dict]:
    async with StackRoxSessionLocal() as db:
        return await sx.get_severity_distribution(
            db, ns, min_cvss=min_cvss, min_epss=min_epss, always_show_cve_ids=always_show,
        )


async def _sx_cves_per_namespace(
    ns: list[tuple[str, str]] | None,
    min_cvss: float, min_epss: float, always_show: set[str],
) -> list[dict]:
    async with StackRoxSessionLocal() as db:
        return await sx.get_cves_per_namespace(
            db, ns, min_cvss=min_cvss, min_epss=min_epss, always_show_cve_ids=always_show,
        )


async def _sx_cve_trend(
    ns: list[tuple[str, str]] | None,
    min_cvss: float, min_epss: float, always_show: set[str],
) -> list[dict]:
    async with StackRoxSessionLocal() as db:
        return await sx.get_cve_trend(
            db, ns, min_cvss=min_cvss, min_epss=min_epss, always_show_cve_ids=always_show,
        )


async def _sx_epss_risk_matrix(
    ns: list[tuple[str, str]] | None,
    min_cvss: float, min_epss: float, always_show: set[str],
) -> list[dict]:
    async with StackRoxSessionLocal() as db:
        return await sx.get_epss_risk_matrix(
            db, ns, min_cvss=min_cvss, min_epss=min_epss, always_show_cve_ids=always_show,
        )


async def _sx_cluster_heatmap(
    ns: list[tuple[str, str]] | None,
    min_cvss: float, min_epss: float, always_show: set[str],
) -> list[dict]:
    async with StackRoxSessionLocal() as db:
        return await sx.get_cluster_heatmap(
            db, ns, min_cvss=min_cvss, min_epss=min_epss, always_show_cve_ids=always_show,
        )


async def _sx_cve_aging(
    ns: list[tuple[str, str]] | None,
    min_cvss: float, min_epss: float, always_show: set[str],
) -> list[dict]:
    async with StackRoxSessionLocal() as db:
        return await sx.get_cve_aging(
            db, ns, min_cvss=min_cvss, min_epss=min_epss, always_show_cve_ids=always_show,
        )


async def _sx_top_vulnerable_components(
    ns: list[tuple[str, str]] | None,
    min_cvss: float, min_epss: float, always_show: set[str],
) -> list[dict]:
    async with StackRoxSessionLocal() as db:
        return await sx.get_top_vulnerable_components(
            db, ns, min_cvss=min_cvss, min_epss=min_epss, always_show_cve_ids=always_show,
        )


async def _sx_fixability_breakdown(
    ns: list[tuple[str, str]] | None,
    min_cvss: float, min_epss: float, always_show: set[str],
) -> dict:
    async with StackRoxSessionLocal() as db:
        return await sx.get_fixability_breakdown(
            db, ns, min_cvss=min_cvss, min_epss=min_epss, always_show_cve_ids=always_show,
        )


async def _sx_fixable_trend(
    ns: list[tuple[str, str]] | None,
    min_cvss: float, min_epss: float, always_show: set[str],
) -> list[dict]:
    async with StackRoxSessionLocal() as db:
        return await sx.get_fixable_trend(
            db, ns, min_cvss=min_cvss, min_epss=min_epss, always_show_cve_ids=always_show,
        )


async def _upcoming_escalations(
    namespaces: list[tuple[str, str]], settings: GlobalSettings | None,
) -> list:
    if not settings:
        return []
    async with StackRoxSessionLocal() as sx_db, AppSessionLocal() as app_db:
        return await compute_upcoming_escalations(sx_db, app_db, namespaces, settings)


async def _ra_pipeline() -> RiskAcceptancePipeline:
    async with AppSessionLocal() as db:
        counts = {}
        for st in ["requested", "approved", "rejected", "expired"]:
            result = await db.execute(
                select(func.count(RiskAcceptance.id)).where(
                    RiskAcceptance.status == RiskStatus[st]
                )
            )
            counts[st] = result.scalar() or 0
        return RiskAcceptancePipeline(**counts)


@router.get("", response_model=DashboardData)
async def dashboard(
    cluster: str | None = Query(None),
    namespace: str | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> DashboardData:
    settings = await _get_settings(app_db)
    # Thresholds only apply to non-sec-team users (sec team sees all CVEs)
    if current_user.is_sec_team:
        min_cvss = 0.0
        min_epss = 0.0
    else:
        min_cvss = float(settings.min_cvss_score) if settings else 0.0
        min_epss = float(settings.min_epss_score) if settings else 0.0

    has_scope = cluster is not None or namespace is not None

    if current_user.can_see_all_namespaces:
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
                fixability_breakdown=FixabilityCount(fixable=0, unfixable=0),
                fixable_trend=[],
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

    if current_user.can_see_all_namespaces and not has_scope:
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
    if current_user.can_see_all_namespaces and not has_scope:
        escalations_result = await app_db.execute(
            select(func.count(Escalation.id))
        )
    else:
        esc_ns = namespaces if has_scope or not current_user.can_see_all_namespaces else []
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

    # Run all chart queries + upcoming escalations + RA pipeline concurrently
    upcoming_ns = namespaces if (has_scope or not current_user.can_see_all_namespaces) else []
    (
        sev_dist,
        ns_counts,
        trend,
        matrix_rows,
        heatmap_rows,
        aging_rows,
        top_components_rows,
        fixability_data,
        fixable_trend_rows,
        upcoming_escalations,
        risk_acceptance_pipeline,
    ) = await asyncio.gather(
        _sx_severity_distribution(ns_list_for_queries, min_cvss, min_epss, always_show),
        _sx_cves_per_namespace(ns_list_for_queries, min_cvss, min_epss, always_show),
        _sx_cve_trend(ns_list_for_queries, min_cvss, min_epss, always_show),
        _sx_epss_risk_matrix(ns_list_for_queries, min_cvss, min_epss, always_show),
        _sx_cluster_heatmap(ns_list_for_queries, min_cvss, min_epss, always_show),
        _sx_cve_aging(ns_list_for_queries, min_cvss, min_epss, always_show),
        _sx_top_vulnerable_components(ns_list_for_queries, min_cvss, min_epss, always_show),
        _sx_fixability_breakdown(ns_list_for_queries, min_cvss, min_epss, always_show),
        _sx_fixable_trend(ns_list_for_queries, min_cvss, min_epss, always_show),
        _upcoming_escalations(upcoming_ns, settings),
        _ra_pipeline(),
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
    cluster_heatmap = [ClusterHeatmapRow(**r) for r in heatmap_rows]
    aging_distribution = [AgingBucket(bucket=r["bucket"], count=r["count"]) for r in aging_rows]
    top_vulnerable_components = [
        ComponentCveCount(
            component_name=r["component_name"],
            cve_count=r["cve_count"],
            fixable_count=r.get("fixable_count", 0),
            unfixable_count=r.get("unfixable_count", 0),
        )
        for r in top_components_rows
    ]

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
            NamespaceCveCount(
                namespace=r["namespace"],
                count=r["count"],
                critical=r.get("critical", 0),
                important=r.get("important", 0),
                moderate=r.get("moderate", 0),
                low=r.get("low", 0),
                unknown=r.get("unknown", 0),
                cluster_count=r.get("cluster_count", 1),
            )
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
        fixability_breakdown=FixabilityCount(**fixability_data),
        fixable_trend=[
            FixableTrendPoint(date=r["date"], fixable=r["fixable"], unfixable=r["unfixable"])
            for r in fixable_trend_rows
        ],
    )
