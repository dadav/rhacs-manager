import {
  Alert,
  PageSection,
  Pagination,
  Spinner,
  Title,
} from '@patternfly/react-core'
import { useState } from 'react'
import { useAuditLog } from '../api/audit'

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
          <Alert variant="danger" title={`Fehler: ${(error as Error).message}`} />
        ) : !data?.items.length ? (
          <Alert variant="info" isInline title="Keine Einträge gefunden." />
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
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
                  <tr key={entry.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '8px 12px', fontSize: 11, color: '#6a6e73', whiteSpace: 'nowrap' }}>
                      {new Date(entry.created_at).toLocaleString('de-DE')}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12 }}>{entry.username ?? '–'}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: 11,
                        background: '#f0f0f0',
                        padding: '2px 6px',
                        borderRadius: 3,
                      }}>
                        {entry.action}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12 }}>{entry.entity_type}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, color: '#6a6e73' }}>
                      {entry.entity_id ? entry.entity_id.slice(0, 8) + '…' : '–'}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 11, color: '#6a6e73', maxWidth: 300 }}>
                      {Object.keys(entry.details).length > 0
                        ? JSON.stringify(entry.details).slice(0, 120)
                        : '–'}
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
