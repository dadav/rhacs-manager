from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ._common import _namespace_filter


async def get_cves_for_namespaces(
    session: AsyncSession,
    namespaces: list[tuple[str, str]],  # (namespace, cluster_name)
    min_cvss: float = 0.0,
    min_epss: float = 0.0,
    always_show_cve_ids: set[str] | None = None,
) -> list[dict]:
    """Core CVE query: returns CVEs visible in the given namespaces."""
    if not namespaces:
        return []

    always_show = list(always_show_cve_ids or [])

    ns_fragment, ns_params = _namespace_filter(namespaces)

    sql = text(f"""
        SELECT
            ic.cvebaseinfo_cve              AS cve_id,
            MAX(ic.severity)                AS severity,
            MAX(COALESCE(ic.cvss, 0))       AS cvss,
            MAX(COALESCE(ic.cvebaseinfo_epss_epssprobability, 0)) AS epss_probability,
            MAX(COALESCE(ic.impactscore, 0)) AS impact_score,
            NULLIF(MAX(COALESCE(comp.operatingsystem, '')), '') AS operating_system,
            MIN(ic.firstimageoccurrence)    AS first_seen,
            MIN(ic.cvebaseinfo_publishedon) AS published_on,
            COUNT(DISTINCT dc.image_id)     AS affected_images,
            COUNT(DISTINCT dc.deployments_id) AS affected_deployments,
            BOOL_OR(COALESCE(ic.isfixable, false)) AS fixable,
            MAX(ic.fixedby)                 AS fixed_by
        FROM deployments d
        JOIN deployments_containers dc ON dc.deployments_id = d.id
        JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
        LEFT JOIN image_component_v2 comp ON comp.id = ic.componentid
        WHERE {ns_fragment}
        GROUP BY ic.cvebaseinfo_cve
        HAVING (
            (
                MAX(COALESCE(ic.cvss, 0)) >= :min_cvss
                AND MAX(COALESCE(ic.cvebaseinfo_epss_epssprobability, 0)) >= :min_epss
            )
            OR ic.cvebaseinfo_cve = ANY(:always_show)
        )
        ORDER BY severity DESC, cvss DESC
    """)

    result = await session.execute(
        sql,
        {
            "min_cvss": min_cvss,
            "min_epss": min_epss,
            "always_show": always_show,
            **ns_params,
        },
    )
    return [dict(row._mapping) for row in result]


async def get_cve_detail(
    session: AsyncSession,
    cve_id: str,
    namespaces: list[tuple[str, str]],
) -> dict | None:
    if not namespaces:
        return None

    ns_fragment, ns_params = _namespace_filter(namespaces)

    sql = text(f"""
        SELECT
            ic.cvebaseinfo_cve              AS cve_id,
            MAX(ic.severity)                AS severity,
            MAX(COALESCE(ic.cvss, 0))       AS cvss,
            MAX(COALESCE(ic.cvebaseinfo_epss_epssprobability, 0)) AS epss_probability,
            MAX(COALESCE(ic.impactscore, 0)) AS impact_score,
            NULLIF(MAX(COALESCE(comp.operatingsystem, '')), '') AS operating_system,
            MIN(ic.firstimageoccurrence)    AS first_seen,
            MIN(ic.cvebaseinfo_publishedon) AS published_on,
            COUNT(DISTINCT dc.image_id)     AS affected_images,
            COUNT(DISTINCT dc.deployments_id) AS affected_deployments,
            BOOL_OR(COALESCE(ic.isfixable, false)) AS fixable,
            MAX(ic.fixedby)                 AS fixed_by
        FROM deployments d
        JOIN deployments_containers dc ON dc.deployments_id = d.id
        JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
        LEFT JOIN image_component_v2 comp ON comp.id = ic.componentid
        WHERE {ns_fragment}
          AND ic.cvebaseinfo_cve = :cve_id
        GROUP BY ic.cvebaseinfo_cve
    """)

    result = await session.execute(sql, {"cve_id": cve_id, **ns_params})
    row = result.fetchone()
    return dict(row._mapping) if row else None


