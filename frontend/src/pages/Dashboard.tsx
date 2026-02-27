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
} from '@patternfly/react-core'
import { getErrorMessage } from '../utils/errors'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useTeamDashboard } from '../api/dashboard'
import { CvesPerNamespace } from '../components/charts/CvesPerNamespace'
import { SeverityDonut } from '../components/charts/SeverityDonut'
import { TrendLine } from '../components/charts/TrendLine'
import { EpssBadge } from '../components/common/EpssBadge'
import { SeverityBadge } from '../components/common/SeverityBadge'

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card isCompact>
      <CardBody>
        <div style={{ fontSize: 28, fontWeight: 700, color: color ?? 'var(--pf-v6-global--Color--100)', lineHeight: 1.2 }}>
          {value}
        </div>
        <div style={{ fontSize: 13, color: 'var(--pf-v6-global--Color--200)', marginTop: 4 }}>{label}</div>
      </CardBody>
    </Card>
  )
}

export function Dashboard() {
  const { t } = useTranslation()
  const { data, isLoading, error } = useTeamDashboard()

  if (isLoading) return (
    <PageSection><Spinner aria-label="Laden" /></PageSection>
  )
  if (error) return (
    <PageSection><Alert variant="danger" title={`Fehler: ${getErrorMessage(error)}`} /></PageSection>
  )
  if (!data) return null

  return (
    <>
      <PageSection variant="default">
        <Title headingLevel="h1" size="xl">{t('dashboard.title')}</Title>
      </PageSection>

      <PageSection>
        <Grid hasGutter>
          {/* Stat cards */}
          <GridItem span={2}>
            <StatCard label={t('dashboard.totalCves')} value={data.stat_total_cves} />
          </GridItem>
          <GridItem span={2}>
            <StatCard label={t('dashboard.criticalCves')} value={data.stat_critical_cves} color="#c9190b" />
          </GridItem>
          <GridItem span={2}>
            <StatCard label={t('dashboard.fixableCves')} value={data.stat_fixable_cves} color="#1e8f19" />
          </GridItem>
          <GridItem span={3}>
            <StatCard
              label={t('dashboard.openRiskAcceptances')}
              value={data.stat_open_risk_acceptances}
              color={data.stat_open_risk_acceptances > 0 ? '#ec7a08' : undefined}
            />
          </GridItem>
          <GridItem span={3}>
            <StatCard
              label={t('dashboard.avgEpss')}
              value={`${(data.stat_avg_epss * 100).toFixed(1)}%`}
              color={data.stat_avg_epss >= 0.1 ? '#ec7a08' : '#1e8f19'}
            />
          </GridItem>

          {/* EPSS Highlight Zone */}
          {data.high_epss_cves.length > 0 && (
            <GridItem span={12}>
              <Alert
                variant="warning"
                isInline
                title={t('dashboard.highEpss')}
              >
                <p style={{ marginBottom: 8, fontSize: 13 }}>{t('dashboard.highEpssDescription')}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {data.high_epss_cves.map(cve => (
                    <Link
                      key={cve.cve_id}
                      to={`/schwachstellen/${cve.cve_id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        background: 'var(--pf-v6-global--BackgroundColor--100)',
                        border: '1px solid #f0ab00',
                        borderRadius: 4,
                        textDecoration: 'none',
                        color: 'var(--pf-v6-global--Color--100)',
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
            <Card>
              <CardTitle>{t('dashboard.severityDistribution')}</CardTitle>
              <CardBody>
                <SeverityDonut data={data.severity_distribution} />
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={6}>
            <Card>
              <CardTitle>{t('dashboard.cvesPerNamespace')}</CardTitle>
              <CardBody>
                <CvesPerNamespace data={data.cves_per_namespace} />
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={12}>
            <Card>
              <CardTitle>{t('dashboard.trend')}</CardTitle>
              <CardBody>
                <TrendLine data={data.cve_trend} />
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </PageSection>
    </>
  )
}
