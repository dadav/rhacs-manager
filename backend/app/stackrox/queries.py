"""
Read-only queries against the StackRox central_active PostgreSQL database.
All functions accept an AsyncSession connected to the StackRox DB.
"""

from datetime import datetime, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


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

    # Build namespace pairs for the ANY(ARRAY[...]) clause
    ns_pairs = [f"('{ns}','{cl}')" for ns, cl in namespaces]
    ns_values = ", ".join(ns_pairs)

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
        WHERE (d.namespace, d.clustername) IN ({ns_values})
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
        {"min_cvss": min_cvss, "min_epss": min_epss, "always_show": always_show},
    )
    return [dict(row._mapping) for row in result]


async def get_cve_detail(
    session: AsyncSession,
    cve_id: str,
    namespaces: list[tuple[str, str]],
) -> dict | None:
    if not namespaces:
        return None

    ns_pairs = [f"('{ns}','{cl}')" for ns, cl in namespaces]
    ns_values = ", ".join(ns_pairs)

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
        WHERE (d.namespace, d.clustername) IN ({ns_values})
          AND ic.cvebaseinfo_cve = :cve_id
        GROUP BY ic.cvebaseinfo_cve
    """)

    result = await session.execute(sql, {"cve_id": cve_id})
    row = result.fetchone()
    return dict(row._mapping) if row else None


async def get_affected_deployments(
    session: AsyncSession,
    cve_id: str,
    namespaces: list[tuple[str, str]],
) -> list[dict]:
    if not namespaces:
        return []

    ns_pairs = [f"('{ns}','{cl}')" for ns, cl in namespaces]
    ns_values = ", ".join(ns_pairs)

    sql = text(f"""
        SELECT DISTINCT
            d.id            AS deployment_id,
            d.name          AS deployment_name,
            d.namespace,
            d.clustername   AS cluster_name,
            dc.image_name_fullname AS image_name
        FROM deployments d
        JOIN deployments_containers dc ON dc.deployments_id = d.id
        JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
        WHERE (d.namespace, d.clustername) IN ({ns_values})
          AND ic.cvebaseinfo_cve = :cve_id
        ORDER BY d.namespace, d.name
    """)
    result = await session.execute(sql, {"cve_id": cve_id})
    return [dict(row._mapping) for row in result]


async def get_affected_components(
    session: AsyncSession,
    cve_id: str,
    namespaces: list[tuple[str, str]],
) -> list[dict]:
    if not namespaces:
        return []

    ns_pairs = [f"('{ns}','{cl}')" for ns, cl in namespaces]
    ns_values = ", ".join(ns_pairs)

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
        WHERE (d.namespace, d.clustername) IN ({ns_values})
          AND ic.cvebaseinfo_cve = :cve_id
          AND comp.name IS NOT NULL
        ORDER BY comp.name, comp.version
    """)
    result = await session.execute(sql, {"cve_id": cve_id})
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
    result = await session.execute(
        sql, {"min_cvss": min_cvss, "min_epss": min_epss, "always_show": always_show}
    )
    return [dict(row._mapping) for row in result]


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

    if namespaces:
        ns_pairs = [f"('{ns}','{cl}')" for ns, cl in namespaces]
        ns_values = ", ".join(ns_pairs)
        where_clause = f"WHERE (d.namespace, d.clustername) IN ({ns_values})"
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
        {"min_cvss": min_cvss, "min_epss": min_epss, "always_show": always_show},
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

    if namespaces:
        ns_pairs = [f"('{ns}','{cl}')" for ns, cl in namespaces]
        ns_values = ", ".join(ns_pairs)
        where_clause = f"WHERE (d.namespace, d.clustername) IN ({ns_values})"
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
            (SELECT COUNT(DISTINCT cluster) FROM visible_by_ns_cluster vc WHERE vc.namespace = d.namespace) AS cluster_count
        FROM deduped d
        GROUP BY d.namespace
        ORDER BY count DESC
    """)
    result = await session.execute(
        sql,
        {"min_cvss": min_cvss, "min_epss": min_epss, "always_show": always_show},
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

    ns_pairs = [f"('{ns}','{cl}')" for ns, cl in namespaces]
    ns_values = ", ".join(ns_pairs)

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
        WHERE (d.namespace, d.clustername) IN ({ns_values})
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
        {"min_cvss": min_cvss, "min_epss": min_epss, "always_show": always_show},
    )
    return [dict(row._mapping) for row in result]


async def get_cve_trend(
    session: AsyncSession,
    namespaces: list[tuple[str, str]] | None = None,
    days: int = 30,
    min_cvss: float = 0.0,
    min_epss: float = 0.0,
    always_show_cve_ids: set[str] | None = None,
) -> list[dict]:
    """CVE first-seen trend per day over the last N days."""
    since = datetime.utcnow() - timedelta(days=days)

    if namespaces is not None and len(namespaces) == 0:
        return []

    always_show = list(always_show_cve_ids or [])

    if namespaces:
        ns_pairs = [f"('{ns}','{cl}')" for ns, cl in namespaces]
        ns_values = ", ".join(ns_pairs)
        where_clause = f"AND (d.namespace, d.clustername) IN ({ns_values})"
    else:
        where_clause = ""

    sql = text(f"""
        WITH visible_cves AS (
            SELECT
                ic.cvebaseinfo_cve AS cve_id,
                MIN(ic.firstimageoccurrence) AS first_seen
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
        SELECT DATE(first_seen) AS date, COUNT(*) AS count
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
        },
    )
    return [{"date": str(row.date), "count": row.count} for row in result]


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

    if namespaces:
        ns_pairs = [f"('{ns}','{cl}')" for ns, cl in namespaces]
        ns_values = ", ".join(ns_pairs)
        where_clause = f"WHERE (d.namespace, d.clustername) IN ({ns_values})"
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
        {"min_cvss": min_cvss, "min_epss": min_epss, "always_show": always_show},
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

    if namespaces:
        ns_pairs = [f"('{ns}','{cl}')" for ns, cl in namespaces]
        ns_values = ", ".join(ns_pairs)
        where_clause = f"WHERE (d.namespace, d.clustername) IN ({ns_values})"
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
        {"min_cvss": min_cvss, "min_epss": min_epss, "always_show": always_show},
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


