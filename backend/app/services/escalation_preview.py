"""Compute upcoming escalations (CVEs approaching escalation thresholds)."""

from datetime import datetime

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.cve_priority import CvePriority
from ..models.escalation import Escalation
from ..models.global_settings import GlobalSettings
from ..models.risk_acceptance import RiskAcceptance, RiskStatus
from ..stackrox import queries as sx
from .escalation_rules import level_deadlines, pick_matching_rule


class UpcomingEscalation(BaseModel):
    cve_id: str
    severity: int
    epss_probability: float
    current_age_days: int
    next_level: int
    days_until_escalation: int


def filter_upcoming_escalations(
    items: list[UpcomingEscalation],
    *,
    search: str | None,
    next_level: int | None,
    severity: int | None,
    days_max: int | None,
    page: int,
    page_size: int,
) -> tuple[list[UpcomingEscalation], int]:
    """Filter and paginate an already computed upcoming-escalation preview."""
    filtered = items
    if search:
        normalized_search = search.casefold()
        filtered = [item for item in filtered if normalized_search in item.cve_id.casefold()]
    if next_level is not None:
        filtered = [item for item in filtered if item.next_level == next_level]
    if severity is not None:
        filtered = [item for item in filtered if item.severity == severity]
    if days_max is not None:
        filtered = [item for item in filtered if item.days_until_escalation <= days_max]

    total = len(filtered)
    start = (page - 1) * page_size
    return filtered[start : start + page_size], total


async def compute_upcoming_escalations(
    sx_db: AsyncSession,
    app_db: AsyncSession,
    namespaces: list[tuple[str, str]],
    settings: GlobalSettings,
) -> list[UpcomingEscalation]:
    """Compute CVEs approaching escalation thresholds within warning_days window.

    Args:
        sx_db: StackRox DB session (read-only).
        app_db: App DB session.
        namespaces: User's namespace scope. Empty list = all (sec team).
        settings: GlobalSettings with escalation_rules and escalation_warning_days.
    """
    if not settings.escalation_rules:
        return []

    warning_days = settings.escalation_warning_days

    min_cvss = float(settings.min_cvss_score) if settings.min_cvss_score else 0.0
    min_epss = float(settings.min_epss_score) if settings.min_epss_score else 0.0

    # Get approved risk acceptance CVE IDs (excluded from escalation)
    accepted_result = await app_db.execute(
        select(RiskAcceptance.cve_id).where(
            RiskAcceptance.status == RiskStatus.approved,
        )
    )
    accepted_ids = {row[0] for row in accepted_result}

    # Build always_show from priorities and non-approved active RAs
    prio_result = await app_db.execute(select(CvePriority.cve_id))
    always_show: set[str] = {row[0] for row in prio_result}
    active_ra_result = await app_db.execute(
        select(RiskAcceptance.cve_id).where(
            RiskAcceptance.status == RiskStatus.requested,
        )
    )
    always_show |= {row[0] for row in active_ra_result}

    # Get existing escalations to skip already-escalated levels
    existing_result = await app_db.execute(select(Escalation.cve_id, Escalation.level))
    existing_escalations: dict[str, set[int]] = {}
    for cve_id, level in existing_result:
        existing_escalations.setdefault(cve_id, set()).add(level)

    # Get CVEs from StackRox (filtered by thresholds)
    if namespaces:
        cves = await sx.get_cves_for_namespaces(sx_db, namespaces, min_cvss, min_epss, always_show)
    else:
        cves = await sx.get_all_cves(sx_db, min_cvss, min_epss, always_show)

    upcoming: list[UpcomingEscalation] = []

    now = datetime.utcnow()

    for cve in cves:
        cve_id = cve["cve_id"]
        if cve_id in accepted_ids:
            continue

        first_seen = cve.get("first_seen")
        severity = cve.get("severity", 0)
        epss = cve.get("epss_probability", 0)
        age_days = (now - first_seen).days if first_seen else 0
        existing_levels = existing_escalations.get(cve_id, set())

        # Strictest matching rule only — must mirror the scheduler's escalation check.
        rule = pick_matching_rule(settings.escalation_rules, severity, float(epss))
        if rule is None:
            continue

        deadlines = level_deadlines(
            rule,
            first_seen=first_seen,
            fix_available_since=cve.get("fix_available_since"),
        )
        for level in sorted(deadlines):
            if level in existing_levels:
                continue
            days_remaining = (deadlines[level] - now).days
            if 0 < days_remaining <= warning_days:
                upcoming.append(
                    UpcomingEscalation(
                        cve_id=cve_id,
                        severity=severity,
                        epss_probability=float(epss),
                        current_age_days=age_days,
                        next_level=level,
                        days_until_escalation=days_remaining,
                    )
                )
                break  # only report the nearest upcoming level

    upcoming.sort(key=lambda u: u.days_until_escalation)
    return upcoming
