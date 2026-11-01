"""CVE subscriptions: subscribe/unsubscribe, broadcast fan-out, hourly diff job, daily email.

Uses an in-memory SQLite app DB (pattern of test_team_notifications.py); the
StackRox query layer is stubbed.
"""

import re
from collections.abc import AsyncGenerator
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.deps import get_app_db, get_current_user
from app.i18n import ApiError
from app.mail.service import _jinja_env
from app.models.audit_log import AuditLog
from app.models.cve_subscription import CveSubscription, CveSubscriptionEmailDelivery, CveSubscriptionEvent
from app.models.global_settings import GlobalSettings
from app.models.notification import Notification, NotificationType
from app.models.notification_preference import NotificationPreference
from app.models.user import User, UserRole
from app.models.user_namespace_snapshot import UserNamespaceSnapshot
from app.notifications import preferences as prefs
from app.notifications.messages import NOTIFICATION_MESSAGES
from app.services import cve_subscription_service as sub
from app.services.namespace_snapshot import record_namespace_snapshot

from .conftest import make_current_user

NOW = datetime(2026, 11, 1, 12, 0, 0)
PAYMENTS = ("payments", "cluster-a")
BILLING = ("billing", "cluster-a")


@pytest.fixture
async def store() -> AsyncGenerator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        for model in (
            User,
            UserNamespaceSnapshot,
            NotificationPreference,
            Notification,
            AuditLog,
            GlobalSettings,
            CveSubscription,
            CveSubscriptionEvent,
            CveSubscriptionEmailDelivery,
        ):
            await connection.run_sync(model.__table__.create)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    yield factory
    await engine.dispose()


async def _add_user(factory, user_id: str, *, role=UserRole.team_member, email: str | None = None) -> None:
    async with factory() as session:
        session.add(
            User(id=user_id, username=user_id, email=email or f"{user_id}@example.com", role=role, created_at=NOW)
        )
        await session.commit()


async def _snapshot(factory, user_id: str, namespaces, *, has_all=False, seen=NOW) -> None:
    user = make_current_user(user_id=user_id, username=user_id, namespaces=list(namespaces), has_all_namespaces=has_all)
    async with factory() as session:
        await record_namespace_snapshot(session, user, now=seen)


def _row(pair, *, cve_id="CVE-1", images=("quay.io/app:1",), cvss=7.5, epss=0.1, fixable=()):
    return {
        "cve_id": cve_id,
        "namespace": pair[0],
        "cluster_name": pair[1],
        "severity": 3,
        "cvss": cvss,
        "epss": epss,
        "images": list(images),
        "fixable_components": list(fixable),
    }


def _stub_locations(rows):
    async def fake(sx_db, cve_ids):
        return [r for r in rows if r["cve_id"] in cve_ids]

    return patch.object(sub.sx, "get_subscription_locations", fake)


async def _subscribe(factory, user_id: str, namespaces, rows, cve_id="CVE-1", **user_kwargs) -> bool:
    user = make_current_user(user_id=user_id, username=user_id, namespaces=list(namespaces), **user_kwargs)
    with _stub_locations(rows):
        async with factory() as session:
            return await sub.subscribe(session, AsyncMock(), user, cve_id)


async def _notifications(factory, user_id: str) -> list[Notification]:
    async with factory() as session:
        result = await session.execute(select(Notification).where(Notification.user_id == user_id))
        return list(result.scalars().all())


async def _events(factory, user_id: str) -> list[CveSubscriptionEvent]:
    async with factory() as session:
        result = await session.execute(select(CveSubscriptionEvent).where(CveSubscriptionEvent.user_id == user_id))
        return list(result.scalars().all())


# --- catalog -------------------------------------------------------------------


def test_every_event_kind_has_de_and_en_messages():
    kinds = [
        "comment",
        "priority_set",
        "priority_changed",
        "priority_removed",
        "risk_acceptance",
        "remediation",
        "escalation",
        "scores_changed",
        "fix_available",
        "new_images",
        "no_longer_affected",
        "summary",
    ]
    for kind in kinds:
        entry = NOTIFICATION_MESSAGES[f"subscription.{kind}"]
        assert set(entry) >= {"de", "en"}


def test_category_defaults_in_app_on_email_off():
    category = prefs.CATEGORIES["cve_subscription"]
    assert category.types == (NotificationType.cve_subscription,)
    assert category.in_app_default is True
    assert category.email_default is False


# --- subscribe / unsubscribe ---------------------------------------------------------


