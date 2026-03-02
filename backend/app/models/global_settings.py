from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base

DEFAULT_ESCALATION_RULES = [
    {
        "severity_min": 3,  # IMPORTANT
        "epss_threshold": 0.0,
        "days_to_level1": 14,
        "days_to_level2": 21,
        "days_to_level3": 30,
    },
    {
        "severity_min": 4,  # CRITICAL
        "epss_threshold": 0.0,
        "days_to_level1": 7,
        "days_to_level2": 14,
        "days_to_level3": 21,
    },
    {
        "severity_min": 2,  # MODERATE with high EPSS
        "epss_threshold": 0.5,
        "days_to_level1": 14,
        "days_to_level2": 21,
        "days_to_level3": 30,
    },
]


class GlobalSettings(Base):
    __tablename__ = "global_settings"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    min_cvss_score: Mapped[float] = mapped_column(Numeric(4, 1), nullable=False, default=0.0)
    min_epss_score: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False, default=0.0)
    escalation_rules: Mapped[list] = mapped_column(
        JSONB, nullable=False, default=lambda: DEFAULT_ESCALATION_RULES
    )
    escalation_warning_days: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    digest_day: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # 0=Monday
    management_email: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    updated_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )
