import {
  Alert,
  Button,
  EmptyState,
  EmptyStateBody,
  FormSelect,
  FormSelectOption,
  Label,
  PageSection,
  Pagination,
  Popover,
  SearchInput,
  Skeleton,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core'
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table'
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons'
import { getErrorMessage } from '../utils/errors'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useRemediations, useRemediationStats, useUpdateRemediation, useDeleteRemediation } from '../api/remediations'
import { useAuth } from '../hooks/useAuth'
import { useScope } from '../hooks/useScope'
import { REMEDIATION_LABEL_COLORS, BRAND_BLUE } from '../tokens'
import type { RemediationItem } from '../types'
import { RemediationStatus } from '../types'

const FORM_SELECT_STYLE: React.CSSProperties = { maxWidth: 200 }

const PER_PAGE = 20

export function Remediations() {
  const { t, i18n } = useTranslation()
  const { isSecTeam } = useAuth()
  const { scopeParams } = useScope()
  const [searchParams, setSearchParams] = useSearchParams()

  const STATUS_LABELS: Record<string, string> = {
    open: t('remediations.statusOpen'),
    in_progress: t('remediations.statusInProgress'),
    resolved: t('remediations.statusResolved'),
    verified: t('remediations.statusVerified'),
    wont_fix: t('remediations.statusWontFix'),
  }

  const localeDateFormat = i18n.language === 'de' ? 'de-DE' : 'en-US'

  const statusFilter = searchParams.get('status') ?? ''
  const [searchCve, setSearchCve] = useState('')
  const [overdueFilter, setOverdueFilter] = useState(false)
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useRemediations(
    {
      status: statusFilter || undefined,
      overdue: overdueFilter || undefined,
    },
    scopeParams,
  )
  const stats = useRemediationStats(scopeParams)

  const filtered = useMemo(() => {
    let items = data ?? []
    if (searchCve) {
      const q = searchCve.toUpperCase()
      items = items.filter(r => r.cve_id.toUpperCase().includes(q))
    }
    return items
  }, [data, searchCve])

  const total = filtered.length
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const setStatus = (s: string) => {
    const next = new URLSearchParams(searchParams)
    if (s) {
      next.set('status', s)
    } else {
      next.delete('status')
    }
    setSearchParams(next, { replace: true })
    setPage(1)
  }

  function StatusBadge({ status, isOverdue }: { status: string; isOverdue: boolean }) {
    return (
      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
        <Label color={REMEDIATION_LABEL_COLORS[status] ?? 'grey'}>
          {STATUS_LABELS[status] ?? status}
        </Label>
        {isOverdue && (
          <Label color="red">{t('remediations.overdue')}</Label>
        )}
      </span>
    )
  }

  return (
    <>
      <PageSection variant="default">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Title headingLevel="h1" size="xl">{t('remediations.title')}</Title>
          <Popover
            headerContent={t('remediations.whatAre')}
            bodyContent={
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 8px' }}>
                  {t('remediations.helpBody1')}
                </p>
                <p style={{ margin: '0 0 8px' }}>
                  <strong>{t('remediations.helpBody2Open')}</strong> — {t('remediations.helpBody2OpenDesc')}<br />
                  <strong>{t('remediations.helpBody2InProgress')}</strong> — {t('remediations.helpBody2InProgressDesc')}<br />
                  <strong>{t('remediations.helpBody2Resolved')}</strong> — {t('remediations.helpBody2ResolvedDesc')}<br />
                  <strong>{t('remediations.helpBody2Verified')}</strong> — {t('remediations.helpBody2VerifiedDesc')}
                </p>
                <p style={{ margin: 0 }}>
                  {t('remediations.helpBody3')}
                </p>
              </div>
            }
            position="right"
          >
            <Button
              variant="plain"
              aria-label={t('remediations.helpLabel')}
              style={{ padding: '4px 6px' }}
            >
              <OutlinedQuestionCircleIcon style={{ color: 'var(--pf-t--global--text--color--subtle)' }} />
            </Button>
          </Popover>
        </div>
      </PageSection>

      {/* Stats summary */}
      {stats.data && (
        <PageSection>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {([
              ['open', t('remediations.statusOpen'), 'blue'],
              ['in_progress', t('remediations.statusInProgress'), 'orange'],
              ['resolved', t('remediations.statusResolved'), 'green'],
              ['verified', t('remediations.statusVerified'), 'teal'],
              ['overdue', t('remediations.overdue'), 'red'],
            ] as [string, string, string][]).map(([key, label, color]) => (
              <div
                key={key}
                onClick={() => {
                  if (key === 'overdue') {
                    setOverdueFilter(!overdueFilter)
                    setStatus('')
                  } else {
                    setOverdueFilter(false)
                    setStatus(statusFilter === key ? '' : key)
                  }
                  setPage(1)
                }}
                style={{
                  padding: '12px 20px',
                  borderRadius: 8,
                  border: `2px solid ${(statusFilter === key || (key === 'overdue' && overdueFilter)) ? `var(--pf-t--global--color--brand--default)` : 'var(--pf-t--global--border--color--default)'}`,
                  cursor: 'pointer',
                  minWidth: 100,
                  textAlign: 'center',
                  background: 'var(--pf-t--global--background--color--primary--default)',
                }}
              >
                <div style={{ fontSize: 24, fontWeight: 700 }}>
                  {stats.data[key as keyof typeof stats.data]}
                </div>
                <div style={{ fontSize: 12, color: 'var(--pf-t--global--text--color--subtle)' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </PageSection>
      )}

      {/* List */}
      <PageSection variant="default" isFilled>
        <Toolbar style={{ padding: 0, marginBottom: 8 }}>
          <ToolbarContent>
            <ToolbarItem>
              <SearchInput
                placeholder={t('remediations.searchPlaceholder')}
                value={searchCve}
                onChange={(_e, v) => { setSearchCve(v); setPage(1) }}
                onClear={() => { setSearchCve(''); setPage(1) }}
                aria-label={t('remediations.searchLabel')}
                style={{ width: 220 }}
              />
            </ToolbarItem>
            <ToolbarItem>
              <FormSelect
                value={statusFilter}
                onChange={(_e, v) => { setStatus(v); setOverdueFilter(false) }}
                aria-label={t('remediations.filterStatus')}
                style={FORM_SELECT_STYLE}
              >
                <FormSelectOption value="" label={t('remediations.allStatuses')} />
                <FormSelectOption value="open" label={t('remediations.statusOpen')} />
                <FormSelectOption value="in_progress" label={t('remediations.statusInProgress')} />
                <FormSelectOption value="resolved" label={t('remediations.statusResolved')} />
                <FormSelectOption value="verified" label={t('remediations.statusVerified')} />
                <FormSelectOption value="wont_fix" label={t('remediations.statusWontFix')} />
              </FormSelect>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        {isLoading ? (
          <Table variant="compact" isStickyHeader>
            <Thead>
              <Tr>
                <Th>{t('remediations.cve')}</Th>
                <Th>{t('remediations.namespace')}</Th>
                <Th>{t('remediations.status')}</Th>
                <Th>{t('remediations.assignedTo')}</Th>
                <Th>{t('remediations.dueDate')}</Th>
                <Th>{t('remediations.created')}</Th>
                <Th>{t('remediations.createdBy')}</Th>
                <Th width={10}>{t('common.actions')}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {[1, 2, 3, 4, 5].map(i => (
                <Tr key={i}>
                  <Td><Skeleton width="120px" /></Td>
                  <Td><Skeleton width="150px" /></Td>
                  <Td><Skeleton width="80px" /></Td>
                  <Td><Skeleton width="100px" /></Td>
                  <Td><Skeleton width="80px" /></Td>
                  <Td><Skeleton width="80px" /></Td>
                  <Td><Skeleton width="80px" /></Td>
                  <Td><Skeleton width="60px" /></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : error ? (
          <Alert variant="danger" title={`${t('common.error')}: ${getErrorMessage(error)}`} />
        ) : !filtered.length ? (
          <EmptyState>
            <EmptyStateBody>
              {statusFilter || overdueFilter ? t('remediations.noFilterResults') : t('remediations.noRemediations')}
            </EmptyStateBody>
            <EmptyStateBody>
              <span style={{ fontSize: 12, color: 'var(--pf-t--global--text--color--subtle)' }}>
                {t('remediations.createHint')}
              </span>
            </EmptyStateBody>
          </EmptyState>
        ) : (
          <>
            <Table variant="compact" isStickyHeader>
              <Thead>
                <Tr>
                  <Th>{t('remediations.cve')}</Th>
                  <Th>{t('remediations.namespace')}</Th>
                  <Th>{t('remediations.status')}</Th>
                  <Th>{t('remediations.assignedTo')}</Th>
                  <Th>{t('remediations.dueDate')}</Th>
                  <Th>{t('remediations.created')}</Th>
                  <Th>{t('remediations.createdBy')}</Th>
                  <Th width={10}>{t('common.actions')}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {paged.map(r => (
                  <RemediationRow
                    key={r.id}
                    item={r}
                    isSecTeam={isSecTeam}
                    statusLabels={STATUS_LABELS}
                    localeDateFormat={localeDateFormat}
                    StatusBadge={StatusBadge}
                    t={t}
                  />
                ))}
              </Tbody>
            </Table>
            {total > PER_PAGE && (
              <div style={{ marginTop: 12 }}>
                <Pagination
                  itemCount={total}
                  perPage={PER_PAGE}
                  page={page}
                  onSetPage={(_, p) => setPage(p)}
                  variant="bottom"
                />
              </div>
            )}
          </>
        )}
      </PageSection>
    </>
  )
}

function RemediationRow({
  item,
  isSecTeam,
  statusLabels,
  localeDateFormat,
  StatusBadge,
  t,
}: {
  item: RemediationItem
  isSecTeam: boolean
  statusLabels: Record<string, string>
  localeDateFormat: string
  StatusBadge: React.ComponentType<{ status: string; isOverdue: boolean }>
  t: (key: string) => string
}) {
  const updateMutation = useUpdateRemediation(item.id)

  const canVerify = isSecTeam && item.status === RemediationStatus.resolved
  const canProgress = item.status === RemediationStatus.open
  const canResolve = item.status === RemediationStatus.in_progress
  const canReopen = item.status === RemediationStatus.wont_fix

  return (
    <Tr
      style={{
        background: item.is_overdue ? 'rgba(201, 25, 11, 0.06)' : undefined,
      }}
    >
      <Td>
        <Link
          to={`/vulnerabilities/${item.cve_id}`}
          style={{ fontFamily: 'monospace', color: BRAND_BLUE, fontSize: 12 }}
        >
          {item.cve_id}
        </Link>
      </Td>
      <Td>{item.cluster_name}/{item.namespace}</Td>
      <Td>
        <StatusBadge status={item.status} isOverdue={item.is_overdue} />
      </Td>
      <Td>
        {item.assigned_to_name ?? <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>—</span>}
      </Td>
      <Td>
        {item.target_date ? (
          <span style={{
            color: item.is_overdue ? '#c9190b' : 'var(--pf-t--global--text--color--regular)',
            fontWeight: item.is_overdue ? 600 : 400,
            fontSize: 12,
          }}>
            {new Date(item.target_date).toLocaleDateString(localeDateFormat)}
          </span>
        ) : (
          <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>—</span>
        )}
      </Td>
      <Td style={{ fontSize: 12, color: 'var(--pf-t--global--text--color--subtle)' }}>
        {new Date(item.created_at).toLocaleDateString(localeDateFormat)}
      </Td>
      <Td>
        <span style={{ fontSize: 12 }}>{item.created_by_name}</span>
      </Td>
      <Td style={{ whiteSpace: 'nowrap' }}>
        {canProgress && (
          <Button variant="link" size="sm" isLoading={updateMutation.isPending} onClick={() => updateMutation.mutate({ status: 'in_progress' })}>
            {t('remediations.start')}
          </Button>
        )}
        {canResolve && (
          <Button variant="link" size="sm" isLoading={updateMutation.isPending} onClick={() => updateMutation.mutate({ status: 'resolved' })}>
            {t('remediations.markResolved')}
          </Button>
        )}
        {canVerify && (
          <Button variant="link" size="sm" isLoading={updateMutation.isPending} onClick={() => updateMutation.mutate({ status: 'verified' })}>
            {t('remediations.verify')}
          </Button>
        )}
        {canReopen && (
          <Button variant="link" size="sm" isLoading={updateMutation.isPending} onClick={() => updateMutation.mutate({ status: 'open' })}>
            {t('remediations.reopen')}
          </Button>
        )}
      </Td>
    </Tr>
  )
}
