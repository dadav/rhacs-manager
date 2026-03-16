"""Shared CVE list fetching and filtering logic used by cves.py and exports.py."""

from datetime import datetime, timezone
from fnmatch import fnmatch
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser
from ..models.cve_priority import CvePriority
from ..models.global_settings import GlobalSettings
from ..models.remediation import Remediation, RemediationStatus
from ..models.risk_acceptance import RiskAcceptance, RiskStatus
from ..models.suppression_rule import (
    SuppressionRule,
    SuppressionStatus,
    SuppressionType,
)
from ..routers._scope import narrow_namespaces
from ..schemas.cve import CveListItem, SeverityLevel
from ..stackrox import queries as sx


async def _get_settings(db: AsyncSession) -> GlobalSettings | None:
    r = await db.execute(select(GlobalSettings).limit(1))
    return r.scalar_one_or_none()


def _matches_component_rule(
    rule: SuppressionRule, components: list[tuple[str, str]]
) -> bool:
    """Check if any (name, version) pair matches a component suppression rule."""
    for comp_name, comp_version in components:
        if comp_name != rule.component_name:
            continue
        if rule.version_pattern is None:
            return True
        if fnmatch(comp_version, rule.version_pattern):
            return True
    return False


def _is_cve_suppressed_by_rules(
    cve_id: str,
    rules: list[SuppressionRule],
    cve_namespace_map: dict[str, set[tuple[str, str]]],
    user_namespaces: set[tuple[str, str]] | None,
) -> bool:
    """Check if a CVE is fully suppressed for the user's visible namespaces.

    A CVE is suppressed if every (cluster, namespace) pair where the CVE appears
    in the user's view is covered by at least one approved rule's scope.
    """
    matching_rules = [r for r in rules if r.cve_id == cve_id]
    if not matching_rules:
        return False

    # If any rule has global scope, CVE is suppressed everywhere
    for rule in matching_rules:
        scope = rule.scope or {"mode": "all", "targets": []}
        if scope.get("mode") == "all":
            return True

    # For namespace-scoped rules, collect all covered (cluster, namespace) pairs
    covered: set[tuple[str, str]] = set()
    for rule in matching_rules:
        scope = rule.scope or {"mode": "all", "targets": []}
        if scope.get("mode") == "namespace":
            for target in scope.get("targets", []):
                covered.add((target["cluster_name"], target["namespace"]))

    # Get where this CVE appears
    cve_locations = cve_namespace_map.get(cve_id, set())
    if not cve_locations:
        return False

    # Narrow to user's visible namespaces
    if user_namespaces is not None:
        visible_locations = cve_locations & user_namespaces
    else:
        visible_locations = cve_locations

    if not visible_locations:
        return False

    # Suppressed only if ALL visible locations are covered
    return visible_locations.issubset(covered)


def _compute_suppressed_cves(
    cve_rules: list[SuppressionRule],
    component_rules: list[SuppressionRule],
    component_version_map: dict[str, list[tuple[str, str]]],
    all_cve_ids: list[str],
    cve_namespace_map: dict[str, set[tuple[str, str]]] | None = None,
    user_namespaces: set[tuple[str, str]] | None = None,
) -> set[str]:
    """Return set of cve_ids that are suppressed by approved rules."""
    suppressed: set[str] = set()

    # Direct CVE rules (now scope-aware)
    if cve_rules:
        cve_rule_ids = {r.cve_id for r in cve_rules if r.cve_id}
        candidate_cves = cve_rule_ids & set(all_cve_ids)

        if cve_namespace_map is not None:
            for cve_id in candidate_cves:
                if _is_cve_suppressed_by_rules(
                    cve_id, cve_rules, cve_namespace_map, user_namespaces
                ):
                    suppressed.add(cve_id)
        else:
            # Fallback for cases without namespace context (backwards compat)
            suppressed |= candidate_cves

    # Component rules (unchanged — always global)
    if component_rules:
        for cve_id in all_cve_ids:
            if cve_id in suppressed:
                continue
            components = component_version_map.get(cve_id, [])
            for rule in component_rules:
                if _matches_component_rule(rule, components):
                    suppressed.add(cve_id)
                    break

    return suppressed


def compute_per_rule_matched_counts(
    rules: list[SuppressionRule],
    all_cve_ids: set[str],
    component_version_map: dict[str, list[tuple[str, str]]],
) -> dict[UUID, int]:
    """Return {rule.id: matched_cve_count} for each rule."""
    counts: dict[UUID, int] = {}
    for rule in rules:
        if rule.type == SuppressionType.cve:
            counts[rule.id] = 1 if rule.cve_id in all_cve_ids else 0
        elif rule.type == SuppressionType.component:
            count = 0
            for cve_id in all_cve_ids:
                components = component_version_map.get(cve_id, [])
                if _matches_component_rule(rule, components):
                    count += 1
            counts[rule.id] = count
    return counts


