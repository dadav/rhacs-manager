import {
  Alert,
  Checkbox,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  PageSection,
  Pagination,
  Spinner,
  TextInput,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core'
import { ExportIcon, FilterIcon, ImportIcon, InfoCircleIcon, AngleRightIcon, AngleDownIcon } from '@patternfly/react-icons'
import { getErrorMessage } from '../utils/errors'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { useCves, useCvesByImage, useCvesForImage } from '../api/cves'
import { exportPdf, exportExcel } from '../api/exports'
import { useThresholds } from '../api/settings'

import { useScope, type ScopeParams } from '../hooks/useScope'
import { useAuth } from '../hooks/useAuth'
import { EpssBadge } from '../components/common/EpssBadge'
import { ExcelImportModal } from '../components/ExcelImportModal'
import { SeverityBadge } from '../components/common/SeverityBadge'
import { Severity } from '../types'
import type { ImageCveGroup } from '../types'

/* ── Image-grouped expandable row ── */

function ImageRow({ group, scope, filters }: { group: ImageCveGroup; scope: ScopeParams; filters: Record<string, string | number | boolean | undefined> }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const { data: cves, isLoading } = useCvesForImage(expanded ? group.image_id : '', scope, filters)

  const imgThStyle: React.CSSProperties = {
    padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap',
    borderBottom: '2px solid #d2d2d2', color: 'var(--pf-v6-global--Color--100)',
  }

  return (
    <>
      <tr
        style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <td style={{ padding: '8px 12px', width: 28 }}>
          {expanded ? <AngleDownIcon /> : <AngleRightIcon />}
        </td>
        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={group.image_name}>
          {group.image_name}
        </td>
        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{group.total_cves}</td>
        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#a30000' }}>{group.critical_cves || '–'}</td>
        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#c9190b' }}>{group.high_cves || '–'}</td>
        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#f0ab00' }}>{group.medium_cves || '–'}</td>
        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#6a6e73' }}>{group.low_cves || '–'}</td>
        <td style={{ padding: '8px 12px', fontWeight: group.max_cvss >= 9 ? 700 : 400, color: group.max_cvss >= 9 ? '#c9190b' : 'inherit' }}>
          {group.max_cvss.toFixed(1)}
        </td>
        <td style={{ padding: '8px 12px' }}><EpssBadge value={group.max_epss} /></td>
        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
          {group.fixable_cves > 0 ? (
            <span style={{ color: '#1e8f19' }}>{group.fixable_cves}</span>
          ) : '–'}
        </td>
        <td style={{ padding: '8px 12px', textAlign: 'right' }}>{group.affected_deployments}</td>
        <td style={{ padding: '8px 12px', fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={group.namespaces.join(', ')}>
          {group.namespaces.join(', ')}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={12} style={{ padding: 0 }}>
            <div style={{ padding: '8px 16px 12px 40px', background: 'var(--pf-v6-global--BackgroundColor--200)' }}>
              {group.fixable_cves > 0 && (
                <div style={{
                  padding: '6px 12px', marginBottom: 8, fontSize: 12, fontWeight: 600,
                  background: 'rgba(30, 143, 25, 0.1)', color: '#1e8f19',
                  borderRadius: 4, display: 'inline-block',
                }}>
                  {t('cves.imageGroupFixHint', { count: group.fixable_cves })}
                </div>
              )}
              {isLoading ? (
                <Spinner size="md" aria-label="Laden" />
              ) : !cves?.length ? (
                <div style={{ color: '#6a6e73', fontSize: 13 }}>{t('cves.imageGroupNoCves')}</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={imgThStyle}>{t('cves.cveId')}</th>
                      <th style={imgThStyle}>{t('cves.severity')}</th>
                      <th style={imgThStyle}>{t('cves.cvss')}</th>
                      <th style={imgThStyle}>{t('cves.epss')}</th>
                      <th style={imgThStyle}>{t('cves.fixable')}</th>
                      <th style={imgThStyle}>{t('cves.fixVersion')}</th>
                      <th style={imgThStyle}>{t('cves.affectedDeployments')}</th>
                      <th style={imgThStyle}>{t('cves.firstSeen')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cves.map(cve => (
                      <tr key={cve.cve_id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                        <td style={{ padding: '6px 12px' }}>
                          <Link to={`/schwachstellen/${cve.cve_id}`} style={{ fontFamily: 'monospace', color: '#0066cc' }}>
                            {cve.cve_id}
                          </Link>
                        </td>
                        <td style={{ padding: '6px 12px' }}><SeverityBadge severity={cve.severity} /></td>
                        <td style={{ padding: '6px 12px', fontWeight: cve.cvss >= 9 ? 700 : 400, color: cve.cvss >= 9 ? '#c9190b' : 'inherit' }}>
                          {cve.cvss.toFixed(1)}
                        </td>
                        <td style={{ padding: '6px 12px' }}><EpssBadge value={cve.epss_probability} /></td>
                        <td style={{ padding: '6px 12px' }}>
                          {cve.fixable ? <span style={{ color: '#1e8f19' }}>✓</span> : <span style={{ color: '#8a8d90' }}>✗</span>}
                        </td>
                        <td style={{ padding: '6px 12px', fontFamily: 'monospace', fontSize: 11 }}>{cve.fixed_by ?? '–'}</td>
                        <td style={{ padding: '6px 12px', textAlign: 'right' }}>{cve.affected_deployments}</td>
                        <td style={{ padding: '6px 12px', fontSize: 11, color: '#6a6e73' }}>
                          {cve.first_seen ? new Date(cve.first_seen).toLocaleDateString('de-DE') : '–'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

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
  const urlAgeMin     = searchParams.get('age_min') || ''
  const urlAgeMax     = searchParams.get('age_max') || ''
  const urlDeployment = searchParams.get('deployment') || ''
  const urlAdvanced   = searchParams.get('advanced') === '1'
  const urlViewMode   = searchParams.get('view') === 'image' ? 'image' : 'cve'

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
    age_min: urlAgeMin ? Number(urlAgeMin) : undefined,
    age_max: urlAgeMax ? Number(urlAgeMax) : undefined,
    deployment: urlDeployment || undefined,
  }

  const { scopeParams } = useScope()
  const scopeOverrides: ScopeParams = {
    cluster: urlCluster || scopeParams.cluster,
    namespace: urlNamespace || scopeParams.namespace,
  }
  const { data, isLoading, error } = useCves(params, scopeOverrides)
  const imageFilters = {
    search: debouncedSearch || undefined,
    severity: urlSeverity ? Number(urlSeverity) : undefined,
    fixable: urlFixable === 'true' ? true : urlFixable === 'false' ? false : undefined,
    cvss_min: debouncedCvssMin > 0 ? debouncedCvssMin : undefined,
    epss_min: debouncedEpssMin > 0 ? debouncedEpssMin : undefined,
    component: debouncedComponent || undefined,
  }
  const { data: imageData, isLoading: imageLoading, error: imageError } = useCvesByImage(scopeOverrides, imageFilters)
  const { isSecTeam } = useAuth()
  const { data: thresholds } = useThresholds()

  const [exportDropdownOpen, setExportDropdownOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)

  const exportFilters = {
    search: debouncedSearch || undefined,
    severity: urlSeverity ? Number(urlSeverity) : undefined,
    fixable: urlFixable === 'true' ? true : urlFixable === 'false' ? false : undefined,
    prioritized_only: urlPrioOnly || undefined,
    sort_by: urlSortBy,
    sort_desc: urlSortDesc,
    cvss_min: debouncedCvssMin > 0 ? debouncedCvssMin : undefined,
    epss_min: debouncedEpssMin > 0 ? debouncedEpssMin : undefined,
    component: debouncedComponent || undefined,
    risk_status: urlRiskStatus || undefined,
  }

  async function handleExport(type: 'pdf' | 'excel') {
    setExportDropdownOpen(false)
    setExporting(true)
    try {
      const fn = type === 'pdf' ? exportPdf : exportExcel
      await fn(exportFilters, scopeOverrides)
    } catch (e) {
      alert(getErrorMessage(e))
    } finally {
      setExporting(false)
    }
  }

  const hasActiveThresholds = thresholds && !isSecTeam &&
    (thresholds.min_cvss_score > 0 || thresholds.min_epss_score > 0)

  // --- Image view sort (client-side) ---
  const IMAGE_SORT_KEYS: Record<string, (g: ImageCveGroup) => string | number> = {
    image_name: g => g.image_name.toLowerCase(),
    total_cves: g => g.total_cves,
    critical_cves: g => g.critical_cves,
    high_cves: g => g.high_cves,
    medium_cves: g => g.medium_cves,
    low_cves: g => g.low_cves,
    max_cvss: g => g.max_cvss,
    max_epss: g => g.max_epss,
    fixable_cves: g => g.fixable_cves,
    affected_deployments: g => g.affected_deployments,
  }

  const sortedImageData = (() => {
    if (!imageData?.length) return imageData
    const keyFn = IMAGE_SORT_KEYS[urlSortBy]
    if (!keyFn) return imageData
    const sorted = [...imageData].sort((a, b) => {
      const av = keyFn(a)
      const bv = keyFn(b)
      if (av < bv) return urlSortDesc ? 1 : -1
      if (av > bv) return urlSortDesc ? -1 : 1
      return 0
    })
    return sorted
  })()

  // --- Styles ---
  const imgThStyle: React.CSSProperties = {
    padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap',
    borderBottom: '2px solid #d2d2d2', color: 'var(--pf-v6-global--Color--100)',
  }

  const imgThSortStyle = (col: string, align?: string): React.CSSProperties => ({
    padding: '10px 12px',
    textAlign: (align || 'left') as 'left' | 'right',
    whiteSpace: 'nowrap',
    borderBottom: '2px solid #d2d2d2',
    cursor: 'pointer',
    userSelect: 'none',
    color: urlSortBy === col ? '#0066cc' : 'var(--pf-v6-global--Color--100)',
  })

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

      <PageSection variant="default" style={{ paddingBottom: 0 }}>
        <Toolbar style={{ paddingBottom: 0 }}>
          <ToolbarContent>
            <ToolbarItem>
              <TextInput
                value={searchInput}
                onChange={(_, v) => setSearchInput(v)}
                placeholder={t('cves.searchPlaceholder')}
                style={{ width: 220, height: 36 }}
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
            <ToolbarItem>
              <div style={{ display: 'inline-flex', borderRadius: 4, border: '1px solid #d2d2d2', overflow: 'hidden' }}>
                <button
                  onClick={() => updateParams({ view: null }, false)}
                  style={{
                    height: 36, padding: '0 12px', border: 'none', cursor: 'pointer',
                    fontSize: 13, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: urlViewMode === 'cve' ? '#0066cc' : 'transparent',
                    color: urlViewMode === 'cve' ? '#fff' : 'var(--pf-v6-global--Color--100)',
                  }}
                >
                  {t('cves.viewByCve')}
                </button>
                <button
                  onClick={() => updateParams({ view: 'image' }, false)}
                  style={{
                    height: 36, padding: '0 12px', border: 'none', borderLeft: '1px solid #d2d2d2', cursor: 'pointer',
                    fontSize: 13, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: urlViewMode === 'image' ? '#0066cc' : 'transparent',
                    color: urlViewMode === 'image' ? '#fff' : 'var(--pf-v6-global--Color--100)',
                  }}
                >
                  {t('cves.viewByImage')}
                </button>
              </div>
            </ToolbarItem>
            <ToolbarItem>
              <Dropdown
                isOpen={exportDropdownOpen}
                onSelect={() => setExportDropdownOpen(false)}
                onOpenChange={setExportDropdownOpen}
                toggle={(toggleRef) => (
                  <button
                    ref={toggleRef}
                    onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                    disabled={exporting}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      height: 36, padding: '0 12px',
                      border: '1px solid #d2d2d2', borderRadius: 4,
                      background: 'transparent', cursor: exporting ? 'default' : 'pointer',
                      fontSize: 14, fontFamily: 'inherit',
                      color: 'var(--pf-v6-global--Color--100)',
                    }}
                  >
                    {exporting ? <Spinner size="sm" aria-label="Exportieren" /> : <ExportIcon />}
                    {t('exports.export')}
                  </button>
                )}
                popperProps={{ position: 'right' }}
              >
                <DropdownList>
                  <DropdownItem key="pdf" onClick={() => handleExport('pdf')}>
                    {t('exports.exportPdf')}
                  </DropdownItem>
                  <DropdownItem key="excel" onClick={() => handleExport('excel')}>
                    {t('exports.exportExcel')}
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
            </ToolbarItem>
            {!isSecTeam && (
              <ToolbarItem>
                <button
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    height: 36, padding: '0 12px',
                    border: '1px solid #d2d2d2', borderRadius: 4,
                    background: 'transparent', cursor: 'pointer',
                    fontSize: 14, fontFamily: 'inherit',
                    color: 'var(--pf-v6-global--Color--100)',
                  }}
                  onClick={() => setImportModalOpen(true)}
                >
                  <ImportIcon /> {t('exports.import')}
                </button>
              </ToolbarItem>
            )}
          </ToolbarContent>
        </Toolbar>

        {(urlCluster || urlNamespace || urlDeployment || urlAgeMin || urlAgeMax) && (
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
            {urlDeployment && (
              <span>
                <strong>Deployment:</strong> {urlDeployment}
              </span>
            )}
            {(urlAgeMin || urlAgeMax) && (
              <span>
                <strong>Alter:</strong>{' '}
                {urlAgeMin && urlAgeMax
                  ? `${urlAgeMin}–${urlAgeMax} Tage`
                  : urlAgeMin
                    ? `≥ ${urlAgeMin} Tage`
                    : `≤ ${urlAgeMax} Tage`}
              </span>
            )}
            <button
              onClick={() => updateParams({ cluster: null, namespace: null, deployment: null, age_min: null, age_max: null })}
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
        {urlViewMode === 'image' ? (
          /* ── Image-grouped view ── */
          imageLoading ? <Spinner aria-label="Laden" /> : imageError ? (
            <Alert variant="danger" title={`Fehler: ${getErrorMessage(imageError)}`} />
          ) : !imageData?.length ? (
            <Alert variant="info" isInline title={t('cves.imageGroupNoImages')} />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ ...imgThStyle, width: 28 }}></th>
                    <th style={imgThSortStyle('image_name')} onClick={() => handleSort('image_name')}>{t('cves.imageGroupImage')}</th>
                    <th style={imgThSortStyle('total_cves', 'right')} onClick={() => handleSort('total_cves')}>{t('cves.imageGroupTotalCves')}</th>
                    <th style={imgThSortStyle('critical_cves', 'right')} onClick={() => handleSort('critical_cves')}>{t('cves.imageGroupCritical')}</th>
                    <th style={imgThSortStyle('high_cves', 'right')} onClick={() => handleSort('high_cves')}>{t('cves.imageGroupHigh')}</th>
                    <th style={imgThSortStyle('medium_cves', 'right')} onClick={() => handleSort('medium_cves')}>{t('cves.imageGroupMedium')}</th>
                    <th style={imgThSortStyle('low_cves', 'right')} onClick={() => handleSort('low_cves')}>{t('cves.imageGroupLow')}</th>
                    <th style={imgThSortStyle('max_cvss')} onClick={() => handleSort('max_cvss')}>{t('cves.imageGroupMaxCvss')}</th>
                    <th style={imgThSortStyle('max_epss')} onClick={() => handleSort('max_epss')}>{t('cves.imageGroupMaxEpss')}</th>
                    <th style={imgThSortStyle('fixable_cves', 'right')} onClick={() => handleSort('fixable_cves')}>{t('cves.imageGroupFixable')}</th>
                    <th style={imgThSortStyle('affected_deployments', 'right')} onClick={() => handleSort('affected_deployments')}>{t('cves.imageGroupDeployments')}</th>
                    <th style={imgThStyle}>{t('cves.imageGroupNamespaces')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedImageData?.map(group => (
                    <ImageRow key={group.image_id} group={group} scope={scopeOverrides} filters={imageFilters} />
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* ── Per-CVE view ── */
          isLoading ? <Spinner aria-label="Laden" /> : error ? (
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
                      <th style={thStyle('first_seen')} onClick={() => handleSort('first_seen')}>{t('cves.firstSeen')}</th>
                      <th style={thStyle('published_on')} onClick={() => handleSort('published_on')}>{t('cves.publishedOn')}</th>
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
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>{cve.affected_images}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>{cve.affected_deployments}</td>
                        <td style={{ padding: '8px 12px' }}>
                          {cve.fixable ? <span style={{ color: '#1e8f19' }}>✓</span> : <span style={{ color: '#8a8d90' }}>✗</span>}
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: 11, color: '#6a6e73' }}>
                          {cve.first_seen ? new Date(cve.first_seen).toLocaleDateString('de-DE') : '–'}
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: 11, color: '#6a6e73' }}>
                          {cve.published_on ? new Date(cve.published_on).toLocaleDateString('de-DE') : '–'}
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
          )
        )}
      </PageSection>

      <ExcelImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
    </>
  )
}
