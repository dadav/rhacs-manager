"""Unit tests for app.services.risk_acceptance_service."""

import pytest
from fastapi import HTTPException

from app.schemas.risk_acceptance import RiskScope, RiskScopeTarget
from app.services.risk_acceptance_service import (
    deployment_covered_by_scope,
    is_single_team_scope,
    scope_key,
    validate_and_resolve_scope,
)


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
            targets=[RiskScopeTarget(cluster_name="c1", namespace="ns1", image_name="img1")],
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


class TestIsSingleTeamScope:
    def test_all_mode_is_multi_team(self):
        assert is_single_team_scope(RiskScope(mode="all", targets=[])) is False

    def test_single_namespace_is_single_team(self):
        scope = RiskScope(
            mode="namespace",
            targets=[RiskScopeTarget(cluster_name="c1", namespace="ns1")],
        )
        assert is_single_team_scope(scope) is True

    def test_multiple_namespaces_is_multi_team(self):
        scope = RiskScope(
            mode="namespace",
            targets=[
                RiskScopeTarget(cluster_name="c1", namespace="ns1"),
                RiskScopeTarget(cluster_name="c1", namespace="ns2"),
            ],
        )
        assert is_single_team_scope(scope) is False

    def test_multiple_targets_one_namespace_is_single_team(self):
        # image/deployment scopes with several targets in the same namespace stay single-team
        scope = RiskScope(
            mode="image",
            targets=[
                RiskScopeTarget(cluster_name="c1", namespace="ns1", image_name="img1"),
                RiskScopeTarget(cluster_name="c1", namespace="ns1", image_name="img2"),
            ],
        )
        assert is_single_team_scope(scope) is True

    def test_same_namespace_different_clusters_is_multi_team(self):
        scope = RiskScope(
            mode="namespace",
            targets=[
                RiskScopeTarget(cluster_name="c1", namespace="ns1"),
                RiskScopeTarget(cluster_name="c2", namespace="ns1"),
            ],
        )
        assert is_single_team_scope(scope) is False


class TestDeploymentCoveredByScope:
    DEPLOYMENT = {
        "deployment_id": "d1",
        "cluster_name": "c1",
        "namespace": "ns1",
        "image_name": "img1",
    }

    def test_all_mode_covers_everything(self):
        assert deployment_covered_by_scope({"mode": "all", "targets": []}, self.DEPLOYMENT) is True

    def test_namespace_match(self):
        scope = {"mode": "namespace", "targets": [{"cluster_name": "c1", "namespace": "ns1"}]}
        assert deployment_covered_by_scope(scope, self.DEPLOYMENT) is True

    def test_namespace_no_match(self):
        scope = {"mode": "namespace", "targets": [{"cluster_name": "c1", "namespace": "ns2"}]}
        assert deployment_covered_by_scope(scope, self.DEPLOYMENT) is False

    def test_image_match(self):
        scope = {
            "mode": "image",
            "targets": [{"cluster_name": "c1", "namespace": "ns1", "image_name": "img1"}],
        }
        assert deployment_covered_by_scope(scope, self.DEPLOYMENT) is True

    def test_image_no_match(self):
        scope = {
            "mode": "image",
            "targets": [{"cluster_name": "c1", "namespace": "ns1", "image_name": "other"}],
        }
        assert deployment_covered_by_scope(scope, self.DEPLOYMENT) is False

    def test_deployment_match(self):
        scope = {"mode": "deployment", "targets": [{"deployment_id": "d1"}]}
        assert deployment_covered_by_scope(scope, self.DEPLOYMENT) is True

    def test_deployment_no_match(self):
        scope = {"mode": "deployment", "targets": [{"deployment_id": "d999"}]}
        assert deployment_covered_by_scope(scope, self.DEPLOYMENT) is False

    def test_accepts_riskscope_object(self):
        scope = RiskScope(
            mode="namespace",
            targets=[RiskScopeTarget(cluster_name="c1", namespace="ns1")],
        )
        assert deployment_covered_by_scope(scope, self.DEPLOYMENT) is True
