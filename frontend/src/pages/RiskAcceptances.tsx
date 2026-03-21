import {
  Alert,
  Button,
  EmptyState,
  EmptyStateBody,
  PageSection,
  Popover,
  Skeleton,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core'
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons'
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table'
import { getErrorMessage } from '../utils/errors'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useRiskAcceptances } from '../api/riskAcceptances'
import { useScope } from '../hooks/useScope'
import { useTranslation } from 'react-i18next'
import { STATUS_COLORS, BRAND_BLUE, filterButton, statusBadge, subtleTextSm, monoText } from '../tokens'

const STATUS_KEYS = ['', 'requested', 'approved', 'rejected', 'expired'] as const

const STATUS_FILTERS = new Set(STATUS_KEYS)

function normalizeStatusFilter(raw: string | null): string {
  if (!raw) return ''
  return STATUS_FILTERS.has(raw as typeof STATUS_KEYS[number]) ? raw : ''
}

export function RiskAcceptances() {
  const { t, i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [statusFilter, setStatusFilter] = useState(() =>
    normalizeStatusFilter(searchParams.get('status')),
  )

  const statusLabels: Record<string, string> = {
    '': t('common.all'),
    requested: t('status.requested'),
    approved: t('status.approved'),
    rejected: t('status.rejected'),
    expired: t('status.expired'),
  }

  useEffect(() => {
    const urlStatus = normalizeStatusFilter(searchParams.get('status'))
    setStatusFilter((current) => (current === urlStatus ? current : urlStatus))
  }, [searchParams])

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) {
        next.set('status', value)
      } else {
        next.delete('status')
      }
      return next
    })
  }

  const { scopeParams } = useScope()
  const { data, isLoading, error } = useRiskAcceptances(statusFilter || undefined, scopeParams)

  const localeDateLocale = i18n.language === 'de' ? 'de-DE' : 'en-US'

  return (
    <>
      <PageSection variant="default">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Title headingLevel="h1" size="xl">{t('riskAcceptance.title')}</Title>
          <Popover
            headerContent={t('riskAcceptance.whatAre')}
            bodyContent={
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 8px' }}>
                  {t('riskAcceptance.helpBody1')}
                </p>
                <p style={{ margin: '0 0 8px' }}>
                  <strong>{t('riskAcceptance.helpBody2Requested')}</strong> — {t('riskAcceptance.helpBody2RequestedDesc')}<br />
                  <strong>{t('riskAcceptance.helpBody2Approved')}</strong> — {t('riskAcceptance.helpBody2ApprovedDesc')}<br />
                  <strong>{t('riskAcceptance.helpBody2Rejected')}</strong> — {t('riskAcceptance.helpBody2RejectedDesc')}<br />
                  <strong>{t('riskAcceptance.helpBody2Expired')}</strong> — {t('riskAcceptance.helpBody2ExpiredDesc')}
                </p>
                <p style={{ margin: 0 }}>
                  {t('riskAcceptance.helpBody3')}
                </p>
              </div>
            }
            position="right"
          >
            <Button variant="plain" aria-label={t('riskAcceptance.helpLabel')} style={{ padding: '4px 6px' }}>
              <OutlinedQuestionCircleIcon style={{ color: 'var(--pf-t--global--text--color--subtle)' }} />
            </Button>
          </Popover>
        </div>
      </PageSection>

      <PageSection variant="default">
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <div style={{ display: 'flex', gap: 4 }}>
                {STATUS_KEYS.map((value) => (
                  <button
                    key={value}
                    onClick={() => handleStatusFilterChange(value)}
                    aria-label={`${t('riskAcceptance.filterByStatus')}: ${statusLabels[value]}`}
                    style={filterButton(statusFilter === value)}
                  >
                    {statusLabels[value]}
                  </button>
                ))}
              </div>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </PageSection>

      <PageSection>
        {isLoading ? (
          <Table variant="compact" isStickyHeader>
            <Thead>
              <Tr>
                <Th>{t('riskAcceptance.cveId')}</Th>
                <Th>{t('riskAcceptance.status')}</Th>
                <Th>{t('riskAcceptance.justification')}</Th>
                <Th>{t('riskAcceptance.requestedBy')}</Th>
                <Th>{t('riskAcceptance.requestedAt')}</Th>
                <Th>{t('riskAcceptance.expiresOn')}</Th>
                <Th>{t('riskAcceptance.comments')}</Th>
                <Th></Th>
              </Tr>
            </Thead>
            <Tbody>
              {[1, 2, 3, 4, 5].map(i => (
                <Tr key={i}>
                  <Td><Skeleton width="120px" /></Td>
                  <Td><Skeleton width="80px" /></Td>
                  <Td><Skeleton width="200px" /></Td>
                  <Td><Skeleton width="100px" /></Td>
                  <Td><Skeleton width="80px" /></Td>
                  <Td><Skeleton width="80px" /></Td>
                  <Td><Skeleton width="30px" /></Td>
                  <Td><Skeleton width="60px" /></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : error ? (
          <Alert variant="danger" title={`${t('common.error')}: ${getErrorMessage(error)}`} />
        ) : !data?.length ? (
          <EmptyState>
            <EmptyStateBody>{t('riskAcceptance.noAcceptancesFound')}</EmptyStateBody>
            <EmptyStateBody>
              <span style={{ color: 'var(--pf-t--global--text--color--subtle)', fontSize: 13 }}>
                {t('riskAcceptance.noAcceptancesHint')}
              </span>
            </EmptyStateBody>
          </EmptyState>
        ) : (
          <Table variant="compact" isStickyHeader>
            <Thead>
              <Tr>
                <Th>{t('riskAcceptance.cveId')}</Th>
                <Th>{t('riskAcceptance.status')}</Th>
                <Th>{t('riskAcceptance.justification')}</Th>
                <Th>{t('riskAcceptance.requestedBy')}</Th>
                <Th>{t('riskAcceptance.requestedAt')}</Th>
                <Th>{t('riskAcceptance.expiresOn')}</Th>
                <Th>{t('riskAcceptance.comments')}</Th>
                <Th></Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.map(ra => (
                <Tr key={ra.id}>
                  <Td>
                    <Link to={`/vulnerabilities/${ra.cve_id}`} style={{ ...monoText, color: BRAND_BLUE, fontSize: 12 }}>
                      {ra.cve_id}
                    </Link>
                  </Td>
                  <Td>
                    <span style={statusBadge(STATUS_COLORS[ra.status as keyof typeof STATUS_COLORS] ?? '#8a8d90')}>
                      {statusLabels[ra.status] ?? ra.status}
                    </span>
                  </Td>
                  <Td style={{ maxWidth: 300 }}>
                    <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {ra.justification}
                    </span>
                  </Td>
                  <Td style={{ fontSize: 12 }}>{ra.created_by_name}</Td>
                  <Td style={subtleTextSm}>
                    {new Date(ra.created_at).toLocaleDateString(localeDateLocale)}
                  </Td>
                  <Td style={subtleTextSm}>
                    {ra.expires_at ? new Date(ra.expires_at).toLocaleDateString(localeDateLocale) : '–'}
                  </Td>
                  <Td style={{ textAlign: 'right' }}>
                    {ra.comment_count > 0 && (
                      <span style={{ background: 'var(--pf-t--global--background--color--secondary--default)', color: 'var(--pf-t--global--color--blue--default)', padding: '2px 6px', borderRadius: 10, fontSize: 11 }}>
                        {ra.comment_count}
                      </span>
                    )}
                  </Td>
                  <Td>
                    <Link to={`/risk-acceptances/${ra.id}`}>
                      <Button variant="secondary" size="sm">{t('common.details')}</Button>
                    </Link>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </PageSection>
    </>
  )
}
