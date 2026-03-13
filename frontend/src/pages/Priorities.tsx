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
  TextArea,
  TextInput,
  Title,
} from '@patternfly/react-core'
import { ListIcon } from '@patternfly/react-icons'
import { getErrorMessage } from '../utils/errors'
import { useState } from 'react'
import { useCreatePriority, useDeletePriority, usePriorities, useUpdatePriority } from '../api/priorities'
import { useCurrentUser } from '../api/auth'
import { PriorityLevel } from '../types'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  [PriorityLevel.critical]: '#c9190b',
  [PriorityLevel.high]: '#ec7a08',
  [PriorityLevel.medium]: '#f0ab00',
  [PriorityLevel.low]: '#0066cc',
}

const PRIORITY_LEVEL_KEYS: { key: string; value: PriorityLevel }[] = [
  { key: 'priority.critical', value: PriorityLevel.critical },
  { key: 'priority.high', value: PriorityLevel.high },
  { key: 'priority.medium', value: PriorityLevel.medium },
  { key: 'priority.low', value: PriorityLevel.low },
]

function PriorityBadge({ level }: { level: PriorityLevel }) {
  const { t } = useTranslation()
  const option = PRIORITY_LEVEL_KEYS.find(o => o.value === level)
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 3,
      background: PRIORITY_COLORS[level],
      color: '#fff',
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
    }}>
      {option ? t(option.key) : level}
    </span>
  )
}

export function Priorities() {
  const { t, i18n } = useTranslation()
  const { data: me } = useCurrentUser()
  const { data, isLoading, error } = usePriorities()
  const createPriority = useCreatePriority()
  const updatePriority = useUpdatePriority()
  const deletePriority = useDeletePriority()

  const [showCreate, setShowCreate] = useState(false)
  const [cveId, setCveId] = useState('')
  const [priority, setPriority] = useState<PriorityLevel>(PriorityLevel.high)
  const [reason, setReason] = useState('')
  const [deadline, setDeadline] = useState('')
  const [formError, setFormError] = useState('')

  const localeDateLocale = i18n.language === 'de' ? 'de-DE' : 'en-US'

  const priorityOptions = PRIORITY_LEVEL_KEYS.map(o => ({
    label: t(o.key),
    value: o.value,
  }))

  async function handleCreate() {
    if (!cveId.trim()) { setFormError(t('priorities.cveIdRequired')); return }
    if (!reason.trim()) { setFormError(t('priorities.reasonRequired')); return }
    try {
      await createPriority.mutateAsync({
        cve_id: cveId.trim(),
        priority,
        reason,
        deadline: deadline || null,
      })
      setShowCreate(false)
      setCveId('')
      setReason('')
      setDeadline('')
      setFormError('')
    } catch (err) {
      setFormError(getErrorMessage(err))
    }
  }

  return (
    <>
      <PageSection variant="default">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title headingLevel="h1" size="xl">{t('priorities.title')}</Title>
          {me?.is_sec_team && (
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              {t('priorities.create')}
            </Button>
          )}
        </div>
      </PageSection>

      <PageSection>
        {isLoading ? <Spinner aria-label={t('common.loading')} /> : error ? (
          <Alert variant="danger" title={`${t('common.error')}: ${getErrorMessage(error)}`} />
        ) : !data?.length ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#8a8d90' }}>
            <ListIcon style={{ fontSize: 32, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, margin: 0 }}>{t('priorities.noPriorities')}</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--pf-v6-global--BackgroundColor--200)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t('priorities.cveId')}</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t('priorities.priority')}</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t('priorities.reason')}</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t('priorities.setBy')}</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t('priorities.deadline')}</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t('priorities.createdAt')}</th>
                {me?.is_sec_team && <th style={{ padding: '8px 12px' }}></th>}
              </tr>
            </thead>
            <tbody>
              {data.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--pf-v6-global--BorderColor--100)' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <Link to={`/vulnerabilities/${p.cve_id}`} style={{ fontFamily: 'monospace', color: '#0066cc', fontSize: 12 }}>
                      {p.cve_id}
                    </Link>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <PriorityBadge level={p.priority} />
                  </td>
                  <td style={{ padding: '8px 12px', maxWidth: 400 }}>{p.reason}</td>
                  <td style={{ padding: '8px 12px', fontSize: 12 }}>{p.set_by_name}</td>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: p.deadline && new Date(p.deadline) < new Date() ? '#c9190b' : 'var(--pf-v6-global--Color--200)' }}>
                    {p.deadline ? new Date(p.deadline).toLocaleDateString(localeDateLocale) : '–'}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--pf-v6-global--Color--200)' }}>
                    {new Date(p.created_at).toLocaleDateString(localeDateLocale)}
                  </td>
                  {me?.is_sec_team && (
                    <td style={{ padding: '8px 12px' }}>
                      <Button
                        variant="plain"
                        size="sm"
                        onClick={() => deletePriority.mutate(p.id)}
                        style={{ color: '#c9190b', fontSize: 11 }}
                      >
                        {t('common.remove')}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PageSection>

      {showCreate && (
        <Modal isOpen onClose={() => setShowCreate(false)} variant="small">
          <ModalHeader title={t('priorities.create')} />
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>{t('priorities.cveId')} *</label>
                <TextInput value={cveId} onChange={(_, v) => setCveId(v)} placeholder="CVE-2024-XXXXX" style={{ marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>{t('priorities.priority')}</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as PriorityLevel)}
                  style={{ display: 'block', width: '100%', height: 36, padding: '0 8px', border: '1px solid #d2d2d2', borderRadius: 4, marginTop: 4 }}
                >
                  {priorityOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>{t('priorities.reason')} *</label>
                <TextArea value={reason} onChange={(_, v) => setReason(v)} rows={3} style={{ marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>{t('priorities.deadlineOptional')}</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  style={{ display: 'block', width: '100%', height: 36, padding: '0 8px', border: '1px solid #d2d2d2', borderRadius: 4, marginTop: 4 }}
                />
              </div>
              {formError && <Alert variant="danger" isInline title={formError} />}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" onClick={handleCreate} isLoading={createPriority.isPending}>
              {t('common.save')}
            </Button>
            <Button variant="link" onClick={() => setShowCreate(false)}>{t('common.cancel')}</Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  )
}
