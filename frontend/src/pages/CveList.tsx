import {
  Alert,
  Button,
  PageSection,
  Pagination,
  Spinner,
  Switch,
  TextInput,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useCves } from '../api/cves'
import { EpssBadge } from '../components/common/EpssBadge'
import { SeverityBadge } from '../components/common/SeverityBadge'
import { Severity } from '../types'

const SEVERITY_OPTIONS = [
  { label: 'Alle', value: undefined },
  { label: 'Kritisch', value: Severity.CRITICAL },
  { label: 'Wichtig', value: Severity.IMPORTANT },
  { label: 'Mittel', value: Severity.MODERATE },
  { label: 'Niedrig', value: Severity.LOW },
]

export function CveList() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [severity, setSeverity] = useState<Severity | undefined>()
  const [fixable, setFixable] = useState<boolean | undefined>()
  const [prioritizedOnly, setPrioritizedOnly] = useState(false)
  const [sortBy, setSortBy] = useState('severity')
  const [sortDesc, setSortDesc] = useState(true)

  const params = {
    page,
    page_size: 50,
    search: search || undefined,
    severity,
    fixable,
    prioritized_only: prioritizedOnly || undefined,
    sort_by: sortBy,
    sort_desc: sortDesc,
  }

  const { data, isLoading, error } = useCves(params)

  function handleSort(col: string) {
    if (sortBy === col) setSortDesc(d => !d)
    else { setSortBy(col); setSortDesc(true) }
  }

  const thStyle = (col: string): React.CSSProperties => ({
    padding: '10px 12px',
    textAlign: 'left',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    borderBottom: '2px solid #d2d2d2',
    color: sortBy === col ? '#0066cc' : '#151515',
  })

  return (
    <>
      <PageSection variant="default">
        <Title headingLevel="h1" size="xl">{t('cves.title')}</Title>
      </PageSection>

      <PageSection variant="default" padding={{ default: 'noPadding' }}>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <TextInput
                value={search}
                onChange={(_, v) => { setSearch(v); setPage(1) }}
                placeholder={t('cves.searchPlaceholder')}
                style={{ width: 220 }}
              />
            </ToolbarItem>
            <ToolbarItem>
              <select
                value={severity ?? ''}
                onChange={e => { setSeverity(e.target.value !== '' ? Number(e.target.value) as Severity : undefined); setPage(1) }}
                style={{ height: 36, padding: '0 8px', border: '1px solid #d2d2d2', borderRadius: 4 }}
              >
                {SEVERITY_OPTIONS.map(o => (
                  <option key={String(o.value)} value={o.value ?? ''}>{o.label}</option>
                ))}
              </select>
            </ToolbarItem>
            <ToolbarItem>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={fixable === true} onChange={e => setFixable(e.target.checked ? true : undefined)} />
                {t('cves.filterFixable')}
              </label>
            </ToolbarItem>
            <ToolbarItem>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={prioritizedOnly} onChange={e => setPrioritizedOnly(e.target.checked)} />
                {t('cves.filterPrioritized')}
              </label>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </PageSection>

      <PageSection>
        {isLoading ? <Spinner aria-label="Laden" /> : error ? (
          <Alert variant="danger" title={`Fehler: ${(error as Error).message}`} />
        ) : !data?.items.length ? (
          <Alert variant="info" isInline title={t('cves.noResults')} />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={thStyle('cve_id')} onClick={() => handleSort('cve_id')}>{t('cves.cveId')}</th>
                    <th style={thStyle('severity')} onClick={() => handleSort('severity')}>{t('cves.severity')}</th>
                    <th style={thStyle('cvss')} onClick={() => handleSort('cvss')}>{t('cves.cvss')}</th>
                    <th style={{ ...thStyle('epss_probability'), background: '#fff9e6' }} onClick={() => handleSort('epss_probability')}>{t('cves.epss')}</th>
                    <th style={thStyle('affected_images')} onClick={() => handleSort('affected_images')}>{t('cves.affectedImages')}</th>
                    <th style={thStyle('affected_deployments')} onClick={() => handleSort('affected_deployments')}>{t('cves.affectedDeployments')}</th>
                    <th style={thStyle('fixable')}>{t('cves.fixable')}</th>
                    <th style={thStyle('fixed_by')}>{t('cves.fixVersion')}</th>
                    <th style={thStyle('first_seen')} onClick={() => handleSort('first_seen')}>{t('cves.firstSeen')}</th>
                    <th style={thStyle('actions')}></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map(cve => (
                    <tr
                      key={cve.cve_id}
                      style={{
                        borderBottom: '1px solid #f0f0f0',
                        background: cve.has_priority ? '#fff9e6' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '8px 12px' }}>
                        <Link to={`/schwachstellen/${cve.cve_id}`} style={{ fontFamily: 'monospace', color: '#0066cc' }}>
                          {cve.cve_id}
                        </Link>
                        {cve.has_priority && (
                          <span style={{ marginLeft: 6, fontSize: 10, background: '#ec7a08', color: '#fff', padding: '1px 5px', borderRadius: 3 }}>
                            PRIORISIERT
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px' }}><SeverityBadge severity={cve.severity} /></td>
                      <td style={{ padding: '8px 12px', fontWeight: cve.cvss >= 9 ? 700 : 400, color: cve.cvss >= 9 ? '#c9190b' : 'inherit' }}>
                        {cve.cvss.toFixed(1)}
                      </td>
                      <td style={{ padding: '8px 12px', background: '#fff9e6' }}>
                        <EpssBadge value={cve.epss_probability} />
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{cve.affected_images}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{cve.affected_deployments}</td>
                      <td style={{ padding: '8px 12px' }}>
                        {cve.fixable
                          ? <span style={{ color: '#1e8f19' }}>✓</span>
                          : <span style={{ color: '#8a8d90' }}>✗</span>}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11 }}>{cve.fixed_by ?? '–'}</td>
                      <td style={{ padding: '8px 12px', fontSize: 11, color: '#6a6e73' }}>
                        {cve.first_seen ? new Date(cve.first_seen).toLocaleDateString('de-DE') : '–'}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {!cve.has_risk_acceptance && (
                          <Link to={`/risikoakzeptanzen/neu?cve=${cve.cve_id}`}>
                            <Button variant="secondary" size="sm">{t('cves.requestRiskAcceptance')}</Button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
