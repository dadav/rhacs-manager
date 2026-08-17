"""Tests for @mention resolution, delivery jobs, dedup, and mention emails.

The notification service is exercised with a lightweight fake AsyncSession: it
only needs ``execute`` (returns the resolved users), ``add`` (collects rows),
and ``flush``. No real database is required.
"""

import importlib.util
from datetime import datetime
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from sqlalchemy.exc import IntegrityError

from app.auth.middleware import _assert_username_available, _commit_user_sync
from app.i18n import ApiError
from app.mail import service as mail_svc
from app.models.user import User, UserRole
from app.notifications import service as notif_svc
from app.schemas.cve import CveCommentResponse
from app.schemas.risk_acceptance import CommentResponse


def _user(uid: str, username: str, email: str = None, role: UserRole = UserRole.team_member) -> User:
    return User(id=uid, username=username, email=email or f"{username}@example.com", role=role)


def _session_returning(users: list[User]) -> AsyncMock:
    """Fake session whose single execute() yields ``users`` from scalars().all()."""
    session = AsyncMock()
    result = MagicMock()
    result.scalars.return_value.all.return_value = users
    session.execute.return_value = result
    session.add = MagicMock()
    session.flush = AsyncMock()
    return session


CTX = "CVE CVE-2024-0001"
LINK = "/vulnerabilities/CVE-2024-0001#comment-1"


@pytest.mark.asyncio
async def test_resolution_case_insensitive_self_unknown_and_repeats():
    author = _user("a1", "alice", role=UserRole.sec_team)
    bob = _user("b1", "bob")
    session = _session_returning([bob])

    msg = "hi @[Bob] and @[BOB] and @[alice] and @[ghost]"
    result = await notif_svc.notify_mentions(session, msg, author, LINK, context_label=CTX)

    assert result.recipient_ids == ("b1",)
    assert len(result.email_jobs) == 1
    assert result.email_jobs[0].to_email == "bob@example.com"
    assert result.email_jobs[0].context_label == CTX
    assert result.email_jobs[0].link.endswith(LINK)


@pytest.mark.asyncio
async def test_no_mentions_returns_empty():
    author = _user("a1", "alice")
    session = _session_returning([])
    result = await notif_svc.notify_mentions(session, "plain text", author, LINK, context_label=CTX)
    assert result.recipient_ids == ()
    assert result.email_jobs == ()
    session.execute.assert_not_called()


@pytest.mark.asyncio
async def test_too_many_mentions_rejected():
    author = _user("a1", "alice", role=UserRole.sec_team)
    recipients = [_user(f"u{i}", f"user{i}") for i in range(notif_svc.MAX_MENTION_RECIPIENTS + 1)]
    session = _session_returning(recipients)
    msg = " ".join(f"@[user{i}]" for i in range(notif_svc.MAX_MENTION_RECIPIENTS + 1))
    with pytest.raises(ApiError) as exc:
        await notif_svc.notify_mentions(session, msg, author, LINK, context_label=CTX)
    assert exc.value.code == "too_many_mentions"


@pytest.mark.asyncio
async def test_limit_boundary_exactly_max_ok():
    author = _user("a1", "alice", role=UserRole.sec_team)
    recipients = [_user(f"u{i}", f"user{i}") for i in range(notif_svc.MAX_MENTION_RECIPIENTS)]
    session = _session_returning(recipients)
    msg = " ".join(f"@[user{i}]" for i in range(notif_svc.MAX_MENTION_RECIPIENTS))
    result = await notif_svc.notify_mentions(session, msg, author, LINK, context_label=CTX)
    assert len(result.recipient_ids) == notif_svc.MAX_MENTION_RECIPIENTS


@pytest.mark.asyncio
async def test_edit_only_new_mentions_notified():
    author = _user("a1", "alice", role=UserRole.sec_team)
    bob = _user("b1", "bob")
    carol = _user("c1", "carol")
    session = _session_returning([bob, carol])
    result = await notif_svc.notify_mentions(
        session,
        "@[bob] @[carol]",
        author,
        LINK,
        context_label=CTX,
        previous_message="hello @[bob]",
    )
    assert result.recipient_ids == ("c1",)


@pytest.mark.asyncio
async def test_edit_case_only_change_notifies_nobody():
    author = _user("a1", "alice", role=UserRole.sec_team)
    bob = _user("b1", "bob")
    session = _session_returning([bob])
    result = await notif_svc.notify_mentions(
        session,
        "@[BOB]",
        author,
        LINK,
        context_label=CTX,
        previous_message="@[bob]",
    )
    assert result.recipient_ids == ()
    assert result.email_jobs == ()


@pytest.mark.asyncio
async def test_edit_remove_then_readd_triggers_again():
    author = _user("a1", "alice", role=UserRole.sec_team)
    bob = _user("b1", "bob")

    session = _session_returning([bob])
    result = await notif_svc.notify_mentions(
        session,
        "back again @[bob]",
        author,
        LINK,
        context_label=CTX,
        previous_message="removed, no mention here",
    )
    assert result.recipient_ids == ("b1",)


