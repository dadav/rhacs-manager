"""CVE subscriptions ("Abonnieren") of the signed-in user.

Business rules live in ``services/cve_subscription_service.py``.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db, get_stackrox_db
from ..schemas.cve_subscription import CveSubscriptionItem, CveSubscriptionState
from ..services import cve_subscription_service as sub_svc

router = APIRouter(tags=["subscriptions"])


@router.get("/cves/{cve_id}/subscription", response_model=CveSubscriptionState)
async def get_subscription(
    cve_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> CveSubscriptionState:
    return CveSubscriptionState(cve_id=cve_id, subscribed=await sub_svc.is_subscribed(db, current_user.id, cve_id))


@router.put("/cves/{cve_id}/subscription", response_model=CveSubscriptionState)
async def subscribe(
    cve_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> CveSubscriptionState:
    """Idempotent. 404 unless the CVE affects a deployment the user can see."""
    await sub_svc.subscribe(db, sx_db, current_user, cve_id)
    return CveSubscriptionState(cve_id=cve_id, subscribed=True)


@router.delete("/cves/{cve_id}/subscription", response_model=CveSubscriptionState)
async def unsubscribe(
    cve_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> CveSubscriptionState:
    """Idempotent; always allowed (also after losing access to the CVE)."""
    await sub_svc.unsubscribe(db, current_user.id, cve_id)
    return CveSubscriptionState(cve_id=cve_id, subscribed=False)


@router.get("/me/cve-subscriptions", response_model=list[CveSubscriptionItem])
async def list_my_subscriptions(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> list[CveSubscriptionItem]:
    return [
        CveSubscriptionItem(cve_id=s.cve_id, created_at=s.created_at)
        for s in await sub_svc.list_for_user(db, current_user.id)
    ]
