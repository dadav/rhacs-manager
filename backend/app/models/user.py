import enum
from datetime import datetime

from sqlalchemy import Boolean, Index, String, text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class UserRole(str, enum.Enum):
    team_member = "team_member"
    sec_team = "sec_team"


class User(Base):
    __tablename__ = "users"

    # Usernames are globally unique regardless of case: mentions resolve
    # @[username] case-insensitively and must map to exactly one account.
    __table_args__ = (Index("uq_users_username_lower", text("lower(username)"), unique=True),)

    id: Mapped[str] = mapped_column(String(255), primary_key=True)  # OIDC subject
    username: Mapped[str] = mapped_column(String(255), nullable=False)
    # Mutable, non-unique human name from the identity provider. May be null
    # until the user's next authentication syncs it. Never used as an identity.
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), nullable=False)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    @property
    def display_name(self) -> str:
        """Human-facing name: trimmed full_name, falling back to username.

        This is the single invariant for how a user is shown anywhere in the
        product. Username stays the stable identity/fallback.
        """
        return (self.full_name or "").strip() or self.username
