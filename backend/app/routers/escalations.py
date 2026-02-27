from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db
from ..models.escalation import Escalation
from ..models.team import Team

router = APIRouter(prefix="/escalations", tags=["escalations"])


@router.get("")
async def list_escalations(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> list[dict]:
    query = select(Escalation).order_by(Escalation.triggered_at.desc())
    if not current_user.is_sec_team:
        if not current_user.team_id:
            return []
        query = query.where(Escalation.team_id == current_user.team_id)

    result = await db.execute(query)
    escalations = result.scalars().all()

    # Enrich with team names
    team_ids = list({e.team_id for e in escalations})
    teams_result = await db.execute(select(Team).where(Team.id.in_(team_ids)))
    teams = {t.id: t.name for t in teams_result.scalars().all()}

    return [
        {
            "id": str(e.id),
            "cve_id": e.cve_id,
            "team_id": str(e.team_id),
            "team_name": teams.get(e.team_id, str(e.team_id)),
            "level": e.level,
            "triggered_at": e.triggered_at.isoformat(),
            "notified": e.notified,
        }
        for e in escalations
    ]
