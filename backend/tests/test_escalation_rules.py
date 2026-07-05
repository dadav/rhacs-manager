"""Tests for escalation rule matching and selection semantics."""

from datetime import datetime, timedelta

from app.models.global_settings import DEFAULT_ESCALATION_RULES
from app.services.escalation_rules import level_deadlines, pick_matching_rule, rule_matches


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
