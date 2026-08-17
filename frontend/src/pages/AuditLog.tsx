import {
  Alert,
  AlertActionCloseButton,
  Badge,
  Button,
  CodeBlock,
  CodeBlockCode,
  DatePicker,
  EmptyState,
  EmptyStateBody,
  ExpandableSection,
  FormSelect,
  FormSelectOption,
  PageSection,
  Pagination,
  SearchInput,
  Spinner,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core'
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table'
import { ExportIcon } from '@patternfly/react-icons'
import { getErrorMessage } from '../utils/errors'
import { formatDateTime } from '../utils/format'
import { TableSkeletonRows } from '../components/TableSkeleton'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useAuditLog, useAuditFilters, exportAuditExcel } from '../api/audit'
import { useDebounce } from '../hooks/useDebounce'
import { useTranslation } from 'react-i18next'

const PER_PAGE = 50
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function DetailsCell({ details }: { details: Record<string, unknown> }) {
  const isEmpty = Object.keys(details).length === 0
  if (isEmpty) return <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>–</span>

  const formatted = JSON.stringify(details, null, 2)
  const summary = Object.entries(details)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join(', ')
    .slice(0, 60)

  return (
    <div style={{ maxWidth: 300, overflow: 'hidden' }}>
      <ExpandableSection
        toggleText={summary + (summary.length < JSON.stringify(details).length ? '…' : '')}
      >
        <CodeBlock style={{ maxHeight: 200, overflow: 'auto' }}>
          <CodeBlockCode>{formatted}</CodeBlockCode>
        </CodeBlock>
      </ExpandableSection>
    </div>
  )
}

