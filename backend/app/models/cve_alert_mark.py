from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class CveAlertMark(Base):
    """A (CVE, namespace, reason) that team alerts were already raised for.

    The daily alert job compares the current set of alert-worthy CVEs per
    namespace with these marks: only new pairs notify. Marks for pairs that are
    no longer current are deleted, so a CVE that disappears and comes back
    alerts again.
    """

    __tablename__ = "cve_alert_marks"

    cve_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    namespace: Mapped[str] = mapped_column(String(255), primary_key=True)
    cluster_name: Mapped[str] = mapped_column(String(255), primary_key=True)
    # "critical" or "prioritized"
    reason: Mapped[str] = mapped_column(String(32), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
