"""Phase 3 team notifications: snapshots, preferences, scoped notifications, alerts, digest."""

from collections.abc import AsyncGenerator
from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.deps import get_app_db, get_current_user
from app.mail.service import _jinja_env
from app.models.cve_alert_mark import CveAlertMark
from app.models.notification import Notification, NotificationType
from app.models.notification_preference import NotificationPreference
from app.models.remediation import Remediation, RemediationStatus
from app.models.user import User, UserRole
from app.models.user_namespace_snapshot import UserNamespaceSnapshot
from app.notifications import preferences as prefs
from app.notifications.service import create_notification
from app.schemas.cve import CveListItem, SeverityLevel
from app.services import team_notifications as team
from app.services.namespace_snapshot import load_active_recipients, record_namespace_snapshot

from .conftest import make_current_user

NOW = datetime(2026, 9, 23, 12, 0, 0)
PAYMENTS = ("payments", "cluster-a")
BILLING = ("billing", "cluster-a")


@pytest.fixture
async def store() -> AsyncGenerator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        for model in (User, UserNamespaceSnapshot, NotificationPreference, Notification, CveAlertMark, Remediation):
            await connection.run_sync(model.__table__.create)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    yield factory
    await engine.dispose()


async def _add_user(factory, user_id: str, *, role=UserRole.team_member, email: str | None = None) -> None:
    async with factory() as session:
        session.add(
            User(
                id=user_id,
                username=user_id,
                email=email or f"{user_id}@example.com",
                role=role,
                created_at=NOW,
            )
        )
        await session.commit()


async def _snapshot(factory, user_id: str, namespaces, *, has_all=False, seen=NOW) -> None:
    user = make_current_user(user_id=user_id, username=user_id, namespaces=list(namespaces), has_all_namespaces=has_all)
    async with factory() as session:
        await record_namespace_snapshot(session, user, now=seen)


# --- 3.1 namespace snapshots ---------------------------------------------------


async def test_snapshot_is_recorded_and_throttled(store):
    await _add_user(store, "dev")
    await _snapshot(store, "dev", [PAYMENTS])
    await _snapshot(store, "dev", [PAYMENTS], seen=NOW + timedelta(minutes=10))

    async with store() as session:
        snap = await session.get(UserNamespaceSnapshot, "dev")
    assert snap.namespaces == [["payments", "cluster-a"]]
    assert snap.last_seen_at == NOW  # unchanged namespaces within the touch interval: no write


async def test_snapshot_updates_immediately_when_namespaces_change(store):
    await _add_user(store, "dev")
    await _snapshot(store, "dev", [PAYMENTS])
    await _snapshot(store, "dev", [PAYMENTS, BILLING], seen=NOW + timedelta(minutes=1))

    async with store() as session:
        snap = await session.get(UserNamespaceSnapshot, "dev")
    assert sorted(map(tuple, snap.namespaces)) == [BILLING, PAYMENTS]


async def test_stale_snapshots_are_not_recipients(store):
    await _add_user(store, "fresh")
    await _add_user(store, "stale")
    await _snapshot(store, "fresh", [PAYMENTS])
    await _snapshot(store, "stale", [PAYMENTS], seen=NOW - timedelta(days=31))

    async with store() as session:
        recipients = await load_active_recipients(session, active_days=30, now=NOW)
    assert [r.user.id for r in recipients] == ["fresh"]


# --- 3.4 preferences ---------------------------------------------------------------


async def test_preference_defaults_and_overrides(store):
    await _add_user(store, "dev")
    async with store() as session:
        assert await prefs.wants(session, "dev", "risk_acceptance", "email") is True
        assert await prefs.wants(session, "dev", "team_digest", "email") is False  # opt-in
        assert await prefs.wants(session, "dev", "remediation", "email") is False  # channel does not exist

        await prefs.set_preferences(
            session,
            "dev",
            [
                prefs.EffectivePreference("team_digest", in_app=True, email=True),
                prefs.EffectivePreference("remediation", in_app=False, email=True),
            ],
        )
        await session.commit()

        effective = {p.category: p for p in await prefs.get_preferences(session, "dev")}
    assert effective["team_digest"].email is True
    assert effective["team_digest"].in_app is None  # unsupported channel stays unsupported
    assert effective["remediation"].in_app is False
    assert effective["remediation"].email is None


