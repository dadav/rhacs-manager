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
  PageSection,
  Spinner,
  TextArea,
  Title,
} from '@patternfly/react-core'
import { getErrorMessage } from '../utils/errors'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAddComment, useCreateRiskAcceptance, useReviewRiskAcceptance, useRiskAcceptance, useRiskComments } from '../api/riskAcceptances'
import { useCurrentUser } from '../api/auth'
import { RiskStatus } from '../types'

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

function NewRiskAcceptanceForm({ cveId }: { cveId: string }) {
  const navigate = useNavigate()
  const createRA = useCreateRiskAcceptance()
  const [justification, setJustification] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!justification.trim()) { setError('Begründung erforderlich.'); return }
    try {
      const ra = await createRA.mutateAsync({
        cve_id: cveId,
        justification,
        scope: {},
        expires_at: expiresAt || null,
      })
      navigate(`/risikoakzeptanzen/${ra.id}`)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <>
      <PageSection variant="default">
        <Breadcrumb>
          <BreadcrumbItem onClick={() => navigate('/risikoakzeptanzen')} style={{ cursor: 'pointer' }}>
            Risikoakzeptanzen
          </BreadcrumbItem>
          <BreadcrumbItem isActive>Neu</BreadcrumbItem>
        </Breadcrumb>
        <Title headingLevel="h1" size="xl" style={{ marginTop: 8 }}>Risikoakzeptanz beantragen</Title>
      </PageSection>
      <PageSection>
        <Card style={{ maxWidth: 640 }}>
          <CardBody>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>CVE-ID</label>
                <div style={{ fontFamily: 'monospace', marginTop: 4, color: '#0066cc' }}>{cveId}</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Begründung *</label>
                <TextArea
                  value={justification}
                  onChange={(_, v) => setJustification(v)}
                  rows={5}
                  style={{ marginTop: 4 }}
                  placeholder="Warum ist dieses Risiko akzeptabel?"
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Ablaufdatum (optional)</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                  style={{ display: 'block', marginTop: 4, height: 36, padding: '0 8px', border: '1px solid #d2d2d2', borderRadius: 4 }}
                />
              </div>
              {error && <Alert variant="danger" isInline title={error} style={{ marginBottom: 12 }} />}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button type="submit" variant="primary" isLoading={createRA.isPending}>
                  Beantragen
                </Button>
                <Button variant="link" onClick={() => navigate('/risikoakzeptanzen')}>
                  Abbrechen
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </PageSection>
    </>
  )
}

export function RiskAcceptanceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // New form mode
  if (id === 'neu') {
    const cveId = searchParams.get('cve') ?? ''
    return <NewRiskAcceptanceForm cveId={cveId} />
  }

  return <RiskAcceptanceView id={id ?? ''} />
}

