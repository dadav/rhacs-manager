import enum
from datetime import datetime

from sqlalchemy import Enum as SQLEnum
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class UserRole(str, enum.Enum):
    team_member = "team_member"
    sec_team = "sec_team"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(255), primary_key=True)  # OIDC subject
    username: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
