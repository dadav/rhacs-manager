from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class NotificationPreference(Base):
    """Per-user override of a notification category's defaults.

    Categories and their defaults live in ``notifications/preferences.py``; a
    missing row means "use the default". Mentions are mandatory and never stored.
    """

    __tablename__ = "notification_preferences"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    category: Mapped[str] = mapped_column(String(64), primary_key=True)
    in_app: Mapped[bool] = mapped_column(Boolean, nullable=False)
    email: Mapped[bool] = mapped_column(Boolean, nullable=False)
