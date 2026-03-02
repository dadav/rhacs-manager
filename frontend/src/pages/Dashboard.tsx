import {
  Alert,
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  PageSection,
  Spinner,
  Title,
} from "@patternfly/react-core";
import { getErrorMessage } from "../utils/errors";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useDashboard } from "../api/dashboard";
import { useScope } from "../hooks/useScope";
import { CvesPerNamespace } from "../components/charts/CvesPerNamespace";
import { SeverityDonut } from "../components/charts/SeverityDonut";
import { TrendLine } from "../components/charts/TrendLine";
import { EpssBadge } from "../components/common/EpssBadge";
import { SeverityBadge } from "../components/common/SeverityBadge";

function StatCard({
  label,
  value,
  color,
  subtitle,
}: {
  label: string;
  value: string | number;
  color?: string;
  subtitle?: string;
}) {
  return (
    <Card isCompact style={{ height: "100%" }}>
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
            color: color ?? "var(--pf-v6-global--Color--100)",
            lineHeight: 1.2,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--pf-v6-global--Color--200)",
            marginTop: 4,
          }}
        >
          {label}
        </div>
        {subtitle && (
          <div style={{ fontSize: 11, color: '#ec7a08', marginTop: 4 }}>
            {subtitle}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export function Dashboard() {
  const { t } = useTranslation();
  const { scopeParams } = useScope();
  const { data, isLoading, error } = useDashboard(scopeParams);

  if (isLoading)
    return (
      <PageSection>
        <Spinner aria-label="Laden" />
      </PageSection>
    );
  if (error)
    return (
      <PageSection>
        <Alert variant="danger" title={`Fehler: ${getErrorMessage(error)}`} />
      </PageSection>
    );
  if (!data) return null;

  return (
    <>
      <PageSection variant="default">
        <Title headingLevel="h1" size="xl">
          {t("dashboard.title")}
        </Title>
      </PageSection>

      <PageSection>
        <Grid hasGutter>
          {/* Stat cards */}
          <GridItem span={3}>
            <StatCard
              label={t("dashboard.totalCves")}
              value={data.stat_total_cves}
            />
          </GridItem>
          <GridItem span={3}>
            <StatCard
              label={t("dashboard.fixableCriticalCves")}
              value={data.stat_fixable_critical_cves}
              color="#c9190b"
            />
          </GridItem>
          <GridItem span={3}>
            <Link to="/eskalationen" style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
              <StatCard
                label={t("dashboard.escalations")}
                value={data.stat_escalations}
                color={data.stat_escalations > 0 ? "#ec7a08" : undefined}
                subtitle={data.stat_upcoming_escalations > 0
                  ? `${data.stat_upcoming_escalations} bevorstehend`
                  : undefined}
              />
            </Link>
          </GridItem>
          <GridItem span={3}>
            <StatCard
              label={t("dashboard.openRiskAcceptances")}
              value={data.stat_open_risk_acceptances}
              color={
                data.stat_open_risk_acceptances > 0 ? "#ec7a08" : undefined
              }
            />
          </GridItem>

          {/* EPSS Highlight Zone */}
          {data.priority_cves.length > 0 && (
            <GridItem span={12}>
              <Alert
                variant="warning"
                isInline
                title={t("dashboard.priorityCves")}
              >
                <p style={{ marginBottom: 8, fontSize: 13 }}>
                  {t("dashboard.priorityCvesDescription")}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {data.priority_cves.map((cve) => (
                    <Link
                      key={cve.cve_id}
                      to={`/schwachstellen/${cve.cve_id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        background: "var(--pf-v6-global--BackgroundColor--100)",
                        border: "1px solid #ec7a08",
                        borderRadius: 4,
                        textDecoration: "none",
                        color: "var(--pf-v6-global--Color--100)",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>{cve.cve_id}</span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 0.3,
                          background: "rgba(236, 122, 8, 0.18)",
                          color: "#ec7a08",
                          border: "1px solid rgba(236, 122, 8, 0.45)",
                          padding: "1px 5px",
                          borderRadius: 3,
                        }}
                      >
                        PRIO
                      </span>
                      <SeverityBadge severity={cve.severity} />
                      <EpssBadge value={cve.epss_probability} />
                    </Link>
                  ))}
                </div>
              </Alert>
            </GridItem>
          )}

          {data.high_epss_cves.length > 0 && (
            <GridItem span={12}>
              <Alert variant="warning" isInline title={t("dashboard.highEpss")}>
                <p style={{ marginBottom: 8, fontSize: 13 }}>
                  {t("dashboard.highEpssDescription")}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {data.high_epss_cves.map((cve) => (
                    <Link
                      key={cve.cve_id}
                      to={`/schwachstellen/${cve.cve_id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        background: "var(--pf-v6-global--BackgroundColor--100)",
                        border: "1px solid #f0ab00",
                        borderRadius: 4,
                        textDecoration: "none",
                        color: "var(--pf-v6-global--Color--100)",
                        fontSize: 13,
                      }}
                    >
                      <strong>{cve.cve_id}</strong>
                      <SeverityBadge severity={cve.severity} />
                      <EpssBadge value={cve.epss_probability} />
                    </Link>
                  ))}
                </div>
              </Alert>
            </GridItem>
          )}

          {/* Charts */}
          <GridItem span={6}>
            <Card style={{ height: "100%" }}>
              <CardTitle>{t("dashboard.severityDistribution")}</CardTitle>
              <CardBody>
                <SeverityDonut data={data.severity_distribution} />
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={6}>
            <Card style={{ height: "100%" }}>
              <CardTitle>{t("dashboard.cvesPerNamespace")}</CardTitle>
              <CardBody>
                <CvesPerNamespace data={data.cves_per_namespace} />
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={12}>
            <Card>
              <CardTitle>{t("dashboard.trend")}</CardTitle>
              <CardBody>
                <TrendLine data={data.cve_trend} />
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </PageSection>
    </>
  );
}
