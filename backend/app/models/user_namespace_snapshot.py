from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base

# JSONB on Postgres, plain JSON on SQLite (test engine) so create_all renders.
_NAMESPACES_JSON = JSONB().with_variant(JSON(), "sqlite")


class UserNamespaceSnapshot(Base):
    """Last namespace visibility seen for a user at sign-in.

    NOTIFICATION TARGETING ONLY. Access control always uses the request-scoped
    ``CurrentUser.namespaces``; this row may be stale (access revoked since the
    last sign-in). Background jobs use it to decide whom to notify, and
    notifications built from it are re-checked against live namespaces on read.
    """

    __tablename__ = "user_namespace_snapshots"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    # [[namespace, cluster_name], ...]; empty when has_all_namespaces.
    namespaces: Mapped[list] = mapped_column(_NAMESPACES_JSON, nullable=False, default=list)
    has_all_namespaces: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    namespaces_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
