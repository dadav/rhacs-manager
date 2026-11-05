from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import Date, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class NotificationEmailEvent(Base):
    """One notification waiting to be counted in a user's daily summary email.

    Written by ``create_notification`` in the caller's transaction, independent of
    the in-app preference. Holds only the message key: no params, so no CVE or
    namespace data at rest. Consumed by ``services/notification_summary_service.py``.
    """

    __tablename__ = "notification_email_events"
    __table_args__ = (Index("ix_notification_email_events_user_created", "user_id", "created_at"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message_key: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class NotificationSummaryDelivery(Base):
    """Claim that a user's notification summary email went out on a UTC day.

    The primary key allows at most one summary per user per day. The claim is
    committed before the email is sent: a failed send is not retried.
    """

    __tablename__ = "notification_summary_deliveries"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    sent_on: Mapped[date] = mapped_column(Date, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
