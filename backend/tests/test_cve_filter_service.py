"""Unit tests for pure functions in app.services.cve_filter_service."""

from types import SimpleNamespace
from uuid import uuid4

from app.models.suppression_rule import SuppressionStatus, SuppressionType
from app.schemas.cve import SeverityLevel
from app.services.cve_filter_service import (
    _build_cve_item,
    _compute_suppressed_cves,
    _is_cve_suppressed_by_rules,
    _matches_component_rule,
    compute_per_rule_matched_counts,
)


def _make_rule(
    *,
    type: SuppressionType = SuppressionType.cve,
    status: SuppressionStatus = SuppressionStatus.approved,
    cve_id: str | None = None,
    component_name: str | None = None,
    version_pattern: str | None = None,
    scope: dict | None = None,
) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid4(),
        type=type,
        status=status,
        cve_id=cve_id,
        component_name=component_name,
        version_pattern=version_pattern,
        scope=scope,
    )


# --- _matches_component_rule ---


class TestMatchesComponentRule:
    def test_exact_name_any_version(self):
        rule = _make_rule(
            type=SuppressionType.component,
            component_name="openssl",
            version_pattern=None,
        )
        assert _matches_component_rule(rule, [("openssl", "1.1.1")]) is True

    def test_wildcard_version(self):
        rule = _make_rule(
            type=SuppressionType.component,
            component_name="openssl",
            version_pattern="1.1.*",
        )
        assert _matches_component_rule(rule, [("openssl", "1.1.3")]) is True

    def test_wrong_name(self):
        rule = _make_rule(
            type=SuppressionType.component,
            component_name="openssl",
            version_pattern=None,
        )
        assert _matches_component_rule(rule, [("libcurl", "7.0")]) is False

    def test_version_mismatch(self):
        rule = _make_rule(
            type=SuppressionType.component,
            component_name="openssl",
            version_pattern="3.*",
        )
        assert _matches_component_rule(rule, [("openssl", "1.1.1")]) is False

    def test_empty_components(self):
        rule = _make_rule(
            type=SuppressionType.component,
            component_name="openssl",
            version_pattern=None,
        )
        assert _matches_component_rule(rule, []) is False


# --- _is_cve_suppressed_by_rules ---


class TestIsCveSuppressedByRules:
    def test_global_scope_suppresses(self):
        rule = _make_rule(
            cve_id="CVE-2024-0001",
            scope={"mode": "all", "targets": []},
        )
        result = _is_cve_suppressed_by_rules("CVE-2024-0001", [rule], {}, None)
        assert result is True

    def test_namespace_full_coverage(self):
        rule = _make_rule(
            cve_id="CVE-2024-0001",
            scope={
                "mode": "namespace",
                "targets": [
                    {"cluster_name": "c1", "namespace": "ns1"},
                    {"cluster_name": "c1", "namespace": "ns2"},
                ],
            },
        )
        ns_map = {"CVE-2024-0001": {("c1", "ns1"), ("c1", "ns2")}}
        result = _is_cve_suppressed_by_rules("CVE-2024-0001", [rule], ns_map, None)
        assert result is True

    def test_namespace_partial_coverage(self):
        rule = _make_rule(
            cve_id="CVE-2024-0001",
            scope={
                "mode": "namespace",
                "targets": [{"cluster_name": "c1", "namespace": "ns1"}],
            },
        )
        ns_map = {"CVE-2024-0001": {("c1", "ns1"), ("c1", "ns2")}}
        result = _is_cve_suppressed_by_rules("CVE-2024-0001", [rule], ns_map, None)
        assert result is False

    def test_no_matching_rules(self):
        rule = _make_rule(cve_id="CVE-2024-9999", scope={"mode": "all", "targets": []})
        result = _is_cve_suppressed_by_rules("CVE-2024-0001", [rule], {}, None)
        assert result is False

    def test_empty_locations(self):
        rule = _make_rule(
            cve_id="CVE-2024-0001",
            scope={
                "mode": "namespace",
                "targets": [{"cluster_name": "c1", "namespace": "ns1"}],
            },
        )
        ns_map: dict = {"CVE-2024-0001": set()}
        result = _is_cve_suppressed_by_rules("CVE-2024-0001", [rule], ns_map, None)
        assert result is False

    def test_user_namespace_narrowing(self):
        """Rule covers ns1 and ns2, but user only sees ns1 → suppressed."""
        rule = _make_rule(
            cve_id="CVE-2024-0001",
            scope={
                "mode": "namespace",
                "targets": [{"cluster_name": "c1", "namespace": "ns1"}],
            },
        )
        ns_map = {"CVE-2024-0001": {("c1", "ns1"), ("c1", "ns2")}}
        user_ns = {("c1", "ns1")}
        result = _is_cve_suppressed_by_rules("CVE-2024-0001", [rule], ns_map, user_ns)
        assert result is True


# --- _compute_suppressed_cves ---


class TestComputeSuppressedCves:
    def test_cve_rule_global(self):
        rule = _make_rule(
            cve_id="CVE-2024-0001",
            scope={"mode": "all", "targets": []},
        )
        result = _compute_suppressed_cves(
            cve_rules=[rule],
            component_rules=[],
            component_version_map={},
            all_cve_ids=["CVE-2024-0001", "CVE-2024-0002"],
            cve_namespace_map={},
        )
        assert result == {"CVE-2024-0001"}

    def test_component_rule_suppression(self):
        comp_rule = _make_rule(
            type=SuppressionType.component,
            component_name="openssl",
            version_pattern=None,
        )
        result = _compute_suppressed_cves(
            cve_rules=[],
            component_rules=[comp_rule],
            component_version_map={"CVE-2024-0001": [("openssl", "1.1.1")]},
            all_cve_ids=["CVE-2024-0001"],
        )
        assert result == {"CVE-2024-0001"}

    def test_combined_cve_and_component(self):
        cve_rule = _make_rule(
            cve_id="CVE-2024-0001",
            scope={"mode": "all", "targets": []},
        )
        comp_rule = _make_rule(
            type=SuppressionType.component,
            component_name="libcurl",
            version_pattern=None,
        )
        result = _compute_suppressed_cves(
            cve_rules=[cve_rule],
            component_rules=[comp_rule],
            component_version_map={"CVE-2024-0002": [("libcurl", "7.8")]},
            all_cve_ids=["CVE-2024-0001", "CVE-2024-0002", "CVE-2024-0003"],
            cve_namespace_map={},
        )
        assert result == {"CVE-2024-0001", "CVE-2024-0002"}

    def test_no_namespace_map_fallback(self):
        """Without cve_namespace_map, CVE rules suppress by ID match alone."""
        rule = _make_rule(
            cve_id="CVE-2024-0001",
            scope={
                "mode": "namespace",
                "targets": [{"cluster_name": "c1", "namespace": "ns1"}],
            },
        )
        result = _compute_suppressed_cves(
            cve_rules=[rule],
            component_rules=[],
            component_version_map={},
            all_cve_ids=["CVE-2024-0001"],
            cve_namespace_map=None,
        )
        assert result == {"CVE-2024-0001"}

    def test_empty_rules(self):
        result = _compute_suppressed_cves(
            cve_rules=[],
            component_rules=[],
            component_version_map={},
            all_cve_ids=["CVE-2024-0001"],
        )
        assert result == set()


# --- compute_per_rule_matched_counts ---


class TestComputePerRuleMatchedCounts:
    def test_cve_rule_present(self):
        rule = _make_rule(cve_id="CVE-2024-0001")
        counts = compute_per_rule_matched_counts([rule], {"CVE-2024-0001", "CVE-2024-0002"}, {})
        assert counts[rule.id] == 1

    def test_cve_rule_absent(self):
        rule = _make_rule(cve_id="CVE-2024-9999")
        counts = compute_per_rule_matched_counts([rule], {"CVE-2024-0001"}, {})
        assert counts[rule.id] == 0

    def test_component_rule_multiple_matches(self):
        rule = _make_rule(
            type=SuppressionType.component,
            component_name="openssl",
            version_pattern=None,
        )
        comp_map = {
            "CVE-2024-0001": [("openssl", "1.1.1")],
            "CVE-2024-0002": [("openssl", "3.0.0")],
            "CVE-2024-0003": [("libcurl", "7.0")],
        }
        counts = compute_per_rule_matched_counts(
            [rule],
            {"CVE-2024-0001", "CVE-2024-0002", "CVE-2024-0003"},
            comp_map,
        )
        assert counts[rule.id] == 2

    def test_component_rule_zero_matches(self):
        rule = _make_rule(
            type=SuppressionType.component,
            component_name="zlib",
            version_pattern=None,
        )
        counts = compute_per_rule_matched_counts(
            [rule],
            {"CVE-2024-0001"},
            {"CVE-2024-0001": [("openssl", "1.1.1")]},
        )
        assert counts[rule.id] == 0


# --- _build_cve_item ---


class TestBuildCveItem:
    def _base_cve(self, **overrides) -> dict:
        defaults = {
            "cve_id": "CVE-2024-0001",
            "severity": 3,
            "cvss": 7.5,
            "epss_probability": 0.05,
            "impact_score": 6.0,
            "fixable": True,
            "fixed_by": "1.2.0",
            "affected_images": 2,
            "affected_deployments": 3,
            "first_seen": None,
            "published_on": None,
            "operating_system": "rhel:9",
        }
        defaults.update(overrides)
        return defaults

    def test_basic_construction(self):
        item = _build_cve_item(self._base_cve(), {}, {})
        assert item.cve_id == "CVE-2024-0001"
        assert item.severity == SeverityLevel.IMPORTANT
        assert item.has_priority is False
        assert item.has_risk_acceptance is False
        assert item.is_suppressed is False

    def test_with_priority(self):
        priority = SimpleNamespace(
            priority=SimpleNamespace(value="critical"),
            deadline=None,
        )
        item = _build_cve_item(self._base_cve(), {"CVE-2024-0001": priority}, {})
        assert item.has_priority is True
        assert item.priority_level == "critical"

    def test_with_risk_acceptance(self):
        acceptance = SimpleNamespace(
            id=uuid4(),
            status=SimpleNamespace(value="approved"),
        )
        item = _build_cve_item(self._base_cve(), {}, {"CVE-2024-0001": acceptance})
        assert item.has_risk_acceptance is True
        assert item.risk_acceptance_status == "approved"

    def test_suppressed_flag(self):
        item = _build_cve_item(
            self._base_cve(),
            {},
            {},
            suppressed_cve_ids={"CVE-2024-0001"},
        )
        assert item.is_suppressed is True

    def test_component_names_sorted(self):
        item = _build_cve_item(
            self._base_cve(),
            {},
            {},
            component_map={"CVE-2024-0001": ["zlib", "openssl", "openssl"]},
        )
        assert item.component_names == ["openssl", "zlib"]
