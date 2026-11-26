"""ACS activity console: observed events, collector snapshots, collector state.

Timestamps are naive UTC like the rest of the app DB; the API adds the offset.
Events carry the exact ``(cluster_name, namespace)`` pair they describe; reads
authorize against the requester's current pairs, never against these rows.
"""

from datetime import datetime

from sqlalchemy import JSON, BigInteger, DateTime, Index, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base

# JSONB on Postgres, plain JSON on SQLite (test engine) so create_all renders.
_JSON = JSONB().with_variant(JSON(), "sqlite")
# bigint sequence on Postgres; SQLite only autoincrements INTEGER primary keys.
_EVENT_ID = BigInteger().with_variant(Integer(), "sqlite")

# Version of the normalized snapshot JSON shape. Bump it (with a migration that
# clears snapshots and initialized_at) when the shape changes.
ACTIVITY_SNAPSHOT_VERSION = 1
COLLECTOR_STATE_ID = 1


class ActivityEvent(Base):
    __tablename__ = "activity_events"
    __table_args__ = (
        Index("ix_activity_events_pair_id", "cluster_name", "namespace", "id"),
        Index("ix_activity_events_observed_at", "observed_at"),
        # SQLite would otherwise reuse ids after retention deletes the newest rows.
        {"sqlite_autoincrement": True},
    )

    id: Mapped[int] = mapped_column(_EVENT_ID, primary_key=True, autoincrement=True)
    kind: Mapped[str] = mapped_column(String(40), nullable=False)
    observed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    source_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cluster_name: Mapped[str] = mapped_column(String(253), nullable=False)
    namespace: Mapped[str] = mapped_column(String(253), nullable=False)
    details: Mapped[dict] = mapped_column(_JSON, nullable=False)


class ActivitySnapshot(Base):
    """Last committed normalized state of one entity (``deployment`` or ``image``)."""

    __tablename__ = "activity_snapshots"

    entity_type: Mapped[str] = mapped_column(String(16), primary_key=True)
    entity_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    snapshot: Mapped[dict] = mapped_column(_JSON, nullable=False)


class ActivityCollectorState(Base):
    """Singleton (id=1) created by the migration; locked FOR UPDATE per collection."""

    __tablename__ = "activity_collector_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    snapshot_version: Mapped[int] = mapped_column(Integer, nullable=False, default=ACTIVITY_SNAPSHOT_VERSION)
    initialized_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_success_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # Highest event id committed by the collector; the feed's upper watermark.
    last_event_id: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
