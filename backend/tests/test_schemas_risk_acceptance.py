"""Unit tests for risk acceptance Pydantic schemas."""

import pytest
from pydantic import ValidationError

from app.schemas.risk_acceptance import RiskAcceptanceCreate, RiskScope, RiskScopeTarget


class TestRiskScope:
    def test_all_with_targets_raises(self):
        with pytest.raises(ValidationError):
            RiskScope(
                mode="all",
                targets=[RiskScopeTarget(cluster_name="c1", namespace="ns1")],
            )

    def test_all_no_targets_ok(self):
        scope = RiskScope(mode="all", targets=[])
        assert scope.mode == "all"

    def test_namespace_no_targets_raises(self):
        with pytest.raises(ValidationError):
            RiskScope(mode="namespace", targets=[])

    def test_namespace_with_targets_ok(self):
        scope = RiskScope(
            mode="namespace",
            targets=[RiskScopeTarget(cluster_name="c1", namespace="ns1")],
        )
        assert scope.mode == "namespace"
        assert len(scope.targets) == 1


class TestRiskAcceptanceCreate:
    def test_valid_cve_id(self):
        ra = RiskAcceptanceCreate(
            cve_id="CVE-2024-12345",
            justification="This is a valid justification text.",
            scope=RiskScope(mode="all", targets=[]),
        )
        assert ra.cve_id == "CVE-2024-12345"

    def test_invalid_cve_id_pattern(self):
        with pytest.raises(ValidationError):
            RiskAcceptanceCreate(
                cve_id="not-a-cve",
                justification="This is a valid justification text.",
                scope=RiskScope(mode="all", targets=[]),
            )

    def test_justification_too_short(self):
        with pytest.raises(ValidationError):
            RiskAcceptanceCreate(
                cve_id="CVE-2024-12345",
                justification="short",
                scope=RiskScope(mode="all", targets=[]),
            )

    def test_justification_max_length(self):
        ra = RiskAcceptanceCreate(
            cve_id="CVE-2024-12345",
            justification="x" * 5000,
            scope=RiskScope(mode="all", targets=[]),
        )
        assert len(ra.justification) == 5000

    def test_justification_over_max_raises(self):
        with pytest.raises(ValidationError):
            RiskAcceptanceCreate(
                cve_id="CVE-2024-12345",
                justification="x" * 5001,
                scope=RiskScope(mode="all", targets=[]),
            )
