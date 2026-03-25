import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  Label,
  PageSection,
  Pagination,
  Skeleton,
  TextInput,
  Title,
} from '@patternfly/react-core'
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { useImageDetail } from '../api/images'
import { ImageCveTimeline } from '../components/charts/ImageCveTimeline'
import { EpssBadge } from '../components/common/EpssBadge'
import { SeverityBadge } from '../components/common/SeverityBadge'
import { getErrorMessage } from '../utils/errors'
import {
  SEVERITY_COLORS,
  BRAND_BLUE,
  FIXABLE_COLOR,
} from '../tokens'

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Tr>
      <Td style={{ fontWeight: 600, fontSize: 13, color: '#6a6e73', width: 200 }}>{label}</Td>
      <Td style={{ fontSize: 13 }}>{value}</Td>
    </Tr>
  )
}

const INSTRUCTION_COLORS: Record<string, string> = {
  FROM: '#89b4fa',
  RUN: '#a6e3a1',
  COPY: '#f9e2af',
  ADD: '#f9e2af',
  ENV: '#cba6f7',
  EXPOSE: '#fab387',
  WORKDIR: '#94e2d5',
  CMD: '#f38ba8',
  ENTRYPOINT: '#f38ba8',
  ARG: '#cba6f7',
  LABEL: '#89dceb',
  VOLUME: '#fab387',
  USER: '#94e2d5',
  STOPSIGNAL: '#fab387',
  SHELL: '#f38ba8',
  HEALTHCHECK: '#a6e3a1',
  ONBUILD: '#89dceb',
  MAINTAINER: '#89dceb',
}

