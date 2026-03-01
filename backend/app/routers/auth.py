from fastapi import APIRouter, Depends

from ..auth.middleware import CurrentUser, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
async def get_me(current_user: CurrentUser = Depends(get_current_user)) -> dict:
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role.value,
        "is_sec_team": current_user.is_sec_team,
        "namespaces": [
            {"namespace": ns, "cluster_name": cluster}
            for ns, cluster in current_user.namespaces
        ],
    }
