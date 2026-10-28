"""
Read-only queries against the StackRox central_active PostgreSQL database.
All functions accept an AsyncSession connected to the StackRox DB.
"""

from ...services.version_compare import pick_fixed_by

# Shared HAVING clause for dashboard CVE visibility. It applies the conjunctive
# CVSS/EPSS thresholds (bypassed for always-show CVEs) and then removes suppressed
# CVEs so dashboard panels match the suppression-filtered /cves list. Any query
# that interpolates this MUST bind :min_cvss, :min_epss, :always_show and
# :exclude_cve_ids. Pass an empty list for :exclude_cve_ids to exclude nothing
# (`x != ALL(ARRAY[])` is TRUE in PostgreSQL).
VISIBILITY_HAVING = """HAVING (
            (
                (
                    MAX(COALESCE(ic.cvss, 0)) >= :min_cvss
                    AND MAX(COALESCE(ic.cvebaseinfo_epss_epssprobability, 0)) >= :min_epss
                )
                OR ic.cvebaseinfo_cve = ANY(:always_show)
            )
            AND ic.cvebaseinfo_cve != ALL(:exclude_cve_ids)
        )"""


# Effective per-container CVE rows for the ACS 4.11 dual image model.
# Branch 1: v2-model rows (written for all scans since the 4.11 upgrade).
# Branch 2: frozen legacy-model rows, only for images that have no scan data in
# the v2 model. Legacy rows stopped being updated at the 4.11 upgrade, so they
# must only be used when the image has not been rescanned into the v2 model yet.
# The probe images_v2.scanstats_componentcount > 0 is exactly consistent with v2
# component-row existence and only touches the small images_v2 table.
# The CTE is aliased as `ic` by callers so VISIBILITY_HAVING and the existing
# ic.* column references keep working. `serialized` is intentionally excluded
# (bytea; the protobuf queries read it directly from image_cves_v2).
# `origin` (VulnOrigin feed) requires ACS 4.11.6+; see app/stackrox/schema_check.py.
#
# severity, cvss and cvebaseinfo_epss_epssprobability are the scope-independent
# CVE scores from app/stackrox/effective_scores.py, not the raw per-image values
# (stale on images StackRox has not rescanned since a feed update). Every query
# interpolating CVE_ROWS_CTE or EFFECTIVE_SCORES_CTE MUST bind
# `**await effective_score_params()` (:es_cve_ids, :es_severity, :es_cvss, :es_epss).
# Only the score columns are replaced; row membership stays scoped.
#
# The GROUP BY cve in effective_scores is required (the ids are already unique):
# it gives the planner a sane row estimate for the unnest(). Without it PostgreSQL
# joined the ~1M CVE rows through a large on-disk sort (measured ~1s slower on the
# full list); with it the overhead is ~5% (local ACS 4.11.6 dump, 447k rows).
EFFECTIVE_SCORES_CTE = """effective_scores AS (
            SELECT cve, MAX(severity) AS severity, MAX(cvss) AS cvss, MAX(epss) AS epss
            FROM unnest(
                CAST(:es_cve_ids AS varchar[]),
                CAST(:es_severity AS int[]),
                CAST(:es_cvss AS float8[]),
                CAST(:es_epss AS float8[])
            ) AS es(cve, severity, cvss, epss)
            GROUP BY cve
        )"""

CVE_ROWS_CTE = (
    EFFECTIVE_SCORES_CTE
    + """,
        cve_rows_raw AS (
            SELECT dc.deployments_id, dc.image_id, dc.image_name_fullname,
                   ic.cvebaseinfo_cve, ic.severity, ic.cvss,
                   ic.cvebaseinfo_epss_epssprobability, ic.impactscore,
                   ic.firstimageoccurrence, ic.cvebaseinfo_publishedon,
                   ic.fixavailabletimestamp, ic.isfixable, ic.fixedby, ic.componentid,
                   ic.origin
            FROM deployments_containers dc
            JOIN image_cves_v2 ic ON ic.imageidv2 = dc.image_idv2
            UNION ALL
            SELECT dc.deployments_id, dc.image_id, dc.image_name_fullname,
                   ic.cvebaseinfo_cve, ic.severity, ic.cvss,
                   ic.cvebaseinfo_epss_epssprobability, ic.impactscore,
                   ic.firstimageoccurrence, ic.cvebaseinfo_publishedon,
                   ic.fixavailabletimestamp, ic.isfixable, ic.fixedby, ic.componentid,
                   ic.origin
            FROM deployments_containers dc
            JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
            WHERE NOT EXISTS (
                SELECT 1 FROM images_v2 iv
                WHERE iv.id = dc.image_idv2 AND iv.scanstats_componentcount > 0
            )
        ),
        cve_rows AS (
            SELECT r.deployments_id, r.image_id, r.image_name_fullname,
                   r.cvebaseinfo_cve,
                   COALESCE(es.severity, r.severity) AS severity,
                   COALESCE(es.cvss, r.cvss) AS cvss,
                   COALESCE(es.epss, r.cvebaseinfo_epss_epssprobability) AS cvebaseinfo_epss_epssprobability,
                   r.impactscore,
                   r.firstimageoccurrence, r.cvebaseinfo_publishedon,
                   r.fixavailabletimestamp, r.isfixable, r.fixedby, r.componentid,
                   r.origin
            FROM cve_rows_raw r
            LEFT JOIN effective_scores es ON es.cve = r.cvebaseinfo_cve
        )"""
)


def _namespace_filter(namespaces: list[tuple[str, str]], prefix: str = "ns") -> tuple[str, dict[str, str]]:
    """Build a parameterized SQL fragment for namespace filtering.

    Returns (sql_fragment, params) where sql_fragment is like:
    "(d.namespace, d.clustername) IN (VALUES (:ns_0_ns, :ns_0_cl), (:ns_1_ns, :ns_1_cl))"
    """
    placeholders = []
    params: dict[str, str] = {}
    for i, (ns, cl) in enumerate(namespaces):
        ns_key = f"{prefix}_{i}_ns"
        cl_key = f"{prefix}_{i}_cl"
        placeholders.append(f"(:{ns_key}, :{cl_key})")
        params[ns_key] = ns
        params[cl_key] = cl
    fragment = f"(d.namespace, d.clustername) IN (VALUES {', '.join(placeholders)})"
    return fragment, params


# Aggregate every distinct non-empty fix version so Python can pick one with
# version-aware ordering. SQL MAX(fixedby) compares strings (1.9 > 1.10).
FIXED_BY_CANDIDATES_SQL = "ARRAY_REMOVE(ARRAY_AGG(DISTINCT NULLIF(ic.fixedby, '')), NULL) AS fixed_by_candidates"

# Distinct vulnerability feeds (image_cves_v2.origin, ACS 4.11.6+) behind a CVE.
# NULL (rows scanned before 4.11.6) is dropped; map codes with app.stackrox.vuln_origin.
ORIGINS_SQL = "ARRAY_REMOVE(ARRAY_AGG(DISTINCT ic.origin), NULL) AS origin_codes"


def _row_with_fixed_by(row) -> dict:
    """Row mapping as a dict with ``fixed_by_candidates`` collapsed into ``fixed_by``."""
    data = dict(row._mapping)
    data["fixed_by"] = pick_fixed_by(data.pop("fixed_by_candidates", None))
    return data
