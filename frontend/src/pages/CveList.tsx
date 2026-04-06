import {
  Alert,
  AlertActionCloseButton,
  Button,
  Checkbox,
  Dropdown,
  DropdownItem,
  DropdownList,
  EmptyState,
  EmptyStateBody,
  MenuToggle,
  PageSection,
  Pagination,
  Popover,
  Spinner,
  FormSelect,
  FormSelectOption,
  SearchInput,
  TextInput,
  Title,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Tooltip,
  Badge,
} from '@patternfly/react-core'
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table'
import { ExportIcon, FilterIcon, ImportIcon, InfoCircleIcon, OutlinedQuestionCircleIcon, SearchIcon } from '@patternfly/react-icons'
import { getErrorMessage } from '../utils/errors'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { useCves, useCvesByImage } from '../api/cves'
import { exportPdf, exportExcel } from '../api/exports'
import { useThresholds } from '../api/settings'

import { useScope, type ScopeParams } from '../hooks/useScope'
import { useAuth } from '../hooks/useAuth'
import { useDebounce } from '../hooks/useDebounce'
import { EpssBadge } from '../components/common/EpssBadge'
import { ExcelImportModal } from '../components/ExcelImportModal'
import { ImageRow } from '../components/ImageRow'
import { SeverityBadge } from '../components/common/SeverityBadge'
import { TableSkeleton } from '../components/TableSkeleton'
import { Severity } from '../types'
import type { ImageCveGroup } from '../types'
import { SEVERITY_COLORS, FIXABLE_COLOR, BRAND_BLUE } from '../tokens'

/* ── Column index maps for sort props ── */

const CVE_SORT_COLUMNS = ['cve_id', 'severity', 'cvss', 'epss_probability', 'affected_images', 'affected_deployments', 'fixable', 'first_seen', 'published_on'] as const

const IMAGE_SORT_COLUMNS = ['image_name', 'total_cves', 'critical_cves', 'high_cves', 'medium_cves', 'low_cves', 'max_cvss', 'max_epss', 'fixable_cves', 'affected_deployments'] as const

function columnIndex(columns: readonly string[], key: string): number | undefined {
  const idx = columns.indexOf(key)
  return idx >= 0 ? idx : undefined
}

