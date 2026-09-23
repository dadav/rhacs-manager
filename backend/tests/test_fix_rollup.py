"""Component fix roll-up: aggregation, ordering, and consistency with the /cves set."""

from unittest.mock import AsyncMock, patch

import httpx

from app.schemas.cve import CveListItem, SeverityLevel
from app.services.fix_rollup_service import aggregate_component_rows, sort_items


def _cve(cve_id: str, *, severity: int = 3, epss: float = 0.1, priority: bool = False) -> CveListItem:
    return CveListItem(
        cve_id=cve_id,
        severity=SeverityLevel(severity),
        cvss=7.5,
        epss_probability=epss,
        impact_score=5.0,
        fixable=True,
        fixed_by=None,
        affected_images=1,
        affected_deployments=1,
        first_seen=None,
        has_priority=priority,
    )


def _row(
    cve_id: str,
    *,
    name="openssl",
    version="3.0.7",
    fixed=("3.0.9",),
    fixable=True,
    images=("img-a",),
    pairs=None,
):
    return {
        "component_name": name,
        "component_version": version,
        "operating_system": "rhel:9",
        "cve_id": cve_id,
        "fixable": fixable,
        "fixed_by_versions": list(fixed),
        "image_pairs": pairs if pairs is not None else [[i, f"quay.io/{i}:1"] for i in images],
        "deployment_ids": [f"dep-{i}" for i in images],
        "namespaces": ["cluster-a/payments"],
    }


def test_aggregates_one_item_per_component_version_with_version_aware_target():
    visible = {c.cve_id: c for c in [_cve("CVE-1"), _cve("CVE-2"), _cve("CVE-3")]}
    rows = [
        _row("CVE-1", fixed=("3.0.9",)),
        _row("CVE-2", fixed=("3.0.10",), images=("img-b",)),
        _row("CVE-3", fixed=(), fixable=False),
    ]

    [item] = aggregate_component_rows(rows, visible)

    assert item.target_version == "3.0.10"
    assert item.fix_versions == ["3.0.10", "3.0.9"]
    assert item.target_uncertain is False
    assert (item.total_cves, item.fixable_cves) == (3, 2)
    assert item.affected_images == 2
    assert [i.image_id for i in item.images] == ["img-a", "img-b"]


def test_two_digests_with_the_same_tag_count_as_two_images_with_their_own_names():
    visible = {"CVE-1": _cve("CVE-1")}
    pairs = [
        ["sha256:bbb", "quay.io/app:latest"],
        ["sha256:aaa", "quay.io/app:latest"],
        ["sha256:ccc", "quay.io/other:1"],
    ]

    [item] = aggregate_component_rows([_row("CVE-1", pairs=pairs)], visible)

    assert item.affected_images == 3
    names = {i.image_id: i.image_name for i in item.images}
    assert names == {
        "sha256:aaa": "quay.io/app:latest",
        "sha256:bbb": "quay.io/app:latest",
        "sha256:ccc": "quay.io/other:1",
    }


def test_final_release_is_the_target_over_a_prerelease():
    visible = {"CVE-1": _cve("CVE-1"), "CVE-2": _cve("CVE-2")}

    [item] = aggregate_component_rows([_row("CVE-1", fixed=("1.0rc1",)), _row("CVE-2", fixed=("1.0",))], visible)

    assert item.target_version == "1.0"


def test_non_comparable_fix_candidates_are_kept_and_flag_uncertainty():
    visible = {"CVE-1": _cve("CVE-1")}

    [item] = aggregate_component_rows([_row("CVE-1", fixed=("%%%", "1.0"))], visible)

    assert item.target_version == "1.0"
    assert item.fix_versions == ["1.0", "%%%"]
    assert item.target_uncertain is True
    assert item.cves[0].fix_candidates == ["1.0", "%%%"]


def test_rows_for_cves_outside_the_visible_set_are_ignored():
    visible = {"CVE-1": _cve("CVE-1")}

    items = aggregate_component_rows([_row("CVE-1"), _row("CVE-HIDDEN", name="zlib")], visible)

    assert [i.component_name for i in items] == ["openssl"]


def test_prioritized_components_sort_first_regardless_of_sort_column():
    visible = {
        "CVE-P": _cve("CVE-P", priority=True),
        "CVE-1": _cve("CVE-1"),
        "CVE-2": _cve("CVE-2"),
    }
    rows = [
        _row("CVE-P", name="tiny"),
        _row("CVE-1", name="big"),
        _row("CVE-2", name="big"),
    ]
    items = aggregate_component_rows(rows, visible)

    ordered = sort_items(items, "total_cves", sort_desc=True)

    assert [i.component_name for i in ordered] == ["tiny", "big"]


def test_unknown_sort_column_falls_back_to_fixable_count():
    visible = {"CVE-1": _cve("CVE-1"), "CVE-2": _cve("CVE-2")}
    items = aggregate_component_rows(
        [_row("CVE-1", name="a", fixable=False, fixed=()), _row("CVE-2", name="b")],
        visible,
    )

    assert [i.component_name for i in sort_items(items, "not-a-column", True)] == ["b", "a"]


