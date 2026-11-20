"""Large exports must not issue two StackRox detail queries per CVE."""

import asyncio
from contextlib import suppress
from threading import Event, get_ident
from unittest.mock import AsyncMock, Mock

import pytest

from app.schemas.cve import CveListItem
from app.services import cve_export_service as exports
from app.stackrox import queries as sx


def cve_item(index: int) -> CveListItem:
    return CveListItem(
        cve_id=f"CVE-2026-{index:05}",
        severity=3,
        cvss=7.5,
        epss_probability=0.01,
        impact_score=0,
        fixable=True,
        fixed_by="2.0",
        affected_images=1,
        affected_deployments=1,
        first_seen=None,
    )


@pytest.mark.parametrize("query", [sx.get_export_deployments, sx.get_export_components])
@pytest.mark.parametrize("ids, scope", [([], [("payments", "a")]), (["CVE-1"], []), ([], [])])
async def test_empty_export_query_never_reads_database(query, ids, scope):
    session = AsyncMock()
    assert await query(session, ids, scope) == {}
    session.execute.assert_not_awaited()


@pytest.mark.parametrize("kind", ["pdf", "excel"])
@pytest.mark.parametrize("count", [0, 1, 1000])
@pytest.mark.parametrize("ignore_thresholds", [False, True])
async def test_export_uses_constant_detail_queries(
    team_member_client, mock_sx_db, mock_app_db, monkeypatch, kind, count, ignore_thresholds
):
    items = [cve_item(i) for i in reversed(range(count))]
    fetch = AsyncMock(return_value=items)
    monkeypatch.setattr(exports, "fetch_filtered_cves", fetch)
    request_thread = get_ident()

    def render(*args, **kwargs):
        assert get_ident() != request_thread
        mock_sx_db.close.assert_awaited_once()
        mock_app_db.close.assert_awaited_once()
        return b"file"

    generator = Mock(side_effect=render)
    monkeypatch.setattr(exports, f"generate_cve_{kind}", generator)

    response = await team_member_client.get(
        f"/api/exports/{kind}",
        params={"ignore_thresholds": str(ignore_thresholds).lower(), "namespace": "payments", "cluster": "cluster-a"},
    )

    assert response.status_code == 200
    assert [row["cve_id"] for row in generator.call_args.args[0]] == [item.cve_id for item in items]
    assert mock_sx_db.execute.await_count == (2 if count else 0)
    assert fetch.await_args.kwargs["ignore_thresholds"] is ignore_thresholds
    for call in mock_sx_db.execute.await_args_list:
        assert call.args[1]["ns_0_ns"] == "payments"
        assert call.args[1]["ns_0_cl"] == "cluster-a"
        assert "ns_1_ns" not in call.args[1]


@pytest.mark.parametrize("failed_stage", ["selection", "details"])
async def test_loading_failure_closes_both_sessions(
    team_member_client, mock_sx_db, mock_app_db, monkeypatch, failed_stage
):
    fetch = AsyncMock(return_value=[cve_item(1)])
    if failed_stage == "selection":
        fetch.side_effect = RuntimeError("selection failed")
    else:
        mock_sx_db.execute.side_effect = RuntimeError("details failed")
    monkeypatch.setattr(exports, "fetch_filtered_cves", fetch)
    with pytest.raises(RuntimeError, match=f"{failed_stage} failed"):
        await team_member_client.get("/api/exports/pdf")
    mock_sx_db.close.assert_awaited_once()
    mock_app_db.close.assert_awaited_once()


@pytest.mark.parametrize("cancel_request", [False, True])
async def test_pdf_slot_survives_request_cancellation_and_keeps_app_responsive(
    app, team_member_client, monkeypatch, cancel_request
):
    monkeypatch.setattr(exports, "fetch_filtered_cves", AsyncMock(return_value=[]))
    loop = asyncio.get_running_loop()
    started = asyncio.Event()
    finished = asyncio.Event()
    release = Event()

    def slow_pdf(*args, **kwargs):
        loop.call_soon_threadsafe(started.set)
        assert release.wait(5), "test did not release renderer"
        return b"%PDF"

    original_render = app.state.export_renderer.render

    def observed_render(*args, **kwargs):
        try:
            return original_render(*args, **kwargs)
        finally:
            if release.is_set():
                loop.call_soon_threadsafe(finished.set)

    monkeypatch.setattr(app.state.export_renderer, "render", observed_render)
    monkeypatch.setattr(exports, "generate_cve_pdf", slow_pdf)
    monkeypatch.setattr(exports, "generate_cve_excel", lambda *a, **kw: b"excel")

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    first = asyncio.create_task(team_member_client.get("/api/exports/pdf"))
    try:
        await asyncio.wait_for(started.wait(), 2)
        if cancel_request:
            first.cancel()
            with suppress(asyncio.CancelledError):
                await first
        busy = await asyncio.wait_for(team_member_client.get("/api/exports/pdf", headers={"Accept-Language": "en"}), 2)
        assert busy.status_code == 503
        assert "already being generated" in busy.json()["detail"]
        assert (await asyncio.wait_for(team_member_client.get("/health"), 2)).status_code == 200
        assert (await asyncio.wait_for(team_member_client.get("/api/exports/excel"), 2)).status_code == 200
    finally:
        release.set()
        await asyncio.wait_for(finished.wait(), 2)
        if not cancel_request:
            assert (await first).status_code == 200
    assert (await team_member_client.get("/api/exports/pdf")).status_code == 200


async def test_pdf_failure_releases_slot(team_member_client, monkeypatch):
    monkeypatch.setattr(exports, "fetch_filtered_cves", AsyncMock(return_value=[]))
    monkeypatch.setattr(exports, "generate_cve_pdf", Mock(side_effect=ValueError("bad PDF")))
    with pytest.raises(ValueError, match="bad PDF"):
        await team_member_client.get("/api/exports/pdf")
    monkeypatch.setattr(exports, "generate_cve_pdf", lambda *a, **kw: b"%PDF")
    assert (await team_member_client.get("/api/exports/pdf")).status_code == 200
