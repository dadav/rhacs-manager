"""Scoped ACS activity feed: authorization, cursor, watermark (SQLite app DB)."""

import base64
import json
from collections.abc import AsyncGenerator
from datetime import UTC, datetime, timedelta

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.auth.middleware import CurrentUser
from app.deps import get_app_db, get_current_user
from app.i18n import ApiError
from app.models.activity import ActivityCollectorState, ActivityEvent, ActivitySnapshot
from app.services import activity_service as svc

from .conftest import _build_app, make_current_user

NOW = datetime(2026, 11, 25, 12, 0, 0, tzinfo=UTC)
NAIVE_NOW = NOW.replace(tzinfo=None)

PAY_A = ("payments", "cluster-a")
PAY_B = ("payments", "cluster-b")
BILL_A = ("billing", "cluster-a")
BILL_B = ("billing", "cluster-b")


@pytest.fixture
async def store() -> AsyncGenerator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        for model in (ActivityEvent, ActivitySnapshot, ActivityCollectorState):
            await connection.run_sync(model.__table__.create)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        session.add(
            ActivityCollectorState(
                id=1, snapshot_version=1, last_event_id=0, initialized_at=NAIVE_NOW, last_success_at=NAIVE_NOW
            )
        )
        await session.commit()
    yield factory
    await engine.dispose()


async def add_events(
    factory, pairs: list[tuple[str, str]], *, kind="deployment_removed", observed=NAIVE_NOW
) -> list[int]:
    """Insert one event per pair and advance the watermark like the collector."""
    async with factory() as session:
        rows = [
            ActivityEvent(
                kind=kind,
                observed_at=observed,
                cluster_name=cl,
                namespace=ns,
                details={"deployment_id": f"dep-{ns}-{cl}", "deployment_name": f"{ns}-api"},
            )
            for ns, cl in pairs
        ]
        session.add_all(rows)
        await session.flush()
        state = (await session.execute(select(ActivityCollectorState))).scalar_one()
        state.last_event_id = max(state.last_event_id, *(r.id for r in rows))
        await session.commit()
        return [r.id for r in rows]


async def set_watermark(factory, value: int) -> None:
    async with factory() as session:
        state = (await session.execute(select(ActivityCollectorState))).scalar_one()
        state.last_event_id = value
        await session.commit()


async def feed(factory, user: CurrentUser, *, cluster=None, namespace=None, cursor=None, limit=100, now=NOW):
    async with factory() as session:
        return await svc.read_activity_feed(
            session, user, cluster=cluster, namespace=namespace, cursor=cursor, limit=limit, now=now
        )


def pairs_of(result) -> list[tuple[str, str]]:
    return [(item.namespace, item.cluster_name) for item in result.items]


def user(namespaces, **kwargs) -> CurrentUser:
    return make_current_user(namespaces=namespaces, **kwargs)


ALL_PAIRS = [PAY_A, PAY_B, BILL_A, BILL_B]


# --- authorization ---------------------------------------------------------------


async def test_user_without_namespaces_sees_nothing(store):
    await add_events(store, ALL_PAIRS)
    result = await feed(store, user([]))
    assert result.items == []
    assert result.has_more is False


async def test_permitted_pair_only_and_same_namespace_on_other_cluster_hidden(store):
    await add_events(store, ALL_PAIRS)
    result = await feed(store, user([PAY_A]))
    assert pairs_of(result) == [PAY_A]
    assert all("cluster-b" not in item.model_dump_json() for item in result.items)


async def test_cross_product_permissions_are_never_combined(store):
    await add_events(store, ALL_PAIRS)
    result = await feed(store, user([PAY_A, BILL_B]))
    assert sorted(pairs_of(result)) == sorted([PAY_A, BILL_B])


