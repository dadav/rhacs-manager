"""Component fix roll-up: "upgrade component X from a to b, fixes N CVEs in M images".

Visibility is inherited, not re-implemented: the CVE set comes from
``fetch_filtered_cves`` (thresholds, always-show bypass, suppression, remediated
hiding, and every /cves filter), so the roll-up can never show a CVE that the
CVE list hides. StackRox is then only asked which components carry those CVEs,
restricted to the same namespaces.
"""

import logging
from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser
from ..routers._scope import narrow_namespaces
from ..schemas.cve import CveListItem, SeverityLevel
from ..schemas.fix_rollup import FixRollupCve, FixRollupImage, FixRollupItem, FixRollupResponse
from ..stackrox import queries as sx
from .cve_filter_service import fetch_filtered_cves
from .version_compare import rank_versions

logger = logging.getLogger(__name__)

SORT_KEYS = (
    "fixable_cves",
    "total_cves",
    "max_epss",
    "max_cvss",
    "affected_images",
    "affected_deployments",
    "component_name",
)


@dataclass
class _ComponentAccumulator:
    component_name: str
    component_version: str
    operating_system: str
    cves: dict[str, FixRollupCve] = field(default_factory=dict)
    image_names: dict[str, str] = field(default_factory=dict)
    deployment_ids: set[str] = field(default_factory=set)
    namespaces: set[str] = field(default_factory=set)


async def resolve_scope_namespaces(
    current_user: CurrentUser,
    sx_db: AsyncSession,
    cluster: str | None,
    namespace: str | None,
) -> list[tuple[str, str]] | None:
    """Namespaces the query may touch. None means org-wide without a filter."""
    if current_user.can_see_all_namespaces:
        if cluster is None and namespace is None:
            return None
        all_ns = await sx.list_namespaces(sx_db)
        return narrow_namespaces([(r["namespace"], r["cluster_name"]) for r in all_ns], cluster, namespace)
    return narrow_namespaces(current_user.namespaces, cluster, namespace)


def aggregate_component_rows(rows: list[dict], visible: dict[str, CveListItem]) -> list[FixRollupItem]:
    """Merge per-(component, CVE) rows into one item per component version."""
    by_component: dict[tuple[str, str, str], _ComponentAccumulator] = {}
    for row in rows:
        cve = visible.get(row["cve_id"])
        if cve is None:
            continue
        key = (row["component_name"], row["component_version"], row["operating_system"])
        acc = by_component.get(key)
        if acc is None:
            acc = _ComponentAccumulator(*key)
            by_component[key] = acc
        best, candidates, _ = rank_versions(row["fixed_by_versions"] or [])
        acc.cves[cve.cve_id] = FixRollupCve(
            cve_id=cve.cve_id,
            severity=cve.severity,
            cvss=cve.cvss,
            epss_probability=cve.epss_probability,
            fixable=bool(row["fixable"]),
            fixed_by=best,
            fix_candidates=candidates,
            has_priority=cve.has_priority,
        )
        # Pairs are sorted by (id, name), so the name kept per ID is deterministic.
        for image_id, image_name in row["image_pairs"] or []:
            if image_id:
                acc.image_names.setdefault(image_id, image_name or image_id)
        acc.deployment_ids.update(d for d in row["deployment_ids"] or [] if d)
        acc.namespaces.update(n for n in row["namespaces"] or [] if n)
    return [_to_item(acc) for acc in by_component.values()]


