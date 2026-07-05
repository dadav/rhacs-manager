"""Shared escalation-rule evaluation.

Three call sites need to evaluate per-level deadlines from an EscalationRule
JSON dict against a CVE's anchors (`first_seen`, `fix_available_since`):

- routers/cves.py — display expected escalation dates on CVE detail.
- services/escalation_preview.py — list upcoming escalations within warning window.
- tasks/scheduler.py — actually create escalations once a level fires.

Adding a new anchor (e.g. KEV-listed-at) should be a single edit here.
"""

from datetime import datetime, timedelta

LEVELS: tuple[int, ...] = (1, 2, 3)

# Mapping from rule field-name template to the cve-anchor key it offsets from.
_ANCHORS: tuple[tuple[str, str], ...] = (
    ("days_to_level{level}", "first_seen"),
    ("days_to_level{level}_after_fix_available", "fix_available_since"),
)


def rule_matches(rule: dict, severity: int, epss_probability: float) -> bool:
    """Both thresholds must be met. An unset/zero threshold imposes no constraint,
    e.g. the default CRITICAL rule has epss_threshold 0.0 = "any EPSS"."""
    severity_ok = severity >= rule.get("severity_min", 0)
    epss_ok = epss_probability >= rule.get("epss_threshold", 0.0)
    return severity_ok and epss_ok


def pick_matching_rule(rules: list[dict], severity: int, epss_probability: float) -> dict | None:
    """Return the strictest matching rule, or None.

    Strictest = highest severity_min, then highest epss_threshold. This makes a
    CRITICAL CVE use the dedicated severity_min=4 rule instead of whichever
    matching rule happens to come first in the configured list.
    """
    matching = [r for r in rules if rule_matches(r, severity, epss_probability)]
    if not matching:
        return None
    return max(matching, key=lambda r: (r.get("severity_min", 0), r.get("epss_threshold", 0.0)))


def level_deadlines(
    rule: dict,
    *,
    first_seen: datetime | None,
    fix_available_since: datetime | None,
) -> dict[int, datetime]:
    """Return {level: deadline} where deadline = earliest of all configured anchors.

    A level is omitted when no anchor on the rule has both a configured offset
    and a non-null timestamp on the CVE.
    """
    anchors = {"first_seen": first_seen, "fix_available_since": fix_available_since}
    out: dict[int, datetime] = {}
    for level in LEVELS:
        candidates: list[datetime] = []
        for field_template, anchor_key in _ANCHORS:
            days = rule.get(field_template.format(level=level))
            ts = anchors[anchor_key]
            if days is not None and ts is not None:
                candidates.append(ts + timedelta(days=days))
        if candidates:
            out[level] = min(candidates)
    return out
