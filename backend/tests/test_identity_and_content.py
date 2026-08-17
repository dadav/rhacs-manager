"""Identity (full_name/display_name), structured comment content, and mention
resolution-by-user-id. Uses lightweight fake sessions; no real DB required."""

import importlib.util
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, call, patch
from uuid import uuid4

import pytest

from app.auth.middleware import CurrentUser, _resolve_oidc_full_name, _sync_user_fields
from app.i18n import ApiError
from app.models.risk_acceptance import RiskAcceptanceComment
from app.models.user import User, UserRole
from app.notifications import service as notif_svc
from app.schemas.comment import MentionSegmentIn, TextSegmentIn
from app.services import comment_content as cc
from app.services import comment_service


def _user(uid: str, username: str, full_name: str | None = None, email: str | None = None) -> User:
    return User(
        id=uid,
        username=username,
        full_name=full_name,
        email=email or f"{username}@example.com",
        role=UserRole.team_member,
    )


def _session_returning(users: list[User]) -> AsyncMock:
    session = AsyncMock()
    result = MagicMock()
    result.scalars.return_value.all.return_value = users
    session.execute.return_value = result
    session.add = MagicMock()
    session.flush = AsyncMock()
    return session


# --- display_name --------------------------------------------------------------


def test_user_display_name_prefers_trimmed_full_name():
    assert _user("u1", "alice", full_name="  Alice Example  ").display_name == "Alice Example"


def test_user_display_name_falls_back_to_username():
    assert _user("u1", "alice", full_name=None).display_name == "alice"
    assert _user("u1", "alice", full_name="   ").display_name == "alice"


def test_current_user_display_name_fallback():
    cu = CurrentUser(id="u1", username="bob", email="b@x", role=UserRole.team_member, namespaces=[])
    assert cu.display_name == "bob"
    cu.full_name = "Bob Builder"
    assert cu.display_name == "Bob Builder"


# --- OIDC full-name resolution -------------------------------------------------


def test_resolve_oidc_full_name_priority():
    assert _resolve_oidc_full_name({"name": "Full Name", "given_name": "G", "family_name": "F"}) == "Full Name"
    assert _resolve_oidc_full_name({"given_name": "Ada", "family_name": "Lovelace"}) == "Ada Lovelace"
    assert _resolve_oidc_full_name({"given_name": "Ada"}) == "Ada"
    assert _resolve_oidc_full_name({"preferred_username": "ada"}) is None


# --- lazy full-name sync -------------------------------------------------------


def _sync_session() -> AsyncMock:
    session = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    return session


def _data(user: User, full_name: str | None) -> dict:
    return {"username": user.username, "full_name": full_name, "email": user.email, "role": user.role.value}


@pytest.mark.asyncio
async def test_sync_adopts_new_full_name():
    user = _user("u1", "alice", full_name=None)
    await _sync_user_fields(_sync_session(), user, _data(user, "Alice Example"))
    assert user.full_name == "Alice Example"


@pytest.mark.asyncio
async def test_sync_does_not_wipe_existing_full_name():
    user = _user("u1", "alice", full_name="Alice Example")
    await _sync_user_fields(_sync_session(), user, _data(user, None))
    assert user.full_name == "Alice Example"


@pytest.mark.asyncio
async def test_sync_updates_changed_full_name():
    user = _user("u1", "alice", full_name="Alice Example")
    await _sync_user_fields(_sync_session(), user, _data(user, "Alice Newname"))
    assert user.full_name == "Alice Newname"


# --- comment_content helpers ---------------------------------------------------


def test_parse_message_to_segments_known_and_unknown():
    name_to_user = {"alice": ("u-alice", "alice")}
    segs = cc.parse_message_to_segments("hi @[Alice] and @[ghost]", name_to_user)
    assert segs == [
        {"type": "text", "text": "hi "},
        {"type": "mention", "user_id": "u-alice", "username": "alice"},
        {"type": "text", "text": " and @[ghost]"},
    ]


def test_segments_to_message_roundtrip():
    segs = [
        {"type": "text", "text": "hi "},
        {"type": "mention", "user_id": "u-alice", "username": "alice"},
    ]
    assert cc.segments_to_message(segs) == "hi @[alice]"


