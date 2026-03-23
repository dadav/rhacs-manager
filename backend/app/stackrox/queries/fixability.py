from datetime import datetime, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ._common import _namespace_filter


async def get_fixability_stats(
    session: AsyncSession,
    namespaces: list[tuple[str, str]],
) -> dict:
    """Fixable vs unfixable CVE counts for given namespaces."""
    if not namespaces:
        return {"fixable": 0, "unfixable": 0}

    ns_fragment, ns_params = _namespace_filter(namespaces)

    sql = text(f"""
        SELECT
            BOOL_OR(COALESCE(ic.isfixable, false)) AS any_fixable,
            COUNT(DISTINCT ic.cvebaseinfo_cve) AS count
        FROM deployments d
        JOIN deployments_containers dc ON dc.deployments_id = d.id
        JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
        WHERE {ns_fragment}
        GROUP BY ic.cvebaseinfo_cve
    """)
    result = await session.execute(sql, ns_params)
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

    ns_params: dict = {}
    if namespaces:
        ns_fragment, ns_params = _namespace_filter(namespaces)
        where_clause = f"WHERE {ns_fragment}"
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
        {
            "min_cvss": min_cvss,
            "min_epss": min_epss,
            "always_show": always_show,
            **ns_params,
        },
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

    ns_params: dict = {}
    if namespaces:
        ns_fragment, ns_params = _namespace_filter(namespaces)
        where_clause = f"WHERE {ns_fragment}"
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
        {("WHERE " + ns_fragment) if namespaces else ""}
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
            **ns_params,
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

    ns_fragment, ns_params = _namespace_filter(namespaces)

    sql = text(f"""
        SELECT DISTINCT ic.cvebaseinfo_cve AS cve_id
        FROM deployments d
        JOIN deployments_containers dc ON dc.deployments_id = d.id
        JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
        WHERE d.name = :deployment_name
          AND {ns_fragment}
    """)
    result = await session.execute(sql, {"deployment_name": deployment_name, **ns_params})
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
            **ns_params,
        },
    )
    return [{"date": str(row.date), "fixable": row.fixable, "unfixable": row.unfixable} for row in result]


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

    ns_params: dict = {}
    if namespaces:
        ns_fragment, ns_params = _namespace_filter(namespaces)
        where_clause = f"WHERE {ns_fragment}"
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
        {
            "min_cvss": min_cvss,
            "min_epss": min_epss,
            "always_show": always_show,
            **ns_params,
        },
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