async def test_endpoint_scopes_rows_to_user_namespaces_and_reports_unmapped(team_member_client: httpx.AsyncClient):
    visible = [_cve("CVE-1"), _cve("CVE-2")]
    rows_mock = AsyncMock(return_value=[_row("CVE-1")])
    with (
        patch("app.services.fix_rollup_service.fetch_filtered_cves", AsyncMock(return_value=visible)) as fetch,
        patch("app.services.fix_rollup_service.sx.get_component_cve_rows", rows_mock),
    ):
        resp = await team_member_client.get("/api/cves/fixes", params={"namespace": "payments", "epss_min": 0.05})

    assert resp.status_code == 200
    body = resp.json()
    assert (body["visible_cves"], body["unmapped_cves"], body["total"]) == (2, 1, 1)
    assert fetch.await_args.kwargs["namespace"] == "payments"
    assert fetch.await_args.kwargs["epss_min"] == 0.05
    _, cve_ids, namespaces = rows_mock.await_args.args
    assert set(cve_ids) == {"CVE-1", "CVE-2"}
    assert namespaces == [("payments", "cluster-a")]


async def test_endpoint_is_org_wide_for_sec_team_without_scope(sec_team_client: httpx.AsyncClient):
    rows_mock = AsyncMock(return_value=[])
    with (
        patch("app.services.fix_rollup_service.fetch_filtered_cves", AsyncMock(return_value=[_cve("CVE-1")])) as fetch,
        patch("app.services.fix_rollup_service.sx.get_component_cve_rows", rows_mock),
    ):
        resp = await sec_team_client.get("/api/cves/fixes")

    assert resp.status_code == 200
    assert rows_mock.await_args.args[2] is None
    assert fetch.await_args.kwargs["restrict_namespaces"] is None


async def test_image_rollup_computes_visibility_only_in_the_image_namespaces(sec_team_client: httpx.AsyncClient):
    image_ns = [("payments", "cluster-a")]
    rows_mock = AsyncMock(return_value=[])
    with (
        patch("app.services.fix_rollup_service.sx.get_image_namespaces", AsyncMock(return_value=image_ns)),
        patch("app.services.fix_rollup_service.fetch_filtered_cves", AsyncMock(return_value=[_cve("CVE-1")])) as fetch,
        patch("app.services.fix_rollup_service.sx.get_component_cve_rows", rows_mock),
    ):
        resp = await sec_team_client.get("/api/cves/fixes", params={"image_id": "sha256:abc"})

    assert resp.status_code == 200
    assert fetch.await_args.kwargs["restrict_namespaces"] == image_ns
    assert rows_mock.await_args.kwargs["image_id"] == "sha256:abc"
    assert resp.json()["unmapped_cves"] == 0


async def test_image_not_running_anywhere_returns_empty(team_member_client: httpx.AsyncClient):
    fetch = AsyncMock()
    with (
        patch("app.services.fix_rollup_service.sx.get_image_namespaces", AsyncMock(return_value=[])),
        patch("app.services.fix_rollup_service.fetch_filtered_cves", fetch),
        patch("app.services.fix_rollup_service.sx.get_component_cve_rows", AsyncMock(return_value=[])),
    ):
        resp = await team_member_client.get("/api/cves/fixes", params={"image_id": "sha256:gone"})

    assert resp.json()["total"] == 0
    fetch.assert_not_awaited()


async def test_deployment_id_scopes_visibility_and_rows_to_that_deployment(team_member_client: httpx.AsyncClient):
    dep_ns = [("payments", "cluster-a")]
    rows_mock = AsyncMock(return_value=[_row("CVE-1")])
    with (
        patch("app.services.fix_rollup_service.sx.get_deployment_namespaces", AsyncMock(return_value=dep_ns)),
        patch("app.services.fix_rollup_service.fetch_filtered_cves", AsyncMock(return_value=[_cve("CVE-1")])) as fetch,
        patch("app.services.fix_rollup_service.sx.get_component_cve_rows", rows_mock),
    ):
        resp = await team_member_client.get("/api/cves/fixes", params={"deployment_id": "dep-123"})

    assert resp.status_code == 200
    assert fetch.await_args.kwargs["deployment_id"] == "dep-123"
    assert fetch.await_args.kwargs["restrict_namespaces"] == dep_ns
    assert rows_mock.await_args.kwargs["deployment_id"] == "dep-123"


async def test_unknown_deployment_id_returns_nothing(team_member_client: httpx.AsyncClient):
    fetch = AsyncMock()
    with (
        patch("app.services.fix_rollup_service.sx.get_deployment_namespaces", AsyncMock(return_value=[])),
        patch("app.services.fix_rollup_service.fetch_filtered_cves", fetch),
        patch("app.services.fix_rollup_service.sx.get_component_cve_rows", AsyncMock(return_value=[])),
    ):
        resp = await team_member_client.get("/api/cves/fixes", params={"deployment_id": "does-not-exist"})

    assert resp.json()["total"] == 0
    assert resp.json()["visible_cves"] == 0
    fetch.assert_not_awaited()


async def test_cve_list_passes_deployment_id_filter(team_member_client: httpx.AsyncClient):
    with patch("app.routers.cves.fetch_filtered_cves", AsyncMock(return_value=[])) as fetch:
        resp = await team_member_client.get("/api/cves", params={"deployment_id": "dep-123"})

    assert resp.status_code == 200
    assert fetch.await_args.kwargs["deployment_id"] == "dep-123"
