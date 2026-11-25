"""Sec-team "needs review" emails for risk acceptances (direct create, reopen, Excel import).

Routes run against a real SQLite session so recipient selection, preference
defaults, commit ordering and the post-commit background task are exercised
end to end. Only StackRox reads, subscription fan-out and SMTP are faked.
"""

from datetime import datetime
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import httpx
import pytest
from sqlalchemy import JSON, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.auth.middleware import CurrentUser
from app.deps import get_app_db, get_current_user
from app.mail import service as mail_svc
from app.models.audit_log import AuditLog
from app.models.cve_alias import CveAlias
from app.models.notification_preference import NotificationPreference
from app.models.risk_acceptance import RiskAcceptance, RiskAcceptanceComment, RiskStatus
from app.models.user import User, UserRole
from app.notifications import service as notif_svc
from app.routers import exports
from app.schemas.risk_acceptance import RiskScope, RiskScopeTarget
from app.services import cve_subscription_service as sub_svc
from app.services.risk_acceptance_service import scope_key
from app.stackrox import queries as sx

BASE_URL = "https://manager.example/"
CVE = "CVE-2026-1000"
JUSTIFICATION = "Secret compensating control XYZ-123"
PAIR_A = ("payments", "cluster-a")
PAIR_B = ("frontend", "cluster-b")
EXPECTED_RECIPIENTS = {"sec-default@example.com", "sec-inapp-off@example.com"}

REQUESTER = CurrentUser(
    id="requester",
    username="rita",
    email="rita@example.com",
    role=UserRole.team_member,
    namespaces=[PAIR_A, PAIR_B],
    onboarding_completed=True,
    full_name="Rita <b>Requester</b>",
)


def _target(pair: tuple[str, str]) -> dict:
    return {"namespace": pair[0], "cluster_name": pair[1]}


def _deployment(pair: tuple[str, str]) -> dict:
    return {"deployment_id": f"{pair[1]}-{pair[0]}", "namespace": pair[0], "cluster_name": pair[1], "image_name": "img"}


MULTI_SCOPE = {"mode": "namespace", "targets": [_target(PAIR_A), _target(PAIR_B)]}
SINGLE_SCOPE = {"mode": "namespace", "targets": [_target(PAIR_A)]}


@pytest.fixture
async def env(app, monkeypatch, tmp_path):
    monkeypatch.setattr(RiskAcceptance.__table__.c.scope, "type", JSON())
    monkeypatch.setattr(AuditLog.__table__.c.details, "type", JSON())
    monkeypatch.setattr(notif_svc.settings, "app_base_url", BASE_URL)
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'risk-review.db'}")
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        for model in (User, CveAlias, RiskAcceptance, RiskAcceptanceComment, NotificationPreference, AuditLog):
            await connection.run_sync(model.__table__.create)

    async with factory() as session:
        session.add_all(
            [
                User(id="requester", username="rita", email="rita@example.com", role=UserRole.team_member),
                User(id="sec-default", username="sd", email="sec-default@example.com", role=UserRole.sec_team),
                User(id="sec-email-off", username="seo", email="sec-email-off@example.com", role=UserRole.sec_team),
                User(id="sec-inapp-off", username="sio", email="sec-inapp-off@example.com", role=UserRole.sec_team),
                User(id="sec-placeholder", username="sp", email="sp@spoke.local", role=UserRole.sec_team),
                # Wildcard all-namespace users keep the team_member role.
                User(id="wildcard", username="wc", email="wildcard@example.com", role=UserRole.team_member),
            ]
        )
        await session.flush()
        session.add_all(
            [
                NotificationPreference(user_id="sec-email-off", category="risk_acceptance", in_app=True, email=False),
                NotificationPreference(user_id="sec-inapp-off", category="risk_acceptance", in_app=False, email=True),
                # Another category's opt-out must not affect risk_acceptance email.
                NotificationPreference(user_id="sec-default", category="remediation", in_app=True, email=False),
                NotificationPreference(user_id="wildcard", category="risk_acceptance", in_app=True, email=True),
            ]
        )
        await session.commit()

    state: dict = {"deployments": {CVE: [_deployment(PAIR_A), _deployment(PAIR_B)]}, "sent": [], "fail_commit": False}

    async def get_affected_deployments(sx_db, cve_id, pairs):
        allowed = set(pairs)
        return [d for d in state["deployments"].get(cve_id, []) if (d["namespace"], d["cluster_name"]) in allowed]

    async def fake_send_email(to, subject, html_body):
        # Delivery must only ever see committed data.
        async with factory() as check:
            statuses = [ra.status for ra in (await check.execute(select(RiskAcceptance))).scalars().all()]
        state["sent"].append({"to": to, "subject": subject, "html": html_body, "committed_statuses": statuses})

    monkeypatch.setattr(sx, "get_affected_deployments", get_affected_deployments)
    monkeypatch.setattr(sub_svc, "broadcast_subscription_event", AsyncMock())
    monkeypatch.setattr(mail_svc, "send_email", fake_send_email)

    async def override_app_db():
        async with factory() as session:
            if state["fail_commit"]:
                session.commit = AsyncMock(side_effect=RuntimeError("commit failed"))
            yield session

    app.dependency_overrides[get_app_db] = override_app_db
    app.dependency_overrides[get_current_user] = lambda: REQUESTER
    state["factory"] = factory
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            state["client"] = client
            yield state
    finally:
        await engine.dispose()


