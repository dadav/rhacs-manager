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
import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAddComment, useCancelRiskAcceptance, useCreateRiskAcceptance, useReviewRiskAcceptance, useRiskAcceptance, useRiskComments, useUpdateRiskAcceptance } from '../api/riskAcceptances'
import { useCurrentUser } from '../api/auth'
import { useCveDetail } from '../api/cves'
import { RiskScope, RiskScopeMode, RiskStatus } from '../types'

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

const SCOPE_MODE_LABELS: Record<RiskScopeMode, string> = {
  all: 'Alle betroffenen Vorkommen',
  namespace: 'Nur ausgewählte Namespaces',
  image: 'Nur ausgewählte Images',
  deployment: 'Nur ausgewählte Deployments',
}

function NewRiskAcceptanceForm({ cveId }: { cveId: string }) {
  const navigate = useNavigate()
  const createRA = useCreateRiskAcceptance()
  const { data: cve, isLoading: isCveLoading, error: cveError } = useCveDetail(cveId)
  const [justification, setJustification] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [scopeMode, setScopeMode] = useState<RiskScopeMode>('all')
  const [selectedTargets, setSelectedTargets] = useState<string[]>([])
  const [error, setError] = useState('')

  const deployments = cve?.affected_deployments_list ?? []
  const namespaces = useMemo(
    () => Object.values(Object.fromEntries(
      deployments.map((d) => [
        `${d.cluster_name}::${d.namespace}`,
        { cluster_name: d.cluster_name, namespace: d.namespace },
      ]),
    )).sort((a, b) => `${a.cluster_name}/${a.namespace}`.localeCompare(`${b.cluster_name}/${b.namespace}`)),
    [deployments],
  )
  const images = useMemo(
    () => Object.values(Object.fromEntries(
      deployments.map((d) => [
        `${d.cluster_name}::${d.namespace}::${d.image_name}`,
        { cluster_name: d.cluster_name, namespace: d.namespace, image_name: d.image_name },
      ]),
    )).sort((a, b) => `${a.cluster_name}/${a.namespace}/${a.image_name}`.localeCompare(`${b.cluster_name}/${b.namespace}/${b.image_name}`)),
    [deployments],
  )

  function toggleTarget(key: string) {
    setSelectedTargets((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    )
  }

  function buildScope(): RiskScope {
    if (scopeMode === 'all') {
      return { mode: 'all', targets: [] }
    }

    if (scopeMode === 'namespace') {
      const targets = namespaces
        .filter((ns) => selectedTargets.includes(`${ns.cluster_name}::${ns.namespace}`))
        .map((ns) => ({ cluster_name: ns.cluster_name, namespace: ns.namespace }))
      return { mode: 'namespace', targets }
    }

    if (scopeMode === 'image') {
      const targets = images
        .filter((img) => selectedTargets.includes(`${img.cluster_name}::${img.namespace}::${img.image_name}`))
        .map((img) => ({ cluster_name: img.cluster_name, namespace: img.namespace, image_name: img.image_name }))
      return { mode: 'image', targets }
    }

    const targets = deployments
      .filter((dep) => selectedTargets.includes(dep.deployment_id))
      .map((dep) => ({
        cluster_name: dep.cluster_name,
        namespace: dep.namespace,
        image_name: dep.image_name,
        deployment_id: dep.deployment_id,
      }))
    return { mode: 'deployment', targets }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!justification.trim()) { setError('Begründung erforderlich.'); return }
    if (!cveId) { setError('CVE-ID fehlt.'); return }
    if (scopeMode !== 'all' && selectedTargets.length === 0) {
      setError('Bitte mindestens ein Scope-Target auswählen.')
      return
    }
    try {
      const ra = await createRA.mutateAsync({
        cve_id: cveId,
        justification,
        scope: buildScope(),
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
            {isCveLoading && <Spinner aria-label="CVE laden" />}
            {cveError && <Alert variant="danger" isInline title={`Fehler: ${getErrorMessage(cveError)}`} style={{ marginBottom: 12 }} />}
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
                <label style={{ fontSize: 13, fontWeight: 600 }}>Scope *</label>
                <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                  {(Object.keys(SCOPE_MODE_LABELS) as RiskScopeMode[]).map((mode) => (
                    <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="radio"
                        name="scope-mode"
                        checked={scopeMode === mode}
                        onChange={() => {
                          setScopeMode(mode)
                          setSelectedTargets([])
                        }}
                      />
                      <span style={{ fontSize: 13 }}>{SCOPE_MODE_LABELS[mode]}</span>
                    </label>
                  ))}
                </div>
              </div>
              {scopeMode !== 'all' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Scope-Targets *</label>
                  <div style={{ marginTop: 8, maxHeight: 220, overflow: 'auto', border: '1px solid #d2d2d2', borderRadius: 4, padding: 10 }}>
                    {scopeMode === 'namespace' && namespaces.map((ns) => {
                      const key = `${ns.cluster_name}::${ns.namespace}`
                      return (
                        <label key={key} style={{ display: 'block', marginBottom: 6 }}>
                          <input type="checkbox" checked={selectedTargets.includes(key)} onChange={() => toggleTarget(key)} />
                          <span style={{ marginLeft: 8, fontSize: 12 }}>{ns.cluster_name}/{ns.namespace}</span>
                        </label>
                      )
                    })}
                    {scopeMode === 'image' && images.map((img) => {
                      const key = `${img.cluster_name}::${img.namespace}::${img.image_name}`
                      return (
                        <label key={key} style={{ display: 'block', marginBottom: 6 }}>
                          <input type="checkbox" checked={selectedTargets.includes(key)} onChange={() => toggleTarget(key)} />
                          <span style={{ marginLeft: 8, fontSize: 12 }}>{img.cluster_name}/{img.namespace} - {img.image_name}</span>
                        </label>
                      )
                    })}
                    {scopeMode === 'deployment' && deployments.map((dep) => (
                      <label key={dep.deployment_id} style={{ display: 'block', marginBottom: 6 }}>
                        <input
                          type="checkbox"
                          checked={selectedTargets.includes(dep.deployment_id)}
                          onChange={() => toggleTarget(dep.deployment_id)}
                        />
                        <span style={{ marginLeft: 8, fontSize: 12 }}>{dep.cluster_name}/{dep.namespace} - {dep.deployment_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
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

function EditRiskAcceptanceForm({ raId }: { raId: string }) {
  const navigate = useNavigate()
  const { data: ra, isLoading: isRaLoading, error: raError } = useRiskAcceptance(raId)
  const { data: cve, isLoading: isCveLoading, error: cveError } = useCveDetail(ra?.cve_id ?? '')
  const updateRA = useUpdateRiskAcceptance(raId)

  const [justification, setJustification] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [scopeMode, setScopeMode] = useState<RiskScopeMode>('all')
  const [selectedTargets, setSelectedTargets] = useState<string[]>([])
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState('')

  // Pre-fill form once RA data is loaded
  useMemo(() => {
    if (ra && !initialized) {
      setJustification(ra.justification)
      setScopeMode(ra.scope.mode)
      setExpiresAt(ra.expires_at ? ra.expires_at.split('T')[0] : '')

      if (ra.scope.mode === 'namespace') {
        setSelectedTargets(ra.scope.targets.map(t => `${t.cluster_name}::${t.namespace}`))
      } else if (ra.scope.mode === 'image') {
        setSelectedTargets(ra.scope.targets.map(t => `${t.cluster_name}::${t.namespace}::${t.image_name ?? ''}`))
      } else if (ra.scope.mode === 'deployment') {
        setSelectedTargets(ra.scope.targets.map(t => t.deployment_id ?? '').filter(Boolean))
      }

      setInitialized(true)
    }
  }, [ra, initialized])

  const deployments = cve?.affected_deployments_list ?? []
  const namespaces = useMemo(
    () => Object.values(Object.fromEntries(
      deployments.map((d) => [
        `${d.cluster_name}::${d.namespace}`,
        { cluster_name: d.cluster_name, namespace: d.namespace },
      ]),
    )).sort((a, b) => `${a.cluster_name}/${a.namespace}`.localeCompare(`${b.cluster_name}/${b.namespace}`)),
    [deployments],
  )
  const images = useMemo(
    () => Object.values(Object.fromEntries(
      deployments.map((d) => [
        `${d.cluster_name}::${d.namespace}::${d.image_name}`,
        { cluster_name: d.cluster_name, namespace: d.namespace, image_name: d.image_name },
      ]),
    )).sort((a, b) => `${a.cluster_name}/${a.namespace}/${a.image_name}`.localeCompare(`${b.cluster_name}/${b.namespace}/${b.image_name}`)),
    [deployments],
  )

  function toggleTarget(key: string) {
    setSelectedTargets((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    )
  }

  function buildScope(): RiskScope {
    if (scopeMode === 'all') return { mode: 'all', targets: [] }

    if (scopeMode === 'namespace') {
      const targets = namespaces
        .filter((ns) => selectedTargets.includes(`${ns.cluster_name}::${ns.namespace}`))
        .map((ns) => ({ cluster_name: ns.cluster_name, namespace: ns.namespace }))
      return { mode: 'namespace', targets }
    }

    if (scopeMode === 'image') {
      const targets = images
        .filter((img) => selectedTargets.includes(`${img.cluster_name}::${img.namespace}::${img.image_name}`))
        .map((img) => ({ cluster_name: img.cluster_name, namespace: img.namespace, image_name: img.image_name }))
      return { mode: 'image', targets }
    }

    const targets = deployments
      .filter((dep) => selectedTargets.includes(dep.deployment_id))
      .map((dep) => ({
        cluster_name: dep.cluster_name,
        namespace: dep.namespace,
        image_name: dep.image_name,
        deployment_id: dep.deployment_id,
      }))
    return { mode: 'deployment', targets }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!justification.trim()) { setError('Begründung erforderlich.'); return }
    if (scopeMode !== 'all' && selectedTargets.length === 0) {
      setError('Bitte mindestens ein Scope-Target auswählen.')
      return
    }
    try {
      await updateRA.mutateAsync({
        justification,
        scope: buildScope(),
        expires_at: expiresAt || null,
      })
      navigate(`/risikoakzeptanzen/${raId}`)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  if (isRaLoading || isCveLoading) return <PageSection><Spinner aria-label="Laden" /></PageSection>
  if (raError) return <PageSection><Alert variant="danger" title={`Fehler: ${getErrorMessage(raError)}`} /></PageSection>
  if (!ra) return null

  return (
    <>
      <PageSection variant="default">
        <Breadcrumb>
          <BreadcrumbItem onClick={() => navigate('/risikoakzeptanzen')} style={{ cursor: 'pointer' }}>
            Risikoakzeptanzen
          </BreadcrumbItem>
          <BreadcrumbItem onClick={() => navigate(`/risikoakzeptanzen/${raId}`)} style={{ cursor: 'pointer' }}>
            {ra.cve_id}
          </BreadcrumbItem>
          <BreadcrumbItem isActive>Ändern</BreadcrumbItem>
        </Breadcrumb>
        <Title headingLevel="h1" size="xl" style={{ marginTop: 8 }}>Risikoakzeptanz ändern</Title>
      </PageSection>
      <PageSection>
        <Card style={{ maxWidth: 640 }}>
          <CardBody>
            {cveError && <Alert variant="danger" isInline title={`Fehler: ${getErrorMessage(cveError)}`} style={{ marginBottom: 12 }} />}
            <Alert
              variant="info"
              isInline
              title="Nach der Änderung muss das Security-Team die Risikoakzeptanz erneut prüfen."
              style={{ marginBottom: 16 }}
            />
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>CVE-ID</label>
                <div style={{ fontFamily: 'monospace', marginTop: 4, color: '#0066cc' }}>{ra.cve_id}</div>
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
                <label style={{ fontSize: 13, fontWeight: 600 }}>Scope *</label>
                <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                  {(Object.keys(SCOPE_MODE_LABELS) as RiskScopeMode[]).map((mode) => (
                    <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="radio"
                        name="scope-mode"
                        checked={scopeMode === mode}
                        onChange={() => {
                          setScopeMode(mode)
                          setSelectedTargets([])
                        }}
                      />
                      <span style={{ fontSize: 13 }}>{SCOPE_MODE_LABELS[mode]}</span>
                    </label>
                  ))}
                </div>
              </div>
              {scopeMode !== 'all' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Scope-Targets *</label>
                  <div style={{ marginTop: 8, maxHeight: 220, overflow: 'auto', border: '1px solid #d2d2d2', borderRadius: 4, padding: 10 }}>
                    {scopeMode === 'namespace' && namespaces.map((ns) => {
                      const key = `${ns.cluster_name}::${ns.namespace}`
                      return (
                        <label key={key} style={{ display: 'block', marginBottom: 6 }}>
                          <input type="checkbox" checked={selectedTargets.includes(key)} onChange={() => toggleTarget(key)} />
                          <span style={{ marginLeft: 8, fontSize: 12 }}>{ns.cluster_name}/{ns.namespace}</span>
                        </label>
                      )
                    })}
                    {scopeMode === 'image' && images.map((img) => {
                      const key = `${img.cluster_name}::${img.namespace}::${img.image_name}`
                      return (
                        <label key={key} style={{ display: 'block', marginBottom: 6 }}>
                          <input type="checkbox" checked={selectedTargets.includes(key)} onChange={() => toggleTarget(key)} />
                          <span style={{ marginLeft: 8, fontSize: 12 }}>{img.cluster_name}/{img.namespace} - {img.image_name}</span>
                        </label>
                      )
                    })}
                    {scopeMode === 'deployment' && deployments.map((dep) => (
                      <label key={dep.deployment_id} style={{ display: 'block', marginBottom: 6 }}>
                        <input
                          type="checkbox"
                          checked={selectedTargets.includes(dep.deployment_id)}
                          onChange={() => toggleTarget(dep.deployment_id)}
                        />
                        <span style={{ marginLeft: 8, fontSize: 12 }}>{dep.cluster_name}/{dep.namespace} - {dep.deployment_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
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
                <Button type="submit" variant="primary" isLoading={updateRA.isPending}>
                  Änderung einreichen
                </Button>
                <Button variant="link" onClick={() => navigate(`/risikoakzeptanzen/${raId}`)}>
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

  // Edit mode
  if (id && searchParams.get('edit') === '1') {
    return <EditRiskAcceptanceForm raId={id} />
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
  const cancelRA = useCancelRiskAcceptance(id)
  const [newComment, setNewComment] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelError, setCancelError] = useState('')

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
                      ['Scope', `${SCOPE_MODE_LABELS[ra.scope.mode]} (${ra.scope.targets.length})`],
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

            {/* Creator cancel action */}
            {!me?.is_sec_team && me?.id === ra.created_by && ra.status === RiskStatus.requested && (
              <Card>
                <CardTitle>Antrag zurückziehen</CardTitle>
                <CardBody>
                  {cancelError && <Alert variant="danger" isInline title={cancelError} style={{ marginBottom: 12 }} />}
                  {confirmCancel ? (
                    <div>
                      <p style={{ fontSize: 13, marginBottom: 12 }}>Sind Sie sicher? Der Antrag wird unwiderruflich gelöscht.</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button
                          variant="danger"
                          isLoading={cancelRA.isPending}
                          onClick={async () => {
                            try {
                              await cancelRA.mutateAsync()
                              navigate('/risikoakzeptanzen')
                            } catch (err) {
                              setCancelError(getErrorMessage(err))
                            }
                          }}
                        >
                          Endgültig zurückziehen
                        </Button>
                        <Button variant="link" onClick={() => setConfirmCancel(false)}>
                          Abbrechen
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="warning" onClick={() => setConfirmCancel(true)}>
                      Zurückziehen
                    </Button>
                  )}
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
