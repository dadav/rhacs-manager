"""Alias writes, persistence, access rules, and batch reads against a real app DB."""

import asyncio
import importlib.util
from pathlib import Path
from unittest.mock import AsyncMock

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import JSON, create_engine, inspect, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.deps import get_app_db, get_current_user
from app.i18n import MESSAGES, ApiError
from app.models.audit_log import AuditLog
from app.models.cve_alias import CveAlias
from app.models.remediation import Remediation, RemediationStatus
from app.models.user import User, UserRole
from app.schemas.cve_alias import CveAliasesResponse
from app.services import cve_alias_service as aliases_svc
from app.stackrox import queries as sx

from .conftest import make_current_user

CVE = "CVE-2014-0160"
# Invisible and combining characters are built with chr() so the source stays readable.
ZWNJ = chr(0x200C)
ZWJ = chr(0x200D)
COMBINING_ACUTE = chr(0x0301)
UNSAFE_CODES = (0x2028, 0x2029, 0x061C, 0x200E, 0x200F, 0x202A, 0x202E, 0x2066, 0x2069)
SURROGATE_NAME = f"a{chr(0xD800)}b"
# Every entry is invalid after trimming; the surrogate stays last because JSON clients cannot encode it.
INVALID_NAMES = [
    "",
    "  ",
    "a" * 81,
    "one\ntwo",
    "one\rtwo",
    "a\x00b",
    "a\tb",
    "a\x7fb",
    *[f"a{chr(code)}b" for code in UNSAFE_CODES],
    SURROGATE_NAME,
]


@pytest.fixture
async def alias_store(app, sec_team_user, monkeypatch, tmp_path):
    monkeypatch.setattr(AuditLog.__table__.c.details, "type", JSON())
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'aliases.db'}")
    async with engine.begin() as connection:
        for model in (User, CveAlias, AuditLog, Remediation):
            await connection.run_sync(model.__table__.create)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as db:
        db.add(User(id=sec_team_user.id, username="security", email="sec@example.com", role=UserRole.sec_team))
        await db.commit()

    async def session():
        async with factory() as db:
            yield db

    app.dependency_overrides[get_app_db] = session
    monkeypatch.setattr(sx, "list_namespaces", AsyncMock(return_value=[{"namespace": "app", "cluster_name": "one"}]))
    monkeypatch.setattr(sx, "get_cve_detail", AsyncMock(return_value={"cve_id": CVE}))
    yield factory
    await engine.dispose()


async def audit_details(factory) -> list[dict]:
    async with factory() as db:
        logs = (await db.execute(select(AuditLog).order_by(AuditLog.created_at))).scalars().all()
        return [log.details for log in logs]


async def stored_rows(factory) -> dict[str, list[str]]:
    async with factory() as db:
        return {row.cve_id: row.aliases for row in (await db.execute(select(CveAlias))).scalars().all()}


async def test_replace_clear_and_audit(sec_team_client, alias_store, sec_team_user):
    response = await sec_team_client.put(
        f"/api/cves/{CVE}/aliases", json={"aliases": [" Heartbleed ", "heartBLEED", "TLS bug"]}
    )
    assert response.status_code == 200
    assert response.json() == {"cve_id": CVE, "aliases": ["Heartbleed", "TLS bug"]}
    # Identical writes are idempotent, including the audit trail.
    await sec_team_client.put(f"/api/cves/{CVE}/aliases", json={"aliases": ["Heartbleed", "TLS bug"]})
    async with alias_store() as db:
        assert await aliases_svc.load_aliases(db, [CVE]) == {CVE: ["Heartbleed", "TLS bug"]}
        logs = (await db.execute(select(AuditLog))).scalars().all()
        assert len(logs) == 1
        assert (logs[0].user_id, logs[0].entity_id, logs[0].action) == (sec_team_user.id, CVE, "cve_aliases_updated")
        assert logs[0].details == {"aliases": ["Heartbleed", "TLS bug"]}

    for values in [["New name"], []]:
        response = await sec_team_client.put(f"/api/cves/{CVE}/aliases", json={"aliases": values})
        assert response.status_code == 200
        async with alias_store() as db:
            assert await aliases_svc.load_aliases(db, [CVE]) == {CVE: values}


@pytest.mark.parametrize("lang", ["de", "en"])
@pytest.mark.parametrize(
    ("values", "code"),
    [
        *[(["Heartbleed", name], "cve_alias_invalid") for name in INVALID_NAMES if name != SURROGATE_NAME],
        ([str(i) for i in range(11)], "cve_alias_too_many"),
    ],
)
async def test_semantic_errors_are_localized_strings_and_do_not_write(sec_team_client, alias_store, values, code, lang):
    async with alias_store() as db:
        db.add(CveAlias(cve_id=CVE, aliases=["original"]))
        await db.commit()
    response = await sec_team_client.put(
        f"/api/cves/{CVE}/aliases", json={"aliases": values}, headers={"Accept-Language": lang}
    )
    assert response.status_code == 422
    assert response.json() == {"detail": MESSAGES[code][lang]}
    assert "Value error" not in response.text
    assert await stored_rows(alias_store) == {CVE: ["original"]}
    assert await audit_details(alias_store) == []


