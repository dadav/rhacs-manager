"""Regression tests: user email sync behind oauth-proxy and the shared recipient filter.

OpenShift oauth-proxy only knows ``<user>@cluster.local``; auth-header-injector
replaces it with the Identity ``extra.email`` and omits the header when unknown.
The backend must never downgrade a stored real address on such a login, and
every user-addressed email must skip placeholder addresses.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.auth.middleware import _handle_spoke_proxy, _sync_user_fields
from app.mail import service as mail_svc
from app.models.user import User, UserRole
from app.notifications import service as notif_svc

LINK = "/vulnerabilities/CVE-2024-0001#comment-1"
CTX = "CVE CVE-2024-0001"


class _UserStore:
    """Fake AsyncSession holding at most one users row (enough for spoke sync)."""

    def __init__(self) -> None:
        self.user: User | None = None
        self.session = AsyncMock()
        self.session.execute = AsyncMock(side_effect=self._execute)
        self.session.add = MagicMock(side_effect=self._add)
        self.session.commit = AsyncMock()
        self.session.refresh = AsyncMock()

    async def _execute(self, _stmt):
        result = MagicMock()
        result.scalar_one_or_none.return_value = self.user
        return result

    def _add(self, obj) -> None:
        if isinstance(obj, User):
            self.user = obj


def _spoke_request(email: str | None) -> MagicMock:
    headers = {"X-Forwarded-User": "alice", "X-Forwarded-Namespaces": "payments:cluster-a"}
    if email is not None:
        headers["X-Forwarded-Email"] = email
    request = MagicMock()
    request.headers = headers
    return request


def _mention_session(users: list[User]) -> AsyncMock:
    session = AsyncMock()
    result = MagicMock()
    result.scalars.return_value.all.return_value = users
    session.execute.return_value = result
    session.add = MagicMock()
    return session


async def _mention_jobs_for(recipient: User) -> tuple[notif_svc.MentionEmailJob, ...]:
    author = User(id="author", username="secadmin", email="sec@example.com", role=UserRole.sec_team)
    result = await notif_svc.notify_mentions(
        _mention_session([recipient]), f"@[{recipient.username}]", author, LINK, context_label=CTX
    )
    return result.email_jobs


@pytest.mark.asyncio
async def test_failed_email_refresh_keeps_address_and_mentions_still_email():
    store = _UserStore()

    # 1. Successful resolution stores the real address.
    await _handle_spoke_proxy(store.session, _spoke_request("alice@example.com"))
    assert store.user.email == "alice@example.com"

    # 2. A login during an identity lookup failure carries no header.
    await _handle_spoke_proxy(store.session, _spoke_request(None))
    assert store.user.email == "alice@example.com"

    # 3. A mention during that window still produces the email job.
    jobs = await _mention_jobs_for(store.user)
    assert [job.to_email for job in jobs] == ["alice@example.com"]

    # 4. Recovery with a changed address updates it.
    await _handle_spoke_proxy(store.session, _spoke_request("alice.new@example.com"))
    assert store.user.email == "alice.new@example.com"


@pytest.mark.asyncio
async def test_new_spoke_user_without_email_gets_placeholder_and_inapp_only():
    store = _UserStore()
    await _handle_spoke_proxy(store.session, _spoke_request(None))
    assert store.user.email == "alice@spoke.local"
    assert await _mention_jobs_for(store.user) == ()


@pytest.mark.asyncio
async def test_sync_never_wipes_email():
    user = User(id="u1", username="alice", email="alice@example.com", role=UserRole.team_member)
    session = AsyncMock()
    for empty in (None, "", "   "):
        data = {"username": "alice", "full_name": None, "email": empty, "role": "team_member"}
        await _sync_user_fields(session, user, data)
        assert user.email == "alice@example.com"


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("alice@example.com", "alice@example.com"),
        ("alice@cluster.local", None),
        ("alice@spoke.local", None),
        ("", None),
        (None, None),
        ("not-an-address", None),
    ],
)
def test_deliverable_address(raw, expected):
    assert mail_svc.deliverable_address(raw, user_id="u1", purpose="test") == expected
