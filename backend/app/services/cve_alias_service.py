import logging
import unicodedata
from collections.abc import Iterable, Sequence
from typing import Protocol

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser
from ..i18n import ApiError
from ..models.cve_alias import CveAlias
from ..stackrox import queries as sx
from .audit_service import log_action
from .cve_access import has_visible_remediation

logger = logging.getLogger(__name__)

MIN_ALIAS_LENGTH = 1
MAX_ALIAS_LENGTH = 80
MAX_ALIASES = 10
# Controls, surrogates (Postgres JSONB rejects NUL and unpaired surrogates) and
# line/paragraph separators. Other format characters such as joiners stay allowed.
UNSAFE_CATEGORIES = frozenset({"Cc", "Cs", "Zl", "Zp"})
# Bidi controls can make a badge read differently from the stored text.
BIDI_CONTROLS = frozenset(
    {chr(0x061C), chr(0x200E), chr(0x200F)}
    | {chr(code) for code in range(0x202A, 0x202F)}
    | {chr(code) for code in range(0x2066, 0x206A)}
)


class CveWithAliases(Protocol):
    cve_id: str | None
    aliases: list[str]


async def load_aliases(db: AsyncSession, cve_ids: Iterable[str]) -> dict[str, list[str]]:
    ids = set(cve_ids)
    if not ids:
        return {}
    rows = (await db.execute(select(CveAlias).where(CveAlias.cve_id.in_(ids)))).scalars().all()
    return {row.cve_id: row.aliases for row in rows}


async def enrich_aliases(db: AsyncSession, items: Sequence[CveWithAliases]) -> None:
    """Call only after the caller has applied its record-level access checks."""
    aliases = await load_aliases(db, (item.cve_id for item in items if item.cve_id))
    for item in items:
        item.aliases = aliases.get(item.cve_id, [])


def matches_cve_search(cve_id: str, aliases: list[str], search: str) -> bool:
    query = search.casefold()
    return any(query in value.casefold() for value in [cve_id, *aliases])


async def matching_alias_cve_ids(db: AsyncSession, search: str | None) -> list[str]:
    """Resolve aliases for SQL search predicates; these IDs never grant visibility."""
    if not search:
        return []
    rows = (await db.execute(select(CveAlias))).scalars().all()
    query = search.casefold()
    return [row.cve_id for row in rows if any(query in alias.casefold() for alias in row.aliases)]


def is_valid_alias(name: str) -> bool:
    """Check one already trimmed name: 1-80 code points, no unsafe characters."""
    if not MIN_ALIAS_LENGTH <= len(name) <= MAX_ALIAS_LENGTH:
        return False
    return not any(unicodedata.category(char) in UNSAFE_CATEGORIES or char in BIDI_CONTROLS for char in name)


def normalize_aliases(values: list[str]) -> list[str]:
    """Trim, validate, and casefold-deduplicate names, keeping the first spelling and input order."""
    aliases: list[str] = []
    seen: set[str] = set()
    for value in values:
        name = value.strip()
        if not is_valid_alias(name):
            raise ApiError(422, "cve_alias_invalid")
        key = name.casefold()
        if key not in seen:
            aliases.append(name)
            seen.add(key)
    if len(aliases) > MAX_ALIASES:
        raise ApiError(422, "cve_alias_too_many")
    return aliases


async def replace_aliases(
    db: AsyncSession,
    sx_db: AsyncSession,
    user: CurrentUser,
    cve_id: str,
    values: list[str],
) -> list[str]:
    """Replace all names of a CVE and return the stored normalized list."""
    aliases = normalize_aliases(values)
    # The sec-team dependency protects writes. Unlike user_can_access_cve, this
    # existence check must also reject unknown CVEs for organization-wide users.
    namespaces = await sx.list_namespaces(sx_db)
    pairs = [(row["namespace"], row["cluster_name"]) for row in namespaces]
    if not await sx.get_cve_detail(sx_db, cve_id, pairs) and not await has_visible_remediation(db, user, cve_id):
        raise ApiError(404, "cve_not_found")

    if aliases:
        make_insert = sqlite_insert if db.get_bind().dialect.name == "sqlite" else insert
        statement = make_insert(CveAlias).values(cve_id=cve_id, aliases=aliases)
        statement = statement.on_conflict_do_update(
            index_elements=[CveAlias.cve_id],
            set_={"aliases": statement.excluded.aliases},
            where=CveAlias.aliases != statement.excluded.aliases,
        ).returning(CveAlias.cve_id)
    else:
        # Clearing never inserts: only an existing nonempty row is a real change.
        statement = (
            update(CveAlias)
            .where(CveAlias.cve_id == cve_id, CveAlias.aliases != [])
            .values(aliases=[])
            .returning(CveAlias.cve_id)
        )
    try:
        changed = (await db.execute(statement)).scalar_one_or_none()
        if changed:
            await log_action(db, user.id, "cve_aliases_updated", "cve", cve_id, {"aliases": aliases})
        await db.commit()
    except Exception:
        await db.rollback()
        logger.warning("CVE alias update rolled back", extra={"cve_id": cve_id, "actor_id": user.id})
        raise
    if changed:
        logger.info("CVE aliases updated", extra={"cve_id": cve_id, "actor_id": user.id, "alias_count": len(aliases)})
    return aliases