async def get_fixability_stats(
    session: AsyncSession,
    namespaces: list[tuple[str, str]],
) -> dict:
    """Fixable vs unfixable CVE counts for given namespaces."""
    if not namespaces:
        return {"fixable": 0, "unfixable": 0}

    ns_pairs = [f"('{ns}','{cl}')" for ns, cl in namespaces]
    ns_values = ", ".join(ns_pairs)

    sql = text(f"""
        SELECT
            BOOL_OR(COALESCE(ic.isfixable, false)) AS any_fixable,
            COUNT(DISTINCT ic.cvebaseinfo_cve) AS count
        FROM deployments d
        JOIN deployments_containers dc ON dc.deployments_id = d.id
        JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
        WHERE (d.namespace, d.clustername) IN ({ns_values})
        GROUP BY ic.cvebaseinfo_cve
    """)
    result = await session.execute(sql)
    rows = result.fetchall()
    fixable = sum(1 for r in rows if r.any_fixable)
    unfixable = sum(1 for r in rows if not r.any_fixable)
    return {"fixable": fixable, "unfixable": unfixable}


async def get_fixability_breakdown(
    session: AsyncSession,
    namespaces: list[tuple[str, str]] | None = None,
    min_cvss: float = 0.0,
    min_epss: float = 0.0,
    always_show_cve_ids: set[str] | None = None,
) -> dict:
    """Fixable vs unfixable CVE counts with threshold/always-show filtering."""
    if namespaces is not None and len(namespaces) == 0:
        return {"fixable": 0, "unfixable": 0}

    always_show = list(always_show_cve_ids or [])

    if namespaces:
        ns_pairs = [f"('{ns}','{cl}')" for ns, cl in namespaces]
        ns_values = ", ".join(ns_pairs)
        where_clause = f"WHERE (d.namespace, d.clustername) IN ({ns_values})"
    else:
        where_clause = ""

    sql = text(f"""
        SELECT
            BOOL_OR(COALESCE(ic.isfixable, false)) AS any_fixable
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
    """)
    result = await session.execute(
        sql,
        {"min_cvss": min_cvss, "min_epss": min_epss, "always_show": always_show},
    )
    rows = result.fetchall()
    fixable = sum(1 for r in rows if r.any_fixable)
    unfixable = sum(1 for r in rows if not r.any_fixable)
    return {"fixable": fixable, "unfixable": unfixable}


