from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class Escalation(Base):
    __tablename__ = "escalations"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    cve_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    team_id: Mapped[UUID] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    level: Mapped[int] = mapped_column(Integer, nullable=False)  # 1, 2, or 3
    triggered_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    notified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    team: Mapped["Team"] = relationship("Team")  # type: ignore[name-defined]
