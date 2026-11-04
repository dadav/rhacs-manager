"""Tests for escalation rule matching and selection semantics."""

from datetime import datetime, timedelta
from types import SimpleNamespace

from app.models.global_settings import DEFAULT_ESCALATION_RULES
from app.services.escalation_rules import (
    escalation_candidate_rows,
    level_deadlines,
    pick_matching_rule,
    rule_matches,
)


class TestRuleMatches:
    def test_severity_and_epss_are_conjunctive(self):
        rule = {"severity_min": 2, "epss_threshold": 0.5}
        assert rule_matches(rule, 2, 0.6) is True
        assert rule_matches(rule, 2, 0.1) is False
        assert rule_matches(rule, 1, 0.9) is False

    def test_zero_epss_threshold_is_no_constraint(self):
        rule = {"severity_min": 3, "epss_threshold": 0.0}
        assert rule_matches(rule, 3, 0.0) is True
        assert rule_matches(rule, 4, 0.0) is True
        assert rule_matches(rule, 2, 0.0) is False

    def test_low_severity_low_epss_matches_no_default_rule(self):
        """A LOW CVE with EPSS 0 must not escalate under the default rules."""
        assert pick_matching_rule(DEFAULT_ESCALATION_RULES, 1, 0.0) is None


class TestPickMatchingRule:
    def test_critical_cve_gets_the_critical_rule(self):
        """CRITICAL CVEs must use the stricter severity_min=4 default rule,
        not the IMPORTANT rule that precedes it in the list."""
        rule = pick_matching_rule(DEFAULT_ESCALATION_RULES, 4, 0.0)
        assert rule is not None
        assert rule["severity_min"] == 4
        assert rule["days_to_level1"] == 7

    def test_important_cve_gets_the_important_rule(self):
        rule = pick_matching_rule(DEFAULT_ESCALATION_RULES, 3, 0.0)
        assert rule is not None
        assert rule["severity_min"] == 3
        assert rule["days_to_level1"] == 14

    def test_moderate_high_epss_gets_the_epss_rule(self):
        rule = pick_matching_rule(DEFAULT_ESCALATION_RULES, 2, 0.7)
        assert rule is not None
        assert rule["severity_min"] == 2
        assert rule["epss_threshold"] == 0.5

    def test_no_match_returns_none(self):
        assert pick_matching_rule(DEFAULT_ESCALATION_RULES, 2, 0.1) is None

    def test_epss_threshold_breaks_severity_tie(self):
        rules = [
            {"severity_min": 3, "epss_threshold": 0.0, "days_to_level1": 14},
            {"severity_min": 3, "epss_threshold": 0.5, "days_to_level1": 7},
        ]
        assert pick_matching_rule(rules, 4, 0.8)["days_to_level1"] == 7
        assert pick_matching_rule(rules, 4, 0.1)["days_to_level1"] == 14


class TestLevelDeadlines:
    def test_deadline_offsets_from_first_seen(self):
        first_seen = datetime(2026, 1, 1)
        rule = {"days_to_level1": 7, "days_to_level2": 14, "days_to_level3": 21}
        deadlines = level_deadlines(rule, first_seen=first_seen, fix_available_since=None)
        assert deadlines == {
            1: first_seen + timedelta(days=7),
            2: first_seen + timedelta(days=14),
            3: first_seen + timedelta(days=21),
        }

    def test_earliest_anchor_wins(self):
        first_seen = datetime(2026, 1, 1)
        fix_available = datetime(2026, 1, 10)
        rule = {"days_to_level1": 30, "days_to_level1_after_fix_available": 5}
        deadlines = level_deadlines(rule, first_seen=first_seen, fix_available_since=fix_available)
        assert deadlines[1] == fix_available + timedelta(days=5)


def _rule(*, cve_id=None, scope=None, component_name=None, version_pattern=None):
    return SimpleNamespace(cve_id=cve_id, scope=scope, component_name=component_name, version_pattern=version_pattern)


def _row(cve_id, namespace, cluster_name, components=None):
    row = {"cve_id": cve_id, "namespace": namespace, "cluster_name": cluster_name}
    if components is not None:
        row["components"] = components
    return row


def _locations(rows):
    return [(r["cve_id"], r["namespace"], r["cluster_name"]) for r in rows]


class TestEscalationCandidateRows:
    def test_approved_risk_acceptance_skips_every_location(self):
        rows = [_row("CVE-1", "a", "c1"), _row("CVE-1", "b", "c1"), _row("CVE-2", "a", "c1")]
        assert _locations(escalation_candidate_rows(rows, {"CVE-1"}, [], [])) == [("CVE-2", "a", "c1")]

    def test_global_cve_rule_skips_every_location(self):
        rows = [_row("CVE-1", "a", "c1"), _row("CVE-1", "b", "c2"), _row("CVE-2", "a", "c1")]
        rules = [_rule(cve_id="CVE-1", scope={"mode": "all", "targets": []})]
        assert _locations(escalation_candidate_rows(rows, set(), rules, [])) == [("CVE-2", "a", "c1")]

    def test_rule_without_stored_scope_counts_as_global(self):
        rows = [_row("CVE-1", "a", "c1")]
        assert escalation_candidate_rows(rows, set(), [_rule(cve_id="CVE-1", scope=None)], []) == []

    def test_namespace_rule_skips_only_the_exact_pair(self):
        rows = [_row("CVE-1", "a", "c1"), _row("CVE-1", "b", "c1"), _row("CVE-1", "a", "c2")]
        rules = [
            _rule(
                cve_id="CVE-1",
                scope={"mode": "namespace", "targets": [{"cluster_name": "c1", "namespace": "a"}]},
            )
        ]
        assert _locations(escalation_candidate_rows(rows, set(), rules, [])) == [
            ("CVE-1", "b", "c1"),
            ("CVE-1", "a", "c2"),
        ]

    def test_component_rule_with_version_glob_skips_matching_locations(self):
        rows = [
            _row("CVE-1", "a", "c1", [["github.com/grafana/grafana", "v0.0.0-20240101"]]),
            _row("CVE-1", "b", "c1", [["github.com/grafana/grafana", "v11.0.0"]]),
            _row("CVE-1", "d", "c1", [["openssl", "3.0.7"]]),
        ]
        rules = [_rule(component_name="github.com/grafana/grafana", version_pattern="v0.0.0-*")]
        assert _locations(escalation_candidate_rows(rows, set(), [], rules)) == [
            ("CVE-1", "b", "c1"),
            ("CVE-1", "d", "c1"),
        ]

    def test_rows_without_components_are_kept(self):
        rows = [_row("CVE-1", "a", "c1"), _row("CVE-2", "a", "c1", [])]
        rules = [_rule(component_name="openssl", version_pattern=None)]
        assert _locations(escalation_candidate_rows(rows, set(), [], rules)) == [
            ("CVE-1", "a", "c1"),
            ("CVE-2", "a", "c1"),
        ]
