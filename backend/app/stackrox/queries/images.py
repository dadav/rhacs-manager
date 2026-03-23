from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ._common import _namespace_filter


async def get_threshold_preview(
    session: AsyncSession,
    min_cvss: float,
    min_epss: float,
) -> dict:
    """Preview threshold impact using image_cves_v2 with deployment joins.

    Counts distinct CVEs visible via active deployments, consistent with
    how the dashboard and CVE list queries work.
    """
    sql_total = text("""
        SELECT COUNT(DISTINCT ic.cvebaseinfo_cve)
        FROM deployments d
        JOIN deployments_containers dc ON dc.deployments_id = d.id
        JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
        WHERE ic.cvebaseinfo_cve IS NOT NULL
    """)
    sql_visible = text("""
        SELECT COUNT(*) FROM (
            SELECT ic.cvebaseinfo_cve
            FROM deployments d
            JOIN deployments_containers dc ON dc.deployments_id = d.id
            JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
            WHERE ic.cvebaseinfo_cve IS NOT NULL
            GROUP BY ic.cvebaseinfo_cve
            HAVING
                MAX(COALESCE(ic.cvss, 0)) >= :min_cvss
                AND MAX(COALESCE(ic.cvebaseinfo_epss_epssprobability, 0)) >= :min_epss
        ) sub
    """)
    total = (await session.execute(sql_total)).scalar() or 0
    visible = (await session.execute(sql_visible, {"min_cvss": min_cvss, "min_epss": min_epss})).scalar() or 0
    return {
        "total_cves": total,
        "visible_cves": visible,
        "hidden_cves": total - visible,
    }


async def get_cves_grouped_by_image(
    session: AsyncSession,
    namespaces: list[tuple[str, str]] | None = None,
    min_cvss: float = 0.0,
    min_epss: float = 0.0,
    always_show_cve_ids: set[str] | None = None,
    *,
    search: str | None = None,
    severity: int | None = None,
    fixable: bool | None = None,
    cvss_min: float | None = None,
    epss_min: float | None = None,
    component: str | None = None,
) -> list[dict]:
    """Group CVEs by container image. Returns one row per image with CVE counts and severity breakdown.

    Each row includes: image_name, image_id, total_cves, critical/high/medium/low counts,
    max_cvss, max_epss, fixable_cves, affected_deployments, and the list of namespaces.
    """
    if namespaces is not None and len(namespaces) == 0:
        return []

    always_show = list(always_show_cve_ids or [])

    ns_params: dict = {}
    if namespaces:
        ns_fragment, ns_params = _namespace_filter(namespaces)
        where_clause = f"WHERE {ns_fragment}"
    else:
        where_clause = ""

    # Build additional CTE-level filters for user-facing filters
    cte_extra_joins = ""
    cte_extra_having = ""
    params: dict = {
        "min_cvss": min_cvss,
        "min_epss": min_epss,
        "always_show": always_show,
        **ns_params,
    }

    if search:
        cte_extra_having += "\n                AND ic.cvebaseinfo_cve ILIKE :search_pat"
        params["search_pat"] = f"%{search}%"
    if severity is not None:
        cte_extra_having += "\n                AND MAX(ic.severity) = :filter_severity"
        params["filter_severity"] = severity
    if fixable is True:
        cte_extra_having += "\n                AND BOOL_OR(COALESCE(ic.isfixable, false))"
    elif fixable is False:
        cte_extra_having += "\n                AND NOT BOOL_OR(COALESCE(ic.isfixable, false))"
    if cvss_min is not None and cvss_min > 0:
        cte_extra_having += "\n                AND MAX(COALESCE(ic.cvss, 0)) >= :user_cvss_min"
        params["user_cvss_min"] = cvss_min
    if epss_min is not None and epss_min > 0:
        cte_extra_having += (
            "\n                AND MAX(COALESCE(ic.cvebaseinfo_epss_epssprobability, 0)) >= :user_epss_min"
        )
        params["user_epss_min"] = epss_min
    if component:
        cte_extra_joins = "\n            LEFT JOIN image_component_v2 comp ON comp.id = ic.componentid"
        cte_extra_having += "\n                AND BOOL_OR(comp.name ILIKE :comp_pat)"
        params["comp_pat"] = f"%{component}%"

    sql = text(f"""
        WITH visible_cves AS (
            SELECT ic.cvebaseinfo_cve AS cve_id, ic.imageid
            FROM deployments d
            JOIN deployments_containers dc ON dc.deployments_id = d.id
            JOIN image_cves_v2 ic ON ic.imageid = dc.image_id{cte_extra_joins}
            {where_clause}
            GROUP BY ic.cvebaseinfo_cve, ic.imageid
            HAVING (
                (
                    MAX(COALESCE(ic.cvss, 0)) >= :min_cvss
                    AND MAX(COALESCE(ic.cvebaseinfo_epss_epssprobability, 0)) >= :min_epss
                )
                OR ic.cvebaseinfo_cve = ANY(:always_show)
            ){cte_extra_having}
        )
        SELECT
            dc.image_name_fullname              AS image_name,
            dc.image_id                         AS image_id,
            COUNT(DISTINCT vc.cve_id)           AS total_cves,
            COUNT(DISTINCT vc.cve_id) FILTER (WHERE ic.severity = 4) AS critical_cves,
            COUNT(DISTINCT vc.cve_id) FILTER (WHERE ic.severity = 3) AS high_cves,
            COUNT(DISTINCT vc.cve_id) FILTER (WHERE ic.severity = 2) AS medium_cves,
            COUNT(DISTINCT vc.cve_id) FILTER (WHERE ic.severity <= 1) AS low_cves,
            MAX(COALESCE(ic.cvss, 0))           AS max_cvss,
            MAX(COALESCE(ic.cvebaseinfo_epss_epssprobability, 0)) AS max_epss,
            COUNT(DISTINCT vc.cve_id) FILTER (WHERE COALESCE(ic.isfixable, false)) AS fixable_cves,
            COUNT(DISTINCT d.id)                AS affected_deployments,
            ARRAY_AGG(DISTINCT d.namespace)     AS namespaces,
            ARRAY_AGG(DISTINCT d.clustername)    AS clusters
        FROM visible_cves vc
        JOIN image_cves_v2 ic ON ic.cvebaseinfo_cve = vc.cve_id
            AND ic.imageid = vc.imageid
        JOIN deployments_containers dc ON dc.image_id = ic.imageid
        JOIN deployments d ON d.id = dc.deployments_id
        {("WHERE " + ns_fragment) if namespaces else ""}
        GROUP BY dc.image_name_fullname, dc.image_id
        ORDER BY total_cves DESC
    """)
    result = await session.execute(sql, params)
    return [dict(row._mapping) for row in result]


