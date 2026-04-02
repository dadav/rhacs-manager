import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  EmptyState,
  EmptyStateBody,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageSection,
  Popover,
  Skeleton,
  TextArea,
  TextInput,
  Title,
} from '@patternfly/react-core'
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table'
import { ListIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons'
import { getErrorMessage } from '../utils/errors'
import { useState } from 'react'
import { useCreatePriority, useDeletePriority, usePriorities, useUpdatePriority } from '../api/priorities'
import { useCurrentUser } from '../api/auth'
import { PriorityLevel } from '../types'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { PRIORITY_COLORS, BRAND_BLUE } from '../tokens'
import { InlineConfirmButton } from '../components/common/InlineConfirmButton'

const PRIORITY_LEVEL_KEYS: { key: string; value: PriorityLevel }[] = [
  { key: 'priority.critical', value: PriorityLevel.critical },
  { key: 'priority.high', value: PriorityLevel.high },
  { key: 'priority.medium', value: PriorityLevel.medium },
  { key: 'priority.low', value: PriorityLevel.low },
]

const PRIORITY_LABEL_COLORS: Record<string, 'red' | 'orange' | 'yellow' | 'blue'> = {
  critical: 'red',
  high: 'orange',
  medium: 'yellow',
  low: 'blue',
}

function PriorityBadge({ level }: { level: PriorityLevel }) {
  const { t } = useTranslation()
  const option = PRIORITY_LEVEL_KEYS.find(o => o.value === level)
  return (
    <Label color={PRIORITY_LABEL_COLORS[level] ?? 'grey'}>
      {option ? t(option.key) : level}
    </Label>
  )
}

function DeletePriorityInline({ priorityId }: { priorityId: string }) {
  const { t } = useTranslation()
  const deletePriority = useDeletePriority()
  return (
    <InlineConfirmButton
      label={t('priorities.delete')}
      confirmLabel={t('priorities.deleteFinal')}
      cancelLabel={t('common.cancel')}
      onConfirm={() => deletePriority.mutateAsync(priorityId)}
    />
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Title headingLevel="h1" size="xl">{t('priorities.title')}</Title>
            <Popover
              headerContent={t('priorities.whatAre')}
              bodyContent={
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                  <p style={{ margin: '0 0 8px' }}>
                    {t('priorities.helpBody1')}
                  </p>
                  <p style={{ margin: '0 0 8px' }}>
                    <strong>{t('priorities.helpBody2Critical')}</strong> — {t('priorities.helpBody2CriticalDesc')}<br />
                    <strong>{t('priorities.helpBody2High')}</strong> — {t('priorities.helpBody2HighDesc')}<br />
                    <strong>{t('priorities.helpBody2Medium')}</strong> — {t('priorities.helpBody2MediumDesc')}<br />
                    <strong>{t('priorities.helpBody2Low')}</strong> — {t('priorities.helpBody2LowDesc')}
                  </p>
                  <p style={{ margin: 0 }}>
                    {t('priorities.helpBody3')}
                  </p>
                </div>
              }
              position="right"
            >
              <Button variant="plain" aria-label={t('priorities.helpLabel')} style={{ padding: '4px 6px' }}>
                <OutlinedQuestionCircleIcon style={{ color: 'var(--pf-t--global--text--color--subtle)' }} />
              </Button>
            </Popover>
          </div>
          {me?.is_sec_team && (
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              {t('priorities.create')}
            </Button>
          )}
        </div>
      </PageSection>

      <PageSection variant="default" isFilled>
        {error ? (
          <Alert variant="danger" title={`${t('common.error')}: ${getErrorMessage(error)}`} />
        ) : !isLoading && !data?.length ? (
          <EmptyState>
            <ListIcon style={{ fontSize: 32, marginBottom: 12, color: '#8a8d90' }} />
            <EmptyStateBody>{t('priorities.noPriorities')}</EmptyStateBody>
            <EmptyStateBody>
              <span style={{ color: 'var(--pf-t--global--text--color--subtle)', fontSize: 13 }}>
                {t('priorities.noPrioritiesHint')}
              </span>
            </EmptyStateBody>
          </EmptyState>
        ) : (
          <Table variant="compact" isStickyHeader>
            <Thead>
              <Tr>
                <Th>{t('priorities.cveId')}</Th>
                <Th>{t('priorities.priority')}</Th>
                <Th>{t('priorities.setBy')}</Th>
                <Th>{t('priorities.deadline')}</Th>
                <Th>{t('priorities.createdAt')}</Th>
                <Th></Th>
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
                    <Td style={{ fontSize: 12 }}>{p.set_by_name}</Td>
                    <Td style={{ fontSize: 12, color: p.deadline && new Date(p.deadline) < new Date() ? '#c9190b' : 'var(--pf-v6-global--Color--200)' }}>
                      {p.deadline ? new Date(p.deadline).toLocaleDateString(localeDateLocale) : '–'}
                    </Td>
                    <Td style={{ fontSize: 12, color: 'var(--pf-v6-global--Color--200)' }}>
                      {new Date(p.created_at).toLocaleDateString(localeDateLocale)}
                    </Td>
                    <Td>
                      <Button
                        variant="secondary"
                        size="sm"
                        component={(props: object) => <Link {...props} to={`/priorities/${p.id}`} />}
                      >
                        {t('common.details')}
                      </Button>
                    </Td>
                    {me?.is_sec_team && (
                      <Td>
                        <DeletePriorityInline priorityId={p.id} />
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
                <TextInput value={cveId} onChange={(_, v) => setCveId(v)} placeholder="CVE-2024-XXXXX" aria-label={t('priorities.cveId')} style={{ marginTop: 4 }} />
              </div>
              <FormGroup label={t('priorities.priority')}>
                <FormSelect
                  value={priority}
                  onChange={(_e, v) => setPriority(v as PriorityLevel)}
                  aria-label={t('priorities.priority')}
                >
                  {priorityOptions.map(o => (
                    <FormSelectOption key={o.value} value={o.value} label={o.label} />
                  ))}
                </FormSelect>
              </FormGroup>
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
