"""Remediation creation and updates.

Creation covers one or more (namespace, cluster) pairs of a single CVE. A batch
is all-or-nothing: every target is validated (access, CVE presence, no existing
remediation) before any row is inserted. One remediation row is created per
target; the data model stays one row per namespace.

Updates change the status and the editable fields of one remediation. An omitted
field stays unchanged and an explicit null clears it (``model_fields_set``).
"""

import logging
from datetime import date, datetime

from sqlalchemy import select, tuple_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser
from ..i18n import ApiError
from ..models.remediation import Remediation, RemediationStatus
from ..models.user import User
from ..notifications import service as notif_svc
from ..schemas.remediation import RemediationUpdate
from ..stackrox import queries as sx
from . import cve_subscription_service as sub_svc
from .audit_service import log_action

logger = logging.getLogger(__name__)

Pair = tuple[str, str]

# Valid status transitions
_TRANSITIONS: dict[RemediationStatus, set[RemediationStatus]] = {
    RemediationStatus.open: {RemediationStatus.in_progress, RemediationStatus.wont_fix},
    RemediationStatus.in_progress: {
        RemediationStatus.resolved,
        RemediationStatus.wont_fix,
        RemediationStatus.open,
    },
    # resolved is terminal; only reopening to in_progress is allowed.
    # (verification was removed: the owning team self-resolves, sec team audits.)
    RemediationStatus.resolved: {RemediationStatus.in_progress},  # reopen
    RemediationStatus.verified: {RemediationStatus.in_progress},  # legacy reopen
    RemediationStatus.wont_fix: {RemediationStatus.open},  # reopen
}

_EDITABLE_STATUSES = {RemediationStatus.open, RemediationStatus.in_progress}
_EDITABLE_FIELDS = {"assigned_to", "target_date", "notes"}


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


def _require_editable(current: RemediationStatus, new_status: RemediationStatus | None) -> None:
    """Field edits need an active status before or after the request.

    Checking both sides keeps closing with a note and reopening with an edit valid.
    """
    if current in _EDITABLE_STATUSES or new_status in _EDITABLE_STATUSES:
        return
    raise ApiError(400, "remediation_not_editable")


def _apply_status(
    remediation: Remediation,
    new_status: RemediationStatus,
    wont_fix_reason: str | None,
    current_user: CurrentUser,
    details: dict,
) -> None:
    allowed = _TRANSITIONS.get(remediation.status, set())
    if new_status not in allowed:
        raise ApiError(400, "invalid_status_transition", old=remediation.status.value, new=new_status.value)

    reason = wont_fix_reason.strip() if wont_fix_reason else None
    if new_status == RemediationStatus.wont_fix and not reason:
        raise ApiError(400, "remediation_wontfix_requires_reason")

    old_status = remediation.status.value
    remediation.status = new_status
    details["old_status"] = old_status
    details["new_status"] = new_status.value

    if new_status == RemediationStatus.resolved:
        remediation.resolved_at = datetime.utcnow()
        remediation.resolved_by = current_user.id
    elif new_status in _EDITABLE_STATUSES and old_status in ("resolved", "verified", "wont_fix"):
        # Reopen: clear resolution/verification timestamps
        remediation.resolved_at = None
        remediation.resolved_by = None
        remediation.verified_at = None
        remediation.wont_fix_reason = None

    if new_status == RemediationStatus.wont_fix:
        remediation.wont_fix_reason = reason
        details["wont_fix_reason"] = reason


async def update_remediation(
    db: AsyncSession,
    current_user: CurrentUser,
    remediation: Remediation,
    body: RemediationUpdate,
) -> None:
    """Apply a PATCH: status transition, field edits, audit, notifications. Never commits."""
    sent = body.model_fields_set
    new_status = RemediationStatus[body.status] if body.status is not None else None

    if sent & _EDITABLE_FIELDS:
        _require_editable(remediation.status, new_status)

    details: dict = {}
    if new_status is not None:
        _apply_status(remediation, new_status, body.wont_fix_reason, current_user, details)

    newly_assigned: User | None = None
    if "assigned_to" in sent:
        new_assignee_id = body.assigned_to or None
        if new_assignee_id != remediation.assigned_to:
            if new_assignee_id:
                newly_assigned = await require_user(db, new_assignee_id)
            remediation.assigned_to = new_assignee_id
            details["assigned_to_id"] = new_assignee_id

    old_target_date = remediation.target_date
    target_date_changed = "target_date" in sent and body.target_date != old_target_date
    if target_date_changed:
        # An unchanged past date is not checked, so an overdue item can still get a notes edit.
        if body.target_date is not None and body.target_date < datetime.utcnow().date():
            raise ApiError(400, "remediation_target_date_past")
        remediation.target_date = body.target_date
        details["old_target_date"] = old_target_date.isoformat() if old_target_date else None
        details["target_date"] = body.target_date.isoformat() if body.target_date else None

    if "notes" in sent:
        new_notes = body.notes if body.notes and body.notes.strip() else None
        if new_notes != remediation.notes:
            remediation.notes = new_notes
            # Only a flag: note text stays out of the audit log.
            details["notes_changed"] = True

    if not details:
        return

    await log_action(db, current_user.id, "remediation_updated", "remediation", str(remediation.id), details)

    if newly_assigned is not None:
        await notif_svc.notify_remediation_assigned(db, remediation, current_user, newly_assigned.id)

    if target_date_changed:
        await notif_svc.notify_remediation_target_date_changed(
            db,
            remediation,
            current_user,
            old_target_date,
            body.target_date,
            exclude_user_ids=[newly_assigned.id] if newly_assigned else [],
        )

    if new_status is not None:
        await notif_svc.notify_remediation_status_change(
            db,
            remediation,
            current_user,
            details["old_status"],
            details["new_status"],
        )
        # Creator and assignee already got the status notification above.
        await sub_svc.broadcast_subscription_event(
            db,
            None,
            cve_id=remediation.cve_id,
            kind="remediation",
            params={"status": details["new_status"]},
            actor_id=current_user.id,
            exclude_user_ids=[uid for uid in (remediation.created_by, remediation.assigned_to) if uid],
            scope=[(remediation.namespace, remediation.cluster_name)],
        )

    logger.info(
        "remediation_updated",
        extra={"remediation_id": str(remediation.id), "user_id": current_user.id, "changed": sorted(details)},
    )
