"""Remediation creation for one or more (namespace, cluster) pairs of a single CVE.

A batch is all-or-nothing: every target is validated (access, CVE presence,
no existing remediation) before any row is inserted. One remediation row is
created per target; the data model stays one row per namespace.
"""

import logging
from datetime import date

from sqlalchemy import select, tuple_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser
from ..i18n import ApiError
from ..models.remediation import Remediation, RemediationStatus
from ..models.user import User
from ..notifications import service as notif_svc
from ..stackrox import queries as sx
from . import cve_subscription_service as sub_svc
from .audit_service import log_action

logger = logging.getLogger(__name__)

Pair = tuple[str, str]


async def require_user(db: AsyncSession, user_id: str) -> User:
    """Load an assignee candidate or fail with a user-visible 404."""
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise ApiError(404, "user_not_found")
    return user


def _dedupe(targets: list[Pair]) -> list[Pair]:
    return list(dict.fromkeys(targets))


async def existing_pairs(db: AsyncSession, cve_id: str, targets: list[Pair]) -> set[Pair]:
    """Return the target pairs that already have a remediation for ``cve_id``."""
    result = await db.execute(
        select(Remediation.namespace, Remediation.cluster_name).where(
            Remediation.cve_id == cve_id,
            tuple_(Remediation.namespace, Remediation.cluster_name).in_(targets),
        )
    )
    return {(ns, cl) for ns, cl in result.all()}


async def create_remediations(
    db: AsyncSession,
    sx_db: AsyncSession,
    current_user: CurrentUser,
    *,
    cve_id: str,
    targets: list[Pair],
    assigned_to: str | None,
    target_date: date | None,
    notes: str | None,
) -> list[Remediation]:
    """Create one open remediation per target pair. Never commits; the caller commits."""
    pairs = _dedupe(targets)

    if not current_user.can_see_all_namespaces:
        allowed = set(current_user.namespaces)
        if any(pair not in allowed for pair in pairs):
            raise ApiError(403, "remediation_namespace_forbidden")

    deployments = await sx.get_affected_deployments(sx_db, cve_id, pairs)
    affected = {(d["namespace"], d["cluster_name"]) for d in deployments}
    missing = [pair for pair in pairs if pair not in affected]
    if missing:
        logger.info(
            "remediation_create_cve_not_in_namespace",
            extra={"cve_id": cve_id, "missing": [f"{ns}:{cl}" for ns, cl in missing]},
        )
        raise ApiError(404, "cve_not_in_namespace")

    if await existing_pairs(db, cve_id, pairs):
        raise ApiError(409, "remediation_duplicate")

    assignee_id = assigned_to or None
    if assignee_id:
        await require_user(db, assignee_id)

    remediations = [
        Remediation(
            cve_id=cve_id,
            namespace=ns,
            cluster_name=cl,
            status=RemediationStatus.open,
            assigned_to=assignee_id,
            created_by=current_user.id,
            target_date=target_date,
            notes=notes,
        )
        for ns, cl in pairs
    ]
    db.add_all(remediations)
    try:
        await db.flush()
    except IntegrityError:
        # A concurrent request created one of the pairs after the precheck.
        await db.rollback()
        logger.info("remediation_create_race_duplicate", extra={"cve_id": cve_id})
        raise ApiError(409, "remediation_duplicate") from None

    for remediation in remediations:
        await log_action(
            db,
            current_user.id,
            "remediation_created",
            "remediation",
            str(remediation.id),
            {
                "cve_id": cve_id,
                "namespace": remediation.namespace,
                "cluster_name": remediation.cluster_name,
                "assigned_to_id": assignee_id,
            },
        )
        await notif_svc.notify_remediation_created(db, remediation, current_user)

    # One subscriber event for the whole batch; the assignee was notified above.
    await sub_svc.broadcast_subscription_event(
        db,
        sx_db,
        cve_id=cve_id,
        kind="remediation",
        params={"status": RemediationStatus.open.value},
        actor_id=current_user.id,
        exclude_user_ids=[assignee_id] if assignee_id else [],
        scope=pairs,
    )

    logger.info(
        "remediations_created",
        extra={"cve_id": cve_id, "count": len(remediations), "user_id": current_user.id},
    )
    return remediations
