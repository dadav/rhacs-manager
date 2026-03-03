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
        LEFT JOIN image_components comp ON comp.id = ic.componentid
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
        LEFT JOIN image_components comp ON comp.id = ic.componentid
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
        JOIN image_components comp ON comp.id = ic.componentid
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
        LEFT JOIN image_components comp ON comp.id = ic.componentid
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
        WITH visible_by_namespace AS (
            SELECT
                d.namespace AS namespace,
                ic.cvebaseinfo_cve AS cve_id
            FROM deployments d
            JOIN deployments_containers dc ON dc.deployments_id = d.id
            JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
            {where_clause}
            GROUP BY d.namespace, ic.cvebaseinfo_cve
            HAVING (
                (
                    MAX(COALESCE(ic.cvss, 0)) >= :min_cvss
                    AND MAX(COALESCE(ic.cvebaseinfo_epss_epssprobability, 0)) >= :min_epss
                )
                OR ic.cvebaseinfo_cve = ANY(:always_show)
            )
        )
        SELECT namespace, COUNT(*) AS count
        FROM visible_by_namespace
        GROUP BY namespace
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
        sql, {"since": since, "min_cvss": min_cvss, "min_epss": min_epss, "always_show": always_show},
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
        sql, {"min_cvss": min_cvss, "min_epss": min_epss, "always_show": always_show},
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
        sql, {"min_cvss": min_cvss, "min_epss": min_epss, "always_show": always_show},
    )
    rows = [dict(row._mapping) for row in result]

    # Pivot into one row per cluster
    clusters: dict[str, dict] = {}
    for row in rows:
        c = row["cluster"]
        if c not in clusters:
            clusters[c] = {"cluster": c, "unknown": 0, "low": 0, "moderate": 0, "important": 0, "critical": 0, "total": 0}
        severity_map = {0: "unknown", 1: "low", 2: "moderate", 3: "important", 4: "critical"}
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
            BOOL_OR(COALESCE(icce.isfixable, false)) AS any_fixable,
            COUNT(DISTINCT ic.cvebaseinfo_cve) AS count
        FROM deployments d
        JOIN deployments_containers dc ON dc.deployments_id = d.id
        JOIN image_cve_edges ice ON ice.imageid = dc.image_id
        JOIN image_cves ic ON ic.id = ice.imagecveid
        LEFT JOIN image_component_edges ince ON ince.imageid = dc.image_id
        LEFT JOIN image_component_cve_edges icce
            ON icce.imagecomponentid = ince.imagecomponentid
            AND icce.imagecveid = ic.id
        WHERE (d.namespace, d.clustername) IN ({ns_values})
        GROUP BY ic.cvebaseinfo_cve
    """)
    result = await session.execute(sql)
    rows = result.fetchall()
    fixable = sum(1 for r in rows if r.any_fixable)
    unfixable = sum(1 for r in rows if not r.any_fixable)
    return {"fixable": fixable, "unfixable": unfixable}


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
        sql, {"min_cvss": min_cvss, "min_epss": min_epss, "always_show": always_show},
    )
    rows = [r.age_days for r in result if r.age_days is not None]

    buckets = [
        ("0-7 Tage", 0, 7),
        ("8-30 Tage", 8, 30),
        ("31-90 Tage", 31, 90),
        ("91-180 Tage", 91, 180),
        (">180 Tage", 181, float("inf")),
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
    sql_total = text("SELECT COUNT(*) FROM image_cves WHERE cvebaseinfo_cve IS NOT NULL")
    sql_visible = text("""
        SELECT COUNT(*) FROM image_cves
        WHERE cvebaseinfo_cve IS NOT NULL
          AND (
            COALESCE(cvss, 0) >= :min_cvss
            AND COALESCE(cvebaseinfo_epss_epssprobability, 0) >= :min_epss
          )
    """)
    total = (await session.execute(sql_total)).scalar() or 0
    visible = (await session.execute(sql_visible, {"min_cvss": min_cvss, "min_epss": min_epss})).scalar() or 0
    return {"total_cves": total, "visible_cves": visible, "hidden_cves": total - visible}


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
        SELECT DISTINCT
            ic.cvebaseinfo_cve AS cve_id,
            ic.severity,
            COALESCE(ic.cvss, 0) AS cvss,
            COALESCE(ic.cvebaseinfo_epss_epssprobability, 0) AS epss_probability,
            COALESCE(ic.impactscore, 0) AS impact_score,
            ic.operatingsystem
        FROM image_cves ic
        WHERE ic.cvebaseinfo_cve = ANY(:cve_ids)
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
        JOIN image_cve_edges ice ON ice.imageid = dc.image_id
        JOIN image_cves ic ON ic.id = ice.imagecveid
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
        LEFT JOIN image_components comp ON comp.id = ic.componentid
        WHERE (d.namespace, d.clustername) IN ({ns_values})
          AND ic.cvebaseinfo_cve = ANY(:cve_ids)
          AND comp.name IS NOT NULL
    """)
    result = await session.execute(sql, {"cve_ids": cve_ids})
    mapping: dict[str, list[str]] = {}
    for row in result:
        mapping.setdefault(row.cve_id, []).append(row.component_name)
    return mapping
