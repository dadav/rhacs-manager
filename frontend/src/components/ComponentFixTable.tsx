import { Td, Tr, Table, Thead, Tbody, Th } from '@patternfly/react-table'
import { Tooltip } from '@patternfly/react-core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { EpssBadge } from './common/EpssBadge'
import { SeverityBadge } from './common/SeverityBadge'
import type { FixRollupItem } from '../types'
import { SEVERITY_COLORS, FIXABLE_COLOR, BRAND_BLUE } from '../tokens'
import { formatCvss } from '../utils/format'

// Column count of ComponentFixTable (expander included); the
// expanded detail row spans all of them.
export const COMPONENT_TABLE_COLUMNS = 10

export function ComponentFixRow({ item, showImageLinks = true }: { item: FixRollupItem; showImageLinks?: boolean }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const rowKey = `${item.component_name}@${item.component_version}@${item.operating_system}`
  const unfixable = item.total_cves - item.fixable_cves

  return (
    <>
      <Tr style={item.prioritized_cves > 0 ? { background: 'rgba(236, 122, 8, 0.08)', boxShadow: 'inset 4px 0 0 #ec7a08' } : undefined}>
        <Td
          expand={{
            rowIndex: 0,
            isExpanded: expanded,
            onToggle: () => setExpanded(!expanded),
            expandId: `component-row-${rowKey}`,
          }}
          aria-label={expanded ? t('cves.collapseRow') : t('cves.expandRow')}
        />
        <Td>
          <span style={{ fontWeight: 600 }}>{item.component_name}</span>
          {item.prioritized_cves > 0 && (
            <Tooltip content={t('cves.componentPrioTooltip', { count: item.prioritized_cves })}>
              <span style={{
                marginLeft: 6, fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
                background: 'rgba(236, 122, 8, 0.18)', color: '#ec7a08',
                border: '1px solid rgba(236, 122, 8, 0.45)', padding: '1px 5px', borderRadius: 3,
              }}>PRIO</span>
            </Tooltip>
          )}
          {item.operating_system && (
            <div style={{ fontSize: 11, color: SEVERITY_COLORS.unknown }}>{item.operating_system}</div>
          )}
        </Td>
        <Td style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.component_version || '–'}</Td>
        <Td style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {item.target_uncertain ? (
            <Tooltip content={t('cves.componentUncertainTooltip', { versions: item.fix_versions.join(', ') })}>
              <span style={{ color: SEVERITY_COLORS.important, cursor: 'help' }}>
                {item.target_version ? <>&rarr; {item.target_version} ?</> : '?'}
              </span>
            </Tooltip>
          ) : item.target_version ? (
            <span style={{ color: FIXABLE_COLOR }}>&rarr; {item.target_version}</span>
          ) : (
            <span style={{ color: SEVERITY_COLORS.unknown }}>{t('cves.componentNoFix')}</span>
          )}
        </Td>
        <Td style={{ textAlign: 'right' }}>
          <span style={{ color: item.fixable_cves > 0 ? FIXABLE_COLOR : SEVERITY_COLORS.unknown, fontWeight: 600 }}>
            {item.fixable_cves}
          </span>
          <span style={{ color: SEVERITY_COLORS.unknown }}> / {item.total_cves}</span>
        </Td>
        <Td><SeverityBadge severity={item.max_severity} /></Td>
        <Td style={{ fontWeight: item.max_cvss >= 9 ? 700 : 400, color: item.max_cvss >= 9 ? SEVERITY_COLORS.important : 'inherit' }}>
          {formatCvss(item.max_cvss)}
        </Td>
        <Td><EpssBadge value={item.max_epss} /></Td>
        <Td style={{ textAlign: 'right' }}>{item.affected_images}</Td>
        <Td style={{ textAlign: 'right' }}>{item.affected_deployments}</Td>
      </Tr>
      {expanded && (
        <Tr>
          <Td colSpan={COMPONENT_TABLE_COLUMNS} style={{ padding: 0 }}>
            <div style={{ padding: '8px 16px 12px 40px', background: 'var(--pf-t--global--background--color--secondary--default)' }}>
              <div style={{
                padding: '6px 12px', marginBottom: 8, fontSize: 12, fontWeight: 600, borderRadius: 4, display: 'inline-block',
                background: item.target_version ? 'rgba(30, 143, 25, 0.1)' : 'transparent',
                color: item.target_version ? FIXABLE_COLOR : SEVERITY_COLORS.unknown,
              }}>
                {item.target_version
                  ? t('cves.componentFixHint', {
                      component: item.component_name,
                      from: item.component_version,
                      to: item.target_version,
                      count: item.fixable_cves,
                      images: item.affected_images,
                    })
                  : t('cves.componentNoFixHint')}
                {item.target_version && unfixable > 0 && ` ${t('cves.componentRemainingHint', { count: unfixable })}`}
              </div>
              {item.target_uncertain && (
                <div style={{ marginBottom: 8, fontSize: 12, color: SEVERITY_COLORS.important }}>
                  {t('cves.componentUncertainHint', { versions: item.fix_versions.join(', ') })}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: showImageLinks ? 'minmax(0, 3fr) minmax(0, 2fr)' : 'minmax(0, 1fr)', gap: 16 }}>
                <Table variant="compact" style={{ fontSize: 12 }} aria-label={t('cves.componentCvesTitle')}>
                  <Thead>
                    <Tr>
                      <Th>{t('cves.cveId')}</Th>
                      <Th>{t('cves.severity')}</Th>
                      <Th>{t('cves.epss')}</Th>
                      <Th>{t('cves.fixVersion')}</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {item.cves.map(cve => (
                      <Tr key={cve.cve_id}>
                        <Td>
                          <Link to={`/vulnerabilities/${cve.cve_id}`} style={{ fontFamily: 'monospace', color: BRAND_BLUE }}>
                            {cve.cve_id}
                          </Link>
                        </Td>
                        <Td><SeverityBadge severity={cve.severity} /></Td>
                        <Td><EpssBadge value={cve.epss_probability} /></Td>
                        <Td style={{ fontFamily: 'monospace', fontSize: 11 }}>
                          {cve.fixable && cve.fix_candidates.length > 0 ? cve.fix_candidates.join(', ') : '–'}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                {showImageLinks && (
                  <Table variant="compact" style={{ fontSize: 12 }} aria-label={t('cves.componentImagesTitle')}>
                    <Thead>
                      <Tr>
                        <Th>{t('cves.componentImagesTitle')}</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {item.images.map(img => (
                        <Tr key={img.image_id}>
                          <Td style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>
                            <Link to={`/images/${encodeURIComponent(img.image_id)}`} style={{ color: BRAND_BLUE }}>
                              {img.image_name}
                            </Link>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </div>
            </div>
          </Td>
        </Tr>
      )}
    </>
  )
}

export const COMPONENT_SORT_COLUMNS = [
  'component_name',
  'fixable_cves',
  'max_cvss',
  'max_epss',
  'affected_images',
  'affected_deployments',
] as const
export type ComponentSortColumn = typeof COMPONENT_SORT_COLUMNS[number]

type ThSort = React.ComponentProps<typeof Th>['sort']

export function ComponentFixTable({
  items,
  sortFor,
  showImageLinks = true,
}: {
  items: FixRollupItem[]
  sortFor?: (col: ComponentSortColumn) => ThSort
  showImageLinks?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div style={{ overflowX: 'auto' }}>
      <Table variant="compact" isStickyHeader style={{ fontSize: 13 }} aria-label={t('cves.viewByComponent')}>
        <Thead>
          <Tr>
            <Th style={{ width: 28 }} screenReaderText={t('cves.expandRow')} />
            <Th sort={sortFor?.('component_name')}>{t('cves.componentName')}</Th>
            <Th>{t('cves.componentInstalled')}</Th>
            <Th info={{ tooltip: t('cves.componentTargetTooltip') }}>{t('cves.componentTarget')}</Th>
            <Th sort={sortFor?.('fixable_cves')}>{t('cves.componentFixesCves')}</Th>
            <Th>{t('cves.severity')}</Th>
            <Th sort={sortFor?.('max_cvss')}>{t('cves.imageGroupMaxCvss')}</Th>
            <Th sort={sortFor?.('max_epss')}>{t('cves.imageGroupMaxEpss')}</Th>
            <Th sort={sortFor?.('affected_images')}>{t('cves.affectedImages')}</Th>
            <Th sort={sortFor?.('affected_deployments')}>{t('cves.affectedDeployments')}</Th>
          </Tr>
        </Thead>
        <Tbody>
          {items.map(item => (
            <ComponentFixRow
              key={`${item.component_name}@${item.component_version}@${item.operating_system}`}
              item={item}
              showImageLinks={showImageLinks}
            />
          ))}
        </Tbody>
      </Table>
    </div>
  )
}