async def _seed_ra(env, status: RiskStatus, scope: dict = SINGLE_SCOPE) -> str:
    ra_id = uuid4()
    async with env["factory"]() as session:
        session.add(
            RiskAcceptance(
                id=ra_id,
                cve_id=CVE,
                status=status,
                justification=JUSTIFICATION,
                scope=scope,
                scope_key=f"seed-{ra_id.hex[:20]}",
                created_by="requester",
                reviewed_at=datetime(2026, 1, 1) if status != RiskStatus.requested else None,
            )
        )
        await session.commit()
    return str(ra_id)


def _assert_direct_emails(env, ra_id: str) -> None:
    sent = env["sent"]
    assert {mail["to"] for mail in sent} == EXPECTED_RECIPIENTS
    assert len(sent) == len(EXPECTED_RECIPIENTS)
    for mail in sent:
        assert mail["subject"] == f"Risikoakzeptanz zur Prüfung: {CVE}"
        assert f'href="https://manager.example/risk-acceptances/{ra_id}"' in mail["html"]
        assert "Rita &lt;b&gt;Requester&lt;/b&gt;" in mail["html"]
        assert "<b>Requester</b>" not in mail["html"]
        assert JUSTIFICATION not in mail["html"]
        for name in (*PAIR_A, *PAIR_B):
            assert name not in mail["html"]
        assert RiskStatus.requested in mail["committed_statuses"]


async def test_requested_create_emails_each_eligible_sec_user(env):
    response = await env["client"].post(
        "/api/risk-acceptances", json={"cve_id": CVE, "justification": JUSTIFICATION, "scope": MULTI_SCOPE}
    )

    assert response.status_code == 201
    assert response.json()["status"] == "requested"
    _assert_direct_emails(env, response.json()["id"])


async def test_auto_approved_create_sends_nothing(env):
    response = await env["client"].post(
        "/api/risk-acceptances", json={"cve_id": CVE, "justification": JUSTIFICATION, "scope": SINGLE_SCOPE}
    )

    assert response.status_code == 201
    assert response.json()["status"] == "approved"
    assert env["sent"] == []


@pytest.mark.parametrize("previous", [RiskStatus.approved, RiskStatus.rejected])
async def test_reopen_to_requested_emails_sec_team(env, previous):
    ra_id = await _seed_ra(env, previous)

    response = await env["client"].put(
        f"/api/risk-acceptances/{ra_id}", json={"justification": JUSTIFICATION, "scope": MULTI_SCOPE}
    )

    assert response.status_code == 200
    assert response.json()["status"] == "requested"
    _assert_direct_emails(env, ra_id)


@pytest.mark.parametrize("previous", [RiskStatus.approved, RiskStatus.rejected])
async def test_update_that_auto_approves_stays_silent(env, previous):
    ra_id = await _seed_ra(env, previous)

    response = await env["client"].put(
        f"/api/risk-acceptances/{ra_id}", json={"justification": JUSTIFICATION, "scope": SINGLE_SCOPE}
    )

    assert response.status_code == 200
    assert response.json()["status"] == "approved"
    assert env["sent"] == []


@pytest.mark.parametrize("previous", [RiskStatus.requested, RiskStatus.expired])
async def test_update_of_non_reopenable_record_is_still_rejected_without_email(env, previous):
    ra_id = await _seed_ra(env, previous, MULTI_SCOPE)

    response = await env["client"].put(
        f"/api/risk-acceptances/{ra_id}", json={"justification": JUSTIFICATION, "scope": MULTI_SCOPE}
    )

    assert response.status_code == 400
    assert env["sent"] == []


