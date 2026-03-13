import {
  Alert,
  PageSection,
  Pagination,
  Spinner,
  Title,
  Tooltip,
} from '@patternfly/react-core'
import { getErrorMessage } from '../utils/errors'
import { useState } from 'react'
import { useAuditLog } from '../api/audit'
import { useTranslation } from 'react-i18next'

const ACTION_KEYS = [
  'risk_acceptance_created',
  'risk_acceptance_reviewed',
  'risk_acceptance_expired',
  'risk_acceptance_deleted',
  'priority_set',
  'priority_updated',
  'priority_deleted',
  'settings_updated',
  'comment_added',
  'user_created',
  'user_updated',
] as const

function DetailsCell({ details }: { details: Record<string, unknown> }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const isEmpty = Object.keys(details).length === 0
  if (isEmpty) return <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>–</span>

  const formatted = JSON.stringify(details, null, 2)
  const summary = Object.entries(details)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join(', ')
    .slice(0, 60)

  return (
    <span style={{ fontSize: 11, color: 'var(--pf-t--global--text--color--subtle)' }}>
      {expanded ? (
        <>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: 11 }}>
            {formatted}
          </pre>
          <button
            onClick={() => setExpanded(false)}
            style={{ background: 'none', border: 'none', color: 'var(--pf-t--global--color--blue--default)', cursor: 'pointer', padding: 0, fontSize: 11 }}
          >
            {t('common.less')}
          </button>
        </>
      ) : (
        <>
          <span style={{ fontFamily: 'monospace' }}>{summary}{summary.length < Object.entries(details).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ').length ? '…' : ''}</span>
          {' '}
          <button
            onClick={() => setExpanded(true)}
            style={{ background: 'none', border: 'none', color: 'var(--pf-t--global--color--blue--default)', cursor: 'pointer', padding: 0, fontSize: 11 }}
          >
            {t('common.more')}
          </button>
        </>
      )}
    </span>
  )
}

export function AuditLog() {
  const { t, i18n } = useTranslation()
  const [page, setPage] = useState(1)
  const { data, isLoading, error } = useAuditLog(page)

  const localeString = i18n.language === 'de' ? 'de-DE' : 'en-US'

  function actionLabel(action: string): string {
    const key = `auditLog.actions.${action}`
    const translated = t(key)
    // If t() returns the key itself, fall back to replacing underscores
    return translated === key ? action.replace(/_/g, ' ') : translated
  }

  return (
    <>
      <PageSection variant="default">
        <Title headingLevel="h1" size="xl">{t('auditLog.title')}</Title>
      </PageSection>

      <PageSection>
        {isLoading ? <Spinner aria-label={t('common.loading')} /> : error ? (
          <Alert variant="danger" title={`${t('common.error')}: ${getErrorMessage(error)}`} />
        ) : !data?.items.length ? (
          <Alert variant="info" isInline title={t('auditLog.noEntries')} />
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--pf-t--global--background--color--secondary--default)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t('auditLog.date')}</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t('auditLog.user')}</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t('auditLog.action')}</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t('auditLog.entity')}</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t('auditLog.entityId')}</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t('auditLog.details')}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(entry => (
                  <tr key={entry.id} style={{ borderBottom: '1px solid var(--pf-t--global--border--color--default)' }}>
                    <td style={{ padding: '8px 12px', fontSize: 11, color: 'var(--pf-t--global--text--color--subtle)', whiteSpace: 'nowrap' }}>
                      {new Date(entry.created_at).toLocaleString(localeString)}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12 }}>{entry.username ?? '–'}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12 }}>
                      {actionLabel(entry.action)}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12 }}>{entry.entity_type}</td>
                    <td style={{ padding: '8px 12px', fontSize: 11, color: 'var(--pf-t--global--text--color--subtle)' }}>
                      {entry.entity_id ? (
                        <Tooltip content={entry.entity_id}>
                          <span style={{ fontFamily: 'monospace', cursor: 'default' }}>
                            {entry.entity_id.slice(0, 8)}…
                          </span>
                        </Tooltip>
                      ) : '–'}
                    </td>
                    <td style={{ padding: '8px 12px', maxWidth: 300 }}>
                      <DetailsCell details={entry.details} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
