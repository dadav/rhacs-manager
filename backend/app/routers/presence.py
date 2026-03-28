import time

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..auth.middleware import CurrentUser, get_current_user

router = APIRouter(prefix="/presence", tags=["presence"])

HEARTBEAT_TTL = 30  # seconds

# In-memory store: {entity_key: {user_id: {username, last_seen}}}
_viewers: dict[str, dict[str, dict]] = {}


class HeartbeatRequest(BaseModel):
    entity_type: str = Field(min_length=1, max_length=50)
    entity_id: str = Field(min_length=1, max_length=200)


class Viewer(BaseModel):
    user_id: str
    username: str


def _clean_stale(entity_key: str) -> None:
    now = time.monotonic()
    bucket = _viewers.get(entity_key)
    if not bucket:
        return
    stale = [uid for uid, v in bucket.items() if now - v["last_seen"] > HEARTBEAT_TTL]
    for uid in stale:
        del bucket[uid]
    if not bucket:
        del _viewers[entity_key]


@router.post("/heartbeat")
async def heartbeat(
    body: HeartbeatRequest,
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    key = f"{body.entity_type}:{body.entity_id}"
    if key not in _viewers:
        _viewers[key] = {}
    _viewers[key][current_user.id] = {
        "username": current_user.username,
        "last_seen": time.monotonic(),
    }
    _clean_stale(key)
    return {"ok": True}


@router.get("/viewers", response_model=list[Viewer])
async def get_viewers(
    entity_type: str,
    entity_id: str,
    current_user: CurrentUser = Depends(get_current_user),
) -> list[Viewer]:
    key = f"{entity_type}:{entity_id}"
    _clean_stale(key)
    bucket = _viewers.get(key, {})
    return [Viewer(user_id=uid, username=v["username"]) for uid, v in bucket.items() if uid != current_user.id]