def test_mention_user_ids_ordered_distinct():
    segs = [
        {"type": "mention", "user_id": "b", "username": "b"},
        {"type": "text", "text": "x"},
        {"type": "mention", "user_id": "a", "username": "a"},
        {"type": "mention", "user_id": "b", "username": "b"},
    ]
    assert cc.mention_user_ids(segs) == ["b", "a"]


def test_enrich_segments_uses_current_display_with_snapshot_fallback():
    segs = [{"type": "mention", "user_id": "u1", "username": "old_snapshot"}]
    enriched = cc.enrich_segments(segs, {"u1": "New Name"})
    assert enriched == [{"type": "mention", "user_id": "u1", "username": "old_snapshot", "display_name": "New Name"}]
    # Unknown id falls back to the stored snapshot.
    assert cc.enrich_segments(segs, {})[0]["display_name"] == "old_snapshot"


def test_segments_to_display_text_uses_full_names():
    segments = [
        {"type": "text", "text": "Hello "},
        {"type": "mention", "user_id": "u1", "username": "alice"},
    ]
    assert cc.segments_to_display_text(segments, {"u1": "Alice Example"}) == "Hello @Alice Example"


# --- notify_mention_users (id-based) -------------------------------------------


@pytest.mark.asyncio
async def test_notify_mention_users_self_dedup_and_cap():
    author = _user("a1", "alice", full_name="Alice Example")
    bob = _user("b1", "bob")
    session = _session_returning([])
    # author + duplicate bob collapse to one recipient.
    result = await notif_svc.notify_mention_users(session, [author, bob, bob], author, "/x", context_label="CVE X")
    assert result.recipient_ids == ("b1",)
    # author display_name is what the email carries.
    assert result.email_jobs[0].author_name == "Alice Example"


@pytest.mark.asyncio
async def test_notify_mention_users_cap():
    author = _user("a1", "alice")
    recipients = [_user(f"u{i}", f"user{i}") for i in range(notif_svc.MAX_MENTION_RECIPIENTS + 1)]
    session = _session_returning([])
    with pytest.raises(ApiError) as exc:
        await notif_svc.notify_mention_users(session, recipients, author, "/x", context_label="CVE X")
    assert exc.value.code == "too_many_mentions"


@pytest.mark.asyncio
async def test_notify_mention_users_edit_delta():
    author = _user("a1", "alice")
    bob = _user("b1", "bob")
    carol = _user("c1", "carol")
    session = _session_returning([])
    result = await notif_svc.notify_mention_users(
        session, [bob, carol], author, "/x", context_label="CVE X", previously_notified_ids={"b1"}
    )
    assert result.recipient_ids == ("c1",)


# --- comment_service._resolve_input -------------------------------------------


@pytest.mark.asyncio
async def test_resolve_input_structured_rejects_unknown_user():
    session = _session_returning([])  # id lookup returns nobody
    with pytest.raises(ApiError) as exc:
        await comment_service._resolve_input(
            session, message=None, content=[MentionSegmentIn(type="mention", user_id="ghost")]
        )
    assert exc.value.code == "unknown_mention_user"


@pytest.mark.asyncio
async def test_resolve_input_structured_duplicate_display_names_keep_ids():
    # Two distinct users with the SAME full name — disambiguated by user_id.
    j1 = _user("id1", "jsmith1", full_name="John Smith")
    j2 = _user("id2", "jsmith2", full_name="John Smith")
    session = _session_returning([j1, j2])
    prepared = await comment_service._resolve_input(
        session,
        message=None,
        content=[
            MentionSegmentIn(type="mention", user_id="id1"),
            TextSegmentIn(type="text", text=" and "),
            MentionSegmentIn(type="mention", user_id="id2"),
        ],
    )
    assert [s.get("user_id") for s in prepared.segments if s["type"] == "mention"] == ["id1", "id2"]
    # Username snapshot is the canonical DB username, not the display name.
    assert prepared.message == "@[jsmith1] and @[jsmith2]"
    assert {u.id for u in prepared.recipients} == {"id1", "id2"}
    assert prepared.display_by_id == {"id1": "John Smith", "id2": "John Smith"}