def _to_item(acc: _ComponentAccumulator) -> FixRollupItem:
    cves = sorted(acc.cves.values(), key=lambda c: (not c.has_priority, -c.severity.value, -c.epss_probability))
    fixable = [c for c in cves if c.fixable]
    target, fix_versions, uncertain = rank_versions([v for c in fixable for v in c.fix_candidates])
    return FixRollupItem(
        component_name=acc.component_name,
        component_version=acc.component_version,
        operating_system=acc.operating_system,
        target_version=target,
        fix_versions=fix_versions,
        target_uncertain=uncertain,
        total_cves=len(cves),
        fixable_cves=len(fixable),
        prioritized_cves=sum(1 for c in cves if c.has_priority),
        critical_cves=sum(1 for c in cves if c.severity == SeverityLevel.CRITICAL),
        max_severity=max((c.severity for c in cves), key=lambda s: s.value),
        max_cvss=max(c.cvss for c in cves),
        max_epss=max(c.epss_probability for c in cves),
        affected_images=len(acc.image_names),
        affected_deployments=len(acc.deployment_ids),
        namespaces=sorted(acc.namespaces),
        images=[
            FixRollupImage(image_id=i, image_name=n) for i, n in sorted(acc.image_names.items(), key=lambda x: x[1])
        ],
        cves=cves,
    )


def sort_items(items: list[FixRollupItem], sort_by: str, sort_desc: bool) -> list[FixRollupItem]:
    """Components holding prioritized CVEs always come first (same rule as /cves)."""
    if sort_by not in SORT_KEYS:
        sort_by = "fixable_cves"
    # Stable multi-pass sort: tie-breakers first, primary key last.
    items = sorted(items, key=lambda i: (i.component_name, i.component_version))
    items = sorted(items, key=lambda i: i.max_epss, reverse=True)
    items = sorted(items, key=lambda i: getattr(i, sort_by), reverse=sort_desc)
    return sorted(items, key=lambda i: i.prioritized_cves == 0)


async def build_fix_rollup(
    current_user: CurrentUser,
    app_db: AsyncSession,
    sx_db: AsyncSession,
    *,
    page: int,
    page_size: int,
    sort_by: str,
    sort_desc: bool,
    image_id: str | None,
    fixable_only: bool,
    filters: dict,
) -> FixRollupResponse:
    """Build one page of the component roll-up.

    ``filters`` are passed unchanged to ``fetch_filtered_cves`` (the /cves filters).
    ``fixable_only`` drops components without any fixable CVE.
    """
    # For one image or deployment, compute visibility only in the namespaces
    # running it instead of the user's whole scope (org-wide for sec team).
    deployment_id = filters.get("deployment_id")
    restrict: list[tuple[str, str]] | None = None
    if image_id:
        restrict = await sx.get_image_namespaces(sx_db, image_id)
    elif deployment_id:
        restrict = await sx.get_deployment_namespaces(sx_db, deployment_id)
    if restrict == []:
        visible_items = []
    else:
        visible_items = await fetch_filtered_cves(current_user, app_db, sx_db, restrict_namespaces=restrict, **filters)
    visible = {i.cve_id: i for i in visible_items}
    namespaces = await resolve_scope_namespaces(current_user, sx_db, filters.get("cluster"), filters.get("namespace"))

    rows = await sx.get_component_cve_rows(
        sx_db,
        list(visible),
        namespaces,
        image_id=image_id,
        deployment_name=filters.get("deployment"),
        deployment_id=deployment_id,
    )
    items = aggregate_component_rows(rows, visible)
    if fixable_only:
        items = [i for i in items if i.fixable_cves > 0]
    items = sort_items(items, sort_by, sort_desc)

    mapped = {row["cve_id"] for row in rows}
    # With image_id the visible set covers the image's namespaces, not only the
    # image, so "visible but not in any row" is not meaningful there.
    unmapped = 0 if image_id else len(set(visible) - mapped)
    logger.info(
        "fix_rollup_built",
        extra={
            "user_id": current_user.id,
            "visible_cves": len(visible),
            "components": len(items),
            "unmapped_cves": unmapped,
            "image_id": image_id,
            "deployment_id": deployment_id,
        },
    )
    start = (page - 1) * page_size
    return FixRollupResponse(
        items=items[start : start + page_size],
        total=len(items),
        page=page,
        page_size=page_size,
        visible_cves=len(visible),
        unmapped_cves=unmapped,
    )
