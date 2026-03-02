"""Shared helper for global cluster/namespace scope filtering."""


def narrow_namespaces(
    namespaces: list[tuple[str, str]],
    cluster: str | None,
    namespace: str | None,
) -> list[tuple[str, str]]:
    """Narrow namespace list by global scope selector params."""
    if cluster:
        namespaces = [(ns, cl) for ns, cl in namespaces if cl == cluster]
    if namespace:
        namespaces = [(ns, cl) for ns, cl in namespaces if ns == namespace]
    return namespaces
