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
  ToolbarItem,
} from '@patternfly/react-core'
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table'
import { CheckCircleIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons'
import { getErrorMessage } from '../utils/errors'
import { formatDate, formatEpssPercent } from '../utils/format'
import { TableSkeleton } from '../components/TableSkeleton'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useDebounce } from '../hooks/useDebounce'
import { useEscalations, useUpcomingEscalations } from '../api/escalations'
import { useAuth } from '../hooks/useAuth'
import { useScope } from '../hooks/useScope'
import { LEVEL_COLORS, BRAND_BLUE } from '../tokens'
import type { Escalation, UpcomingEscalation } from '../types'

const PER_PAGE = 20

const FORM_SELECT_STYLE: React.CSSProperties = { maxWidth: 180 }

function filterUpcoming(
  items: UpcomingEscalation[],
  levelFilter: string,
  severityFilter: string,
): UpcomingEscalation[] {
  let result = items
  if (levelFilter) result = result.filter(u => u.next_level === Number(levelFilter))
  if (severityFilter) result = result.filter(u => u.severity === Number(severityFilter))
  return result
}

function filterActive(
  items: Escalation[],
  levelFilter: string,
  searchCve: string,
): Escalation[] {
  let result = items
  if (levelFilter) result = result.filter(e => e.level === Number(levelFilter))
  if (searchCve) {
    const q = searchCve.toUpperCase()
    result = result.filter(e => e.cve_id.toUpperCase().includes(q))
  }
  return result
}

