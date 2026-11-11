"""Scheduler helpers that resolve runtime settings with safe fallbacks."""

from datetime import UTC, datetime
from types import SimpleNamespace

from app.tasks import scheduler


def test_management_email_prefers_runtime_setting(monkeypatch):
    monkeypatch.setattr(scheduler.app_settings, "management_email", "env@example.com")

    assert (
        scheduler.effective_management_email(SimpleNamespace(management_email=" ui@example.com ")) == "ui@example.com"
    )


def test_management_email_falls_back_to_env(monkeypatch):
    monkeypatch.setattr(scheduler.app_settings, "management_email", "env@example.com")

    assert scheduler.effective_management_email(SimpleNamespace(management_email="  ")) == "env@example.com"
    assert scheduler.effective_management_email(None) == "env@example.com"


def test_management_email_empty_when_nothing_configured(monkeypatch):
    monkeypatch.setattr(scheduler.app_settings, "management_email", "")

    assert scheduler.effective_management_email(None) == ""


def test_digest_day_matches_configured_weekday():
    monday = datetime(2026, 11, 9, tzinfo=UTC)

    assert scheduler.is_digest_day(SimpleNamespace(digest_day=0), monday) is True
    assert scheduler.is_digest_day(SimpleNamespace(digest_day=3), monday) is False


def test_digest_day_defaults_to_monday_without_settings_row():
    monday = datetime(2026, 11, 9, tzinfo=UTC)
    tuesday = datetime(2026, 11, 10, tzinfo=UTC)

    assert scheduler.is_digest_day(None, monday) is True
    assert scheduler.is_digest_day(None, tuesday) is False
