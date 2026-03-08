import {
  Alert,
  Button,
  Label,
  PageSection,
  Pagination,
  Popover,
  Spinner,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core'
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons'
import { getErrorMessage } from '../utils/errors'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useRemediations, useRemediationStats, useUpdateRemediation, useDeleteRemediation } from '../api/remediations'
import { useAuth } from '../hooks/useAuth'
import { useScope } from '../hooks/useScope'
import type { RemediationItem } from '../types'
import { RemediationStatus } from '../types'

const STATUS_LABELS: Record<string, string> = {
  open: 'Offen',
  in_progress: 'In Bearbeitung',
  resolved: 'Behoben',
  verified: 'Verifiziert',
  wont_fix: 'Wird nicht behoben',
}

const STATUS_COLORS: Record<string, 'blue' | 'orange' | 'green' | 'teal' | 'grey'> = {
  open: 'blue',
  in_progress: 'orange',
  resolved: 'green',
  verified: 'teal',
  wont_fix: 'grey',
}

const TH_STYLE: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left' as const,
  background: 'var(--pf-t--global--background--color--secondary--default)',
  color: 'var(--pf-t--global--text--color--regular)',
}

const TD_STYLE: React.CSSProperties = { padding: '8px 12px' }

const ROW_BORDER = '1px solid var(--pf-t--global--border--color--default)'

const SELECT_STYLE: React.CSSProperties = {
  height: 36,
  padding: '0 8px',
  border: '1px solid var(--pf-t--global--border--color--default)',
  borderRadius: 4,
  background: 'var(--pf-t--global--background--color--primary--default)',
  color: 'var(--pf-t--global--text--color--regular)',
  fontSize: 13,
}

const PER_PAGE = 20

function StatusBadge({ status, isOverdue }: { status: string; isOverdue: boolean }) {
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <Label color={STATUS_COLORS[status] ?? 'grey'}>
        {STATUS_LABELS[status] ?? status}
      </Label>
      {isOverdue && (
        <Label color="red">Überfällig</Label>
      )}
    </span>
  )
}

