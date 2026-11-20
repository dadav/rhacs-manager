from sqlalchemy import JSON, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class CveAlias(Base):
    """Organization-wide names, independent of scanner findings and their lifetime."""

    __tablename__ = "cve_aliases"

    cve_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    aliases: Mapped[list[str]] = mapped_column(JSONB().with_variant(JSON(), "sqlite"), nullable=False)
