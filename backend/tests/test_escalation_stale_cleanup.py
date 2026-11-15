"""Location cleanup must preserve accepted and temporarily unreadable cases."""

from uuid import uuid4

from app.services.escalation_rules import stale_escalation_ids


def test_location_gone_even_when_cve_visible_elsewhere():
    gone, kept = uuid4(), uuid4()
    rows = [(gone, "CVE-1", "team", "old"), (kept, "CVE-1", "team", "current")]
    assert stale_escalation_ids(rows, {"CVE-1"}, set(), {"CVE-1": {("current", "team")}}) == [gone]


def test_cve_below_threshold_is_stale_even_when_reported():
    row_id = uuid4()
    assert stale_escalation_ids([(row_id, "CVE-1", "team", "c")], set(), set(), {"CVE-1": {("c", "team")}}) == [row_id]


def test_accepted_cve_is_kept_only_at_reported_location():
    kept, gone = uuid4(), uuid4()
    rows = [(kept, "CVE-1", "team", "c"), (gone, "CVE-1", "team", "other")]
    assert stale_escalation_ids(rows, set(), {"CVE-1"}, {"CVE-1": {("c", "team")}}) == [gone]


def test_cve_absent_from_nonempty_map_is_stale():
    row_id = uuid4()
    assert stale_escalation_ids([(row_id, "CVE-1", "team", "c")], {"CVE-1"}, set(), {"CVE-2": {("c", "team")}}) == [
        row_id
    ]


def test_empty_map_skips_location_rule_but_preserves_threshold_cleanup():
    visible, accepted, below = uuid4(), uuid4(), uuid4()
    rows = [(visible, "CVE-1", "team", "c"), (accepted, "CVE-2", "team", "c"), (below, "CVE-3", "team", "c")]
    assert stale_escalation_ids(rows, {"CVE-1"}, {"CVE-2"}, {}) == [below]


async def test_failed_stackrox_read_never_deletes(monkeypatch):
    from collections import namedtuple
    from contextlib import asynccontextmanager
    from unittest.mock import AsyncMock, MagicMock

    from app.models.escalation import Escalation
    from app.stackrox.queries import mappings
    from app.tasks import scheduler

    row = namedtuple("Row", "id cve_id namespace cluster_name")(uuid4(), "CVE-1", "team", "c")
    session = AsyncMock()
    result = MagicMock()
    result.all.return_value = [row]
    session.execute.return_value = result

    @asynccontextmanager
    async def sx_session():
        yield AsyncMock()

    monkeypatch.setattr(scheduler, "StackRoxSessionLocal", sx_session)
    monkeypatch.setattr(mappings, "get_cve_namespace_cluster_map", AsyncMock(side_effect=RuntimeError("unavailable")))
    await scheduler._cleanup_stale_escalations(session, Escalation, set(), set())
    assert session.execute.await_count == 1
