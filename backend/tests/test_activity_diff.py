"""Pure normalization and diff rules of the ACS activity console collector."""

import random
from datetime import UTC, datetime

import pytest

from app.services.activity_service import (
    ActivitySourceError,
    compute_activity,
    normalize_snapshot,
)

SCAN_1 = datetime(2026, 11, 25, 10, 0, 0)
SCAN_2 = datetime(2026, 11, 25, 11, 0, 0)


def row(
    deployment_id: str,
    *,
    name: str | None = None,
    namespace: str = "payments",
    cluster: str = "cluster-a",
    v2: str | None = "img-1",
    digest: str | None = "sha256:aaa",
    pull: str | None = "registry/payments:1",
    has_v2_row: bool = True,
    scan_time: datetime | None = SCAN_1,
    counts: tuple[int | None, int | None, int | None] = (10, 3, 1),
) -> dict:
    """One raw snapshot row: deployment x container x images_v2 (LEFT JOINs)."""
    v2_row = has_v2_row and v2 is not None
    return {
        "deployment_id": deployment_id,
        "deployment_name": name or deployment_id,
        "namespace": namespace,
        "cluster_name": cluster,
        "container_image_idv2": v2,
        "container_image_digest": digest,
        "container_image_name": pull,
        "image_id_v2": v2 if v2_row else None,
        "image_digest": digest if v2_row else None,
        "image_name": pull if v2_row else None,
        "scan_time": scan_time if v2_row else None,
        "component_count": counts[0] if v2_row else None,
        "cve_count": counts[1] if v2_row else None,
        "fixable_cve_count": counts[2] if v2_row else None,
    }


def no_container(deployment_id: str, *, namespace: str = "payments", cluster: str = "cluster-a") -> dict:
    return row(deployment_id, namespace=namespace, cluster=cluster, v2=None, digest=None, pull=None)


def state_after(rows: list[dict]):
    """Stored state after a silent baseline of ``rows``."""
    result = compute_activity({}, {}, normalize_snapshot(rows), initialized=False)
    assert result.events == []
    return result.deployments, result.images


def diff(before: list[dict], after: list[dict]):
    deployments, images = state_after(before)
    return compute_activity(deployments, images, normalize_snapshot(after), initialized=True).events


def kinds(events) -> list[tuple[str, str, str]]:
    return [(e.kind, e.namespace, e.cluster_name) for e in events]


# --- baselines -----------------------------------------------------------------


def test_nonempty_baseline_emits_nothing():
    rows = [row(f"dep-{i}", v2=f"img-{i}") for i in range(500)]
    result = compute_activity({}, {}, normalize_snapshot(rows), initialized=False)
    assert result.events == []
    assert len(result.deployments) == 500
    assert len(result.images) == 500


def test_empty_baseline_then_new_deployment_is_observed():
    events = diff([], [row("dep-1")])
    assert kinds(events) == [("deployment_observed", "payments", "cluster-a")]
    assert events[0].details == {"deployment_id": "dep-1", "deployment_name": "dep-1"}
    assert events[0].source_at is None


# --- noise -----------------------------------------------------------------------


def test_equal_shuffled_and_duplicate_rows_produce_no_events():
    rows = [
        row("dep-1", v2="img-1"),
        row("dep-1", v2="img-2", digest="sha256:bbb", pull="registry/b:1"),
        row("dep-2", v2="img-1"),
        no_container("dep-3"),
    ]
    shuffled = rows + [row("dep-1", v2="img-1"), row("dep-2", v2="img-1")]
    random.Random(4).shuffle(shuffled)
    assert diff(rows, shuffled) == []


def test_timestamp_precision_and_timezone_do_not_create_noise():
    naive = [row("dep-1", scan_time=datetime(2026, 11, 25, 10, 0, 0, 123456))]
    aware = [row("dep-1", scan_time=datetime(2026, 11, 25, 10, 0, 0, 123456, tzinfo=UTC))]
    assert diff(naive, aware) == []


def test_metadata_only_name_change_is_not_a_scan():
    before = [row("dep-1")]
    after = [row("dep-1")]
    after[0]["image_name"] = "registry/payments:renamed"
    assert diff(before, after) == []


# --- inventory -------------------------------------------------------------------


def test_removed_deployment_uses_previous_pair_and_name():
    events = diff([row("dep-1", name="api"), row("dep-2")], [row("dep-2")])
    assert kinds(events) == [("deployment_removed", "payments", "cluster-a")]
    assert events[0].details == {"deployment_id": "dep-1", "deployment_name": "api"}


