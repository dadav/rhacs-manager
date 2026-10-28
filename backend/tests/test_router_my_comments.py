"""Behavioral tests for GET /api/comments/mine (personal comment-thread overview).

Runs the real ranking SQL on in-memory SQLite (window functions and row-value
comparisons are supported). The StackRox detail probe is monkeypatched.
"""

from collections.abc import AsyncGenerator
from datetime import datetime, timedelta
from uuid import UUID, uuid4

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.auth.middleware import CurrentUser
from app.database import Base
from app.deps import get_app_db, get_current_user
from app.models.cve_comment import CveComment
from app.models.escalation import Escalation
from app.models.risk_acceptance import RiskAcceptance, RiskAcceptanceComment, RiskStatus
from app.models.user import User, UserRole
from app.stackrox import queries as sx

from .conftest import make_current_user

T0 = datetime(2026, 10, 1, 12, 0, 0)
ME = "me"
ALICE = "alice"
BOB = "bob"
SEC = "sec"


@pytest.fixture
async def store() -> AsyncGenerator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    tables = [
        User.__table__,
        Escalation.__table__,
        CveComment.__table__,
        RiskAcceptance.__table__,
        RiskAcceptanceComment.__table__,
    ]
    async with engine.begin() as conn:
        await conn.run_sync(lambda c: Base.metadata.create_all(c, tables=tables))
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        for uid, full_name, role in [
            (ME, "Me Myself", UserRole.team_member),
            (ALICE, "Alice Doe", UserRole.team_member),
            (BOB, None, UserRole.team_member),
            (SEC, "Sec Person", UserRole.sec_team),
        ]:
            session.add(
                User(id=uid, username=uid, full_name=full_name, email=f"{uid}@example.com", role=role, created_at=T0)
            )
        await session.commit()
    yield factory
    await engine.dispose()


@pytest.fixture
def visible_cves(monkeypatch) -> dict:
    """Controls which CVEs the detail probe reports as visible; records calls."""
    state: dict = {"visible": None, "calls": []}

    async def _probe(session, cve_ids, namespaces):
        state["calls"].append((sorted(cve_ids), namespaces))
        if state["visible"] is None:
            return set(cve_ids)
        return set(cve_ids) & state["visible"]

    monkeypatch.setattr(sx, "cves_visible_in_namespaces", _probe)
    return state


def _client(app: FastAPI, store, user: CurrentUser) -> httpx.AsyncClient:
    async def _override_app_db() -> AsyncGenerator[AsyncSession]:
        async with store() as session:
            yield session

    app.dependency_overrides[get_app_db] = _override_app_db
    app.dependency_overrides[get_current_user] = lambda: user
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


def _me(**kwargs) -> CurrentUser:
    kwargs.setdefault("namespaces", [("payments", "cluster-a")])
    return make_current_user(user_id=ME, username=ME, **kwargs)


async def _cve_comment(
    store, cve_id: str, user_id: str, at: datetime, message: str = "msg", *, escalation_id=None, comment_id=None
) -> UUID:
    cid = comment_id or uuid4()
    async with store() as session:
        session.add(
            CveComment(
                id=cid, cve_id=cve_id, user_id=user_id, message=message, created_at=at, escalation_id=escalation_id
            )
        )
        await session.commit()
    return cid


async def _ra(store, *, created_by: str, namespace: str = "payments", cve_id: str = "CVE-RA") -> UUID:
    ra_id = uuid4()
    async with store() as session:
        session.add(
            RiskAcceptance(
                id=ra_id,
                cve_id=cve_id,
                status=RiskStatus.requested,
                justification="j",
                scope={"mode": "namespace", "targets": [{"cluster_name": "cluster-a", "namespace": namespace}]},
                scope_key=uuid4().hex,
                created_by=created_by,
                created_at=T0,
            )
        )
        await session.commit()
    return ra_id


async def _ra_comment(store, ra_id: UUID, user_id: str, at: datetime, message: str = "msg") -> UUID:
    cid = uuid4()
    async with store() as session:
        session.add(
            RiskAcceptanceComment(id=cid, risk_acceptance_id=ra_id, user_id=user_id, message=message, created_at=at)
        )
        await session.commit()
    return cid


async def _get(client: httpx.AsyncClient, **params) -> dict:
    resp = await client.get("/api/comments/mine", params=params)
    assert resp.status_code == 200, resp.text
    return resp.json()


