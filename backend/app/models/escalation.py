from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base

ESCALATION_UNIQUE_CONSTRAINT = "uq_escalations_cve_level_ns_cluster"


class Escalation(Base):
    __tablename__ = "escalations"
    # One escalation per (CVE, level, namespace, cluster). The scheduler relies on
    # this to skip duplicates when two processes race (see run_escalation_check).
    __table_args__ = (
        UniqueConstraint("cve_id", "level", "namespace", "cluster_name", name=ESCALATION_UNIQUE_CONSTRAINT),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    cve_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    namespace: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    cluster_name: Mapped[str] = mapped_column(String(255), nullable=False)
    level: Mapped[int] = mapped_column(Integer, nullable=False)  # 1, 2, or 3
    triggered_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    notified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class EscalationWarning(Base):
    """Dedup record for pre-escalation warning emails.

    One row per (cve_id, namespace, cluster_name, level) once a warning email has
    been sent, so the daily warning job does not re-email the same contact every
    day while a CVE sits inside the escalation_warning_days window.
    """

    __tablename__ = "escalation_warnings"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    cve_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    namespace: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    cluster_name: Mapped[str] = mapped_column(String(255), nullable=False)
    level: Mapped[int] = mapped_column(Integer, nullable=False)  # 1, 2, or 3
    sent_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
