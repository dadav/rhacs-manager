from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, require_sec_team
from ..deps import get_app_db, get_stackrox_db
from ..models.global_settings import GlobalSettings
from ..schemas.settings import SettingsResponse, SettingsUpdate, ThresholdPreviewResponse
from ..services.audit_service import log_action
from ..stackrox import queries as sx

router = APIRouter(prefix="/settings", tags=["settings"])


async def _get_or_create_settings(db: AsyncSession) -> GlobalSettings:
    result = await db.execute(select(GlobalSettings).limit(1))
    s = result.scalar_one_or_none()
    if s is None:
        s = GlobalSettings()
        db.add(s)
        await db.flush()
    return s


@router.get("", response_model=SettingsResponse)
async def get_settings(
    current_user: CurrentUser = Depends(require_sec_team),
    db: AsyncSession = Depends(get_app_db),
) -> SettingsResponse:
    s = await _get_or_create_settings(db)
    await db.commit()
    return SettingsResponse.model_validate(s)


@router.patch("", response_model=SettingsResponse)
async def update_settings(
    body: SettingsUpdate,
    current_user: CurrentUser = Depends(require_sec_team),
    db: AsyncSession = Depends(get_app_db),
) -> SettingsResponse:
    s = await _get_or_create_settings(db)
    s.min_cvss_score = body.min_cvss_score
    s.min_epss_score = body.min_epss_score
    s.escalation_rules = [r.model_dump() for r in body.escalation_rules]
    s.escalation_warning_days = body.escalation_warning_days
    s.digest_day = body.digest_day
    s.management_email = body.management_email
    s.updated_by = current_user.id

    await log_action(
        db, current_user.id, "settings_updated", "global_settings", str(s.id),
        {"min_cvss": body.min_cvss_score, "min_epss": body.min_epss_score},
    )
    await db.commit()
    await db.refresh(s)
    return SettingsResponse.model_validate(s)


@router.get("/threshold-preview", response_model=ThresholdPreviewResponse)
async def threshold_preview(
    min_cvss: float = Query(0.0, ge=0.0, le=10.0),
    min_epss: float = Query(0.0, ge=0.0, le=1.0),
    current_user: CurrentUser = Depends(require_sec_team),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> ThresholdPreviewResponse:
    preview = await sx.get_threshold_preview(sx_db, min_cvss, min_epss)
    return ThresholdPreviewResponse(**preview)
