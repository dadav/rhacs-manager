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
