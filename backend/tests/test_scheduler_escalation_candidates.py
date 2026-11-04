"""Regression guard: the escalation jobs stay instrumented coroutines and the
candidate summary is logged synchronously."""

import inspect
import logging

from app.tasks import scheduler


def test_escalation_jobs_are_async_and_logging_helper_is_sync():
    assert inspect.iscoroutinefunction(scheduler.run_escalation_check)
    assert inspect.iscoroutinefunction(scheduler.run_escalation_warning)
    assert not inspect.iscoroutinefunction(scheduler._log_escalation_candidates)


def test_candidate_summary_counts_accepted_and_suppressed(caplog):
    rows = [{"cve_id": "CVE-RA"}, {"cve_id": "CVE-SUP"}, {"cve_id": "CVE-OK"}]
    with caplog.at_level(logging.INFO, logger=scheduler.logger.name):
        result = scheduler._log_escalation_candidates("escalation_check", rows, [rows[2]], {"CVE-RA"})
    assert result is None
    record = next(r for r in caplog.records if r.getMessage().startswith("escalation_check:"))
    assert (record.location_rows, record.candidates, record.skipped_accepted, record.skipped_suppressed) == (
        3,
        1,
        1,
        1,
    )
