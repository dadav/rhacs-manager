import enum
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class RiskStatus(str, enum.Enum):
    requested = "requested"
    approved = "approved"
    rejected = "rejected"
    expired = "expired"


class RiskAcceptance(Base):
    __tablename__ = "risk_acceptances"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    cve_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    team_id: Mapped[UUID] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[RiskStatus] = mapped_column(
        SQLEnum(RiskStatus), nullable=False, default=RiskStatus.requested, index=True
    )
    justification: Mapped[str] = mapped_column(Text, nullable=False)
    scope: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    expires_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    created_by: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=False
    )
    reviewed_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(nullable=True)

    team: Mapped["Team"] = relationship("Team")  # type: ignore[name-defined]
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])  # type: ignore[name-defined]
    reviewer: Mapped["User | None"] = relationship("User", foreign_keys=[reviewed_by])  # type: ignore[name-defined]
    comments: Mapped[list["RiskAcceptanceComment"]] = relationship(
        back_populates="acceptance", cascade="all, delete-orphan", order_by="RiskAcceptanceComment.created_at"
    )


class RiskAcceptanceComment(Base):
    __tablename__ = "risk_acceptance_comments"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    risk_acceptance_id: Mapped[UUID] = mapped_column(
        ForeignKey("risk_acceptances.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=False
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    acceptance: Mapped["RiskAcceptance"] = relationship(back_populates="comments")
    author: Mapped["User"] = relationship("User")  # type: ignore[name-defined]
