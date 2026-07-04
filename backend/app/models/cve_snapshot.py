from datetime import date

from sqlalchemy import Date, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class CveSnapshot(Base):
    """Daily CVE counts per (cluster, namespace, severity) for the dashboard history chart.

    The special row cluster_name='*' / namespace='*' holds org-wide counts
    deduplicated across namespaces (a CVE in 3 namespaces counts once there).
    count_total: all unsuppressed CVEs. count_visible: additionally filtered by the
    global CVSS/EPSS thresholds at snapshot time (always-show CVEs bypass them).
    """

    __tablename__ = "cve_snapshots"
    __table_args__ = (
        UniqueConstraint("snapshot_date", "cluster_name", "namespace", "severity", name="uq_cve_snapshot"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    cluster_name: Mapped[str] = mapped_column(String(255), nullable=False)
    namespace: Mapped[str] = mapped_column(String(255), nullable=False)
    severity: Mapped[int] = mapped_column(Integer, nullable=False)
    count_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    count_visible: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
