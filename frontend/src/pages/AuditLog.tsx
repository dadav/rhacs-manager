import {
  Alert,
  EmptyState,
  EmptyStateBody,
  PageSection,
  Pagination,
  Skeleton,
  Title,
  Tooltip,
} from '@patternfly/react-core'
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table'
import { getErrorMessage } from '../utils/errors'
import { useState } from 'react'
import { useAuditLog } from '../api/audit'
import { useTranslation } from 'react-i18next'
import { BRAND_BLUE } from '../tokens'

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
            aria-label={t('common.less')}
            style={{ background: 'none', border: 'none', color: BRAND_BLUE, cursor: 'pointer', padding: 0, fontSize: 11 }}
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
            aria-label={t('common.more')}
            style={{ background: 'none', border: 'none', color: BRAND_BLUE, cursor: 'pointer', padding: 0, fontSize: 11 }}
          >
            {t('common.more')}
          </button>
        </>
      )}
    </span>
  )
}

function SkeletonRows({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <Tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <Tr key={i}>
          {Array.from({ length: columns }).map((_, j) => (
            <Td key={j}><Skeleton /></Td>
          ))}
        </Tr>
      ))}
    </Tbody>
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
    return translated === key ? action.replace(/_/g, ' ') : translated
  }

  return (
    <>
      <PageSection variant="default">
        <Title headingLevel="h1" size="xl">{t('auditLog.title')}</Title>
      </PageSection>

      <PageSection>
        {error ? (
          <Alert variant="danger" title={`${t('common.error')}: ${getErrorMessage(error)}`} />
        ) : !isLoading && !data?.items.length ? (
          <EmptyState>
            <EmptyStateBody>{t('auditLog.noEntries')}</EmptyStateBody>
          </EmptyState>
        ) : (
          <>
            <Table variant="compact" isStickyHeader>
              <Thead>
                <Tr>
                  <Th>{t('auditLog.date')}</Th>
                  <Th>{t('auditLog.user')}</Th>
                  <Th>{t('auditLog.action')}</Th>
                  <Th>{t('auditLog.entity')}</Th>
                  <Th>{t('auditLog.entityId')}</Th>
                  <Th>{t('auditLog.details')}</Th>
                </Tr>
              </Thead>
              {isLoading ? (
                <SkeletonRows columns={6} />
              ) : (
                <Tbody>
                  {data!.items.map(entry => (
                    <Tr key={entry.id}>
                      <Td style={{ fontSize: 11, color: 'var(--pf-t--global--text--color--subtle)', whiteSpace: 'nowrap' }}>
                        {new Date(entry.created_at).toLocaleString(localeString)}
                      </Td>
                      <Td style={{ fontSize: 12 }}>{entry.username ?? '–'}</Td>
                      <Td style={{ fontSize: 12 }}>
                        {actionLabel(entry.action)}
                      </Td>
                      <Td style={{ fontSize: 12 }}>{entry.entity_type}</Td>
                      <Td style={{ fontSize: 11, color: 'var(--pf-t--global--text--color--subtle)' }}>
                        {entry.entity_id ? (
                          <Tooltip content={entry.entity_id}>
                            <span style={{ fontFamily: 'monospace', cursor: 'default' }}>
                              {entry.entity_id.slice(0, 8)}…
                            </span>
                          </Tooltip>
                        ) : '–'}
                      </Td>
                      <Td style={{ maxWidth: 300 }}>
                        <DetailsCell details={entry.details} />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              )}
            </Table>
            {data && (
              <div style={{ marginTop: 16 }}>
                <Pagination
                  itemCount={data.total}
                  perPage={50}
                  page={page}
                  onSetPage={(_, p) => setPage(p)}
                  variant="bottom"
                />
              </div>
            )}
          </>
        )}
      </PageSection>
    </>
  )
}