def test_successful_empty_snapshot_removes_everything():
    events = diff([row("dep-1"), row("dep-2", namespace="billing")], [])
    assert sorted(kinds(events)) == [
        ("deployment_removed", "billing", "cluster-a"),
        ("deployment_removed", "payments", "cluster-a"),
    ]


def test_changed_image_set_lists_added_and_removed_references():
    events = diff(
        [row("dep-1", v2="img-1")],
        [row("dep-1", v2="img-2", digest="sha256:bbb", pull="registry/payments:2")],
    )
    assert kinds(events) == [("deployment_images_changed", "payments", "cluster-a")]
    assert events[0].details["added_images"] == [
        {"image_id_v2": "img-2", "image_digest": "sha256:bbb", "image_name": "registry/payments:2"}
    ]
    assert events[0].details["removed_images"] == [
        {"image_id_v2": "img-1", "image_digest": "sha256:aaa", "image_name": "registry/payments:1"}
    ]


def test_reused_tag_with_new_digest_is_an_image_change():
    events = diff(
        [row("dep-1", v2="img-1", digest="sha256:old", pull="registry/payments:latest")],
        [row("dep-1", v2="img-9", digest="sha256:new", pull="registry/payments:latest")],
    )
    assert kinds(events) == [("deployment_images_changed", "payments", "cluster-a")]


def test_legacy_reference_without_v2_id_participates_in_inventory():
    events = diff(
        [row("dep-1", v2=None, digest="sha256:legacy", pull="registry/old:1")],
        [row("dep-1", v2=None, digest="sha256:legacy2", pull="registry/old:2")],
    )
    assert kinds(events) == [("deployment_images_changed", "payments", "cluster-a")]


def test_pair_change_is_removal_in_old_pair_and_appearance_in_new():
    events = diff([row("dep-1", namespace="payments")], [row("dep-1", namespace="billing", cluster="cluster-b")])
    assert kinds(events) == [
        ("deployment_removed", "payments", "cluster-a"),
        ("deployment_observed", "billing", "cluster-b"),
    ]


def test_blank_scope_is_skipped_not_widened():
    snapshot = normalize_snapshot([row("dep-1", namespace=""), row("dep-2", cluster="  "), row("dep-3")])
    assert set(snapshot.deployments) == {"dep-3"}
    assert snapshot.skipped_deployments == 2
    assert snapshot.images["img-1"]["pairs"] == [["payments", "cluster-a"]]


def test_contradictory_duplicate_identity_is_rejected():
    with pytest.raises(ActivitySourceError):
        normalize_snapshot([row("dep-1", namespace="payments"), row("dep-1", namespace="billing")])


def test_all_null_left_join_row_creates_no_reference():
    snapshot = normalize_snapshot([no_container("dep-1")])
    assert snapshot.deployments["dep-1"]["images"] == []
    assert snapshot.images == {}


# --- scans -------------------------------------------------------------------------


def test_first_known_scan_for_observed_image_is_a_scan():
    before = [row("dep-1", has_v2_row=False)]
    events = diff(before, [row("dep-1", scan_time=SCAN_1)])
    assert kinds(events) == [("image_scanned", "payments", "cluster-a")]
    assert events[0].source_at == SCAN_1.replace(tzinfo=UTC)
    assert events[0].details == {
        "image_id_v2": "img-1",
        "image_digest": "sha256:aaa",
        "image_name": "registry/payments:1",
        "component_count": 10,
        "cve_count": 3,
        "fixable_cve_count": 1,
    }


def test_newer_timestamp_with_unchanged_counts_is_a_scan():
    events = diff([row("dep-1", scan_time=SCAN_1)], [row("dep-1", scan_time=SCAN_2)])
    assert kinds(events) == [("image_scanned", "payments", "cluster-a")]


def test_count_only_change_is_a_result_update():
    events = diff([row("dep-1", counts=(10, 3, 1))], [row("dep-1", counts=(10, 5, 2))])
    assert kinds(events) == [("image_scan_updated", "payments", "cluster-a")]
    assert events[0].details["cve_count"] == 5


def test_newer_timestamp_and_changed_counts_emit_only_scanned():
    events = diff([row("dep-1", scan_time=SCAN_1)], [row("dep-1", scan_time=SCAN_2, counts=(1, 0, 0))])
    assert kinds(events) == [("image_scanned", "payments", "cluster-a")]


