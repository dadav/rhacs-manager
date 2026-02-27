import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  Label,
  PageSection,
  Spinner,
  Title,
} from '@patternfly/react-core'
import { useNavigate, useParams } from 'react-router-dom'
import { useCveDetail } from '../api/cves'
import { EpssBadge } from '../components/common/EpssBadge'
import { SeverityBadge } from '../components/common/SeverityBadge'
import { RiskStatus } from '../types'

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr>
      <td style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, color: '#6a6e73', width: 200 }}>{label}</td>
      <td style={{ padding: '8px 12px', fontSize: 13 }}>{value}</td>
    </tr>
  )
}

const STATUS_COLORS: Record<RiskStatus, string> = {
  [RiskStatus.requested]: '#0066cc',
  [RiskStatus.approved]: '#1e8f19',
  [RiskStatus.rejected]: '#c9190b',
  [RiskStatus.expired]: '#8a8d90',
}

const STATUS_LABELS: Record<RiskStatus, string> = {
  [RiskStatus.requested]: 'Beantragt',
  [RiskStatus.approved]: 'Genehmigt',
  [RiskStatus.rejected]: 'Abgelehnt',
  [RiskStatus.expired]: 'Abgelaufen',
}

export function CveDetail() {
  const { cveId } = useParams<{ cveId: string }>()
  const navigate = useNavigate()
  const { data: cve, isLoading, error } = useCveDetail(cveId ?? '')

  if (isLoading) return <PageSection><Spinner aria-label="Laden" /></PageSection>
  if (error) return <PageSection><Alert variant="danger" title={`Fehler: ${(error as Error).message}`} /></PageSection>
  if (!cve) return null

  return (
    <>
      <PageSection variant="default">
        <Breadcrumb>
          <BreadcrumbItem onClick={() => navigate('/schwachstellen')} style={{ cursor: 'pointer' }}>
            Schwachstellen
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{cve.cve_id}</BreadcrumbItem>
        </Breadcrumb>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <Title headingLevel="h1" size="xl" style={{ fontFamily: 'monospace' }}>{cve.cve_id}</Title>
          <SeverityBadge severity={cve.severity} />
          {cve.has_priority && (
            <Label color="orange" isCompact>PRIORISIERT</Label>
          )}
          {cve.has_risk_acceptance && cve.risk_acceptance_status && (
            <Label
              isCompact
              style={{ background: STATUS_COLORS[cve.risk_acceptance_status], color: '#fff' }}
            >
              {STATUS_LABELS[cve.risk_acceptance_status]}
            </Label>
          )}
        </div>
      </PageSection>

      <PageSection>
        <Grid hasGutter>
          {/* Core details */}
          <GridItem span={6}>
            <Card>
              <CardTitle>Details</CardTitle>
              <CardBody style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <DetailRow label="CVE-ID" value={<span style={{ fontFamily: 'monospace' }}>{cve.cve_id}</span>} />
                    <DetailRow label="Schweregrad" value={<SeverityBadge severity={cve.severity} />} />
                    <DetailRow label="CVSS" value={
                      <span style={{ fontWeight: cve.cvss >= 9 ? 700 : 400, color: cve.cvss >= 9 ? '#c9190b' : 'inherit' }}>
                        {cve.cvss.toFixed(1)}
                      </span>
                    } />
                    <DetailRow label="EPSS" value={<EpssBadge value={cve.epss_probability} />} />
                    <DetailRow label="Behebbar" value={
                      cve.fixable
                        ? <span style={{ color: '#1e8f19' }}>✓ Ja</span>
                        : <span style={{ color: '#8a8d90' }}>✗ Nein</span>
                    } />
                    {cve.fixed_by && <DetailRow label="Fix-Version" value={<span style={{ fontFamily: 'monospace', fontSize: 11 }}>{cve.fixed_by}</span>} />}
                    <DetailRow label="Erstmals gesehen" value={
                      cve.first_seen ? new Date(cve.first_seen).toLocaleDateString('de-DE') : '–'
                    } />
                    {cve.operating_system && <DetailRow label="Betriebssystem" value={cve.operating_system} />}
                    {cve.priority_level && <DetailRow label="Priorität" value={cve.priority_level} />}
                    {cve.priority_deadline && (
                      <DetailRow label="Deadline" value={new Date(cve.priority_deadline).toLocaleDateString('de-DE')} />
                    )}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          </GridItem>

          {/* Actions */}
          <GridItem span={6}>
            <Card>
              <CardTitle>Aktionen</CardTitle>
              <CardBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {!cve.has_risk_acceptance ? (
                    <Button
                      variant="primary"
                      onClick={() => navigate(`/risikoakzeptanzen/neu?cve=${cve.cve_id}`)}
                    >
                      Risikoakzeptanz beantragen
                    </Button>
                  ) : (
                    <div>
                      <p style={{ fontSize: 13, color: '#6a6e73', marginBottom: 8 }}>
                        Risikoakzeptanz vorhanden (Status: {cve.risk_acceptance_status && STATUS_LABELS[cve.risk_acceptance_status]})
                      </p>
                      {cve.risk_acceptance_id && (
                        <Button
                          variant="secondary"
                          onClick={() => navigate(`/risikoakzeptanzen/${cve.risk_acceptance_id}`)}
                        >
                          Zur Risikoakzeptanz
                        </Button>
                      )}
                    </div>
                  )}
                  <Button variant="link" onClick={() => navigate('/schwachstellen')}>
                    Zurück zur Liste
                  </Button>
                </div>
              </CardBody>
            </Card>
          </GridItem>

          {/* Affected components */}
          {cve.components.length > 0 && (
            <GridItem span={12}>
              <Card>
                <CardTitle>Betroffene Komponenten ({cve.components.length})</CardTitle>
                <CardBody style={{ padding: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f0f0f0' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Komponente</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Version</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Behebbar</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Fix-Version</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cve.components.map((c, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{c.component_name}</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11 }}>{c.component_version}</td>
                          <td style={{ padding: '8px 12px' }}>
                            {c.fixable
                              ? <span style={{ color: '#1e8f19' }}>✓</span>
                              : <span style={{ color: '#8a8d90' }}>✗</span>}
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11 }}>{c.fixed_by ?? '–'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardBody>
              </Card>
            </GridItem>
          )}

          {/* Affected deployments */}
          {cve.affected_deployments_list.length > 0 && (
            <GridItem span={12}>
              <Card>
                <CardTitle>Betroffene Deployments ({cve.affected_deployments_list.length})</CardTitle>
                <CardBody style={{ padding: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f0f0f0' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Deployment</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Namespace</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Cluster</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Image</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cve.affected_deployments_list.map(d => (
                        <tr key={d.deployment_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11 }}>{d.deployment_name}</td>
                          <td style={{ padding: '8px 12px' }}>{d.namespace}</td>
                          <td style={{ padding: '8px 12px', fontSize: 11 }}>{d.cluster_name}</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11 }}>{d.image_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardBody>
              </Card>
            </GridItem>
          )}
        </Grid>
      </PageSection>
    </>
  )
}
