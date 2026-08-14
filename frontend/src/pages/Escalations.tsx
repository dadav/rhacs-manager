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
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarFilter,
  ToolbarItem,
} from '@patternfly/react-core'
import { ExpandableRowContent, Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table'
import {
  AngleDownIcon,
  AngleRightIcon,
  CheckCircleIcon,
  OutlinedQuestionCircleIcon,
} from '@patternfly/react-icons'
import { getErrorMessage } from '../utils/errors'
import { formatDate, formatEpssPercent } from '../utils/format'
import { TableSkeleton } from '../components/TableSkeleton'
import { MentionTextArea } from '../components/MentionTextArea'
import { Fragment, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useDebounce } from '../hooks/useDebounce'
import {
  useActiveEscalationSearch,
  useAddEscalationComment,
  useUpcomingEscalationSearch,
} from '../api/escalations'
import { useAuth } from '../hooks/useAuth'
import { useScope } from '../hooks/useScope'
import { useToast } from '../components/ToastContext'
import { BRAND_BLUE } from '../tokens'
import type { ActiveEscalationRow } from '../types'

const PER_PAGE = 20
const FORM_SELECT_STYLE: React.CSSProperties = { maxWidth: 200 }

export function Escalations() {
  const { t, i18n } = useTranslation()
  const { isSecTeam } = useAuth()
  const { scopeParams } = useScope()
  const { addToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const LEVEL_LABELS: Record<number, string> = {
    1: t('escalations.level1'),
    2: t('escalations.level2'),
    3: t('escalations.levelCritical'),
  }
  const SEVERITY_LABELS: Record<number, string> = {
    0: t('severity.0'),
    1: t('severity.1'),
    2: t('severity.2'),
    3: t('severity.3'),
    4: t('severity.4'),
  }
  const LEVEL_LABEL_COLORS: Record<number, 'orange' | 'red' | 'purple'> = {
    1: 'orange',
    2: 'red',
    3: 'purple',
  }

  function LevelBadge({ level }: { level: number }) {
    return <Label color={LEVEL_LABEL_COLORS[level] ?? 'grey'}>{LEVEL_LABELS[level] ?? `Level ${level}`}</Label>
  }

  // --- URL param helpers ---
  function updateParams(changes: Record<string, string | null>, pageKeyToReset?: string) {
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev)
        if (pageKeyToReset) next.delete(pageKeyToReset)
        for (const [key, val] of Object.entries(changes)) {
          next.delete(key)
          if (val !== null && val !== '') next.set(key, val)
        }
        return next
      },
      { replace: true },
    )
  }
  function setPageParam(key: string, p: number) {
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev)
        if (p === 1) next.delete(key)
        else next.set(key, String(p))
        return next
      },
      { replace: true },
    )
  }

  const scopeKey = `${scopeParams.cluster ?? ''}\u0000${scopeParams.namespace ?? ''}`
  const previousScopeKey = useRef(scopeKey)
  useEffect(() => {
    if (previousScopeKey.current === scopeKey) return
    previousScopeKey.current = scopeKey
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev)
        next.delete('page')
        next.delete('up_page')
        return next
      },
      { replace: true },
    )
  }, [scopeKey, setSearchParams])

  // =========================================================================
  // Upcoming section
  // =========================================================================
  const upLevel = searchParams.get('up_level') || ''
  const upSeverity = searchParams.get('up_severity') || ''
  const upDays = searchParams.get('up_days') || ''
  const upPage = Math.max(1, Number(searchParams.get('up_page')) || 1)
  const urlUpSearch = searchParams.get('up_search') || ''
  const [upSearchInput, setUpSearchInput] = useState(urlUpSearch)
  const debouncedUpSearch = useDebounce(upSearchInput, 300)
  useEffect(() => {
    setUpSearchInput(urlUpSearch)
  }, [urlUpSearch])
  useEffect(() => {
    updateParams({ up_search: debouncedUpSearch || null }, 'up_page')
  }, [debouncedUpSearch])

  const upcoming = useUpcomingEscalationSearch({
    page: upPage,
    page_size: PER_PAGE,
    search: debouncedUpSearch || undefined,
    next_level: upLevel || undefined,
    severity: upSeverity || undefined,
    days_max: upDays || undefined,
    cluster: scopeParams.cluster,
    namespace: scopeParams.namespace,
  })
  const upItems = upcoming.data?.items ?? []
  const upTotal = upcoming.data?.total ?? 0

  const upLabels: string[] = []
  if (upLevel) upLabels.push(`${t('escalations.nextLevel')}: ${LEVEL_LABELS[Number(upLevel)]}`)
  if (upSeverity) upLabels.push(`${t('cves.severity')}: ${SEVERITY_LABELS[Number(upSeverity)]}`)
  if (upDays) upLabels.push(`${t('escalations.within', { count: Number(upDays) })}`)

  function clearUpcomingFilters() {
    setUpSearchInput('')
    updateParams({ up_search: null, up_level: null, up_severity: null, up_days: null }, 'up_page')
  }

  // =========================================================================
  // Active section
  // =========================================================================
  const activeLevel = searchParams.get('level') || ''
  const emailStatus = searchParams.get('email_status') || ''
  const rawContact = searchParams.get('contact')
  // Sec-team default is "needs action"; regular users always see all rows.
  const contactFilter = isSecTeam ? (rawContact ?? 'needs_action') : 'all'
  const activePage = Math.max(1, Number(searchParams.get('page')) || 1)
  const urlActiveSearch = searchParams.get('search') || ''
  const [activeSearchInput, setActiveSearchInput] = useState(urlActiveSearch)
  const debouncedActiveSearch = useDebounce(activeSearchInput, 300)
  useEffect(() => {
    setActiveSearchInput(urlActiveSearch)
  }, [urlActiveSearch])
  useEffect(() => {
    updateParams({ search: debouncedActiveSearch || null }, 'page')
  }, [debouncedActiveSearch])

  const active = useActiveEscalationSearch({
    page: activePage,
    page_size: PER_PAGE,
    search: debouncedActiveSearch || undefined,
    level: activeLevel || undefined,
    email_status: isSecTeam ? emailStatus || undefined : undefined,
    contact_status: contactFilter === 'all' ? undefined : contactFilter,
    cluster: scopeParams.cluster,
    namespace: scopeParams.namespace,
  })

  // Rows contacted this session are hidden immediately from the default queue,
  // before the invalidated query refetches.
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    setRemovedIds(new Set())
  }, [activeLevel, emailStatus, rawContact, debouncedActiveSearch, activePage, scopeParams.cluster, scopeParams.namespace])

  const activeItems = (active.data?.items ?? []).filter(r => !removedIds.has(r.id))
  const activeTotal = active.data?.total ?? 0
  const counts = active.data?.contact_counts
  const hiddenByContact =
    contactFilter === 'needs_action'
      ? counts?.contacted ?? 0
      : contactFilter === 'contacted'
        ? counts?.needs_action ?? 0
        : 0
  const hasElectiveActiveFilters = Boolean(
    debouncedActiveSearch || activeLevel || emailStatus || contactFilter !== 'needs_action',
  )

  const activeLabels: string[] = []
  if (activeLevel) activeLabels.push(`${t('escalations.level')}: ${LEVEL_LABELS[Number(activeLevel)]}`)
  if (isSecTeam && emailStatus)
    activeLabels.push(
      `${t('escalations.emailStatus')}: ${emailStatus === 'notified' ? t('escalations.emailSent') : t('escalations.emailPending')}`,
    )
  if (isSecTeam && contactFilter !== 'needs_action')
    activeLabels.push(
      `${t('escalations.contactStatus')}: ${contactFilter === 'contacted' ? t('escalations.contacted') : t('escalations.allContactStates')}`,
    )

  function clearActiveFilters() {
    setActiveSearchInput('')
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev)
        next.delete('search')
        next.delete('level')
        next.delete('email_status')
        next.delete('page')
        // Clear-all explicitly selects all contact states for sec users.
        if (isSecTeam) next.set('contact', 'all')
        else next.delete('contact')
        return next
      },
      { replace: true },
    )
  }

  // --- Inline composer state ---
  const addComment = useAddEscalationComment()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [rowError, setRowError] = useState<Record<string, string>>({})

  function setDraft(id: string, value: string) {
    setDrafts(prev => ({ ...prev, [id]: value }))
  }

  async function submitComment(row: ActiveEscalationRow) {
    const message = (drafts[row.id] ?? '').trim()
    if (!message) return
    try {
      await addComment.mutateAsync({ escalationId: row.id, message })
      // Success: drop the draft, collapse, hide from the default queue, toast.
      setDrafts(prev => {
        const next = { ...prev }
        delete next[row.id]
        return next
      })
      setRowError(prev => {
        const next = { ...prev }
        delete next[row.id]
        return next
      })
      setExpandedId(null)
      if (contactFilter === 'needs_action') {
        setRemovedIds(prev => new Set(prev).add(row.id))
      }
      addToast(t('escalations.contactRecorded', { cve: row.cve_id }))
    } catch (e) {
      // Preserve the draft; surface an explicit error on the row.
      setRowError(prev => ({ ...prev, [row.id]: getErrorMessage(e) }))
    }
  }

  const activeColSpan = isSecTeam ? 7 : 4

  return (
    <>
      <PageSection variant="default">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Title headingLevel="h1" size="xl">
            {t('escalations.title')}
          </Title>
          <Popover
            headerContent={t('escalations.whatAre')}
            bodyContent={
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 8px' }}>{t('escalations.helpBody1')}</p>
                <p style={{ margin: '0 0 8px' }}>
                  <strong>{t('escalations.helpBody2Level1')}</strong> - {t('escalations.helpBody2Level1Desc')}
                  <br />
                  <strong>{t('escalations.helpBody2Level2')}</strong> - {t('escalations.helpBody2Level2Desc')}
                  <br />
                  <strong>{t('escalations.helpBody2Level3')}</strong> - {t('escalations.helpBody2Level3Desc')}
                </p>
                <p style={{ margin: 0 }}>{t('escalations.helpBody3')}</p>
              </div>
            }
            position="right"
          >
            <Button variant="plain" aria-label={t('escalations.helpLabel')} style={{ padding: '4px 6px' }}>
              <OutlinedQuestionCircleIcon style={{ color: 'var(--pf-t--global--text--color--subtle)' }} />
            </Button>
          </Popover>
        </div>
      </PageSection>

      {/* ---------------------------------------------------------------- */}
      {/* Upcoming escalations                                             */}
      {/* ---------------------------------------------------------------- */}
      <PageSection>
        <Title headingLevel="h2" size="lg" style={{ marginBottom: 12 }}>
          {t('escalations.upcoming')}
        </Title>
        {upcoming.isLoading ? (
          <TableSkeleton columns={6} />
        ) : upcoming.error ? (
          <Alert variant="danger" title={`${t('common.error')}: ${getErrorMessage(upcoming.error)}`} />
        ) : (
          <>
            <Alert
              variant="info"
              isInline
              title={t('escalations.upcomingCount', { count: upTotal })}
              style={{ marginBottom: 16 }}
            />
            <Toolbar
              clearAllFilters={clearUpcomingFilters}
              clearFiltersButtonText={t('common.clearAll')}
              style={{ padding: 0, marginBottom: 8 }}
            >
              <ToolbarContent>
                <ToolbarItem>
                  <SearchInput
                    placeholder={t('escalations.searchPlaceholder')}
                    value={upSearchInput}
                    onChange={(_e, v) => setUpSearchInput(v)}
                    onClear={() => setUpSearchInput('')}
                    aria-label={t('escalations.searchLabel')}
                    style={{ width: 220 }}
                  />
                </ToolbarItem>
                <ToolbarFilter
                  labels={upLevel ? [upLabels[0]] : []}
                  deleteLabel={() => updateParams({ up_level: null }, 'up_page')}
                  categoryName={t('escalations.nextLevel')}
                >
                  <FormSelect
                    value={upLevel}
                    onChange={(_e, v) => updateParams({ up_level: v || null }, 'up_page')}
                    aria-label={t('escalations.filterLevel')}
                    style={FORM_SELECT_STYLE}
                  >
                    <FormSelectOption value="" label={t('escalations.allLevels')} />
                    <FormSelectOption value="1" label={t('escalations.level1')} />
                    <FormSelectOption value="2" label={t('escalations.level2')} />
                    <FormSelectOption value="3" label={t('escalations.levelCritical')} />
                  </FormSelect>
                </ToolbarFilter>
                <ToolbarFilter
                  labels={upSeverity ? [`${t('cves.severity')}: ${SEVERITY_LABELS[Number(upSeverity)]}`] : []}
                  deleteLabel={() => updateParams({ up_severity: null }, 'up_page')}
                  categoryName={t('cves.severity')}
                >
                  <FormSelect
                    value={upSeverity}
                    onChange={(_e, v) => updateParams({ up_severity: v || null }, 'up_page')}
                    aria-label={t('escalations.filterSeverity')}
                    style={FORM_SELECT_STYLE}
                  >
                    <FormSelectOption value="" label={t('escalations.allSeverities')} />
                    <FormSelectOption value="4" label={t('severity.4')} />
                    <FormSelectOption value="3" label={t('severity.3')} />
                    <FormSelectOption value="2" label={t('severity.2')} />
                    <FormSelectOption value="1" label={t('severity.1')} />
                  </FormSelect>
                </ToolbarFilter>
                <ToolbarFilter
                  labels={upDays ? [t('escalations.within', { count: Number(upDays) })] : []}
                  deleteLabel={() => updateParams({ up_days: null }, 'up_page')}
                  categoryName={t('escalations.urgency')}
                >
                  <FormSelect
                    value={upDays}
                    onChange={(_e, v) => updateParams({ up_days: v || null }, 'up_page')}
                    aria-label={t('escalations.filterUrgency')}
                    style={FORM_SELECT_STYLE}
                  >
                    <FormSelectOption value="" label={t('escalations.anyUrgency')} />
                    <FormSelectOption value="1" label={t('escalations.within', { count: 1 })} />
                    <FormSelectOption value="3" label={t('escalations.within', { count: 3 })} />
                    <FormSelectOption value="7" label={t('escalations.within', { count: 7 })} />
                    <FormSelectOption value="14" label={t('escalations.within', { count: 14 })} />
                  </FormSelect>
                </ToolbarFilter>
              </ToolbarContent>
            </Toolbar>
            {upItems.length === 0 ? (
              <EmptyState>
                <EmptyStateBody>
                  {upTotal === 0 && !upLabels.length && !debouncedUpSearch
                    ? t('escalations.noUpcoming')
                    : t('common.noFilterResults')}
                </EmptyStateBody>
              </EmptyState>
            ) : (
              <>
                <Table variant="compact" isStickyHeader>
                  <Thead>
                    <Tr>
                      <Th>{t('cves.cveId')}</Th>
                      <Th>{t('cves.severity')}</Th>
                      <Th>EPSS</Th>
                      <Th>{t('escalations.ageDays')}</Th>
                      <Th>{t('escalations.nextLevel')}</Th>
                      <Th>{t('escalations.daysUntil')}</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {upItems.map(u => (
                      <Tr
                        key={`${u.cve_id}-${u.next_level}`}
                        style={{
                          background: u.days_until_escalation <= 1 ? 'rgba(201, 25, 11, 0.1)' : undefined,
                        }}
                      >
                        <Td>
                          <Link
                            to={`/vulnerabilities/${u.cve_id}`}
                            style={{ fontFamily: 'monospace', color: BRAND_BLUE, fontSize: 12 }}
                          >
                            {u.cve_id}
                          </Link>
                        </Td>
                        <Td>{SEVERITY_LABELS[u.severity] ?? `${u.severity}`}</Td>
                        <Td>{formatEpssPercent(u.epss_probability)}</Td>
                        <Td>{u.current_age_days}</Td>
                        <Td>
                          <LevelBadge level={u.next_level} />
                        </Td>
                        <Td style={{ fontWeight: u.days_until_escalation <= 1 ? 700 : 400 }}>
                          {u.days_until_escalation}{' '}
                          {u.days_until_escalation === 1 ? t('common.day') : t('common.day_plural')}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                {upTotal > PER_PAGE && (
                  <div style={{ marginTop: 12 }}>
                    <Pagination
                      itemCount={upTotal}
                      perPage={PER_PAGE}
                      page={upPage}
                      onSetPage={(_, p) => setPageParam('up_page', p)}
                      variant="bottom"
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </PageSection>

      {/* ---------------------------------------------------------------- */}
      {/* Active escalations                                               */}
      {/* ---------------------------------------------------------------- */}
      <PageSection variant="default" isFilled>
        <Title headingLevel="h2" size="lg" style={{ marginBottom: 12 }}>
          {t('escalations.active')}
        </Title>
        {active.isLoading ? (
          <TableSkeleton columns={activeColSpan} />
        ) : active.error ? (
          <Alert variant="danger" title={`${t('common.error')}: ${getErrorMessage(active.error)}`} />
        ) : (
          <>
            <Alert
              variant={activeTotal > 0 ? 'warning' : 'success'}
              isInline
              title={t('escalations.activeVisibleCount', { count: activeTotal })}
              style={{ marginBottom: 16 }}
            >
              {hiddenByContact > 0 && (
                <span>{t('escalations.hiddenByContact', { count: hiddenByContact })}</span>
              )}
            </Alert>
            <Toolbar
              clearAllFilters={clearActiveFilters}
              clearFiltersButtonText={t('common.clearAll')}
              style={{ padding: 0, marginBottom: 8 }}
            >
              <ToolbarContent>
                <ToolbarItem>
                  <SearchInput
                    placeholder={t('escalations.searchPlaceholder')}
                    value={activeSearchInput}
                    onChange={(_e, v) => setActiveSearchInput(v)}
                    onClear={() => setActiveSearchInput('')}
                    aria-label={t('escalations.searchLabel')}
                    style={{ width: 220 }}
                  />
                </ToolbarItem>
                <ToolbarFilter
                  labels={activeLevel ? [activeLabels[0]] : []}
                  deleteLabel={() => updateParams({ level: null }, 'page')}
                  categoryName={t('escalations.level')}
                >
                  <FormSelect
                    value={activeLevel}
                    onChange={(_e, v) => updateParams({ level: v || null }, 'page')}
                    aria-label={t('escalations.filterLevelLabel')}
                    style={FORM_SELECT_STYLE}
                  >
                    <FormSelectOption value="" label={t('escalations.allLevelsLabel')} />
                    <FormSelectOption value="1" label={t('escalations.level1')} />
                    <FormSelectOption value="2" label={t('escalations.level2')} />
                    <FormSelectOption value="3" label={t('escalations.levelCritical')} />
                  </FormSelect>
                </ToolbarFilter>
                {isSecTeam && (
                  <ToolbarFilter
                    labels={
                      emailStatus
                        ? [emailStatus === 'notified' ? t('escalations.emailSent') : t('escalations.emailPending')]
                        : []
                    }
                    deleteLabel={() => updateParams({ email_status: null }, 'page')}
                    categoryName={t('escalations.emailStatus')}
                  >
                    <FormSelect
                      value={emailStatus}
                      onChange={(_e, v) => updateParams({ email_status: v || null }, 'page')}
                      aria-label={t('escalations.emailStatus')}
                      style={FORM_SELECT_STYLE}
                    >
                      <FormSelectOption value="" label={t('escalations.emailStatusAll')} />
                      <FormSelectOption value="notified" label={t('escalations.emailSent')} />
                      <FormSelectOption value="pending" label={t('escalations.emailPending')} />
                    </FormSelect>
                  </ToolbarFilter>
                )}
                {isSecTeam && (
                  <ToolbarFilter
                    labels={
                      contactFilter !== 'all'
                        ? [contactFilter === 'contacted' ? t('escalations.contacted') : t('escalations.needsAction')]
                        : []
                    }
                    deleteLabel={() => updateParams({ contact: 'all' }, 'page')}
                    categoryName={t('escalations.contactStatus')}
                  >
                    <FormSelect
                      value={contactFilter}
                      onChange={(_e, v) => updateParams({ contact: v === 'needs_action' ? null : v }, 'page')}
                      aria-label={t('escalations.contactStatus')}
                      style={FORM_SELECT_STYLE}
                    >
                      <FormSelectOption value="needs_action" label={t('escalations.needsAction')} />
                      <FormSelectOption value="contacted" label={t('escalations.contacted')} />
                      <FormSelectOption value="all" label={t('escalations.allContactStates')} />
                    </FormSelect>
                  </ToolbarFilter>
                )}
              </ToolbarContent>
            </Toolbar>
            {activeItems.length === 0 ? (
              activeTotal === 0 && contactFilter === 'needs_action' && hiddenByContact > 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--pf-t--global--text--color--subtle)' }}>
                  <CheckCircleIcon style={{ fontSize: 32, color: '#1e8f19', display: 'block', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 14, margin: 0 }}>{t('escalations.allContacted', { count: hiddenByContact })}</p>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--pf-t--global--text--color--subtle)' }}>
                  <CheckCircleIcon style={{ fontSize: 32, color: '#1e8f19', display: 'block', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 14, margin: 0 }}>
                    {hasElectiveActiveFilters ? t('common.noFilterResults') : t('escalations.noActive')}
                  </p>
                </div>
              )
            ) : (
              <>
                <Table variant="compact" isStickyHeader isExpandable>
                  <Thead>
                    <Tr>
                      {isSecTeam && <Th screenReaderText={t('escalations.expandRow')} />}
                      <Th>{t('cves.cveId')}</Th>
                      <Th>{t('cves.namespace')}</Th>
                      <Th>{t('escalations.level')}</Th>
                      <Th>{t('escalations.triggeredAt')}</Th>
                      {isSecTeam && <Th>{t('escalations.emailStatus')}</Th>}
                      {isSecTeam && <Th>{t('escalations.contactStatus')}</Th>}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {activeItems.map(e => {
                      const isExpanded = expandedId === e.id
                      return (
                        <Fragment key={e.id}>
                          <Tr>
                            {isSecTeam && (
                              <Td style={{ width: 32 }}>
                                <Button
                                  variant="plain"
                                  aria-label={isExpanded ? t('escalations.collapseRow') : t('escalations.expandRow')}
                                  onClick={() => setExpandedId(isExpanded ? null : e.id)}
                                  style={{ padding: 4 }}
                                >
                                  {isExpanded ? <AngleDownIcon /> : <AngleRightIcon />}
                                </Button>
                              </Td>
                            )}
                            <Td>
                              <Link
                                to={`/vulnerabilities/${e.cve_id}`}
                                style={{ fontFamily: 'monospace', color: BRAND_BLUE, fontSize: 12 }}
                              >
                                {e.cve_id}
                              </Link>
                            </Td>
                            <Td>
                              {e.cluster_name}/{e.namespace}
                            </Td>
                            <Td>
                              <LevelBadge level={e.level} />
                            </Td>
                            <Td style={{ fontSize: 12, color: 'var(--pf-t--global--text--color--subtle)' }}>
                              {formatDate(e.triggered_at, i18n.language)}
                            </Td>
                            {isSecTeam && (
                              <Td style={{ fontSize: 12 }}>
                                {e.notified ? (
                                  <span style={{ color: '#1e8f19' }}>{t('escalations.emailSent')}</span>
                                ) : (
                                  <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>
                                    {t('escalations.emailPending')}
                                  </span>
                                )}
                              </Td>
                            )}
                            {isSecTeam && (
                              <Td>
                                {e.contacted ? (
                                  <Label color="green">{t('escalations.contacted')}</Label>
                                ) : (
                                  <Label color="orange">{t('escalations.needsAction')}</Label>
                                )}
                              </Td>
                            )}
                          </Tr>
                          {isSecTeam && isExpanded && (
                            <Tr isExpanded>
                              <Td colSpan={activeColSpan}>
                                <ExpandableRowContent>
                                  <div style={{ padding: '8px 4px 4px 36px' }}>
                                  <div style={{ fontSize: 12, marginBottom: 6, color: 'var(--pf-t--global--text--color--subtle)' }}>
                                    {t('escalations.composerHint', {
                                      cve: e.cve_id,
                                      cluster: e.cluster_name,
                                      namespace: e.namespace,
                                      level: e.level,
                                    })}
                                  </div>
                                  {rowError[e.id] && (
                                    <Alert
                                      variant="danger"
                                      isInline
                                      isPlain
                                      title={`${t('common.error')}: ${rowError[e.id]}`}
                                      style={{ marginBottom: 8 }}
                                    />
                                  )}
                                  <MentionTextArea
                                    value={drafts[e.id] ?? ''}
                                    onChange={v => setDraft(e.id, v)}
                                    placeholder={t('escalations.composerPlaceholder')}
                                    rows={3}
                                  />
                                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      isLoading={addComment.isPending}
                                      isDisabled={!(drafts[e.id] ?? '').trim() || addComment.isPending}
                                      onClick={() => submitComment(e)}
                                    >
                                      {t('escalations.recordContact')}
                                    </Button>
                                    <Button variant="link" size="sm" onClick={() => setExpandedId(null)}>
                                      {t('common.cancel')}
                                    </Button>
                                  </div>
                                  </div>
                                </ExpandableRowContent>
                              </Td>
                            </Tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </Tbody>
                </Table>
                {activeTotal > PER_PAGE && (
                  <div style={{ marginTop: 12 }}>
                    <Pagination
                      itemCount={activeTotal}
                      perPage={PER_PAGE}
                      page={activePage}
                      onSetPage={(_, p) => setPageParam('page', p)}
                      variant="bottom"
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </PageSection>
    </>
  )
}