async def test_only_own_threads_collapsed_per_cve(app, store, visible_cves):
    await _cve_comment(store, "CVE-1", ME, T0, "first")
    await _cve_comment(store, "CVE-1", ME, T0 + timedelta(minutes=5), "second")
    await _cve_comment(store, "CVE-2", ALICE, T0, "not mine")

    async with _client(app, store, _me()) as client:
        body = await _get(client)

    assert body["total"] == 1
    [row] = body["items"]
    assert row["cve_id"] == "CVE-1"
    assert row["kind"] == "cve"
    assert row["my_comment_count"] == 2
    assert row["my_last_message"] == "second"
    assert row["thread_available"] is True
    assert row["detail_available"] is True
    assert row["detail_link"] == "/vulnerabilities/CVE-1"


async def test_latest_row_fields_come_from_one_row(app, store, visible_cves):
    async with store() as session:
        esc = Escalation(id=uuid4(), cve_id="CVE-1", cluster_name="cluster-a", namespace="payments", level=2)
        session.add(esc)
        await session.commit()
    sec = make_current_user(user_id=SEC, username=SEC, is_sec_team=True, has_all_namespaces=True)

    # Older own comment carries the escalation; newer one does not.
    await _cve_comment(store, "CVE-1", SEC, T0, "older escalated", escalation_id=esc.id)
    newest = await _cve_comment(store, "CVE-1", SEC, T0 + timedelta(minutes=1), "newer plain")
    await _cve_comment(store, "CVE-1", ALICE, T0 + timedelta(minutes=2), "reply a")
    await _cve_comment(store, "CVE-1", BOB, T0 + timedelta(minutes=3), "reply b")

    async with _client(app, store, sec) as client:
        [row] = (await _get(client))["items"]

    assert row["my_last_comment_id"] == str(newest)
    assert row["my_last_message"] == "newer plain"
    assert row["kind"] == "cve"
    assert row["escalation_context"] is None
    assert row["replies_since"] == 2
    assert row["last_reply_by_name"] == "bob"  # no full_name: username fallback
    assert row["last_reply_at"].startswith("2026-10-01T12:03")

    # Now the newest own comment is the escalated one: kind and context follow it.
    await _cve_comment(store, "CVE-1", SEC, T0 + timedelta(minutes=4), "newest escalated", escalation_id=esc.id)
    async with _client(app, store, sec) as client:
        [row] = (await _get(client))["items"]
    assert row["kind"] == "escalation"
    assert row["escalation_context"] == {"cluster_name": "cluster-a", "namespace": "payments", "level": 2}
    assert row["my_last_message"] == "newest escalated"
    assert row["replies_since"] == 0
    assert row["last_reply_by_name"] is None


async def test_equal_timestamps_select_deterministically(app, store, visible_cves):
    ids = sorted([uuid4() for _ in range(3)], key=lambda u: u.hex)
    for i, cid in enumerate(ids):
        await _cve_comment(store, "CVE-1", ME, T0, f"own-{i}", comment_id=cid)
    reply_ids = sorted([uuid4(), uuid4()], key=lambda u: u.hex)
    await _cve_comment(store, "CVE-1", ALICE, T0 + timedelta(minutes=1), "alice", comment_id=reply_ids[0])
    await _cve_comment(store, "CVE-1", BOB, T0 + timedelta(minutes=1), "bob", comment_id=reply_ids[1])

    async with _client(app, store, _me()) as client:
        first = await _get(client)
        second = await _get(client)

    assert first == second
    assert first["total"] == 1
    [row] = first["items"]
    assert row["my_last_comment_id"] == str(ids[-1])
    assert row["my_last_message"] == "own-2"
    assert row["my_comment_count"] == 3
    assert row["replies_since"] == 2
    assert row["last_reply_by_name"] == "bob"


async def test_own_newer_comment_resets_replies(app, store, visible_cves):
    await _cve_comment(store, "CVE-1", ME, T0)
    await _cve_comment(store, "CVE-1", ALICE, T0 - timedelta(minutes=1))  # before mine: not a reply
    await _cve_comment(store, "CVE-1", ALICE, T0 + timedelta(minutes=1))

    async with _client(app, store, _me()) as client:
        [row] = (await _get(client))["items"]
        assert row["replies_since"] == 1
        assert row["last_reply_by_name"] == "Alice Doe"

        await _cve_comment(store, "CVE-1", ME, T0 + timedelta(minutes=2))
        [row] = (await _get(client))["items"]
        assert row["replies_since"] == 0
        assert row["last_reply_at"] is None


