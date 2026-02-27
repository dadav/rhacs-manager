import {
  Alert,
  PageSection,
  Pagination,
  Spinner,
  Title,
  Tooltip,
} from '@patternfly/react-core'
import { getErrorMessage } from '../utils/errors'
import { useState } from 'react'
import { useAuditLog } from '../api/audit'

const ACTION_LABELS: Record<string, string> = {
  risk_acceptance_created: 'Risikoakzeptanz beantragt',
  risk_acceptance_reviewed: 'Risikoakzeptanz geprüft',
  risk_acceptance_expired: 'Risikoakzeptanz abgelaufen',
  risk_acceptance_deleted: 'Risikoakzeptanz gelöscht',
  priority_set: 'Priorität gesetzt',
  priority_updated: 'Priorität aktualisiert',
  priority_deleted: 'Priorität entfernt',
  team_created: 'Team erstellt',
  team_updated: 'Team aktualisiert',
  team_deleted: 'Team gelöscht',
  settings_updated: 'Einstellungen aktualisiert',
  comment_added: 'Kommentar hinzugefügt',
  user_created: 'Benutzer angelegt',
  user_updated: 'Benutzer aktualisiert',
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, ' ')
}

function DetailsCell({ details }: { details: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false)
  const isEmpty = Object.keys(details).length === 0
  if (isEmpty) return <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>–</span>

  const formatted = JSON.stringify(details, null, 2)
  const summary = Object.entries(details)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join(', ')
    .slice(0, 60)

  return (
    <span style={{ fontSize: 11, color: 'var(--pf-t--global--text--color--subtle)' }}>
      {expanded ? (
        <>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: 11 }}>
            {formatted}
          </pre>
          <button
            onClick={() => setExpanded(false)}
            style={{ background: 'none', border: 'none', color: 'var(--pf-t--global--color--blue--default)', cursor: 'pointer', padding: 0, fontSize: 11 }}
          >
            Weniger
          </button>
        </>
      ) : (
        <>
          <span style={{ fontFamily: 'monospace' }}>{summary}{summary.length < Object.entries(details).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ').length ? '…' : ''}</span>
          {' '}
          <button
            onClick={() => setExpanded(true)}
            style={{ background: 'none', border: 'none', color: 'var(--pf-t--global--color--blue--default)', cursor: 'pointer', padding: 0, fontSize: 11 }}
          >
            Mehr
          </button>
        </>
      )}
    </span>
  )
}

export function AuditLog() {
  const [page, setPage] = useState(1)
  const { data, isLoading, error } = useAuditLog(page)

  return (
    <>
      <PageSection variant="default">
        <Title headingLevel="h1" size="xl">Audit-Log</Title>
      </PageSection>

      <PageSection>
        {isLoading ? <Spinner aria-label="Laden" /> : error ? (
          <Alert variant="danger" title={`Fehler: ${getErrorMessage(error)}`} />
        ) : !data?.items.length ? (
          <Alert variant="info" isInline title="Keine Einträge gefunden." />
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--pf-t--global--background--color--secondary--default)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Zeitstempel</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Benutzer</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Aktion</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Entitätstyp</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Entitäts-ID</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(entry => (
                  <tr key={entry.id} style={{ borderBottom: '1px solid var(--pf-t--global--border--color--default)' }}>
                    <td style={{ padding: '8px 12px', fontSize: 11, color: 'var(--pf-t--global--text--color--subtle)', whiteSpace: 'nowrap' }}>
                      {new Date(entry.created_at).toLocaleString('de-DE')}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12 }}>{entry.username ?? '–'}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12 }}>
                      {actionLabel(entry.action)}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12 }}>{entry.entity_type}</td>
                    <td style={{ padding: '8px 12px', fontSize: 11, color: 'var(--pf-t--global--text--color--subtle)' }}>
                      {entry.entity_id ? (
                        <Tooltip content={entry.entity_id}>
                          <span style={{ fontFamily: 'monospace', cursor: 'default' }}>
                            {entry.entity_id.slice(0, 8)}…
                          </span>
                        </Tooltip>
                      ) : '–'}
                    </td>
                    <td style={{ padding: '8px 12px', maxWidth: 300 }}>
                      <DetailsCell details={entry.details} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 16 }}>
              <Pagination
                itemCount={data.total}
                perPage={50}
                page={page}
                onSetPage={(_, p) => setPage(p)}
                variant="bottom"
              />
            </div>
          </>
        )}
      </PageSection>
    </>
  )
}
