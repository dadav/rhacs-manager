"""Verify backend error messages localize from the Accept-Language header.

Uses GET /api/priorities/{id} which returns ApiError(404, "not_found") when the
record is missing (the default mock DB returns no row).
"""

import httpx

_MISSING_ID = "00000000-0000-0000-0000-000000000001"
_PATH = f"/api/priorities/{_MISSING_ID}"


async def test_error_localized_english(team_member_client: httpx.AsyncClient):
    res = await team_member_client.get(_PATH, headers={"Accept-Language": "en"})
    assert res.status_code == 404
    assert res.json()["detail"] == "Not found"


async def test_error_localized_german(team_member_client: httpx.AsyncClient):
    res = await team_member_client.get(_PATH, headers={"Accept-Language": "de"})
    assert res.status_code == 404
    assert res.json()["detail"] == "Nicht gefunden"


async def test_error_defaults_to_german_without_header(team_member_client: httpx.AsyncClient):
    res = await team_member_client.get(_PATH)
    assert res.status_code == 404
    assert res.json()["detail"] == "Nicht gefunden"


async def test_error_localized_from_weighted_header(team_member_client: httpx.AsyncClient):
    res = await team_member_client.get(_PATH, headers={"Accept-Language": "en-US,en;q=0.9,de;q=0.8"})
    assert res.status_code == 404
    assert res.json()["detail"] == "Not found"