def test_zero_cve_scan_is_activity():
    events = diff([row("dep-1", scan_time=SCAN_1)], [row("dep-1", scan_time=SCAN_2, counts=(0, 0, 0))])
    assert kinds(events) == [("image_scanned", "payments", "cluster-a")]
    assert events[0].details["cve_count"] == 0


def test_missing_counts_stay_null():
    events = diff([row("dep-1", scan_time=SCAN_1)], [row("dep-1", scan_time=SCAN_2, counts=(None, None, None))])
    assert events[0].details["component_count"] is None


def test_first_seen_image_baselines_silently():
    events = diff([no_container("dep-1")], [row("dep-1")])
    assert kinds(events) == [("deployment_images_changed", "payments", "cluster-a")]


def test_missing_metadata_does_not_manufacture_scans_and_keeps_last_scan():
    before = [row("dep-1", scan_time=SCAN_1)]
    gap = [row("dep-1", has_v2_row=False)]
    deployments, images = state_after(before)
    during = compute_activity(deployments, images, normalize_snapshot(gap), initialized=True)
    assert during.events == []
    assert during.images["img-1"]["scan"]["scan_time"].startswith("2026-11-25T10:00:00")
    after = compute_activity(during.deployments, during.images, normalize_snapshot(before), initialized=True)
    assert after.events == []


def test_equal_digest_with_different_v2_ids_stays_distinct():
    rows = [
        row("dep-1", v2="img-a", digest="sha256:same", pull="registry/a:1"),
        row("dep-2", v2="img-b", digest="sha256:same", pull="registry/b:1"),
    ]
    snapshot = normalize_snapshot(rows)
    assert set(snapshot.images) == {"img-a", "img-b"}
    after = [rows[0], {**rows[1], "scan_time": SCAN_2}]
    events = diff(rows, after)
    assert [(e.kind, e.details["image_id_v2"]) for e in events] == [("image_scanned", "img-b")]


def test_shared_image_is_deduplicated_per_pair_and_scoped_per_pair():
    before = [row(f"dep-{i}") for i in range(5)] + [row("dep-other", namespace="billing", cluster="cluster-b")]
    after = [{**r, "scan_time": SCAN_2} for r in before]
    events = diff(before, after)
    assert kinds(events) == [
        ("image_scanned", "payments", "cluster-a"),
        ("image_scanned", "billing", "cluster-b"),
    ]
    for event in events:
        # Payload never lists other pairs' namespaces or clusters.
        assert set(event.details) == {
            "image_id_v2",
            "image_digest",
            "image_name",
            "component_count",
            "cve_count",
            "fixable_cve_count",
        }
        assert "billing" not in str(event.details) and "cluster-" not in str(event.details)


def test_newly_added_pair_gets_no_old_scan_event():
    before = [row("dep-1")]
    after = [row("dep-1"), row("dep-2", namespace="billing")]
    assert kinds(diff(before, after)) == [("deployment_observed", "billing", "cluster-a")]

    # Rescanned in the same sample that adds the pair: only the shared pair gets the scan.
    rescanned = [row("dep-1", scan_time=SCAN_2), row("dep-2", namespace="billing", scan_time=SCAN_2)]
    assert sorted(kinds(diff(before, rescanned))) == [
        ("deployment_observed", "billing", "cluster-a"),
        ("image_scanned", "payments", "cluster-a"),
    ]


def test_removed_then_reappearing_image_rebaselines():
    deployments, images = state_after([row("dep-1")])
    gone = compute_activity(deployments, images, normalize_snapshot([no_container("dep-1")]), initialized=True)
    assert "img-1" not in gone.images
    assert [e.kind for e in gone.events] == ["deployment_images_changed"]
    back = compute_activity(
        gone.deployments, gone.images, normalize_snapshot([row("dep-1", scan_time=SCAN_2)]), initialized=True
    )
    assert [e.kind for e in back.events] == ["deployment_images_changed"]


def test_compute_activity_does_not_mutate_stored_state():
    deployments, images = state_after([row("dep-1")])
    frozen = repr((deployments, images))
    compute_activity(
        deployments,
        images,
        normalize_snapshot([row("dep-1", has_v2_row=False), row("dep-2", v2="img-2")]),
        initialized=True,
    )
    assert repr((deployments, images)) == frozen
