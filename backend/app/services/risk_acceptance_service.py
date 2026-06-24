"""Shared risk acceptance scope validation and key generation."""

import hashlib
import json

from ..i18n import ApiError
from ..schemas.risk_acceptance import RiskScope, RiskScopeTarget


def is_single_team_scope(scope: RiskScope) -> bool:
    """True if the scope stays within a single team (one cluster/namespace pair).

    Team boundary is the namespace. A scope is single-team only when it targets
    exactly one (cluster_name, namespace) pair. mode='all' is org-wide (multi-team),
    and scopes spanning more than one namespace affect multiple teams. Single-team
    scopes are auto-approved; multi-team scopes require sec-team review.
    """
    if scope.mode == "all":
        return False
    distinct = {(t.cluster_name, t.namespace) for t in scope.targets}
    return len(distinct) == 1


def scope_key(scope: RiskScope) -> str:
    """Compute a deterministic hash for a normalized scope."""
    canonical = json.dumps(scope.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
    return hashlib.md5(canonical.encode("utf-8")).hexdigest()


def deployment_covered_by_scope(scope: dict | RiskScope, deployment: dict) -> bool:
    """True if a single affected deployment falls within the given scope.

    Mirrors the per-mode matching used when validating scope targets. Accepts a
    plain dict because risk-acceptance / suppression scopes are stored as JSONB.
    Suppression scopes only use modes 'all' and 'namespace'; the extra modes are
    handled here so the same helper serves both call sites.
    """
    if isinstance(scope, RiskScope):
        scope = scope.model_dump(mode="json")

    mode = scope.get("mode", "all")
    targets = scope.get("targets", []) or []

    cluster = deployment["cluster_name"]
    namespace = deployment["namespace"]

    if mode == "all":
        return True
    if mode == "namespace":
        return any(t["cluster_name"] == cluster and t["namespace"] == namespace for t in targets)
    if mode == "image":
        image_name = deployment.get("image_name", "")
        return any(
            t["cluster_name"] == cluster and t["namespace"] == namespace and t.get("image_name") == image_name
            for t in targets
        )
    if mode == "deployment":
        deployment_id = str(deployment["deployment_id"])
        return any(str(t.get("deployment_id")) == deployment_id for t in targets)
    return False


def validate_and_resolve_scope(body_scope: RiskScope, deployments: list[dict]) -> RiskScope:
    """Validate scope targets against affected deployments and return normalized scope."""
    by_deployment = {str(d["deployment_id"]): d for d in deployments}
    available_namespaces = {(d["cluster_name"], d["namespace"]) for d in deployments}
    available_images = {(d["cluster_name"], d["namespace"], d.get("image_name", "")) for d in deployments}

    if body_scope.mode == "all":
        return RiskScope(mode="all", targets=[])

    if body_scope.mode == "namespace":
        normalized: set[tuple[str, str]] = set()
        for target in body_scope.targets:
            key = (target.cluster_name, target.namespace)
            if key not in available_namespaces:
                raise ApiError(400, "scope_namespaces_without_cve")
            normalized.add(key)
        targets = [
            RiskScopeTarget(cluster_name=cluster, namespace=namespace) for cluster, namespace in sorted(normalized)
        ]
        return RiskScope(mode="namespace", targets=targets)

    if body_scope.mode == "image":
        normalized_img: set[tuple[str, str, str]] = set()
        for target in body_scope.targets:
            if not target.image_name:
                raise ApiError(400, "scope_image_requires_name")
            key = (target.cluster_name, target.namespace, target.image_name)
            if key not in available_images:
                raise ApiError(400, "scope_images_without_cve")
            normalized_img.add(key)
        targets = [
            RiskScopeTarget(cluster_name=cluster, namespace=namespace, image_name=image_name)
            for cluster, namespace, image_name in sorted(normalized_img)
        ]
        return RiskScope(mode="image", targets=targets)

    # mode == deployment
    normalized_targets: list[RiskScopeTarget] = []
    seen_ids: set[str] = set()
    for target in body_scope.targets:
        if not target.deployment_id:
            raise ApiError(400, "scope_deployment_requires_id")
        if target.deployment_id in seen_ids:
            continue
        deployment = by_deployment.get(target.deployment_id)
        if not deployment:
            raise ApiError(400, "scope_deployments_without_cve")
        seen_ids.add(target.deployment_id)
        normalized_targets.append(
            RiskScopeTarget(
                cluster_name=deployment["cluster_name"],
                namespace=deployment["namespace"],
                image_name=deployment.get("image_name", ""),
                deployment_id=str(deployment["deployment_id"]),
            )
        )

    if not normalized_targets:
        raise ApiError(400, "scope_deployment_requires_target")

    normalized_targets.sort(key=lambda t: (t.cluster_name, t.namespace, t.deployment_id or ""))
    return RiskScope(mode="deployment", targets=normalized_targets)
