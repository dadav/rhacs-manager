from pydantic import BaseModel, Field


class CveAliasesUpdate(BaseModel):
    # Bounds raw entries before deduplication. Semantic rules (trimming, length,
    # characters, 10 unique names) live in cve_alias_service.normalize_aliases.
    aliases: list[str] = Field(max_length=100)


class CveAliasesResponse(BaseModel):
    cve_id: str
    aliases: list[str]
