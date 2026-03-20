"""Edge-case tests for pure functions in app.services.cve_filter_service."""

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


def _base_cve(**overrides) -> dict:
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


# --- _matches_component_rule edge cases ---


class TestMatchesComponentRuleEdgeCases:
    def test_multiple_components_first_matches(self):
        """Rule matches when the first component in the list matches."""
        rule = _make_rule(
            type=SuppressionType.component,
            component_name="openssl",
            version_pattern=None,
        )
        assert (
            _matches_component_rule(rule, [("openssl", "1.0"), ("libcurl", "7.0")])
            is True
        )

    def test_multiple_components_second_matches(self):
        """Rule matches when only a later component matches."""
        rule = _make_rule(
            type=SuppressionType.component,
            component_name="libcurl",
            version_pattern=None,
        )
        assert (
            _matches_component_rule(rule, [("openssl", "1.0"), ("libcurl", "7.0")])
            is True
        )

    def test_multiple_components_none_match(self):
        rule = _make_rule(
            type=SuppressionType.component,
            component_name="zlib",
            version_pattern=None,
        )
        assert (
            _matches_component_rule(rule, [("openssl", "1.0"), ("libcurl", "7.0")])
            is False
        )

    def test_version_pattern_question_mark_wildcard(self):
        """fnmatch ? matches single character."""
        rule = _make_rule(
            type=SuppressionType.component,
            component_name="openssl",
            version_pattern="1.1.?",
        )
        assert _matches_component_rule(rule, [("openssl", "1.1.1")]) is True
        assert _matches_component_rule(rule, [("openssl", "1.1.12")]) is False

    def test_version_pattern_bracket_range(self):
        """fnmatch bracket patterns work."""
        rule = _make_rule(
            type=SuppressionType.component,
            component_name="openssl",
            version_pattern="1.[0-2].*",
        )
        assert _matches_component_rule(rule, [("openssl", "1.1.1")]) is True
        assert _matches_component_rule(rule, [("openssl", "1.5.0")]) is False


# --- _is_cve_suppressed_by_rules edge cases ---


class TestIsCveSuppressedEdgeCases:
    def test_multiple_rules_combine_coverage(self):
        """Two namespace-scoped rules together cover all locations."""
        rule1 = _make_rule(
            cve_id="CVE-2024-0001",
            scope={
                "mode": "namespace",
                "targets": [{"cluster_name": "c1", "namespace": "ns1"}],
            },
        )
        rule2 = _make_rule(
            cve_id="CVE-2024-0001",
            scope={
                "mode": "namespace",
                "targets": [{"cluster_name": "c1", "namespace": "ns2"}],
            },
        )
        ns_map = {"CVE-2024-0001": {("c1", "ns1"), ("c1", "ns2")}}
        result = _is_cve_suppressed_by_rules(
            "CVE-2024-0001", [rule1, rule2], ns_map, None
        )
        assert result is True

    def test_rule_without_scope_defaults_to_global(self):
        """A rule with scope=None should default to global suppression."""
        rule = _make_rule(cve_id="CVE-2024-0001", scope=None)
        result = _is_cve_suppressed_by_rules("CVE-2024-0001", [rule], {}, None)
        assert result is True

    def test_cve_not_in_namespace_map(self):
        """CVE not present in namespace map at all returns False for namespace-scoped rule."""
        rule = _make_rule(
            cve_id="CVE-2024-0001",
            scope={
                "mode": "namespace",
                "targets": [{"cluster_name": "c1", "namespace": "ns1"}],
            },
        )
        result = _is_cve_suppressed_by_rules("CVE-2024-0001", [rule], {}, None)
        assert result is False

    def test_user_sees_uncovered_namespace(self):
        """User sees ns1 and ns2, but rule only covers ns1 -> not suppressed."""
        rule = _make_rule(
            cve_id="CVE-2024-0001",
            scope={
                "mode": "namespace",
                "targets": [{"cluster_name": "c1", "namespace": "ns1"}],
            },
        )
        ns_map = {"CVE-2024-0001": {("c1", "ns1"), ("c1", "ns2"), ("c1", "ns3")}}
        user_ns = {("c1", "ns1"), ("c1", "ns2")}
        result = _is_cve_suppressed_by_rules("CVE-2024-0001", [rule], ns_map, user_ns)
        assert result is False

    def test_empty_rules_list(self):
        result = _is_cve_suppressed_by_rules("CVE-2024-0001", [], {}, None)
        assert result is False


# --- _compute_suppressed_cves edge cases ---


