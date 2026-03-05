import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageSection,
  Spinner,
  TextInput,
  Title,
} from '@patternfly/react-core'
import { getErrorMessage } from '../utils/errors'
import { useState } from 'react'
import { useBadges, useCreateBadge, useDeleteBadge } from '../api/badges'
import { useScope } from '../hooks/useScope'

export function Badges() {
  const { scopeParams } = useScope()
  const { data: badges, isLoading, error } = useBadges(scopeParams)
  const createBadge = useCreateBadge()
  const deleteBadge = useDeleteBadge()

  const [showCreate, setShowCreate] = useState(false)
  const [namespace, setNamespace] = useState('')
  const [cluster, setCluster] = useState('')
  const [label, setLabel] = useState('')
  const [formError, setFormError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const toAbsoluteBadgeUrl = (url: string) => new URL(url, window.location.origin).toString()

  async function handleCreate() {
    try {
      await createBadge.mutateAsync({
        namespace: namespace || null,
        cluster_name: cluster || null,
        label: label || undefined,
      })
      setShowCreate(false)
      setNamespace('')
      setCluster('')
      setLabel('')
      setFormError('')
    } catch (err) {
      setFormError(getErrorMessage(err))
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <>
      <PageSection variant="default">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title headingLevel="h1" size="xl">SVG-Badges</Title>
          <Button variant="primary" onClick={() => setShowCreate(true)}>Badge erstellen</Button>
        </div>
      </PageSection>

      <PageSection>
        <Alert variant="info" isInline title="Badges können ohne Authentifizierung in READMEs eingebettet werden." style={{ marginBottom: 16 }} />

        {isLoading ? <Spinner aria-label="Laden" /> : error ? (
          <Alert variant="danger" title={`Fehler: ${getErrorMessage(error)}`} />
        ) : !badges?.length ? (
          <Alert variant="info" isInline title="Keine Badges vorhanden." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {badges.map(badge => (
              <Card key={badge.id} isCompact>
                <CardBody>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{badge.label || 'CVE Badge'}</div>
                      <div style={{ fontSize: 11, color: '#6a6e73', fontFamily: 'monospace' }}>
                        {badge.cluster_name}/{badge.namespace ?? 'alle'}
                      </div>
                    </div>

                    {/* Live badge preview */}
                    <div>
                      <img src={toAbsoluteBadgeUrl(badge.badge_url)} alt="Badge" style={{ height: 20 }} />
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyToClipboard(toAbsoluteBadgeUrl(badge.badge_url), badge.id + '-url')}
                      >
                        {copied === badge.id + '-url' ? '✓ Kopiert' : 'URL kopieren'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyToClipboard(
                          `![CVE Badge](${toAbsoluteBadgeUrl(badge.badge_url)})`,
                          badge.id + '-md'
                        )}
                      >
                        {copied === badge.id + '-md' ? '✓ Kopiert' : 'Markdown kopieren'}
                      </Button>
                      <Button
                        variant="plain"
                        size="sm"
                        onClick={() => deleteBadge.mutate(badge.id)}
                        style={{ color: '#c9190b', fontSize: 12 }}
                      >
                        Löschen
                      </Button>
                    </div>
                  </div>

                  {/* URL display */}
                  <div style={{ marginTop: 8, padding: '6px 10px', background: '#f9f9f9', borderRadius: 3 }}>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#6a6e73', wordBreak: 'break-all' }}>
                      {toAbsoluteBadgeUrl(badge.badge_url)}
                    </span>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </PageSection>

      {showCreate && (
        <Modal isOpen onClose={() => setShowCreate(false)} variant="small">
          <ModalHeader title="Badge erstellen" />
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 13, color: '#6a6e73' }}>
                Leer lassen für einen allgemeinen Badge. Namespace+Cluster für einen namespace-spezifischen Badge.
              </p>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Namespace (optional)</label>
                <TextInput value={namespace} onChange={(_, v) => setNamespace(v)} placeholder="mein-namespace" style={{ marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Cluster (optional)</label>
                <TextInput value={cluster} onChange={(_, v) => setCluster(v)} placeholder="production" style={{ marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Label (optional)</label>
                <TextInput value={label} onChange={(_, v) => setLabel(v)} placeholder="CVEs" style={{ marginTop: 4 }} />
              </div>
              {formError && <Alert variant="danger" isInline title={formError} />}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" onClick={handleCreate} isLoading={createBadge.isPending}>Erstellen</Button>
            <Button variant="link" onClick={() => setShowCreate(false)}>Abbrechen</Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  )
}
