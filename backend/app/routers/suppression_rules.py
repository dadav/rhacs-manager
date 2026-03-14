from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db, get_stackrox_db
from ..models.suppression_rule import (
    SuppressionRule,
    SuppressionStatus,
    SuppressionType,
)
from ..models.user import User
from ..schemas.suppression_rule import (
    SuppressionRuleCreate,
    SuppressionRuleResponse,
    SuppressionRuleReview,
    SuppressionRuleUpdate,
    SuppressionScope,
)
from ..notifications.service import (
    notify_suppression_requested,
    notify_suppression_status_change,
)
from ..services.audit_service import log_action
from ..services.cve_filter_service import compute_per_rule_matched_counts
from ..services.risk_acceptance_service import scope_key, validate_and_resolve_scope
from ..schemas.risk_acceptance import RiskScope
from ..stackrox import queries as sx

router = APIRouter(prefix="/suppression-rules", tags=["suppression-rules"])


def _suppression_scope_to_risk_scope(scope: SuppressionScope) -> RiskScope:
    """Convert SuppressionScope to RiskScope for reusing validation logic."""
    return RiskScope(mode=scope.mode, targets=scope.targets)


def _risk_scope_to_suppression_scope(rs: RiskScope) -> SuppressionScope:
    """Convert RiskScope back to SuppressionScope after validation."""
    return SuppressionScope(mode=rs.mode, targets=rs.targets)


async def _build_response(
    rule: SuppressionRule, db: AsyncSession, matched_cve_count: int = 0
) -> SuppressionRuleResponse:
    creator_result = await db.execute(select(User).where(User.id == rule.created_by))
    creator = creator_result.scalar_one_or_none()

    reviewer = None
    if rule.reviewed_by:
        rev_result = await db.execute(select(User).where(User.id == rule.reviewed_by))
        reviewer = rev_result.scalar_one_or_none()

    rule_scope: SuppressionScope | None = None
    if rule.type == SuppressionType.cve and rule.scope:
        rule_scope = SuppressionScope(**rule.scope)

    return SuppressionRuleResponse(
        id=rule.id,
        status=rule.status.value,
        type=rule.type.value,
        component_name=rule.component_name,
        version_pattern=rule.version_pattern,
        cve_id=rule.cve_id,
        reason=rule.reason,
        reference_url=rule.reference_url,
        review_comment=rule.review_comment,
        created_at=rule.created_at,
        created_by=rule.created_by,
        created_by_name=creator.username if creator else rule.created_by,
        reviewed_by=rule.reviewed_by,
        reviewed_by_name=reviewer.username if reviewer else None,
        reviewed_at=rule.reviewed_at,
        matched_cve_count=matched_cve_count,
        scope=rule_scope,
    )


async def _resolve_cve_scope(
    body_scope: SuppressionScope,
    cve_id: str,
    current_user: CurrentUser,
    sx_db: AsyncSession,
) -> tuple[SuppressionScope, str]:
    """Validate and resolve scope for a CVE suppression rule. Returns (scope, scope_key)."""
    if current_user.can_see_all_namespaces:
        all_ns = await sx.list_namespaces(sx_db)
        ns_list = [(r["namespace"], r["cluster_name"]) for r in all_ns]
    else:
        ns_list = current_user.namespaces

    deployments = await sx.get_affected_deployments(sx_db, cve_id, ns_list)
    risk_scope = _suppression_scope_to_risk_scope(body_scope)
    resolved = validate_and_resolve_scope(risk_scope, deployments)
    resolved_scope = _risk_scope_to_suppression_scope(resolved)
    key = scope_key(resolved)
    return resolved_scope, key


