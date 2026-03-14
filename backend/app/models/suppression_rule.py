import enum
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, Index, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class SuppressionStatus(str, enum.Enum):
    requested = "requested"
    approved = "approved"
    rejected = "rejected"


class SuppressionType(str, enum.Enum):
    component = "component"
    cve = "cve"


class SuppressionRule(Base):
    __tablename__ = "suppression_rules"
    __table_args__ = (
        Index(
            "uq_suppression_rules_active_component",
            "component_name",
            "version_pattern",
            unique=True,
            postgresql_where=text(
                "type = 'component' AND status IN ('requested', 'approved')"
            ),
        ),
        Index(
            "uq_suppression_rules_active_cve",
            "cve_id",
            unique=True,
            postgresql_where=text(
                "type = 'cve' AND status IN ('requested', 'approved')"
            ),
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    status: Mapped[SuppressionStatus] = mapped_column(
        SQLEnum(SuppressionStatus),
        nullable=False,
        default=SuppressionStatus.requested,
        index=True,
    )
    type: Mapped[SuppressionType] = mapped_column(
        SQLEnum(SuppressionType), nullable=False, index=True
    )
    component_name: Mapped[str | None] = mapped_column(
        String(512), nullable=True, index=True
    )
    version_pattern: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cve_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    reference_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    review_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    created_by: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=False
    )
    reviewed_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(nullable=True)

    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])  # type: ignore[name-defined]
    reviewer: Mapped["User | None"] = relationship("User", foreign_keys=[reviewed_by])  # type: ignore[name-defined]
