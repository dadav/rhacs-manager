from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ._common import _namespace_filter


async def list_namespaces(session: AsyncSession) -> list[dict]:
    sql = text("""
        SELECT DISTINCT namespace, clustername AS cluster_name
        FROM deployments
        ORDER BY clustername, namespace
    """)
    result = await session.execute(sql)
    return [dict(row._mapping) for row in result]


async def get_cves_by_ids(
    session: AsyncSession,
    cve_ids: list[str],
) -> list[dict]:
    if not cve_ids:
        return []
    sql = text("""
        SELECT
            ic.cvebaseinfo_cve AS cve_id,
            MAX(ic.severity) AS severity,
            MAX(COALESCE(ic.cvss, 0)) AS cvss,
            MAX(COALESCE(ic.cvebaseinfo_epss_epssprobability, 0)) AS epss_probability,
            MAX(COALESCE(ic.impactscore, 0)) AS impact_score,
            MAX(ic.operatingsystem) AS operatingsystem
        FROM image_cves_v2 ic
        WHERE ic.cvebaseinfo_cve = ANY(:cve_ids)
        GROUP BY ic.cvebaseinfo_cve
    """)
    result = await session.execute(sql, {"cve_ids": cve_ids})
    return [dict(row._mapping) for row in result]


async def get_namespaces_with_cve(
    session: AsyncSession,
    cve_id: str,
) -> list[tuple[str, str]]:
    """All (namespace, cluster) pairs where a CVE is present — for sec team escalation."""
    sql = text("""
        SELECT DISTINCT d.namespace, d.clustername
        FROM deployments d
        JOIN deployments_containers dc ON dc.deployments_id = d.id
        JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
        WHERE ic.cvebaseinfo_cve = :cve_id
    """)
    result = await session.execute(sql, {"cve_id": cve_id})
    return [(row.namespace, row.clustername) for row in result]


async def get_cve_namespace_map(
    session: AsyncSession,
    cve_ids: list[str],
    namespaces: list[tuple[str, str]],
) -> dict[str, list[str]]:
    """Returns {cve_id: [namespace, ...]} for the given CVEs within the given namespaces."""
    if not cve_ids or not namespaces:
        return {}
    ns_fragment, ns_params = _namespace_filter(namespaces)
    sql = text(f"""
        SELECT DISTINCT ic.cvebaseinfo_cve AS cve_id, d.namespace
        FROM deployments d
        JOIN deployments_containers dc ON dc.deployments_id = d.id
        JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
        WHERE {ns_fragment}
          AND ic.cvebaseinfo_cve = ANY(:cve_ids)
    """)
    result = await session.execute(sql, {"cve_ids": cve_ids, **ns_params})
    mapping: dict[str, list[str]] = {}
    for row in result:
        mapping.setdefault(row.cve_id, []).append(row.namespace)
    return mapping


async def get_cve_namespace_cluster_map(
    session: AsyncSession,
    cve_ids: list[str],
    namespaces: list[tuple[str, str]] | None = None,
) -> dict[str, set[tuple[str, str]]]:
    """Returns {cve_id: {(cluster_name, namespace), ...}} for the given CVEs.

    If namespaces is None, returns data for all namespaces.
    """
    if not cve_ids:
        return {}
    if namespaces is not None and not namespaces:
        return {}

    ns_params: dict = {}
    if namespaces:
        ns_fragment, ns_params = _namespace_filter(namespaces)
        ns_filter = f"AND {ns_fragment}"
    else:
        ns_filter = ""

    sql = text(f"""
        SELECT DISTINCT ic.cvebaseinfo_cve AS cve_id, d.clustername, d.namespace
        FROM deployments d
        JOIN deployments_containers dc ON dc.deployments_id = d.id
        JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
        WHERE ic.cvebaseinfo_cve = ANY(:cve_ids)
          {ns_filter}
    """)
    result = await session.execute(sql, {"cve_ids": cve_ids, **ns_params})
    mapping: dict[str, set[tuple[str, str]]] = {}
    for row in result:
        mapping.setdefault(row.cve_id, set()).add((row.clustername, row.namespace))
    return mapping


