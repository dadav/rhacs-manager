"""Remediation-based access to a CVE detail that no longer affects the caller.

StackRox drops a CVE from a namespace once it is fixed there. The owning team must
still be able to reopen the CVE detail (read it, comment), so a remediation in a
(namespace, cluster) pair the caller can see now keeps the detail reachable. The
pair check uses the request-scoped visibility, so revoked namespaces drop out.
Callers: CVE detail, presence, and My Comments.
"""

from collections.abc import Iterable

from sqlalchemy import Row, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser
from ..models.remediation import Remediation, RemediationStatus


async def visible_remediation_cve_ids(
    app_db: AsyncSession,
    current_user: CurrentUser,
    cve_ids: list[str],
    cluster: str | None = None,
    namespace: str | None = None,
) -> set[str]:
    """Subset of ``cve_ids`` with a remediation in a pair the user can see.

    ``cluster``/``namespace`` narrow to the sidebar scope; they never widen visibility.
    """
    if not cve_ids:
        return set()
    if not current_user.can_see_all_namespaces and not current_user.has_namespaces:
        return set()

    query = select(Remediation.cve_id, Remediation.namespace, Remediation.cluster_name).where(
        Remediation.cve_id.in_(cve_ids)
    )
    rows = (await app_db.execute(query)).all()

    return _visible_cve_ids(rows, current_user, cluster, namespace)


def _visible_cve_ids(
    rows: Iterable[Row],
    current_user: CurrentUser,
    cluster: str | None,
    namespace: str | None,
    restrict_pairs: list[tuple[str, str]] | None = None,
) -> set[str]:
    visible_pairs = None if current_user.can_see_all_namespaces else set(current_user.namespaces)
    result: set[str] = set()
    for row in rows:
        # Truthiness mirrors narrow_namespaces: an empty param means no filter.
        if cluster and row.cluster_name != cluster:
            continue
        if namespace and row.namespace != namespace:
            continue
        if visible_pairs is not None and (row.namespace, row.cluster_name) not in visible_pairs:
            continue
        if restrict_pairs is not None and (row.namespace, row.cluster_name) not in restrict_pairs:
            continue
        result.add(row.cve_id)
    return result


async def fixed_remediation_cve_ids(
    app_db: AsyncSession,
    current_user: CurrentUser,
    cluster: str | None = None,
    namespace: str | None = None,
    restrict_pairs: list[tuple[str, str]] | None = None,
) -> set[str]:
    """CVEs with a resolved remediation in the caller's narrowed visible scope."""
    if not current_user.can_see_all_namespaces and not current_user.has_namespaces:
        return set()
    if restrict_pairs == []:
        return set()
    query = select(Remediation.cve_id, Remediation.namespace, Remediation.cluster_name).where(
        Remediation.status.in_([RemediationStatus.resolved, RemediationStatus.verified])
    )
    rows = (await app_db.execute(query)).all()
    return _visible_cve_ids(rows, current_user, cluster, namespace, restrict_pairs)


async def has_visible_remediation(
    app_db: AsyncSession,
    current_user: CurrentUser,
    cve_id: str,
    cluster: str | None = None,
    namespace: str | None = None,
) -> bool:
    return cve_id in await visible_remediation_cve_ids(app_db, current_user, [cve_id], cluster, namespace)