export function CveList() {
  const { t, i18n } = useTranslation()

  const SEVERITY_OPTIONS = [
    { label: t('common.all'), value: '' },
    { label: t('severity.4'), value: String(Severity.CRITICAL) },
    { label: t('severity.3'), value: String(Severity.IMPORTANT) },
    { label: t('severity.2'), value: String(Severity.MODERATE) },
    { label: t('severity.1'), value: String(Severity.LOW) },
  ]

  const RISK_STATUS_OPTIONS = [
    { label: t('cves.riskStatusAll'), value: '' },
    { label: t('cves.riskStatusAny'), value: 'any' },
    { label: t('cves.riskStatusRequested'), value: 'requested' },
    { label: t('cves.riskStatusApproved'), value: 'approved' },
  ]

  const REMEDIATION_STATUS_OPTIONS = [
    { label: t('cves.remediationAll'), value: '' },
    { label: t('cves.remediationUnremediated'), value: 'unremediated' },
    { label: t('cves.remediationInProgress'), value: 'in_progress' },
    { label: t('cves.remediationRemediated'), value: 'remediated' },
  ]

  const dateLocale = i18n.language === 'de' ? 'de-DE' : 'en-US'

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
  const urlRemediationStatus = searchParams.get('remediation_status') || ''
  const urlCluster    = searchParams.get('cluster') || ''
  const urlNamespace  = searchParams.get('ns') || ''
  const urlAgeMin     = searchParams.get('age_min') || ''
  const urlAgeMax     = searchParams.get('age_max') || ''
  const urlDeployment = searchParams.get('deployment') || ''
  const urlAdvanced   = searchParams.get('advanced') === '1'
  const urlImageName  = searchParams.get('image_name') || ''
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
      component: null, risk_status: null, remediation_status: null,
    })
  }

  const hasActiveAdvanced =
    debouncedCvssMin > 0 || debouncedEpssMin > 0 ||
    debouncedComponent || urlRiskStatus || urlRemediationStatus

  const activeFilterCount = [
    debouncedCvssMin > 0,
    debouncedEpssMin > 0,
    Boolean(debouncedComponent),
    Boolean(urlRiskStatus),
    Boolean(urlRemediationStatus),
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
    remediation_status: urlRemediationStatus || undefined,
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
    image_name: urlImageName || undefined,
  }
  const { data: imageData, isLoading: imageLoading, error: imageError } = useCvesByImage(scopeOverrides, imageFilters)
  const { isSecTeam } = useAuth()
  const { data: thresholds } = useThresholds()

  const [exportDropdownOpen, setExportDropdownOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
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
    remediation_status: urlRemediationStatus || undefined,
  }

  async function handleExport(type: 'pdf' | 'excel') {
    setExportDropdownOpen(false)
    setExporting(true)
    try {
      const fn = type === 'pdf' ? exportPdf : exportExcel
      await fn(exportFilters, scopeOverrides)
    } catch (e) {
      setExportError(getErrorMessage(e))
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

  // --- Sort helpers for PF Th sort prop ---
  const activeSortDirection = urlSortDesc ? 'desc' as const : 'asc' as const

  function makeCveSort(col: typeof CVE_SORT_COLUMNS[number]) {
    const idx = columnIndex(CVE_SORT_COLUMNS, col)
    if (idx === undefined) return undefined
    return {
      columnIndex: idx,
      sortBy: { index: columnIndex(CVE_SORT_COLUMNS, urlSortBy), direction: activeSortDirection },
      onSort: () => handleSort(col),
    }
  }

  function makeImageSort(col: typeof IMAGE_SORT_COLUMNS[number]) {
    const idx = columnIndex(IMAGE_SORT_COLUMNS, col)
    if (idx === undefined) return undefined
    return {
      columnIndex: idx,
      sortBy: { index: columnIndex(IMAGE_SORT_COLUMNS, urlSortBy), direction: activeSortDirection },
      onSort: () => handleSort(col),
    }
  }

  // --- Styles ---
  const getRowStyle = (hasPriority: boolean): React.CSSProperties => ({
    background: hasPriority ? 'rgba(236, 122, 8, 0.08)' : 'transparent',
    boxShadow: hasPriority ? 'inset 4px 0 0 #ec7a08' : 'none',
  })

  const advancedBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 36,
    padding: '0 12px',
    border: hasActiveAdvanced ? `1px solid ${BRAND_BLUE}` : '1px solid #d2d2d2',
    borderRadius: 4,
    background: hasActiveAdvanced ? `rgba(0,102,204,0.08)` : 'transparent',
    color: hasActiveAdvanced ? BRAND_BLUE : 'var(--pf-t--global--text--color--regular, #151515)',
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: 'inherit',
  }

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, marginBottom: 8,
    color: 'var(--pf-t--global--text--color--subtle)',
  }

  return (
    <>
      <PageSection variant="default">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Title headingLevel="h1" size="xl">{t('cves.title')}</Title>
          <Popover
            headerContent={t('cves.whatIs')}
            bodyContent={
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 8px' }}>
                  {t('cves.helpBody1')}
                </p>
                <p style={{ margin: '0 0 8px' }}>
                  <strong>{t('cves.helpBody2ByCve')}</strong> — {t('cves.helpBody2ByCveDesc')}<br />
                  <strong>{t('cves.helpBody2ByImage')}</strong> — {t('cves.helpBody2ByImageDesc')}<br />
                  <strong>{t('cves.helpBody2Actions')}</strong> — {t('cves.helpBody2ActionsDesc')}
                </p>
                <p style={{ margin: 0 }}>
                  {t('cves.helpBody3')}
                </p>
              </div>
            }
            position="right"
          >
            <Button variant="plain" aria-label={t('cves.helpLabel')} style={{ padding: '4px 6px' }}>
              <OutlinedQuestionCircleIcon style={{ color: 'var(--pf-t--global--text--color--subtle)' }} />
            </Button>
          </Popover>
        </div>
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

      {exportError && (
        <PageSection variant="default" padding={{ default: 'noPadding' }}>
          <Alert
            variant="danger"
            isInline
            title={exportError}
            actionClose={<AlertActionCloseButton onClose={() => setExportError(null)} />}
            style={{ margin: '0 var(--pf-t--global--spacer--lg)' }}
          />
        </PageSection>
      )}

      <PageSection variant="default" style={{ paddingBottom: 0 }}>
        <Toolbar style={{ paddingBottom: 0 }}>
          <ToolbarContent>
            <ToolbarItem style={{ minWidth: 160, flex: '1 1 220px', maxWidth: 300 }}>
              <SearchInput
                value={searchInput}
                onChange={(_e, v) => setSearchInput(v)}
                onClear={() => setSearchInput('')}
                placeholder={t('cves.searchPlaceholder')}
                aria-label={t('cves.searchPlaceholder')}
              />
            </ToolbarItem>
            <ToolbarItem style={{ minWidth: 120, flex: '0 1 160px' }}>
              <FormSelect
                value={urlSeverity}
                onChange={(_e, v) => updateParams({ severity: v || null })}
                aria-label={t('cves.filterSeverity')}
              >
                {SEVERITY_OPTIONS.map(o => (
                  <FormSelectOption key={o.value} value={o.value} label={o.label} />
                ))}
              </FormSelect>
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
              <Button
                variant="secondary"
                style={advancedBtnStyle}
                onClick={() => updateParams({ advanced: urlAdvanced ? null : '1' }, false)}
                aria-expanded={urlAdvanced}
                icon={<FilterIcon />}
              >
                {t('cves.filterAdvanced')}
                {Boolean(hasActiveAdvanced) && (
                  <Badge isRead={false}>{activeFilterCount}</Badge>
                )}
              </Button>
            </ToolbarItem>
            <ToolbarItem>
              <ToggleGroup aria-label={t('cves.viewMode')}>
                <ToggleGroupItem
                  text={t('cves.viewByCve')}
                  isSelected={urlViewMode === 'cve'}
                  onChange={() => updateParams({ view: null }, false)}
                />
                <ToggleGroupItem
                  text={t('cves.viewByImage')}
                  isSelected={urlViewMode === 'image'}
                  onChange={() => updateParams({ view: 'image' }, false)}
                />
              </ToggleGroup>
            </ToolbarItem>
            <ToolbarItem>
              <Dropdown
                isOpen={exportDropdownOpen}
                onSelect={() => setExportDropdownOpen(false)}
                onOpenChange={setExportDropdownOpen}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                    isDisabled={exporting}
                    variant="secondary"
                  >
                    {exporting ? <Spinner size="sm" aria-label={t('exports.export')} /> : <ExportIcon />}
                    {' '}{t('exports.export')}
                  </MenuToggle>
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
                <Button
                  variant="secondary"
                  icon={<ImportIcon />}
                  onClick={() => setImportModalOpen(true)}
                >
                  {t('exports.import')}
                </Button>
              </ToolbarItem>
            )}
          </ToolbarContent>
        </Toolbar>

        {(urlCluster || urlNamespace || urlDeployment || urlAgeMin || urlAgeMax) && (
          <div style={{
            padding: '8px 20px',
            background: `rgba(0,102,204,0.06)`,
            borderTop: '1px solid #d2d2d2',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 13,
          }}>
            <FilterIcon style={{ color: BRAND_BLUE }} />
            {urlCluster && (
              <span>
                <strong>{t('common.cluster')}:</strong> {urlCluster}
              </span>
            )}
            {urlNamespace && (
              <span>
                <strong>{t('common.namespace')}:</strong> {urlNamespace}
              </span>
            )}
            {urlDeployment && (
              <span>
                <strong>{t('common.deployment')}:</strong> {urlDeployment}
              </span>
            )}
            {(urlAgeMin || urlAgeMax) && (
              <span>
                <strong>{t('common.age')}:</strong>{' '}
                {urlAgeMin && urlAgeMax
                  ? `${urlAgeMin}–${urlAgeMax} ${t('common.day_plural')}`
                  : urlAgeMin
                    ? `≥ ${urlAgeMin} ${t('common.day_plural')}`
                    : `≤ ${urlAgeMax} ${t('common.day_plural')}`}
              </span>
            )}
            <button
              onClick={() => updateParams({ cluster: null, ns: null, deployment: null, age_min: null, age_max: null })}
              style={{
                background: 'none', border: 'none', color: BRAND_BLUE,
                cursor: 'pointer', fontSize: 13, padding: '2px 0', fontFamily: 'inherit',
              }}
            >
              {t('common.removeFilter')}
            </button>
          </div>
        )}

        {urlAdvanced && (
          <div style={{
            padding: '16px 20px',
            background: 'var(--pf-t--global--background--color--secondary--default)',
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
                  style={{ width: 180, accentColor: BRAND_BLUE }}
                  aria-label="CVSS Minimum"
                />
                <span style={{ fontSize: 11, color: 'var(--pf-t--global--text--color--subtle)' }}>min</span>
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
                  style={{ width: 180, accentColor: BRAND_BLUE }}
                  aria-label="EPSS Minimum"
                />
                <span style={{ fontSize: 11, color: 'var(--pf-t--global--text--color--subtle)' }}>min</span>
              </div>
            </div>

            {/* Component */}
            <div>
              <div style={sectionLabelStyle}>{t('cves.filterComponent')}</div>
              <TextInput
                value={componentInput}
                onChange={(_, v) => setComponentInput(v)}
                placeholder="openssl"
                style={{ width: 160 }}
                aria-label={t('cves.filterComponent')}
              />
            </div>

            {/* Risk status */}
            <div>
              <div style={sectionLabelStyle}>{t('cves.filterRiskStatus')}</div>
              <FormSelect
                value={urlRiskStatus}
                onChange={(_e, v) => updateParams({ risk_status: v || null })}
                aria-label={t('cves.filterRiskStatus')}
              >
                {RISK_STATUS_OPTIONS.map(o => (
                  <FormSelectOption key={o.value} value={o.value} label={o.label} />
                ))}
              </FormSelect>
            </div>

            {/* Remediation status */}
            <div>
              <div style={sectionLabelStyle}>{t('cves.filterRemediationStatus')}</div>
              <FormSelect
                value={urlRemediationStatus}
                onChange={(_e, v) => updateParams({ remediation_status: v || null })}
                aria-label={t('cves.filterRemediationStatus')}
              >
                {REMEDIATION_STATUS_OPTIONS.map(o => (
                  <FormSelectOption key={o.value} value={o.value} label={o.label} />
                ))}
              </FormSelect>
            </div>

            {/* Clear */}
            {hasActiveAdvanced && (
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                <button
                  onClick={clearAdvanced}
                  style={{
                    background: 'none', border: 'none', color: BRAND_BLUE,
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

      <PageSection variant="default" isFilled>
        {urlViewMode === 'image' ? (
          /* ── Image-grouped view ── */
          imageLoading ? <TableSkeleton columns={12} /> : imageError ? (
            <Alert variant="danger" title={`${t('common.error')}: ${getErrorMessage(imageError)}`} />
          ) : !imageData?.length ? (
            <EmptyState
              titleText={t('cves.imageGroupNoImages')}
              headingLevel="h2"
              icon={SearchIcon}
              variant="sm"
            >
              <EmptyStateBody />
            </EmptyState>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <Table variant="compact" isStickyHeader style={{ fontSize: 13 }}>
                <Thead>
                  <Tr>
                    <Th style={{ width: 28 }}></Th>
                    <Th sort={makeImageSort('image_name')}>{t('cves.imageGroupImage')}</Th>
                    <Th sort={makeImageSort('total_cves')}>{t('cves.imageGroupTotalCves')}</Th>
                    <Th sort={makeImageSort('critical_cves')}>{t('cves.imageGroupCritical')}</Th>
                    <Th sort={makeImageSort('high_cves')}>{t('cves.imageGroupHigh')}</Th>
                    <Th sort={makeImageSort('medium_cves')}>{t('cves.imageGroupMedium')}</Th>
                    <Th sort={makeImageSort('low_cves')}>{t('cves.imageGroupLow')}</Th>
                    <Th sort={makeImageSort('max_cvss')}>{t('cves.imageGroupMaxCvss')}</Th>
                    <Th sort={makeImageSort('max_epss')}>{t('cves.imageGroupMaxEpss')}</Th>
                    <Th sort={makeImageSort('fixable_cves')}>{t('cves.imageGroupFixable')}</Th>
                    <Th sort={makeImageSort('affected_deployments')}>{t('cves.imageGroupDeployments')}</Th>
                    <Th>{t('cves.imageGroupNamespaces')}</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {sortedImageData?.map(group => (
                    <ImageRow key={group.image_id} group={group} scope={scopeOverrides} filters={imageFilters} />
                  ))}
                </Tbody>
              </Table>
            </div>
          )
        ) : (
          /* ── Per-CVE view ── */
          isLoading ? <TableSkeleton columns={9} /> : error ? (
            <Alert variant="danger" title={`${t('common.error')}: ${getErrorMessage(error)}`} />
          ) : !data?.items.length ? (
            <EmptyState
              titleText={t('cves.noResults')}
              headingLevel="h2"
              icon={SearchIcon}
              variant="sm"
            >
              <EmptyStateBody>
                <span style={{ color: 'var(--pf-t--global--text--color--subtle)', fontSize: 13 }}>
                  {t('cves.noResultsHint')}
                </span>
              </EmptyStateBody>
            </EmptyState>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <Table variant="compact" isStickyHeader style={{ fontSize: 13 }}>
                  <Thead>
                    <Tr>
                      <Th sort={makeCveSort('cve_id')}>{t('cves.cveId')}</Th>
                      <Th sort={makeCveSort('severity')}>{t('cves.severity')}</Th>
                      <Th sort={makeCveSort('cvss')}>{t('cves.cvss')}</Th>
                      <Th sort={makeCveSort('epss_probability')}>{t('cves.epss')}</Th>
                      <Th sort={makeCveSort('affected_images')}>{t('cves.affectedImages')}</Th>
                      <Th sort={makeCveSort('affected_deployments')}>{t('cves.affectedDeployments')}</Th>
                      <Th>{t('cves.fixable')}</Th>
                      <Th sort={makeCveSort('first_seen')}>{t('cves.firstSeen')}</Th>
                      <Th sort={makeCveSort('published_on')}>{t('cves.publishedOn')}</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {data.items.map(cve => (
                      <Tr key={cve.cve_id} style={getRowStyle(cve.has_priority)}>
                        <Td>
                          <Link to={`/vulnerabilities/${cve.cve_id}`} style={{ fontFamily: 'monospace', color: BRAND_BLUE }}>
                            {cve.cve_id}
                          </Link>
                          {cve.has_priority && (
                            <Tooltip content={t('priorities.badgeTooltip')}>
                              <span style={{
                                marginLeft: 6, fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
                                background: 'rgba(236, 122, 8, 0.18)', color: '#ec7a08',
                                border: '1px solid rgba(236, 122, 8, 0.45)', padding: '1px 5px', borderRadius: 3,
                              }}>PRIO</span>
                            </Tooltip>
                          )}
                          {cve.has_risk_acceptance && cve.risk_acceptance_status === 'approved' && (
                            <span style={{
                              marginLeft: 6, fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
                              background: `rgba(30, 143, 25, 0.18)`, color: FIXABLE_COLOR,
                              border: `1px solid rgba(30, 143, 25, 0.45)`, padding: '1px 5px', borderRadius: 3,
                            }}>ACK</span>
                          )}
                        </Td>
                        <Td><SeverityBadge severity={cve.severity} /></Td>
                        <Td style={{ fontWeight: cve.cvss >= 9 ? 700 : 400, color: cve.cvss >= 9 ? SEVERITY_COLORS.important : 'inherit' }}>
                          {cve.cvss.toFixed(1)}
                        </Td>
                        <Td><EpssBadge value={cve.epss_probability} /></Td>
                        <Td style={{ textAlign: 'right' }}>{cve.affected_images}</Td>
                        <Td style={{ textAlign: 'right' }}>{cve.affected_deployments}</Td>
                        <Td>
                          {cve.fixable ? <span style={{ color: FIXABLE_COLOR }}>✓</span> : <span style={{ color: SEVERITY_COLORS.unknown }}>✗</span>}
                        </Td>
                        <Td style={{ fontSize: 11, color: SEVERITY_COLORS.unknown }}>
                          {cve.first_seen ? new Date(cve.first_seen).toLocaleDateString(dateLocale) : '–'}
                        </Td>
                        <Td style={{ fontSize: 11, color: SEVERITY_COLORS.unknown }}>
                          {cve.published_on ? new Date(cve.published_on).toLocaleDateString(dateLocale) : '–'}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
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
