from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user, require_sec_team
from ..deps import get_app_db, get_stackrox_db
from ..models.cve_priority import CvePriority
from ..models.escalation import Escalation
from ..models.global_settings import GlobalSettings
from ..models.risk_acceptance import RiskAcceptance, RiskStatus
from ..models.team import Team, TeamNamespace
from ..schemas.dashboard import (
    AgingBucket,
    ClusterHeatmapRow,
    CveTrendPoint,
    EpssMatrixPoint,
    FixabilityByTeam,
    NamespaceCveCount,
    RiskAcceptancePipeline,
    SecDashboardData,
    SeverityCount,
    TeamDashboardData,
    TeamHealthScore,
    ThresholdPreview,
)
from ..schemas.cve import CveListItem, SeverityLevel
from ..stackrox import queries as sx

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


async def _get_settings(session: AsyncSession) -> GlobalSettings | None:
    result = await session.execute(select(GlobalSettings).limit(1))
    return result.scalar_one_or_none()


async def _get_team_namespaces(
    session: AsyncSession, team_id
) -> list[tuple[str, str]]:
    result = await session.execute(
        select(TeamNamespace).where(TeamNamespace.team_id == team_id)
    )
    return [(n.namespace, n.cluster_name) for n in result.scalars().all()]


def _enrich_cves(cves: list[dict], priorities: dict, acceptances: dict) -> list[CveListItem]:
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


