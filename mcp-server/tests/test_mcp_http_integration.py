"""End-to-end tests over real streamable HTTP.

Runs the production MCP app (``HTTP_TRANSPORT_OPTIONS``) under uvicorn and talks to it
with the mcp v2 ``Client`` in both protocol eras: ``legacy`` (initialize handshake,
2025-era) and ``2026-07-28`` (modern, sessionless). The backend is an
``httpx.MockTransport`` that records every outgoing request, so the tests assert the
exact identity headers the sidecar forwards on the wire.

This is the only check that proves header forwarding: the local dev backend runs with
DEV_MODE=true and ignores forwarded headers entirely.
"""

import asyncio
import importlib
import json
import socket
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from unittest.mock import patch

import httpx
import httpx2
import pytest
import uvicorn
from mcp.client import Client
from mcp.client.streamable_http import streamable_http_client

PROTOCOL_MODES = ["legacy", "2026-07-28"]

API_KEY = "test-api-key"

ALICE_HEADERS = {
    "X-Forwarded-User": "alice",
    "X-Forwarded-Full-Name": "Alice Team",
    "X-Forwarded-Groups": "payments-devs",
    "X-Forwarded-Namespaces": "payments:cluster-a",
    "X-Forwarded-Namespace-Emails": "payments:cluster-a=payments@example.com",
}

BOB_HEADERS = {
    "X-Forwarded-User": "bob",
    "X-Forwarded-Full-Name": "Bob Security",
    "X-Forwarded-Groups": "sec-team,admins",
    "X-Forwarded-Namespaces": "*",
    "X-Forwarded-Namespace-Emails": "",
}

FORWARDED_HEADER_NAMES = list(ALICE_HEADERS)


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def _backend_handler(recorded: list[httpx.Request]):
    """Fake rhacs-manager backend: echoes the caller on /auth/me, rejects risk acceptances."""

    def handler(request: httpx.Request) -> httpx.Response:
        recorded.append(request)
        if request.url.path == "/api/auth/me":
            return httpx.Response(200, json={"username": request.headers.get("x-forwarded-user")})
        if request.url.path == "/api/risk-acceptances" and request.method == "POST":
            return httpx.Response(403, json={"detail": "forbidden detail"})
        return httpx.Response(404, json={"detail": f"unexpected path {request.url.path}"})

    return handler


@pytest.fixture
async def live_server() -> AsyncIterator[tuple[str, list[httpx.Request]]]:
    """Start the read-write MCP app on a free port; yield (base URL, recorded backend requests)."""
    with patch.dict("os.environ", {"MCP_READONLY": "false"}, clear=False):
        import mcp_server.api_client
        import mcp_server.config
        import mcp_server.server

        importlib.reload(mcp_server.config)
        importlib.reload(mcp_server.server)

        recorded: list[httpx.Request] = []
        mcp_server.server.client._client = httpx.AsyncClient(
            base_url="http://backend.test",
            transport=httpx.MockTransport(_backend_handler(recorded)),
        )
        app = mcp_server.server.mcp.streamable_http_app(**mcp_server.server.HTTP_TRANSPORT_OPTIONS)

        port = _free_port()
        server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=port, lifespan="on", log_level="warning"))
        task = asyncio.create_task(server.serve())
        try:
            while not server.started:
                if task.done():
                    task.result()
                await asyncio.sleep(0.01)
            with patch.object(mcp_server.api_client.settings, "api_key", API_KEY):
                yield f"http://127.0.0.1:{port}", recorded
        finally:
            server.should_exit = True
            await task
            await mcp_server.server.client.aclose()


@asynccontextmanager
async def _connect(base_url: str, headers: dict[str, str], mode: str) -> AsyncIterator[Client]:
    async with httpx2.AsyncClient(headers=headers, timeout=httpx2.Timeout(30, read=300)) as http_client:
        transport = streamable_http_client(f"{base_url}/mcp", http_client=http_client)
        async with Client(transport, mode=mode) as client:
            if mode == "legacy":
                assert client.protocol_version < "2026-07-28", client.protocol_version
            else:
                assert client.protocol_version == mode, client.protocol_version
            yield client


async def _call_as(base_url: str, headers: dict[str, str], mode: str, tool: str, arguments: dict):
    async with _connect(base_url, headers, mode) as client:
        return await client.call_tool(tool, arguments)


def _text(result) -> str:
    return "".join(block.text for block in result.content if getattr(block, "type", None) == "text")


@pytest.mark.parametrize("mode", PROTOCOL_MODES)
async def test_two_callers_forward_their_own_identity(live_server, mode):
    base_url, recorded = live_server

    alice_result, bob_result = await asyncio.gather(
        _call_as(base_url, ALICE_HEADERS, mode, "get_my_info", {}),
        _call_as(base_url, BOB_HEADERS, mode, "get_my_info", {}),
    )

    assert not alice_result.is_error, _text(alice_result)
    assert not bob_result.is_error, _text(bob_result)
    assert json.loads(_text(alice_result)) == {"username": "alice"}
    assert json.loads(_text(bob_result)) == {"username": "bob"}

    by_user = {request.headers["x-forwarded-user"]: request for request in recorded}
    assert set(by_user) == {"alice", "bob"}
    for caller_headers in (ALICE_HEADERS, BOB_HEADERS):
        request = by_user[caller_headers["X-Forwarded-User"]]
        assert request.url.path == "/api/auth/me"
        for name in FORWARDED_HEADER_NAMES:
            assert request.headers[name] == caller_headers[name], name
        assert request.headers["x-api-key"] == API_KEY


@pytest.mark.parametrize("mode", PROTOCOL_MODES)
async def test_missing_identity_is_visible_error(live_server, mode):
    base_url, recorded = live_server
    headers = {name: value for name, value in ALICE_HEADERS.items() if name != "X-Forwarded-User"}

    result = await _call_as(base_url, headers, mode, "get_my_info", {})

    assert result.is_error
    assert "No X-Forwarded-User header" in _text(result)
    assert recorded == []


@pytest.mark.parametrize("mode", PROTOCOL_MODES)
async def test_backend_error_text_reaches_client(live_server, mode):
    base_url, _recorded = live_server

    result = await _call_as(
        base_url,
        ALICE_HEADERS,
        mode,
        "create_risk_acceptance",
        {
            "cve_id": "CVE-2024-1234",
            "justification": "compensating controls in place",
            "scope_targets": [{"cluster_name": "cluster-a", "namespace": "payments"}],
        },
    )

    assert result.is_error
    text = _text(result)
    assert "forbidden detail" in text
    assert "403" in text


async def test_external_host_header_accepted_and_stateless(live_server):
    """host=0.0.0.0 keeps the DNS-rebinding guard off (no 421 on the pod's real Host),
    and stateless_http means no Mcp-Session-Id is issued to legacy clients."""
    base_url, _recorded = live_server
    initialize = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-06-18",
            "capabilities": {},
            "clientInfo": {"name": "test", "version": "0"},
        },
    }
    async with httpx2.AsyncClient() as http:
        response = await http.post(
            f"{base_url}/mcp",
            json=initialize,
            headers={
                "Host": "rhacs-manager.apps.example.com",
                "Accept": "application/json, text/event-stream",
                **ALICE_HEADERS,
            },
        )

    assert response.status_code == 200, response.text
    assert "mcp-session-id" not in response.headers
    assert '"serverInfo"' in response.text
    assert '"rhacs-manager"' in response.text