class TestComputeSuppressedCvesEdgeCases:
    def test_empty_cve_list(self):
        """No CVEs means no suppressions."""
        rule = _make_rule(cve_id="CVE-2024-0001", scope={"mode": "all", "targets": []})
        result = _compute_suppressed_cves(
            cve_rules=[rule],
            component_rules=[],
            component_version_map={},
            all_cve_ids=[],
        )
        assert result == set()

    def test_component_rule_skips_already_suppressed(self):
        """CVEs already suppressed by CVE rules are not re-checked by component rules."""
        cve_rule = _make_rule(
            cve_id="CVE-2024-0001", scope={"mode": "all", "targets": []}
        )
        comp_rule = _make_rule(
            type=SuppressionType.component,
            component_name="openssl",
            version_pattern=None,
        )
        result = _compute_suppressed_cves(
            cve_rules=[cve_rule],
            component_rules=[comp_rule],
            component_version_map={"CVE-2024-0001": [("openssl", "1.0")]},
            all_cve_ids=["CVE-2024-0001"],
            cve_namespace_map={},
        )
        # Should still be suppressed (by CVE rule)
        assert "CVE-2024-0001" in result

    def test_component_rule_no_matching_components(self):
        """Component rule does not suppress CVE with no matching components."""
        comp_rule = _make_rule(
            type=SuppressionType.component,
            component_name="openssl",
            version_pattern=None,
        )
        result = _compute_suppressed_cves(
            cve_rules=[],
            component_rules=[comp_rule],
            component_version_map={},
            all_cve_ids=["CVE-2024-0001"],
        )
        assert result == set()

    def test_scoped_cve_rule_with_user_namespaces(self):
        """Namespace-scoped rule suppresses when user's view is fully covered."""
        rule = _make_rule(
            cve_id="CVE-2024-0001",
            scope={
                "mode": "namespace",
                "targets": [{"cluster_name": "c1", "namespace": "ns1"}],
            },
        )
        ns_map = {"CVE-2024-0001": {("c1", "ns1"), ("c1", "ns2")}}
        user_ns = {("c1", "ns1")}
        result = _compute_suppressed_cves(
            cve_rules=[rule],
            component_rules=[],
            component_version_map={},
            all_cve_ids=["CVE-2024-0001"],
            cve_namespace_map=ns_map,
            user_namespaces=user_ns,
        )
        assert result == {"CVE-2024-0001"}


# --- _build_cve_item edge cases ---


class TestBuildCveItemEdgeCases:
    def test_missing_fields_use_defaults(self):
        """CVE dict with minimal fields still builds a valid item."""
        item = _build_cve_item({"cve_id": "CVE-2024-0001"}, {}, {})
        assert item.cve_id == "CVE-2024-0001"
        assert item.severity == SeverityLevel.UNKNOWN
        assert item.cvss == 0.0
        assert item.epss_probability == 0.0
        assert item.fixable is False
        assert item.affected_images == 0
        assert item.affected_deployments == 0

    def test_suppression_requested_flag(self):
        item = _build_cve_item(
            _base_cve(),
            {},
            {},
            suppression_requested_cve_ids={"CVE-2024-0001"},
        )
        assert item.suppression_requested is True

    def test_neither_suppressed_nor_requested(self):
        item = _build_cve_item(
            _base_cve(),
            {},
            {},
            suppressed_cve_ids=set(),
            suppression_requested_cve_ids=set(),
        )
        assert item.is_suppressed is False
        assert item.suppression_requested is False

    def test_empty_component_map(self):
        item = _build_cve_item(
            _base_cve(),
            {},
            {},
            component_map={},
        )
        assert item.component_names == []

    def test_no_component_map(self):
        item = _build_cve_item(_base_cve(), {}, {}, component_map=None)
        assert item.component_names == []


# --- compute_per_rule_matched_counts edge cases ---


class TestComputePerRuleMatchedCountsEdgeCases:
    def test_empty_rules(self):
        counts = compute_per_rule_matched_counts([], {"CVE-2024-0001"}, {})
        assert counts == {}

    def test_empty_cve_ids(self):
        rule = _make_rule(cve_id="CVE-2024-0001")
        counts = compute_per_rule_matched_counts([rule], set(), {})
        assert counts[rule.id] == 0

    def test_component_rule_with_version_pattern(self):
        rule = _make_rule(
            type=SuppressionType.component,
            component_name="openssl",
            version_pattern="1.*",
        )
        comp_map = {
            "CVE-2024-0001": [("openssl", "1.1.1")],
            "CVE-2024-0002": [("openssl", "3.0.0")],
        }
        counts = compute_per_rule_matched_counts(
            [rule],
            {"CVE-2024-0001", "CVE-2024-0002"},
            comp_map,
        )
        assert counts[rule.id] == 1
