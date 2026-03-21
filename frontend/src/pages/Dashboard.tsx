import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  EmptyStateBody,
  Grid,
  GridItem,
  PageSection,
  Popover,
  Title,
} from "@patternfly/react-core";
import { OutlinedQuestionCircleIcon } from "@patternfly/react-icons";
import { getErrorMessage } from "../utils/errors";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { useDashboard } from "../api/dashboard";
import { useAuth } from "../hooks/useAuth";
import { useScope } from "../hooks/useScope";
import { EpssRiskMatrix } from "../components/charts/EpssRiskMatrix";
import { SeverityDonut } from "../components/charts/SeverityDonut";
import { TrendLine } from "../components/charts/TrendLine";
import { STATUS_COLORS } from "../tokens";

import { StatCard } from "../components/dashboard/StatCard";
import { ChartCardTitle } from "../components/dashboard/ChartCardTitle";
import { ClusterHeatmap } from "../components/dashboard/ClusterHeatmap";
import { MttrChart } from "../components/dashboard/MttrChart";
import { AgingDistribution } from "../components/dashboard/AgingDistribution";
import { NamespaceBreakdown } from "../components/dashboard/NamespaceBreakdown";
import { TopComponents } from "../components/dashboard/TopComponents";
import { FixabilityDonut } from "../components/dashboard/FixabilityDonut";
import { FixableTrend } from "../components/dashboard/FixableTrend";
import { PriorityCveAlert } from "../components/dashboard/PriorityCveAlert";
import { DashboardSkeleton } from "../components/dashboard/DashboardSkeleton";

const statLinkStyle = {
  textDecoration: "none" as const,
  display: "block" as const,
  height: "100%" as const,
};

