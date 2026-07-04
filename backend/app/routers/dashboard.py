import asyncio
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, tuple_
from sqlalchemy import text as sa_text
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..database import AppSessionLocal, StackRoxSessionLocal
from ..deps import get_app_db
from ..models.cve_priority import CvePriority
from ..models.escalation import Escalation
from ..models.global_settings import GlobalSettings
from ..models.remediation import Remediation
from ..models.risk_acceptance import RiskAcceptance, RiskStatus
from ..schemas.cve import CveListItem, SeverityLevel
from ..schemas.dashboard import (
    AgingBucket,
    ClusterHeatmapRow,
    ComponentCveCount,
    CveHistoryPoint,
    CveTrendPoint,
    DashboardData,
    EpssMatrixPoint,
    FixabilityCount,
    MttrSeverity,
    NamespaceCveCount,
    RiskAcceptancePipeline,
    SeverityCount,
)
from ..services.cve_filter_service import (
    compute_remediation_status,
    compute_suppression_sets,
)
from ..services.escalation_preview import compute_upcoming_escalations
from ..services.risk_acceptance_service import user_can_access_ra
from ..stackrox import queries as sx
from ._scope import narrow_namespaces

# Limit concurrent StackRox DB sessions per request to avoid exhausting
# Central DB's max_connections (100 shared with StackRox itself).
_stackrox_semaphore = asyncio.Semaphore(3)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


async def _get_settings(session: AsyncSession) -> GlobalSettings | None:
    result = await session.execute(select(GlobalSettings).limit(1))
    return result.scalar_one_or_none()


def _is_fix_overdue(fa: datetime | None, cutoff: datetime) -> bool:
    if fa is None:
        return False
    fa_aware = fa if fa.tzinfo else fa.replace(tzinfo=UTC)
    return fa_aware <= cutoff


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
                fix_available_since=c.get("fix_available_since"),
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
    min_cvss: float,
    min_epss: float,
    always_show: set[str],
    exclude: set[str],
) -> list[dict]:
    async with _stackrox_semaphore, StackRoxSessionLocal() as db:
        return await sx.get_severity_distribution(
            db,
            ns,
            min_cvss=min_cvss,
            min_epss=min_epss,
            always_show_cve_ids=always_show,
            exclude_cve_ids=exclude,
        )


async def _sx_cves_per_namespace(
    ns: list[tuple[str, str]] | None,
    min_cvss: float,
    min_epss: float,
    always_show: set[str],
    exclude: set[str],
) -> list[dict]:
    async with _stackrox_semaphore, StackRoxSessionLocal() as db:
        return await sx.get_cves_per_namespace(
            db,
            ns,
            min_cvss=min_cvss,
            min_epss=min_epss,
            always_show_cve_ids=always_show,
            exclude_cve_ids=exclude,
        )


async def _sx_cve_trend(
    ns: list[tuple[str, str]] | None,
    min_cvss: float,
    min_epss: float,
    always_show: set[str],
    exclude: set[str],
) -> list[dict]:
    async with _stackrox_semaphore, StackRoxSessionLocal() as db:
        return await sx.get_cve_trend(
            db,
            ns,
            min_cvss=min_cvss,
            min_epss=min_epss,
            always_show_cve_ids=always_show,
            exclude_cve_ids=exclude,
        )


async def _sx_epss_risk_matrix(
    ns: list[tuple[str, str]] | None,
    min_cvss: float,
    min_epss: float,
    always_show: set[str],
    exclude: set[str],
) -> list[dict]:
    async with _stackrox_semaphore, StackRoxSessionLocal() as db:
        return await sx.get_epss_risk_matrix(
            db,
            ns,
            min_cvss=min_cvss,
            min_epss=min_epss,
            always_show_cve_ids=always_show,
            exclude_cve_ids=exclude,
        )