async def test_unpaired_surrogate_is_rejected_without_write(sec_team_client, alias_store):
    response = await sec_team_client.put(
        f"/api/cves/{CVE}/aliases",
        content=b'{"aliases": ["a\\ud800b"]}',
        headers={"Content-Type": "application/json", "Accept-Language": "en"},
    )
    assert response.status_code == 422
    assert "Value error" not in response.text
    assert await stored_rows(alias_store) == {}
    assert await audit_details(alias_store) == []


@pytest.mark.parametrize("values", [[123], None, ["Heartbleed"] * 101])
async def test_structural_errors_keep_fastapi_shape(sec_team_client, alias_store, values):
    response = await sec_team_client.put(f"/api/cves/{CVE}/aliases", json={"aliases": values})
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], list)
    assert await stored_rows(alias_store) == {}


async def test_raw_entry_bound_counts_duplicates_and_response_is_normalized(sec_team_client, alias_store):
    values = ["Heartbleed", " heartbleed "] * 45 + [f"name {i}" for i in range(8)] + ["Straße", "STRASSE"]
    assert len(values) == 100
    response = await sec_team_client.put(f"/api/cves/{CVE}/aliases", json={"aliases": values})
    assert response.status_code == 200
    expected = ["Heartbleed", *[f"name {i}" for i in range(8)], "Straße"]
    assert response.json() == {"cve_id": CVE, "aliases": expected}
    assert await stored_rows(alias_store) == {CVE: expected}


@pytest.mark.parametrize("name", INVALID_NAMES)
def test_service_rejects_invalid_names(name):
    with pytest.raises(ApiError) as error:
        aliases_svc.normalize_aliases(["Heartbleed", name])
    assert (error.value.status_code, error.value.code) == (422, "cve_alias_invalid")


@pytest.mark.parametrize(
    "name",
    [
        "Herzblut",
        "Ölüdeniz",
        "ハートブリード",
        "مرحبا",
        "שלום",
        f"क्{ZWJ}ष",
        f"a{ZWNJ}b",
        ZWJ.join(["\U0001f468", "\U0001f469", "\U0001f467"]),
        "é" * 80,
        "\U0001f600" * 80,
        f"e{COMBINING_ACUTE}" * 40,
    ],
)
def test_service_accepts_multilingual_names_and_joiners(name):
    assert aliases_svc.normalize_aliases([name]) == [name]


def test_service_normalization_rules():
    edge_trimmed = f"{chr(0x2028)}c{chr(0x2029)}"
    assert aliases_svc.normalize_aliases([" b ", "A", "B", "a", edge_trimmed]) == ["b", "A", "c"]
    assert aliases_svc.normalize_aliases(["Straße", "STRASSE", "strasse"]) == ["Straße"]
    assert aliases_svc.normalize_aliases([]) == []
    ten = [f"name {i}" for i in range(10)]
    assert aliases_svc.normalize_aliases(ten + [name.upper() for name in ten]) == ten
    with pytest.raises(ApiError) as error:
        aliases_svc.normalize_aliases([*ten, "eleventh"])
    assert (error.value.status_code, error.value.code) == (422, "cve_alias_too_many")


async def test_service_validates_before_database_work(alias_store, sec_team_user):
    async with alias_store() as db:
        with pytest.raises(ApiError):
            await aliases_svc.replace_aliases(db, AsyncMock(), sec_team_user, CVE, ["a\x00b"])
    sx.list_namespaces.assert_not_awaited()
    assert await audit_details(alias_store) == []


async def test_empty_updates_only_audit_real_clears(sec_team_client, alias_store):
    for _ in range(2):
        response = await sec_team_client.put(f"/api/cves/{CVE}/aliases", json={"aliases": []})
        assert response.status_code == 200
        assert response.json() == {"cve_id": CVE, "aliases": []}
    assert await stored_rows(alias_store) == {}
    assert await audit_details(alias_store) == []

    await sec_team_client.put(f"/api/cves/{CVE}/aliases", json={"aliases": ["Heartbleed"]})
    for _ in range(2):
        response = await sec_team_client.put(f"/api/cves/{CVE}/aliases", json={"aliases": []})
        assert response.status_code == 200
    assert await audit_details(alias_store) == [{"aliases": ["Heartbleed"]}, {"aliases": []}]
    assert await stored_rows(alias_store) == {CVE: []}


async def test_clearing_stored_empty_row_is_idempotent(sec_team_client, alias_store):
    async with alias_store() as db:
        db.add(CveAlias(cve_id=CVE, aliases=[]))
        await db.commit()
    response = await sec_team_client.put(f"/api/cves/{CVE}/aliases", json={"aliases": []})
    assert response.status_code == 200
    assert await stored_rows(alias_store) == {CVE: []}
    assert await audit_details(alias_store) == []


