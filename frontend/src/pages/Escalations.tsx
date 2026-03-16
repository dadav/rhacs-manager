import {
  Alert,
  Button,
  EmptyState,
  EmptyStateBody,
  PageSection,
  Pagination,
  Popover,
  Skeleton,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core'
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table'
import { CheckCircleIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons'
import { getErrorMessage } from '../utils/errors'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useEscalations, useUpcomingEscalations } from '../api/escalations'
import { useAuth } from '../hooks/useAuth'
import { useScope } from '../hooks/useScope'
import { LEVEL_COLORS, BRAND_BLUE } from '../tokens'
import type { Escalation, UpcomingEscalation } from '../types'

const PER_PAGE = 20

const SELECT_STYLE: React.CSSProperties = {
  height: 36,
  padding: '0 8px',
  border: '1px solid var(--pf-t--global--border--color--default)',
  borderRadius: 4,
  background: 'var(--pf-t--global--background--color--primary--default)',
  color: 'var(--pf-t--global--text--color--regular)',
  fontSize: 13,
}

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

  function LevelBadge({ level }: { level: number }) {
    return (
      <span style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 3,
        background: LEVEL_COLORS[level] ?? '#8a8d90',
        color: '#fff',
        fontSize: 11,
        fontWeight: 600,
      }}>
        {LEVEL_LABELS[level] ?? `Level ${level}`}
      </span>
    )
  }

  const localeDateFormat = i18n.language === 'de' ? 'de-DE' : 'en-US'

  const [upLevelFilter, setUpLevelFilter] = useState('')
  const [upSeverityFilter, setUpSeverityFilter] = useState('')
  const [upPage, setUpPage] = useState(1)

  const [activeLevelFilter, setActiveLevelFilter] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [activePage, setActivePage] = useState(1)

  const filteredUpcoming = useMemo(
    () => filterUpcoming(upcoming.data ?? [], upLevelFilter, upSeverityFilter),
    [upcoming.data, upLevelFilter, upSeverityFilter],
  )
  const upTotal = filteredUpcoming.length
  const upPaged = filteredUpcoming.slice((upPage - 1) * PER_PAGE, upPage * PER_PAGE)

  const filteredActive = useMemo(
    () => filterActive(data ?? [], activeLevelFilter, activeSearch),
    [data, activeLevelFilter, activeSearch],
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
                  <strong>{t('escalations.helpBody2Level1')}</strong> — {t('escalations.helpBody2Level1Desc')}<br />
                  <strong>{t('escalations.helpBody2Level2')}</strong> — {t('escalations.helpBody2Level2Desc')}<br />
                  <strong>{t('escalations.helpBody2Level3')}</strong> — {t('escalations.helpBody2Level3Desc')}
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
              {[1, 2, 3].map(i => (
                <Tr key={i}>
                  <Td><Skeleton width="120px" /></Td>
                  <Td><Skeleton width="80px" /></Td>
                  <Td><Skeleton width="50px" /></Td>
                  <Td><Skeleton width="40px" /></Td>
                  <Td><Skeleton width="80px" /></Td>
                  <Td><Skeleton width="60px" /></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
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
                  <select
                    value={upLevelFilter}
                    onChange={e => { setUpLevelFilter(e.target.value); setUpPage(1) }}
                    style={SELECT_STYLE}
                    aria-label={t('escalations.filterLevel')}
                  >
                    <option value="">{t('escalations.allLevels')}</option>
                    <option value="1">{t('escalations.level1')}</option>
                    <option value="2">{t('escalations.level2')}</option>
                    <option value="3">{t('escalations.levelCritical')}</option>
                  </select>
                </ToolbarItem>
                <ToolbarItem>
                  <select
                    value={upSeverityFilter}
                    onChange={e => { setUpSeverityFilter(e.target.value); setUpPage(1) }}
                    style={SELECT_STYLE}
                    aria-label={t('escalations.filterSeverity')}
                  >
                    <option value="">{t('escalations.allSeverities')}</option>
                    <option value="4">{t('severity.4')}</option>
                    <option value="3">{t('severity.3')}</option>
                    <option value="2">{t('severity.2')}</option>
                    <option value="1">{t('severity.1')}</option>
                  </select>
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
                        <Td>{(u.epss_probability * 100).toFixed(1)}%</Td>
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
      <PageSection>
        <Title headingLevel="h2" size="lg" style={{ marginBottom: 12 }}>{t('escalations.active')}</Title>
        {isLoading ? (
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
              {[1, 2, 3].map(i => (
                <Tr key={i}>
                  <Td><Skeleton width="120px" /></Td>
                  <Td><Skeleton width="150px" /></Td>
                  <Td><Skeleton width="80px" /></Td>
                  <Td><Skeleton width="80px" /></Td>
                  {isSecTeam && <Td><Skeleton width="60px" /></Td>}
                </Tr>
              ))}
            </Tbody>
          </Table>
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
                  <input
                    type="text"
                    placeholder={t('escalations.searchPlaceholder')}
                    value={activeSearch}
                    onChange={e => { setActiveSearch(e.target.value); setActivePage(1) }}
                    style={{ ...SELECT_STYLE, width: 200, paddingLeft: 8 }}
                    aria-label={t('escalations.searchLabel')}
                  />
                </ToolbarItem>
                <ToolbarItem>
                  <select
                    value={activeLevelFilter}
                    onChange={e => { setActiveLevelFilter(e.target.value); setActivePage(1) }}
                    style={SELECT_STYLE}
                    aria-label={t('escalations.filterLevelLabel')}
                  >
                    <option value="">{t('escalations.allLevelsLabel')}</option>
                    <option value="1">{t('escalations.level1')}</option>
                    <option value="2">{t('escalations.level2')}</option>
                    <option value="3">{t('escalations.levelCritical')}</option>
                  </select>
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
                          {new Date(e.triggered_at).toLocaleDateString(localeDateFormat)}
                        </Td>
                        {isSecTeam && (
                          <Td style={{ fontSize: 12 }}>
                            {e.notified
                              ? <span style={{ color: '#1e8f19' }}>✓ {t('escalations.yesNotified')}</span>
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