export function Remediations() {
  const { isSecTeam } = useAuth()
  const { scopeParams } = useScope()
  const [searchParams, setSearchParams] = useSearchParams()

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

  return (
    <>
      <PageSection variant="default">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Title headingLevel="h1" size="xl">Behebungen</Title>
          <Popover
            headerContent="Was sind Behebungen?"
            bodyContent={
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 8px' }}>
                  Behebungen verfolgen die aktive Beseitigung von CVEs. Ein Team-Mitglied
                  erstellt eine Behebung für eine CVE in seinem Namespace und verfolgt den
                  Fortschritt bis zur Verifizierung durch das Security-Team.
                </p>
                <p style={{ margin: '0 0 8px' }}>
                  <strong>Offen</strong> — Behebung angelegt<br />
                  <strong>In Bearbeitung</strong> — Aktiv daran gearbeitet<br />
                  <strong>Behoben</strong> — CVE wurde beseitigt, wartet auf Verifizierung<br />
                  <strong>Verifiziert</strong> — Vom Security-Team bestätigt
                </p>
                <p style={{ margin: 0 }}>
                  Behebungen können automatisch als behoben markiert werden, wenn die CVE
                  nicht mehr in den Deployments des Namespaces gefunden wird.
                </p>
              </div>
            }
            position="right"
          >
            <Button
              variant="plain"
              aria-label="Hilfe zu Behebungen"
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
              ['open', 'Offen', 'blue'],
              ['in_progress', 'In Bearbeitung', 'orange'],
              ['resolved', 'Behoben', 'green'],
              ['verified', 'Verifiziert', 'teal'],
              ['overdue', 'Überfällig', 'red'],
            ] as const).map(([key, label, color]) => (
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
      <PageSection>
        <Toolbar style={{ padding: 0, marginBottom: 8 }}>
          <ToolbarContent>
            <ToolbarItem>
              <input
                type="text"
                placeholder="CVE suchen..."
                value={searchCve}
                onChange={e => { setSearchCve(e.target.value); setPage(1) }}
                style={{ ...SELECT_STYLE, width: 200, paddingLeft: 8 }}
                aria-label="CVE-ID suchen"
              />
            </ToolbarItem>
            <ToolbarItem>
              <select
                value={statusFilter}
                onChange={e => { setStatus(e.target.value); setOverdueFilter(false) }}
                style={SELECT_STYLE}
                aria-label="Nach Status filtern"
              >
                <option value="">Alle Status</option>
                <option value="open">Offen</option>
                <option value="in_progress">In Bearbeitung</option>
                <option value="resolved">Behoben</option>
                <option value="verified">Verifiziert</option>
                <option value="wont_fix">Wird nicht behoben</option>
              </select>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        {isLoading ? (
          <Spinner aria-label="Laden" />
        ) : error ? (
          <Alert variant="danger" title={`Fehler: ${getErrorMessage(error)}`} />
        ) : !filtered.length ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--pf-t--global--text--color--subtle)' }}>
            <p style={{ fontSize: 14, margin: 0 }}>
              {statusFilter || overdueFilter ? 'Keine Behebungen für die gewählten Filter.' : 'Keine Behebungen vorhanden.'}
            </p>
            <p style={{ fontSize: 12, margin: '8px 0 0', color: 'var(--pf-t--global--text--color--subtle)' }}>
              Behebungen können über die CVE-Detailseite erstellt werden.
            </p>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={TH_STYLE}>CVE</th>
                  <th style={TH_STYLE}>Namespace</th>
                  <th style={TH_STYLE}>Status</th>
                  <th style={TH_STYLE}>Zugewiesen</th>
                  <th style={TH_STYLE}>Fällig</th>
                  <th style={TH_STYLE}>Erstellt</th>
                  <th style={TH_STYLE}>Ersteller</th>
                  <th style={{ ...TH_STYLE, width: 120 }}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(r => (
                  <RemediationRow key={r.id} item={r} isSecTeam={isSecTeam} />
                ))}
              </tbody>
            </table>
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

function RemediationRow({ item, isSecTeam }: { item: RemediationItem; isSecTeam: boolean }) {
  const updateMutation = useUpdateRemediation(item.id)

  const canVerify = isSecTeam && item.status === RemediationStatus.resolved
  const canProgress = item.status === RemediationStatus.open
  const canResolve = item.status === RemediationStatus.in_progress
  const canReopen = item.status === RemediationStatus.wont_fix

  return (
    <tr
      style={{
        borderBottom: ROW_BORDER,
        background: item.is_overdue ? 'rgba(201, 25, 11, 0.06)' : 'transparent',
      }}
    >
      <td style={TD_STYLE}>
        <Link
          to={`/schwachstellen/${item.cve_id}`}
          style={{ fontFamily: 'monospace', color: 'var(--pf-t--global--color--brand--default)', fontSize: 12 }}
        >
          {item.cve_id}
        </Link>
      </td>
      <td style={TD_STYLE}>{item.cluster_name}/{item.namespace}</td>
      <td style={TD_STYLE}>
        <StatusBadge status={item.status} isOverdue={item.is_overdue} />
      </td>
      <td style={TD_STYLE}>
        {item.assigned_to_name ?? <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>—</span>}
      </td>
      <td style={TD_STYLE}>
        {item.target_date ? (
          <span style={{
            color: item.is_overdue ? '#c9190b' : 'var(--pf-t--global--text--color--regular)',
            fontWeight: item.is_overdue ? 600 : 400,
            fontSize: 12,
          }}>
            {new Date(item.target_date).toLocaleDateString('de-DE')}
          </span>
        ) : (
          <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>—</span>
        )}
      </td>
      <td style={{ ...TD_STYLE, fontSize: 12, color: 'var(--pf-t--global--text--color--subtle)' }}>
        {new Date(item.created_at).toLocaleDateString('de-DE')}
      </td>
      <td style={TD_STYLE}>
        <span style={{ fontSize: 12 }}>{item.created_by_name}</span>
      </td>
      <td style={{ ...TD_STYLE, whiteSpace: 'nowrap' }}>
        {canProgress && (
          <Button variant="link" size="sm" isLoading={updateMutation.isPending} onClick={() => updateMutation.mutate({ status: 'in_progress' })}>
            Starten
          </Button>
        )}
        {canResolve && (
          <Button variant="link" size="sm" isLoading={updateMutation.isPending} onClick={() => updateMutation.mutate({ status: 'resolved' })}>
            Behoben
          </Button>
        )}
        {canVerify && (
          <Button variant="link" size="sm" isLoading={updateMutation.isPending} onClick={() => updateMutation.mutate({ status: 'verified' })}>
            Verifizieren
          </Button>
        )}
        {canReopen && (
          <Button variant="link" size="sm" isLoading={updateMutation.isPending} onClick={() => updateMutation.mutate({ status: 'open' })}>
            Wiedereröffnen
          </Button>
        )}
      </td>
    </tr>
  )
}
