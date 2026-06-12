import {
  Alert,
  Button,
  EmptyState,
  EmptyStateBody,
  Label,
  PageSection,
  Pagination,
  Popover,
  SearchInput,
  Title,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core'
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table'
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons'
import { getErrorMessage } from '../utils/errors'
import { formatDate } from '../utils/format'
import { TableSkeleton } from '../components/TableSkeleton'
import { useToast } from '../components/ToastContext'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useDebounce } from '../hooks/useDebounce'
import { useRemediations, useRemediationStats, useUpdateRemediation, useDeleteRemediation } from '../api/remediations'
import { useScope } from '../hooks/useScope'
import { REMEDIATION_LABEL_COLORS, BRAND_BLUE } from '../tokens'
import type { RemediationItem } from '../types'
import { RemediationStatus } from '../types'

const STATUS_TOGGLE_KEYS = ['', 'open', 'in_progress', 'resolved', 'verified', 'wont_fix'] as const

const PER_PAGE = 20

export function Remediations() {
  const { t, i18n } = useTranslation()
  const { scopeParams } = useScope()
  const [searchParams, setSearchParams] = useSearchParams()

  const STATUS_LABELS: Record<string, string> = {
    open: t('remediations.statusOpen'),
    in_progress: t('remediations.statusInProgress'),
    resolved: t('remediations.statusResolved'),
    verified: t('remediations.statusVerified'),
    wont_fix: t('remediations.statusWontFix'),
  }

  // --- Filter state from URL ---
  const statusFilter = searchParams.get('status') ?? ''
  const urlSearch = searchParams.get('search') || ''
  const overdueFilter = searchParams.get('overdue') === '1'
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  // Local input + debounced URL write for the CVE search box
  const [searchInput, setSearchInput] = useState(urlSearch)
  const debouncedSearch = useDebounce(searchInput, 300)
  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) return
    updateParams({ search: debouncedSearch || null })
  }, [debouncedSearch])
  useEffect(() => { mountedRef.current = true }, [])

  function updateParams(changes: Record<string, string | null>, resetPage = true) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (resetPage) next.delete('page')
      for (const [key, val] of Object.entries(changes)) {
        next.delete(key)
        if (val !== null) next.set(key, val)
      }
      return next
    }, { replace: true })
  }

  function setPage(p: number) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (p === 1) next.delete('page'); else next.set('page', String(p))
      return next
    }, { replace: true })
  }

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
    if (debouncedSearch) {
      const q = debouncedSearch.toUpperCase()
      items = items.filter(r => r.cve_id.toUpperCase().includes(q))
    }
    return items
  }, [data, debouncedSearch])

  const total = filtered.length
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

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
                  <strong>{t('remediations.helpBody2Open')}</strong> - {t('remediations.helpBody2OpenDesc')}<br />
                  <strong>{t('remediations.helpBody2InProgress')}</strong> - {t('remediations.helpBody2InProgressDesc')}<br />
                  <strong>{t('remediations.helpBody2Resolved')}</strong> - {t('remediations.helpBody2ResolvedDesc')}<br />
                  <strong>{t('remediations.helpBody2Verified')}</strong> - {t('remediations.helpBody2VerifiedDesc')}
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
        <PageSection variant="default">
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
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (key === 'overdue') {
                    updateParams({ overdue: overdueFilter ? null : '1', status: null })
                  } else {
                    updateParams({ status: statusFilter === key ? null : key, overdue: null })
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.currentTarget.click()
                  }
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
                value={searchInput}
                onChange={(_e, v) => setSearchInput(v)}
                onClear={() => setSearchInput('')}
                aria-label={t('remediations.searchLabel')}
                style={{ width: 220 }}
              />
            </ToolbarItem>
            <ToolbarItem>
              <ToggleGroup aria-label={t('remediations.filterStatus')}>
                {STATUS_TOGGLE_KEYS.map(value => (
                  <ToggleGroupItem
                    key={value || 'all'}
                    text={value ? STATUS_LABELS[value] : t('remediations.allStatuses')}
                    isSelected={statusFilter === value}
                    onChange={() => updateParams({ status: value || null, overdue: null })}
                  />
                ))}
              </ToggleGroup>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        {isLoading ? (
          <TableSkeleton columns={8} />
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
                    statusLabels={STATUS_LABELS}
                    lang={i18n.language}
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
  statusLabels,
  lang,
  StatusBadge,
  t,
}: {
  item: RemediationItem
  statusLabels: Record<string, string>
  lang: string
  StatusBadge: React.ComponentType<{ status: string; isOverdue: boolean }>
  t: (key: string) => string
}) {
  const { addToast } = useToast()
  const updateMutation = useUpdateRemediation(item.id)

  // Reset mutation once refetched data arrives (status changed), so the next action button is enabled
  useEffect(() => {
    if (updateMutation.isSuccess) updateMutation.reset()
  }, [item.status])

  const mutationBusy = updateMutation.isPending || updateMutation.isSuccess
  const canProgress = item.status === RemediationStatus.open
  const canResolve = item.status === RemediationStatus.in_progress
  const canReopen = item.status === RemediationStatus.wont_fix

  function changeStatus(status: string) {
    updateMutation.mutate(
      { status },
      { onSuccess: () => addToast(t('toast.remediationUpdated')) },
    )
  }

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
        {item.assigned_to_name ?? <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>-</span>}
      </Td>
      <Td>
        {item.target_date ? (
          <span style={{
            color: item.is_overdue ? '#c9190b' : 'var(--pf-t--global--text--color--regular)',
            fontWeight: item.is_overdue ? 600 : 400,
            fontSize: 12,
          }}>
            {formatDate(item.target_date, lang)}
          </span>
        ) : (
          <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>-</span>
        )}
      </Td>
      <Td style={{ fontSize: 12, color: 'var(--pf-t--global--text--color--subtle)' }}>
        {formatDate(item.created_at, lang)}
      </Td>
      <Td>
        <span style={{ fontSize: 12 }}>{item.created_by_name}</span>
      </Td>
      <Td style={{ whiteSpace: 'nowrap' }}>
        {canProgress && (
          <Button variant="link" size="sm" isDisabled={mutationBusy} isLoading={mutationBusy} onClick={() => changeStatus('in_progress')}>
            {t('remediations.start')}
          </Button>
        )}
        {canResolve && (
          <Button variant="link" size="sm" isDisabled={mutationBusy} isLoading={mutationBusy} onClick={() => changeStatus('resolved')}>
            {t('remediations.markResolved')}
          </Button>
        )}
        {canReopen && (
          <Button variant="link" size="sm" isDisabled={mutationBusy} isLoading={mutationBusy} onClick={() => changeStatus('open')}>
            {t('remediations.reopen')}
          </Button>
        )}
      </Td>
    </Tr>
  )
}
