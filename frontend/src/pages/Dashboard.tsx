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
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getErrorMessage } from "../utils/errors";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useDashboard } from "../api/dashboard";

import { useAuth } from "../hooks/useAuth";
import { useScope } from "../hooks/useScope";
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
  const { isSecTeam } = useAuth();
  const navigate = useNavigate();
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
  const heatmapSeverityIndex: Record<typeof heatmapCols[number], number> = {
    unknown: 0, low: 1, moderate: 2, important: 3, critical: 4,
  }
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
            <Link to="/schwachstellen" style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
              <StatCard
                label={t("dashboard.totalCves")}
                value={data.stat_total_cves}
              />
            </Link>
          </GridItem>
          <GridItem span={3}>
            <Link to="/schwachstellen?severity=4&fixable=true" style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
              <StatCard
                label={t("dashboard.fixableCriticalCves")}
                value={data.stat_fixable_critical_cves}
                color="#c9190b"
              />
            </Link>
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
            <Link to="/risikoakzeptanzen?status=requested" style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
              <StatCard
                label={t("dashboard.openRiskAcceptances")}
                value={data.stat_open_risk_acceptances}
                color={
                  data.stat_open_risk_acceptances > 0 ? "#ec7a08" : undefined
                }
              />
            </Link>
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

          {/* EPSS Risk Matrix + Risk Acceptance Pipeline + Charts */}
          {data.epss_matrix.length > 0 && (
            <GridItem span={isSecTeam ? 8 : 12}>
              <Card>
                <CardTitle>{t('dashboard.epssMatrix')}</CardTitle>
                <CardBody>
                  <p style={{ fontSize: 12, color: 'var(--pf-v6-global--Color--200)', marginBottom: 8 }}>
                    {t('dashboard.epssMatrixDescription')}
                  </p>
                  <EpssRiskMatrix
                    data={data.epss_matrix}
                    onDotClick={(cveId) => navigate(`/schwachstellen/${cveId}`)}
                  />
                </CardBody>
              </Card>
            </GridItem>
          )}

          {isSecTeam && (
            <GridItem span={data.epss_matrix.length > 0 ? 4 : 4}>
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

          <GridItem span={6}>
            <Card style={{ height: "100%" }}>
              <CardTitle>{t("dashboard.severityDistribution")}</CardTitle>
              <CardBody>
                <SeverityDonut
                  data={data.severity_distribution}
                  onSegmentClick={(severity) => navigate(`/schwachstellen?severity=${severity}`)}
                />
              </CardBody>
            </Card>
          </GridItem>

          {/* Fixability Breakdown Donut — side by side with severity */}
          {(data.fixability_breakdown.fixable > 0 || data.fixability_breakdown.unfixable > 0) && (
            <GridItem span={6}>
              <Card style={{ height: '100%' }}>
                <CardTitle>{t('dashboard.fixabilityBreakdown')}</CardTitle>
                <CardBody>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Behebbar', value: data.fixability_breakdown.fixable, fixable: 'true' },
                          { name: 'Nicht behebbar', value: data.fixability_breakdown.unfixable, fixable: 'false' },
                        ]}
                        innerRadius={60}
                        outerRadius={90}
                        dataKey="value"
                        nameKey="name"
                        style={{ cursor: 'pointer' }}
                        onClick={(entry) => navigate(`/schwachstellen?fixable=${entry.fixable}`)}
                      >
                        <Cell fill="#1e8f19" />
                        <Cell fill="#c9190b" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
            </GridItem>
          )}

          {/* Fixable Trend (Stacked Area) */}
          {data.fixable_trend.length > 0 && (
            <GridItem span={12}>
              <Card>
                <CardTitle>{t('dashboard.fixableTrend')}</CardTitle>
                <CardBody>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={data.fixable_trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="fixable" name="Behebbar" stackId="1" fill="#1e8f19" stroke="#1e8f19" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="unfixable" name="Nicht behebbar" stackId="1" fill="#c9190b" stroke="#c9190b" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
            </GridItem>
          )}

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
                            <td
                              style={{ padding: '8px 12px', fontFamily: 'monospace', cursor: 'pointer' }}
                              onClick={() => navigate(`/schwachstellen?cluster=${encodeURIComponent(row.cluster)}`)}
                            >
                              {row.cluster}
                            </td>
                            {heatmapCols.map(col => {
                              const val = row[col]
                              const bgAlpha = val > 0 ? Math.min(0.3 + val / 50, 1) : 0
                              return (
                                <td
                                  key={col}
                                  style={{
                                    padding: '8px 12px',
                                    textAlign: 'right',
                                    background: val > 0 ? `rgba(${heatmapRgb[col]},${bgAlpha})` : 'transparent',
                                    color: val > 0 ? '#151515' : 'inherit',
                                    cursor: val > 0 ? 'pointer' : 'default',
                                  }}
                                  onClick={val > 0 ? () => navigate(`/schwachstellen?severity=${heatmapSeverityIndex[col]}&cluster=${encodeURIComponent(row.cluster)}`) : undefined}
                                >
                                  {val > 0 ? val : '–'}
                                </td>
                              )
                            })}
                            <td
                              style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, cursor: 'pointer' }}
                              onClick={() => navigate(`/schwachstellen?cluster=${encodeURIComponent(row.cluster)}`)}
                            >
                              {row.total}
                            </td>
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
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.aging_distribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        name="CVEs"
                        fill="#0066cc"
                        style={{ cursor: 'pointer' }}
                        onClick={(entry) => {
                          const bucket = entry.bucket as string
                          const ranges: Record<string, [number, number | undefined]> = {
                            '0-7 Tage': [0, 7],
                            '8-30 Tage': [8, 30],
                            '31-90 Tage': [31, 90],
                            '91-180 Tage': [91, 180],
                            '>180 Tage': [181, undefined],
                          }
                          const range = ranges[bucket]
                          if (!range) return
                          const params = new URLSearchParams()
                          params.set('age_min', String(range[0]))
                          if (range[1] !== undefined) params.set('age_max', String(range[1]))
                          navigate(`/schwachstellen?${params.toString()}`)
                        }}
                      >
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

          {/* Bar charts at bottom */}

          {/* CVEs per Namespace */}
          {data.cves_per_namespace.length > 0 && (
            <GridItem span={12}>
              <Card>
                <CardTitle>{t("dashboard.cvesPerNamespace")}</CardTitle>
                <CardBody>
                  <ResponsiveContainer width="100%" height={data.cves_per_namespace.slice(0, 10).length * 40 + 20}>
                    <BarChart
                      data={data.cves_per_namespace.slice(0, 10)}
                      layout="vertical"
                      margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="namespace"
                        tick={{ fontSize: 11 }}
                        width={200}
                        interval={0}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        name="CVEs"
                        fill="#0066cc"
                        style={{ cursor: 'pointer' }}
                        onClick={(entry) => navigate(`/schwachstellen?namespace=${encodeURIComponent(entry.namespace)}`)}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
            </GridItem>
          )}

          {/* Top Affected Deployments */}
          {data.top_affected_deployments.length > 0 && (
            <GridItem span={12}>
              <Card>
                <CardTitle>{t('dashboard.topAffectedDeployments')}</CardTitle>
                <CardBody>
                  <ResponsiveContainer width="100%" height={data.top_affected_deployments.length * 40 + 20}>
                    <BarChart
                      data={data.top_affected_deployments}
                      layout="vertical"
                      margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="deployment_name"
                        tick={{ fontSize: 11 }}
                        width={200}
                        interval={0}
                      />
                      <Tooltip
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: number, _name: string, props: any) => [
                          `${value} CVEs (${props?.payload?.namespace ?? ''} / ${props?.payload?.cluster_name ?? ''})`,
                          'CVEs',
                        ]}
                      />
                      <Bar
                        dataKey="cve_count"
                        name="CVEs"
                        fill="#0066cc"
                        style={{ cursor: 'pointer' }}
                        onClick={(entry) => {
                          const params = new URLSearchParams()
                          params.set('deployment', entry.deployment_name)
                          if (entry.namespace) params.set('namespace', entry.namespace)
                          if (entry.cluster_name) params.set('cluster', entry.cluster_name)
                          navigate(`/schwachstellen?${params.toString()}`)
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
            </GridItem>
          )}

          {/* Top Vulnerable Components */}
          {data.top_vulnerable_components.length > 0 && (
            <GridItem span={12}>
              <Card>
                <CardTitle>{t('dashboard.topVulnerableComponents')}</CardTitle>
                <CardBody>
                  <ResponsiveContainer width="100%" height={data.top_vulnerable_components.length * 40 + 20}>
                    <BarChart
                      data={data.top_vulnerable_components}
                      layout="vertical"
                      margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="component_name"
                        tick={{ fontSize: 11 }}
                        width={200}
                        interval={0}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="cve_count"
                        name="CVEs"
                        fill="#0066cc"
                        style={{ cursor: 'pointer' }}
                        onClick={(entry) => navigate(`/schwachstellen?component=${encodeURIComponent(entry.component_name)}&advanced=1`)}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
            </GridItem>
          )}
        </Grid>
      </PageSection>
    </>
  );
}
