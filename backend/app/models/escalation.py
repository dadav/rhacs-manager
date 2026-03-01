from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Escalation(Base):
    __tablename__ = "escalations"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    cve_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    namespace: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    cluster_name: Mapped[str] = mapped_column(String(255), nullable=False)
    level: Mapped[int] = mapped_column(Integer, nullable=False)  # 1, 2, or 3
    triggered_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    notified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
