from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class NamespaceContact(Base):
    __tablename__ = "namespace_contacts"
    __table_args__ = (UniqueConstraint("namespace", "cluster_name", name="uq_namespace_contact_ns_cluster"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    namespace: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    cluster_name: Mapped[str] = mapped_column(String(255), nullable=False)
    escalation_email: Mapped[str] = mapped_column(String(255), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
