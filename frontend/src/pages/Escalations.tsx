import {
  Alert,
  Button,
  PageSection,
  Pagination,
  Popover,
  Spinner,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core'
import { CheckCircleIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons'
import { getErrorMessage } from '../utils/errors'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useEscalations, useUpcomingEscalations } from '../api/escalations'
import { useAuth } from '../hooks/useAuth'
import { useScope } from '../hooks/useScope'
import type { Escalation, UpcomingEscalation } from '../types'

const LEVEL_COLORS: Record<number, string> = {
  1: '#ec7a08',
  2: '#c9190b',
  3: '#7d1007',
}

const LEVEL_LABELS: Record<number, string> = {
  1: 'Level 1',
  2: 'Level 2',
  3: 'Kritisch',
}

const SEVERITY_LABELS: Record<number, string> = {
  0: 'Unbekannt',
  1: 'Niedrig',
  2: 'Mittel',
  3: 'Wichtig',
  4: 'Kritisch',
}

const TH_STYLE: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left' as const,
  background: 'var(--pf-t--global--background--color--secondary--default)',
  color: 'var(--pf-t--global--text--color--regular)',
}

const TD_STYLE: React.CSSProperties = { padding: '8px 12px' }

const ROW_BORDER = '1px solid var(--pf-t--global--border--color--default)'

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
  const { isSecTeam } = useAuth()
  const { scopeParams } = useScope()
  const { data, isLoading, error } = useEscalations(scopeParams)
  const upcoming = useUpcomingEscalations(scopeParams)

  // Upcoming filters + pagination
  const [upLevelFilter, setUpLevelFilter] = useState('')
  const [upSeverityFilter, setUpSeverityFilter] = useState('')
  const [upPage, setUpPage] = useState(1)

  // Active filters + pagination
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
          <Title headingLevel="h1" size="xl">Eskalationen</Title>
          <Popover
            headerContent="Was sind Eskalationen?"
            bodyContent={
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 8px' }}>
                  Eskalationen werden automatisch ausgelöst, wenn CVEs über einen bestimmten Zeitraum
                  unbehandelt bleiben. Die Eskalationsstufen richten sich nach Schweregrad, EPSS-Wert
                  und dem Alter der Schwachstelle.
                </p>
                <p style={{ margin: '0 0 8px' }}>
                  <strong>Level 1</strong> — Team-Benachrichtigung<br />
                  <strong>Level 2</strong> — Team &amp; Security-Team<br />
                  <strong>Level 3 (Kritisch)</strong> — Management-Eskalation
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Bevorstehende Eskalationen</strong> zeigen CVEs, die in den nächsten Tagen
                  eine Stufe erreichen. Behandeln Sie diese rechtzeitig, um eine Eskalation zu vermeiden.
                  CVEs mit aktiven Risikoakzeptanzen werden nicht eskaliert.
                </p>
              </div>
            }
            position="right"
          >
            <Button
              variant="plain"
              aria-label="Hilfe zu Eskalationen"
              style={{ padding: '4px 6px' }}
            >
              <OutlinedQuestionCircleIcon style={{ color: 'var(--pf-t--global--text--color--subtle)' }} />
            </Button>
          </Popover>
        </div>
      </PageSection>

      {/* Upcoming escalations section */}
      <PageSection>
        <Title headingLevel="h2" size="lg" style={{ marginBottom: 12 }}>Bevorstehende Eskalationen</Title>
        {upcoming.isLoading ? <Spinner aria-label="Laden" size="md" /> : upcoming.error ? (
          <Alert variant="danger" title={`Fehler: ${getErrorMessage(upcoming.error)}`} />
        ) : !upcoming.data?.length ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--pf-t--global--text--color--subtle)' }}>
            <p style={{ fontSize: 13, margin: 0 }}>Keine bevorstehenden Eskalationen.</p>
          </div>
        ) : (
          <>
            {upTotal > 0 && (
              <Alert
                variant="info"
                isInline
                title={`${upTotal} CVE${upTotal !== 1 ? 's' : ''} stehen kurz vor einer Eskalation`}
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
                    aria-label="Nach Stufe filtern"
                  >
                    <option value="">Alle Stufen</option>
                    <option value="1">Level 1</option>
                    <option value="2">Level 2</option>
                    <option value="3">Kritisch</option>
                  </select>
                </ToolbarItem>
                <ToolbarItem>
                  <select
                    value={upSeverityFilter}
                    onChange={e => { setUpSeverityFilter(e.target.value); setUpPage(1) }}
                    style={SELECT_STYLE}
                    aria-label="Nach Schweregrad filtern"
                  >
                    <option value="">Alle Schweregrade</option>
                    <option value="4">Kritisch</option>
                    <option value="3">Wichtig</option>
                    <option value="2">Mittel</option>
                    <option value="1">Niedrig</option>
                  </select>
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>
            {upPaged.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--pf-t--global--text--color--subtle)', fontSize: 13 }}>
                Keine Treffer für die gewählten Filter.
              </div>
            ) : (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={TH_STYLE}>CVE</th>
                      <th style={TH_STYLE}>Schweregrad</th>
                      <th style={TH_STYLE}>EPSS</th>
                      <th style={TH_STYLE}>Alter (Tage)</th>
                      <th style={TH_STYLE}>Nächste Stufe</th>
                      <th style={TH_STYLE}>Tage bis Eskalation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upPaged.map(u => (
                      <tr
                        key={`${u.cve_id}-${u.next_level}`}
                        style={{
                          borderBottom: ROW_BORDER,
                          background: u.days_until_escalation <= 1
                            ? 'rgba(201, 25, 11, 0.1)'
                            : 'transparent',
                        }}
                      >
                        <td style={TD_STYLE}>
                          <Link to={`/schwachstellen/${u.cve_id}`} style={{ fontFamily: 'monospace', color: 'var(--pf-t--global--color--brand--default)', fontSize: 12 }}>
                            {u.cve_id}
                          </Link>
                        </td>
                        <td style={TD_STYLE}>{SEVERITY_LABELS[u.severity] ?? `${u.severity}`}</td>
                        <td style={TD_STYLE}>{(u.epss_probability * 100).toFixed(1)}%</td>
                        <td style={TD_STYLE}>{u.current_age_days}</td>
                        <td style={TD_STYLE}><LevelBadge level={u.next_level} /></td>
                        <td style={{ ...TD_STYLE, fontWeight: u.days_until_escalation <= 1 ? 700 : 400 }}>
                          {u.days_until_escalation} {u.days_until_escalation === 1 ? 'Tag' : 'Tage'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
        <Title headingLevel="h2" size="lg" style={{ marginBottom: 12 }}>Aktive Eskalationen</Title>
        {isLoading ? <Spinner aria-label="Laden" /> : error ? (
          <Alert variant="danger" title={`Fehler: ${getErrorMessage(error)}`} />
        ) : !data?.length ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--pf-t--global--text--color--subtle)' }}>
            <CheckCircleIcon style={{ fontSize: 32, color: '#1e8f19', display: 'block', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, margin: 0 }}>Keine aktiven Eskalationen. Gut gemacht!</p>
          </div>
        ) : (
          <>
            <Alert
              variant="warning"
              isInline
              title={`${activeTotal} aktive Eskalation${activeTotal !== 1 ? 'en' : ''}`}
              style={{ marginBottom: 16 }}
            />
            <Toolbar style={{ padding: 0, marginBottom: 8 }}>
              <ToolbarContent>
                <ToolbarItem>
                  <input
                    type="text"
                    placeholder="CVE suchen..."
                    value={activeSearch}
                    onChange={e => { setActiveSearch(e.target.value); setActivePage(1) }}
                    style={{ ...SELECT_STYLE, width: 200, paddingLeft: 8 }}
                    aria-label="CVE-ID suchen"
                  />
                </ToolbarItem>
                <ToolbarItem>
                  <select
                    value={activeLevelFilter}
                    onChange={e => { setActiveLevelFilter(e.target.value); setActivePage(1) }}
                    style={SELECT_STYLE}
                    aria-label="Nach Level filtern"
                  >
                    <option value="">Alle Level</option>
                    <option value="1">Level 1</option>
                    <option value="2">Level 2</option>
                    <option value="3">Kritisch</option>
                  </select>
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>
            {activePaged.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--pf-t--global--text--color--subtle)', fontSize: 13 }}>
                Keine Treffer für die gewählten Filter.
              </div>
            ) : (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={TH_STYLE}>CVE</th>
                      <th style={TH_STYLE}>Namespace</th>
                      <th style={TH_STYLE}>Level</th>
                      <th style={TH_STYLE}>Ausgelöst am</th>
                      {isSecTeam && <th style={TH_STYLE}>Benachrichtigt</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {activePaged.map(e => (
                      <tr key={e.id} style={{ borderBottom: ROW_BORDER }}>
                        <td style={TD_STYLE}>
                          <Link to={`/schwachstellen/${e.cve_id}`} style={{ fontFamily: 'monospace', color: 'var(--pf-t--global--color--brand--default)', fontSize: 12 }}>
                            {e.cve_id}
                          </Link>
                        </td>
                        <td style={TD_STYLE}>{e.cluster_name}/{e.namespace}</td>
                        <td style={TD_STYLE}><LevelBadge level={e.level} /></td>
                        <td style={{ ...TD_STYLE, fontSize: 12, color: 'var(--pf-t--global--text--color--subtle)' }}>
                          {new Date(e.triggered_at).toLocaleDateString('de-DE')}
                        </td>
                        {isSecTeam && (
                          <td style={{ ...TD_STYLE, fontSize: 12 }}>
                            {e.notified
                              ? <span style={{ color: '#1e8f19' }}>✓ Ja</span>
                              : <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>Ausstehend</span>}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
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
