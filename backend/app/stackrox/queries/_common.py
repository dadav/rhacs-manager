"""
Read-only queries against the StackRox central_active PostgreSQL database.
All functions accept an AsyncSession connected to the StackRox DB.
"""


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