async def _sx_cluster_heatmap(
    ns: list[tuple[str, str]] | None,
    min_cvss: float,
    min_epss: float,
    always_show: set[str],
    exclude: set[str],
) -> list[dict]:
    async with _stackrox_semaphore, StackRoxSessionLocal() as db:
        return await sx.get_cluster_heatmap(
            db,
            ns,
            min_cvss=min_cvss,
            min_epss=min_epss,
            always_show_cve_ids=always_show,
            exclude_cve_ids=exclude,
        )


async def _sx_cve_aging(
    ns: list[tuple[str, str]] | None,
    min_cvss: float,
    min_epss: float,
    always_show: set[str],
    exclude: set[str],
) -> list[dict]:
    async with _stackrox_semaphore, StackRoxSessionLocal() as db:
        return await sx.get_cve_aging(
            db,
            ns,
            min_cvss=min_cvss,
            min_epss=min_epss,
            always_show_cve_ids=always_show,
            exclude_cve_ids=exclude,
        )


async def _sx_top_vulnerable_components(
    ns: list[tuple[str, str]] | None,
    min_cvss: float,
    min_epss: float,
    always_show: set[str],
    exclude: set[str],
) -> list[dict]:
    async with _stackrox_semaphore, StackRoxSessionLocal() as db:
        return await sx.get_top_vulnerable_components(
            db,
            ns,
            min_cvss=min_cvss,
            min_epss=min_epss,
            always_show_cve_ids=always_show,
            exclude_cve_ids=exclude,
        )


async def _sx_fixability_breakdown(
    ns: list[tuple[str, str]] | None,
    min_cvss: float,
    min_epss: float,
    always_show: set[str],
    exclude: set[str],
) -> dict:
    async with _stackrox_semaphore, StackRoxSessionLocal() as db:
        return await sx.get_fixability_breakdown(
            db,
            ns,
            min_cvss=min_cvss,
            min_epss=min_epss,
            always_show_cve_ids=always_show,
            exclude_cve_ids=exclude,
        )


async def _cve_history(
    ns_list: list[tuple[str, str]] | None,
    use_visible_counts: bool,
    days: int = 90,
) -> list[CveHistoryPoint]:
    """Aggregate stored snapshots into a per-day severity series.

    ns_list None => use the org-wide '*' rows (exact, deduped across namespaces).
    Otherwise sum the user's namespace rows (a CVE present in several visible
    namespaces counts once per namespace, same semantics as NamespaceBreakdown).
    """
    from collections import defaultdict

    from ..models.cve_snapshot import CveSnapshot

    since = datetime.now(UTC).date() - timedelta(days=days)
    async with AppSessionLocal() as db:
        q = select(
            CveSnapshot.snapshot_date,
            CveSnapshot.severity,
            func.sum(CveSnapshot.count_visible if use_visible_counts else CveSnapshot.count_total),
        ).where(CveSnapshot.snapshot_date >= since)
        if ns_list is None:
            q = q.where(CveSnapshot.namespace == "*")
        else:
            q = q.where(
                CveSnapshot.namespace != "*",
                tuple_(CveSnapshot.namespace, CveSnapshot.cluster_name).in_(ns_list),
            )
        q = q.group_by(CveSnapshot.snapshot_date, CveSnapshot.severity)
        rows = (await db.execute(q)).all()

    by_date: dict = defaultdict(lambda: {"critical": 0, "important": 0, "moderate": 0, "low": 0, "unknown": 0})
    sev_key = {4: "critical", 3: "important", 2: "moderate", 1: "low", 0: "unknown"}
    for snapshot_date, severity, count in rows:
        by_date[snapshot_date][sev_key.get(severity, "unknown")] += int(count or 0)
    return [CveHistoryPoint(date=str(d), **v) for d, v in sorted(by_date.items())]


async def _empty_mttr() -> list[MttrSeverity]:
    return []


