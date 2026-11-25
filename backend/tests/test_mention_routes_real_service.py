"""@mention delivery through the real comment services on all three comment routes.

Unlike the route tests in test_mentions.py (which mock the comment service), these
run the CVE, risk-acceptance and escalation comment endpoints against a SQLite
session and fake only SMTP and the subscription fan-out. They prove the structured
``content`` payload, in-app rows, self/duplicate exclusion, edit-delta suppression,
the RA creator dedup, and that mention mail never carries the comment text.
"""

from datetime import datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import JSON, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.deps import get_app_db, get_current_user
from app.mail import service as mail_svc
from app.models.audit_log import AuditLog
from app.models.cve_alias import CveAlias
from app.models.cve_comment import CveComment
from app.models.escalation import Escalation
from app.models.notification import Notification, NotificationType
from app.models.notification_email import NotificationEmailEvent
from app.models.notification_preference import NotificationPreference
from app.models.risk_acceptance import RiskAcceptance, RiskAcceptanceComment, RiskStatus
from app.models.user import User, UserRole
from app.notifications import service as notif_svc
from app.services import cve_subscription_service as sub_svc
from tests.conftest import make_current_user

CVE = "CVE-2026-2000"
SECRET = "internal detail that must stay in the app"
SEC_USER = make_current_user(is_sec_team=True, has_all_namespaces=True, user_id="sec", username="secadmin")


def _mention(user_id: str) -> dict:
    return {"type": "mention", "user_id": user_id}


def _text(text: str) -> dict:
    return {"type": "text", "text": text}


@pytest.fixture
async def env(app, monkeypatch):
    monkeypatch.setattr(RiskAcceptance.__table__.c.scope, "type", JSON())
    monkeypatch.setattr(AuditLog.__table__.c.details, "type", JSON())
    monkeypatch.setattr(notif_svc.settings, "app_base_url", "https://manager.example")
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        for model in (
            User,
            CveAlias,
            Escalation,
            CveComment,
            RiskAcceptance,
            RiskAcceptanceComment,
            Notification,
            NotificationPreference,
            NotificationEmailEvent,
            AuditLog,
        ):
            await connection.run_sync(model.__table__.create)

    ra_id = uuid4()
    escalation_id = uuid4()
    async with factory() as session:
        session.add_all(
            [
                User(id="sec", username="secadmin", email="sec@example.com", role=UserRole.sec_team),
                User(id="bob", username="bob", email="bob@example.com", role=UserRole.team_member),
                User(id="carol", username="carol", email="carol@example.com", role=UserRole.team_member),
                User(id="creator", username="creator", email="creator@example.com", role=UserRole.team_member),
            ]
        )
        await session.flush()
        session.add(
            RiskAcceptance(
                id=ra_id,
                cve_id=CVE,
                status=RiskStatus.requested,
                justification="Accepted for a reason",
                scope={"mode": "namespace", "targets": [{"namespace": "payments", "cluster_name": "cluster-a"}]},
                scope_key="ra-key",
                created_by="creator",
            )
        )
        session.add(
            Escalation(
                id=escalation_id,
                cve_id=CVE,
                namespace="payments",
                cluster_name="cluster-a",
                level=1,
                triggered_at=datetime(2026, 1, 1),
            )
        )
        await session.commit()

    sent: list[dict] = []

    async def fake_send_email(to, subject, html_body):
        sent.append({"to": to, "subject": subject, "html": html_body})

    monkeypatch.setattr(mail_svc, "send_email", fake_send_email)
    monkeypatch.setattr(sub_svc, "broadcast_subscription_event", AsyncMock())

    async def override_app_db():
        async with factory() as session:
            yield session

    app.dependency_overrides[get_app_db] = override_app_db
    app.dependency_overrides[get_current_user] = lambda: SEC_USER
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            yield {
                "client": client,
                "factory": factory,
                "sent": sent,
                "ra_id": str(ra_id),
                "esc_id": str(escalation_id),
            }
    finally:
        await engine.dispose()


async def _mention_rows(env) -> list[Notification]:
    async with env["factory"]() as session:
        result = await session.execute(select(Notification).where(Notification.type == NotificationType.mention))
        return list(result.scalars().all())


def _assert_mention_mail(mail: dict, link_prefix: str) -> None:
    assert mail["subject"] == "Erwähnung von secadmin"
    assert f'href="https://manager.example{link_prefix}#comment-' in mail["html"]
    assert SECRET not in mail["html"]


async def test_cve_comment_route_mentions_and_edit_delta(env):
    content = [_text(f"{SECRET} "), _mention("bob"), _text(" "), _mention("bob"), _text(" "), _mention("sec")]

    created = await env["client"].post(f"/api/cves/{CVE}/comments", json={"content": content})

    assert created.status_code == 201
    mentions = [seg for seg in created.json()["content"] if seg["type"] == "mention"]
    assert {seg["user_id"] for seg in mentions} == {"bob", "sec"}
    assert [m["to"] for m in env["sent"]] == ["bob@example.com"]
    _assert_mention_mail(env["sent"][0], f"/vulnerabilities/{CVE}")
    assert [n.user_id for n in await _mention_rows(env)] == ["bob"]

    env["sent"].clear()
    edited = await env["client"].patch(
        f"/api/cves/{CVE}/comments/{created.json()['id']}",
        json={"content": [_text(f"{SECRET} "), _mention("bob"), _text(" "), _mention("carol")]},
    )

    assert edited.status_code == 200
    assert [m["to"] for m in env["sent"]] == ["carol@example.com"]
    assert sorted(n.user_id for n in await _mention_rows(env)) == ["bob", "carol"]


async def test_risk_acceptance_comment_mentioning_creator_notifies_once(env):
    content = [_text(f"{SECRET} "), _mention("creator")]

    response = await env["client"].post(f"/api/risk-acceptances/{env['ra_id']}/comments", json={"content": content})

    assert response.status_code == 201
    # The mention replaces the creator's general comment email and notification.
    assert [(m["to"], m["subject"]) for m in env["sent"]] == [("creator@example.com", "Erwähnung von secadmin")]
    _assert_mention_mail(env["sent"][0], f"/risk-acceptances/{env['ra_id']}")
    async with env["factory"]() as session:
        rows = (await session.execute(select(Notification))).scalars().all()
    assert [(n.user_id, n.message_key) for n in rows] == [("creator", "mention")]


async def test_escalation_comment_route_mentions(env):
    content = [_text(f"{SECRET} "), _mention("bob"), _text(" "), _mention("sec")]

    response = await env["client"].post(f"/api/escalations/{env['esc_id']}/comments", json={"content": content})

    assert response.status_code == 201
    assert [m["to"] for m in env["sent"]] == ["bob@example.com"]
    _assert_mention_mail(env["sent"][0], f"/vulnerabilities/{CVE}")
    assert "Eskalation" in env["sent"][0]["html"]
    assert [n.user_id for n in await _mention_rows(env)] == ["bob"]


async def test_mention_of_unknown_user_is_rejected_without_mail(env):
    response = await env["client"].post(
        f"/api/cves/{CVE}/comments", json={"content": [_text("hi "), _mention("ghost")]}
    )

    assert response.status_code == 400
    assert env["sent"] == []
    assert await _mention_rows(env) == []
