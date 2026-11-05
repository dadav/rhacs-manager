"""Opt-in daily notification summary email: enqueue, job, live counts, content, catalog."""

import re
from collections.abc import AsyncGenerator
from datetime import date, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.mail import service as mail_svc
from app.mail.service import _jinja_env, notification_summary_rows
from app.models.notification import Notification, NotificationType
from app.models.notification_email import NotificationEmailEvent, NotificationSummaryDelivery
from app.models.notification_preference import NotificationPreference
from app.models.remediation import Remediation, RemediationStatus
from app.models.risk_acceptance import RiskAcceptance, RiskStatus
from app.models.user import User, UserRole
from app.models.user_namespace_snapshot import UserNamespaceSnapshot
from app.notifications import preferences as prefs
from app.notifications import service as notif_svc
from app.notifications.messages import NOTIFICATION_MESSAGES
from app.notifications.service import create_notification
from app.services import notification_summary_service as summary
from app.services.namespace_snapshot import record_namespace_snapshot

from .conftest import make_current_user

NOW = datetime(2026, 11, 5, 9, 15, 0)
TODAY = NOW.date()
PAYMENTS = ("payments", "cluster-a")
BILLING = ("billing", "cluster-a")
REMEDIATION_PARAMS = {"cve_id": "CVE-1", "namespace": "payments", "cluster_name": "cluster-a", "actor": "a"}


@pytest.fixture
async def store() -> AsyncGenerator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        for model in (
            User,
            UserNamespaceSnapshot,
            NotificationPreference,
            Notification,
            Remediation,
            RiskAcceptance,
            NotificationEmailEvent,
            NotificationSummaryDelivery,
        ):
            await connection.run_sync(model.__table__.create)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    yield factory
    await engine.dispose()


async def _add_user(factory, user_id: str, *, email: str | None = None, role=UserRole.team_member) -> None:
    async with factory() as session:
        session.add(User(id=user_id, username=user_id, email=email or f"{user_id}@example.com", role=role))
        await session.commit()


async def _snapshot(factory, user_id: str, namespaces=(PAYMENTS,), *, has_all=False, seen=NOW) -> None:
    user = make_current_user(user_id=user_id, username=user_id, namespaces=list(namespaces), has_all_namespaces=has_all)
    async with factory() as session:
        await record_namespace_snapshot(session, user, now=seen)


async def _opt_in(factory, user_id: str, *categories: str) -> None:
    async with factory() as session:
        await prefs.set_preferences(session, user_id, [prefs.EffectivePreference(c, None, True) for c in categories])
        await session.commit()


async def _notify(factory, user_id: str, key: str = "remediation_status", ntype=NotificationType.remediation_status):
    async with factory() as session:
        await create_notification(session, user_id, ntype, key, {**REMEDIATION_PARAMS, "status": "in_progress"})
        await session.commit()


async def _add_event(factory, user_id: str, key: str = "remediation_status", created_at: datetime = NOW) -> None:
    async with factory() as session:
        session.add(NotificationEmailEvent(user_id=user_id, message_key=key, created_at=created_at))
        await session.commit()


async def _event_keys(factory, user_id: str) -> list[str]:
    async with factory() as session:
        result = await session.execute(
            select(NotificationEmailEvent.message_key).where(NotificationEmailEvent.user_id == user_id)
        )
        return sorted(result.scalars().all())


async def _add_remediation(
    factory,
    *,
    created_by: str,
    assigned_to: str | None = None,
    pair: tuple[str, str] = PAYMENTS,
    target_date: date | None = TODAY - timedelta(days=1),
    status: RemediationStatus = RemediationStatus.open,
) -> None:
    async with factory() as session:
        session.add(
            Remediation(
                cve_id=f"CVE-{uuid4().hex[:8]}",
                namespace=pair[0],
                cluster_name=pair[1],
                status=status,
                assigned_to=assigned_to,
                created_by=created_by,
                target_date=target_date,
            )
        )
        await session.commit()