async def _upcoming_escalations(
    namespaces: list[tuple[str, str]],
    settings: GlobalSettings | None,
) -> list:
    if not settings:
        return []
    async with _stackrox_semaphore, StackRoxSessionLocal() as sx_db, AppSessionLocal() as app_db:
        return await compute_upcoming_escalations(sx_db, app_db, namespaces, settings)


async def _ra_pipeline() -> RiskAcceptancePipeline:
    async with AppSessionLocal() as db:
        counts = {}
        for st in ["requested", "approved", "rejected", "expired"]:
            result = await db.execute(
                select(func.count(RiskAcceptance.id)).where(RiskAcceptance.status == RiskStatus[st])
            )
            counts[st] = result.scalar() or 0
        return RiskAcceptancePipeline(**counts)


async def _mttr_by_severity(
    ns_list: list[tuple[str, str]] | None,
) -> list[MttrSeverity]:
    """Compute mean time to remediate grouped by CVE severity.

    MTTR = resolved_at - first_seen (firstimageoccurrence from StackRox).
    This measures the full exposure window from when the CVE first appeared
    until remediation was completed.
    """
    from collections import defaultdict

    # Step 1: get resolved remediations (cve_id -> list of resolved_at timestamps)
    async with AppSessionLocal() as app_db:
        q = select(
            Remediation.cve_id,
            Remediation.resolved_at,
        ).where(Remediation.resolved_at.isnot(None))

        if ns_list is not None and len(ns_list) > 0:
            from sqlalchemy import tuple_

            q = q.where(tuple_(Remediation.namespace, Remediation.cluster_name).in_(ns_list))

        result = await app_db.execute(q)
        rows = result.all()

    if not rows:
        return []

    cve_ids = list({r.cve_id for r in rows})

    # Step 2: get severity and first_seen for those CVE IDs from StackRox
    async with StackRoxSessionLocal() as sx_db:
        sx_rows = await sx_db.execute(
            sa_text(
                "SELECT ic.cvebaseinfo_cve, "
                "       MAX(ic.severity), "
                "       MIN(ic.firstimageoccurrence) "
                "FROM image_cves_v2 ic "
                "WHERE ic.cvebaseinfo_cve = ANY(:cve_ids) "
                "GROUP BY ic.cvebaseinfo_cve"
            ),
            {"cve_ids": cve_ids},
        )
        cve_info = {row[0]: (row[1], row[2]) for row in sx_rows.all()}  # cve_id -> (severity, first_seen)

    # Step 3: compute per-remediation MTTR using first_seen, aggregate by severity
    sev_totals: dict[int, list[float]] = defaultdict(list)
    sev_counts: dict[int, int] = defaultdict(int)
    for r in rows:
        info = cve_info.get(r.cve_id)
        if not info or info[1] is None:
            continue
        sev, first_seen = info
        delta_days = (r.resolved_at - first_seen).total_seconds() / 86400.0
        if delta_days < 0:
            continue
        sev_totals[sev].append(delta_days)
        sev_counts[sev] += 1

    result_list = []
    for sev in sorted(sev_totals.keys()):
        days_list = sev_totals[sev]
        avg = sum(days_list) / len(days_list)
        result_list.append(
            MttrSeverity(
                severity=SeverityLevel(sev),
                avg_days=round(avg, 4),
                count=sev_counts[sev],
            )
        )
    return result_list


