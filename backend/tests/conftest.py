"""Shared fixtures for route-level tests.

Overrides FastAPI dependencies so no real database connections are needed.
Uses httpx.AsyncClient with ASGITransport for async endpoint testing.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from fastapi import FastAPI

from app.auth.middleware import CurrentUser
from app.deps import get_app_db, get_current_user, get_stackrox_db
from app.models.user import UserRole


def _build_app() -> FastAPI:
    """Build a minimal FastAPI app with the same routers but no lifespan side-effects."""
    from app.routers import (
        audit,
        auth,
        badges,
        cves,
        dashboard,
        escalations,
        exports,
        namespaces,
        notifications,
        priorities,
        remediations,
        risk_acceptances,
        settings,
        suppression_rules,
    )

    @asynccontextmanager
    async def _noop_lifespan(app: FastAPI):
        yield

    test_app = FastAPI(lifespan=_noop_lifespan)
    for router_module in [
        auth,
        dashboard,
        cves,
        namespaces,
        risk_acceptances,
        priorities,
        escalations,
        remediations,
        notifications,
        badges,
        settings,
        audit,
        exports,
        suppression_rules,
    ]:
        test_app.include_router(router_module.router, prefix="/api")

    return test_app


def _make_mock_session() -> AsyncMock:
    """Create a mock AsyncSession that supports common SQLAlchemy patterns."""
    session = AsyncMock()
    # Default: execute returns an empty result set
    result_mock = MagicMock()
    result_mock.scalars.return_value.all.return_value = []
    result_mock.scalars.return_value.first.return_value = None
    result_mock.scalar_one_or_none.return_value = None
    result_mock.scalar.return_value = 0
    result_mock.__iter__ = lambda self: iter([])
    session.execute.return_value = result_mock
    return session


def make_current_user(
    *,
    is_sec_team: bool = False,
    namespaces: list[tuple[str, str]] | None = None,
    has_all_namespaces: bool = False,
    user_id: str = "test-user-1",
    username: str = "testuser",
    email: str = "test@example.com",
) -> CurrentUser:
    """Factory for creating test CurrentUser instances."""
    role = UserRole.sec_team if is_sec_team else UserRole.team_member
    return CurrentUser(
        id=user_id,
        username=username,
        email=email,
        role=role,
        namespaces=[("default", "cluster-a")] if namespaces is None else namespaces,
        onboarding_completed=True,
        has_all_namespaces=has_all_namespaces,
    )


@pytest.fixture
def mock_app_db() -> AsyncMock:
    return _make_mock_session()


@pytest.fixture
def mock_sx_db() -> AsyncMock:
    return _make_mock_session()


@pytest.fixture
def app(mock_app_db: AsyncMock, mock_sx_db: AsyncMock) -> FastAPI:
    """FastAPI app with dependency overrides for both DB sessions."""
    test_app = _build_app()

    async def _override_app_db() -> AsyncGenerator:
        yield mock_app_db

    async def _override_sx_db() -> AsyncGenerator:
        yield mock_sx_db

    test_app.dependency_overrides[get_app_db] = _override_app_db
    test_app.dependency_overrides[get_stackrox_db] = _override_sx_db
    return test_app


@pytest.fixture
def sec_team_user() -> CurrentUser:
    return make_current_user(
        is_sec_team=True,
        has_all_namespaces=True,
        user_id="sec-user-1",
        username="secadmin",
    )


@pytest.fixture
def team_member_user() -> CurrentUser:
    return make_current_user(
        is_sec_team=False,
        namespaces=[("payments", "cluster-a"), ("frontend", "cluster-b")],
    )


@pytest.fixture
def sec_team_client(app: FastAPI, sec_team_user: CurrentUser) -> httpx.AsyncClient:
    app.dependency_overrides[get_current_user] = lambda: sec_team_user
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    )


@pytest.fixture
def team_member_client(app: FastAPI, team_member_user: CurrentUser) -> httpx.AsyncClient:
    app.dependency_overrides[get_current_user] = lambda: team_member_user
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    )
