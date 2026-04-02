import { Alert } from "@patternfly/react-core";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { CveListItem } from "../../types";
import { SeverityBadge } from "../common/SeverityBadge";
import { EpssBadge } from "../common/EpssBadge";

interface PriorityCveAlertProps {
  variant: "priority" | "high-epss";
  cves: CveListItem[];
}

export function PriorityCveAlert({ variant, cves }: PriorityCveAlertProps) {
  const { t } = useTranslation();

  if (cves.length === 0) return null;

  const isPriority = variant === "priority";
  const cardClass = isPriority
    ? "priority-alert-card"
    : "high-epss-alert-card";

  return (
    <Alert
      variant="warning"
      isInline
      title={isPriority ? t("dashboard.priorityCves") : t("dashboard.highEpss")}
      className={cardClass}
    >
      <p style={{ marginBottom: 8, fontSize: 13 }}>
        {isPriority
          ? t("dashboard.priorityCvesDescription")
          : t("dashboard.highEpssDescription")}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {cves.map((cve) => (
          <Link
            key={cve.cve_id}
            to={`/vulnerabilities/${cve.cve_id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              background: "var(--pf-t--global--background--color--primary--default, #fff)",
              border: `1px solid ${isPriority ? "#ec7a08" : "#f0ab00"}`,
              borderRadius: 4,
              textDecoration: "none",
              color: "var(--pf-t--global--text--color--regular, #151515)",
              fontSize: 13,
            }}
          >
            <span style={{ fontWeight: 700 }}>{cve.cve_id}</span>
            {isPriority && <span className="prio-badge">PRIO</span>}
            <SeverityBadge severity={cve.severity} />
            <EpssBadge value={cve.epss_probability} />
          </Link>
        ))}
      </div>
    </Alert>
  );
}
