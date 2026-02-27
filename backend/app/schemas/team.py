from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TeamNamespaceCreate(BaseModel):
    namespace: str = Field(min_length=1, max_length=255)
    cluster_name: str = Field(min_length=1, max_length=255)


class TeamNamespaceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    team_id: UUID
    namespace: str
    cluster_name: str


class TeamCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    namespaces: list[TeamNamespaceCreate] = []


class TeamUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    namespaces: list[TeamNamespaceCreate] | None = None


class TeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: str
    created_at: datetime
    namespaces: list[TeamNamespaceResponse] = []