async def _add_risk_acceptance(
    factory, created_by: str, expires_at: datetime | None, status: RiskStatus = RiskStatus.approved
) -> None:
    async with factory() as session:
        session.add(
            RiskAcceptance(
                cve_id=f"CVE-{uuid4().hex[:8]}",
                status=status,
                justification="because",
                scope={"mode": "all", "targets": []},
                scope_key=uuid4().hex,
                created_by=created_by,
                expires_at=expires_at,
            )
        )
        await session.commit()


async def _run(factory, now: datetime = NOW, send: AsyncMock | None = None) -> tuple[int, AsyncMock]:
    send = send or AsyncMock()
    with patch.object(summary.mail_svc, "send_notification_summary", send):
        async with factory() as session:
            return await summary.run_notification_summary(session, now=now), send


# --- enqueue -------------------------------------------------------------------


async def test_no_event_by_default(store):
    await _add_user(store, "dev")
    await _notify(store, "dev")
    assert await _event_keys(store, "dev") == []


async def test_event_queued_after_opt_in(store):
    await _add_user(store, "dev")
    await _opt_in(store, "dev", "remediation")
    await _notify(store, "dev")
    assert await _event_keys(store, "dev") == ["remediation_status"]


async def test_event_queued_with_in_app_off(store):
    await _add_user(store, "dev")
    async with store() as session:
        await prefs.set_preferences(session, "dev", [prefs.EffectivePreference("remediation", False, True)])
        created = await create_notification(
            session,
            "dev",
            NotificationType.remediation_status,
            "remediation_status",
            {**REMEDIATION_PARAMS, "status": "in_progress"},
        )
        await session.commit()
        rows = (await session.execute(select(Notification))).scalars().all()
    assert created is None
    assert rows == []
    assert await _event_keys(store, "dev") == ["remediation_status"]


@pytest.mark.parametrize(
    ("key", "ntype", "params"),
    [
        ("risk_comment", NotificationType.risk_comment, {"cve_id": "CVE-1", "author": "a"}),
        ("risk_status", NotificationType.risk_approved, {"cve_id": "CVE-1", "status": "approved"}),
        ("mention", NotificationType.mention, {"author": "a"}),
        (
            "remediation_overdue",
            NotificationType.remediation_overdue,
            {"cve_id": "CVE-1", "namespace": "payments", "cluster_name": "cluster-a"},
        ),
        ("risk_expiring", NotificationType.risk_expiring, {"cve_id": "CVE-1"}),
    ],
)
async def test_unmirrored_keys_queue_nothing(store, key, ntype, params):
    await _add_user(store, "dev")
    await _opt_in(store, "dev", "remediation", "risk_acceptance", "risk_acceptance_updates")
    async with store() as session:
        await create_notification(session, "dev", ntype, key, params)
        await session.commit()
    assert await _event_keys(store, "dev") == []


async def test_alert_email_rows_queue_nothing(store):
    """Their email channel belongs to the CVE alert summary, not this summary."""
    await _add_user(store, "dev")
    await _opt_in(store, "dev", "priority", "new_critical_cve")
    async with store() as session:
        await create_notification(
            session, "dev", NotificationType.new_priority, "new_priority", {"cve_id": "CVE-1", "priority_level": "high"}
        )
        await create_notification(
            session,
            "dev",
            NotificationType.new_critical_cve,
            "new_relevant_cve",
            {"cve_id": "CVE-1"},
            scope=[PAYMENTS],
        )
        await session.commit()
    assert await _event_keys(store, "dev") == []


async def test_rollback_drops_event(store):
    await _add_user(store, "dev")
    await _opt_in(store, "dev", "remediation")
    async with store() as session:
        await create_notification(
            session,
            "dev",
            NotificationType.remediation_status,
            "remediation_status",
            {**REMEDIATION_PARAMS, "status": "in_progress"},
        )
        await session.rollback()
    assert await _event_keys(store, "dev") == []


# --- risk comment keys ---------------------------------------------------------


