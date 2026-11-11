"""Escalation emails are sent after the commit; only successful sends count as notified."""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.tasks import scheduler


def _job(recipient: str) -> scheduler.EscalationEmailJob:
    return scheduler.EscalationEmailJob(
        escalation_id=uuid4(),
        recipient=recipient,
        email_kwargs={"cve_id": "CVE-1", "namespace": "ns", "cluster_name": "c1", "level": 1},
    )


@pytest.mark.asyncio
async def test_only_successful_sends_are_reported(monkeypatch):
    ok, broken = _job("ok@example.com"), _job("broken@example.com")

    async def send(recipient, **kwargs):
        if recipient == "broken@example.com":
            raise RuntimeError("smtp down")

    monkeypatch.setattr(scheduler.mail_svc, "send_escalation_email", send)

    assert await scheduler._send_escalation_emails([ok, broken]) == [ok.escalation_id]


@pytest.mark.asyncio
async def test_no_jobs_sends_nothing(monkeypatch):
    send = AsyncMock()
    monkeypatch.setattr(scheduler.mail_svc, "send_escalation_email", send)

    assert await scheduler._send_escalation_emails([]) == []
    send.assert_not_awaited()