@pytest.mark.asyncio
async def test_resolve_input_structured_counts_mention_labels_in_length_limit():
    user = _user("id1", "u" * 255, full_name="Display Name")
    session = _session_returning([user])
    content = [MentionSegmentIn(type="mention", user_id=user.id) for _ in range(20)]
    content.extend(TextSegmentIn(type="text", text="x" * 4990) for _ in range(1))

    with pytest.raises(ApiError) as exc:
        await comment_service._resolve_input(session, message=None, content=content)

    assert exc.value.code == "comment_too_long"


@pytest.mark.asyncio
async def test_resolve_input_legacy_message_resolves_and_drops_unknown():
    alice = _user("u-alice", "alice")
    session = _session_returning([alice])
    prepared = await comment_service._resolve_input(session, message="hi @[alice] @[ghost]", content=None)
    assert prepared.message == "hi @[alice] @[ghost]"
    assert [s for s in prepared.segments if s["type"] == "mention"] == [
        {"type": "mention", "user_id": "u-alice", "username": "alice"}
    ]
    assert [u.id for u in prepared.recipients] == ["u-alice"]


@pytest.mark.asyncio
async def test_risk_comment_email_uses_display_text_for_mentions():
    mentioned = _user("u-mentioned", "alice", full_name="Alice Example")
    creator = _user("u-creator", "creator", full_name="Risk Owner")
    author = CurrentUser(
        id="u-author",
        username="secadmin",
        full_name="Security Admin",
        email="sec@example.com",
        role=UserRole.sec_team,
        namespaces=[],
    )
    acceptance = MagicMock()
    acceptance.id = uuid4()
    acceptance.cve_id = "CVE-2026-1"
    acceptance.creator = creator
    acceptance.created_by = creator.id

    session = _session_returning([mentioned])

    def assign_comment_defaults(obj):
        if isinstance(obj, RiskAcceptanceComment):
            obj.id = uuid4()
            obj.created_at = datetime(2026, 1, 1)

    session.add = MagicMock(side_effect=assign_comment_defaults)
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    mention_result = notif_svc.MentionResult(recipient_ids=(mentioned.id,), email_jobs=())

    with (
        patch.object(notif_svc, "notify_mention_users", AsyncMock(return_value=mention_result)),
        patch.object(notif_svc, "notify_risk_comment", AsyncMock()),
        patch.object(comment_service.mail_svc, "send_risk_comment_email", AsyncMock()) as send_email,
    ):
        await comment_service.add_risk_acceptance_comment(
            session,
            acceptance=acceptance,
            content=[MentionSegmentIn(type="mention", user_id=mentioned.id)],
            current_user=author,
        )

    assert send_email.await_args.args[-1] == "@Alice Example"


# --- migration 022 backfill helper --------------------------------------------


def _load_022():
    path = Path(__file__).parents[1] / "alembic/versions/022_full_name_and_comment_segments.py"
    spec = importlib.util.spec_from_file_location("migration_022", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_migration_backfill_builds_segments_and_keeps_unknown_as_text():
    m = _load_022()
    name_to_user = {"alice": ("u-alice", "alice")}
    segs = m._build_segments("hey @[Alice] @[nobody]", name_to_user)
    assert segs == [
        {"type": "text", "text": "hey "},
        {"type": "mention", "user_id": "u-alice", "username": "alice"},
        {"type": "text", "text": " @[nobody]"},
    ]


def test_migration_downgrade_restores_audit_username_keys(monkeypatch):
    migration = _load_022()
    bind = MagicMock()
    users_result = MagicMock()
    users_result.fetchall.return_value = [SimpleNamespace(id="u1", username="alice")]
    bind.execute.return_value = users_result
    restore = MagicMock()
    monkeypatch.setattr(migration.op, "get_bind", lambda: bind)
    monkeypatch.setattr(migration, "_restore_audit_detail_key", restore)
    monkeypatch.setattr(migration.op, "drop_column", MagicMock())

    migration.downgrade()

    assert restore.call_args_list == [
        call(bind, {"u1": "alice"}, "assigned_to_id", "assigned_to"),
        call(bind, {"u1": "alice"}, "triggered_by_id", "triggered_by"),
    ]
