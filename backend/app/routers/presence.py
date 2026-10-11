"""Who-is-viewing presence for CVE and risk-acceptance detail pages.

The store is in-process and per-replica, so viewer lists are best-effort when
the backend runs with several replicas. Both endpoints require the caller to be
allowed to see the entity; otherwise they answer 404 so presence never reveals
activity on CVEs or risk acceptances outside the caller's scope.
"""

import logging
import time
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db, get_stackrox_db
from ..i18n import ApiError
from ..models.risk_acceptance import RiskAcceptance
from ..services.risk_acceptance_service import user_can_access_ra
from ..stackrox import queries as sx

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/presence", tags=["presence"])

HEARTBEAT_TTL = 30  # seconds
ACCESS_CACHE_TTL = 300  # seconds; access checks are cached so 15s polling stays cheap
MAX_BUCKETS = 5000  # hard cap on tracked entities per process

EntityType = Literal["cve", "risk_acceptance"]

# In-memory store: {entity_key: {user_id: {username, display_name, last_seen}}}
_viewers: dict[str, dict[str, dict]] = {}
# {(user_id, entity_key): (allowed, expires_at)}
_access_cache: dict[tuple[str, str], tuple[bool, float]] = {}
_last_sweep: float = 0.0


class HeartbeatRequest(BaseModel):
    entity_type: EntityType
    entity_id: str = Field(min_length=1, max_length=200)


class Viewer(BaseModel):
    user_id: str
    username: str
    display_name: str


def _entity_key(entity_type: str, entity_id: str) -> str:
    return f"{entity_type}:{entity_id}"


def _clean_stale(entity_key: str, now: float) -> None:
    bucket = _viewers.get(entity_key)
    if not bucket:
        return
    stale = [uid for uid, v in bucket.items() if now - v["last_seen"] > HEARTBEAT_TTL]
    for uid in stale:
        del bucket[uid]
    if not bucket:
        del _viewers[entity_key]


def _sweep_all(now: float) -> None:
    """Drop stale viewers and expired access-cache entries, at most once per HEARTBEAT_TTL."""
    global _last_sweep
    if now - _last_sweep < HEARTBEAT_TTL:
        return
    _last_sweep = now
    for key in list(_viewers):
        _clean_stale(key, now)
    expired = [k for k, (_, expires_at) in _access_cache.items() if expires_at <= now]
    for k in expired:
        del _access_cache[k]


async def _check_access(
    entity_type: EntityType,
    entity_id: str,
    current_user: CurrentUser,
    app_db: AsyncSession,
    sx_db: AsyncSession,
) -> bool:
    if entity_type == "risk_acceptance":
        try:
            ra_id = UUID(entity_id)
        except ValueError:
            return False
        result = await app_db.execute(select(RiskAcceptance).where(RiskAcceptance.id == ra_id))
        ra = result.scalar_one_or_none()
        return ra is not None and user_can_access_ra(current_user, ra)

    # entity_type == "cve": same visibility rule as GET /cves/{cve_id}
    if current_user.can_see_all_namespaces:
        return True
    if not current_user.has_namespaces:
        return False
    return await sx.cve_visible_in_namespaces(sx_db, entity_id, current_user.namespaces)


async def _require_access(
    entity_type: EntityType,
    entity_id: str,
    current_user: CurrentUser,
    app_db: AsyncSession,
    sx_db: AsyncSession,
    now: float,
) -> str:
    """Return the entity key, or raise 404 if the caller may not see the entity."""
    key = _entity_key(entity_type, entity_id)
    cache_key = (current_user.id, key)
    cached = _access_cache.get(cache_key)
    if cached is not None and cached[1] > now:
        allowed = cached[0]
    else:
        allowed = await _check_access(entity_type, entity_id, current_user, app_db, sx_db)
        _access_cache[cache_key] = (allowed, now + ACCESS_CACHE_TTL)
    if not allowed:
        raise ApiError(404, "presence_entity_not_found")
    return key


@router.post("/heartbeat")
async def heartbeat(
    body: HeartbeatRequest,
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> dict:
    now = time.monotonic()
    _sweep_all(now)
    key = await _require_access(body.entity_type, body.entity_id, current_user, app_db, sx_db, now)
    if key not in _viewers:
        if len(_viewers) >= MAX_BUCKETS:
            logger.warning(
                "Presence store full, ignoring heartbeat",
                extra={"entity_key": key, "max_buckets": MAX_BUCKETS, "user_id": current_user.id},
            )
            return {"ok": False}
        _viewers[key] = {}
    _viewers[key][current_user.id] = {
        "username": current_user.username,
        "display_name": current_user.display_name,
        "last_seen": now,
    }
    _clean_stale(key, now)
    return {"ok": True}


@router.get("/viewers", response_model=list[Viewer])
async def get_viewers(
    entity_type: EntityType,
    entity_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> list[Viewer]:
    now = time.monotonic()
    key = await _require_access(entity_type, entity_id, current_user, app_db, sx_db, now)
    _clean_stale(key, now)
    bucket = _viewers.get(key, {})
    return [
        Viewer(user_id=uid, username=v["username"], display_name=v.get("display_name", v["username"]))
        for uid, v in bucket.items()
        if uid != current_user.id
    ]
