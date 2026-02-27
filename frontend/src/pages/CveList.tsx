import {
  Alert,
  Button,
  Checkbox,
  PageSection,
  Pagination,
  Spinner,
  Switch,
  TextInput,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core'
import { ShieldAltIcon } from '@patternfly/react-icons'
import { getErrorMessage } from '../utils/errors'
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
    color: sortBy === col ? '#0066cc' : 'var(--pf-v6-global--Color--100)',
  })

  const getRowStyle = (hasPriority: boolean): React.CSSProperties => ({
    borderBottom: '1px solid #f0f0f0',
    background: hasPriority ? 'rgba(236, 122, 8, 0.08)' : 'transparent',
    boxShadow: hasPriority ? 'inset 4px 0 0 #ec7a08' : 'none',
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
              <Checkbox
                id="filter-fixable"
                label={t('cves.filterFixable')}
                isChecked={fixable === true}
                onChange={(_event, checked) => { setFixable(checked ? true : undefined); setPage(1) }}
              />
            </ToolbarItem>
            <ToolbarItem>
              <Checkbox
                id="filter-prioritized"
                label={t('cves.filterPrioritized')}
                isChecked={prioritizedOnly}
                onChange={(_event, checked) => { setPrioritizedOnly(checked); setPage(1) }}
              />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </PageSection>

      <PageSection>
        {isLoading ? <Spinner aria-label="Laden" /> : error ? (
          <Alert variant="danger" title={`Fehler: ${getErrorMessage(error)}`} />
        ) : !data?.items.length ? (
          <Alert variant="info" isInline title={t('cves.noResults')} />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={thStyle('cve_id')} onClick={() => handleSort('cve_id')}>{t('cves.cveId')}</th>
                    <th style={thStyle('severity')} onClick={() => handleSort('severity')}>{t('cves.severity')}</th>
                    <th style={thStyle('cvss')} onClick={() => handleSort('cvss')}>{t('cves.cvss')}</th>
                    <th style={thStyle('epss_probability')} onClick={() => handleSort('epss_probability')}>{t('cves.epss')}</th>
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
                      style={getRowStyle(cve.has_priority)}
                    >
                      <td style={{ padding: '8px 12px' }}>
                        <Link to={`/schwachstellen/${cve.cve_id}`} style={{ fontFamily: 'monospace', color: '#0066cc' }}>
                          {cve.cve_id}
                        </Link>
                        {cve.has_priority && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: 0.3,
                              background: 'rgba(236, 122, 8, 0.18)',
                              color: '#ec7a08',
                              border: '1px solid rgba(236, 122, 8, 0.45)',
                              padding: '1px 5px',
                              borderRadius: 3,
                            }}
                          >
                            PRIO
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px' }}><SeverityBadge severity={cve.severity} /></td>
                      <td style={{ padding: '8px 12px', fontWeight: cve.cvss >= 9 ? 700 : 400, color: cve.cvss >= 9 ? '#c9190b' : 'inherit' }}>
                        {cve.cvss.toFixed(1)}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
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
                      <td style={{ padding: '8px 12px', textAlign: 'center', width: 40 }}>
                        <Tooltip content={t('cves.requestRiskAcceptance')}>
                          <Link to={`/risikoakzeptanzen/neu?cve=${cve.cve_id}`}>
                            <Button variant="plain" aria-label={t('cves.requestRiskAcceptance')} style={{ color: '#6a6e73', padding: '2px 6px' }}>
                              <ShieldAltIcon />
                            </Button>
                          </Link>
                        </Tooltip>
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