export function Escalations() {
  const { t, i18n } = useTranslation()
  const { isSecTeam } = useAuth()
  const { scopeParams } = useScope()
  const { data, isLoading, error } = useEscalations(scopeParams)
  const upcoming = useUpcomingEscalations(scopeParams)

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
    return (
      <Label color={LEVEL_LABEL_COLORS[level] ?? 'grey'}>
        {LEVEL_LABELS[level] ?? `Level ${level}`}
      </Label>
    )
  }

  // --- Filter state from URL (prefixed so the two sections don't collide) ---
  const [searchParams, setSearchParams] = useSearchParams()
  const upLevelFilter = searchParams.get('up_level') || ''
  const upSeverityFilter = searchParams.get('up_severity') || ''
  const upPage = Math.max(1, Number(searchParams.get('up_page')) || 1)

  const activeLevelFilter = searchParams.get('level') || ''
  const urlActiveSearch = searchParams.get('search') || ''
  const activePage = Math.max(1, Number(searchParams.get('page')) || 1)

  const [activeSearchInput, setActiveSearchInput] = useState(urlActiveSearch)
  const debouncedActiveSearch = useDebounce(activeSearchInput, 300)
  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) return
    updateParams({ search: debouncedActiveSearch || null }, 'page')
  }, [debouncedActiveSearch])
  useEffect(() => { mountedRef.current = true }, [])

  function updateParams(changes: Record<string, string | null>, pageKeyToReset?: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (pageKeyToReset) next.delete(pageKeyToReset)
      for (const [key, val] of Object.entries(changes)) {
        next.delete(key)
        if (val !== null) next.set(key, val)
      }
      return next
    }, { replace: true })
  }

  function setPageParam(key: string, p: number) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (p === 1) next.delete(key); else next.set(key, String(p))
      return next
    }, { replace: true })
  }
  const setUpPage = (p: number) => setPageParam('up_page', p)
  const setActivePage = (p: number) => setPageParam('page', p)

  const filteredUpcoming = useMemo(
    () => filterUpcoming(upcoming.data ?? [], upLevelFilter, upSeverityFilter),
    [upcoming.data, upLevelFilter, upSeverityFilter],
  )
  const upTotal = filteredUpcoming.length
  const upPaged = filteredUpcoming.slice((upPage - 1) * PER_PAGE, upPage * PER_PAGE)

  const filteredActive = useMemo(
    () => filterActive(data ?? [], activeLevelFilter, debouncedActiveSearch),
    [data, activeLevelFilter, debouncedActiveSearch],
  )
  const activeTotal = filteredActive.length
  const activePaged = filteredActive.slice((activePage - 1) * PER_PAGE, activePage * PER_PAGE)

  return (
    <>
      <PageSection variant="default">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Title headingLevel="h1" size="xl">{t('escalations.title')}</Title>
          <Popover
            headerContent={t('escalations.whatAre')}
            bodyContent={
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 8px' }}>
                  {t('escalations.helpBody1')}
                </p>
                <p style={{ margin: '0 0 8px' }}>
                  <strong>{t('escalations.helpBody2Level1')}</strong> - {t('escalations.helpBody2Level1Desc')}<br />
                  <strong>{t('escalations.helpBody2Level2')}</strong> - {t('escalations.helpBody2Level2Desc')}<br />
                  <strong>{t('escalations.helpBody2Level3')}</strong> - {t('escalations.helpBody2Level3Desc')}
                </p>
                <p style={{ margin: 0 }}>
                  {t('escalations.helpBody3')}
                </p>
              </div>
            }
            position="right"
          >
            <Button
              variant="plain"
              aria-label={t('escalations.helpLabel')}
              style={{ padding: '4px 6px' }}
            >
              <OutlinedQuestionCircleIcon style={{ color: 'var(--pf-t--global--text--color--subtle)' }} />
            </Button>
          </Popover>
        </div>
      </PageSection>

      {/* Upcoming escalations section */}
      <PageSection>
        <Title headingLevel="h2" size="lg" style={{ marginBottom: 12 }}>{t('escalations.upcoming')}</Title>
        {upcoming.isLoading ? (
          <TableSkeleton columns={6} />
        ) : upcoming.error ? (
          <Alert variant="danger" title={`${t('common.error')}: ${getErrorMessage(upcoming.error)}`} />
        ) : !upcoming.data?.length ? (
          <EmptyState>
            <EmptyStateBody>{t('escalations.noUpcoming')}</EmptyStateBody>
          </EmptyState>
        ) : (
          <>
            {upTotal > 0 && (
              <Alert
                variant="info"
                isInline
                title={t('escalations.upcomingCount', { count: upTotal })}
                style={{ marginBottom: 16 }}
              />
            )}
            <Toolbar style={{ padding: 0, marginBottom: 8 }}>
              <ToolbarContent>
                <ToolbarItem>
                  <FormSelect
                    value={upLevelFilter}
                    onChange={(_e, v) => updateParams({ up_level: v || null }, 'up_page')}
                    aria-label={t('escalations.filterLevel')}
                    style={FORM_SELECT_STYLE}
                  >
                    <FormSelectOption value="" label={t('escalations.allLevels')} />
                    <FormSelectOption value="1" label={t('escalations.level1')} />
                    <FormSelectOption value="2" label={t('escalations.level2')} />
                    <FormSelectOption value="3" label={t('escalations.levelCritical')} />
                  </FormSelect>
                </ToolbarItem>
                <ToolbarItem>
                  <FormSelect
                    value={upSeverityFilter}
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
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>
            {upPaged.length === 0 ? (
              <EmptyState>
                <EmptyStateBody>{t('common.noFilterResults')}</EmptyStateBody>
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
                    {upPaged.map(u => (
                      <Tr
                        key={`${u.cve_id}-${u.next_level}`}
                        isClickable
                        style={{
                          background: u.days_until_escalation <= 1
                            ? 'rgba(201, 25, 11, 0.1)'
                            : undefined,
                        }}
                      >
                        <Td>
                          <Link to={`/vulnerabilities/${u.cve_id}`} style={{ fontFamily: 'monospace', color: BRAND_BLUE, fontSize: 12 }}>
                            {u.cve_id}
                          </Link>
                        </Td>
                        <Td>{SEVERITY_LABELS[u.severity] ?? `${u.severity}`}</Td>
                        <Td>{formatEpssPercent(u.epss_probability)}</Td>
                        <Td>{u.current_age_days}</Td>
                        <Td><LevelBadge level={u.next_level} /></Td>
                        <Td style={{ fontWeight: u.days_until_escalation <= 1 ? 700 : 400 }}>
                          {u.days_until_escalation} {u.days_until_escalation === 1 ? t('common.day') : t('common.day_plural')}
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
                      onSetPage={(_, p) => setUpPage(p)}
                      variant="bottom"
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </PageSection>

      {/* Active escalations section */}
      <PageSection variant="default" isFilled>
        <Title headingLevel="h2" size="lg" style={{ marginBottom: 12 }}>{t('escalations.active')}</Title>
        {isLoading ? (
          <TableSkeleton columns={isSecTeam ? 5 : 4} />
        ) : error ? (
          <Alert variant="danger" title={`${t('common.error')}: ${getErrorMessage(error)}`} />
        ) : !data?.length ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--pf-t--global--text--color--subtle)' }}>
            <CheckCircleIcon style={{ fontSize: 32, color: '#1e8f19', display: 'block', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, margin: 0 }}>{t('escalations.noActive')}</p>
          </div>
        ) : (
          <>
            <Alert
              variant="warning"
              isInline
              title={t('escalations.activeCount', { count: activeTotal })}
              style={{ marginBottom: 16 }}
            />
            <Toolbar style={{ padding: 0, marginBottom: 8 }}>
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
                <ToolbarItem>
                  <FormSelect
                    value={activeLevelFilter}
                    onChange={(_e, v) => updateParams({ level: v || null }, 'page')}
                    aria-label={t('escalations.filterLevelLabel')}
                    style={FORM_SELECT_STYLE}
                  >
                    <FormSelectOption value="" label={t('escalations.allLevelsLabel')} />
                    <FormSelectOption value="1" label={t('escalations.level1')} />
                    <FormSelectOption value="2" label={t('escalations.level2')} />
                    <FormSelectOption value="3" label={t('escalations.levelCritical')} />
                  </FormSelect>
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>
            {activePaged.length === 0 ? (
              <EmptyState>
                <EmptyStateBody>{t('common.noFilterResults')}</EmptyStateBody>
              </EmptyState>
            ) : (
              <>
                <Table variant="compact" isStickyHeader>
                  <Thead>
                    <Tr>
                      <Th>{t('cves.cveId')}</Th>
                      <Th>{t('cves.namespace')}</Th>
                      <Th>{t('escalations.level')}</Th>
                      <Th>{t('escalations.triggeredAt')}</Th>
                      {isSecTeam && <Th>{t('escalations.notified')}</Th>}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {activePaged.map(e => (
                      <Tr key={e.id}>
                        <Td>
                          <Link to={`/vulnerabilities/${e.cve_id}`} style={{ fontFamily: 'monospace', color: BRAND_BLUE, fontSize: 12 }}>
                            {e.cve_id}
                          </Link>
                        </Td>
                        <Td>{e.cluster_name}/{e.namespace}</Td>
                        <Td><LevelBadge level={e.level} /></Td>
                        <Td style={{ fontSize: 12, color: 'var(--pf-t--global--text--color--subtle)' }}>
                          {formatDate(e.triggered_at, i18n.language)}
                        </Td>
                        {isSecTeam && (
                          <Td style={{ fontSize: 12 }}>
                            {e.notified
                              ? <span style={{ color: '#1e8f19' }}>{t('escalations.yesNotified')}</span>
                              : <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>{t('common.pending')}</span>}
                          </Td>
                        )}
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                {activeTotal > PER_PAGE && (
                  <div style={{ marginTop: 12 }}>
                    <Pagination
                      itemCount={activeTotal}
                      perPage={PER_PAGE}
                      page={activePage}
                      onSetPage={(_, p) => setActivePage(p)}
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