export function ImageDetail() {
  const { imageId } = useParams<{ imageId: string }>()
  const decodedId = imageId ? decodeURIComponent(imageId) : ''
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language === 'de' ? 'de-DE' : 'en-US'
  const { data: image, isLoading, error } = useImageDetail(decodedId)

  const [cveSearch, setCveSearch] = useState('')
  const [cvePage, setCvePage] = useState(1)
  const cvePerPage = 20

  if (isLoading) {
    return (
      <PageSection>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Skeleton width="40%" height="24px" />
          <Skeleton width="70%" height="32px" />
          <Grid hasGutter>
            <GridItem span={6}><Skeleton height="200px" /></GridItem>
            <GridItem span={6}><Skeleton height="200px" /></GridItem>
            <GridItem span={12}><Skeleton height="240px" /></GridItem>
          </Grid>
        </div>
      </PageSection>
    )
  }

  if (error) {
    return (
      <PageSection>
        <Alert variant="danger" title={`${t('common.error')}: ${getErrorMessage(error)}`} />
      </PageSection>
    )
  }

  if (!image) return null

  const totalSeverity = image.critical_cves + image.high_cves + image.medium_cves + image.low_cves
  const severityBars = totalSeverity > 0 ? [
    { key: 'critical', count: image.critical_cves, color: SEVERITY_COLORS.critical, label: t('severity.4') },
    { key: 'important', count: image.high_cves, color: SEVERITY_COLORS.important, label: t('severity.3') },
    { key: 'moderate', count: image.medium_cves, color: SEVERITY_COLORS.moderate, label: t('severity.2') },
    { key: 'low', count: image.low_cves, color: SEVERITY_COLORS.low, label: t('severity.1') },
  ].filter(s => s.count > 0) : []

  // Filter and paginate CVEs
  const filteredCves = cveSearch
    ? image.cves.filter(c => c.cve_id.toLowerCase().includes(cveSearch.toLowerCase()))
    : image.cves
  const cvePageStart = (cvePage - 1) * cvePerPage
  const cvePageItems = filteredCves.slice(cvePageStart, cvePageStart + cvePerPage)

  // Parse image name parts for display
  const shortName = image.name_tag
    ? `${image.name_remote || ''}:${image.name_tag}`
    : image.name_fullname

  return (
    <>
      <PageSection variant="default">
        <Breadcrumb>
          <BreadcrumbItem onClick={() => navigate('/vulnerabilities')} style={{ cursor: 'pointer' }}>
            {t('nav.cves')}
          </BreadcrumbItem>
          <BreadcrumbItem onClick={() => navigate('/vulnerabilities?tab=by-image')} style={{ cursor: 'pointer' }}>
            {t('imageDetail.breadcrumbByImage')}
          </BreadcrumbItem>
          <BreadcrumbItem isActive>
            {shortName}
          </BreadcrumbItem>
        </Breadcrumb>
        <Title headingLevel="h1" size="xl" style={{ fontFamily: 'monospace', marginTop: 8, wordBreak: 'break-all' }}>
          {image.name_fullname}
        </Title>
      </PageSection>

      <PageSection variant="default" style={{ paddingTop: 0 }}>
        <Grid hasGutter>
          {/* Metadata card */}
          <GridItem span={6}>
            <Card>
              <CardTitle>{t('imageDetail.metadata')}</CardTitle>
              <CardBody style={{ padding: 0 }}>
                <Table variant="compact" borders={false}>
                  <Tbody>
                    {image.name_registry && (
                      <DetailRow label={t('imageDetail.registry')} value={image.name_registry} />
                    )}
                    {image.name_remote && (
                      <DetailRow
                        label={t('imageDetail.repository')}
                        value={<span style={{ fontFamily: 'monospace', fontSize: 12 }}>{image.name_remote}</span>}
                      />
                    )}
                    {image.name_tag && (
                      <DetailRow
                        label={t('imageDetail.tag')}
                        value={<Label color="blue" isCompact>{image.name_tag}</Label>}
                      />
                    )}
                    {image.os && (
                      <DetailRow label={t('imageDetail.os')} value={image.os} />
                    )}
                    {image.docker_user && (
                      <DetailRow
                        label={t('imageDetail.dockerUser')}
                        value={<span style={{ fontFamily: 'monospace' }}>{image.docker_user}</span>}
                      />
                    )}
                    <DetailRow
                      label={t('imageDetail.created')}
                      value={image.created ? new Date(image.created).toLocaleDateString(dateLocale) : '–'}
                    />
                    <DetailRow
                      label={t('imageDetail.lastScanned')}
                      value={image.last_scanned ? new Date(image.last_scanned).toLocaleString(dateLocale) : '–'}
                    />
                    <DetailRow
                      label={t('imageDetail.lastUpdated')}
                      value={image.last_updated ? new Date(image.last_updated).toLocaleString(dateLocale) : '–'}
                    />
                    <DetailRow
                      label={t('imageDetail.componentCount')}
                      value={image.component_count}
                    />
                  </Tbody>
                </Table>
              </CardBody>
            </Card>
          </GridItem>

          {/* Security summary card */}
          <GridItem span={6}>
            <Card>
              <CardTitle>{t('imageDetail.securitySummary')}</CardTitle>
              <CardBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Severity distribution bar */}
                  {severityBars.length > 0 && (
                    <div>
                      <div style={{
                        display: 'flex',
                        height: 24,
                        borderRadius: 4,
                        overflow: 'hidden',
                        border: '1px solid var(--pf-t--global--border--color--default)',
                      }}>
                        {severityBars.map(s => (
                          <div
                            key={s.key}
                            style={{
                              width: `${(s.count / totalSeverity) * 100}%`,
                              backgroundColor: s.color,
                              minWidth: 2,
                            }}
                            title={`${s.label}: ${s.count}`}
                          />
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                        {severityBars.map(s => (
                          <span key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: s.color, display: 'inline-block' }} />
                            <span style={{ color: '#6a6e73' }}>{s.label}:</span>
                            <span style={{ fontWeight: 600 }}>{s.count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stats grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ padding: '10px 12px', background: 'var(--pf-t--global--background--color--secondary--default)', borderRadius: 4 }}>
                      <div style={{ fontSize: 11, color: '#6a6e73', marginBottom: 2 }}>{t('imageDetail.totalCves')}</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{image.cve_count}</div>
                    </div>
                    <div style={{ padding: '10px 12px', background: 'var(--pf-t--global--background--color--secondary--default)', borderRadius: 4 }}>
                      <div style={{ fontSize: 11, color: '#6a6e73', marginBottom: 2 }}>{t('imageDetail.fixableCves')}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: FIXABLE_COLOR }}>{image.fixable_cves}</div>
                    </div>
                    <div style={{ padding: '10px 12px', background: 'var(--pf-t--global--background--color--secondary--default)', borderRadius: 4 }}>
                      <div style={{ fontSize: 11, color: '#6a6e73', marginBottom: 2 }}>{t('imageDetail.topCvss')}</div>
                      <div style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: image.top_cvss >= 9 ? SEVERITY_COLORS.critical : 'inherit',
                      }}>
                        {image.top_cvss.toFixed(1)}
                      </div>
                    </div>
                    <div style={{ padding: '10px 12px', background: 'var(--pf-t--global--background--color--secondary--default)', borderRadius: 4 }}>
                      <div style={{ fontSize: 11, color: '#6a6e73', marginBottom: 2 }}>{t('imageDetail.riskScore')}</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{image.risk_score.toFixed(1)}</div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </PageSection>

      {/* CVE Discovery Timeline */}
      <PageSection variant="default" style={{ paddingTop: 0 }}>
        <Card>
          <CardTitle>{t('imageDetail.cveTimeline')}</CardTitle>
          <CardBody>
            <ImageCveTimeline data={image.cve_timeline} />
          </CardBody>
        </Card>
      </PageSection>

      {/* Dockerfile Layers */}
      {image.layers.length > 0 && (
        <PageSection variant="default" style={{ paddingTop: 0 }}>
          <Card>
            <CardTitle>{t('imageDetail.layers')} — {t('imageDetail.layerCount', { count: image.layers.length })}</CardTitle>
            <CardBody style={{ padding: 0 }}>
              <div style={{
                background: '#1e1e2e',
                borderRadius: '0 0 8px 8px',
                padding: '12px 0',
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                fontSize: 12,
                lineHeight: 1.7,
                overflowX: 'auto',
              }}>
                {image.layers.map(layer => {
                  const instrUpper = (layer.instruction || '').toUpperCase()
                  const instrColor = INSTRUCTION_COLORS[instrUpper] || '#cdd6f4'
                  return (
                    <div
                      key={layer.idx}
                      style={{
                        display: 'flex',
                        padding: '1px 16px 1px 0',
                        borderLeft: `3px solid transparent`,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.borderLeftColor = instrColor }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.borderLeftColor = 'transparent' }}
                    >
                      <span style={{
                        width: 44,
                        textAlign: 'right',
                        color: '#585b70',
                        userSelect: 'none',
                        flexShrink: 0,
                        paddingRight: 12,
                      }}>
                        {layer.idx}
                      </span>
                      <span>
                        <span style={{ color: instrColor, fontWeight: 700 }}>{instrUpper}</span>
                        {layer.value && (
                          <span style={{ color: '#cdd6f4', marginLeft: 8 }}>{layer.value}</span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardBody>
          </Card>
        </PageSection>
      )}

      {/* CVE Table */}
      <PageSection variant="default" style={{ paddingTop: 0 }} isFilled>
        <Card>
          <CardTitle>{t('imageDetail.cveTable', { count: image.cves.length })}</CardTitle>
          <CardBody>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <TextInput
                type="search"
                value={cveSearch}
                onChange={(_, v) => { setCveSearch(v); setCvePage(1) }}
                placeholder={t('imageDetail.searchCves')}
                style={{ flex: 1 }}
                aria-label={t('imageDetail.searchCves')}
              />
              {cveSearch && (
                <span style={{ fontSize: 12, color: 'var(--pf-t--global--text--color--subtle)' }}>
                  {filteredCves.length} / {image.cves.length}
                </span>
              )}
            </div>
          </CardBody>
          <CardBody style={{ padding: 0 }}>
            <Table variant="compact" isStickyHeader style={{ tableLayout: 'fixed' }}>
              <Thead>
                <Tr>
                  <Th width={15}>{t('cves.cveId')}</Th>
                  <Th width={10}>{t('cves.severity')}</Th>
                  <Th width={10}>{t('cves.cvss')}</Th>
                  <Th width={10}>{t('cves.epss')}</Th>
                  <Th width={10}>{t('cves.fixable')}</Th>
                  <Th width={15}>{t('cves.fixVersion')}</Th>
                  <Th width={15}>{t('cves.firstSeen')}</Th>
                  <Th width={15}>{t('cves.publishedOn')}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {cvePageItems.length > 0 ? cvePageItems.map(cve => (
                  <Tr key={cve.cve_id}>
                    <Td>
                      <Link to={`/vulnerabilities/${cve.cve_id}`} style={{ fontFamily: 'monospace', color: BRAND_BLUE, fontSize: 12 }}>
                        {cve.cve_id}
                      </Link>
                    </Td>
                    <Td><SeverityBadge severity={cve.severity} /></Td>
                    <Td style={{
                      fontWeight: cve.cvss >= 9 ? 700 : 400,
                      color: cve.cvss >= 9 ? SEVERITY_COLORS.critical : 'inherit',
                    }}>
                      {cve.cvss.toFixed(1)}
                    </Td>
                    <Td><EpssBadge value={cve.epss_probability} /></Td>
                    <Td>
                      {cve.fixable
                        ? <span style={{ color: FIXABLE_COLOR }}>✓</span>
                        : <span style={{ color: '#8a8d90' }}>✗</span>}
                    </Td>
                    <Td style={{ fontFamily: 'monospace', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cve.fixed_by ?? '–'}
                    </Td>
                    <Td style={{ fontSize: 11 }}>
                      {cve.first_seen ? new Date(cve.first_seen).toLocaleDateString(dateLocale) : '–'}
                    </Td>
                    <Td style={{ fontSize: 11 }}>
                      {cve.published_on ? new Date(cve.published_on).toLocaleDateString(dateLocale) : '–'}
                    </Td>
                  </Tr>
                )) : (
                  <Tr>
                    <Td colSpan={8} style={{ textAlign: 'center', color: 'var(--pf-t--global--text--color--subtle)', fontSize: 13 }}>
                      {cveSearch ? t('cveDetail.noDeployments') : '–'}
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </CardBody>
          {filteredCves.length > cvePerPage && (
            <CardBody style={{ paddingTop: 0 }}>
              <Pagination
                itemCount={filteredCves.length}
                perPage={cvePerPage}
                page={cvePage}
                onSetPage={(_, p) => setCvePage(p)}
                isCompact
              />
            </CardBody>
          )}
        </Card>
      </PageSection>
    </>
  )
}