async def test_team_member_comment_queues_event_for_sec_team(store):
    await _add_user(store, "sec", role=UserRole.sec_team)
    await _add_user(store, "mentioned", role=UserRole.sec_team)
    await _add_user(store, "member")
    await _opt_in(store, "sec", "risk_acceptance_updates")
    await _opt_in(store, "mentioned", "risk_acceptance_updates")
    author = SimpleNamespace(id="member", role=UserRole.team_member, display_name="Member")
    acceptance = SimpleNamespace(id=uuid4(), cve_id="CVE-1", created_by="member")
    async with store() as session:
        await notif_svc.notify_risk_comment(session, acceptance, None, author, exclude_user_ids={"mentioned"})
        await session.commit()
        rows = (await session.execute(select(Notification))).scalars().all()
    assert [(n.user_id, n.message_key) for n in rows] == [("sec", "risk_comment_sec_team")]
    assert await _event_keys(store, "sec") == ["risk_comment_sec_team"]
    assert await _event_keys(store, "mentioned") == []


async def test_sec_team_comment_keeps_direct_key_and_queues_nothing(store):
    await _add_user(store, "sec", role=UserRole.sec_team)
    await _add_user(store, "creator")
    await _opt_in(store, "creator", "risk_acceptance_updates")
    author = SimpleNamespace(id="sec", role=UserRole.sec_team, display_name="Sec")
    acceptance = SimpleNamespace(id=uuid4(), cve_id="CVE-1", created_by="creator")
    async with store() as session:
        await notif_svc.notify_risk_comment(session, acceptance, None, author)
        await session.commit()
        rows = (await session.execute(select(Notification))).scalars().all()
    assert [(n.user_id, n.message_key) for n in rows] == [("creator", "risk_comment")]
    assert await _event_keys(store, "creator") == []


# --- job -----------------------------------------------------------------------


async def test_one_email_aggregates_events(store):
    await _add_user(store, "dev")
    await _snapshot(store, "dev")
    await _opt_in(store, "dev", "remediation", "suppression")
    await _add_event(store, "dev", "remediation_status")
    await _add_event(store, "dev", "remediation_status")
    await _add_event(store, "dev", "suppression_status")

    sent, send = await _run(store)

    assert sent == 1
    send.assert_awaited_once_with("dev@example.com", "dev", counts={"remediation_status": 2, "suppression_status": 1})
    assert await _event_keys(store, "dev") == []


async def test_second_run_same_day_sends_nothing_and_keeps_new_events(store):
    await _add_user(store, "dev")
    await _snapshot(store, "dev")
    await _opt_in(store, "dev", "remediation")
    await _add_event(store, "dev")
    await _run(store)
    await _add_event(store, "dev", created_at=NOW + timedelta(minutes=30))

    sent, send = await _run(store, now=NOW + timedelta(hours=1))
    assert sent == 0
    send.assert_not_awaited()
    assert await _event_keys(store, "dev") == ["remediation_status"]

    sent, send = await _run(store, now=NOW + timedelta(days=1))
    assert sent == 1
    assert send.await_args.kwargs["counts"] == {"remediation_status": 1}


async def test_opting_out_drops_queued_events(store):
    await _add_user(store, "dev")
    await _snapshot(store, "dev")
    await _add_event(store, "dev")  # queued while opted in; the preference is off now

    sent, send = await _run(store)

    assert sent == 0
    send.assert_not_awaited()
    assert await _event_keys(store, "dev") == []


async def test_placeholder_address_sends_nothing_and_consumes_events(store):
    await _add_user(store, "spoke", email="spoke@spoke.local")
    await _snapshot(store, "spoke")
    await _opt_in(store, "spoke", "remediation")
    await _add_event(store, "spoke")

    sent, send = await _run(store)

    assert sent == 0
    send.assert_not_awaited()
    assert await _event_keys(store, "spoke") == []
    async with store() as session:
        assert (await session.execute(select(NotificationSummaryDelivery))).scalars().all() == []


