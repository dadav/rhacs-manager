"""
Read-only queries against the StackRox central_active PostgreSQL database.
All functions accept an AsyncSession connected to the StackRox DB.
"""

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
CVE_ROWS_CTE = """cve_rows AS (
            SELECT dc.deployments_id, dc.image_id, dc.image_name_fullname,
                   ic.cvebaseinfo_cve, ic.severity, ic.cvss,
                   ic.cvebaseinfo_epss_epssprobability, ic.impactscore,
                   ic.firstimageoccurrence, ic.cvebaseinfo_publishedon,
                   ic.fixavailabletimestamp, ic.isfixable, ic.fixedby, ic.componentid
            FROM deployments_containers dc
            JOIN image_cves_v2 ic ON ic.imageidv2 = dc.image_idv2
            UNION ALL
            SELECT dc.deployments_id, dc.image_id, dc.image_name_fullname,
                   ic.cvebaseinfo_cve, ic.severity, ic.cvss,
                   ic.cvebaseinfo_epss_epssprobability, ic.impactscore,
                   ic.firstimageoccurrence, ic.cvebaseinfo_publishedon,
                   ic.fixavailabletimestamp, ic.isfixable, ic.fixedby, ic.componentid
            FROM deployments_containers dc
            JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
            WHERE NOT EXISTS (
                SELECT 1 FROM images_v2 iv
                WHERE iv.id = dc.image_idv2 AND iv.scanstats_componentcount > 0
            )
        )"""


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