async def get_top_affected_deployments(
    session: AsyncSession,
    namespaces: list[tuple[str, str]] | None = None,
    min_cvss: float = 0.0,
    min_epss: float = 0.0,
    always_show_cve_ids: set[str] | None = None,
    limit: int = 10,
) -> list[dict]:
    """Top N deployments by distinct visible CVE count."""
    if namespaces is not None and len(namespaces) == 0:
        return []

    always_show = list(always_show_cve_ids or [])

    if namespaces:
        ns_pairs = [f"('{ns}','{cl}')" for ns, cl in namespaces]
        ns_values = ", ".join(ns_pairs)
        where_clause = f"WHERE (d.namespace, d.clustername) IN ({ns_values})"
    else:
        where_clause = ""

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
            d.name AS deployment_name,
            d.namespace,
            d.clustername AS cluster_name,
            COUNT(DISTINCT vc.cve_id) AS cve_count
        FROM visible_cves vc
        JOIN image_cves_v2 ic ON ic.cvebaseinfo_cve = vc.cve_id
        JOIN deployments_containers dc ON dc.image_id = ic.imageid
        JOIN deployments d ON d.id = dc.deployments_id
        {"WHERE (d.namespace, d.clustername) IN (" + ns_values + ")" if namespaces else ""}
        GROUP BY d.name, d.namespace, d.clustername
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
        },
    )
    return [dict(row._mapping) for row in result]


async def get_cve_ids_for_deployment(
    session: AsyncSession,
    deployment_name: str,
    namespaces: list[tuple[str, str]],
) -> list[str]:
    """Return CVE IDs affecting a specific deployment in the given namespaces."""
    if not namespaces:
        return []

    ns_pairs = [f"('{ns}','{cl}')" for ns, cl in namespaces]
    ns_values = ", ".join(ns_pairs)

    sql = text(f"""
        SELECT DISTINCT ic.cvebaseinfo_cve AS cve_id
        FROM deployments d
        JOIN deployments_containers dc ON dc.deployments_id = d.id
        JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
        WHERE d.name = :deployment_name
          AND (d.namespace, d.clustername) IN ({ns_values})
    """)
    result = await session.execute(sql, {"deployment_name": deployment_name})
    return [row.cve_id for row in result]