async def test_smtp_failure_is_not_retried_and_does_not_stop_others(store):
    for user_id in ("a", "b"):
        await _add_user(store, user_id)
        await _snapshot(store, user_id)
        await _opt_in(store, user_id, "remediation")
        await _add_event(store, user_id)

    send = AsyncMock(side_effect=[RuntimeError("smtp down"), None])
    sent, _ = await _run(store, send=send)
    assert sent == 1
    assert send.await_count == 2

    retry = AsyncMock()
    sent, _ = await _run(store, now=NOW + timedelta(hours=1), send=retry)
    assert sent == 0
    retry.assert_not_awaited()


async def test_inactive_user_gets_nothing_and_old_events_are_purged(store):
    await _add_user(store, "gone")
    await _snapshot(store, "gone", seen=NOW - timedelta(days=31))
    await _opt_in(store, "gone", "remediation")
    await _add_remediation(store, created_by="gone")
    await _add_event(store, "gone", created_at=NOW - timedelta(days=1))
    await _add_event(store, "gone", "suppression_status", created_at=NOW - timedelta(days=15))

    sent, send = await _run(store)

    assert sent == 0
    send.assert_not_awaited()
    assert await _event_keys(store, "gone") == ["remediation_status"]


async def test_old_delivery_claims_are_purged(store):
    await _add_user(store, "dev")
    async with store() as session:
        session.add(NotificationSummaryDelivery(user_id="dev", sent_on=TODAY - timedelta(days=31), created_at=NOW))
        await session.commit()
    await _run(store)
    async with store() as session:
        assert (await session.execute(select(NotificationSummaryDelivery))).scalars().all() == []


async def test_job_with_nothing_to_do_sends_nothing(store):
    await _add_user(store, "dev")
    await _snapshot(store, "dev")
    await _opt_in(store, "dev", "remediation", "risk_acceptance_updates")

    sent, send = await _run(store)

    assert sent == 0
    send.assert_not_awaited()


# --- live counts ---------------------------------------------------------------


async def test_overdue_counted_once_when_creator_and_assignee(store):
    await _add_user(store, "dev")
    await _snapshot(store, "dev")
    await _opt_in(store, "dev", "remediation")
    await _add_remediation(store, created_by="dev", assigned_to="dev")

    _, send = await _run(store)
    assert send.await_args.kwargs["counts"] == {"remediation_overdue": 1}


async def test_overdue_counts_only_real_overdue(store):
    await _add_user(store, "dev")
    await _snapshot(store, "dev")
    await _opt_in(store, "dev", "remediation")
    await _add_remediation(store, created_by="dev", target_date=TODAY)  # due today, not overdue yet
    await _add_remediation(store, created_by="dev", target_date=None)
    await _add_remediation(store, created_by="dev", status=RemediationStatus.resolved)

    sent, send = await _run(store)
    assert sent == 0
    send.assert_not_awaited()


async def test_overdue_outside_snapshot_is_not_counted(store):
    await _add_user(store, "dev")
    await _snapshot(store, "dev", [PAYMENTS])
    await _opt_in(store, "dev", "remediation")
    await _add_remediation(store, created_by="dev", pair=BILLING)

    sent, _ = await _run(store)
    assert sent == 0


async def test_overdue_outside_snapshot_is_counted_for_wildcard_user(store):
    await _add_user(store, "wild")
    await _snapshot(store, "wild", [], has_all=True)
    await _opt_in(store, "wild", "remediation")
    await _add_remediation(store, created_by="wild", pair=BILLING)

    _, send = await _run(store)
    assert send.await_args.kwargs["counts"] == {"remediation_overdue": 1}


async def test_overdue_needs_remediation_opt_in(store):
    await _add_user(store, "dev")
    await _snapshot(store, "dev")
    await _add_remediation(store, created_by="dev")

    sent, _ = await _run(store)
    assert sent == 0


async def test_overdue_repeats_on_following_days(store):
    await _add_user(store, "dev")
    await _snapshot(store, "dev")
    await _opt_in(store, "dev", "remediation")
    await _add_remediation(store, created_by="dev")

    await _run(store)
    sent, send = await _run(store, now=NOW + timedelta(days=1))
    assert sent == 1
    assert send.await_args.kwargs["counts"] == {"remediation_overdue": 1}