async def test_namespace_only_cluster_only_and_both_filters(store):
    await add_events(store, ALL_PAIRS)
    member = user([PAY_A, PAY_B, BILL_A])
    assert sorted(pairs_of(await feed(store, member, namespace="payments"))) == sorted([PAY_A, PAY_B])
    assert sorted(pairs_of(await feed(store, member, cluster="cluster-a"))) == sorted([PAY_A, BILL_A])
    assert pairs_of(await feed(store, member, cluster="cluster-b", namespace="payments")) == [PAY_B]
    # Filters never widen: BILL_B is not granted.
    assert pairs_of(await feed(store, member, cluster="cluster-b", namespace="billing")) == []


@pytest.mark.parametrize(
    "privileged",
    [
        user([], has_all_namespaces=True),
        make_current_user(is_sec_team=True, namespaces=[]),
    ],
    ids=["wildcard", "sec-team"],
)
async def test_all_access_users_see_all_pairs_narrowed_by_filters(store, privileged):
    await add_events(store, ALL_PAIRS)
    assert sorted(pairs_of(await feed(store, privileged))) == sorted(ALL_PAIRS)
    assert sorted(pairs_of(await feed(store, privileged, cluster="cluster-b"))) == sorted([PAY_B, BILL_B])
    assert pairs_of(await feed(store, privileged, cluster="cluster-a", namespace="billing")) == [BILL_A]


async def test_wildcard_user_is_not_promoted_to_sec_team():
    wildcard = user([], has_all_namespaces=True)
    assert wildcard.can_see_all_namespaces and not wildcard.is_sec_team


async def test_removed_deployments_follow_current_pair_access(store):
    await add_events(store, [PAY_A], kind="deployment_removed")
    assert pairs_of(await feed(store, user([PAY_A]))) == [PAY_A]
    assert pairs_of(await feed(store, user([BILL_A]))) == []


# --- cursor and scope reset -------------------------------------------------------


async def test_revoked_or_expanded_access_with_existing_cursor_resets(store):
    await add_events(store, ALL_PAIRS)
    narrow = await feed(store, user([PAY_A]))
    widened = await feed(store, user([PAY_A, BILL_A]), cursor=narrow.next_cursor)
    assert widened.reset is True
    assert sorted(pairs_of(widened)) == sorted([PAY_A, BILL_A])
    assert widened.scope_key != narrow.scope_key

    revoked = await feed(store, user([BILL_A]), cursor=widened.next_cursor)
    assert revoked.reset is True
    assert pairs_of(revoked) == [BILL_A]


async def test_changed_cursor_never_grants_extra_permissions(store):
    await add_events(store, ALL_PAIRS)
    privileged = await feed(store, user([], has_all_namespaces=True))
    member = user([PAY_A])
    # Cursor from another identity: reset to the member's own tail.
    stolen = await feed(store, member, cursor=privileged.next_cursor)
    assert stolen.reset is True and pairs_of(stolen) == [PAY_A]

    # Forged cursor with the member's own scope key and after_id=0 still only reads PAY_A.
    own = await feed(store, member)
    forged = svc.encode_cursor(svc.ActivityCursor(after_id=0, scope_key=own.scope_key, issued_at=NOW))
    replay = await feed(store, member, cursor=forged)
    assert replay.reset is False and pairs_of(replay) == [PAY_A]


async def test_initial_tail_is_bounded_ascending_and_cursor_after_watermark(store):
    ids = await add_events(store, [PAY_A] * 150)
    result = await feed(store, user([PAY_A]))
    assert [int(item.id) for item in result.items] == ids[-100:]
    assert result.has_more is False and result.reset is False
    cursor = svc.decode_cursor(result.next_cursor, NOW)
    assert cursor.after_id == ids[-1]

    empty = await feed(store, user([PAY_A]), cursor=result.next_cursor)
    assert empty.items == [] and empty.has_more is False
    assert svc.decode_cursor(empty.next_cursor, NOW).after_id == ids[-1]


async def test_equal_timestamps_paginate_without_skips_or_duplicates(store):
    member = user([PAY_A])
    start = await feed(store, member)
    ids = await add_events(store, [PAY_A, BILL_B] * 125)
    seen: list[int] = []
    cursor = start.next_cursor
    pages = 0
    while True:
        page = await feed(store, member, cursor=cursor, limit=40)
        seen += [int(item.id) for item in page.items]
        cursor = page.next_cursor
        pages += 1
        if not page.has_more:
            break
    expected = [i for n, i in enumerate(ids) if n % 2 == 0]
    assert seen == expected
    assert pages == 4


