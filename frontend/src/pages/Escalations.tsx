import {
  Alert,
  PageSection,
  Spinner,
  Title,
} from '@patternfly/react-core'
import { CheckCircleIcon } from '@patternfly/react-icons'
import { getErrorMessage } from '../utils/errors'
import { Link } from 'react-router-dom'
import { useEscalations } from '../api/escalations'

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

export function Escalations() {
  const { data, isLoading, error } = useEscalations()

  return (
    <>
      <PageSection variant="default">
        <Title headingLevel="h1" size="xl">Eskalationen</Title>
      </PageSection>

      <PageSection>
        {isLoading ? <Spinner aria-label="Laden" /> : error ? (
          <Alert variant="danger" title={`Fehler: ${getErrorMessage(error)}`} />
        ) : !data?.length ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#8a8d90' }}>
            <CheckCircleIcon style={{ fontSize: 32, color: '#1e8f19', display: 'block', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, margin: 0 }}>Keine aktiven Eskalationen. Gut gemacht!</p>
          </div>
        ) : (
          <>
            <Alert
              variant="warning"
              isInline
              title={`${data.length} aktive Eskalation${data.length !== 1 ? 'en' : ''}`}
              style={{ marginBottom: 16 }}
            />
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>CVE</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Team</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Level</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Ausgelöst am</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Benachrichtigt</th>
                </tr>
              </thead>
              <tbody>
                {data.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f0f0f0', background: e.level >= 2 ? '#fff5f4' : 'transparent' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <Link to={`/schwachstellen/${e.cve_id}`} style={{ fontFamily: 'monospace', color: '#0066cc', fontSize: 12 }}>
                        {e.cve_id}
                      </Link>
                    </td>
                    <td style={{ padding: '8px 12px' }}>{e.team_name}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 3,
                        background: LEVEL_COLORS[e.level] ?? '#8a8d90',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 600,
                      }}>
                        {LEVEL_LABELS[e.level] ?? `Level ${e.level}`}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: '#6a6e73' }}>
                      {new Date(e.triggered_at).toLocaleDateString('de-DE')}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12 }}>
                      {e.notified
                        ? <span style={{ color: '#1e8f19' }}>✓ Ja</span>
                        : <span style={{ color: '#8a8d90' }}>Ausstehend</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </PageSection>
    </>
  )
}
