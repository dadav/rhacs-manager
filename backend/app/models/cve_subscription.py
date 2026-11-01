from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import JSON, Date, DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base

# JSONB on Postgres, plain JSON on SQLite (test engine) so create_all renders.
_STATE_JSON = JSONB().with_variant(JSON(), "sqlite")


class CveSubscription(Base):
    """A user follows one CVE ("Abonnieren").

    ``state`` is the pair-keyed StackRox snapshot the hourly diff job compares
    against (shape documented in ``services/cve_subscription_service.py``). It is
    baselined on subscribe and never NULL, so no change is silently absorbed.
    """

    __tablename__ = "cve_subscriptions"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    cve_id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    state: Mapped[dict] = mapped_column(_STATE_JSON, nullable=False)
    state_checked_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class CveSubscriptionEvent(Base):
    """One subscription event for one recipient.

    Written regardless of the in-app preference: the opt-in daily summary email
    counts these rows. ``scope`` holds the ``[[namespace, cluster], ...]`` pairs
    that describe the event; it is never used for access control.
    """

    __tablename__ = "cve_subscription_events"
    __table_args__ = (Index("ix_cve_subscription_events_user_created", "user_id", "created_at"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    cve_id: Mapped[str] = mapped_column(String(64), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    scope: Mapped[list] = mapped_column(_STATE_JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class CveSubscriptionEmailDelivery(Base):
    """Claim that a user's subscription summary email went out on a UTC day.

    The primary key caps the email at one per user per day, also across manual
    reruns. The claim is committed before sending (best effort, never retried).
    """

    __tablename__ = "cve_subscription_email_deliveries"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    sent_on: Mapped[date] = mapped_column(Date, primary_key=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