async def test_subscribe_stores_baseline_and_audit(store):
    await _add_user(store, "dev")
    created = await _subscribe(store, "dev", [PAYMENTS], [_row(PAYMENTS), _row(BILLING)])
    assert created is True

    async with store() as session:
        row = await session.get(CveSubscription, ("dev", "CVE-1"))
        audit = (await session.execute(select(AuditLog))).scalars().all()
    assert [(loc["namespace"], loc["cluster"]) for loc in row.state["locations"]] == [PAYMENTS]
    assert row.state["scores"]["cvss"] == 7.5
    assert [a.action for a in audit] == ["cve_subscribed"]


async def test_subscribe_is_idempotent(store):
    await _add_user(store, "dev")
    assert await _subscribe(store, "dev", [PAYMENTS], [_row(PAYMENTS)]) is True
    assert await _subscribe(store, "dev", [PAYMENTS], [_row(PAYMENTS)]) is False


async def test_subscribe_to_invisible_cve_is_404(store):
    await _add_user(store, "dev")
    with pytest.raises(ApiError) as exc:
        await _subscribe(store, "dev", [PAYMENTS], [_row(BILLING)])
    assert exc.value.status_code == 404


async def test_subscribe_without_namespaces_is_404_without_stackrox_query(store):
    await _add_user(store, "dev")
    user = make_current_user(user_id="dev", namespaces=[])
    fake = AsyncMock()
    with patch.object(sub.sx, "get_subscription_locations", fake):
        async with store() as session:
            with pytest.raises(ApiError):
                await sub.subscribe(session, AsyncMock(), user, "CVE-1")
    fake.assert_not_awaited()


async def test_subscribe_cap(store, monkeypatch):
    await _add_user(store, "dev")
    monkeypatch.setattr(sub, "MAX_SUBSCRIPTIONS_PER_USER", 1)
    rows = [_row(PAYMENTS, cve_id="CVE-1"), _row(PAYMENTS, cve_id="CVE-2")]
    await _subscribe(store, "dev", [PAYMENTS], rows, cve_id="CVE-1")
    with pytest.raises(ApiError) as exc:
        await _subscribe(store, "dev", [PAYMENTS], rows, cve_id="CVE-2")
    assert exc.value.status_code == 400


async def test_unsubscribe_is_idempotent(store):
    await _add_user(store, "dev")
    await _subscribe(store, "dev", [PAYMENTS], [_row(PAYMENTS)])
    async with store() as session:
        assert await sub.unsubscribe(session, "dev", "CVE-1") is True
    async with store() as session:
        assert await sub.unsubscribe(session, "dev", "CVE-1") is False


# --- broadcast -----------------------------------------------------------------


async def test_broadcast_skips_actor_and_excluded_and_stores_scope(store):
    for uid in ("actor", "mentioned", "follower"):
        await _add_user(store, uid)
        await _subscribe(store, uid, [PAYMENTS], [_row(PAYMENTS)])

    async with store() as session:
        count = await sub.broadcast_subscription_event(
            session,
            None,
            cve_id="CVE-1",
            kind="comment",
            params={"author": "Actor"},
            link="/vulnerabilities/CVE-1#comment-1",
            actor_id="actor",
            exclude_user_ids=["mentioned"],
            scope=[PAYMENTS],
        )
        await session.commit()

    assert count == 1
    assert await _notifications(store, "actor") == []
    assert await _notifications(store, "mentioned") == []
    [notification] = await _notifications(store, "follower")
    assert notification.type == NotificationType.cve_subscription
    assert notification.message_key == "subscription.comment"
    assert notification.link == "/vulnerabilities/CVE-1#comment-1"
    assert notification.params["_scope"] == [list(PAYMENTS)]


async def test_broadcast_without_subscribers_never_queries_stackrox(store):
    lookup = AsyncMock()
    with patch.object(sub.sx, "get_namespaces_with_cve", lookup):
        async with store() as session:
            count = await sub.broadcast_subscription_event(
                session, AsyncMock(), cve_id="CVE-1", kind="comment", params={"author": "x"}
            )
    assert count == 0
    lookup.assert_not_awaited()


async def test_broadcast_defaults_scope_to_cve_pairs(store):
    await _add_user(store, "follower")
    await _subscribe(store, "follower", [PAYMENTS], [_row(PAYMENTS)])
    lookup = AsyncMock(return_value=[PAYMENTS, BILLING])
    with patch.object(sub.sx, "get_namespaces_with_cve", lookup):
        async with store() as session:
            await sub.broadcast_subscription_event(
                session, AsyncMock(), cve_id="CVE-1", kind="priority_set", params={"status": "high"}
            )
            await session.commit()
    [notification] = await _notifications(store, "follower")
    assert sorted(map(tuple, notification.params["_scope"])) == [BILLING, PAYMENTS]


