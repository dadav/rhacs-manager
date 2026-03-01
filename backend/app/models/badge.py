import secrets
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


def _generate_token() -> str:
    return secrets.token_hex(16)


class BadgeToken(Base):
    __tablename__ = "badge_tokens"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    created_by: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=False, index=True
    )
    namespace: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cluster_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    token: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, default=_generate_token
    )
    label: Mapped[str] = mapped_column(String(255), nullable=False, default="CVEs")
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