async def test_events_above_watermark_are_excluded_until_committed(store):
    member = user([PAY_A])
    first = await add_events(store, [PAY_A])
    start = await feed(store, member)
    later = await add_events(store, [PAY_A, PAY_A])
    # Simulate rows inserted but the collector's watermark not yet committed.
    await set_watermark(store, first[-1])
    hidden = await feed(store, member, cursor=start.next_cursor)
    assert hidden.items == []
    await set_watermark(store, later[-1])
    shown = await feed(store, member, cursor=hidden.next_cursor)
    assert [int(item.id) for item in shown.items] == later


async def test_future_after_id_is_rejected(store):
    await add_events(store, [PAY_A])
    own = await feed(store, user([PAY_A]))
    future = svc.encode_cursor(svc.ActivityCursor(after_id=10_000, scope_key=own.scope_key, issued_at=NOW))
    with pytest.raises(ApiError) as excinfo:
        await feed(store, user([PAY_A]), cursor=future)
    assert excinfo.value.status_code == 400 and excinfo.value.code == "invalid_activity_cursor"


@pytest.mark.parametrize(
    "token",
    [
        "",
        "not base64 !!",
        "x" * 600,
        "eyJ2IjoyfQ",  # {"v":2}
        "eyJ2IjoxLCJhZnRlcl9pZCI6Ii0xIiwic2NvcGVfa2V5IjoiYSIsImlzc3VlZF9hdCI6IngifQ",
        "bnVsbA",  # null
    ],
)
async def test_malformed_cursor_is_rejected(store, token):
    with pytest.raises(ApiError) as excinfo:
        await feed(store, user([PAY_A]), cursor=token)
    assert excinfo.value.code == "invalid_activity_cursor"


@pytest.mark.parametrize(
    "overrides",
    [
        {"v": True},
        {"v": 1.0},
        {"issued_at": "0001-01-01T00:00:00+23:59"},
        {"issued_at": "2026-11-25"},
        {"issued_at": "2026-11-25T12:00:00"},
    ],
)
async def test_invalid_cursor_field_types_and_timestamps_are_rejected(store, overrides):
    payload = {"v": 1, "after_id": "0", "scope_key": "a" * 64, "issued_at": NOW.isoformat(), **overrides}
    token = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    with pytest.raises(ApiError) as excinfo:
        await feed(store, user([PAY_A]), cursor=token)
    assert excinfo.value.status_code == 400


async def test_cursor_with_non_base64_characters_is_rejected(store):
    token = svc.encode_cursor(svc.ActivityCursor(after_id=0, scope_key="a" * 64, issued_at=NOW))
    with pytest.raises(ApiError) as excinfo:
        await feed(store, user([PAY_A]), cursor="!" + token)
    assert excinfo.value.status_code == 400


async def test_expired_cursor_returns_fresh_tail(store):
    await add_events(store, [PAY_A])
    own = await feed(store, user([PAY_A]))
    old = svc.encode_cursor(
        svc.ActivityCursor(after_id=0, scope_key=own.scope_key, issued_at=NOW - timedelta(hours=25))
    )
    result = await feed(store, user([PAY_A]), cursor=old)
    assert result.reset is True and pairs_of(result) == [PAY_A]


async def test_cursor_round_trip_is_url_safe():
    token = svc.encode_cursor(svc.ActivityCursor(after_id=2**63 - 1, scope_key="f" * 64, issued_at=NOW))
    assert all(c.isalnum() or c in "-_" for c in token)
    assert svc.decode_cursor(token, NOW).after_id == 2**63 - 1


async def test_retention_is_enforced_on_read(store):
    await add_events(store, [PAY_A], observed=NAIVE_NOW - timedelta(hours=25))
    fresh = await add_events(store, [PAY_A])
    result = await feed(store, user([PAY_A]))
    assert [int(item.id) for item in result.items] == fresh


async def test_scope_key_is_deterministic_and_user_specific():
    a = svc.resolve_activity_scope(user([PAY_A, BILL_A]), None, None)
    b = svc.resolve_activity_scope(user([BILL_A, PAY_A, PAY_A]), None, "")
    other = svc.resolve_activity_scope(user([PAY_A, BILL_A], user_id="someone-else"), None, None)
    assert a.key == b.key
    assert a.key != other.key


# --- collector status ------------------------------------------------------------


async def test_collector_status_waiting_live_stale(store):
    member = user([PAY_A])
    assert (await feed(store, member, now=NOW + timedelta(seconds=30))).collector_status == "live"
    stale = await feed(store, member, now=NOW + timedelta(seconds=31))
    assert stale.collector_status == "stale"
    assert stale.last_success_at == NOW

    async with store() as session:
        state = (await session.execute(select(ActivityCollectorState))).scalar_one()
        state.initialized_at = None
        state.last_success_at = None
        await session.commit()
    waiting = await feed(store, member)
    assert waiting.collector_status == "waiting" and waiting.last_success_at is None


# --- route -----------------------------------------------------------------------


@pytest.fixture
def route_client(store):
    test_app = _build_app()

    async def _override_app_db():
        async with store() as session:
            yield session

    test_app.dependency_overrides[get_app_db] = _override_app_db

    def client_for(current: CurrentUser | None) -> httpx.AsyncClient:
        if current is None:

            def _unauthenticated():
                raise ApiError(401, "not_authenticated")

            test_app.dependency_overrides[get_current_user] = _unauthenticated
        else:
            test_app.dependency_overrides[get_current_user] = lambda: current
        return httpx.AsyncClient(transport=httpx.ASGITransport(app=test_app), base_url="http://test")

    return client_for


async def test_route_requires_authentication(route_client):
    async with route_client(None) as client:
        response = await client.get("/api/activity")
    assert response.status_code == 401


async def test_route_returns_scoped_typed_events(store, route_client):
    await add_events(store, ALL_PAIRS)
    async with store() as session:
        session.add(
            ActivityEvent(
                kind="image_scanned",
                observed_at=datetime.now(UTC).replace(tzinfo=None),
                source_at=datetime(2026, 11, 25, 11, 59, 0),
                cluster_name="cluster-a",
                namespace="payments",
                details={
                    "image_id_v2": "img-1",
                    "image_digest": "sha256:aaa",
                    "image_name": "registry/payments:1",
                    "component_count": 0,
                    "cve_count": 0,
                    "fixable_cve_count": 0,
                },
            )
        )
        await session.flush()
        state = (await session.execute(select(ActivityCollectorState))).scalar_one()
        state.last_event_id = 5
        state.last_success_at = datetime.now(UTC).replace(tzinfo=None)
        await session.commit()

    async with route_client(user([PAY_A])) as client:
        response = await client.get("/api/activity", params={"cluster": "cluster-a"})
    assert response.status_code == 200
    body = response.json()
    assert [item["namespace"] for item in body["items"]] == ["payments", "payments"]
    scan = body["items"][-1]
    assert scan["id"] == "5" and isinstance(scan["id"], str)
    assert scan["kind"] == "image_scanned"
    assert scan["source_at"] == "2026-11-25T11:59:00Z"
    assert scan["details"]["cve_count"] == 0
    assert body["collector_status"] == "live"
    assert body["last_success_at"].endswith("Z")
    assert "cluster-b" not in response.text and "billing" not in response.text


async def test_route_rejects_bad_cursor_and_limit(route_client):
    async with route_client(user([PAY_A])) as client:
        bad_cursor = await client.get("/api/activity", params={"cursor": "%%%"}, headers={"Accept-Language": "en"})
        bad_limit = await client.get("/api/activity", params={"limit": 500})
    assert bad_cursor.status_code == 400
    assert bad_cursor.json()["detail"] == "Invalid activity feed position. Please reload the activity feed."
    assert bad_limit.status_code == 422