async def test_broadcast_survives_stackrox_failure(store):
    await _add_user(store, "follower")
    await _subscribe(store, "follower", [PAYMENTS], [_row(PAYMENTS)])
    with patch.object(sub.sx, "get_namespaces_with_cve", AsyncMock(side_effect=RuntimeError("down"))):
        async with store() as session:
            count = await sub.broadcast_subscription_event(
                session, AsyncMock(), cve_id="CVE-1", kind="comment", params={"author": "x"}
            )
    assert count == 0


async def test_event_row_is_written_even_with_in_app_off(store):
    await _add_user(store, "follower")
    await _subscribe(store, "follower", [PAYMENTS], [_row(PAYMENTS)])
    async with store() as session:
        await prefs.set_preferences(
            session, "follower", [prefs.EffectivePreference(category="cve_subscription", in_app=False, email=True)]
        )
        await session.commit()
    async with store() as session:
        await sub.broadcast_subscription_event(
            session, None, cve_id="CVE-1", kind="comment", params={"author": "x"}, scope=[PAYMENTS]
        )
        await session.commit()
    assert await _notifications(store, "follower") == []
    assert [e.kind for e in await _events(store, "follower")] == ["comment"]


def test_risk_acceptance_scope_pairs():
    scope = {
        "mode": "namespace",
        "targets": [
            {"namespace": "payments", "cluster_name": "cluster-a"},
            {"namespace": "payments", "cluster_name": "cluster-a", "image_name": "x"},
        ],
    }
    assert sub.risk_acceptance_scope_pairs(scope) == [PAYMENTS]
    assert sub.risk_acceptance_scope_pairs({"mode": "all", "targets": []}) is None


# --- hourly diff job -----------------------------------------------------------


async def test_diff_job_notifies_only_the_affected_subscriber(store):
    for uid, ns in (("pay", [PAYMENTS]), ("bill", [BILLING])):
        await _add_user(store, uid)
        await _snapshot(store, uid, ns)
    rows = [_row(PAYMENTS), _row(BILLING)]
    await _subscribe(store, "pay", [PAYMENTS], rows)
    await _subscribe(store, "bill", [BILLING], rows)

    # A new image appears only in payments.
    changed = [_row(PAYMENTS, images=["quay.io/app:1", "quay.io/new:1"]), _row(BILLING)]
    with _stub_locations(changed):
        async with store() as session:
            sent = await sub.run_subscription_diff(session, AsyncMock(), now=NOW)

    assert sent == 1
    [notification] = await _notifications(store, "pay")
    assert notification.message_key == "subscription.new_images"
    assert notification.params["_scope"] == [list(PAYMENTS)]
    assert "quay.io" not in str(notification.params)
    assert await _notifications(store, "bill") == []

    # Second run with unchanged data: nothing new.
    with _stub_locations(changed):
        async with store() as session:
            assert await sub.run_subscription_diff(session, AsyncMock(), now=NOW + timedelta(hours=1)) == 0


async def test_diff_job_skips_inactive_subscriber_and_keeps_state(store):
    await _add_user(store, "gone")
    await _snapshot(store, "gone", [PAYMENTS], seen=NOW - timedelta(days=60))
    await _subscribe(store, "gone", [PAYMENTS], [_row(PAYMENTS)])
    async with store() as session:
        before = (await session.get(CveSubscription, ("gone", "CVE-1"))).state

    with _stub_locations([_row(PAYMENTS, cvss=9.9)]):
        async with store() as session:
            assert await sub.run_subscription_diff(session, AsyncMock(), now=NOW) == 0
    async with store() as session:
        assert (await session.get(CveSubscription, ("gone", "CVE-1"))).state == before


async def test_diff_job_caps_into_summary(store, monkeypatch):
    monkeypatch.setattr(sub, "MAX_DIFF_NOTIFICATIONS_PER_USER", 2)
    await _add_user(store, "pay")
    await _snapshot(store, "pay", [PAYMENTS])
    cves = ["CVE-1", "CVE-2", "CVE-3"]
    rows = [_row(PAYMENTS, cve_id=c) for c in cves]
    for cve_id in cves:
        await _subscribe(store, "pay", [PAYMENTS], rows, cve_id=cve_id)

    changed = [_row(PAYMENTS, cve_id=c, cvss=9.9) for c in cves]
    with _stub_locations(changed):
        async with store() as session:
            await sub.run_subscription_diff(session, AsyncMock(), now=NOW)

    [notification] = await _notifications(store, "pay")
    assert notification.message_key == "subscription.summary"
    assert notification.params["count"] == 3
    assert notification.link == "/vulnerabilities?subscribed=1"
    assert len(await _events(store, "pay")) == 3


