from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class CveComment(Base):
    __tablename__ = "cve_comments"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    cve_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    # Set when a sec-team user posts a comment scoped to an active escalation.
    # ON DELETE SET NULL: deleting the escalation orphans the comment, not deletes it.
    escalation_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("escalations.id", ondelete="SET NULL"), nullable=True, index=True, default=None
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime | None] = mapped_column(default=None, nullable=True)

    author: Mapped["User"] = relationship("User")  # type: ignore[name-defined]
