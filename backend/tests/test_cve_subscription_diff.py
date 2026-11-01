"""Pure state building and diffing for CVE subscriptions (no IO).

Rules under test (services/cve_subscription_service.py):
- scores are scope-independent; EPSS notifies on a cumulative delta or a threshold crossing
- locations are pair-keyed: scope changes are absorbed silently, real changes notify
- image identity is the pull spec, so a rebuild of the same tag is silent
- params never carry namespace or image names
"""

from app.services.cve_subscription_service import EPSS_NOTIFY_DELTA, build_state, diff_state

PAYMENTS = ("payments", "cluster-a")
BILLING = ("billing", "cluster-a")
OTHER_CLUSTER = ("payments", "cluster-b")


def _row(pair, *, images=("quay.io/app:1",), fixable=(), severity=3, cvss=7.5, epss=0.10):
    return {
        "cve_id": "CVE-1",
        "namespace": pair[0],
        "cluster_name": pair[1],
        "severity": severity,
        "cvss": cvss,
        "epss": epss,
        "images": list(images),
        "fixable_components": list(fixable),
    }


def _kinds(events):
    return [e.kind for e in events]


def test_build_state_keeps_only_visible_pairs_but_global_scores():
    rows = [_row(PAYMENTS, cvss=7.5), _row(BILLING, cvss=7.5, epss=0.2)]
    state = build_state(rows, {PAYMENTS})
    assert [(loc["namespace"], loc["cluster"]) for loc in state["locations"]] == [PAYMENTS]
    assert state["scores"] == {"severity": 3, "cvss": 7.5, "epss_anchor": 0.2}
    assert state["scope"] == [list(PAYMENTS)]


def test_org_wide_state_has_wildcard_scope_and_all_pairs():
    state = build_state([_row(PAYMENTS), _row(BILLING)], None)
    assert state["scope"] == "*"
    assert len(state["locations"]) == 2


def test_same_state_produces_no_events():
    old = build_state([_row(PAYMENTS)], {PAYMENTS})
    stored, events = diff_state(old, build_state([_row(PAYMENTS)], {PAYMENTS}), 0.0)
    assert events == []
    assert stored["locations"] == old["locations"]


def test_cvss_change_notifies_with_old_and_new_values():
    old = build_state([_row(PAYMENTS, cvss=7.5)], {PAYMENTS})
    _, events = diff_state(old, build_state([_row(PAYMENTS, cvss=9.8)], {PAYMENTS}), 0.0)
    assert _kinds(events) == ["scores_changed"]
    assert events[0].params["cvss_old"] == "7.5"
    assert events[0].params["cvss"] == "9.8"
    assert events[0].scope == (PAYMENTS,)


def test_severity_change_notifies():
    old = build_state([_row(PAYMENTS, severity=2)], {PAYMENTS})
    _, events = diff_state(old, build_state([_row(PAYMENTS, severity=4)], {PAYMENTS}), 0.0)
    assert _kinds(events) == ["scores_changed"]


def test_small_epss_drift_accumulates_until_delta():
    state = build_state([_row(PAYMENTS, epss=0.10)], {PAYMENTS})
    step = EPSS_NOTIFY_DELTA / 2 + 0.001
    # First small step: silent, anchor stays.
    state, events = diff_state(state, build_state([_row(PAYMENTS, epss=0.10 + step)], {PAYMENTS}), 0.0)
    assert events == []
    assert state["scores"]["epss_anchor"] == 0.10
    # Second small step: cumulative drift crosses the delta.
    state, events = diff_state(state, build_state([_row(PAYMENTS, epss=0.10 + 2 * step)], {PAYMENTS}), 0.0)
    assert _kinds(events) == ["scores_changed"]
    assert state["scores"]["epss_anchor"] == 0.10 + 2 * step


def test_epss_threshold_crossing_notifies_in_both_directions():
    up_old = build_state([_row(PAYMENTS, epss=0.48)], {PAYMENTS})
    _, events = diff_state(up_old, build_state([_row(PAYMENTS, epss=0.51)], {PAYMENTS}), 0.5)
    assert _kinds(events) == ["scores_changed"]

    down_old = build_state([_row(PAYMENTS, epss=0.51)], {PAYMENTS})
    _, events = diff_state(down_old, build_state([_row(PAYMENTS, epss=0.49)], {PAYMENTS}), 0.5)
    assert _kinds(events) == ["scores_changed"]


def test_new_image_in_existing_pair_notifies_without_names():
    old = build_state([_row(PAYMENTS, images=["quay.io/app:1"])], {PAYMENTS})
    new = build_state([_row(PAYMENTS, images=["quay.io/app:1", "quay.io/worker:2"])], {PAYMENTS})
    _, events = diff_state(old, new, 0.0)
    assert _kinds(events) == ["new_images"]
    assert events[0].params == {}
    assert events[0].scope == (PAYMENTS,)


def test_rebuild_of_same_tag_is_silent():
    # Same pull spec, different digest underneath: identity is the pull spec.
    old = build_state([_row(PAYMENTS, images=["quay.io/app:1"])], {PAYMENTS})
    _, events = diff_state(old, build_state([_row(PAYMENTS, images=["quay.io/app:1"])], {PAYMENTS}), 0.0)
    assert events == []


def test_digest_pinned_rebuild_of_same_tag_is_silent():
    old = build_state([_row(PAYMENTS, images=["quay.io/app:1@sha256:aaa"])], {PAYMENTS})
    new = build_state([_row(PAYMENTS, images=["quay.io/app:1@sha256:bbb"])], {PAYMENTS})
    _, events = diff_state(old, new, 0.0)
    assert events == []
    assert new["locations"][0]["images"] == ["quay.io/app:1"]


def test_new_pair_inside_unchanged_scope_is_new_images():
    scope = {PAYMENTS, BILLING}
    old = build_state([_row(PAYMENTS)], scope)
    _, events = diff_state(old, build_state([_row(PAYMENTS), _row(BILLING)], scope), 0.0)
    assert _kinds(events) == ["new_images"]
    assert events[0].scope == (BILLING,)


def test_newly_accessible_pair_is_absorbed_silently():
    old = build_state([_row(PAYMENTS), _row(BILLING)], {PAYMENTS})
    stored, events = diff_state(old, build_state([_row(PAYMENTS), _row(BILLING)], {PAYMENTS, BILLING}), 0.0)
    assert events == []
    assert len(stored["locations"]) == 2


def test_lost_access_pair_is_dropped_silently():
    old = build_state([_row(PAYMENTS), _row(BILLING)], {PAYMENTS, BILLING})
    stored, events = diff_state(old, build_state([_row(PAYMENTS), _row(BILLING)], {PAYMENTS}), 0.0)
    assert events == []
    assert [(loc["namespace"], loc["cluster"]) for loc in stored["locations"]] == [PAYMENTS]


def test_same_namespace_on_other_cluster_is_a_different_pair():
    old = build_state([_row(PAYMENTS)], {PAYMENTS})
    # Same namespace name on another cluster the user cannot see: invisible.
    _, events = diff_state(old, build_state([_row(PAYMENTS), _row(OTHER_CLUSTER)], {PAYMENTS}), 0.0)
    assert events == []


def test_pair_emptied_is_no_longer_affected():
    scope = {PAYMENTS, BILLING}
    old = build_state([_row(PAYMENTS), _row(BILLING)], scope)
    _, events = diff_state(old, build_state([_row(PAYMENTS)], scope), 0.0)
    assert _kinds(events) == ["no_longer_affected"]
    assert events[0].scope == (BILLING,)


def test_cve_gone_everywhere_keeps_scores_for_later_compare():
    old = build_state([_row(PAYMENTS, cvss=7.5)], {PAYMENTS})
    stored, events = diff_state(old, build_state([], {PAYMENTS}), 0.0)
    assert _kinds(events) == ["no_longer_affected"]
    assert stored["scores"]["cvss"] == 7.5


def test_component_becoming_fixable_notifies_and_withdrawal_is_silent():
    old = build_state([_row(PAYMENTS, fixable=[])], {PAYMENTS})
    fixed = build_state([_row(PAYMENTS, fixable=["openssl"])], {PAYMENTS})
    stored, events = diff_state(old, fixed, 0.0)
    assert _kinds(events) == ["fix_available"]
    _, events = diff_state(stored, build_state([_row(PAYMENTS, fixable=[])], {PAYMENTS}), 0.0)
    assert events == []


def test_score_change_without_visible_pairs_is_silent_and_keeps_anchor():
    old = build_state([_row(PAYMENTS, epss=0.1)], {PAYMENTS})
    # Subscriber lost the only pair; EPSS jumped elsewhere.
    stored, events = diff_state(old, build_state([_row(BILLING, epss=0.9)], set()), 0.0)
    assert "scores_changed" not in _kinds(events)
    assert stored["scores"]["epss_anchor"] == 0.1


def test_unknown_state_version_rebaselines_silently():
    new = build_state([_row(PAYMENTS)], {PAYMENTS})
    stored, events = diff_state({"v": 0}, new, 0.0)
    assert events == []
    assert stored == new