async def get_affected_deployments(
    session: AsyncSession,
    cve_id: str,
    namespaces: list[tuple[str, str]],
) -> list[dict]:
    if not namespaces:
        return []

    ns_fragment, ns_params = _namespace_filter(namespaces)

    sql = text(f"""
        SELECT
            d.id            AS deployment_id,
            d.name          AS deployment_name,
            d.namespace,
            d.clustername   AS cluster_name,
            dc.image_name_fullname AS image_name,
            MIN(ic.firstimageoccurrence) AS first_seen
        FROM deployments d
        JOIN deployments_containers dc ON dc.deployments_id = d.id
        JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
        WHERE {ns_fragment}
          AND ic.cvebaseinfo_cve = :cve_id
        GROUP BY d.id, d.name, d.namespace, d.clustername, dc.image_name_fullname
        ORDER BY d.namespace, d.name
    """)
    result = await session.execute(sql, {"cve_id": cve_id, **ns_params})
    return [dict(row._mapping) for row in result]


async def get_affected_components(
    session: AsyncSession,
    cve_id: str,
    namespaces: list[tuple[str, str]],
) -> list[dict]:
    if not namespaces:
        return []

    ns_fragment, ns_params = _namespace_filter(namespaces)

    sql = text(f"""
        SELECT DISTINCT
            comp.name       AS component_name,
            comp.version    AS component_version,
            COALESCE(ic.isfixable, false) AS fixable,
            ic.fixedby      AS fixed_by
        FROM deployments d
        JOIN deployments_containers dc ON dc.deployments_id = d.id
        JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
        JOIN image_component_v2 comp ON comp.id = ic.componentid
        WHERE {ns_fragment}
          AND ic.cvebaseinfo_cve = :cve_id
          AND comp.name IS NOT NULL
        ORDER BY comp.name, comp.version
    """)
    result = await session.execute(sql, {"cve_id": cve_id, **ns_params})
    return [dict(row._mapping) for row in result]


async def get_all_cves(
    session: AsyncSession,
    min_cvss: float = 0.0,
    min_epss: float = 0.0,
    always_show_cve_ids: set[str] | None = None,
) -> list[dict]:
    """All CVEs across all namespaces — for sec team."""
    always_show = list(always_show_cve_ids or [])

    sql = text("""
        SELECT
            ic.cvebaseinfo_cve              AS cve_id,
            MAX(ic.severity)                AS severity,
            MAX(COALESCE(ic.cvss, 0))       AS cvss,
            MAX(COALESCE(ic.cvebaseinfo_epss_epssprobability, 0)) AS epss_probability,
            MAX(COALESCE(ic.impactscore, 0)) AS impact_score,
            NULLIF(MAX(COALESCE(comp.operatingsystem, '')), '') AS operating_system,
            MIN(ic.firstimageoccurrence)    AS first_seen,
            MIN(ic.cvebaseinfo_publishedon) AS published_on,
            COUNT(DISTINCT dc.image_id)     AS affected_images,
            COUNT(DISTINCT dc.deployments_id) AS affected_deployments,
            BOOL_OR(COALESCE(ic.isfixable, false)) AS fixable,
            MAX(ic.fixedby)                 AS fixed_by
        FROM deployments d
        JOIN deployments_containers dc ON dc.deployments_id = d.id
        JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
        LEFT JOIN image_component_v2 comp ON comp.id = ic.componentid
        GROUP BY ic.cvebaseinfo_cve
        HAVING (
            (
                MAX(COALESCE(ic.cvss, 0)) >= :min_cvss
                AND MAX(COALESCE(ic.cvebaseinfo_epss_epssprobability, 0)) >= :min_epss
            )
            OR ic.cvebaseinfo_cve = ANY(:always_show)
        )
        ORDER BY severity DESC, cvss DESC
    """)
    result = await session.execute(sql, {"min_cvss": min_cvss, "min_epss": min_epss, "always_show": always_show})
    return [dict(row._mapping) for row in result]