async def test_no_eligible_recipients_schedules_no_task(env, monkeypatch):
    async with env["factory"]() as session:
        for pref in (await session.execute(select(NotificationPreference))).scalars().all():
            await session.delete(pref)
        await session.flush()
        session.add_all(
            [
                NotificationPreference(user_id=uid, category="risk_acceptance", in_app=True, email=False)
                for uid in ("sec-default", "sec-inapp-off", "sec-email-off")
            ]
        )
        await session.commit()
    sender = AsyncMock()
    monkeypatch.setattr(mail_svc, "send_risk_review_emails", sender)

    response = await env["client"].post(
        "/api/risk-acceptances", json={"cve_id": CVE, "justification": JUSTIFICATION, "scope": MULTI_SCOPE}
    )

    assert response.status_code == 201
    assert response.json()["status"] == "requested"
    sender.assert_not_called()


async def test_failed_commit_sends_nothing_and_persists_nothing(env):
    env["fail_commit"] = True

    with pytest.raises(RuntimeError, match="commit failed"):
        await env["client"].post(
            "/api/risk-acceptances", json={"cve_id": CVE, "justification": JUSTIFICATION, "scope": MULTI_SCOPE}
        )

    assert env["sent"] == []
    async with env["factory"]() as session:
        assert (await session.execute(select(RiskAcceptance))).scalars().all() == []


@pytest.mark.parametrize("previous", [RiskStatus.approved, RiskStatus.rejected])
async def test_reopen_failed_commit_sends_nothing_and_keeps_previous_state(env, previous):
    ra_id = await _seed_ra(env, previous)
    env["fail_commit"] = True

    with pytest.raises(RuntimeError, match="commit failed"):
        await env["client"].put(
            f"/api/risk-acceptances/{ra_id}", json={"justification": JUSTIFICATION, "scope": MULTI_SCOPE}
        )

    assert env["sent"] == []
    async with env["factory"]() as session:
        acceptance = await session.get(RiskAcceptance, UUID(ra_id))
        assert acceptance.status == previous
        assert acceptance.scope == SINGLE_SCOPE


async def test_smtp_failure_does_not_fail_committed_request(env, monkeypatch):
    attempted: list[str] = []

    async def flaky_send_email(to, subject, html_body):
        attempted.append(to)
        if to == "sec-default@example.com":
            raise RuntimeError("smtp down")

    monkeypatch.setattr(mail_svc, "send_email", flaky_send_email)

    response = await env["client"].post(
        "/api/risk-acceptances", json={"cve_id": CVE, "justification": JUSTIFICATION, "scope": MULTI_SCOPE}
    )

    assert response.status_code == 201
    assert set(attempted) == EXPECTED_RECIPIENTS


async def test_send_risk_review_emails_isolates_recipients(monkeypatch):
    attempted: list[str] = []

    async def fake_send_email(to, subject, html_body):
        attempted.append(to)
        if to == "boom@example.com":
            raise RuntimeError("smtp down")

    monkeypatch.setattr(mail_svc, "send_email", fake_send_email)
    jobs = (
        notif_svc.RiskReviewEmailJob("ok1@example.com", "u1", "Rita", "https://a/x", acceptance_id="1", cve_id=CVE),
        notif_svc.RiskReviewEmailJob("boom@example.com", "u2", "Rita", "https://a/x", acceptance_id="1", cve_id=CVE),
        notif_svc.RiskReviewEmailJob("ok2@example.com", "u3", "Rita", "https://a/list", request_count=3),
    )

    await mail_svc.send_risk_review_emails(jobs)

    assert attempted == ["ok1@example.com", "boom@example.com", "ok2@example.com"]


# --- Excel import -----------------------------------------------------------------

IMPORT_URL = "/api/exports/excel/import"
IMPORT_FILE = {"file": ("import.xlsx", b"content")}


def _row(cve_id: str, justification: str = JUSTIFICATION) -> dict:
    return {"cve_id": cve_id, "justification": justification, "expires_at": None}


async def _import(env, monkeypatch, rows: list[dict], *, confirm: bool = True) -> dict:
    monkeypatch.setattr(exports, "parse_import_excel", lambda content, lang: [dict(r) for r in rows])
    params = {"confirm": "true"} if confirm else {}
    response = await env["client"].post(IMPORT_URL, params=params, files=IMPORT_FILE)
    assert response.status_code == 200
    return response.json()


