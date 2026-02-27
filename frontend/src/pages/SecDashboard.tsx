import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  PageSection,
  ProgressStep,
  Slider,
  Spinner,
  Title,
} from '@patternfly/react-core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { useUpdateSettings } from '../api/settings'
import { EpssRiskMatrix } from '../components/charts/EpssRiskMatrix'

const SEVERITY_LABELS = ['Unbekannt', 'Niedrig', 'Mittel', 'Wichtig', 'Kritisch']

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card isCompact>
      <CardBody>
        <div style={{ fontSize: 28, fontWeight: 700, color: color ?? '#151515' }}>{value}</div>
        <div style={{ fontSize: 13, color: '#6a6e73', marginTop: 4 }}>{label}</div>
      </CardBody>
    </Card>
  )
}

export function SecDashboard() {
  const { t } = useTranslation()
  const { data, isLoading, error } = useSecDashboard()
  const updateSettings = useUpdateSettings()
  const [minCvss, setMinCvss] = useState<number | null>(null)
  const [minEpss, setMinEpss] = useState<number | null>(null)

  if (isLoading) return <PageSection><Spinner aria-label="Laden" /></PageSection>
  if (error) return <PageSection><Alert variant="danger" title={`Fehler: ${(error as Error).message}`} /></PageSection>
  if (!data) return null

  const cvssVal = minCvss ?? 0
  const epssVal = minEpss ?? 0
  const preview = data.threshold_preview

  const heatmapCols = ['unknown', 'low', 'moderate', 'important', 'critical'] as const
  const heatmapColors = { unknown: '#d2d2d2', low: '#bee1f4', moderate: '#f9e0a2', important: '#f4b678', critical: '#f9b9b7' }

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
          <GridItem span={3}><StatCard label={t('secDashboard.totalTeams')} value={data.total_teams} /></GridItem>

          {/* EPSS Risk Matrix */}
          <GridItem span={8}>
            <Card>
              <CardTitle>{t('secDashboard.epssMatrix')}</CardTitle>
              <CardBody>
                <p style={{ fontSize: 12, color: '#6a6e73', marginBottom: 8 }}>{t('secDashboard.epssMatrixDescription')}</p>
                <EpssRiskMatrix data={data.epss_matrix} />
              </CardBody>
            </Card>
          </GridItem>

          {/* Risk Acceptance Pipeline */}
          <GridItem span={4}>
            <Card style={{ height: '100%' }}>
              <CardTitle>{t('secDashboard.pipeline')}</CardTitle>
              <CardBody>
                {(['requested', 'approved', 'rejected', 'expired'] as const).map(status => {
                  const labels: Record<string, string> = {
                    requested: 'Beantragt', approved: 'Genehmigt', rejected: 'Abgelehnt', expired: 'Abgelaufen'
                  }
                  const colors: Record<string, string> = {
                    requested: '#0066cc', approved: '#1e8f19', rejected: '#c9190b', expired: '#8a8d90'
                  }
                  return (
                    <div key={status} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <span style={{ fontSize: 13 }}>{labels[status]}</span>
                      <Badge style={{ background: colors[status], color: '#fff', padding: '2px 8px' }}>
                        {data.risk_acceptance_pipeline[status]}
                      </Badge>
                    </div>
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
                      <tr style={{ background: '#f0f0f0' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Cluster</th>
                        {SEVERITY_LABELS.map(l => <th key={l} style={{ padding: '8px 12px', textAlign: 'right' }}>{l}</th>)}
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>Gesamt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.cluster_heatmap.map(row => (
                        <tr key={row.cluster} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{row.cluster}</td>
                          {heatmapCols.map(col => {
                            const val = row[col]
                            const opacity = val > 0 ? Math.min(0.2 + val / 50, 1) : 0
                            return (
                              <td key={col} style={{ padding: '8px 12px', textAlign: 'right', background: val > 0 ? heatmapColors[col] : 'transparent', opacity: val > 0 ? opacity + 0.3 : 1 }}>
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

          {/* Team Scoreboard */}
          <GridItem span={12}>
            <Card>
              <CardTitle>{t('secDashboard.teamScoreboard')}</CardTitle>
              <CardBody>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f0f0f0' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Team</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>CVEs</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Kritisch</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Ø EPSS</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Überfällig</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Off. Akzeptanzen</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Risiko-Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.team_scoreboard.map(row => (
                      <tr key={row.team_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.team_name}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row.total_cves}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: row.critical_cves > 0 ? '#c9190b' : 'inherit', fontWeight: row.critical_cves > 0 ? 700 : 400 }}>
                          {row.critical_cves}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                          {(row.avg_epss * 100).toFixed(1)}%
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: row.overdue_items > 0 ? '#c9190b' : 'inherit' }}>
                          {row.overdue_items}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row.open_risk_acceptances}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                            <div style={{ width: 60, height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${row.risk_score}%`, height: '100%', background: row.risk_score > 70 ? '#c9190b' : row.risk_score > 40 ? '#ec7a08' : '#1e8f19', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontWeight: 700, color: row.risk_score > 70 ? '#c9190b' : row.risk_score > 40 ? '#ec7a08' : '#1e8f19' }}>
                              {row.risk_score.toFixed(0)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          </GridItem>

          {/* Fixability by team */}
          <GridItem span={6}>
            <Card>
              <CardTitle>{t('secDashboard.fixability')}</CardTitle>
              <CardBody>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.fixability_by_team} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="team_name" width={80} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="fixable" name="Behebbar" stackId="a" fill="#1e8f19" />
                    <Bar dataKey="unfixable" name="Nicht behebbar" stackId="a" fill="#8a8d90" />
                  </BarChart>
                </ResponsiveContainer>
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

          {/* Threshold configuration */}
          <GridItem span={12}>
            <Card>
              <CardTitle>{t('secDashboard.thresholdConfig')}</CardTitle>
              <CardBody>
                <p style={{ fontSize: 13, color: '#6a6e73', marginBottom: 16 }}>{t('secDashboard.thresholdDescription')}</p>
                <Grid hasGutter>
                  <GridItem span={5}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>{t('secDashboard.minCvss')}: {cvssVal.toFixed(1)}</label>
                    <input
                      type="range" min={0} max={10} step={0.1}
                      value={cvssVal}
                      onChange={e => setMinCvss(parseFloat(e.target.value))}
                      style={{ width: '100%', marginTop: 8 }}
                    />
                  </GridItem>
                  <GridItem span={5}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>{t('secDashboard.minEpss')}: {(epssVal * 100).toFixed(1)}%</label>
                    <input
                      type="range" min={0} max={1} step={0.01}
                      value={epssVal}
                      onChange={e => setMinEpss(parseFloat(e.target.value))}
                      style={{ width: '100%', marginTop: 8 }}
                    />
                  </GridItem>
                  <GridItem span={2}>
                    <button
                      onClick={() => updateSettings.mutate({
                        min_cvss_score: cvssVal,
                        min_epss_score: epssVal,
                        escalation_rules: [],
                        digest_day: 0,
                        management_email: '',
                      })}
                      style={{ marginTop: 24, padding: '6px 16px', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    >
                      {t('common.save')}
                    </button>
                  </GridItem>
                </Grid>
                <div style={{ marginTop: 12, fontSize: 13, color: '#6a6e73' }}>
                  {t('secDashboard.preview', {
                    visible: preview.visible_cves,
                    total: preview.total_cves,
                  })}
                  {' '}({preview.hidden_cves} ausgeblendet)
                </div>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </PageSection>
    </>
  )
}