async def get_top_vulnerable_components(
    session: AsyncSession,
    namespaces: list[tuple[str, str]] | None = None,
    min_cvss: float = 0.0,
    min_epss: float = 0.0,
    always_show_cve_ids: set[str] | None = None,
    limit: int = 10,
) -> list[dict]:
    """Top N components by CVE count, respecting visibility filters."""
    if namespaces is not None and len(namespaces) == 0:
        return []

    always_show = list(always_show_cve_ids or [])

    ns_params: dict = {}
    if namespaces:
        ns_fragment, ns_params = _namespace_filter(namespaces)
        where_clause = f"WHERE {ns_fragment}"
        ns_filter = f"AND {ns_fragment}"
    else:
        where_clause = ""
        ns_filter = ""

    sql = text(f"""
        WITH visible_cves AS (
            SELECT ic.cvebaseinfo_cve AS cve_id
            FROM deployments d
            JOIN deployments_containers dc ON dc.deployments_id = d.id
            JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
            {where_clause}
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
            comp.name AS component_name,
            COUNT(DISTINCT vc.cve_id) AS cve_count,
            COUNT(DISTINCT vc.cve_id) FILTER (
                WHERE ic.isfixable = true
            ) AS fixable_count,
            COUNT(DISTINCT vc.cve_id) FILTER (
                WHERE ic.isfixable IS DISTINCT FROM true
            ) AS unfixable_count
        FROM visible_cves vc
        JOIN image_cves_v2 ic ON ic.cvebaseinfo_cve = vc.cve_id
        JOIN image_component_v2 comp ON comp.id = ic.componentid
        JOIN deployments_containers dc ON dc.image_id = ic.imageid
        JOIN deployments d ON d.id = dc.deployments_id
        WHERE comp.name IS NOT NULL {ns_filter}
        GROUP BY comp.name
        ORDER BY cve_count DESC
        LIMIT :limit
    """)
    result = await session.execute(
        sql,
        {
            "min_cvss": min_cvss,
            "min_epss": min_epss,
            "always_show": always_show,
            "limit": limit,
            **ns_params,
        },
    )
    return [dict(row._mapping) for row in result]


async def get_cve_component_map(
    session: AsyncSession,
    cve_ids: list[str],
    namespaces: list[tuple[str, str]],
) -> dict[str, list[str]]:
    """Returns {cve_id: [component_name, ...]} for the given CVEs within the given namespaces."""
    if not cve_ids or not namespaces:
        return {}
    ns_fragment, ns_params = _namespace_filter(namespaces)
    sql = text(f"""
        SELECT DISTINCT ic.cvebaseinfo_cve AS cve_id, comp.name AS component_name
        FROM deployments d
        JOIN deployments_containers dc ON dc.deployments_id = d.id
        JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
        LEFT JOIN image_component_v2 comp ON comp.id = ic.componentid
        WHERE {ns_fragment}
          AND ic.cvebaseinfo_cve = ANY(:cve_ids)
          AND comp.name IS NOT NULL
    """)
    result = await session.execute(sql, {"cve_ids": cve_ids, **ns_params})
    mapping: dict[str, list[str]] = {}
    for row in result:
        mapping.setdefault(row.cve_id, []).append(row.component_name)
    return mapping


async def get_cve_component_version_map(
    session: AsyncSession,
    cve_ids: list[str],
    namespaces: list[tuple[str, str]],
) -> dict[str, list[tuple[str, str]]]:
    """Returns {cve_id: [(component_name, component_version), ...]} for suppression rule matching."""
    if not cve_ids or not namespaces:
        return {}
    ns_fragment, ns_params = _namespace_filter(namespaces)
    sql = text(f"""
        SELECT DISTINCT
            ic.cvebaseinfo_cve AS cve_id,
            comp.name AS component_name,
            comp.version AS component_version
        FROM deployments d
        JOIN deployments_containers dc ON dc.deployments_id = d.id
        JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
        LEFT JOIN image_component_v2 comp ON comp.id = ic.componentid
        WHERE {ns_fragment}
          AND ic.cvebaseinfo_cve = ANY(:cve_ids)
          AND comp.name IS NOT NULL
    """)
    result = await session.execute(sql, {"cve_ids": cve_ids, **ns_params})
    mapping: dict[str, list[tuple[str, str]]] = {}
    for row in result:
        mapping.setdefault(row.cve_id, []).append((row.component_name, row.component_version or ""))
    return mapping


async def get_all_deployed_cve_ids(session: AsyncSession) -> list[str]:
    """Return all distinct CVE IDs currently present in deployed images (global, no namespace filter)."""
    sql = text("""
        SELECT DISTINCT ic.cvebaseinfo_cve AS cve_id
        FROM deployments d
        JOIN deployments_containers dc ON dc.deployments_id = d.id
        JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
    """)
    result = await session.execute(sql)
    return [row.cve_id for row in result]


async def get_global_component_version_map(
    session: AsyncSession,
) -> dict[str, list[tuple[str, str]]]:
    """Return {cve_id: [(component_name, version), ...]} for all deployed CVEs (global, no namespace filter)."""
    sql = text("""
        SELECT DISTINCT
            ic.cvebaseinfo_cve AS cve_id,
            comp.name AS component_name,
            comp.version AS component_version
        FROM deployments d
        JOIN deployments_containers dc ON dc.deployments_id = d.id
        JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
        LEFT JOIN image_component_v2 comp ON comp.id = ic.componentid
        WHERE comp.name IS NOT NULL
    """)
    result = await session.execute(sql)
    mapping: dict[str, list[tuple[str, str]]] = {}
    for row in result:
        mapping.setdefault(row.cve_id, []).append((row.component_name, row.component_version or ""))
    return mapping
