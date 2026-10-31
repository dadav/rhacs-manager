from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class AlertEmailDelivery(Base):
    """Claim that a user's CVE alert summary email went out on a UTC day.

    Anti-flood cap: the primary key allows at most one summary email per user
    per day, also across manual reruns and overlapping worker pods. The claim
    is committed before the email is sent (best effort): a failed send is not
    retried that day.
    """

    __tablename__ = "alert_email_deliveries"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    sent_on: Mapped[date] = mapped_column(Date, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
