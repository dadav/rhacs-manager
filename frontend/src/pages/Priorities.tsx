import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  EmptyState,
  EmptyStateBody,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageSection,
  Skeleton,
  TextArea,
  TextInput,
  Title,
} from '@patternfly/react-core'
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table'
import { ListIcon } from '@patternfly/react-icons'
import { getErrorMessage } from '../utils/errors'
import { useState } from 'react'
import { useCreatePriority, useDeletePriority, usePriorities, useUpdatePriority } from '../api/priorities'
import { useCurrentUser } from '../api/auth'
import { PriorityLevel } from '../types'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { PRIORITY_COLORS, BRAND_BLUE } from '../tokens'

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

function SkeletonRows({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <Tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <Tr key={i}>
          {Array.from({ length: columns }).map((_, j) => (
            <Td key={j}><Skeleton /></Td>
          ))}
        </Tr>
      ))}
    </Tbody>
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

  const columnCount = me?.is_sec_team ? 7 : 6

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
        {error ? (
          <Alert variant="danger" title={`${t('common.error')}: ${getErrorMessage(error)}`} />
        ) : !isLoading && !data?.length ? (
          <EmptyState>
            <ListIcon style={{ fontSize: 32, marginBottom: 12, color: '#8a8d90' }} />
            <EmptyStateBody>{t('priorities.noPriorities')}</EmptyStateBody>
          </EmptyState>
        ) : (
          <Table variant="compact" isStickyHeader>
            <Thead>
              <Tr>
                <Th>{t('priorities.cveId')}</Th>
                <Th>{t('priorities.priority')}</Th>
                <Th>{t('priorities.reason')}</Th>
                <Th>{t('priorities.setBy')}</Th>
                <Th>{t('priorities.deadline')}</Th>
                <Th>{t('priorities.createdAt')}</Th>
                {me?.is_sec_team && <Th></Th>}
              </Tr>
            </Thead>
            {isLoading ? (
              <SkeletonRows columns={columnCount} />
            ) : (
              <Tbody>
                {data!.map(p => (
                  <Tr key={p.id}>
                    <Td>
                      <Link to={`/vulnerabilities/${p.cve_id}`} style={{ fontFamily: 'monospace', color: BRAND_BLUE, fontSize: 12 }}>
                        {p.cve_id}
                      </Link>
                    </Td>
                    <Td>
                      <PriorityBadge level={p.priority} />
                    </Td>
                    <Td style={{ maxWidth: 400 }}>{p.reason}</Td>
                    <Td style={{ fontSize: 12 }}>{p.set_by_name}</Td>
                    <Td style={{ fontSize: 12, color: p.deadline && new Date(p.deadline) < new Date() ? '#c9190b' : 'var(--pf-v6-global--Color--200)' }}>
                      {p.deadline ? new Date(p.deadline).toLocaleDateString(localeDateLocale) : '–'}
                    </Td>
                    <Td style={{ fontSize: 12, color: 'var(--pf-v6-global--Color--200)' }}>
                      {new Date(p.created_at).toLocaleDateString(localeDateLocale)}
                    </Td>
                    {me?.is_sec_team && (
                      <Td>
                        <Button
                          variant="plain"
                          size="sm"
                          onClick={() => deletePriority.mutate(p.id)}
                          style={{ color: '#c9190b', fontSize: 11 }}
                        >
                          {t('common.remove')}
                        </Button>
                      </Td>
                    )}
                  </Tr>
                ))}
              </Tbody>
            )}
          </Table>
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
