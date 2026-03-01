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
} from '@patternfly/react-core'
import { getErrorMessage } from '../utils/errors'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
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
import { useSecDashboard } from '../api/dashboard'
import { EpssRiskMatrix } from '../components/charts/EpssRiskMatrix'

const SEVERITY_LABELS = ['Unbekannt', 'Niedrig', 'Mittel', 'Wichtig', 'Kritisch']

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card isCompact>
      <CardBody>
        <div style={{ fontSize: 28, fontWeight: 700, color: color ?? 'var(--pf-v6-global--Color--100)' }}>{value}</div>
        <div style={{ fontSize: 13, color: 'var(--pf-v6-global--Color--200)', marginTop: 4 }}>{label}</div>
      </CardBody>
    </Card>
  )
}

export function SecDashboard() {
  const { t } = useTranslation()
  const { data, isLoading, error } = useSecDashboard()

  if (isLoading) return <PageSection><Spinner aria-label="Laden" /></PageSection>
  if (error) return <PageSection><Alert variant="danger" title={`Fehler: ${getErrorMessage(error)}`} /></PageSection>
  if (!data) return null

  const heatmapCols = ['unknown', 'low', 'moderate', 'important', 'critical'] as const
  // RGB triplets — used to build rgba() so only the background fades, not the text
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
        <Title headingLevel="h1" size="xl">{t('secDashboard.title')}</Title>
      </PageSection>

      <PageSection>
        <Grid hasGutter>
          {/* Top stats */}
          <GridItem span={3}><StatCard label={t('secDashboard.totalCves')} value={data.total_cves} /></GridItem>
          <GridItem span={3}><StatCard label={t('secDashboard.criticalCves')} value={data.total_critical} color="#c9190b" /></GridItem>
          <GridItem span={3}><StatCard label={t('secDashboard.avgEpss')} value={`${(data.avg_epss * 100).toFixed(1)}%`} /></GridItem>
          <GridItem span={3}><StatCard label={t('secDashboard.cvesLast7Days')} value={data.cves_last_7_days} color={data.cves_last_7_days > 0 ? '#ec7a08' : undefined} /></GridItem>

          {/* EPSS Risk Matrix */}
          <GridItem span={8}>
            <Card>
              <CardTitle>{t('secDashboard.epssMatrix')}</CardTitle>
              <CardBody>
                <p style={{ fontSize: 12, color: 'var(--pf-v6-global--Color--200)', marginBottom: 8 }}>{t('secDashboard.epssMatrixDescription')}</p>
                <EpssRiskMatrix data={data.epss_matrix} />
              </CardBody>
            </Card>
          </GridItem>

          {/* Risk Acceptance Pipeline */}
          <GridItem span={4}>
            <Card style={{ height: '100%' }}>
              <CardTitle>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span>{t('secDashboard.pipeline')}</span>
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

          {/* Cluster Heatmap */}
          <GridItem span={12}>
            <Card>
              <CardTitle>{t('secDashboard.clusterHeatmap')}</CardTitle>
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

          {/* Aging distribution */}
          <GridItem span={6}>
            <Card>
              <CardTitle>{t('secDashboard.aging')}</CardTitle>
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

          {/* Link to threshold settings */}
          <GridItem span={12}>
            <Card>
              <CardTitle>{t('secDashboard.thresholdConfig')}</CardTitle>
              <CardBody>
                <p style={{ fontSize: 13, color: 'var(--pf-v6-global--Color--200)', marginBottom: 8 }}>
                  {t('secDashboard.thresholdDescription')}
                </p>
                <Link to="/einstellungen">{t('nav.settings')}</Link>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </PageSection>
    </>
  )
}