def _build_cve_item(
    c: dict,
    priorities: dict,
    acceptances: dict,
    component_map: dict[str, list[str]] | None = None,
    suppressed_cve_ids: set[str] | None = None,
    suppression_requested_cve_ids: set[str] | None = None,
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
        component_names=sorted(set(component_map.get(c["cve_id"], [])))
        if component_map
        else [],
        has_priority=p is not None,
        priority_level=p.priority.value if p else None,
        priority_deadline=p.deadline if p else None,
        has_risk_acceptance=a is not None,
        risk_acceptance_status=a.status.value if a else None,
        risk_acceptance_id=str(a.id) if a else None,
        is_suppressed=c["cve_id"] in (suppressed_cve_ids or set()),
        suppression_requested=c["cve_id"] in (suppression_requested_cve_ids or set()),
    )


async def _load_suppression_sets(
    app_db: AsyncSession,
) -> tuple[
    list[SuppressionRule],
    list[SuppressionRule],
    list[SuppressionRule],
    list[SuppressionRule],
]:
    """Load approved and requested suppression rules.

    Returns:
        (approved_cve_rules, approved_component_rules, requested_cve_rules, requested_component_rules)
    """
    result = await app_db.execute(
        select(SuppressionRule).where(
            SuppressionRule.status.in_(
                [SuppressionStatus.approved, SuppressionStatus.requested]
            )
        )
    )
    rules = result.scalars().all()

    approved_cve_rules = [
        r
        for r in rules
        if r.type == SuppressionType.cve and r.status == SuppressionStatus.approved
    ]
    approved_component_rules = [
        r
        for r in rules
        if r.type == SuppressionType.component
        and r.status == SuppressionStatus.approved
    ]
    requested_cve_rules = [
        r
        for r in rules
        if r.type == SuppressionType.cve and r.status == SuppressionStatus.requested
    ]
    requested_component_rules = [
        r
        for r in rules
        if r.type == SuppressionType.component
        and r.status == SuppressionStatus.requested
    ]

    return (
        approved_cve_rules,
        approved_component_rules,
        requested_cve_rules,
        requested_component_rules,
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
    age_min: int | None = None,
    age_max: int | None = None,
    deployment: str | None = None,
    show_suppressed: bool = False,
    remediation_status: str | None = None,
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
    if current_user.can_see_all_namespaces:
        if has_scope:
            all_ns = await sx.list_namespaces(sx_db)
            scoped_ns = narrow_namespaces(
                [(r["namespace"], r["cluster_name"]) for r in all_ns],
                cluster,
                namespace,
            )
            ns_for_components = scoped_ns
            cves = await sx.get_cves_for_namespaces(
                sx_db, scoped_ns, min_cvss, min_epss, always_show
            )
        else:
            all_ns = await sx.list_namespaces(sx_db)
            ns_for_components = [(r["namespace"], r["cluster_name"]) for r in all_ns]
            cves = await sx.get_all_cves(sx_db, min_cvss, min_epss, always_show)
    else:
        if not current_user.has_namespaces:
            return []
        ns_for_components = narrow_namespaces(
            current_user.namespaces, cluster, namespace
        )
        cves = await sx.get_cves_for_namespaces(
            sx_db, ns_for_components, min_cvss, min_epss, always_show
        )

    # Batch fetch component names for all CVEs
    cve_ids_all = [c["cve_id"] for c in cves]
    component_map = (
        await sx.get_cve_component_map(sx_db, cve_ids_all, ns_for_components)
        if cve_ids_all
        else {}
    )

    # Load suppression rules and compute suppressed CVE sets
    (
        approved_cve_rules,
        approved_component_rules,
        requested_cve_rules,
        requested_component_rules,
    ) = await _load_suppression_sets(app_db)

    has_component_rules = bool(approved_component_rules) or bool(
        requested_component_rules
    )
    component_version_map: dict[str, list[tuple[str, str]]] = {}
    if has_component_rules and cve_ids_all:
        component_version_map = await sx.get_cve_component_version_map(
            sx_db, cve_ids_all, ns_for_components
        )

    # Build namespace map for scope-aware suppression
    has_scoped_cve_rules = any(
        (r.scope or {}).get("mode") == "namespace"
        for r in approved_cve_rules + requested_cve_rules
    )
    cve_namespace_map: dict[str, set[tuple[str, str]]] | None = None
    if has_scoped_cve_rules and cve_ids_all:
        cve_rule_cve_ids = list(
            {r.cve_id for r in approved_cve_rules + requested_cve_rules if r.cve_id}
        )
        cve_namespace_map = await sx.get_cve_namespace_cluster_map(
            sx_db, cve_rule_cve_ids, ns_for_components
        )

    # Build user namespace set for scope comparison
    user_ns_set: set[tuple[str, str]] | None = None
    if not current_user.can_see_all_namespaces and current_user.has_namespaces:
        user_ns_set = {(cl, ns) for ns, cl in ns_for_components}
    elif current_user.can_see_all_namespaces:
        user_ns_set = None  # sees everything

    suppressed_cve_ids = _compute_suppressed_cves(
        approved_cve_rules,
        approved_component_rules,
        component_version_map,
        cve_ids_all,
        cve_namespace_map,
        user_ns_set,
    )
    suppression_requested_cve_ids = _compute_suppressed_cves(
        requested_cve_rules,
        requested_component_rules,
        component_version_map,
        cve_ids_all,
        cve_namespace_map,
        user_ns_set,
    )

    # Build items
    items = [
        _build_cve_item(
            c,
            priorities,
            acceptances,
            component_map,
            suppressed_cve_ids,
            suppression_requested_cve_ids,
        )
        for c in cves
    ]

    # Filter out suppressed CVEs by default (unless show_suppressed is True)
    if not show_suppressed:
        items = [i for i in items if not i.is_suppressed]

    # Compute remediation_status for each CVE
    if items:
        item_cve_ids = [i.cve_id for i in items]
        rem_result = await app_db.execute(
            select(Remediation).where(Remediation.cve_id.in_(item_cve_ids))
        )
        all_remediations = rem_result.scalars().all()

        # Build {cve_id: [(cluster, namespace, status), ...]}
        rem_by_cve: dict[str, list[tuple[str, str, RemediationStatus]]] = {}
        for rem in all_remediations:
            rem_by_cve.setdefault(rem.cve_id, []).append(
                (rem.cluster_name, rem.namespace, rem.status)
            )

        # Get (namespace, cluster) map for affected CVEs from StackRox
        cve_ns_map = await sx.get_cve_namespace_cluster_map(
            sx_db, item_cve_ids, ns_for_components or None
        )

        terminal_statuses = {
            RemediationStatus.resolved,
            RemediationStatus.verified,
            RemediationStatus.wont_fix,
        }

        for item in items:
            rems = rem_by_cve.get(item.cve_id, [])
            affected_pairs = cve_ns_map.get(item.cve_id, set())

            if not rems or not affected_pairs:
                item.remediation_status = "unremediated"
                continue

            # Only consider remediations that match currently affected pairs
            rem_lookup: dict[tuple[str, str], RemediationStatus] = {}
            for cluster, ns, status in rems:
                if (cluster, ns) in affected_pairs:
                    rem_lookup[(cluster, ns)] = status

            if not rem_lookup:
                # Remediations exist but for pairs no longer affected
                item.remediation_status = "unremediated"
                continue

            # Check for any non-terminal (actively worked) remediation
            has_non_terminal = any(
                s not in terminal_statuses for s in rem_lookup.values()
            )
            if has_non_terminal:
                item.remediation_status = "in_progress"
            elif rem_lookup.keys() >= affected_pairs:
                # All affected pairs have terminal remediations
                item.remediation_status = "remediated"
            else:
                # Some pairs covered terminally, rest have no remediation
                item.remediation_status = "unremediated"

        # Apply remediation_status filter
        if remediation_status:
            items = [i for i in items if i.remediation_status == remediation_status]

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
        if current_user.can_see_all_namespaces:
            all_ns = await sx.list_namespaces(sx_db)
            ns_list: list[tuple[str, str]] = [
                (r["namespace"], r["cluster_name"]) for r in all_ns
            ]
        else:
            ns_list = current_user.namespaces
        comp_cve_map = await sx.get_cve_component_map(sx_db, cve_ids, ns_list)
        items = [
            i
            for i in items
            if any(comp_lower in c.lower() for c in comp_cve_map.get(i.cve_id, []))
        ]

    # Age filter (days since first_seen)
    if age_min is not None or age_max is not None:
        now = datetime.now(timezone.utc)

        def _age_days(item: CveListItem) -> int | None:
            if not item.first_seen:
                return None
            fs = (
                item.first_seen
                if item.first_seen.tzinfo
                else item.first_seen.replace(tzinfo=timezone.utc)
            )
            return (now - fs).days

        filtered = []
        for i in items:
            days = _age_days(i)
            if days is None:
                continue
            if age_min is not None and days < age_min:
                continue
            if age_max is not None and days > age_max:
                continue
            filtered.append(i)
        items = filtered

    # Deployment filter
    if deployment and items:
        cve_ids = [i.cve_id for i in items]
        if current_user.can_see_all_namespaces:
            all_ns = await sx.list_namespaces(sx_db)
            dep_ns: list[tuple[str, str]] = [
                (r["namespace"], r["cluster_name"]) for r in all_ns
            ]
        else:
            dep_ns = current_user.namespaces
        dep_ns = narrow_namespaces(dep_ns, cluster, namespace)
        dep_cve_ids = await sx.get_cve_ids_for_deployment(sx_db, deployment, dep_ns)
        dep_set = set(dep_cve_ids)
        items = [i for i in items if i.cve_id in dep_set]

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
