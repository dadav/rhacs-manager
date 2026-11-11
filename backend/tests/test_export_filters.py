"""Exports accept the same filters as GET /cves, so the file matches the filtered list."""

from unittest.mock import AsyncMock

import pytest

from app.routers import exports

LIST_ONLY_FILTERS = {
    "remediation_status": "in_progress",
    "show_remediated": "true",
    "age_min": "5",
    "age_max": "90",
    "deployment": "checkout",
    "deployment_id": "dep-1",
    "fix_overdue": "true",
    "show_suppressed": "true",
}
EXPECTED = {
    "remediation_status": "in_progress",
    "show_remediated": True,
    "age_min": 5,
    "age_max": 90,
    "deployment": "checkout",
    "deployment_id": "dep-1",
    "fix_overdue": True,
    "show_suppressed": True,
}


@pytest.mark.parametrize("path", ["/api/exports/excel", "/api/exports/pdf"])
@pytest.mark.asyncio
async def test_export_forwards_list_filters(team_member_client, monkeypatch, path):
    fetch = AsyncMock(return_value=[])
    monkeypatch.setattr(exports, "fetch_filtered_cves", fetch)

    resp = await team_member_client.get(path, params=LIST_ONLY_FILTERS)

    assert resp.status_code == 200
    forwarded = fetch.await_args.kwargs
    assert {key: forwarded.get(key) for key in EXPECTED} == EXPECTED