@router.get("", response_model=DashboardData)
async def dashboard(
    cluster: str | None = Query(None),
    namespace: str | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
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
            async with StackRoxSessionLocal() as sx_db:
                all_ns = await sx.list_namespaces(sx_db)
            namespaces: list[tuple[str, str]] = narrow_namespaces(
                [(r["namespace"], r["cluster_name"]) for r in all_ns],
                cluster,
                namespace,
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
                stat_fix_overdue_cves=0,
                stat_in_remediation=0,
                stat_remediated=0,
                fix_overdue_threshold_days=settings.fix_overdue_threshold_days if settings else 30,
                severity_distribution=[],
                cves_per_namespace=[],
                priority_cves=[],
                high_epss_cves=[],
                cve_trend=[],
                epss_matrix=[],
                cluster_heatmap=[],
                aging_distribution=[],
                top_vulnerable_components=[],
                risk_acceptance_pipeline=RiskAcceptancePipeline(requested=0, approved=0, rejected=0, expired=0),
                fixability_breakdown=FixabilityCount(fixable=0, unfixable=0),
                cve_history=[],
                mttr_by_severity=[],
                fix_first_cves=[],
            )
        namespaces = narrow_namespaces(current_user.namespaces, cluster, namespace)

    # Get prioritized CVEs (always shown)
    prio_result = await app_db.execute(select(CvePriority))
    priorities = {p.cve_id: p for p in prio_result.scalars().all()}

    # Get active risk acceptances
    ra_query = select(RiskAcceptance).where(RiskAcceptance.status.in_([RiskStatus.requested, RiskStatus.approved]))
    ra_result = await app_db.execute(ra_query)
    acceptances = {ra.cve_id: ra for ra in ra_result.scalars().all()}

    always_show = set(priorities.keys()) | set(acceptances.keys())

    # Open a dedicated StackRox session for the initial CVE query and release
    # it before the parallel phase so we don't hold an idle connection during
    # asyncio.gather (which opens its own sessions via the semaphore).
    async with StackRoxSessionLocal() as sx_db:
        if current_user.can_see_all_namespaces and not has_scope:
            cves = await sx.get_all_cves(sx_db, min_cvss, min_epss, always_show)
            ns_list_for_queries = None
        else:
            cves = await sx.get_cves_for_namespaces(sx_db, namespaces, min_cvss, min_epss, always_show)
            ns_list_for_queries = namespaces

        # Drop CVEs fully covered by approved suppression rules so dashboard panels
        # match the default /cves list (show_suppressed=False). The same set is fed
        # into every chart query below to keep all panels internally consistent.
        suppressed_cve_ids, _ = await compute_suppression_sets(
            app_db,
            sx_db,
            current_user,
            [c["cve_id"] for c in cves],
            ns_list_for_queries,
        )
        if suppressed_cve_ids:
            cves = [c for c in cves if c["cve_id"] not in suppressed_cve_ids]

        # Remediation progress (scoped to the user's visible namespaces). This does
        # NOT alter stat_total_cves or the chart datasets; it powers progress cards
        # so a team member sees work move forward without changing the totals.
        rem_status = await compute_remediation_status(app_db, sx_db, [c["cve_id"] for c in cves], ns_list_for_queries)

    enriched = _enrich_cves(cves, priorities, acceptances)

    # Stat cards
    total = len(cves)
    stat_in_remediation = sum(1 for v in rem_status.values() if v == "in_progress")
    stat_remediated = sum(1 for v in rem_status.values() if v == "remediated")
    fixable_critical = sum(1 for c in cves if c.get("severity") == 4 and c.get("fixable"))

    fix_overdue_threshold_days = settings.fix_overdue_threshold_days if settings else 30
    fix_overdue_cutoff = datetime.now(UTC) - timedelta(days=fix_overdue_threshold_days)
    fix_overdue = sum(1 for c in cves if _is_fix_overdue(c.get("fix_available_since"), fix_overdue_cutoff))

    # Escalation count: filter by scope-narrowed namespaces
    if current_user.can_see_all_namespaces and not has_scope:
        escalations_result = await app_db.execute(select(func.count(Escalation.id)))
    else:
        esc_ns = namespaces if has_scope or not current_user.can_see_all_namespaces else []
        if esc_ns:
            esc_query = select(func.count(Escalation.id)).where(
                tuple_(Escalation.namespace, Escalation.cluster_name).in_(esc_ns)
            )
            escalations_result = await app_db.execute(esc_query)
        else:
            escalations_result = await app_db.execute(select(func.count(Escalation.id)))
    escalations = escalations_result.scalar() or 0

    # Open risk acceptances: sec team sees the global count; regular users only
    # count RAs they can actually see in the /risk-acceptances list.
    if current_user.is_sec_team:
        open_ra_result = await app_db.execute(
            select(func.count(RiskAcceptance.id)).where(RiskAcceptance.status == RiskStatus.requested)
        )
        open_ra = open_ra_result.scalar() or 0
    else:
        open_ra_rows = await app_db.execute(select(RiskAcceptance).where(RiskAcceptance.status == RiskStatus.requested))
        open_ra = sum(1 for ra in open_ra_rows.scalars().all() if user_can_access_ra(current_user, ra))

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
        cve_history_data,
        upcoming_escalations,
        risk_acceptance_pipeline,
        mttr_data,
    ) = await asyncio.gather(
        _sx_severity_distribution(ns_list_for_queries, min_cvss, min_epss, always_show, suppressed_cve_ids),
        _sx_cves_per_namespace(ns_list_for_queries, min_cvss, min_epss, always_show, suppressed_cve_ids),
        _sx_cve_trend(ns_list_for_queries, min_cvss, min_epss, always_show, suppressed_cve_ids),
        _sx_epss_risk_matrix(ns_list_for_queries, min_cvss, min_epss, always_show, suppressed_cve_ids),
        _sx_cluster_heatmap(ns_list_for_queries, min_cvss, min_epss, always_show, suppressed_cve_ids),
        _sx_cve_aging(ns_list_for_queries, min_cvss, min_epss, always_show, suppressed_cve_ids),
        _sx_top_vulnerable_components(ns_list_for_queries, min_cvss, min_epss, always_show, suppressed_cve_ids),
        _sx_fixability_breakdown(ns_list_for_queries, min_cvss, min_epss, always_show, suppressed_cve_ids),
        _cve_history(ns_list_for_queries, use_visible_counts=not current_user.is_sec_team),
        _upcoming_escalations(upcoming_ns, settings),
        _ra_pipeline(),
        _mttr_by_severity(ns_list_for_queries) if current_user.is_sec_team else _empty_mttr(),
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

    # "Fix first" ranking for ops teams: actionable CVEs ordered by
    # sec-team priority, then fixability, then exploitation probability, then
    # severity. Fixable CVEs rank above unfixable ones; risk-accepted CVEs are excluded.
    fix_first = sorted(
        (item for item in unique_items if not item.has_risk_acceptance),
        key=lambda x: (
            not x.has_priority,
            not x.fixable,
            -x.epss_probability,
            -x.severity.value,
        ),
    )[:10]

    return DashboardData(
        stat_total_cves=total,
        stat_escalations=escalations,
        stat_upcoming_escalations=len(upcoming_escalations),
        stat_fixable_critical_cves=fixable_critical,
        stat_open_risk_acceptances=open_ra,
        stat_fix_overdue_cves=fix_overdue,
        stat_in_remediation=stat_in_remediation,
        stat_remediated=stat_remediated,
        fix_overdue_threshold_days=fix_overdue_threshold_days,
        severity_distribution=[
            SeverityCount(severity=SeverityLevel(r["severity"]), count=r["count"]) for r in sev_dist
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
        cve_trend=[
            CveTrendPoint(
                date=r["date"],
                critical=r.get("critical", 0),
                important=r.get("important", 0),
                moderate=r.get("moderate", 0),
                low=r.get("low", 0),
            )
            for r in trend
        ],
        epss_matrix=epss_matrix,
        cluster_heatmap=cluster_heatmap,
        aging_distribution=aging_distribution,
        top_vulnerable_components=top_vulnerable_components,
        risk_acceptance_pipeline=risk_acceptance_pipeline,
        fixability_breakdown=FixabilityCount(**fixability_data),
        cve_history=cve_history_data,
        mttr_by_severity=mttr_data,
        fix_first_cves=fix_first,
    )