export function Dashboard() {
  const { t } = useTranslation();
  const { isSecTeam } = useAuth();
  const navigate = useNavigate();
  const { scopeParams } = useScope();
  const { data, isLoading, error } = useDashboard(scopeParams);

  if (isLoading) return <DashboardSkeleton />;

  if (error)
    return (
      <PageSection>
        <EmptyState>
          <EmptyStateBody>
            {t("common.error")}: {getErrorMessage(error)}
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    );

  if (!data) return null;

  return (
    <>
      <PageSection variant="default">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Title headingLevel="h1" size="xl">
            {t("dashboard.title")}
          </Title>
          <Popover
            headerContent={t('dashboard.whatIs')}
            bodyContent={
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 8px' }}>
                  {t('dashboard.helpBody1')}
                </p>
                <p style={{ margin: '0 0 8px' }}>
                  <strong>{t('dashboard.helpBody2Charts')}</strong> — {t('dashboard.helpBody2ChartsDesc')}<br />
                  <strong>{t('dashboard.helpBody2Stats')}</strong> — {t('dashboard.helpBody2StatsDesc')}<br />
                  <strong>{t('dashboard.helpBody2Priority')}</strong> — {t('dashboard.helpBody2PriorityDesc')}
                </p>
                <p style={{ margin: 0 }}>
                  {t('dashboard.helpBody3')}
                </p>
              </div>
            }
            position="right"
          >
            <Button variant="plain" aria-label={t('dashboard.helpLabel')} style={{ padding: '4px 6px' }}>
              <OutlinedQuestionCircleIcon style={{ color: 'var(--pf-t--global--text--color--subtle)' }} />
            </Button>
          </Popover>
        </div>
      </PageSection>

      <PageSection>
        <Grid hasGutter>
          {/* Stat cards */}
          <GridItem span={3}>
            <Link to="/vulnerabilities" style={statLinkStyle}>
              <StatCard
                label={t("dashboard.totalCves")}
                value={data.stat_total_cves}
                accentClass="stat-card--info"
              />
            </Link>
          </GridItem>
          <GridItem span={3}>
            <Link
              to="/vulnerabilities?severity=4&fixable=true"
              style={statLinkStyle}
            >
              <StatCard
                label={t("dashboard.fixableCriticalCves")}
                value={data.stat_fixable_critical_cves}
                color="#c9190b"
                accentClass="stat-card--danger"
              />
            </Link>
          </GridItem>
          <GridItem span={3}>
            <Link to="/escalations" style={statLinkStyle}>
              <StatCard
                label={t("dashboard.escalations")}
                value={data.stat_escalations}
                color={data.stat_escalations > 0 ? "#ec7a08" : undefined}
                subtitle={
                  data.stat_upcoming_escalations > 0
                    ? `${data.stat_upcoming_escalations} ${t("dashboard.upcoming")}`
                    : undefined
                }
                accentClass="stat-card--warning"
              />
            </Link>
          </GridItem>
          <GridItem span={3}>
            <Link
              to="/risk-acceptances?status=requested"
              style={statLinkStyle}
            >
              <StatCard
                label={t("dashboard.openRiskAcceptances")}
                value={data.stat_open_risk_acceptances}
                color={
                  data.stat_open_risk_acceptances > 0 ? "#ec7a08" : undefined
                }
                accentClass="stat-card--warning"
              />
            </Link>
          </GridItem>

          {/* Priority / high-EPSS alerts */}
          {data.priority_cves.length > 0 && (
            <GridItem span={12}>
              <PriorityCveAlert variant="priority" cves={data.priority_cves} />
            </GridItem>
          )}
          {data.high_epss_cves.length > 0 && (
            <GridItem span={12}>
              <PriorityCveAlert
                variant="high-epss"
                cves={data.high_epss_cves}
              />
            </GridItem>
          )}

          {/* EPSS Risk Matrix */}
          {data.epss_matrix.length > 0 && (
            <GridItem span={isSecTeam ? 8 : 12}>
              <Card>
                <ChartCardTitle
                  title={t("dashboard.epssMatrix")}
                  helpKey="dashboard.help.epssMatrix"
                />
                <CardBody>
                  <EpssRiskMatrix
                    data={data.epss_matrix}
                    onDotClick={(cveId) =>
                      navigate(`/vulnerabilities/${cveId}`)
                    }
                  />
                </CardBody>
              </Card>
            </GridItem>
          )}

          {/* Risk Acceptance Pipeline (sec team only) */}
          {isSecTeam && (
            <GridItem span={4}>
              <Card style={{ height: "100%" }}>
                <ChartCardTitle
                  title={t("dashboard.pipeline")}
                  helpKey="dashboard.help.pipeline"
                >
                  <Link to="/risk-acceptances" style={{ fontSize: 12 }}>
                    {t("dashboard.viewAll")}
                  </Link>
                </ChartCardTitle>
                <CardBody>
                  {(
                    ["requested", "approved", "rejected", "expired"] as const
                  ).map((status) => {
                    const labels: Record<string, string> = {
                      requested: t("status.requested"),
                      approved: t("status.approved"),
                      rejected: t("status.rejected"),
                      expired: t("status.expired"),
                    };
                    return (
                      <Link
                        key={status}
                        to={`/risk-acceptances?status=${status}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 0",
                          borderBottom:
                            "1px solid var(--pf-t--global--border--color--default)",
                          color: "inherit",
                          textDecoration: "none",
                        }}
                      >
                        <span style={{ fontSize: 13 }}>{labels[status]}</span>
                        <Badge
                          style={{
                            background: STATUS_COLORS[status],
                            color: "#fff",
                            padding: "2px 8px",
                          }}
                        >
                          {data.risk_acceptance_pipeline[status]}
                        </Badge>
                      </Link>
                    );
                  })}
                </CardBody>
              </Card>
            </GridItem>
          )}

          {/* Severity Distribution */}
          <GridItem span={6}>
            <Card style={{ height: "100%", overflow: "visible" }}>
              <ChartCardTitle
                title={t("dashboard.severityDistribution")}
                helpKey="dashboard.help.severityDistribution"
              />
              <CardBody>
                <SeverityDonut
                  data={data.severity_distribution}
                  onSegmentClick={(severity) =>
                    navigate(`/vulnerabilities?severity=${severity}`)
                  }
                />
              </CardBody>
            </Card>
          </GridItem>

          {/* Fixability Donut */}
          {(data.fixability_breakdown.fixable > 0 ||
            data.fixability_breakdown.unfixable > 0) && (
            <GridItem span={6}>
              <FixabilityDonut
                data={data.fixability_breakdown}
                onSegmentClick={(fixable) =>
                  navigate(`/vulnerabilities?fixable=${fixable}`)
                }
              />
            </GridItem>
          )}

          {/* Fixable Trend */}
          {data.fixable_trend.length > 0 && (
            <GridItem span={12}>
              <FixableTrend data={data.fixable_trend} />
            </GridItem>
          )}

          {/* Cluster Heatmap */}
          {data.cluster_heatmap.length > 0 && (
            <GridItem span={12}>
              <ClusterHeatmap
                data={data.cluster_heatmap}
                onClusterClick={(cluster) =>
                  navigate(
                    `/vulnerabilities?cluster=${encodeURIComponent(cluster)}`,
                  )
                }
                onCellClick={(cluster, severity) =>
                  navigate(
                    `/vulnerabilities?severity=${severity}&cluster=${encodeURIComponent(cluster)}`,
                  )
                }
              />
            </GridItem>
          )}

          {/* MTTR by Severity */}
          {data.mttr_by_severity.some((m) => m.count > 0) && (
            <GridItem span={6}>
              <MttrChart data={data.mttr_by_severity} />
            </GridItem>
          )}

          {/* CVE Aging Distribution */}
          {data.aging_distribution.some((b) => b.count > 0) && (
            <GridItem span={6}>
              <AgingDistribution
                data={data.aging_distribution}
                onBucketClick={(ageMin, ageMax) => {
                  const params = new URLSearchParams();
                  params.set("age_min", String(ageMin));
                  if (ageMax !== undefined)
                    params.set("age_max", String(ageMax));
                  navigate(`/vulnerabilities?${params.toString()}`);
                }}
              />
            </GridItem>
          )}

          {/* CVE Trend */}
          <GridItem span={12}>
            <Card>
              <ChartCardTitle
                title={t("dashboard.trend")}
                helpKey="dashboard.help.trend"
              />
              <CardBody>
                <TrendLine data={data.cve_trend} />
              </CardBody>
            </Card>
          </GridItem>

          {/* CVEs per Namespace */}
          {data.cves_per_namespace.length > 0 && (
            <GridItem span={12}>
              <NamespaceBreakdown
                data={data.cves_per_namespace}
                onBarClick={(namespace, severity) =>
                  navigate(
                    `/vulnerabilities?namespace=${encodeURIComponent(namespace)}&severity=${severity}`,
                  )
                }
              />
            </GridItem>
          )}

          {/* Top Vulnerable Components */}
          {data.top_vulnerable_components.length > 0 && (
            <GridItem span={12}>
              <TopComponents
                data={data.top_vulnerable_components}
                onBarClick={(componentName, fixable) =>
                  navigate(
                    `/vulnerabilities?component=${encodeURIComponent(componentName)}&fixable=${fixable}&advanced=1`,
                  )
                }
              />
            </GridItem>
          )}
        </Grid>
      </PageSection>
    </>
  );
}
