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
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), nullable=False)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