async def test_import_sends_one_summary_per_recipient_counting_new_requests(env, monkeypatch):
    multi = [_deployment(PAIR_A), _deployment(PAIR_B)]
    env["deployments"] = {
        "CVE-2026-1": multi,
        "CVE-2026-2": multi,
        "CVE-2026-3": [_deployment(PAIR_A)],  # single namespace: auto-approved
        "CVE-2026-5": multi,  # duplicate of an existing active request
    }
    duplicate_scope = RiskScope(
        mode="namespace",
        targets=[RiskScopeTarget(cluster_name=c, namespace=n) for n, c in sorted([PAIR_B, PAIR_A], key=lambda p: p[1])],
    )
    async with env["factory"]() as session:
        session.add(
            RiskAcceptance(
                cve_id="CVE-2026-5",
                status=RiskStatus.requested,
                justification=JUSTIFICATION,
                scope=duplicate_scope.model_dump(mode="json"),
                scope_key=scope_key(duplicate_scope),
                created_by="requester",
            )
        )
        await session.commit()

    body = await _import(
        env,
        monkeypatch,
        [
            _row("CVE-2026-1"),
            _row("CVE-2026-2"),
            _row("CVE-2026-3"),
            _row("CVE-2026-4", "short"),  # invalid
            _row("CVE-2026-5"),
        ],
    )

    assert len(body["created"]) == 3
    assert {f["cve_id"] for f in body["failed"]} == {"CVE-2026-4", "CVE-2026-5"}
    sent = env["sent"]
    assert sorted(mail["to"] for mail in sent) == sorted(EXPECTED_RECIPIENTS)
    for mail in sent:
        assert mail["subject"] == "2 Risikoakzeptanzen aus Excel-Import zur Prüfung"
        assert 'href="https://manager.example/risk-acceptances?status=requested"' in mail["html"]
        assert "Rita &lt;b&gt;Requester&lt;/b&gt;" in mail["html"]
        assert JUSTIFICATION not in mail["html"]
        assert "CVE-2026-" not in mail["html"]
        for name in (*PAIR_A, *PAIR_B):
            assert name not in mail["html"]
        assert mail["committed_statuses"].count(RiskStatus.requested) == 3


async def test_import_with_single_request_still_sends_summary(env, monkeypatch):
    await _import(env, monkeypatch, [_row(CVE)])

    assert len(env["sent"]) == len(EXPECTED_RECIPIENTS)
    for mail in env["sent"]:
        assert mail["subject"] == "1 Risikoakzeptanz aus Excel-Import zur Prüfung"


async def test_import_preview_sends_nothing(env, monkeypatch):
    body = await _import(env, monkeypatch, [_row(CVE)], confirm=False)

    assert body["total_valid"] == 1
    assert env["sent"] == []


async def test_import_without_new_requests_sends_nothing(env, monkeypatch):
    env["deployments"] = {CVE: [_deployment(PAIR_A)], "CVE-2026-9": []}

    body = await _import(env, monkeypatch, [_row(CVE), _row("CVE-2026-9"), _row("CVE-2026-8", "short")])

    assert len(body["created"]) == 1  # auto-approved
    assert env["sent"] == []


async def test_import_with_zero_created_sends_nothing(env, monkeypatch):
    body = await _import(env, monkeypatch, [_row("CVE-2026-8", "short")])

    assert body["created"] == []
    assert env["sent"] == []


async def test_import_failed_commit_sends_nothing_and_keeps_existing_records(env, monkeypatch):
    existing_id = await _seed_ra(env, RiskStatus.approved)
    env["fail_commit"] = True

    with pytest.raises(RuntimeError, match="commit failed"):
        await _import(env, monkeypatch, [_row(CVE)])

    assert env["sent"] == []
    async with env["factory"]() as session:
        records = (await session.execute(select(RiskAcceptance))).scalars().all()
        assert [(str(ra.id), ra.status, ra.scope) for ra in records] == [
            (existing_id, RiskStatus.approved, SINGLE_SCOPE)
        ]


def test_import_review_template_escapes_and_links():
    html = mail_svc._jinja_env.get_template("risk_import_review.html").render(
        requester_name="<script>x</script>", request_count=4, link="https://manager.example/risk-acceptances"
    )
    assert "<script>x</script>" not in html
    assert "&lt;script&gt;" in html
    assert "Risikoakzeptanzen angefragt" in html
