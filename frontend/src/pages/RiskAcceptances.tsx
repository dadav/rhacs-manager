import {
  Alert,
  Button,
  PageSection,
  Spinner,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core'
import { getErrorMessage } from '../utils/errors'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRiskAcceptances } from '../api/riskAcceptances'

const STATUS_LABELS: Record<string, string> = {
  '': 'Alle',
  requested: 'Beantragt',
  approved: 'Genehmigt',
  rejected: 'Abgelehnt',
  expired: 'Abgelaufen',
}

const STATUS_COLORS: Record<string, string> = {
  requested: '#0066cc',
  approved: '#1e8f19',
  rejected: '#c9190b',
  expired: '#8a8d90',
}

export function RiskAcceptances() {
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading, error } = useRiskAcceptances(statusFilter || undefined)

  return (
    <>
      <PageSection variant="default">
        <Title headingLevel="h1" size="xl">Risikoakzeptanzen</Title>
      </PageSection>

      <PageSection variant="default" padding={{ default: 'noPadding' }}>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <div style={{ display: 'flex', gap: 4 }}>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setStatusFilter(value)}
                    style={{
                      padding: '4px 12px',
                      border: '1px solid #d2d2d2',
                      borderRadius: 3,
                      cursor: 'pointer',
                      background: statusFilter === value ? '#0066cc' : 'var(--pf-v6-global--BackgroundColor--100)',
                      color: statusFilter === value ? '#fff' : 'var(--pf-v6-global--Color--100)',
                      fontSize: 13,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </PageSection>

      <PageSection>
        {isLoading ? <Spinner aria-label="Laden" /> : error ? (
          <Alert variant="danger" title={`Fehler: ${getErrorMessage(error)}`} />
        ) : !data?.length ? (
          <Alert variant="info" isInline title="Keine Risikoakzeptanzen gefunden." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--pf-t--global--background--color--secondary--default)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>CVE</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Team</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Begründung</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Beantragt von</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Beantragt am</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Läuft ab</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Kommentare</th>
                <th style={{ padding: '8px 12px' }}></th>
              </tr>
            </thead>
            <tbody>
              {data.map(ra => (
                <tr key={ra.id} style={{ borderBottom: '1px solid var(--pf-t--global--border--color--default)' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <Link to={`/schwachstellen/${ra.cve_id}`} style={{ fontFamily: 'monospace', color: '#0066cc', fontSize: 12 }}>
                      {ra.cve_id}
                    </Link>
                  </td>
                  <td style={{ padding: '8px 12px' }}>{ra.team_name}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 3,
                      background: STATUS_COLORS[ra.status] ?? '#8a8d90',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 600,
                    }}>
                      {STATUS_LABELS[ra.status] ?? ra.status}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', maxWidth: 300 }}>
                    <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {ra.justification}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12 }}>{ra.created_by_name}</td>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--pf-t--global--text--color--subtle)' }}>
                    {new Date(ra.created_at).toLocaleDateString('de-DE')}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--pf-t--global--text--color--subtle)' }}>
                    {ra.expires_at ? new Date(ra.expires_at).toLocaleDateString('de-DE') : '–'}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    {ra.comment_count > 0 && (
                      <span style={{ background: 'var(--pf-t--global--background--color--secondary--default)', color: 'var(--pf-t--global--color--blue--default)', padding: '2px 6px', borderRadius: 10, fontSize: 11 }}>
                        {ra.comment_count}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <Link to={`/risikoakzeptanzen/${ra.id}`}>
                      <Button variant="secondary" size="sm">Details</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PageSection>
    </>
  )
}
