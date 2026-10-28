import {
  Alert,
  Button,
  EmptyState,
  EmptyStateBody,
  Label,
  PageSection,
  Pagination,
  Spinner,
  Switch,
  Title,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core'
import { ExpandableRowContent, Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table'
import { AngleDownIcon, AngleRightIcon } from '@patternfly/react-icons'
import { Fragment, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useMyComments } from '../api/comments'
import { useCveComments } from '../api/cves'
import { useRiskComments } from '../api/riskAcceptances'
import { renderContent } from '../components/MentionTextArea'
import { TableSkeletonRows } from '../components/TableSkeleton'
import { useAuth } from '../hooks/useAuth'
import { useScopedLink } from '../hooks/useScope'
import { BRAND_BLUE } from '../tokens'
import type { CommentContentSegment, MyCommentKind, MyCommentThread } from '../types'
import { getErrorMessage } from '../utils/errors'
import { formatDateTime } from '../utils/format'

const PER_PAGE = 25
const SUBTLE = 'var(--pf-t--global--text--color--subtle)'
const COLUMN_COUNT = 7

const KIND_LABEL_COLOR: Record<MyCommentKind, 'blue' | 'purple' | 'orange'> = {
  cve: 'blue',
  risk_acceptance: 'purple',
  escalation: 'orange',
}

interface ThreadComment {
  id: string
  user_id: string
  display_name: string
  message: string
  content?: CommentContentSegment[] | null
  created_at: string
}

function ThreadComments({
  comments,
  isLoading,
  error,
  thread,
  currentUserId,
}: {
  comments: ThreadComment[] | undefined
  isLoading: boolean
  error: unknown
  thread: MyCommentThread
  currentUserId: string | undefined
}) {
  const { t, i18n } = useTranslation()
  if (error) return <Alert variant="danger" isInline isPlain title={`${t('common.error')}: ${getErrorMessage(error)}`} />
  if (isLoading) return <Spinner size="md" aria-label={t('myComments.threadLoading')} />
  if (!comments?.length) return <div style={{ fontSize: 13, color: SUBTLE }}>{t('myComments.threadEmpty')}</div>

  const myLastAt = new Date(thread.my_last_comment_at).getTime()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="my-comments-thread">
      {comments.map(c => {
        const isOwn = c.user_id === currentUserId
        const isNew = !isOwn && new Date(c.created_at).getTime() > myLastAt
        return (
          <div
            key={c.id}
            style={{
              borderLeft: `3px solid ${isNew ? BRAND_BLUE : isOwn ? 'var(--pf-t--global--border--color--default)' : 'transparent'}`,
              paddingLeft: 10,
            }}
          >
            <div style={{ fontSize: 12, color: SUBTLE, marginBottom: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
              <strong style={{ color: 'var(--pf-t--global--text--color--regular)' }}>{c.display_name}</strong>
              <span>{formatDateTime(c.created_at, i18n.language)}</span>
              {isNew && <Label color="blue" isCompact>{t('myComments.newReplies', { count: 1 })}</Label>}
            </div>
            <p style={{ fontSize: 13, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
              {renderContent(c.content, c.message)}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function CveThread({ thread, currentUserId }: { thread: MyCommentThread; currentUserId: string | undefined }) {
  const { data, isLoading, error } = useCveComments(thread.cve_id)
  return (
    <ThreadComments comments={data} isLoading={isLoading} error={error} thread={thread} currentUserId={currentUserId} />
  )
}

function RiskThread({ thread, currentUserId }: { thread: MyCommentThread; currentUserId: string | undefined }) {
  const { data, isLoading, error } = useRiskComments(thread.risk_acceptance_id ?? '')
  return (
    <ThreadComments comments={data} isLoading={isLoading} error={error} thread={thread} currentUserId={currentUserId} />
  )
}

function contextLabel(thread: MyCommentThread, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (thread.kind === 'risk_acceptance') return t('myComments.riskAcceptanceLabel', { cve: thread.cve_id })
  if (thread.kind === 'escalation' && thread.escalation_context) {
    return t('myComments.escalationLabel', {
      cve: thread.cve_id,
      cluster: thread.escalation_context.cluster_name,
      namespace: thread.escalation_context.namespace,
      level: thread.escalation_context.level,
    })
  }
  return thread.cve_id
}

export function MyComments() {
  const { t, i18n } = useTranslation()
  const { user, isSecTeam } = useAuth()
  const scopedLink = useScopedLink()
  const [kind, setKind] = useState<MyCommentKind | undefined>(undefined)
  const [onlyWithReplies, setOnlyWithReplies] = useState(false)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading, error } = useMyComments({
    kind,
    only_with_replies: onlyWithReplies,
    page,
    page_size: PER_PAGE,
  })

  const kindOptions: (MyCommentKind | undefined)[] = isSecTeam
    ? [undefined, 'cve', 'risk_acceptance', 'escalation']
    : [undefined, 'cve', 'risk_acceptance']
  const isFiltered = kind !== undefined || onlyWithReplies

  function changeKind(next: MyCommentKind | undefined) {
    setKind(next)
    setPage(1)
    setExpandedId(null)
  }

  function detailHref(thread: MyCommentThread): string | null {
    if (!thread.detail_link) return null
    // Scope params go on the path; the comment anchor must stay last.
    return `${scopedLink(thread.detail_link)}#comment-${thread.my_last_comment_id}`
  }

  return (
    <>
      <PageSection variant="default">
        <Title headingLevel="h1" size="xl">{t('myComments.title')}</Title>
        <p style={{ marginTop: 4, fontSize: 13, color: SUBTLE }}>{t('myComments.description')}</p>
      </PageSection>

      <PageSection variant="default" style={{ paddingBottom: 0 }}>
        <Toolbar style={{ paddingBottom: 0 }}>
          <ToolbarContent>
            <ToolbarItem>
              <ToggleGroup aria-label={t('myComments.colKind')}>
                {kindOptions.map(option => (
                  <ToggleGroupItem
                    key={option ?? 'all'}
                    text={option ? t(`myComments.kind.${option}`) : t('myComments.kindAll')}
                    isSelected={kind === option}
                    onChange={() => changeKind(option)}
                  />
                ))}
              </ToggleGroup>
            </ToolbarItem>
            <ToolbarItem alignItems="center">
              <Switch
                id="my-comments-only-replies"
                label={t('myComments.onlyWithReplies')}
                isChecked={onlyWithReplies}
                onChange={(_, checked) => {
                  setOnlyWithReplies(checked)
                  setPage(1)
                  setExpandedId(null)
                }}
              />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </PageSection>

      <PageSection variant="default" isFilled>
        {error ? (
          <Alert variant="danger" title={`${t('common.error')}: ${getErrorMessage(error)}`} />
        ) : !isLoading && !data?.items.length ? (
          <EmptyState>
            <EmptyStateBody>{isFiltered ? t('myComments.emptyFiltered') : t('myComments.empty')}</EmptyStateBody>
          </EmptyState>
        ) : (
          <>
            <Table variant="compact" aria-label={t('myComments.title')}>
              <Thead>
                <Tr>
                  <Th screenReaderText={t('myComments.showThread')} />
                  <Th>{t('myComments.colKind')}</Th>
                  <Th>{t('myComments.colContext')}</Th>
                  <Th>{t('myComments.colMyComment')}</Th>
                  <Th>{t('myComments.colCount')}</Th>
                  <Th>{t('myComments.colReplies')}</Th>
                  <Th screenReaderText={t('myComments.open')} />
                </Tr>
              </Thead>
              {isLoading ? (
                <Tbody><TableSkeletonRows columns={COLUMN_COUNT} /></Tbody>
              ) : (
                <Tbody>
                  {data!.items.map(thread => {
                    const rowId = `${thread.kind}:${thread.risk_acceptance_id ?? thread.cve_id}`
                    const isExpanded = expandedId === rowId
                    const href = detailHref(thread)
                    return (
                      <Fragment key={rowId}>
                        <Tr data-testid="my-comments-row">
                          <Td style={{ width: 32 }}>
                            {thread.thread_available && (
                              <Button
                                variant="plain"
                                aria-label={t('myComments.showThread')}
                                aria-expanded={isExpanded}
                                onClick={() => setExpandedId(isExpanded ? null : rowId)}
                                style={{ padding: 4 }}
                              >
                                {isExpanded ? <AngleDownIcon /> : <AngleRightIcon />}
                              </Button>
                            )}
                          </Td>
                          <Td>
                            <Label color={KIND_LABEL_COLOR[thread.kind]} isCompact>
                              {t(`myComments.kind.${thread.kind}`)}
                            </Label>
                          </Td>
                          <Td style={{ fontFamily: thread.kind === 'cve' ? 'monospace' : undefined, fontSize: 12 }}>
                            {contextLabel(thread, t)}
                          </Td>
                          <Td style={{ maxWidth: 420 }}>
                            <div
                              style={{
                                fontSize: 13,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {renderContent(thread.my_last_content, thread.my_last_message)}
                            </div>
                            <div style={{ fontSize: 11, color: SUBTLE }}>
                              {formatDateTime(thread.my_last_comment_at, i18n.language)}
                            </div>
                          </Td>
                          <Td style={{ fontSize: 12 }}>{thread.my_comment_count}</Td>
                          <Td style={{ fontSize: 12 }}>
                            {thread.replies_since > 0 ? (
                              <>
                                <Label color="blue" isCompact>
                                  {t('myComments.newReplies', { count: thread.replies_since })}
                                </Label>
                                {thread.last_reply_at && (
                                  <div style={{ fontSize: 11, color: SUBTLE, marginTop: 2 }}>
                                    {t('myComments.lastReply', {
                                      name: thread.last_reply_by_name ?? '',
                                      date: formatDateTime(thread.last_reply_at, i18n.language),
                                    })}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span style={{ color: SUBTLE }}>
                                {thread.thread_available ? t('myComments.noNewReplies') : '–'}
                              </span>
                            )}
                          </Td>
                          <Td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                            {href ? (
                              <Link to={href} style={{ color: BRAND_BLUE }}>{t('myComments.open')}</Link>
                            ) : thread.thread_available ? (
                              <Tooltip content={t('myComments.detailUnavailableHint')}>
                                <span style={{ color: SUBTLE }}>{t('myComments.detailUnavailable')}</span>
                              </Tooltip>
                            ) : (
                              <Tooltip content={t('myComments.threadUnavailableHint')}>
                                <span style={{ color: SUBTLE }}>{t('myComments.threadUnavailable')}</span>
                              </Tooltip>
                            )}
                          </Td>
                        </Tr>
                        {isExpanded && (
                          <Tr isExpanded>
                            <Td colSpan={COLUMN_COUNT}>
                              <ExpandableRowContent>
                                <div style={{ padding: '8px 4px 4px 36px' }}>
                                  {thread.kind === 'risk_acceptance' ? (
                                    <RiskThread thread={thread} currentUserId={user?.id} />
                                  ) : (
                                    <CveThread thread={thread} currentUserId={user?.id} />
                                  )}
                                </div>
                              </ExpandableRowContent>
                            </Td>
                          </Tr>
                        )}
                      </Fragment>
                    )
                  })}
                </Tbody>
              )}
            </Table>
            {data && (
              <div style={{ marginTop: 16 }}>
                <Pagination
                  itemCount={data.total}
                  perPage={PER_PAGE}
                  page={page}
                  onSetPage={(_, p) => {
                    setPage(p)
                    setExpandedId(null)
                  }}
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