async def get_fixable_trend(
    session: AsyncSession,
    namespaces: list[tuple[str, str]] | None = None,
    days: int = 30,
    min_cvss: float = 0.0,
    min_epss: float = 0.0,
    always_show_cve_ids: set[str] | None = None,
) -> list[dict]:
    """CVE first-seen trend per day, split into fixable/unfixable."""
    since = datetime.utcnow() - timedelta(days=days)

    if namespaces is not None and len(namespaces) == 0:
        return []

    always_show = list(always_show_cve_ids or [])

    if namespaces:
        ns_pairs = [f"('{ns}','{cl}')" for ns, cl in namespaces]
        ns_values = ", ".join(ns_pairs)
        where_clause = f"AND (d.namespace, d.clustername) IN ({ns_values})"
    else:
        where_clause = ""

    sql = text(f"""
        WITH visible_cves AS (
            SELECT
                ic.cvebaseinfo_cve AS cve_id,
                MIN(ic.firstimageoccurrence) AS first_seen,
                BOOL_OR(COALESCE(ic.isfixable, false)) AS any_fixable
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
            COUNT(*) FILTER (WHERE any_fixable) AS fixable,
            COUNT(*) FILTER (WHERE NOT any_fixable) AS unfixable
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
        },
    )
    return [
        {"date": str(row.date), "fixable": row.fixable, "unfixable": row.unfixable}
        for row in result
    ]


async def get_cve_aging(
    session: AsyncSession,
    namespaces: list[tuple[str, str]] | None = None,
    min_cvss: float = 0.0,
    min_epss: float = 0.0,
    always_show_cve_ids: set[str] | None = None,
) -> list[dict]:
    """Age distribution of CVEs."""
    if namespaces is not None and len(namespaces) == 0:
        return []

    always_show = list(always_show_cve_ids or [])

    if namespaces:
        ns_pairs = [f"('{ns}','{cl}')" for ns, cl in namespaces]
        ns_values = ", ".join(ns_pairs)
        where_clause = f"WHERE (d.namespace, d.clustername) IN ({ns_values})"
    else:
        where_clause = ""

    sql = text(f"""
        SELECT
            EXTRACT(EPOCH FROM (NOW() - MIN(ic.firstimageoccurrence))) / 86400 AS age_days
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
    """)
    result = await session.execute(
        sql,
        {"min_cvss": min_cvss, "min_epss": min_epss, "always_show": always_show},
    )
    rows = [r.age_days for r in result if r.age_days is not None]

    buckets = [
        ("0-7", 0, 7),
        ("8-30", 8, 30),
        ("31-90", 31, 90),
        ("91-180", 91, 180),
        ("180+", 181, float("inf")),
    ]
    distribution = []
    for label, lo, hi in buckets:
        count = sum(1 for d in rows if lo <= d <= hi)
        distribution.append({"bucket": label, "count": count})
    return distribution


async def get_cves_last_n_days(
    session: AsyncSession,
    days: int = 7,
) -> int:
    """Count distinct CVEs first seen in the last N days (org-wide)."""
    since = datetime.utcnow() - timedelta(days=days)
    sql = text("""
        SELECT COUNT(DISTINCT ic.cvebaseinfo_cve) AS count
        FROM image_cves_v2 ic
        WHERE ic.firstimageoccurrence >= :since
          AND ic.cvebaseinfo_cve IS NOT NULL
    """)
    result = await session.execute(sql, {"since": since})
    return result.scalar() or 0


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
    visible = (
        await session.execute(sql_visible, {"min_cvss": min_cvss, "min_epss": min_epss})
    ).scalar() or 0
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

    if namespaces:
        ns_pairs = [f"('{ns}','{cl}')" for ns, cl in namespaces]
        ns_values = ", ".join(ns_pairs)
        where_clause = f"WHERE (d.namespace, d.clustername) IN ({ns_values})"
    else:
        where_clause = ""

    # Build additional CTE-level filters for user-facing filters
    cte_extra_joins = ""
    cte_extra_having = ""
    params: dict = {
        "min_cvss": min_cvss,
        "min_epss": min_epss,
        "always_show": always_show,
    }

    if search:
        cte_extra_having += "\n                AND ic.cvebaseinfo_cve ILIKE :search_pat"
        params["search_pat"] = f"%{search}%"
    if severity is not None:
        cte_extra_having += "\n                AND MAX(ic.severity) = :filter_severity"
        params["filter_severity"] = severity
    if fixable is True:
        cte_extra_having += (
            "\n                AND BOOL_OR(COALESCE(ic.isfixable, false))"
        )
    elif fixable is False:
        cte_extra_having += (
            "\n                AND NOT BOOL_OR(COALESCE(ic.isfixable, false))"
        )
    if cvss_min is not None and cvss_min > 0:
        cte_extra_having += (
            "\n                AND MAX(COALESCE(ic.cvss, 0)) >= :user_cvss_min"
        )
        params["user_cvss_min"] = cvss_min
    if epss_min is not None and epss_min > 0:
        cte_extra_having += "\n                AND MAX(COALESCE(ic.cvebaseinfo_epss_epssprobability, 0)) >= :user_epss_min"
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
        {"WHERE (d.namespace, d.clustername) IN (" + ns_values + ")" if namespaces else ""}
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

    if namespaces:
        ns_pairs = [f"('{ns}','{cl}')" for ns, cl in namespaces]
        ns_values = ", ".join(ns_pairs)
        where_clause = f"AND (d.namespace, d.clustername) IN ({ns_values})"
    else:
        where_clause = ""

    # Build HAVING filters for user-applied filters
    having_filters = []
    bind_params: dict = {
        "image_id": image_id,
        "min_cvss": min_cvss,
        "min_epss": min_epss,
        "always_show": always_show,
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
        having_filters.append(
            "MAX(COALESCE(ic.cvebaseinfo_epss_epssprobability, 0)) >= :filter_epss_min"
        )
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
            {"WHERE (d.namespace, d.clustername) IN (" + ns_values + ")" if namespaces else ""}
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
    ns_pairs = [f"('{ns}','{cl}')" for ns, cl in namespaces]
    ns_values = ", ".join(ns_pairs)
    sql = text(f"""
        SELECT DISTINCT ic.cvebaseinfo_cve AS cve_id, d.namespace
        FROM deployments d
        JOIN deployments_containers dc ON dc.deployments_id = d.id
        JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
        WHERE (d.namespace, d.clustername) IN ({ns_values})
          AND ic.cvebaseinfo_cve = ANY(:cve_ids)
    """)
    result = await session.execute(sql, {"cve_ids": cve_ids})
    mapping: dict[str, list[str]] = {}
    for row in result:
        mapping.setdefault(row.cve_id, []).append(row.namespace)
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

    if namespaces:
        ns_pairs = [f"('{ns}','{cl}')" for ns, cl in namespaces]
        ns_values = ", ".join(ns_pairs)
        where_clause = f"WHERE (d.namespace, d.clustername) IN ({ns_values})"
    else:
        where_clause = ""

    if namespaces:
        ns_filter = f"AND (d.namespace, d.clustername) IN ({ns_values})"
    else:
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
    ns_pairs = [f"('{ns}','{cl}')" for ns, cl in namespaces]
    ns_values = ", ".join(ns_pairs)
    sql = text(f"""
        SELECT DISTINCT ic.cvebaseinfo_cve AS cve_id, comp.name AS component_name
        FROM deployments d
        JOIN deployments_containers dc ON dc.deployments_id = d.id
        JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
        LEFT JOIN image_component_v2 comp ON comp.id = ic.componentid
        WHERE (d.namespace, d.clustername) IN ({ns_values})
          AND ic.cvebaseinfo_cve = ANY(:cve_ids)
          AND comp.name IS NOT NULL
    """)
    result = await session.execute(sql, {"cve_ids": cve_ids})
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
    ns_pairs = [f"('{ns}','{cl}')" for ns, cl in namespaces]
    ns_values = ", ".join(ns_pairs)
    sql = text(f"""
        SELECT DISTINCT
            ic.cvebaseinfo_cve AS cve_id,
            comp.name AS component_name,
            comp.version AS component_version
        FROM deployments d
        JOIN deployments_containers dc ON dc.deployments_id = d.id
        JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
        LEFT JOIN image_component_v2 comp ON comp.id = ic.componentid
        WHERE (d.namespace, d.clustername) IN ({ns_values})
          AND ic.cvebaseinfo_cve = ANY(:cve_ids)
          AND comp.name IS NOT NULL
    """)
    result = await session.execute(sql, {"cve_ids": cve_ids})
    mapping: dict[str, list[tuple[str, str]]] = {}
    for row in result:
        mapping.setdefault(row.cve_id, []).append(
            (row.component_name, row.component_version or "")
        )
    return mapping