async def test_expiring_window_boundaries(store):
    await _add_user(store, "dev")
    await _snapshot(store, "dev")
    await _opt_in(store, "dev", "risk_acceptance_updates")
    await _add_risk_acceptance(store, "dev", NOW)  # inside: exactly now
    await _add_risk_acceptance(store, "dev", NOW + timedelta(days=7))  # inside: exactly 7 days
    await _add_risk_acceptance(store, "dev", NOW - timedelta(seconds=1))  # already expired
    await _add_risk_acceptance(store, "dev", NOW + timedelta(days=7, seconds=1))  # too far out
    await _add_risk_acceptance(store, "dev", None)  # never expires
    await _add_risk_acceptance(store, "dev", NOW + timedelta(days=1), status=RiskStatus.requested)

    _, send = await _run(store)
    assert send.await_args.kwargs["counts"] == {"risk_expiring": 2}


async def test_expiring_only_counts_own_and_needs_opt_in(store):
    await _add_user(store, "dev")
    await _add_user(store, "other")
    await _snapshot(store, "dev")
    await _snapshot(store, "other")
    await _opt_in(store, "other", "risk_acceptance_updates")
    await _add_risk_acceptance(store, "dev", NOW + timedelta(days=1))

    sent, _ = await _run(store)
    assert sent == 0


# --- content -------------------------------------------------------------------


def test_template_renders_counts_and_links_but_no_identifiers():
    counts = {"remediation_overdue": 3, "suppression_status": 2}
    html = _jinja_env.get_template("notification_summary.html").render(
        recipient_name="Dev",
        rows=notification_summary_rows(counts, "https://app"),
        settings_link="https://app/my-settings",
        app_link="https://app/",
    )
    assert "Überfällige Behebungen" in html
    assert "https://app/remediations?overdue=1" in html.replace("&amp;", "&")
    assert "https://app/suppression-rules" in html
    assert "Neue Eskalationen" not in html  # zero rows are hidden
    assert re.search(r"CVE-\d", html) is None
    assert "payments" not in html
    assert "cluster-a" not in html


def test_rows_merge_assignment_keys():
    rows = notification_summary_rows({"remediation_created": 1, "remediation_assigned": 2}, "https://app")
    assert rows == [("Ihnen zugewiesene Behebungen", 3, "https://app/remediations?mine=1")]


async def test_send_uses_template_and_german_subject():
    send_email = AsyncMock()
    with patch.object(mail_svc, "send_email", send_email):
        await mail_svc.send_notification_summary(
            "dev@example.com", "Dev", counts={"escalation": 1}, base_url="https://app"
        )
    to, subject, html = send_email.await_args.args
    assert to == "dev@example.com"
    assert subject == "Ihre tägliche Benachrichtigungs-Zusammenfassung"
    assert "Neue Eskalationen" in html


# --- catalog -------------------------------------------------------------------


def test_every_summary_key_is_known_rendered_and_opt_in():
    row_keys = {key for keys, _label, _path in mail_svc._NOTIFICATION_SUMMARY_ROWS for key in keys}
    for key, category in prefs.EMAIL_SUMMARY_KEYS.items():
        assert key in NOTIFICATION_MESSAGES
        assert key in row_keys
        assert prefs.CATEGORIES[category].email_default is False


def test_live_keys_have_rows():
    row_keys = {key for keys, _label, _path in mail_svc._NOTIFICATION_SUMMARY_ROWS for key in keys}
    assert {summary.REMEDIATION_OVERDUE_KEY, summary.RISK_EXPIRING_KEY} <= row_keys


async def test_stored_row_from_before_the_email_channel_stays_off(store):
    """Earlier releases stored email=False for categories without an email channel."""
    await _add_user(store, "dev")
    async with store() as session:
        session.add(NotificationPreference(user_id="dev", category="remediation", in_app=False, email=False))
        await session.commit()
        effective = {p.category: p for p in await prefs.get_preferences(session, "dev")}
    assert effective["remediation"].email is False
    assert effective["remediation"].in_app is False