async def get_cves_for_image(
    session: AsyncSession,
    image_id: str,
    namespaces: list[tuple[str, str]] | None = None,
    min_cvss: float = 0.0,
    min_epss: float = 0.0,
    always_show_cve_ids: set[str] | None = None,
    *,
    search: str | None = None,
    severity: int | None = None,
    fixable: bool | None = None,
    filter_cvss_min: float | None = None,
    filter_epss_min: float | None = None,
    component: str | None = None,
) -> list[dict]:
    """Get all visible CVEs for a specific image."""
    if namespaces is not None and len(namespaces) == 0:
        return []

    always_show = list(always_show_cve_ids or [])

    ns_params: dict = {}
    if namespaces:
        ns_fragment, ns_params = _namespace_filter(namespaces)
        where_clause = f"AND {ns_fragment}"
    else:
        where_clause = ""

    # Build HAVING filters for user-applied filters
    having_filters = []
    bind_params: dict = {
        "image_id": image_id,
        "min_cvss": min_cvss,
        "min_epss": min_epss,
        "always_show": always_show,
        **ns_params,
    }

    if search:
        having_filters.append("ic.cvebaseinfo_cve ILIKE :search")
        bind_params["search"] = f"%{search}%"
    if severity is not None:
        having_filters.append("MAX(ic.severity) = :filter_severity")
        bind_params["filter_severity"] = severity
    if fixable is True:
        having_filters.append("BOOL_OR(COALESCE(ic.isfixable, false)) = true")
    elif fixable is False:
        having_filters.append("BOOL_OR(COALESCE(ic.isfixable, false)) = false")
    if filter_cvss_min is not None and filter_cvss_min > 0:
        having_filters.append("MAX(COALESCE(ic.cvss, 0)) >= :filter_cvss_min")
        bind_params["filter_cvss_min"] = filter_cvss_min
    if filter_epss_min is not None and filter_epss_min > 0:
        having_filters.append("MAX(COALESCE(ic.cvebaseinfo_epss_epssprobability, 0)) >= :filter_epss_min")
        bind_params["filter_epss_min"] = filter_epss_min

    having_extra = ""
    if having_filters:
        having_extra = "AND " + " AND ".join(having_filters)

    # Component join
    component_join = ""
    component_having = ""
    if component:
        component_join = "LEFT JOIN image_component_v2 comp ON comp.id = ic.componentid"
        component_having = "AND BOOL_OR(comp.name ILIKE :component)"
        bind_params["component"] = f"%{component}%"

    sql = text(f"""
        WITH visible_cves AS (
            SELECT ic.cvebaseinfo_cve AS cve_id
            FROM deployments d
            JOIN deployments_containers dc ON dc.deployments_id = d.id
            JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
            {("WHERE " + ns_fragment) if namespaces else ""}
            GROUP BY ic.cvebaseinfo_cve
            HAVING (
                (
                    MAX(COALESCE(ic.cvss, 0)) >= :min_cvss
                    AND MAX(COALESCE(ic.cvebaseinfo_epss_epssprobability, 0)) >= :min_epss
                )
                OR ic.cvebaseinfo_cve = ANY(:always_show)
            )
        )
        SELECT
            ic.cvebaseinfo_cve              AS cve_id,
            MAX(ic.severity)                AS severity,
            MAX(COALESCE(ic.cvss, 0))       AS cvss,
            MAX(COALESCE(ic.cvebaseinfo_epss_epssprobability, 0)) AS epss_probability,
            MAX(COALESCE(ic.impactscore, 0)) AS impact_score,
            MIN(ic.firstimageoccurrence)    AS first_seen,
            MIN(ic.cvebaseinfo_publishedon) AS published_on,
            COUNT(DISTINCT dc.deployments_id) AS affected_deployments,
            BOOL_OR(COALESCE(ic.isfixable, false)) AS fixable,
            MAX(ic.fixedby)                 AS fixed_by
        FROM visible_cves vc
        JOIN image_cves_v2 ic ON ic.cvebaseinfo_cve = vc.cve_id
            AND ic.imageid = :image_id
        {component_join}
        JOIN deployments_containers dc ON dc.image_id = ic.imageid
        JOIN deployments d ON d.id = dc.deployments_id
        WHERE 1=1 {where_clause}
        GROUP BY ic.cvebaseinfo_cve
        HAVING 1=1 {having_extra} {component_having}
        ORDER BY severity DESC, cvss DESC
    """)
    result = await session.execute(sql, bind_params)
    return [dict(row._mapping) for row in result]
