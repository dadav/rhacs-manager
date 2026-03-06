import {
  Alert,
  Checkbox,
  PageSection,
  Pagination,
  Spinner,
  TextInput,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core'
import { FilterIcon, InfoCircleIcon, ShieldAltIcon } from '@patternfly/react-icons'
import { getErrorMessage } from '../utils/errors'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { useCves } from '../api/cves'
import { useThresholds } from '../api/settings'

import { useScope, type ScopeParams } from '../hooks/useScope'
import { useAuth } from '../hooks/useAuth'
import { EpssBadge } from '../components/common/EpssBadge'
import { SeverityBadge } from '../components/common/SeverityBadge'
import { Severity } from '../types'

const SEVERITY_OPTIONS = [
  { label: 'Alle', value: '' },
  { label: 'Kritisch', value: String(Severity.CRITICAL) },
  { label: 'Hoch', value: String(Severity.IMPORTANT) },
  { label: 'Mittel', value: String(Severity.MODERATE) },
  { label: 'Gering', value: String(Severity.LOW) },
]

const RISK_STATUS_OPTIONS = [
  { label: 'Alle', value: '' },
  { label: 'Beliebig (vorhanden)', value: 'any' },
  { label: 'Angefragt', value: 'requested' },
  { label: 'Akzeptiert', value: 'approved' },
]

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

export function CveList() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()

  // --- Read all filter state from URL ---
  const urlPage       = Math.max(1, Number(searchParams.get('page')) || 1)
  const urlSearch     = searchParams.get('search') || ''
  const urlSeverity   = searchParams.get('severity') || ''
  const urlFixable    = searchParams.get('fixable') || ''
  const urlPrioOnly   = searchParams.get('prioritized_only') === '1'
  const urlSortBy     = searchParams.get('sort_by') || 'severity'
  const urlSortDesc   = searchParams.get('sort_desc') !== '0'
  const urlCvssMin    = Number(searchParams.get('cvss_min')) || 0
  const urlEpssMin    = Number(searchParams.get('epss_min')) || 0
  const urlComponent  = searchParams.get('component') || ''
  const urlRiskStatus = searchParams.get('risk_status') || ''
  const urlCluster    = searchParams.get('cluster') || ''
  const urlNamespace  = searchParams.get('namespace') || ''
  const urlAdvanced   = searchParams.get('advanced') === '1'

  // Local state for slider/text inputs that need smooth UI + debounced URL writes
  const [searchInput, setSearchInput]       = useState(urlSearch)
  const [cvssMin, setCvssMin]               = useState(urlCvssMin)
  const [epssMin, setEpssMin]               = useState(urlEpssMin)
  const [componentInput, setComponentInput] = useState(urlComponent)

  const debouncedSearch    = useDebounce(searchInput, 300)
  const debouncedCvssMin   = useDebounce(cvssMin, 200)
  const debouncedEpssMin   = useDebounce(epssMin, 200)
  const debouncedComponent = useDebounce(componentInput, 300)

  // Skip the initial mount effect for debounced values (avoid redundant URL writes)
  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) return
    updateParams({ search: debouncedSearch || null })
  }, [debouncedSearch])
  useEffect(() => {
    if (!mountedRef.current) return
    updateParams({ cvss_min: debouncedCvssMin > 0 ? String(debouncedCvssMin) : null })
  }, [debouncedCvssMin])
  useEffect(() => {
    if (!mountedRef.current) return
    updateParams({ epss_min: debouncedEpssMin > 0 ? String(debouncedEpssMin) : null })
  }, [debouncedEpssMin])
  useEffect(() => {
    if (!mountedRef.current) return
    updateParams({ component: debouncedComponent || null })
  }, [debouncedComponent])
  useEffect(() => { mountedRef.current = true }, [])

  // --- URL write helper ---
  // Pass null to delete a key, a string[] to append multiple values with the same key
  function updateParams(changes: Record<string, string | string[] | null>, resetPage = true) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (resetPage) next.delete('page')
      for (const [key, val] of Object.entries(changes)) {
        next.delete(key)
        if (val === null) continue
        if (Array.isArray(val)) val.forEach(v => next.append(key, v))
        else next.set(key, val)
      }
      return next
    }, { replace: true })
  }

  function setPage(p: number) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (p === 1) next.delete('page'); else next.set('page', String(p))
      return next
    }, { replace: true })
  }

  function handleSort(col: string) {
    if (urlSortBy === col) {
      updateParams({ sort_desc: urlSortDesc ? '0' : '1' }, false)
    } else {
      updateParams({ sort_by: col, sort_desc: '1' }, false)
    }
  }

  function clearAdvanced() {
    setCvssMin(0); setEpssMin(0); setComponentInput('')
    updateParams({
      cvss_min: null, epss_min: null,
      component: null, risk_status: null,
    })
  }

  const hasActiveAdvanced =
    debouncedCvssMin > 0 || debouncedEpssMin > 0 ||
    debouncedComponent || urlRiskStatus

  const activeFilterCount = [
    debouncedCvssMin > 0,
    debouncedEpssMin > 0,
    Boolean(debouncedComponent),
    Boolean(urlRiskStatus),
  ].filter(Boolean).length

  // --- API params ---
  const params = {
    page: urlPage,
    page_size: 50,
    search: debouncedSearch || undefined,
    severity: urlSeverity ? Number(urlSeverity) as Severity : undefined,
    fixable: urlFixable === 'true' ? true : urlFixable === 'false' ? false : undefined,
    prioritized_only: urlPrioOnly || undefined,
    sort_by: urlSortBy,
    sort_desc: urlSortDesc,
    cvss_min: debouncedCvssMin > 0 ? debouncedCvssMin : undefined,
    epss_min: debouncedEpssMin > 0 ? debouncedEpssMin : undefined,
    component: debouncedComponent || undefined,
    risk_status: urlRiskStatus || undefined,
  }

  const { scopeParams } = useScope()
  const scopeOverrides: ScopeParams = {
    cluster: urlCluster || scopeParams.cluster,
    namespace: urlNamespace || scopeParams.namespace,
  }
  const { data, isLoading, error } = useCves(params, scopeOverrides)
  const { isSecTeam } = useAuth()
  const { data: thresholds } = useThresholds()

  const hasActiveThresholds = thresholds && !isSecTeam &&
    (thresholds.min_cvss_score > 0 || thresholds.min_epss_score > 0)

  // --- Styles ---
  const thStyle = (col: string): React.CSSProperties => ({
    padding: '10px 12px',
    textAlign: 'left',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    borderBottom: '2px solid #d2d2d2',
    color: urlSortBy === col ? '#0066cc' : 'var(--pf-v6-global--Color--100)',
  })

  const getRowStyle = (hasPriority: boolean): React.CSSProperties => ({
    borderBottom: '1px solid #f0f0f0',
    background: hasPriority ? 'rgba(236, 122, 8, 0.08)' : 'transparent',
    boxShadow: hasPriority ? 'inset 4px 0 0 #ec7a08' : 'none',
  })

  const advancedBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 36,
    padding: '0 12px',
    border: hasActiveAdvanced ? '1px solid #0066cc' : '1px solid #d2d2d2',
    borderRadius: 4,
    background: hasActiveAdvanced ? 'rgba(0,102,204,0.08)' : 'transparent',
    color: hasActiveAdvanced ? '#0066cc' : 'var(--pf-v6-global--Color--100)',
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: 'inherit',
  }

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, marginBottom: 8,
    color: 'var(--pf-v6-global--Color--200)',
  }

  return (
    <>
      <PageSection variant="default">
        <Title headingLevel="h1" size="xl">{t('cves.title')}</Title>
      </PageSection>

      {hasActiveThresholds && (
        <PageSection variant="default" padding={{ default: 'noPadding' }}>
          <Alert
            variant="info"
            isInline
            isPlain
            customIcon={<InfoCircleIcon />}
            title={t('cves.thresholdHint', {
              cvss: thresholds.min_cvss_score.toFixed(1),
              epss: (thresholds.min_epss_score * 100).toFixed(0),
            })}
            style={{ padding: '8px 20px' }}
          />
        </PageSection>
      )}

      <PageSection variant="default" padding={{ default: 'noPadding' }}>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <TextInput
                value={searchInput}
                onChange={(_, v) => setSearchInput(v)}
                placeholder={t('cves.searchPlaceholder')}
                style={{ width: 220 }}
              />
            </ToolbarItem>
            <ToolbarItem>
              <select
                value={urlSeverity}
                onChange={e => updateParams({ severity: e.target.value || null })}
                style={{ height: 36, padding: '0 8px', border: '1px solid #d2d2d2', borderRadius: 4 }}
              >
                {SEVERITY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </ToolbarItem>
            <ToolbarItem>
              <Checkbox
                id="filter-fixable"
                label={t('cves.filterFixable')}
                isChecked={urlFixable === 'true'}
                onChange={(_, checked) => updateParams({ fixable: checked ? 'true' : null })}
              />
            </ToolbarItem>
            <ToolbarItem>
              <Checkbox
                id="filter-prioritized"
                label={t('cves.filterPrioritized')}
                isChecked={urlPrioOnly}
                onChange={(_, checked) => updateParams({ prioritized_only: checked ? '1' : null })}
              />
            </ToolbarItem>
            <ToolbarItem>
              <button
                style={advancedBtnStyle}
                onClick={() => updateParams({ advanced: urlAdvanced ? null : '1' }, false)}
                aria-expanded={urlAdvanced}
              >
                <FilterIcon />
                {t('cves.filterAdvanced')}
                {Boolean(hasActiveAdvanced) && (
                  <span style={{
                    background: '#0066cc', color: '#fff', borderRadius: '50%',
                    fontSize: 10, fontWeight: 700, minWidth: 16, height: 16,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                  }}>
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        {(urlCluster || urlNamespace) && (
          <div style={{
            padding: '8px 20px',
            background: 'rgba(0,102,204,0.06)',
            borderTop: '1px solid #d2d2d2',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 13,
          }}>
            <FilterIcon style={{ color: '#0066cc' }} />
            {urlCluster && (
              <span>
                <strong>Cluster:</strong> {urlCluster}
              </span>
            )}
            {urlNamespace && (
              <span>
                <strong>Namespace:</strong> {urlNamespace}
              </span>
            )}
            <button
              onClick={() => updateParams({ cluster: null, namespace: null })}
              style={{
                background: 'none', border: 'none', color: '#0066cc',
                cursor: 'pointer', fontSize: 13, padding: '2px 0', fontFamily: 'inherit',
              }}
            >
              Filter entfernen
            </button>
          </div>
        )}

        {urlAdvanced && (
          <div style={{
            padding: '16px 20px',
            background: 'var(--pf-v6-global--BackgroundColor--200)',
            borderTop: '1px solid #d2d2d2',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 28,
            alignItems: 'flex-start',
          }}>

            {/* CVSS min slider */}
            <div>
              <div style={sectionLabelStyle}>{t('cves.filterCvss')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, width: 34, textAlign: 'right', flexShrink: 0 }}>
                  {cvssMin.toFixed(1)}
                </span>
                <input
                  type="range" min={0} max={10} step={0.1}
                  value={cvssMin}
                  onChange={e => setCvssMin(parseFloat(e.target.value))}
                  style={{ width: 180, accentColor: '#0066cc' }}
                  aria-label="CVSS Minimum"
                />
                <span style={{ fontSize: 11, color: 'var(--pf-v6-global--Color--200)' }}>min</span>
              </div>
            </div>

            {/* EPSS min slider */}
            <div>
              <div style={sectionLabelStyle}>{t('cves.filterEpss')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, width: 40, textAlign: 'right', flexShrink: 0 }}>
                  {(epssMin * 100).toFixed(0)}%
                </span>
                <input
                  type="range" min={0} max={1} step={0.01}
                  value={epssMin}
                  onChange={e => setEpssMin(parseFloat(e.target.value))}
                  style={{ width: 180, accentColor: '#0066cc' }}
                  aria-label="EPSS Minimum"
                />
                <span style={{ fontSize: 11, color: 'var(--pf-v6-global--Color--200)' }}>min</span>
              </div>
            </div>

            {/* Component */}
            <div>
              <div style={sectionLabelStyle}>{t('cves.filterComponent')}</div>
              <TextInput
                value={componentInput}
                onChange={(_, v) => setComponentInput(v)}
                placeholder="z.B. openssl"
                style={{ width: 160 }}
                aria-label={t('cves.filterComponent')}
              />
            </div>

            {/* Risk status */}
            <div>
              <div style={sectionLabelStyle}>{t('cves.filterRiskStatus')}</div>
              <select
                value={urlRiskStatus}
                onChange={e => updateParams({ risk_status: e.target.value || null })}
                style={{ height: 36, padding: '0 8px', border: '1px solid #d2d2d2', borderRadius: 4 }}
              >
                {RISK_STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Clear */}
            {hasActiveAdvanced && (
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                <button
                  onClick={clearAdvanced}
                  style={{
                    background: 'none', border: 'none', color: '#0066cc',
                    cursor: 'pointer', fontSize: 13, padding: '4px 0', fontFamily: 'inherit',
                  }}
                >
                  {t('cves.filterClear')}
                </button>
              </div>
            )}
          </div>
        )}
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
                    <th style={{ ...thStyle('component'), cursor: 'default' }}>{t('cves.componentName')}</th>
                    <th style={thStyle('affected_images')} onClick={() => handleSort('affected_images')}>{t('cves.affectedImages')}</th>
                    <th style={thStyle('affected_deployments')} onClick={() => handleSort('affected_deployments')}>{t('cves.affectedDeployments')}</th>
                    <th style={thStyle('fixable')}>{t('cves.fixable')}</th>
                    <th style={thStyle('fixed_by')}>{t('cves.fixVersion')}</th>
                    <th style={thStyle('first_seen')} onClick={() => handleSort('first_seen')}>{t('cves.firstSeen')}</th>
                    <th style={thStyle('published_on')} onClick={() => handleSort('published_on')}>{t('cves.publishedOn')}</th>
                    <th style={thStyle('actions')}></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map(cve => (
                    <tr key={cve.cve_id} style={getRowStyle(cve.has_priority)}>
                      <td style={{ padding: '8px 12px' }}>
                        <Link to={`/schwachstellen/${cve.cve_id}`} style={{ fontFamily: 'monospace', color: '#0066cc' }}>
                          {cve.cve_id}
                        </Link>
                        {cve.has_priority && (
                          <span style={{
                            marginLeft: 6, fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
                            background: 'rgba(236, 122, 8, 0.18)', color: '#ec7a08',
                            border: '1px solid rgba(236, 122, 8, 0.45)', padding: '1px 5px', borderRadius: 3,
                          }}>PRIO</span>
                        )}
                        {cve.has_risk_acceptance && cve.risk_acceptance_status === 'approved' && (
                          <span style={{
                            marginLeft: 6, fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
                            background: 'rgba(30, 143, 25, 0.18)', color: '#1e8f19',
                            border: '1px solid rgba(30, 143, 25, 0.45)', padding: '1px 5px', borderRadius: 3,
                          }}>ACK</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px' }}><SeverityBadge severity={cve.severity} /></td>
                      <td style={{ padding: '8px 12px', fontWeight: cve.cvss >= 9 ? 700 : 400, color: cve.cvss >= 9 ? '#c9190b' : 'inherit' }}>
                        {cve.cvss.toFixed(1)}
                      </td>
                      <td style={{ padding: '8px 12px' }}><EpssBadge value={cve.epss_probability} /></td>
                      <td style={{ padding: '8px 12px', maxWidth: 200, fontSize: 11 }}>
                        {cve.component_names.length > 0 ? (
                          <span title={cve.component_names.join(', ')}>
                            {cve.component_names.slice(0, 3).join(', ')}
                            {cve.component_names.length > 3 && ` (+${cve.component_names.length - 3})`}
                          </span>
                        ) : '–'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{cve.affected_images}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{cve.affected_deployments}</td>
                      <td style={{ padding: '8px 12px' }}>
                        {cve.fixable ? <span style={{ color: '#1e8f19' }}>✓</span> : <span style={{ color: '#8a8d90' }}>✗</span>}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11 }}>{cve.fixed_by ?? '–'}</td>
                      <td style={{ padding: '8px 12px', fontSize: 11, color: '#6a6e73' }}>
                        {cve.first_seen ? new Date(cve.first_seen).toLocaleDateString('de-DE') : '–'}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: 11, color: '#6a6e73' }}>
                        {cve.published_on ? new Date(cve.published_on).toLocaleDateString('de-DE') : '–'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', width: 40 }}>
                        <Tooltip content={t('cves.requestRiskAcceptance')}>
                          <Link to={`/risikoakzeptanzen/neu?cve=${cve.cve_id}`}>
                            <button
                              aria-label={t('cves.requestRiskAcceptance')}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6a6e73', padding: '2px 6px', lineHeight: 1 }}
                            >
                              <ShieldAltIcon />
                            </button>
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
                page={urlPage}
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
