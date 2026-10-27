"""Vulnerability feed (image_cves_v2.origin, ACS 4.11.6+): mapping, filtering, SQL, exports."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import app.services.cve_filter_service as svc
from app.schemas.cve import VulnOrigin
from app.stackrox.queries import core as core_queries
from app.stackrox.queries import images as image_queries
from app.stackrox.vuln_origin import ORIGIN_CODES, VULN_ORIGIN_NAMES, origin_filter_sql, origin_name, origin_names

from .conftest import make_current_user

# --- mapping ---


def test_names_cover_every_api_enum_value():
    assert set(VULN_ORIGIN_NAMES.values()) == {o.value for o in VulnOrigin}


def test_origin_codes_match_storage_proto():
    assert ORIGIN_CODES["red_hat"] == 7
    assert ORIGIN_CODES["osv"] == 1
    assert ORIGIN_CODES["debian"] == 4


def test_origin_names_drops_null_and_sorts_unique():
    assert origin_names([7, None, 4, 7]) == ["debian", "red_hat"]
    assert origin_names([]) == []
    assert origin_names(None) == []


def test_unknown_origin_code_maps_to_other():
    assert origin_name(42) == "other"
    assert origin_name(None) is None


# --- SQL predicate must match origin_name (list view) semantics ---


def test_other_predicate_excludes_named_codes():
    sql, params = origin_filter_sql("other")

    assert sql == "(ic.origin IS NOT NULL AND ic.origin <> ALL(:origin_named_codes))"
    assert params == {"origin_named_codes": [1, 2, 3, 4, 5, 6, 7, 8, 9]}


def test_named_predicate_is_equality():
    assert origin_filter_sql("debian") == ("ic.origin = :origin_code", {"origin_code": 4})


def _predicate_matches(origin: str, code: int | None) -> bool:
    """Python mirror of the SQL predicate semantics (NULL comparisons are false)."""
    _, params = origin_filter_sql(origin)
    if code is None:
        return False
    if "origin_named_codes" in params:
        return code not in params["origin_named_codes"]
    return code == params["origin_code"]


@pytest.mark.parametrize("origin", sorted(ORIGIN_CODES))
@pytest.mark.parametrize("code", [0, 42, 4, 7, None])
def test_sql_predicate_agrees_with_origin_name(origin, code):
    """Image view (SQL) and list view (origin_name) must classify every code the same way."""
    assert _predicate_matches(origin, code) == (origin_name(code) == origin)


# --- fetch_filtered_cves origin filter ---


def _result(*, scalar_one=None, all_items=None):
    r = MagicMock()
    r.scalar_one_or_none.return_value = scalar_one
    r.scalars.return_value.all.return_value = all_items or []
    return r


def _app_db():
    """execute() order: settings, priorities, RAs, suppression rules, remediations."""
    db = AsyncMock()
    settings = SimpleNamespace(min_cvss_score=0.0, min_epss_score=0.0, fix_overdue_threshold_days=30)
    db.execute.side_effect = [
        _result(scalar_one=settings),
        _result(),
        _result(),
        _result(),
        _result(),
    ]
    return db


def _patch_stackrox(monkeypatch, cves: list[dict]):
    async def get_all_cves(sx_db, min_cvss, min_epss, always_show):
        return cves

    async def list_namespaces(sx_db):
        return [{"namespace": "payments", "cluster_name": "cluster-a"}]

    async def empty_map(sx_db, cve_ids, ns):
        return {}

    monkeypatch.setattr(svc.sx, "get_all_cves", get_all_cves)
    monkeypatch.setattr(svc.sx, "list_namespaces", list_namespaces)
    monkeypatch.setattr(svc.sx, "get_cve_component_map", empty_map)
    monkeypatch.setattr(svc.sx, "get_cve_namespace_cluster_map", empty_map)


def _cve(cve_id: str, origin_codes: list[int]) -> dict:
    return {"cve_id": cve_id, "severity": 3, "cvss": 7.0, "epss_probability": 0.1, "origin_codes": origin_codes}


@pytest.mark.asyncio
async def test_items_carry_origins(monkeypatch):
    _patch_stackrox(monkeypatch, [_cve("CVE-A", [7, 4]), _cve("CVE-B", [])])
    user = make_current_user(is_sec_team=True, has_all_namespaces=True)

    items = await svc.fetch_filtered_cves(user, _app_db(), AsyncMock())

    by_id = {i.cve_id: i.origins for i in items}
    assert by_id == {"CVE-A": [VulnOrigin.DEBIAN, VulnOrigin.RED_HAT], "CVE-B": []}


@pytest.mark.asyncio
async def test_origin_filter_keeps_cves_with_that_feed(monkeypatch):
    _patch_stackrox(monkeypatch, [_cve("CVE-A", [7, 4]), _cve("CVE-B", [7]), _cve("CVE-C", [])])
    user = make_current_user(is_sec_team=True, has_all_namespaces=True)

    items = await svc.fetch_filtered_cves(user, _app_db(), AsyncMock(), origin=VulnOrigin.DEBIAN)

    assert [i.cve_id for i in items] == ["CVE-A"]


@pytest.mark.asyncio
async def test_other_filter_includes_unknown_codes_in_list(monkeypatch):
    _patch_stackrox(monkeypatch, [_cve("CVE-NEW-FEED", [42]), _cve("CVE-ZERO", [0]), _cve("CVE-RH", [7])])
    user = make_current_user(is_sec_team=True, has_all_namespaces=True)

    items = await svc.fetch_filtered_cves(user, _app_db(), AsyncMock(), origin=VulnOrigin.OTHER)

    assert sorted(i.cve_id for i in items) == ["CVE-NEW-FEED", "CVE-ZERO"]


# --- image queries ---


def _capturing_session():
    session = AsyncMock()
    result = MagicMock()
    result.__iter__ = lambda self: iter([])
    session.execute.return_value = result
    return session


@pytest.mark.asyncio
async def test_grouped_by_image_origin_filter_sql():
    session = _capturing_session()

    await image_queries.get_cves_grouped_by_image(session, None, origin="debian")

    sql, params = session.execute.call_args.args
    assert "BOOL_OR(ic.origin = :origin_code)" in str(sql)
    assert params["origin_code"] == 4


@pytest.mark.asyncio
async def test_cves_for_image_origin_filter_sql():
    session = _capturing_session()

    await image_queries.get_cves_for_image(session, "sha256:abc", None, origin="red_hat")

    sql, params = session.execute.call_args.args
    assert "BOOL_OR(ic.origin = :origin_code)" in str(sql)
    assert params["origin_code"] == 7


@pytest.mark.asyncio
async def test_image_queries_other_filter_covers_unknown_codes():
    for call in (
        lambda session: image_queries.get_cves_grouped_by_image(session, None, origin="other"),
        lambda session: image_queries.get_cves_for_image(session, "sha256:abc", None, origin="other"),
    ):
        session = _capturing_session()
        await call(session)
        sql, params = session.execute.call_args.args
        assert "BOOL_OR((ic.origin IS NOT NULL AND ic.origin <> ALL(:origin_named_codes)))" in str(sql)
        assert params["origin_named_codes"] == [1, 2, 3, 4, 5, 6, 7, 8, 9]
        assert "origin_code" not in params


@pytest.mark.asyncio
async def test_image_queries_without_origin_add_no_clause():
    session = _capturing_session()

    await image_queries.get_cves_grouped_by_image(session, None)

    sql, params = session.execute.call_args.args
    assert ":origin_code" not in str(sql)
    assert "origin_code" not in params


# --- exports keep feed-agnostic component rows ---


@pytest.mark.asyncio
async def test_export_component_query_is_feed_agnostic():
    """A component reported by two feeds must stay one PDF/Excel row."""
    session = _capturing_session()

    await core_queries.get_affected_components(session, "CVE-A", [("payments", "cluster-a")])

    sql = str(session.execute.call_args.args[0])
    projection = sql.split("SELECT DISTINCT", 1)[1]
    assert "origin" not in projection


@pytest.mark.asyncio
async def test_detail_component_query_includes_origin():
    session = _capturing_session()

    await core_queries.get_affected_components_with_origin(session, "CVE-A", [("payments", "cluster-a")])

    projection = str(session.execute.call_args.args[0]).split("SELECT DISTINCT", 1)[1]
    assert "ic.origin" in projection


async def test_pdf_export_uses_feed_agnostic_components(sec_team_client):
    from app.schemas.cve import CveListItem, SeverityLevel

    item = CveListItem(
        cve_id="CVE-A",
        severity=SeverityLevel.CRITICAL,
        cvss=9.0,
        epss_probability=0.5,
        impact_score=5.0,
        fixable=True,
        fixed_by="1.1",
        affected_images=1,
        affected_deployments=1,
        first_seen=None,
        origins=[VulnOrigin.DEBIAN],
    )
    component = {"component_name": "openssl", "component_version": "1.0", "fixable": True, "fixed_by": "1.1"}
    with (
        patch("app.routers.exports.fetch_filtered_cves", AsyncMock(return_value=[item])) as fetch,
        patch("app.routers.exports.sx") as mock_sx,
        patch("app.routers.exports.generate_cve_pdf", return_value=b"%PDF") as gen,
    ):
        mock_sx.list_namespaces = AsyncMock(return_value=[{"namespace": "payments", "cluster_name": "cluster-a"}])
        mock_sx.get_affected_deployments = AsyncMock(return_value=[])
        mock_sx.get_affected_components = AsyncMock(return_value=[component])
        mock_sx.get_affected_components_with_origin = AsyncMock()

        resp = await sec_team_client.get("/api/exports/pdf?origin=debian")

    assert resp.status_code == 200
    assert fetch.call_args.kwargs["origin"] is VulnOrigin.DEBIAN
    mock_sx.get_affected_components_with_origin.assert_not_called()
    cve_dicts = gen.call_args.args[0]
    assert len(cve_dicts[0]["components"]) == 1
    assert gen.call_args.kwargs["metadata"]["filters"]["origin"] == "debian"


# --- PDF filter description ---


@pytest.mark.parametrize(
    ("lang", "expected"),
    [("de", "Datenquelle: Oracle Linux"), ("en", "Data source: Oracle Linux")],
)
def test_pdf_filter_line_names_origin(lang, expected):
    from app.exports import pdf_generator

    cve = {"cve_id": "CVE-A", "severity": 4, "cvss": 9.0, "epss_probability": 0.5, "components": [], "deployments": []}
    rows: list[tuple] = []
    original = pdf_generator._draw_metadata_row

    def capture(pdf, icon, label, value):
        rows.append((label, value))
        original(pdf, icon, label, value)

    with patch.object(pdf_generator, "_draw_metadata_row", side_effect=capture):
        pdf_generator.generate_cve_pdf([cve], metadata={"filters": {"origin": "oracle"}}, lang=lang)

    t = pdf_generator._get_translations(lang)
    filter_values = [value for label, value in rows if label == t["label_filters"]]
    assert filter_values == [expected]
