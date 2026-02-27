from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import require_sec_team, CurrentUser
from ..deps import get_app_db
from ..models.risk_acceptance import RiskAcceptance, RiskStatus
from ..models.team import Team, TeamNamespace
from ..schemas.team import TeamCreate, TeamResponse, TeamUpdate
from ..services.audit_service import log_action

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("", response_model=list[TeamResponse])
async def list_teams(
    _: CurrentUser = Depends(require_sec_team),
    db: AsyncSession = Depends(get_app_db),
) -> list[TeamResponse]:
    result = await db.execute(select(Team).order_by(Team.name))
    return [TeamResponse.model_validate(t) for t in result.scalars().all()]


@router.post("", response_model=TeamResponse, status_code=201)
async def create_team(
    body: TeamCreate,
    current_user: CurrentUser = Depends(require_sec_team),
    db: AsyncSession = Depends(get_app_db),
) -> TeamResponse:
    team = Team(name=body.name, email=body.email)
    db.add(team)
    await db.flush()

    for ns_data in body.namespaces:
        ns = TeamNamespace(
            team_id=team.id,
            namespace=ns_data.namespace,
            cluster_name=ns_data.cluster_name,
        )
        db.add(ns)

    await log_action(db, current_user.id, "team_created", "team", str(team.id))
    await db.commit()
    await db.refresh(team)
    return TeamResponse.model_validate(team)


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: UUID,
    _: CurrentUser = Depends(require_sec_team),
    db: AsyncSession = Depends(get_app_db),
) -> TeamResponse:
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(404, "Team nicht gefunden")
    return TeamResponse.model_validate(team)


@router.patch("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: UUID,
    body: TeamUpdate,
    current_user: CurrentUser = Depends(require_sec_team),
    db: AsyncSession = Depends(get_app_db),
) -> TeamResponse:
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(404, "Team nicht gefunden")

    if body.name is not None:
        team.name = body.name
    if body.email is not None:
        team.email = body.email
    if body.namespaces is not None:
        # Replace all namespaces
        ns_result = await db.execute(
            select(TeamNamespace).where(TeamNamespace.team_id == team_id)
        )
        for ns in ns_result.scalars().all():
            await db.delete(ns)
        for ns_data in body.namespaces:
            db.add(TeamNamespace(
                team_id=team.id,
                namespace=ns_data.namespace,
                cluster_name=ns_data.cluster_name,
            ))

    await log_action(db, current_user.id, "team_updated", "team", str(team.id))
    await db.commit()
    await db.refresh(team)
    return TeamResponse.model_validate(team)


@router.delete("/{team_id}", status_code=204)
async def delete_team(
    team_id: UUID,
    current_user: CurrentUser = Depends(require_sec_team),
    db: AsyncSession = Depends(get_app_db),
) -> None:
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(404, "Team nicht gefunden")
    await log_action(db, current_user.id, "team_deleted", "team", str(team_id))
    await db.delete(team)
    await db.commit()