async def test_cve_detail_unavailable_keeps_thread_and_replies(app, store, visible_cves):
    visible_cves["visible"] = set()
    await _cve_comment(store, "CVE-GONE", ME, T0)
    await _cve_comment(store, "CVE-GONE", ALICE, T0 + timedelta(minutes=1))

    async with _client(app, store, _me()) as client:
        [row] = (await _get(client))["items"]

    assert row["thread_available"] is True
    assert row["detail_available"] is False
    assert row["detail_link"] is None
    assert row["replies_since"] == 1
    assert visible_cves["calls"] == [(["CVE-GONE"], [("payments", "cluster-a")])]


async def test_all_namespace_user_probes_without_namespace_filter(app, store, visible_cves):
    await _cve_comment(store, "CVE-1", ME, T0)
    async with _client(app, store, _me(has_all_namespaces=True)) as client:
        await _get(client)
    assert visible_cves["calls"] == [(["CVE-1"], None)]


async def test_inaccessible_ra_hides_reply_activity(app, store, visible_cves):
    ra_id = await _ra(store, created_by=ALICE, namespace="other-team")
    await _ra_comment(store, ra_id, ME, T0, "my ra comment")
    await _ra_comment(store, ra_id, ALICE, T0 + timedelta(minutes=1))

    async with _client(app, store, _me()) as client:
        [row] = (await _get(client))["items"]

    assert row["kind"] == "risk_acceptance"
    assert row["risk_acceptance_id"] == str(ra_id)
    assert row["my_last_message"] == "my ra comment"
    assert row["thread_available"] is False
    assert row["detail_available"] is False
    assert row["detail_link"] is None
    assert row["replies_since"] == 0
    assert row["last_reply_at"] is None
    assert row["last_reply_by_name"] is None


async def test_accessible_ra_reports_replies(app, store, visible_cves):
    ra_id = await _ra(store, created_by=ALICE, namespace="payments")
    await _ra_comment(store, ra_id, ME, T0)
    await _ra_comment(store, ra_id, ALICE, T0 + timedelta(minutes=1))

    async with _client(app, store, _me()) as client:
        [row] = (await _get(client))["items"]

    assert row["thread_available"] is True
    assert row["detail_link"] == f"/risk-acceptances/{ra_id}"
    assert row["cve_id"] == "CVE-RA"
    assert row["replies_since"] == 1
    assert row["last_reply_by_name"] == "Alice Doe"


async def test_escalation_context_hidden_for_regular_user(app, store, visible_cves):
    async with store() as session:
        esc = Escalation(id=uuid4(), cve_id="CVE-1", cluster_name="cluster-a", namespace="payments", level=1)
        session.add(esc)
        await session.commit()
    # A former sec-team comment by a user who is now a regular member.
    await _cve_comment(store, "CVE-1", ME, T0, escalation_id=esc.id)

    async with _client(app, store, _me()) as client:
        [row] = (await _get(client))["items"]

    assert row["kind"] == "cve"
    assert row["escalation_context"] is None


async def test_filters_sort_and_pagination(app, store, visible_cves):
    await _cve_comment(store, "CVE-OLD", ME, T0)
    await _cve_comment(store, "CVE-REPLIED", ME, T0 + timedelta(minutes=1))
    await _cve_comment(store, "CVE-REPLIED", ALICE, T0 + timedelta(hours=1))
    await _cve_comment(store, "CVE-NEW", ME, T0 + timedelta(minutes=30))
    ra_id = await _ra(store, created_by=ME)
    await _ra_comment(store, ra_id, ME, T0 + timedelta(minutes=10))

    async with _client(app, store, _me()) as client:
        body = await _get(client)
        assert [r["cve_id"] for r in body["items"]] == ["CVE-REPLIED", "CVE-NEW", "CVE-RA", "CVE-OLD"]

        replied = await _get(client, only_with_replies="true")
        assert [r["cve_id"] for r in replied["items"]] == ["CVE-REPLIED"]

        ras = await _get(client, kind="risk_acceptance")
        assert [r["kind"] for r in ras["items"]] == ["risk_acceptance"]

        page2 = await _get(client, page=2, page_size=3)
        assert page2["total"] == 4
        assert [r["cve_id"] for r in page2["items"]] == ["CVE-OLD"]

        resp = await client.get("/api/comments/mine", params={"kind": "bogus"})
        assert resp.status_code == 422


async def test_empty_for_user_without_comments(app, store, visible_cves):
    async with _client(app, store, _me()) as client:
        body = await _get(client)
    assert body == {"items": [], "total": 0, "page": 1, "page_size": 25}
