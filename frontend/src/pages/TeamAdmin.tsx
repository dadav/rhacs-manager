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
import { useCreateTeam, useDeleteTeam, useTeams, useUpdateTeam } from '../api/teams'
import type { Team } from '../types'

function NamespaceInput({
  namespaces,
  onChange,
}: {
  namespaces: { namespace: string; cluster_name: string }[]
  onChange: (ns: { namespace: string; cluster_name: string }[]) => void
}) {
  function updateRow(i: number, field: 'namespace' | 'cluster_name', value: string) {
    onChange(namespaces.map((ns, j) => j === i ? { ...ns, [field]: value } : ns))
  }
  function addRow() {
    onChange([...namespaces, { namespace: '', cluster_name: '' }])
  }
  function removeRow(i: number) {
    onChange(namespaces.filter((_, j) => j !== i))
  }

  return (
    <div>
      {namespaces.map((ns, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <TextInput
            value={ns.namespace}
            onChange={(_, v) => updateRow(i, 'namespace', v)}
            placeholder="Namespace"
            style={{ flex: 1 }}
          />
          <TextInput
            value={ns.cluster_name}
            onChange={(_, v) => updateRow(i, 'cluster_name', v)}
            placeholder="Cluster"
            style={{ flex: 1 }}
          />
          <Button variant="plain" onClick={() => removeRow(i)} style={{ color: '#c9190b' }}>✕</Button>
        </div>
      ))}
      <Button variant="link" onClick={addRow} style={{ fontSize: 12 }}>+ Namespace hinzufügen</Button>
    </div>
  )
}

export function TeamAdmin() {
  const { data: teams, isLoading, error } = useTeams()
  const createTeam = useCreateTeam()
  const updateTeam = useUpdateTeam()
  const deleteTeam = useDeleteTeam()

  const [showCreate, setShowCreate] = useState(false)
  const [editTeam, setEditTeam] = useState<Team | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [namespaces, setNamespaces] = useState<{ namespace: string; cluster_name: string }[]>([])
  const [formError, setFormError] = useState('')

  function openCreate() {
    setName('')
    setEmail('')
    setNamespaces([])
    setFormError('')
    setShowCreate(true)
  }

  function openEdit(team: Team) {
    setName(team.name)
    setEmail(team.email)
    setNamespaces(team.namespaces.map(n => ({ namespace: n.namespace, cluster_name: n.cluster_name })))
    setFormError('')
    setEditTeam(team)
  }

  async function handleCreate() {
    if (!name.trim()) { setFormError('Name erforderlich.'); return }
    try {
      await createTeam.mutateAsync({ name, email, namespaces })
      setShowCreate(false)
      setFormError('')
    } catch (err) {
      setFormError(getErrorMessage(err))
    }
  }

  async function handleUpdate() {
    if (!editTeam) return
    if (!name.trim()) { setFormError('Name erforderlich.'); return }
    try {
      await updateTeam.mutateAsync({ id: editTeam.id, data: { name, email, namespaces } })
      setEditTeam(null)
      setFormError('')
    } catch (err) {
      setFormError(getErrorMessage(err))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Team wirklich löschen? Alle zugehörigen Daten werden gelöscht.')) return
    await deleteTeam.mutateAsync(id)
  }

  return (
    <>
      <PageSection variant="default">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title headingLevel="h1" size="xl">Team-Verwaltung</Title>
          <Button variant="primary" onClick={openCreate}>Team erstellen</Button>
        </div>
      </PageSection>

      <PageSection>
        {isLoading ? <Spinner aria-label="Laden" /> : error ? (
          <Alert variant="danger" title={`Fehler: ${getErrorMessage(error)}`} />
        ) : !teams?.length ? (
          <Alert variant="info" isInline title="Keine Teams vorhanden." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {teams.map(team => (
              <Card key={team.id}>
                <CardTitle>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{team.name}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button variant="secondary" size="sm" onClick={() => openEdit(team)}>Bearbeiten</Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(team.id)}>Löschen</Button>
                    </div>
                  </div>
                </CardTitle>
                <CardBody>
                  <p style={{ fontSize: 13, color: 'var(--pf-t--global--text--color--subtle)', marginBottom: 8 }}>
                    E-Mail: {team.email || '–'} · Erstellt: {new Date(team.created_at).toLocaleDateString('de-DE')}
                  </p>
                  {team.namespaces.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {team.namespaces.map(ns => (
                        <span
                          key={ns.id}
                          style={{ fontSize: 11, background: 'var(--pf-t--global--background--color--secondary--default)', padding: '2px 8px', borderRadius: 3, fontFamily: 'monospace' }}
                        >
                          {ns.cluster_name}/{ns.namespace}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: 'var(--pf-t--global--text--color--subtle)' }}>Keine Namespaces zugeordnet.</p>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </PageSection>

      {/* Create modal */}
      {showCreate && (
        <Modal isOpen onClose={() => setShowCreate(false)} variant="medium">
          <ModalHeader title="Team erstellen" />
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Name *</label>
                <TextInput value={name} onChange={(_, v) => setName(v)} style={{ marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>E-Mail</label>
                <TextInput type="email" value={email} onChange={(_, v) => setEmail(v)} style={{ marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Namespaces</label>
                <div style={{ marginTop: 4 }}>
                  <NamespaceInput namespaces={namespaces} onChange={setNamespaces} />
                </div>
              </div>
              {formError && <Alert variant="danger" isInline title={formError} />}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" onClick={handleCreate} isLoading={createTeam.isPending}>Erstellen</Button>
            <Button variant="link" onClick={() => setShowCreate(false)}>Abbrechen</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Edit modal */}
      {editTeam && (
        <Modal isOpen onClose={() => setEditTeam(null)} variant="medium">
          <ModalHeader title={`Team bearbeiten: ${editTeam.name}`} />
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Name *</label>
                <TextInput value={name} onChange={(_, v) => setName(v)} style={{ marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>E-Mail</label>
                <TextInput type="email" value={email} onChange={(_, v) => setEmail(v)} style={{ marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Namespaces</label>
                <div style={{ marginTop: 4 }}>
                  <NamespaceInput namespaces={namespaces} onChange={setNamespaces} />
                </div>
              </div>
              {formError && <Alert variant="danger" isInline title={formError} />}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" onClick={handleUpdate} isLoading={updateTeam.isPending}>Speichern</Button>
            <Button variant="link" onClick={() => setEditTeam(null)}>Abbrechen</Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  )
}