@pytest.mark.asyncio
async def test_invalid_address_gets_inapp_only():
    author = _user("a1", "alice", role=UserRole.sec_team)
    bob = _user("b1", "bob", email="not-a-valid-address")
    session = _session_returning([bob])
    result = await notif_svc.notify_mentions(session, "@[bob]", author, LINK, context_label=CTX)
    assert result.recipient_ids == ("b1",)
    assert result.email_jobs == ()


@pytest.mark.asyncio
async def test_risk_comment_excludes_mentioned_users():
    """Sec-team commenter mentioning the RA creator suppresses the general notice."""
    author = _user("sec1", "secadmin", role=UserRole.sec_team)
    session = _session_returning([])

    acceptance = MagicMock()
    acceptance.id = "ra1"
    acceptance.cve_id = "CVE-2024-0001"
    acceptance.created_by = "creator1"
    comment = MagicMock()

    await notif_svc.notify_risk_comment(session, acceptance, comment, author, exclude_user_ids={"creator1"})
    session.add.assert_not_called()


def test_mention_template_has_context_link_no_comment_text():
    tmpl = mail_svc._jinja_env.get_template("mention.html")
    html = tmpl.render(
        author_name="alice",
        context_label="CVE CVE-2024-0001",
        link="http://localhost:5173/vulnerabilities/CVE-2024-0001#comment-1",
    )
    assert "alice" in html
    assert "CVE CVE-2024-0001" in html
    assert "http://localhost:5173/vulnerabilities/CVE-2024-0001#comment-1" in html
    assert "comment_text" not in html


def test_mention_template_escapes_html():
    tmpl = mail_svc._jinja_env.get_template("mention.html")
    html = tmpl.render(
        author_name="<script>x</script>",
        context_label="CVE <b>1</b>",
        link="http://host/x#comment-1",
    )
    assert "<script>x</script>" not in html
    assert "&lt;script&gt;" in html


@pytest.mark.asyncio
async def test_send_mention_emails_isolates_failures(monkeypatch):
    attempted: list[str] = []

    async def fake_send_email(to, subject, html_body):
        attempted.append(to)
        if to == "boom@example.com":
            raise RuntimeError("smtp down")

    monkeypatch.setattr(mail_svc, "send_email", fake_send_email)

    jobs = (
        notif_svc.MentionEmailJob("ok1@example.com", "u1", "alice", CTX, "http://host/x#c1"),
        notif_svc.MentionEmailJob("boom@example.com", "u2", "alice", CTX, "http://host/x#c2"),
        notif_svc.MentionEmailJob("ok2@example.com", "u3", "alice", CTX, "http://host/x#c3"),
    )
    await mail_svc.send_mention_emails(jobs)
    assert attempted == ["ok1@example.com", "boom@example.com", "ok2@example.com"]


def _scalar_session(scalar_value) -> AsyncMock:
    session = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = scalar_value
    session.execute.return_value = result
    return session


@pytest.mark.asyncio
async def test_username_conflict_raises():
    session = _scalar_session("other-id")
    with pytest.raises(ApiError) as exc:
        await _assert_username_available(session, "alice", exclude_id="new-id")
    assert exc.value.code == "username_conflict"


@pytest.mark.asyncio
async def test_username_available_ok():
    session = _scalar_session(None)
    await _assert_username_available(session, "alice", exclude_id="new-id")


@pytest.mark.asyncio
async def test_username_index_race_rolls_back_and_returns_localized_conflict():
    session = AsyncMock()
    session.commit.side_effect = IntegrityError("insert", {}, Exception("uq_users_username_lower"))

    with pytest.raises(ApiError) as exc:
        await _commit_user_sync(session, "alice")

    assert exc.value.code == "username_conflict"
    session.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_unrelated_integrity_failure_rolls_back_and_propagates():
    session = AsyncMock()
    failure = IntegrityError("insert", {}, Exception("another_constraint"))
    session.commit.side_effect = failure

    with pytest.raises(IntegrityError) as exc:
        await _commit_user_sync(session, "alice")

    assert exc.value is failure
    session.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_mention_link_normalizes_trailing_base_url(monkeypatch):
    author = _user("a1", "alice")
    bob = _user("b1", "bob")
    session = _session_returning([bob])
    monkeypatch.setattr(notif_svc.settings, "app_base_url", "https://manager.example/")

    result = await notif_svc.notify_mentions(session, "@[bob]", author, LINK, context_label=CTX)

    assert result.email_jobs[0].link == f"https://manager.example{LINK}"


@pytest.mark.asyncio
async def test_existing_transactional_email_links_use_canonical_routes(monkeypatch):
    rendered_links: list[str] = []

    class Template:
        def render(self, **values):
            rendered_links.append(values["link"])
            return "html"

    monkeypatch.setattr(mail_svc._jinja_env, "get_template", lambda name: Template())
    monkeypatch.setattr(mail_svc, "send_email", AsyncMock())

    await mail_svc.send_risk_comment_email("to@example.com", "CVE-1", "ra-1", "alice", "text", "https://app/")
    await mail_svc.send_risk_status_email("to@example.com", "CVE-1", "ra-1", "approved", "alice", None, "https://app/")
    await mail_svc.send_escalation_email("to@example.com", "CVE-1", "ns", "cluster", 1, "https://app/")
    await mail_svc.send_escalation_warning_email("to@example.com", "CVE-1", "ns", "cluster", 1, 3, "https://app/")

    assert rendered_links == [
        "https://app/risk-acceptances/ra-1",
        "https://app/risk-acceptances/ra-1",
        "https://app/escalations",
        "https://app/escalations",
    ]