export function AuditLog() {
  const { t, i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()

  // --- Filter state from URL (shareable + reload-safe, like CveList) ---
  const urlPage = Math.max(1, Number(searchParams.get('page')) || 1)
  const urlSearch = searchParams.get('search') || ''
  const urlAction = searchParams.get('action') || ''
  const urlEntity = searchParams.get('entity_type') || ''
  const urlFrom = searchParams.get('date_from') || ''
  const urlTo = searchParams.get('date_to') || ''

  const [searchInput, setSearchInput] = useState(urlSearch)
  const debouncedSearch = useDebounce(searchInput, 300)

  // Skip the mount write so a fresh load doesn't redundantly rewrite the URL.
  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) return
    updateParams({ search: debouncedSearch || null })
  }, [debouncedSearch])
  useEffect(() => {
    mountedRef.current = true
  }, [])

  // Pass null to delete a key; resetPage drops pagination back to page 1.
  function updateParams(changes: Record<string, string | null>, resetPage = true) {
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev)
        if (resetPage) next.delete('page')
        for (const [key, val] of Object.entries(changes)) {
          next.delete(key)
          if (val !== null) next.set(key, val)
        }
        return next
      },
      { replace: true },
    )
  }

  function setPage(p: number) {
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev)
        if (p === 1) next.delete('page')
        else next.set('page', String(p))
        return next
      },
      { replace: true },
    )
  }

  // Only write a date when cleared or a complete ISO value; ignore partial typing.
  function onDateChange(key: 'date_from' | 'date_to', value: string) {
    if (!value) updateParams({ [key]: null })
    else if (ISO_DATE.test(value)) updateParams({ [key]: value })
  }

  function clearFilters() {
    setSearchInput('')
    updateParams({ search: null, action: null, entity_type: null, date_from: null, date_to: null })
  }

  const activeFilterCount = [debouncedSearch, urlAction, urlEntity, urlFrom, urlTo].filter(Boolean).length

  const filters = {
    search: debouncedSearch || undefined,
    action: urlAction || undefined,
    entity_type: urlEntity || undefined,
    date_from: urlFrom || undefined,
    date_to: urlTo || undefined,
  }

  const { data, isLoading, error } = useAuditLog(urlPage, filters, PER_PAGE)
  const { data: filterOptions } = useAuditFilters()

  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  async function handleExport() {
    setExporting(true)
    setExportError(null)
    try {
      await exportAuditExcel(filters)
    } catch (e) {
      setExportError(getErrorMessage(e))
    } finally {
      setExporting(false)
    }
  }

  function actionLabel(action: string): string {
    const key = `auditLog.actions.${action}`
    const translated = t(key)
    return translated === key ? action.replace(/_/g, ' ') : translated
  }

  function entityLabel(entity: string): string {
    const key = `auditLog.entities.${entity}`
    const translated = t(key)
    return translated === key ? entity.replace(/_/g, ' ') : translated
  }

  return (
    <>
      <PageSection variant="default">
        <Title headingLevel="h1" size="xl">{t('auditLog.title')}</Title>
      </PageSection>

      {exportError && (
        <PageSection variant="default" padding={{ default: 'noPadding' }}>
          <Alert
            variant="danger"
            isInline
            title={exportError}
            actionClose={<AlertActionCloseButton onClose={() => setExportError(null)} />}
            style={{ margin: '0 var(--pf-t--global--spacer--lg)' }}
          />
        </PageSection>
      )}

      <PageSection variant="default" style={{ paddingBottom: 0 }}>
        <Toolbar style={{ paddingBottom: 0 }}>
          <ToolbarContent>
            <ToolbarItem style={{ minWidth: 160, flex: '1 1 220px', maxWidth: 300 }}>
              <SearchInput
                value={searchInput}
                onChange={(_e, v) => setSearchInput(v)}
                onClear={() => setSearchInput('')}
                placeholder={t('auditLog.searchPlaceholder')}
                aria-label={t('auditLog.searchPlaceholder')}
              />
            </ToolbarItem>
            <ToolbarItem style={{ minWidth: 160, flex: '0 1 200px' }}>
              <FormSelect
                value={urlAction}
                onChange={(_e, v) => updateParams({ action: v || null })}
                aria-label={t('auditLog.filterAction')}
              >
                <FormSelectOption value="" label={t('auditLog.filterAction')} />
                {(filterOptions?.actions ?? []).map(a => (
                  <FormSelectOption key={a} value={a} label={actionLabel(a)} />
                ))}
              </FormSelect>
            </ToolbarItem>
            <ToolbarItem style={{ minWidth: 140, flex: '0 1 180px' }}>
              <FormSelect
                value={urlEntity}
                onChange={(_e, v) => updateParams({ entity_type: v || null })}
                aria-label={t('auditLog.filterEntity')}
              >
                <FormSelectOption value="" label={t('auditLog.filterEntity')} />
                {(filterOptions?.entity_types ?? []).map(e => (
                  <FormSelectOption key={e} value={e} label={entityLabel(e)} />
                ))}
              </FormSelect>
            </ToolbarItem>
            <ToolbarItem>
              <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 8 }}>
                <DatePicker
                  value={urlFrom}
                  placeholder={t('auditLog.dateFrom')}
                  aria-label={t('auditLog.dateFrom')}
                  onChange={(_e, value) => onDateChange('date_from', value)}
                  appendTo={() => document.body}
                />
                <DatePicker
                  value={urlTo}
                  placeholder={t('auditLog.dateTo')}
                  aria-label={t('auditLog.dateTo')}
                  onChange={(_e, value) => onDateChange('date_to', value)}
                  appendTo={() => document.body}
                />
              </div>
            </ToolbarItem>
            {activeFilterCount > 0 && (
              <ToolbarItem>
                <Button variant="link" isInline onClick={clearFilters}>
                  {t('auditLog.clearFilters')} <Badge isRead>{activeFilterCount}</Badge>
                </Button>
              </ToolbarItem>
            )}
            <ToolbarItem align={{ default: 'alignEnd' }}>
              <Button
                variant="secondary"
                icon={exporting ? <Spinner size="sm" /> : <ExportIcon />}
                isDisabled={exporting || !data?.total}
                onClick={handleExport}
              >
                {t('auditLog.exportExcel')}
              </Button>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </PageSection>

      <PageSection variant="default" isFilled>
        {error ? (
          <Alert variant="danger" title={`${t('common.error')}: ${getErrorMessage(error)}`} />
        ) : !isLoading && !data?.items.length ? (
          <EmptyState>
            <EmptyStateBody>
              {activeFilterCount > 0 ? t('common.noFilterResults') : t('auditLog.noEntries')}
            </EmptyStateBody>
          </EmptyState>
        ) : (
          <>
            <Table variant="compact" isStickyHeader>
              <Thead>
                <Tr>
                  <Th>{t('auditLog.date')}</Th>
                  <Th>{t('auditLog.user')}</Th>
                  <Th>{t('auditLog.action')}</Th>
                  <Th>{t('auditLog.entity')}</Th>
                  <Th>{t('auditLog.entityId')}</Th>
                  <Th>{t('auditLog.details')}</Th>
                </Tr>
              </Thead>
              {isLoading ? (
                <Tbody><TableSkeletonRows columns={6} /></Tbody>
              ) : (
                <Tbody>
                  {data!.items.map(entry => (
                    <Tr key={entry.id}>
                      <Td style={{ fontSize: 11, color: 'var(--pf-t--global--text--color--subtle)', whiteSpace: 'nowrap' }}>
                        {formatDateTime(entry.created_at, i18n.language)}
                      </Td>
                      <Td style={{ fontSize: 12 }}>{entry.display_name ?? entry.username ?? '–'}</Td>
                      <Td style={{ fontSize: 12 }}>
                        {actionLabel(entry.action)}
                      </Td>
                      <Td style={{ fontSize: 12 }}>{entityLabel(entry.entity_type)}</Td>
                      <Td style={{ fontSize: 11, color: 'var(--pf-t--global--text--color--subtle)' }}>
                        {entry.entity_id ? (
                          <Tooltip content={entry.entity_id}>
                            <span style={{ fontFamily: 'monospace', cursor: 'default' }}>
                              {entry.entity_id.slice(0, 8)}…
                            </span>
                          </Tooltip>
                        ) : '–'}
                      </Td>
                      <Td style={{ maxWidth: 300 }}>
                        <DetailsCell details={entry.details} />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              )}
            </Table>
            {data && (
              <div style={{ marginTop: 16 }}>
                <Pagination
                  itemCount={data.total}
                  perPage={PER_PAGE}
                  page={urlPage}
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