# --- daily summary email ------------------------------------------------------------


async def _opt_in_email(store, user_id: str) -> None:
    async with store() as session:
        await prefs.set_preferences(
            session, user_id, [prefs.EffectivePreference(category="cve_subscription", in_app=True, email=True)]
        )
        await session.commit()


async def _event(store, user_id: str, cve_id: str, scope, created_at) -> None:
    async with store() as session:
        session.add(
            CveSubscriptionEvent(
                user_id=user_id, cve_id=cve_id, kind="comment", scope=[list(p) for p in scope], created_at=created_at
            )
        )
        await session.commit()


async def test_email_is_counts_only_and_once_per_day(store):
    await _add_user(store, "pay")
    await _snapshot(store, "pay", [PAYMENTS])
    await _opt_in_email(store, "pay")
    await _event(store, "pay", "CVE-1", [PAYMENTS], NOW - timedelta(hours=2))
    await _event(store, "pay", "CVE-1", [PAYMENTS], NOW - timedelta(hours=1))
    await _event(store, "pay", "CVE-2", [PAYMENTS], NOW - timedelta(hours=1))
    # Lost-access event (snapshot no longer has billing): not counted.
    await _event(store, "pay", "CVE-3", [BILLING], NOW - timedelta(hours=1))

    send = AsyncMock()
    with patch.object(sub.mail_svc, "send_cve_subscription_summary", send):
        async with store() as session:
            assert await sub.run_subscription_email_digest(session, now=NOW) == 1
        async with store() as session:
            assert await sub.run_subscription_email_digest(session, now=NOW + timedelta(hours=1)) == 0

    send.assert_awaited_once()
    assert send.await_args.kwargs == {"event_count": 3, "cve_count": 2}


async def test_email_skips_opt_out_and_placeholder_address(store):
    await _add_user(store, "optout")
    await _add_user(store, "spoke", email="spoke@spoke.local")
    for uid in ("optout", "spoke"):
        await _snapshot(store, uid, [PAYMENTS])
        await _event(store, uid, "CVE-1", [PAYMENTS], NOW - timedelta(hours=1))
    await _opt_in_email(store, "spoke")

    send = AsyncMock()
    with patch.object(sub.mail_svc, "send_cve_subscription_summary", send):
        async with store() as session:
            assert await sub.run_subscription_email_digest(session, now=NOW) == 0
    send.assert_not_awaited()


def test_email_template_never_renders_identifiers():
    html = _jinja_env.get_template("cve_subscription_summary.html").render(
        recipient_name="Dev",
        event_count=3,
        cve_count=2,
        links={"subscriptions": "https://app/vulnerabilities?subscribed=1", "settings": "https://app/my-settings"},
    )
    assert "3" in html and "2" in html
    assert re.search(r"CVE-\d", html) is None


async def test_email_purges_old_events(store):
    await _add_user(store, "pay")
    await _event(store, "pay", "CVE-1", [PAYMENTS], NOW - timedelta(days=40))
    async with store() as session:
        await sub.run_subscription_email_digest(session, now=NOW)
    assert await _events(store, "pay") == []


# --- router --------------------------------------------------------------------


def _client(app: FastAPI, store, user) -> httpx.AsyncClient:
    async def override_db() -> AsyncGenerator[AsyncSession]:
        async with store() as session:
            yield session

    app.dependency_overrides[get_app_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: user
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


async def test_router_round_trip(app: FastAPI, store):
    await _add_user(store, "test-user-1")
    user = make_current_user(namespaces=[PAYMENTS])
    with _stub_locations([_row(PAYMENTS)]):
        async with _client(app, store, user) as client:
            assert (await client.get("/api/cves/CVE-1/subscription")).json()["subscribed"] is False
            assert (await client.put("/api/cves/CVE-1/subscription")).json()["subscribed"] is True
            assert (await client.put("/api/cves/CVE-1/subscription")).status_code == 200
            assert (await client.get("/api/cves/CVE-1/subscription")).json()["subscribed"] is True
            listed = (await client.get("/api/me/cve-subscriptions")).json()
            assert [item["cve_id"] for item in listed] == ["CVE-1"]
            assert (await client.delete("/api/cves/CVE-1/subscription")).json()["subscribed"] is False
            assert (await client.delete("/api/cves/CVE-1/subscription")).status_code == 200


async def test_router_put_invisible_cve_is_404(app: FastAPI, store):
    await _add_user(store, "test-user-1")
    user = make_current_user(namespaces=[PAYMENTS])
    with _stub_locations([_row(BILLING)]):
        async with _client(app, store, user) as client:
            response = await client.put("/api/cves/CVE-1/subscription")
    assert response.status_code == 404