def _load_username_migration():
    path = Path(__file__).parents[1] / "alembic/versions/021_add_username_lower_unique_index.py"
    spec = importlib.util.spec_from_file_location("username_migration_021", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_username_migration_creates_index_for_clean_data(monkeypatch):
    migration = _load_username_migration()
    bind = MagicMock()
    bind.execute.return_value.fetchall.return_value = []
    create_index = MagicMock()
    monkeypatch.setattr(migration.op, "get_bind", lambda: bind)
    monkeypatch.setattr(migration.op, "create_index", create_index)

    migration.upgrade()

    create_index.assert_called_once()
    assert create_index.call_args.args[:2] == ("uq_users_username_lower", "users")
    assert create_index.call_args.kwargs["unique"] is True


def test_username_migration_rejects_existing_case_conflicts(monkeypatch):
    migration = _load_username_migration()
    bind = MagicMock()
    duplicate = MagicMock(uname="alice", n=2)
    bind.execute.return_value.fetchall.return_value = [duplicate]
    create_index = MagicMock()
    monkeypatch.setattr(migration.op, "get_bind", lambda: bind)
    monkeypatch.setattr(migration.op, "create_index", create_index)

    with pytest.raises(RuntimeError, match="alice"):
        migration.upgrade()

    create_index.assert_not_called()


def _mention_job() -> notif_svc.MentionEmailJob:
    return notif_svc.MentionEmailJob("bob@example.com", "b1", "alice", CTX, f"https://app{LINK}")


@pytest.mark.asyncio
async def test_cve_comment_route_schedules_returned_email_jobs(sec_team_client: httpx.AsyncClient):
    response = CveCommentResponse(
        id="00000000-0000-0000-0000-000000000001",
        cve_id="CVE-1",
        user_id="sec-user-1",
        username="secadmin",
        display_name="Sec Admin",
        message="@[bob]",
        created_at=datetime(2026, 1, 1),
        is_sec_team=True,
    )
    with (
        patch(
            "app.routers.cves.comment_service.add_cve_comment", AsyncMock(return_value=(response, (_mention_job(),)))
        ),
        patch("app.routers.cves.mail_svc.send_mention_emails", AsyncMock()) as send_emails,
    ):
        result = await sec_team_client.post("/api/cves/CVE-1/comments", json={"message": "@[bob]"})

    assert result.status_code == 201
    send_emails.assert_awaited_once_with((_mention_job(),))


@pytest.mark.asyncio
async def test_risk_comment_route_schedules_returned_email_jobs(
    sec_team_client: httpx.AsyncClient, mock_app_db: AsyncMock
):
    acceptance = MagicMock()
    acceptance.id = "00000000-0000-0000-0000-000000000002"
    mock_app_db.execute.return_value.scalar_one_or_none.return_value = acceptance
    response = CommentResponse(
        id="00000000-0000-0000-0000-000000000003",
        risk_acceptance_id=acceptance.id,
        user_id="sec-user-1",
        username="secadmin",
        display_name="Sec Admin",
        message="@[bob]",
        created_at=datetime(2026, 1, 1),
        is_sec_team=True,
    )
    with (
        patch(
            "app.routers.risk_acceptances.comment_service.add_risk_acceptance_comment",
            AsyncMock(return_value=(response, (_mention_job(),))),
        ),
        patch("app.routers.risk_acceptances.mail_svc.send_mention_emails", AsyncMock()) as send_emails,
    ):
        result = await sec_team_client.post(
            f"/api/risk-acceptances/{acceptance.id}/comments", json={"message": "@[bob]"}
        )

    assert result.status_code == 201
    send_emails.assert_awaited_once_with((_mention_job(),))


@pytest.mark.asyncio
async def test_escalation_comment_route_schedules_returned_email_jobs(sec_team_client: httpx.AsyncClient):
    response = CveCommentResponse(
        id="00000000-0000-0000-0000-000000000004",
        cve_id="CVE-1",
        user_id="sec-user-1",
        username="secadmin",
        display_name="Sec Admin",
        message="@[bob]",
        created_at=datetime(2026, 1, 1),
        is_sec_team=True,
    )
    with (
        patch(
            "app.routers.escalations.add_current_escalation_comment",
            AsyncMock(return_value=(response, (_mention_job(),))),
        ),
        patch("app.routers.escalations.mail_svc.send_mention_emails", AsyncMock()) as send_emails,
    ):
        result = await sec_team_client.post(
            "/api/escalations/00000000-0000-0000-0000-000000000005/comments",
            json={"message": "@[bob]"},
        )

    assert result.status_code == 201
    send_emails.assert_awaited_once_with((_mention_job(),))
