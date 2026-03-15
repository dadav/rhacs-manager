import {
  Alert,
  Button,
  PageSection,
  Spinner,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core'
import { getErrorMessage } from '../utils/errors'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useRiskAcceptances } from '../api/riskAcceptances'
import { useScope } from '../hooks/useScope'
import { useTranslation } from 'react-i18next'

const STATUS_KEYS = ['', 'requested', 'approved', 'rejected', 'expired'] as const

const STATUS_COLORS: Record<string, string> = {
  requested: '#0066cc',
  approved: '#1e8f19',
  rejected: '#c9190b',
  expired: '#8a8d90',
}

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
        <Title headingLevel="h1" size="xl">{t('riskAcceptance.title')}</Title>
      </PageSection>

      <PageSection variant="default" padding={{ default: 'noPadding' }}>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <div style={{ display: 'flex', gap: 4 }}>
                {STATUS_KEYS.map((value) => (
                  <button
                    key={value}
                    onClick={() => handleStatusFilterChange(value)}
                    style={{
                      padding: '4px 12px',
                      border: '1px solid #d2d2d2',
                      borderRadius: 3,
                      cursor: 'pointer',
                      background: statusFilter === value ? '#0066cc' : 'var(--pf-v6-global--BackgroundColor--100)',
                      color: statusFilter === value ? '#fff' : 'var(--pf-v6-global--Color--100)',
                      fontSize: 13,
                    }}
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
        {isLoading ? <Spinner aria-label={t('common.loading')} /> : error ? (
          <Alert variant="danger" title={`${t('common.error')}: ${getErrorMessage(error)}`} />
        ) : !data?.length ? (
          <Alert variant="info" isInline title={t('riskAcceptance.noAcceptancesFound')} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--pf-t--global--background--color--secondary--default)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t('riskAcceptance.cveId')}</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t('riskAcceptance.status')}</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t('riskAcceptance.justification')}</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t('riskAcceptance.requestedBy')}</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t('riskAcceptance.requestedAt')}</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t('riskAcceptance.expiresOn')}</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>{t('riskAcceptance.comments')}</th>
                <th style={{ padding: '8px 12px' }}></th>
              </tr>
            </thead>
            <tbody>
              {data.map(ra => (
                <tr key={ra.id} style={{ borderBottom: '1px solid var(--pf-t--global--border--color--default)' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <Link to={`/vulnerabilities/${ra.cve_id}`} style={{ fontFamily: 'monospace', color: '#0066cc', fontSize: 12 }}>
                      {ra.cve_id}
                    </Link>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 3,
                      background: STATUS_COLORS[ra.status] ?? '#8a8d90',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 600,
                    }}>
                      {statusLabels[ra.status] ?? ra.status}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', maxWidth: 300 }}>
                    <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {ra.justification}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12 }}>{ra.created_by_name}</td>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--pf-t--global--text--color--subtle)' }}>
                    {new Date(ra.created_at).toLocaleDateString(localeDateLocale)}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--pf-t--global--text--color--subtle)' }}>
                    {ra.expires_at ? new Date(ra.expires_at).toLocaleDateString(localeDateLocale) : '–'}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    {ra.comment_count > 0 && (
                      <span style={{ background: 'var(--pf-t--global--background--color--secondary--default)', color: 'var(--pf-t--global--color--blue--default)', padding: '2px 6px', borderRadius: 10, fontSize: 11 }}>
                        {ra.comment_count}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <Link to={`/risk-acceptances/${ra.id}`}>
                      <Button variant="secondary" size="sm">{t('common.details')}</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PageSection>
    </>
  )
}
