import { Card, CardBody } from "@patternfly/react-core";

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
  subtitle?: string;
  accentClass?: string;
}

export function StatCard({
  label,
  value,
  color,
  subtitle,
  accentClass,
}: StatCardProps) {
  return (
    <Card isCompact style={{ height: "100%" }} className={accentClass}>
      <CardBody
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: color ?? "var(--pf-t--global--text--color--regular, #151515)",
            lineHeight: 1.2,
          }}
        >
          {value}
        </div>
        <div
          className="stat-card-label"
          style={{
            fontSize: 13,
            marginTop: 4,
          }}
        >
          {label}
        </div>
        {subtitle && (
          <div style={{ fontSize: 11, color: "#ec7a08", marginTop: 4 }}>
            {subtitle}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