@router.get("", response_model=TeamDashboardData)
async def team_dashboard(
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> TeamDashboardData:
    settings = await _get_settings(app_db)
    min_cvss = float(settings.min_cvss_score) if settings else 0.0
    min_epss = float(settings.min_epss_score) if settings else 0.0

    if current_user.is_sec_team:
        namespaces: list[tuple[str, str]] = []  # empty = all for sec team
    else:
        if not current_user.team_id:
            return TeamDashboardData(
                stat_total_cves=0, stat_critical_cves=0, stat_fixable_cves=0,
                stat_open_risk_acceptances=0, stat_overdue_deadlines=0, stat_avg_epss=0.0,
                severity_distribution=[], cves_per_namespace=[], priority_cves=[],
                high_epss_cves=[], cve_trend=[],
            )
        namespaces = await _get_team_namespaces(app_db, current_user.team_id)

    # Get prioritized CVEs (always shown)
    prio_result = await app_db.execute(select(CvePriority))
    priorities = {p.cve_id: p for p in prio_result.scalars().all()}

    # Get active risk acceptances for the team
    ra_query = select(RiskAcceptance).where(
        RiskAcceptance.status.in_([RiskStatus.requested, RiskStatus.approved])
    )
    if current_user.team_id and not current_user.is_sec_team:
        ra_query = ra_query.where(RiskAcceptance.team_id == current_user.team_id)
    ra_result = await app_db.execute(ra_query)
    acceptances = {ra.cve_id: ra for ra in ra_result.scalars().all()}

    always_show = set(priorities.keys()) | set(acceptances.keys())

    if current_user.is_sec_team:
        cves = await sx.get_all_cves(sx_db, min_cvss, min_epss, always_show)
        ns_list_for_queries = None
    else:
        cves = await sx.get_cves_for_namespaces(sx_db, namespaces, min_cvss, min_epss, always_show)
        ns_list_for_queries = namespaces

    enriched = _enrich_cves(cves, priorities, acceptances)

    # Stat cards
    total = len(cves)
    critical = sum(1 for c in cves if c.get("severity") == 4)
    fixable = sum(1 for c in cves if c.get("fixable"))
    avg_epss = sum(c.get("epss_probability", 0) for c in cves) / total if total else 0.0

    open_ra_result = await app_db.execute(
        select(func.count(RiskAcceptance.id)).where(
            RiskAcceptance.status == RiskStatus.requested,
            *([RiskAcceptance.team_id == current_user.team_id] if current_user.team_id else [])
        )
    )
    open_ra = open_ra_result.scalar() or 0

    from datetime import datetime
    overdue = sum(
        1 for p in priorities.values()
        if p.deadline and p.deadline < datetime.utcnow()
    )

    # Charts
    sev_dist = await sx.get_severity_distribution(sx_db, ns_list_for_queries)
    ns_counts = await sx.get_cves_per_namespace(sx_db, ns_list_for_queries)
    trend = await sx.get_cve_trend(sx_db, ns_list_for_queries)

    # Deduplicate by cve_id (same CVE can appear across multiple images).
    # Keep the entry with the highest epss_probability for each unique CVE.
    seen_cve_ids: dict[str, CveListItem] = {}
    for item in enriched:
        if item.cve_id not in seen_cve_ids or item.epss_probability > seen_cve_ids[item.cve_id].epss_probability:
            seen_cve_ids[item.cve_id] = item
    unique_items = list(seen_cve_ids.values())
    top_epss = sorted(unique_items, key=lambda x: x.epss_probability, reverse=True)[:5]
    top_priorities = sorted(
        (item for item in unique_items if item.has_priority),
        key=lambda x: (
            x.priority_deadline is None,
            x.priority_deadline or x.first_seen or datetime.max,
            -x.severity.value,
            -x.epss_probability,
        ),
    )[:8]

    return TeamDashboardData(
        stat_total_cves=total,
        stat_critical_cves=critical,
        stat_fixable_cves=fixable,
        stat_open_risk_acceptances=open_ra,
        stat_overdue_deadlines=overdue,
        stat_avg_epss=round(avg_epss, 4),
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
    )


@router.get("/sec", response_model=SecDashboardData)
async def sec_dashboard(
    _: CurrentUser = Depends(require_sec_team),
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> SecDashboardData:
    settings = await _get_settings(app_db)
    min_cvss = float(settings.min_cvss_score) if settings else 0.0
    min_epss = float(settings.min_epss_score) if settings else 0.0

    # EPSS risk matrix
    matrix_rows = await sx.get_epss_risk_matrix(sx_db)
    epss_matrix = [
        EpssMatrixPoint(
            cve_id=r["cve_id"],
            cvss=float(r["cvss"]),
            epss=float(r["epss"]),
            severity=SeverityLevel(r["severity"]),
        )
        for r in matrix_rows
    ]

    # Cluster heatmap
    heatmap_rows = await sx.get_cluster_heatmap(sx_db)
    cluster_heatmap = [ClusterHeatmapRow(**r) for r in heatmap_rows]

    # Team health scores
    teams_result = await app_db.execute(select(Team))
    teams = list(teams_result.scalars().all())

    team_scores: list[TeamHealthScore] = []
    fixability_list: list[FixabilityByTeam] = []

    from datetime import datetime
    prio_result = await app_db.execute(select(CvePriority))
    all_priorities = {p.cve_id: p for p in prio_result.scalars().all()}

    for team in teams:
        ns_list = [(n.namespace, n.cluster_name) for n in team.namespaces]
        cves = await sx.get_cves_for_namespaces(sx_db, ns_list, min_cvss, min_epss)
        fix_stats = await sx.get_fixability_stats(sx_db, ns_list)

        open_ra_result = await app_db.execute(
            select(func.count(RiskAcceptance.id)).where(
                RiskAcceptance.team_id == team.id,
                RiskAcceptance.status == RiskStatus.requested,
            )
        )
        open_ra = open_ra_result.scalar() or 0

        overdue = sum(
            1 for p in all_priorities.values()
            if p.deadline and p.deadline < datetime.utcnow()
        )

        total_cves = len(cves)
        critical_cves = sum(1 for c in cves if c.get("severity") == 4)
        avg_epss = sum(c.get("epss_probability", 0) for c in cves) / total_cves if total_cves else 0.0

        # Risk score: weighted formula
        risk_score = min(
            100.0,
            critical_cves * 5
            + sum(1 for c in cves if c.get("severity") == 3) * 2
            + avg_epss * 100
            + overdue * 10,
        )

        team_scores.append(
            TeamHealthScore(
                team_id=str(team.id),
                team_name=team.name,
                total_cves=total_cves,
                critical_cves=critical_cves,
                avg_epss=round(avg_epss, 4),
                overdue_items=overdue,
                open_risk_acceptances=open_ra,
                risk_score=round(risk_score, 1),
            )
        )
        fixability_list.append(
            FixabilityByTeam(
                team_name=team.name,
                fixable=fix_stats["fixable"],
                unfixable=fix_stats["unfixable"],
            )
        )

    team_scores.sort(key=lambda x: x.risk_score, reverse=True)

    # Aging distribution
    aging_rows = await sx.get_cve_aging(sx_db, None)
    aging_dist = [AgingBucket(bucket=r["bucket"], count=r["count"]) for r in aging_rows]

    # Risk acceptance pipeline
    for status in ["requested", "approved", "rejected", "expired"]:
        pass
    ra_counts = {}
    for st in ["requested", "approved", "rejected", "expired"]:
        count_result = await app_db.execute(
            select(func.count(RiskAcceptance.id)).where(
                RiskAcceptance.status == RiskStatus[st]
            )
        )
        ra_counts[st] = count_result.scalar() or 0

    pipeline = RiskAcceptancePipeline(**ra_counts)

    # Org-wide totals
    all_cves = await sx.get_all_cves(sx_db, min_cvss, min_epss)
    total_org = len(all_cves)
    total_critical = sum(1 for c in all_cves if c.get("severity") == 4)
    org_avg_epss = sum(c.get("epss_probability", 0) for c in all_cves) / total_org if total_org else 0.0

    # New CVEs in last 7 days
    cves_last_7_days = await sx.get_cves_last_n_days(sx_db, days=7)

    # Threshold preview
    preview = await sx.get_threshold_preview(sx_db, min_cvss, min_epss)
    threshold_preview = ThresholdPreview(**preview)

    return SecDashboardData(
        epss_matrix=epss_matrix,
        cluster_heatmap=cluster_heatmap,
        team_scoreboard=team_scores,
        fixability_by_team=fixability_list,
        aging_distribution=aging_dist,
        risk_acceptance_pipeline=pipeline,
        total_cves=total_org,
        total_critical=total_critical,
        avg_epss=round(org_avg_epss, 4),
        total_teams=len(teams),
        cves_last_7_days=cves_last_7_days,
        threshold_preview=threshold_preview,
    )