async def test_disabled_category_suppresses_in_app_notification(store):
    await _add_user(store, "dev")
    async with store() as session:
        await prefs.set_preferences(session, "dev", [prefs.EffectivePreference("remediation", False, None)])
        created = await create_notification(
            session,
            "dev",
            NotificationType.remediation_overdue,
            "remediation_overdue",
            {"cve_id": "CVE-1", "namespace": "payments", "cluster_name": "cluster-a"},
        )
        mention = await create_notification(session, "dev", NotificationType.mention, "mention", {"author": "a"})
        await session.commit()
    assert created is None
    assert mention is not None  # mentions are mandatory


async def test_preferences_api_round_trip_and_unknown_category(app: FastAPI, store):
    await _add_user(store, "test-user-1")

    async def override_db() -> AsyncGenerator[AsyncSession]:
        async with store() as session:
            yield session

    app.dependency_overrides[get_app_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: make_current_user()
    with patch("app.routers.preferences.log_action", new_callable=AsyncMock):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            before = (await client.get("/api/me/notification-preferences")).json()
            updated = await client.put(
                "/api/me/notification-preferences",
                json={"items": [{"category": "team_digest", "in_app": None, "email": True}]},
            )
            bad = await client.put(
                "/api/me/notification-preferences",
                json={"items": [{"category": "nope", "in_app": True, "email": True}]},
            )

    assert before["team_notifications_active"] is False
    assert {i["category"]: i["email"] for i in before["items"]}["team_digest"] is False
    assert {i["category"]: i["email"] for i in updated.json()["items"]}["team_digest"] is True
    assert bad.status_code == 400


# --- scoped notifications are re-checked on read ----------------------------------


def _client_for(app: FastAPI, store, namespaces):
    async def override_db() -> AsyncGenerator[AsyncSession]:
        async with store() as session:
            yield session

    app.dependency_overrides[get_app_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: make_current_user(namespaces=namespaces)
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


async def _scoped_alert(store, scope) -> str:
    async with store() as session:
        n = await create_notification(
            session,
            "test-user-1",
            NotificationType.new_critical_cve,
            "new_relevant_cve",
            {"cve_id": "CVE-1"},
            "/vulnerabilities/CVE-1",
            scope=scope,
        )
        await session.commit()
        return str(n.id)


async def test_scoped_notification_hidden_when_namespace_no_longer_visible(app: FastAPI, store):
    await _add_user(store, "test-user-1")
    await _scoped_alert(store, [BILLING])
    async with store() as session:
        await create_notification(session, "test-user-1", NotificationType.mention, "mention", {"author": "a"})
        await session.commit()

    async with _client_for(app, store, [PAYMENTS]) as client:
        listed = (await client.get("/api/notifications")).json()
        unread = (await client.get("/api/notifications/unread-count")).json()

    assert [n["type"] for n in listed] == ["mention"]
    assert unread["count"] == 1


async def test_partial_access_loss_never_names_the_revoked_namespace(app: FastAPI, store):
    await _add_user(store, "test-user-1")
    await _scoped_alert(store, [PAYMENTS, BILLING])

    async with _client_for(app, store, [PAYMENTS]) as client:
        [alert] = (await client.get("/api/notifications", headers={"Accept-Language": "en"})).json()

    assert "cluster-a/payments" in alert["message"]
    assert "billing" not in alert["message"]
    async with store() as session:
        stored = (await session.execute(select(Notification))).scalars().one()
    assert "billing" not in stored.message  # fallback text stored without namespace names


async def test_mark_read_on_hidden_notification_is_not_found(app: FastAPI, store):
    await _add_user(store, "test-user-1")
    notification_id = await _scoped_alert(store, [BILLING])

    async with _client_for(app, store, [PAYMENTS]) as client:
        response = await client.patch(f"/api/notifications/{notification_id}/read")

    assert response.status_code == 404
    assert "CVE-1" not in response.text


# --- 3.3 team CVE alerts ----------------------------------------------------------


def _candidate(cve_id: str, ns=PAYMENTS, components=()):
    return {"cve_id": cve_id, "namespace": ns[0], "cluster_name": ns[1], "components": [list(c) for c in components]}


def _rule(cve_id=None, *, scope=None, component=None, version=None):
    return SimpleNamespace(cve_id=cve_id, scope=scope, component_name=component, version_pattern=version)


def test_prioritized_reason_wins_over_threshold_visibility():
    keys = team.classify_candidates([_candidate("CVE-1")], {"CVE-1"}, [], [])
    assert keys == {("CVE-1", "payments", "cluster-a", "prioritized")}


def test_non_critical_cve_above_thresholds_is_a_candidate():
    keys = team.classify_candidates([_candidate("CVE-HIGH")], set(), [], [])
    assert keys == {("CVE-HIGH", "payments", "cluster-a", "visible")}


def test_suppression_is_evaluated_per_namespace():
    scoped = _rule(
        "CVE-1", scope={"mode": "namespace", "targets": [{"namespace": "payments", "cluster_name": "cluster-a"}]}
    )
    rows = [_candidate("CVE-1", PAYMENTS), _candidate("CVE-1", BILLING)]

    keys = team.classify_candidates(rows, set(), [scoped], [])

    assert keys == {("CVE-1", "billing", "cluster-a", "visible")}


def test_component_suppression_uses_the_components_in_that_namespace():
    rule = _rule(component="openssl", version="3.0.*")
    rows = [
        _candidate("CVE-1", PAYMENTS, components=[("openssl", "3.0.7")]),
        _candidate("CVE-1", BILLING, components=[("openssl", "1.1.1")]),
    ]

    keys = team.classify_candidates(rows, set(), [], [rule])

    assert keys == {("CVE-1", "billing", "cluster-a", "visible")}


async def test_first_run_is_a_silent_baseline_then_only_new_pairs_notify(store):
    await _add_user(store, "dev")
    await _add_user(store, "sec", role=UserRole.sec_team)
    await _snapshot(store, "dev", [PAYMENTS])
    await _snapshot(store, "sec", [], has_all=True)
    existing = ("CVE-OLD", "payments", "cluster-a", "visible")
    new_visible = ("CVE-NEW", "payments", "cluster-a", "visible")
    other_ns = ("CVE-ELSE", "billing", "cluster-a", "visible")

    with patch.object(team.app_config, "team_notification_active_days", 30):
        async with store() as session:
            first = await team.apply_alert_diff(session, {existing}, NOW)
        async with store() as session:
            second = await team.apply_alert_diff(session, {existing, new_visible, other_ns}, NOW)
        async with store() as session:
            third = await team.apply_alert_diff(session, {existing, new_visible, other_ns}, NOW)

    assert (first, second, third) == (0, 1, 0)
    async with store() as session:
        notes = (await session.execute(select(Notification))).scalars().all()
    assert [(n.user_id, n.link) for n in notes] == [("dev", "/vulnerabilities/CVE-NEW")]
    assert notes[0].params["_scope"] == [["payments", "cluster-a"]]
    assert "namespaces" not in notes[0].params


async def test_trigger_change_takes_a_fresh_silent_baseline(store):
    await _add_user(store, "dev")
    await _snapshot(store, "dev", [PAYMENTS])
    async with store() as session:
        session.add(
            CveAlertMark(cve_id="__baseline__", namespace="", cluster_name="", reason="baseline", created_at=NOW)
        )
        session.add(
            CveAlertMark(
                cve_id="CVE-1", namespace="payments", cluster_name="cluster-a", reason="critical", created_at=NOW
            )
        )
        await session.commit()

    with patch.object(team.app_config, "team_notification_active_days", 30):
        async with store() as session:
            sent = await team.apply_alert_diff(session, {("CVE-2", "payments", "cluster-a", "visible")}, NOW)

    assert sent == 0
    async with store() as session:
        reasons = sorted(m.reason for m in (await session.execute(select(CveAlertMark))).scalars().all())
    assert reasons == ["baseline:v2", "visible"]


async def test_gone_cve_alerts_again_when_it_returns(store):
    await _add_user(store, "dev")
    await _snapshot(store, "dev", [PAYMENTS])
    key = ("CVE-1", "payments", "cluster-a", "visible")
    with patch.object(team.app_config, "team_notification_active_days", 30):
        for current in (set(), {key}, set(), {key}):
            async with store() as session:
                await team.apply_alert_diff(session, current, NOW)
    async with store() as session:
        notes = (await session.execute(select(Notification))).scalars().all()
    assert len(notes) == 2


def _many(reason: str, count: int) -> set:
    return {(f"CVE-{reason}-{i}", "payments", "cluster-a", reason) for i in range(count)}


async def _run_batch(store, keys, preferences=()) -> list[Notification]:
    await _add_user(store, "dev")
    await _snapshot(store, "dev", [PAYMENTS])
    async with store() as session:
        await prefs.set_preferences(session, "dev", list(preferences))
        await session.commit()
    with patch.object(team.app_config, "team_notification_active_days", 30):
        async with store() as session:
            await team.apply_alert_diff(session, set(), NOW)
        async with store() as session:
            await team.apply_alert_diff(session, keys, NOW)
    async with store() as session:
        return list((await session.execute(select(Notification))).scalars().all())


async def test_many_new_alerts_collapse_into_one_summary_per_kind(store):
    over = team.MAX_ALERTS_PER_USER + 1
    notes = await _run_batch(store, _many("visible", over) | _many("prioritized", over))
    assert sorted(n.message_key for n in notes) == ["team_cve_alert_summary", "team_priority_alert_summary"]


async def test_batched_priority_alerts_follow_the_priority_preference(store):
    over = team.MAX_ALERTS_PER_USER + 1
    notes = await _run_batch(
        store,
        _many("prioritized", over),
        preferences=[prefs.EffectivePreference("new_critical_cve", in_app=False, email=None)],
    )
    assert [(n.type, n.message_key) for n in notes] == [(NotificationType.new_priority, "team_priority_alert_summary")]


async def test_disabled_priority_category_drops_priority_alerts_only(store):
    notes = await _run_batch(
        store,
        _many("prioritized", 2) | _many("visible", 1),
        preferences=[prefs.EffectivePreference("priority", in_app=False, email=None)],
    )
    assert [n.message_key for n in notes] == ["new_relevant_cve"]


# --- 3.2 team digest --------------------------------------------------------------


def _cve(cve_id: str, *, fixable=True, severity=3, first_seen=None, fix_since=None, priority=False) -> CveListItem:
    return CveListItem(
        cve_id=cve_id,
        severity=SeverityLevel(severity),
        cvss=7.0,
        epss_probability=0.1,
        impact_score=5.0,
        fixable=fixable,
        fixed_by=None,
        affected_images=1,
        affected_deployments=1,
        first_seen=first_seen,
        fix_available_since=fix_since,
        has_priority=priority,
    )


def test_cve_counts_new_fixable_uses_first_seen_or_fix_release():
    recent = NOW - timedelta(days=2)
    old = NOW - timedelta(days=30)
    items = [
        _cve("A", first_seen=recent),
        _cve("B", first_seen=old, fix_since=recent),
        _cve("C", first_seen=old, fix_since=old, severity=4),
        _cve("D", fixable=False, first_seen=recent, priority=True),
    ]
    counts = team.cve_counts(items, NOW)
    assert counts == {"visible_cves": 4, "new_fixable_cves": 2, "critical_fixable_cves": 1, "prioritized_cves": 1}


async def test_remediation_counts_are_scoped_to_snapshot_namespaces(store):
    await _add_user(store, "dev")
    await _snapshot(store, "dev", [PAYMENTS])
    today = NOW.date()
    async with store() as session:
        for i, (ns, target, assignee) in enumerate(
            [
                (PAYMENTS, today - timedelta(days=1), "dev"),
                (PAYMENTS, today + timedelta(days=3), None),
                (BILLING, today - timedelta(days=5), "dev"),
            ]
        ):
            session.add(
                Remediation(
                    cve_id=f"CVE-{i}",
                    namespace=ns[0],
                    cluster_name=ns[1],
                    status=RemediationStatus.open,
                    created_by="dev",
                    assigned_to=assignee,
                    target_date=target,
                    created_at=NOW,
                    updated_at=NOW,
                )
            )
        await session.commit()
        [recipient] = await load_active_recipients(session, 30, NOW)
        counts = await team._remediation_counts(session, recipient, today)
    assert counts == {"remediations_overdue": 1, "remediations_due_soon": 1, "remediations_assigned_open": 1}


def _stats(**overrides) -> team.TeamDigestStats:
    values = dict(
        visible_cves=10,
        new_fixable_cves=0,
        critical_fixable_cves=0,
        prioritized_cves=0,
        component_upgrades=0,
        remediations_overdue=0,
        remediations_due_soon=0,
        remediations_assigned_open=0,
        risk_acceptances_expiring=0,
    )
    values.update(overrides)
    return team.TeamDigestStats(**values)


async def test_digest_goes_only_to_opted_in_users_with_news_and_valid_email(store):
    for user_id, email in (("in", None), ("out", None), ("bad", "not-an-email"), ("quiet", None)):
        await _add_user(store, user_id, email=email)
        await _snapshot(store, user_id, [PAYMENTS])
    async with store() as session:
        for user_id in ("in", "bad", "quiet"):
            await prefs.set_preferences(session, user_id, [prefs.EffectivePreference("team_digest", None, True)])
        await session.commit()

    async def fake_stats(app_db, sx_db, recipient, now, cache):
        return _stats(new_fixable_cves=0 if recipient.user.id == "quiet" else 3)

    send = AsyncMock()
    with (
        patch.object(team, "build_team_digest_stats", fake_stats),
        patch.object(team.mail_svc, "send_team_digest", send),
        patch.object(team.app_config, "team_notification_active_days", 30),
    ):
        async with store() as session:
            sent = await team.run_team_digest(session, AsyncMock(), NOW)

    assert sent == 1
    assert send.await_args.args[0] == "in@example.com"


def test_digest_email_contains_counts_and_links_but_no_cve_details():
    html = _jinja_env.get_template("team_digest.html").render(
        recipient_name="Dev",
        stats=_stats(new_fixable_cves=3, remediations_overdue=2),
        links={
            "components": "https://app/vulnerabilities?view=component",
            "remediations": "https://app/remediations",
            "my_remediations": "https://app/remediations?mine=1",
            "risk_acceptances": "https://app/risk-acceptances",
            "settings": "https://app/my-settings",
        },
    )
    assert "https://app/my-settings" in html
    assert ">3<" in html
    assert "CVE-" not in html


def test_digest_has_news_ignores_plain_totals():
    assert _stats().has_news is False
    assert _stats(risk_acceptances_expiring=1).has_news is True


def test_available_component_upgrades_alone_are_news():
    assert _stats(component_upgrades=5).has_news is True
    assert _stats(prioritized_cves=1).has_news is True
