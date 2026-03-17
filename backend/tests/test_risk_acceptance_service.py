"""Unit tests for app.services.risk_acceptance_service."""

import pytest
from fastapi import HTTPException

from app.schemas.risk_acceptance import RiskScope, RiskScopeTarget
from app.services.risk_acceptance_service import scope_key, validate_and_resolve_scope


class TestScopeKey:
    def test_deterministic(self):
        scope = RiskScope(mode="all", targets=[])
        assert scope_key(scope) == scope_key(scope)

    def test_different_inputs_differ(self):
        s1 = RiskScope(mode="all", targets=[])
        s2 = RiskScope(
            mode="namespace",
            targets=[RiskScopeTarget(cluster_name="c1", namespace="ns1")],
        )
        assert scope_key(s1) != scope_key(s2)


class TestValidateAndResolveScope:
    DEPLOYMENTS = [
        {
            "deployment_id": "d1",
            "cluster_name": "c1",
            "namespace": "ns1",
            "image_name": "img1",
        },
        {
            "deployment_id": "d2",
            "cluster_name": "c1",
            "namespace": "ns2",
            "image_name": "img2",
        },
    ]

    def test_all_mode(self):
        scope = RiskScope(mode="all", targets=[])
        result = validate_and_resolve_scope(scope, self.DEPLOYMENTS)
        assert result.mode == "all"
        assert result.targets == []

    def test_namespace_valid(self):
        scope = RiskScope(
            mode="namespace",
            targets=[RiskScopeTarget(cluster_name="c1", namespace="ns1")],
        )
        result = validate_and_resolve_scope(scope, self.DEPLOYMENTS)
        assert result.mode == "namespace"
        assert len(result.targets) == 1

    def test_namespace_invalid(self):
        scope = RiskScope(
            mode="namespace",
            targets=[RiskScopeTarget(cluster_name="c1", namespace="nope")],
        )
        with pytest.raises(HTTPException) as exc_info:
            validate_and_resolve_scope(scope, self.DEPLOYMENTS)
        assert exc_info.value.status_code == 400

    def test_image_mode_valid(self):
        scope = RiskScope(
            mode="image",
            targets=[
                RiskScopeTarget(cluster_name="c1", namespace="ns1", image_name="img1")
            ],
        )
        result = validate_and_resolve_scope(scope, self.DEPLOYMENTS)
        assert result.mode == "image"

    def test_image_mode_missing_image_name(self):
        scope = RiskScope(
            mode="image",
            targets=[RiskScopeTarget(cluster_name="c1", namespace="ns1")],
        )
        with pytest.raises(HTTPException) as exc_info:
            validate_and_resolve_scope(scope, self.DEPLOYMENTS)
        assert exc_info.value.status_code == 400

    def test_deployment_valid(self):
        scope = RiskScope(
            mode="deployment",
            targets=[
                RiskScopeTarget(
                    cluster_name="c1",
                    namespace="ns1",
                    deployment_id="d1",
                )
            ],
        )
        result = validate_and_resolve_scope(scope, self.DEPLOYMENTS)
        assert result.mode == "deployment"
        assert len(result.targets) == 1
        assert result.targets[0].deployment_id == "d1"

    def test_deployment_invalid_id(self):
        scope = RiskScope(
            mode="deployment",
            targets=[
                RiskScopeTarget(
                    cluster_name="c1",
                    namespace="ns1",
                    deployment_id="d999",
                )
            ],
        )
        with pytest.raises(HTTPException) as exc_info:
            validate_and_resolve_scope(scope, self.DEPLOYMENTS)
        assert exc_info.value.status_code == 400

    def test_deployment_dedup(self):
        scope = RiskScope(
            mode="deployment",
            targets=[
                RiskScopeTarget(cluster_name="c1", namespace="ns1", deployment_id="d1"),
                RiskScopeTarget(cluster_name="c1", namespace="ns1", deployment_id="d1"),
            ],
        )
        result = validate_and_resolve_scope(scope, self.DEPLOYMENTS)
        assert len(result.targets) == 1

    def test_namespace_dedup(self):
        scope = RiskScope(
            mode="namespace",
            targets=[
                RiskScopeTarget(cluster_name="c1", namespace="ns1"),
                RiskScopeTarget(cluster_name="c1", namespace="ns1"),
            ],
        )
        result = validate_and_resolve_scope(scope, self.DEPLOYMENTS)
        assert len(result.targets) == 1
