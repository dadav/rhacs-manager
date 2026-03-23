import enum
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class PriorityLevel(str, enum.Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class CvePriority(Base):
    __tablename__ = "cve_priorities"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    cve_id: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    priority: Mapped[PriorityLevel] = mapped_column(SQLEnum(PriorityLevel), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    set_by: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    deadline: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

    setter: Mapped["User"] = relationship("User")  # type: ignore[name-defined]