async def test_clearing_unknown_cve_is_rejected(sec_team_client, alias_store, monkeypatch):
    monkeypatch.setattr(sx, "get_cve_detail", AsyncMock(return_value=None))
    response = await sec_team_client.put(
        f"/api/cves/{CVE}/aliases", json={"aliases": []}, headers={"Accept-Language": "en"}
    )
    assert response.status_code == 404
    assert response.json() == {"detail": MESSAGES["cve_not_found"]["en"]}
    assert await stored_rows(alias_store) == {}
    assert await audit_details(alias_store) == []


@pytest.mark.parametrize("wildcard", [False, True])
async def test_only_security_team_can_write(app, team_member_client, alias_store, wildcard):
    app.dependency_overrides[get_current_user] = lambda: make_current_user(has_all_namespaces=wildcard)
    response = await team_member_client.put(f"/api/cves/{CVE}/aliases", json={"aliases": ["Heartbleed"]})
    assert response.status_code == 403
    async with alias_store() as db:
        assert await aliases_svc.load_aliases(db, [CVE]) == {}


async def test_unknown_cve_rejected_and_remediated_cve_retained(
    sec_team_client, alias_store, sec_team_user, monkeypatch
):
    await sec_team_client.put(f"/api/cves/{CVE}/aliases", json={"aliases": ["Heartbleed"]})
    monkeypatch.setattr(sx, "get_cve_detail", AsyncMock(return_value=None))
    response = await sec_team_client.put(f"/api/cves/{CVE}/aliases", json={"aliases": ["Changed"]})
    assert response.status_code == 404
    async with alias_store() as db:
        assert await aliases_svc.load_aliases(db, [CVE]) == {CVE: ["Heartbleed"]}
        db.add(
            Remediation(
                cve_id=CVE,
                namespace="app",
                cluster_name="one",
                status=RemediationStatus.resolved,
                created_by=sec_team_user.id,
            )
        )
        await db.commit()
    response = await sec_team_client.put(f"/api/cves/{CVE}/aliases", json={"aliases": ["Changed"]})
    assert response.status_code == 200


async def test_names_can_be_shared_and_search_is_literal_case_insensitive(sec_team_client, alias_store):
    for cve_id in [CVE, "CVE-2024-1234"]:
        await sec_team_client.put(f"/api/cves/{cve_id}/aliases", json={"aliases": ["Heartbleed", "100%_bug"]})
    async with alias_store() as db:
        assert set(await aliases_svc.matching_alias_cve_ids(db, "HEART")) == {CVE, "CVE-2024-1234"}
        assert await aliases_svc.matching_alias_cve_ids(db, "no match") == []
        assert len(await aliases_svc.matching_alias_cve_ids(db, "%_")) == 2
        items = [CveAliasesResponse(cve_id=CVE, aliases=[]), CveAliasesResponse(cve_id="CVE-UNKNOWN", aliases=[])]
        await aliases_svc.enrich_aliases(db, items)
        assert items[0].aliases == ["Heartbleed", "100%_bug"]
        assert items[1].aliases == []


async def test_concurrent_replacements_never_merge_or_duplicate(alias_store, sec_team_user):
    async def write(names):
        async with alias_store() as db:
            await aliases_svc.replace_aliases(db, AsyncMock(), sec_team_user, CVE, names)

    await asyncio.gather(write(["first", "complete set"]), write(["second"]))
    async with alias_store() as db:
        rows = (await db.execute(select(CveAlias))).scalars().all()
        assert len(rows) == 1
        assert rows[0].aliases in (["first", "complete set"], ["second"])
        assert len((await db.execute(select(AuditLog))).scalars().all()) == 2


@pytest.mark.parametrize("replacement", [["replacement"], []])
async def test_audit_failure_rolls_back_replacement_and_clear(alias_store, sec_team_user, monkeypatch, replacement):
    async with alias_store() as db:
        db.add(CveAlias(cve_id=CVE, aliases=["original"]))
        await db.commit()
    monkeypatch.setattr(aliases_svc, "log_action", AsyncMock(side_effect=RuntimeError("audit failed")))
    with pytest.raises(RuntimeError, match="audit failed"):
        async with alias_store() as db:
            await aliases_svc.replace_aliases(db, AsyncMock(), sec_team_user, CVE, replacement)
    assert await stored_rows(alias_store) == {CVE: ["original"]}


def test_alias_migration_upgrade_and_downgrade():
    path = Path(__file__).parents[1] / "alembic/versions/033_cve_aliases.py"
    spec = importlib.util.spec_from_file_location("migration_033", path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    engine = create_engine("sqlite:///:memory:")
    try:
        with engine.begin() as connection, Operations.context(MigrationContext.configure(connection)):
            migration.upgrade()
            connection.execute(CveAlias.__table__.insert().values(cve_id=CVE, aliases=["Heartbleed"]))
            assert connection.execute(select(CveAlias.aliases)).scalar_one() == ["Heartbleed"]
            migration.downgrade()
            assert "cve_aliases" not in inspect(connection).get_table_names()
    finally:
        engine.dispose()
