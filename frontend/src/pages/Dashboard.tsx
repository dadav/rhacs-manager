import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  PageSection,
  Spinner,
  Title,
} from "@patternfly/react-core";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getErrorMessage } from "../utils/errors";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useDashboard } from "../api/dashboard";

import { useScope } from "../hooks/useScope";
import { CvesPerNamespace } from "../components/charts/CvesPerNamespace";
import { EpssRiskMatrix } from "../components/charts/EpssRiskMatrix";
import { SeverityDonut } from "../components/charts/SeverityDonut";
import { TrendLine } from "../components/charts/TrendLine";
import { EpssBadge } from "../components/common/EpssBadge";
import { SeverityBadge } from "../components/common/SeverityBadge";

const SEVERITY_LABELS = ['Unbekannt', 'Gering', 'Mittel', 'Hoch', 'Kritisch']

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

  const heatmapCols = ['unknown', 'low', 'moderate', 'important', 'critical'] as const
  const heatmapRgb: Record<typeof heatmapCols[number], string> = {
    unknown:   '210,210,210',
    low:       '190,225,244',
    moderate:  '249,224,162',
    important: '244,182,120',
    critical:  '249,185,183',
  }

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

          {/* EPSS Risk Matrix + Risk Acceptance Pipeline */}
          {data.epss_matrix.length > 0 && (
            <GridItem span={8}>
              <Card>
                <CardTitle>{t('dashboard.epssMatrix')}</CardTitle>
                <CardBody>
                  <p style={{ fontSize: 12, color: 'var(--pf-v6-global--Color--200)', marginBottom: 8 }}>
                    {t('dashboard.epssMatrixDescription')}
                  </p>
                  <EpssRiskMatrix data={data.epss_matrix} />
                </CardBody>
              </Card>
            </GridItem>
          )}

          {(
            <GridItem span={4}>
              <Card style={{ height: '100%' }}>
                <CardTitle>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span>{t('dashboard.pipeline')}</span>
                    <Link to="/risikoakzeptanzen" style={{ fontSize: 12 }}>Alle anzeigen</Link>
                  </div>
                </CardTitle>
                <CardBody>
                  {(['requested', 'approved', 'rejected', 'expired'] as const).map(status => {
                    const labels: Record<string, string> = {
                      requested: 'Beantragt', approved: 'Genehmigt', rejected: 'Abgelehnt', expired: 'Abgelaufen'
                    }
                    const colors: Record<string, string> = {
                      requested: '#0066cc', approved: '#1e8f19', rejected: '#c9190b', expired: '#8a8d90'
                    }
                    return (
                      <Link
                        key={status}
                        to={`/risikoakzeptanzen?status=${status}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 0',
                          borderBottom: '1px solid var(--pf-t--global--border--color--default)',
                          color: 'inherit',
                          textDecoration: 'none',
                        }}
                      >
                        <span style={{ fontSize: 13 }}>{labels[status]}</span>
                        <Badge style={{ background: colors[status], color: '#fff', padding: '2px 8px' }}>
                          {data.risk_acceptance_pipeline[status]}
                        </Badge>
                      </Link>
                    )
                  })}
                </CardBody>
              </Card>
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

          {/* Cluster Heatmap */}
          {data.cluster_heatmap.length > 0 && (
            <GridItem span={12}>
              <Card>
                <CardTitle>{t('dashboard.clusterHeatmap')}</CardTitle>
                <CardBody>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'var(--pf-t--global--background--color--secondary--default)' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left' }}>Cluster</th>
                          {SEVERITY_LABELS.map(l => <th key={l} style={{ padding: '8px 12px', textAlign: 'right' }}>{l}</th>)}
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>Gesamt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.cluster_heatmap.map(row => (
                          <tr key={row.cluster} style={{ borderBottom: '1px solid var(--pf-t--global--border--color--default)' }}>
                            <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{row.cluster}</td>
                            {heatmapCols.map(col => {
                              const val = row[col]
                              const bgAlpha = val > 0 ? Math.min(0.3 + val / 50, 1) : 0
                              return (
                                <td key={col} style={{
                                  padding: '8px 12px',
                                  textAlign: 'right',
                                  background: val > 0 ? `rgba(${heatmapRgb[col]},${bgAlpha})` : 'transparent',
                                  color: val > 0 ? '#151515' : 'inherit',
                                }}>
                                  {val > 0 ? val : '–'}
                                </td>
                              )
                            })}
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>{row.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
              </Card>
            </GridItem>
          )}

          {/* CVE Aging Distribution */}
          {data.aging_distribution.some(b => b.count > 0) && (
            <GridItem span={6}>
              <Card>
                <CardTitle>{t('dashboard.aging')}</CardTitle>
                <CardBody>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.aging_distribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="CVEs" fill="#0066cc">
                        {data.aging_distribution.map((_, i) => (
                          <Cell key={i} fill={i >= 3 ? '#c9190b' : i >= 2 ? '#ec7a08' : '#0066cc'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
            </GridItem>
          )}

          <GridItem span={data.aging_distribution.some(b => b.count > 0) ? 6 : 12}>
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
