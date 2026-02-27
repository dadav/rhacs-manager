from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    namespaces: Mapped[list["TeamNamespace"]] = relationship(
        back_populates="team", cascade="all, delete-orphan", lazy="selectin"
    )
    users: Mapped[list["User"]] = relationship(back_populates="team")  # type: ignore[name-defined]


class TeamNamespace(Base):
    __tablename__ = "team_namespaces"
    __table_args__ = (
        UniqueConstraint("team_id", "namespace", "cluster_name", name="uq_team_namespace_cluster"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    team_id: Mapped[UUID] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    namespace: Mapped[str] = mapped_column(String(255), nullable=False)
    cluster_name: Mapped[str] = mapped_column(String(255), nullable=False)

    team: Mapped["Team"] = relationship(back_populates="namespaces")