function RiskAcceptanceView({ id }: { id: string }) {
  const navigate = useNavigate()
  const { data: ra, isLoading, error } = useRiskAcceptance(id)
  const { data: comments } = useRiskComments(id)
  const { data: me } = useCurrentUser()
  const addComment = useAddComment(id)
  const review = useReviewRiskAcceptance(id)
  const [newComment, setNewComment] = useState('')
  const [reviewError, setReviewError] = useState('')

  if (isLoading) return <PageSection><Spinner aria-label="Laden" /></PageSection>
  if (error) return <PageSection><Alert variant="danger" title={`Fehler: ${getErrorMessage(error)}`} /></PageSection>
  if (!ra) return null

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim()) return
    await addComment.mutateAsync(newComment)
    setNewComment('')
  }

  async function handleReview(approved: boolean) {
    try {
      await review.mutateAsync({ approved })
      setReviewError('')
    } catch (err) {
      setReviewError(getErrorMessage(err))
    }
  }

  return (
    <>
      <PageSection variant="default">
        <Breadcrumb>
          <BreadcrumbItem onClick={() => navigate('/risikoakzeptanzen')} style={{ cursor: 'pointer' }}>
            Risikoakzeptanzen
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{ra.cve_id}</BreadcrumbItem>
        </Breadcrumb>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <Title headingLevel="h1" size="xl" style={{ fontFamily: 'monospace' }}>{ra.cve_id}</Title>
          <span style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: 3,
            background: STATUS_COLORS[ra.status],
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
          }}>
            {STATUS_LABELS[ra.status]}
          </span>
        </div>
      </PageSection>

      <PageSection>
        <Grid hasGutter>
          {/* Details */}
          <GridItem span={6}>
            <Card>
              <CardTitle>Details</CardTitle>
              <CardBody style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {([
                      ['CVE-ID', <span style={{ fontFamily: 'monospace', color: '#0066cc' }}>{ra.cve_id}</span>],
                      ['Team', ra.team_name],
                      ['Beantragt von', ra.created_by_name],
                      ['Beantragt am', new Date(ra.created_at).toLocaleDateString('de-DE')],
                      ['Läuft ab', ra.expires_at ? new Date(ra.expires_at).toLocaleDateString('de-DE') : '–'],
                      ra.reviewed_by_name ? ['Bearbeitet von', ra.reviewed_by_name] : null,
                      ra.reviewed_at ? ['Bearbeitet am', new Date(ra.reviewed_at).toLocaleDateString('de-DE')] : null,
                    ] as ([string, React.ReactNode] | null)[]).filter((row): row is [string, React.ReactNode] => row !== null).map(([label, value], i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--pf-t--global--border--color--default)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, color: 'var(--pf-t--global--text--color--subtle)', width: 160 }}>{label}</td>
                        <td style={{ padding: '8px 12px', fontSize: 13 }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          </GridItem>

          {/* Justification + Actions */}
          <GridItem span={6}>
            <Card style={{ marginBottom: 16 }}>
              <CardTitle>Begründung</CardTitle>
              <CardBody>
                <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{ra.justification}</p>
              </CardBody>
            </Card>

            {/* Sec team review actions */}
            {me?.is_sec_team && ra.status === RiskStatus.requested && (
              <Card>
                <CardTitle>Überprüfen</CardTitle>
                <CardBody>
                  {reviewError && <Alert variant="danger" isInline title={reviewError} style={{ marginBottom: 12 }} />}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      variant="primary"
                      onClick={() => handleReview(true)}
                      isLoading={review.isPending}
                    >
                      Genehmigen
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleReview(false)}
                      isLoading={review.isPending}
                    >
                      Ablehnen
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )}
          </GridItem>

          {/* Comment thread */}
          <GridItem span={12}>
            <Card>
              <CardTitle>Kommentare ({comments?.length ?? 0})</CardTitle>
              <CardBody>
                {comments && comments.length > 0 ? (
                  <div style={{ marginBottom: 20 }}>
                    {comments.map(c => (
                      <div
                        key={c.id}
                        style={{
                          padding: 12,
                          marginBottom: 10,
                          background: 'var(--pf-t--global--background--color--secondary--default)',
                          borderLeft: `3px solid ${c.is_sec_team ? 'var(--pf-t--global--color--blue--default)' : 'var(--pf-t--global--border--color--default)'}`,
                          borderRadius: '0 4px 4px 0',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: c.is_sec_team ? 'var(--pf-t--global--color--blue--default)' : 'var(--pf-t--global--text--color--regular)' }}>
                            {c.username}
                            {c.is_sec_team && (
                              <span style={{ marginLeft: 6, fontSize: 10, background: '#0066cc', color: '#fff', padding: '1px 5px', borderRadius: 3 }}>
                                SEC
                              </span>
                            )}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--pf-t--global--text--color--subtle)' }}>
                            {new Date(c.created_at).toLocaleString('de-DE')}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{c.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--pf-t--global--text--color--subtle)', marginBottom: 16 }}>Noch keine Kommentare.</p>
                )}

                {/* Add comment form */}
                <form onSubmit={handleAddComment}>
                  <TextArea
                    value={newComment}
                    onChange={(_, v) => setNewComment(v)}
                    rows={3}
                    placeholder="Kommentar hinzufügen..."
                    style={{ marginBottom: 8 }}
                  />
                  <Button type="submit" variant="secondary" isLoading={addComment.isPending} isDisabled={!newComment.trim()}>
                    Kommentar senden
                  </Button>
                </form>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </PageSection>
    </>
  )
}
