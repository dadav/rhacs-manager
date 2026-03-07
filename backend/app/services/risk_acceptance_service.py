"""Shared risk acceptance scope validation and key generation."""

import hashlib
import json

from fastapi import HTTPException

from ..schemas.risk_acceptance import RiskScope, RiskScopeTarget


def scope_key(scope: RiskScope) -> str:
    """Compute a deterministic hash for a normalized scope."""
    canonical = json.dumps(scope.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
    return hashlib.md5(canonical.encode("utf-8")).hexdigest()


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
                raise HTTPException(400, "Scope enthält Namespaces ohne diese CVE")
            normalized.add(key)
        targets = [
            RiskScopeTarget(cluster_name=cluster, namespace=namespace)
            for cluster, namespace in sorted(normalized)
        ]
        return RiskScope(mode="namespace", targets=targets)

    if body_scope.mode == "image":
        normalized_img: set[tuple[str, str, str]] = set()
        for target in body_scope.targets:
            if not target.image_name:
                raise HTTPException(400, "Image-Scope erfordert image_name für jedes Target")
            key = (target.cluster_name, target.namespace, target.image_name)
            if key not in available_images:
                raise HTTPException(400, "Scope enthält Images ohne diese CVE")
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
            raise HTTPException(400, "Deployment-Scope erfordert deployment_id für jedes Target")
        if target.deployment_id in seen_ids:
            continue
        deployment = by_deployment.get(target.deployment_id)
        if not deployment:
            raise HTTPException(400, "Scope enthält Deployments ohne diese CVE")
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
        raise HTTPException(400, "Für Deployment-Scope sind mindestens ein Target erforderlich")

    normalized_targets.sort(key=lambda t: (t.cluster_name, t.namespace, t.deployment_id or ""))
    return RiskScope(mode="deployment", targets=normalized_targets)
