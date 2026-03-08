import enum
from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import Date, Enum as SQLEnum, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class RemediationStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"
    verified = "verified"
    wont_fix = "wont_fix"


class Remediation(Base):
    __tablename__ = "remediations"
    __table_args__ = (
        UniqueConstraint(
            "cve_id", "namespace", "cluster_name",
            name="uq_remediation_cve_ns_cluster",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    cve_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    namespace: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    cluster_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[RemediationStatus] = mapped_column(
        SQLEnum(RemediationStatus), nullable=False, default=RemediationStatus.open,
    )
    assigned_to: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    created_by: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
    )
    resolved_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow,
    )

    assignee: Mapped["User"] = relationship("User", foreign_keys=[assigned_to])  # type: ignore[name-defined]
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])  # type: ignore[name-defined]
    resolver: Mapped["User"] = relationship("User", foreign_keys=[resolved_by])  # type: ignore[name-defined]