@router.post("", response_model=SuppressionRuleResponse, status_code=201)
async def create_suppression_rule(
    body: SuppressionRuleCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> SuppressionRuleResponse:
    # Sec team creates directly as approved, team members as requested
    initial_status = (
        SuppressionStatus.approved
        if current_user.is_sec_team
        else SuppressionStatus.requested
    )

    rule_scope_dict: dict = {"mode": "all", "targets": []}
    rule_scope_key: str = ""

    # Check for existing active rule with same target
    if body.type == "component":
        existing = await db.execute(
            select(SuppressionRule).where(
                SuppressionRule.type == SuppressionType.component,
                SuppressionRule.component_name == body.component_name,
                SuppressionRule.version_pattern == body.version_pattern,
                SuppressionRule.status.in_(
                    [SuppressionStatus.requested, SuppressionStatus.approved]
                ),
            )
        )
    else:
        # Validate and resolve scope
        assert body.scope is not None  # guaranteed by schema validator
        resolved_scope, rule_scope_key = await _resolve_cve_scope(
            body.scope, body.cve_id, current_user, sx_db
        )
        rule_scope_dict = resolved_scope.model_dump(mode="json")

        existing = await db.execute(
            select(SuppressionRule).where(
                SuppressionRule.type == SuppressionType.cve,
                SuppressionRule.cve_id == body.cve_id,
                SuppressionRule.scope_key == rule_scope_key,
                SuppressionRule.status.in_(
                    [SuppressionStatus.requested, SuppressionStatus.approved]
                ),
            )
        )

    if existing.scalar_one_or_none():
        raise HTTPException(
            409, "Für dieses Ziel existiert bereits eine aktive Unterdrückungsregel"
        )

    rule = SuppressionRule(
        status=initial_status,
        type=SuppressionType(body.type),
        component_name=body.component_name,
        version_pattern=body.version_pattern,
        cve_id=body.cve_id,
        reason=body.reason,
        reference_url=body.reference_url,
        scope=rule_scope_dict,
        scope_key=rule_scope_key,
        created_by=current_user.id,
        reviewed_by=current_user.id if current_user.is_sec_team else None,
        reviewed_at=datetime.utcnow() if current_user.is_sec_team else None,
    )
    db.add(rule)
    await db.flush()

    await log_action(
        db,
        current_user.id,
        "suppression_rule_created",
        "suppression_rule",
        str(rule.id),
    )

    # Notify sec team about new request from team members
    if initial_status == SuppressionStatus.requested:
        creator_result = await db.execute(
            select(User).where(User.id == current_user.id)
        )
        creator = creator_result.scalar_one()
        await notify_suppression_requested(db, rule, creator)

    await db.commit()
    await db.refresh(rule)
    return await _build_response(rule, db)


@router.get("", response_model=list[SuppressionRuleResponse])
async def list_suppression_rules(
    status: str | None = Query(None),
    type: str | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> list[SuppressionRuleResponse]:
    query = select(SuppressionRule).order_by(SuppressionRule.created_at.desc())

    if status:
        try:
            query = query.where(SuppressionRule.status == SuppressionStatus[status])
        except KeyError:
            raise HTTPException(400, f"Ungültiger Status: {status}")

    if type:
        try:
            query = query.where(SuppressionRule.type == SuppressionType[type])
        except KeyError:
            raise HTTPException(400, f"Ungültiger Typ: {type}")

    result = await db.execute(query)
    rules = list(result.scalars().all())

    # Compute matched CVE counts from StackRox data
    all_cve_ids = await sx.get_all_deployed_cve_ids(sx_db)
    all_cve_id_set = set(all_cve_ids)

    has_component_rules = any(r.type == SuppressionType.component for r in rules)
    component_version_map: dict[str, list[tuple[str, str]]] = {}
    if has_component_rules:
        component_version_map = await sx.get_global_component_version_map(sx_db)

    counts = compute_per_rule_matched_counts(
        rules, all_cve_id_set, component_version_map
    )

    return [
        await _build_response(rule, db, matched_cve_count=counts.get(rule.id, 0))
        for rule in rules
    ]


@router.get("/{rule_id}", response_model=SuppressionRuleResponse)
async def get_suppression_rule(
    rule_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> SuppressionRuleResponse:
    result = await db.execute(
        select(SuppressionRule).where(SuppressionRule.id == rule_id)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(404, "Nicht gefunden")

    all_cve_ids = await sx.get_all_deployed_cve_ids(sx_db)
    all_cve_id_set = set(all_cve_ids)

    component_version_map: dict[str, list[tuple[str, str]]] = {}
    if rule.type == SuppressionType.component:
        component_version_map = await sx.get_global_component_version_map(sx_db)

    counts = compute_per_rule_matched_counts(
        [rule], all_cve_id_set, component_version_map
    )
    return await _build_response(rule, db, matched_cve_count=counts.get(rule.id, 0))


@router.put("/{rule_id}", response_model=SuppressionRuleResponse)
async def update_suppression_rule(
    rule_id: UUID,
    body: SuppressionRuleUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> SuppressionRuleResponse:
    result = await db.execute(
        select(SuppressionRule).where(SuppressionRule.id == rule_id)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(404, "Nicht gefunden")

    # Creator can update while requested; sec team can always update
    if not current_user.is_sec_team:
        if rule.created_by != current_user.id:
            raise HTTPException(403, "Nur der Ersteller kann die Regel ändern")
        if rule.status != SuppressionStatus.requested:
            raise HTTPException(400, "Nur beantragte Regeln können geändert werden")

    rule.reason = body.reason
    rule.reference_url = body.reference_url

    # Update scope for CVE-type rules if provided
    if body.scope is not None and rule.type == SuppressionType.cve:
        resolved_scope, new_scope_key = await _resolve_cve_scope(
            body.scope, rule.cve_id, current_user, sx_db
        )
        # Check for conflicting active rule with new scope_key
        if new_scope_key != rule.scope_key:
            conflict = await db.execute(
                select(SuppressionRule).where(
                    SuppressionRule.type == SuppressionType.cve,
                    SuppressionRule.cve_id == rule.cve_id,
                    SuppressionRule.scope_key == new_scope_key,
                    SuppressionRule.id != rule.id,
                    SuppressionRule.status.in_(
                        [SuppressionStatus.requested, SuppressionStatus.approved]
                    ),
                )
            )
            if conflict.scalar_one_or_none():
                raise HTTPException(
                    409,
                    "Für dieses Ziel existiert bereits eine aktive Unterdrückungsregel",
                )
        rule.scope = resolved_scope.model_dump(mode="json")
        rule.scope_key = new_scope_key

    # If team member updates an approved/rejected rule, reset to requested
    reset_to_requested = False
    if not current_user.is_sec_team and rule.status in (
        SuppressionStatus.approved,
        SuppressionStatus.rejected,
    ):
        rule.status = SuppressionStatus.requested
        rule.reviewed_by = None
        rule.reviewed_at = None
        rule.review_comment = None
        reset_to_requested = True

    await log_action(
        db,
        current_user.id,
        "suppression_rule_updated",
        "suppression_rule",
        str(rule.id),
    )

    # Notify sec team if status was reset to requested
    if reset_to_requested:
        creator_result = await db.execute(
            select(User).where(User.id == current_user.id)
        )
        creator = creator_result.scalar_one()
        await notify_suppression_requested(db, rule, creator)

    await db.commit()
    await db.refresh(rule)
    return await _build_response(rule, db)


@router.patch("/{rule_id}", response_model=SuppressionRuleResponse)
async def review_suppression_rule(
    rule_id: UUID,
    body: SuppressionRuleReview,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> SuppressionRuleResponse:
    if not current_user.is_sec_team:
        raise HTTPException(
            403, "Nur das Security-Team kann Unterdrückungsregeln überprüfen"
        )

    result = await db.execute(
        select(SuppressionRule).where(SuppressionRule.id == rule_id)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(404, "Nicht gefunden")
    if rule.status != SuppressionStatus.requested:
        raise HTTPException(400, "Nur beantragte Regeln können überprüft werden")

    rule.status = (
        SuppressionStatus.approved if body.approved else SuppressionStatus.rejected
    )
    rule.reviewed_by = current_user.id
    rule.reviewed_at = datetime.utcnow()
    rule.review_comment = body.comment

    await log_action(
        db,
        current_user.id,
        "suppression_rule_reviewed",
        "suppression_rule",
        str(rule.id),
        {"status": rule.status.value},
    )

    # Notify the rule creator about the review decision
    reviewer_result = await db.execute(select(User).where(User.id == current_user.id))
    reviewer = reviewer_result.scalar_one()
    await notify_suppression_status_change(db, rule, reviewer)

    await db.commit()
    await db.refresh(rule)
    return await _build_response(rule, db)


@router.delete("/{rule_id}", status_code=204)
async def delete_suppression_rule(
    rule_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> None:
    result = await db.execute(
        select(SuppressionRule).where(SuppressionRule.id == rule_id)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(404, "Nicht gefunden")

    # Team members can only withdraw their own requested rules
    if not current_user.is_sec_team:
        if rule.created_by != current_user.id:
            raise HTTPException(403, "Nur der Ersteller kann die Regel zurückziehen")
        if rule.status != SuppressionStatus.requested:
            raise HTTPException(
                400, "Nur beantragte Regeln können zurückgezogen werden"
            )

    await log_action(
        db,
        current_user.id,
        "suppression_rule_deleted",
        "suppression_rule",
        str(rule.id),
    )
    await db.delete(rule)
    await db.commit()
