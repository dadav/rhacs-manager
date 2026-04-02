import { Spinner } from '@patternfly/react-core'
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table'
import { AngleRightIcon, AngleDownIcon } from '@patternfly/react-icons'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useCvesForImage } from '../api/cves'
import { EpssBadge } from '../components/common/EpssBadge'
import { SeverityBadge } from '../components/common/SeverityBadge'
import type { ImageCveGroup } from '../types'
import type { ScopeParams } from '../hooks/useScope'
import { SEVERITY_COLORS, FIXABLE_COLOR, BRAND_BLUE } from '../tokens'

export function ImageRow({ group, scope, filters }: { group: ImageCveGroup; scope: ScopeParams; filters: Record<string, string | number | boolean | undefined> }) {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language === 'de' ? 'de-DE' : 'en-US'
  const [expanded, setExpanded] = useState(false)
  const { data: cves, isLoading } = useCvesForImage(expanded ? group.image_id : '', scope, filters)

  return (
    <>
      <Tr isClickable onClick={() => setExpanded(!expanded)}>
        <Td style={{ width: 28 }}>
          {expanded ? <AngleDownIcon /> : <AngleRightIcon />}
        </Td>
        <Td style={{ fontFamily: 'monospace', fontSize: 12, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={group.image_name}>
          <Link
            to={`/images/${encodeURIComponent(group.image_id)}`}
            onClick={e => e.stopPropagation()}
            style={{ color: BRAND_BLUE }}
          >
            {group.image_name}
          </Link>
        </Td>
        <Td style={{ textAlign: 'right', fontWeight: 600 }}>{group.total_cves}</Td>
        <Td style={{ textAlign: 'right', color: SEVERITY_COLORS.critical }}>{group.critical_cves || '–'}</Td>
        <Td style={{ textAlign: 'right', color: SEVERITY_COLORS.important }}>{group.high_cves || '–'}</Td>
        <Td style={{ textAlign: 'right', color: SEVERITY_COLORS.moderate }}>{group.medium_cves || '–'}</Td>
        <Td style={{ textAlign: 'right', color: SEVERITY_COLORS.unknown }}>{group.low_cves || '–'}</Td>
        <Td style={{ fontWeight: group.max_cvss >= 9 ? 700 : 400, color: group.max_cvss >= 9 ? SEVERITY_COLORS.important : 'inherit' }}>
          {group.max_cvss.toFixed(1)}
        </Td>
        <Td><EpssBadge value={group.max_epss} /></Td>
        <Td style={{ textAlign: 'right' }}>
          {group.fixable_cves > 0 ? (
            <span style={{ color: FIXABLE_COLOR }}>{group.fixable_cves}</span>
          ) : '–'}
        </Td>
        <Td style={{ textAlign: 'right' }}>{group.affected_deployments}</Td>
        <Td style={{ fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={group.namespaces.join(', ')}>
          {group.namespaces.join(', ')}
        </Td>
      </Tr>
      {expanded && (
        <Tr>
          <Td colSpan={12} style={{ padding: 0 }}>
            <div style={{ padding: '8px 16px 12px 40px', background: 'var(--pf-t--global--background--color--secondary--default)' }}>
              {group.fixable_cves > 0 && (
                <div style={{
                  padding: '6px 12px', marginBottom: 8, fontSize: 12, fontWeight: 600,
                  background: `rgba(30, 143, 25, 0.1)`, color: FIXABLE_COLOR,
                  borderRadius: 4, display: 'inline-block',
                }}>
                  {t('cves.imageGroupFixHint', { count: group.fixable_cves })}
                </div>
              )}
              {isLoading ? (
                <Spinner size="md" aria-label={t('common.loading')} />
              ) : !cves?.length ? (
                <div style={{ color: SEVERITY_COLORS.unknown, fontSize: 13 }}>{t('cves.imageGroupNoCves')}</div>
              ) : (
                <Table variant="compact" isStickyHeader style={{ fontSize: 12 }}>
                  <Thead>
                    <Tr>
                      <Th>{t('cves.cveId')}</Th>
                      <Th>{t('cves.severity')}</Th>
                      <Th>{t('cves.cvss')}</Th>
                      <Th>{t('cves.epss')}</Th>
                      <Th>{t('cves.fixable')}</Th>
                      <Th>{t('cves.fixVersion')}</Th>
                      <Th>{t('cves.affectedDeployments')}</Th>
                      <Th>{t('cves.firstSeen')}</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {cves.map(cve => (
                      <Tr key={cve.cve_id}>
                        <Td>
                          <Link to={`/vulnerabilities/${cve.cve_id}`} style={{ fontFamily: 'monospace', color: BRAND_BLUE }}>
                            {cve.cve_id}
                          </Link>
                        </Td>
                        <Td><SeverityBadge severity={cve.severity} /></Td>
                        <Td style={{ fontWeight: cve.cvss >= 9 ? 700 : 400, color: cve.cvss >= 9 ? SEVERITY_COLORS.important : 'inherit' }}>
                          {cve.cvss.toFixed(1)}
                        </Td>
                        <Td><EpssBadge value={cve.epss_probability} /></Td>
                        <Td>
                          {cve.fixable ? <span style={{ color: FIXABLE_COLOR }}>✓</span> : <span style={{ color: SEVERITY_COLORS.unknown }}>✗</span>}
                        </Td>
                        <Td style={{ fontFamily: 'monospace', fontSize: 11 }}>{cve.fixed_by ?? '–'}</Td>
                        <Td style={{ textAlign: 'right' }}>{cve.affected_deployments}</Td>
                        <Td style={{ fontSize: 11, color: SEVERITY_COLORS.unknown }}>
                          {cve.first_seen ? new Date(cve.first_seen).toLocaleDateString(dateLocale) : '–'}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </div>
          </Td>
        </Tr>
      )}
    </>
  )
}
