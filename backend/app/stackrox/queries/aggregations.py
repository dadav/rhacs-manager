from datetime import datetime, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ._common import _namespace_filter


async def get_severity_distribution(
    session: AsyncSession,
    namespaces: list[tuple[str, str]] | None = None,
    min_cvss: float = 0.0,
    min_epss: float = 0.0,
    always_show_cve_ids: set[str] | None = None,
) -> list[dict]:
    if namespaces is not None and len(namespaces) == 0:
        return []

    always_show = list(always_show_cve_ids or [])

    ns_params: dict = {}
    if namespaces:
        ns_fragment, ns_params = _namespace_filter(namespaces)
        where_clause = f"WHERE {ns_fragment}"
    else:
        where_clause = ""

    sql = text(f"""
        WITH visible_cves AS (
            SELECT
                ic.cvebaseinfo_cve AS cve_id,
                MAX(ic.severity) AS severity
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
        SELECT severity, COUNT(*) AS count
        FROM visible_cves
        GROUP BY severity
        ORDER BY severity
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


async def get_cves_per_namespace(
    session: AsyncSession,
    namespaces: list[tuple[str, str]] | None = None,
    min_cvss: float = 0.0,
    min_epss: float = 0.0,
    always_show_cve_ids: set[str] | None = None,
) -> list[dict]:
    if namespaces is not None and len(namespaces) == 0:
        return []

    always_show = list(always_show_cve_ids or [])

    ns_params: dict = {}
    if namespaces:
        ns_fragment, ns_params = _namespace_filter(namespaces)
        where_clause = f"WHERE {ns_fragment}"
    else:
        where_clause = ""

    sql = text(f"""
        WITH visible_by_ns_cluster AS (
            SELECT
                d.namespace AS namespace,
                d.clustername AS cluster,
                ic.cvebaseinfo_cve AS cve_id,
                MAX(ic.severity) AS severity
            FROM deployments d
            JOIN deployments_containers dc ON dc.deployments_id = d.id
            JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
            {where_clause}
            GROUP BY d.namespace, d.clustername, ic.cvebaseinfo_cve
            HAVING (
                (
                    MAX(COALESCE(ic.cvss, 0)) >= :min_cvss
                    AND MAX(COALESCE(ic.cvebaseinfo_epss_epssprobability, 0)) >= :min_epss
                )
                OR ic.cvebaseinfo_cve = ANY(:always_show)
            )
        ),
        deduped AS (
            SELECT DISTINCT namespace, cve_id, MAX(severity) AS severity
            FROM visible_by_ns_cluster
            GROUP BY namespace, cve_id
        )
        SELECT
            d.namespace,
            COUNT(*) AS count,
            COUNT(*) FILTER (WHERE d.severity = 4) AS critical,
            COUNT(*) FILTER (WHERE d.severity = 3) AS important,
            COUNT(*) FILTER (WHERE d.severity = 2) AS moderate,
            COUNT(*) FILTER (WHERE d.severity = 1) AS low,
            COUNT(*) FILTER (WHERE d.severity = 0 OR d.severity IS NULL) AS unknown,
            (SELECT COUNT(DISTINCT cluster) FROM visible_by_ns_cluster vc
                WHERE vc.namespace = d.namespace) AS cluster_count
        FROM deduped d
        GROUP BY d.namespace
        ORDER BY count DESC
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


async def get_cves_by_namespace_detail(
    session: AsyncSession,
    namespaces: list[tuple[str, str]],
    min_cvss: float = 0.0,
    min_epss: float = 0.0,
    always_show_cve_ids: set[str] | None = None,
) -> list[dict]:
    """CVEs grouped by (cve_id, namespace, cluster) — for escalation scheduler.

    Unlike get_cves_for_namespaces which aggregates across all namespaces,
    this returns one row per (cve_id, namespace, cluster) so escalations
    can be created with the actual namespace where the CVE exists.
    """
    if not namespaces:
        return []

    always_show = list(always_show_cve_ids or [])

    ns_fragment, ns_params = _namespace_filter(namespaces)

    sql = text(f"""
        SELECT
            ic.cvebaseinfo_cve              AS cve_id,
            d.namespace,
            d.clustername                   AS cluster_name,
            MAX(ic.severity)                AS severity,
            MAX(COALESCE(ic.cvebaseinfo_epss_epssprobability, 0)) AS epss_probability,
            MIN(ic.firstimageoccurrence)    AS first_seen,
            MAX(COALESCE(ic.cvss, 0))       AS cvss
        FROM deployments d
        JOIN deployments_containers dc ON dc.deployments_id = d.id
        JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
        WHERE {ns_fragment}
        GROUP BY ic.cvebaseinfo_cve, d.namespace, d.clustername
        HAVING (
            (
                MAX(COALESCE(ic.cvss, 0)) >= :min_cvss
                AND MAX(COALESCE(ic.cvebaseinfo_epss_epssprobability, 0)) >= :min_epss
            )
            OR ic.cvebaseinfo_cve = ANY(:always_show)
        )
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


async def get_cve_trend(
    session: AsyncSession,
    namespaces: list[tuple[str, str]] | None = None,
    days: int = 90,
    min_cvss: float = 0.0,
    min_epss: float = 0.0,
    always_show_cve_ids: set[str] | None = None,
) -> list[dict]:
    """CVE first-seen trend per day over the last N days, broken down by severity."""
    since = datetime.utcnow() - timedelta(days=days)

    if namespaces is not None and len(namespaces) == 0:
        return []

    always_show = list(always_show_cve_ids or [])

    ns_params: dict = {}
    if namespaces:
        ns_fragment, ns_params = _namespace_filter(namespaces)
        where_clause = f"AND {ns_fragment}"
    else:
        where_clause = ""

    sql = text(f"""
        WITH visible_cves AS (
            SELECT
                ic.cvebaseinfo_cve AS cve_id,
                MIN(ic.firstimageoccurrence) AS first_seen,
                MAX(ic.severity) AS severity
            FROM deployments d
            JOIN deployments_containers dc ON dc.deployments_id = d.id
            JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
            WHERE ic.firstimageoccurrence >= :since
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
            DATE(first_seen) AS date,
            COUNT(*) FILTER (WHERE severity = 4) AS critical,
            COUNT(*) FILTER (WHERE severity = 3) AS important,
            COUNT(*) FILTER (WHERE severity = 2) AS moderate,
            COUNT(*) FILTER (WHERE severity = 1) AS low
        FROM visible_cves
        GROUP BY DATE(first_seen)
        ORDER BY date
    """)
    result = await session.execute(
        sql,
        {
            "since": since,
            "min_cvss": min_cvss,
            "min_epss": min_epss,
            "always_show": always_show,
            **ns_params,
        },
    )
    return [
        {
            "date": str(row.date),
            "critical": row.critical,
            "important": row.important,
            "moderate": row.moderate,
            "low": row.low,
        }
        for row in result
    ]


async def get_epss_risk_matrix(
    session: AsyncSession,
    namespaces: list[tuple[str, str]] | None = None,
    min_cvss: float = 0.0,
    min_epss: float = 0.0,
    always_show_cve_ids: set[str] | None = None,
) -> list[dict]:
    """CVEs with cvss+epss for scatter plot. None namespaces = all."""
    if namespaces is not None and len(namespaces) == 0:
        return []

    always_show = list(always_show_cve_ids or [])

    ns_params: dict = {}
    if namespaces:
        ns_fragment, ns_params = _namespace_filter(namespaces)
        where_clause = f"WHERE {ns_fragment}"
    else:
        where_clause = ""

    sql = text(f"""
        SELECT
            ic.cvebaseinfo_cve AS cve_id,
            MAX(COALESCE(ic.cvss, 0)) AS cvss,
            MAX(COALESCE(ic.cvebaseinfo_epss_epssprobability, 0)) AS epss,
            MAX(ic.severity) AS severity
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


async def get_cluster_heatmap(
    session: AsyncSession,
    namespaces: list[tuple[str, str]] | None = None,
    min_cvss: float = 0.0,
    min_epss: float = 0.0,
    always_show_cve_ids: set[str] | None = None,
) -> list[dict]:
    """CVE counts per cluster per severity."""
    if namespaces is not None and len(namespaces) == 0:
        return []

    always_show = list(always_show_cve_ids or [])

    ns_params: dict = {}
    if namespaces:
        ns_fragment, ns_params = _namespace_filter(namespaces)
        where_clause = f"WHERE {ns_fragment}"
    else:
        where_clause = ""

    sql = text(f"""
        WITH visible_cves AS (
            SELECT
                ic.cvebaseinfo_cve AS cve_id,
                MAX(ic.severity) AS severity
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
            d.clustername AS cluster,
            vc.severity,
            COUNT(DISTINCT vc.cve_id) AS count
        FROM visible_cves vc
        JOIN image_cves_v2 ic ON ic.cvebaseinfo_cve = vc.cve_id
        JOIN deployments_containers dc ON dc.image_id = ic.imageid
        JOIN deployments d ON d.id = dc.deployments_id
        {where_clause}
        GROUP BY d.clustername, vc.severity
        ORDER BY d.clustername, vc.severity
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
    rows = [dict(row._mapping) for row in result]

    # Pivot into one row per cluster
    clusters: dict[str, dict] = {}
    for row in rows:
        c = row["cluster"]
        if c not in clusters:
            clusters[c] = {
                "cluster": c,
                "unknown": 0,
                "low": 0,
                "moderate": 0,
                "important": 0,
                "critical": 0,
                "total": 0,
            }
        severity_map = {
            0: "unknown",
            1: "low",
            2: "moderate",
            3: "important",
            4: "critical",
        }
        key = severity_map.get(row["severity"], "unknown")
        clusters[c][key] = row["count"]
        clusters[c]["total"] += row["count"]

    return list(clusters.values())
