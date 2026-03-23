import {
  Alert,
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageSection,
  Popover,
  Skeleton,
  TextArea,
  TextInput,
  Title,
} from '@patternfly/react-core'
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons'
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table'
import { getErrorMessage } from '../utils/errors'
import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import {
  useSuppressionRules,
  useCreateSuppressionRule,
  useReviewSuppressionRule,
  useDeleteSuppressionRule,
} from '../api/suppressionRules'
import type { SuppressionRule, SuppressionType } from '../types'
import { SuppressionStatus } from '../types'
import { STATUS_COLORS, BRAND_BLUE, filterButton, statusBadge, formLabel } from '../tokens'

const STATUS_KEYS = ['', 'requested', 'approved', 'rejected'] as const

function normalizeStatusFilter(raw: string | null): string {
  if (!raw) return ''
  return (STATUS_KEYS as readonly string[]).includes(raw) ? raw : ''
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

function DeleteRuleButton({ ruleId }: { ruleId: string }) {
  const { t } = useTranslation()
  const deleteMutation = useDeleteSuppressionRule(ruleId)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (confirming) {
    return (
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <Button
          variant="danger"
          size="sm"
          isLoading={deleteMutation.isPending}
          onClick={async () => {
            try {
              await deleteMutation.mutateAsync()
              setConfirming(false)
            } catch (err) {
              setError(getErrorMessage(err))
            }
          }}
        >
          {t('common.confirm')}
        </Button>
        <Button variant="link" size="sm" onClick={() => { setConfirming(false); setError(null) }}>
          {t('common.cancel')}
        </Button>
        {error && <Alert variant="danger" isInline isPlain title={error} />}
      </div>
    )
  }

  return (
    <Button variant="secondary" size="sm" isDanger onClick={() => setConfirming(true)}>
      {t('common.delete')}
    </Button>
  )
}

export function SuppressionRules() {
  const { t, i18n } = useTranslation()
  const { isSecTeam } = useAuth()
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [detailRule, setDetailRule] = useState<SuppressionRule | null>(null)
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [reviewApprove, setReviewApprove] = useState(true)
  const [reviewComment, setReviewComment] = useState('')

  const statusLabels: Record<string, string> = {
    '': t('common.all'),
    requested: t('status.requested'),
    approved: t('status.approved'),
    rejected: t('status.rejected'),
  }

  const { data, isLoading, error } = useSuppressionRules(statusFilter || undefined)
  const localeDateLocale = i18n.language === 'de' ? 'de-DE' : 'en-US'

  const [createType, setCreateType] = useState<SuppressionType>('component')
  const [createComponentName, setCreateComponentName] = useState('')
  const [createVersionPattern, setCreateVersionPattern] = useState('')
  const [createCveId, setCreateCveId] = useState('')
  const [createReason, setCreateReason] = useState('')
  const [createRefUrl, setCreateRefUrl] = useState('')
  const [createError, setCreateError] = useState('')
  const [createScopeMode, setCreateScopeMode] = useState<'all' | 'namespace'>('all')

  const createMutation = useCreateSuppressionRule()
  const reviewMutation = useReviewSuppressionRule(reviewId || '')

  function resetCreateForm() {
    setCreateType('component')
    setCreateComponentName('')
    setCreateVersionPattern('')
    setCreateCveId('')
    setCreateReason('')
    setCreateRefUrl('')
    setCreateError('')
    setCreateScopeMode('all')
  }

  async function handleCreate() {
    setCreateError('')
    try {
      await createMutation.mutateAsync({
        type: createType,
        component_name: createType === 'component' ? createComponentName : null,
        version_pattern: createType === 'component' && createVersionPattern ? createVersionPattern : null,
        cve_id: createType === 'cve' ? createCveId : null,
        reason: createReason,
        reference_url: createRefUrl || null,
        scope: createType === 'cve' ? { mode: createScopeMode, targets: [] } : undefined,
      })
      setShowCreate(false)
      resetCreateForm()
    } catch (e) {
      setCreateError(getErrorMessage(e))
    }
  }

  async function handleReview() {
    if (!reviewId) return
    try {
      await reviewMutation.mutateAsync({ approved: reviewApprove, comment: reviewComment || undefined })
      setReviewId(null)
      setReviewComment('')
    } catch {
      // error handled by query
    }
  }

  return (
    <>
      <PageSection variant="default">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Title headingLevel="h1" size="xl">{t('suppressionRules.title')}</Title>
          <Popover
            headerContent={t('suppressionRules.whatAre')}
            bodyContent={
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 8px' }}>
                  {t('suppressionRules.helpBody1')}
                </p>
                <p style={{ margin: '0 0 8px' }}>
                  <strong>{t('suppressionRules.helpBody2Component')}</strong> — {t('suppressionRules.helpBody2ComponentDesc')}<br />
                  <strong>{t('suppressionRules.helpBody2Cve')}</strong> — {t('suppressionRules.helpBody2CveDesc')}<br />
                  <strong>{t('suppressionRules.helpBody2Scope')}</strong> — {t('suppressionRules.helpBody2ScopeDesc2')}
                </p>
                <p style={{ margin: 0 }}>
                  {t('suppressionRules.helpBody3')}
                </p>
              </div>
            }
            position="right"
          >
            <Button variant="plain" aria-label={t('suppressionRules.helpLabel')} style={{ padding: '4px 6px' }}>
              <OutlinedQuestionCircleIcon style={{ color: 'var(--pf-t--global--text--color--subtle)' }} />
            </Button>
          </Popover>
        </div>
      </PageSection>

      <PageSection>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {STATUS_KEYS.map((value) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                aria-label={`${t('suppressionRules.filterByStatus')}: ${statusLabels[value]}`}
                style={filterButton(statusFilter === value)}
              >
                {statusLabels[value]}
              </button>
            ))}
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            {t('suppressionRules.create')}
          </Button>
        </div>
        {error ? (
          <Alert variant="danger" title={`${t('common.error')}: ${getErrorMessage(error)}`} />
        ) : !isLoading && !data?.length ? (
          <EmptyState>
            <EmptyStateBody>{t('suppressionRules.noRules')}</EmptyStateBody>
            <EmptyStateBody>
              <span style={{ color: 'var(--pf-t--global--text--color--subtle)', fontSize: 13 }}>
                {t('suppressionRules.noRulesHint')}
              </span>
            </EmptyStateBody>
          </EmptyState>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <Table variant="compact" isStickyHeader>
              <Thead>
                <Tr>
                  <Th>{t('suppressionRules.type')}</Th>
                  <Th>{t('suppressionRules.target')}</Th>
                  <Th>{t('suppressionRules.scopeLabel')}</Th>
                  <Th>{t('suppressionRules.status')}</Th>
                  <Th>{t('suppressionRules.createdBy')}</Th>
                  <Th>{t('suppressionRules.createdAt')}</Th>
                  <Th style={{ textAlign: 'right' }}>{t('suppressionRules.matchedCves')}</Th>
                  <Th style={{ width: '1%', whiteSpace: 'nowrap' }}></Th>
                </Tr>
              </Thead>
              {isLoading ? (
                <SkeletonRows columns={8} />
              ) : (
                <Tbody>
                  {data!.map((rule: SuppressionRule) => (
                    <Tr
                      key={rule.id}
                      isClickable
                      onRowClick={() => setDetailRule(rule)}
                    >
                      <Td>
                        <Label color={rule.type === 'component' ? 'purple' : 'blue'}>
                          {rule.type === 'component' ? t('suppressionRules.typeComponent') : t('suppressionRules.typeCve')}
                        </Label>
                      </Td>
                      <Td style={{ fontFamily: 'monospace', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rule.type === 'component' ? (
                          <span>
                            {rule.component_name}
                            {rule.version_pattern && (
                              <span style={{ color: 'var(--pf-t--global--text--color--subtle)', marginLeft: 4 }}>
                                @ {rule.version_pattern}
                              </span>
                            )}
                          </span>
                        ) : (
                          <Link to={`/vulnerabilities/${rule.cve_id}`} style={{ color: BRAND_BLUE }}>
                            {rule.cve_id}
                          </Link>
                        )}
                        {rule.reference_url && (
                          <a
                            href={rule.reference_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ marginLeft: 8, fontSize: 11, color: BRAND_BLUE }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            [{t('suppressionRules.reference')}]
                          </a>
                        )}
                      </Td>
                      <Td style={{ fontSize: 12 }}>
                        {rule.type === 'cve' && rule.scope ? (
                          rule.scope.mode === 'all' ? (
                            <Label color="blue">{t('suppressionRules.scopeAll')}</Label>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {rule.scope.targets.map((target) => (
                                <Label key={`${target.namespace}:${target.cluster_name}`} color="teal">
                                  {target.namespace} ({target.cluster_name})
                                </Label>
                              ))}
                            </div>
                          )
                        ) : (
                          <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>—</span>
                        )}
                      </Td>
                      <Td>
                        <span style={statusBadge(STATUS_COLORS[rule.status as keyof typeof STATUS_COLORS] ?? '#8a8d90')}>
                          {statusLabels[rule.status] ?? rule.status}
                        </span>
                        {rule.review_comment && (
                          <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--pf-t--global--text--color--subtle)' }}>
                            ({rule.review_comment})
                          </span>
                        )}
                      </Td>
                      <Td style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rule.created_by_name}</Td>
                      <Td style={{ fontSize: 12, whiteSpace: 'nowrap', color: 'var(--pf-t--global--text--color--subtle)' }}>
                        {new Date(rule.created_at).toLocaleDateString(localeDateLocale)}
                      </Td>
                      <Td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {rule.matched_cve_count}
                      </Td>
                      <Td style={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {isSecTeam && rule.status === SuppressionStatus.requested && (
                            <>
                              <Button variant="primary" size="sm" onClick={() => { setReviewId(rule.id); setReviewApprove(true) }}>
                                {t('suppressionRules.approve')}
                              </Button>
                              <Button variant="danger" size="sm" onClick={() => { setReviewId(rule.id); setReviewApprove(false) }}>
                                {t('suppressionRules.reject')}
                              </Button>
                            </>
                          )}
                          {isSecTeam && (
                            <DeleteRuleButton ruleId={rule.id} />
                          )}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              )}
            </Table>
          </div>
        )}
      </PageSection>

      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); resetCreateForm() }}
        aria-label={t('suppressionRules.create')}
        variant="medium"
      >
        <ModalHeader title={t('suppressionRules.create')} />
        <ModalBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={formLabel}>
                {t('suppressionRules.type')}
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setCreateType('component')}
                  aria-label={t('suppressionRules.typeComponent')}
                  style={{ ...filterButton(createType === 'component'), padding: '6px 16px', borderRadius: 4 }}
                >
                  {t('suppressionRules.typeComponent')}
                </button>
                <button
                  onClick={() => setCreateType('cve')}
                  aria-label={t('suppressionRules.typeCve')}
                  style={{ ...filterButton(createType === 'cve'), padding: '6px 16px', borderRadius: 4 }}
                >
                  {t('suppressionRules.typeCve')}
                </button>
              </div>
            </div>

            {createType === 'component' ? (
              <>
                <div>
                  <label style={formLabel}>
                    {t('suppressionRules.componentName')} *
                  </label>
                  <TextInput
                    value={createComponentName}
                    onChange={(_e, v) => setCreateComponentName(v)}
                    placeholder="github.com/grafana/grafana"
                  />
                </div>
                <div>
                  <label style={formLabel}>
                    {t('suppressionRules.versionPattern')}
                  </label>
                  <TextInput
                    value={createVersionPattern}
                    onChange={(_e, v) => setCreateVersionPattern(v)}
                    placeholder="v0.0.0-*"
                  />
                  <span style={{ fontSize: 11, color: 'var(--pf-t--global--text--color--subtle)' }}>
                    {t('suppressionRules.versionPatternHint')}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label style={formLabel}>
                    {t('suppressionRules.cveId')} *
                  </label>
                  <TextInput
                    value={createCveId}
                    onChange={(_e, v) => setCreateCveId(v)}
                    placeholder="CVE-2024-12345"
                  />
                </div>
                <div>
                  <label style={{ ...formLabel, marginBottom: 8 }}>
                    {t('suppressionRules.scopeLabel')}
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="create-scope"
                        checked={createScopeMode === 'all'}
                        onChange={() => setCreateScopeMode('all')}
                      />
                      <span style={{ fontSize: 13 }}>{t('suppressionRules.scopeAll')}</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="create-scope"
                        checked={createScopeMode === 'namespace'}
                        onChange={() => setCreateScopeMode('namespace')}
                      />
                      <span style={{ fontSize: 13 }}>{t('suppressionRules.scopeNamespace')}</span>
                    </label>
                  </div>
                  {createScopeMode === 'namespace' && (
                    <span style={{ fontSize: 11, color: 'var(--pf-t--global--text--color--subtle)', marginTop: 4, display: 'block' }}>
                      {t('suppressionRules.scopeNamespaceHint')}
                    </span>
                  )}
                </div>
              </>
            )}

            <div>
              <label style={formLabel}>
                {t('suppressionRules.reason')} *
              </label>
              <TextArea
                value={createReason}
                onChange={(_e, v) => setCreateReason(v)}
                placeholder={t('suppressionRules.reasonPlaceholder')}
                rows={3}
              />
            </div>

            <div>
              <label style={formLabel}>
                {t('suppressionRules.referenceUrl')}
              </label>
              <TextInput
                value={createRefUrl}
                onChange={(_e, v) => setCreateRefUrl(v)}
                placeholder="https://github.com/..."
              />
            </div>

            {createError && <Alert variant="danger" isInline title={createError} />}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={handleCreate}
            isLoading={createMutation.isPending}
            isDisabled={
              createMutation.isPending ||
              createReason.length < 10 ||
              (createType === 'component' && !createComponentName) ||
              (createType === 'cve' && !createCveId)
            }
          >
            {t('suppressionRules.submit')}
          </Button>
          <Button variant="link" onClick={() => { setShowCreate(false); resetCreateForm() }}>
            {t('common.cancel')}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={!!reviewId}
        onClose={() => { setReviewId(null); setReviewComment('') }}
        aria-label={t('suppressionRules.review')}
        variant="small"
      >
        <ModalHeader title={reviewApprove ? t('suppressionRules.approveConfirm') : t('suppressionRules.rejectConfirm')} />
        <ModalBody>
          <div>
            <label style={formLabel}>
              {t('suppressionRules.reviewComment')}
            </label>
            <TextArea
              value={reviewComment}
              onChange={(_e, v) => setReviewComment(v)}
              placeholder={t('riskAcceptance.commentPlaceholder')}
              rows={3}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant={reviewApprove ? 'primary' : 'danger'}
            onClick={handleReview}
            isLoading={reviewMutation.isPending}
          >
            {reviewApprove ? t('suppressionRules.approve') : t('suppressionRules.reject')}
          </Button>
          <Button variant="link" onClick={() => { setReviewId(null); setReviewComment('') }}>
            {t('common.cancel')}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={!!detailRule}
        onClose={() => setDetailRule(null)}
        aria-label={t('suppressionRules.detailTitle')}
        variant="medium"
      >
        <ModalHeader title={t('suppressionRules.detailTitle')} />
        {detailRule && (
          <ModalBody>
            <DescriptionList isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('suppressionRules.type')}</DescriptionListTerm>
                <DescriptionListDescription>
                  <Label color={detailRule.type === 'component' ? 'purple' : 'blue'}>
                    {detailRule.type === 'component' ? t('suppressionRules.typeComponent') : t('suppressionRules.typeCve')}
                  </Label>
                </DescriptionListDescription>
              </DescriptionListGroup>

              <DescriptionListGroup>
                <DescriptionListTerm>{t('suppressionRules.target')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {detailRule.type === 'component' ? (
                    <span style={{ fontFamily: 'monospace', fontSize: 13 }}>
                      {detailRule.component_name}
                      {detailRule.version_pattern && (
                        <span style={{ color: 'var(--pf-t--global--text--color--subtle)', marginLeft: 4 }}>
                          @ {detailRule.version_pattern}
                        </span>
                      )}
                    </span>
                  ) : (
                    <Link to={`/vulnerabilities/${detailRule.cve_id}`} style={{ color: BRAND_BLUE, fontFamily: 'monospace', fontSize: 13 }}>
                      {detailRule.cve_id}
                    </Link>
                  )}
                </DescriptionListDescription>
              </DescriptionListGroup>

              <DescriptionListGroup>
                <DescriptionListTerm>{t('suppressionRules.status')}</DescriptionListTerm>
                <DescriptionListDescription>
                  <span style={statusBadge(STATUS_COLORS[detailRule.status as keyof typeof STATUS_COLORS] ?? '#8a8d90')}>
                    {statusLabels[detailRule.status] ?? detailRule.status}
                  </span>
                </DescriptionListDescription>
              </DescriptionListGroup>

              <DescriptionListGroup>
                <DescriptionListTerm>{t('suppressionRules.reason')}</DescriptionListTerm>
                <DescriptionListDescription>
                  <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {detailRule.reason}
                  </div>
                </DescriptionListDescription>
              </DescriptionListGroup>

              {detailRule.reference_url && (
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('suppressionRules.referenceUrl')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    <a
                      href={detailRule.reference_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: BRAND_BLUE, wordBreak: 'break-all' }}
                    >
                      {detailRule.reference_url}
                    </a>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              )}

              {detailRule.type === 'cve' && detailRule.scope && (
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('suppressionRules.scopeLabel')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    {detailRule.scope.mode === 'all' ? (
                      <Label color="blue">{t('suppressionRules.scopeAll')}</Label>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {detailRule.scope.targets.map((target) => (
                          <Label key={`${target.namespace}:${target.cluster_name}`} color="teal">
                            {target.namespace} ({target.cluster_name})
                          </Label>
                        ))}
                      </div>
                    )}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              )}

              <DescriptionListGroup>
                <DescriptionListTerm>{t('suppressionRules.matchedCves')}</DescriptionListTerm>
                <DescriptionListDescription>{detailRule.matched_cve_count}</DescriptionListDescription>
              </DescriptionListGroup>

              <DescriptionListGroup>
                <DescriptionListTerm>{t('suppressionRules.createdBy')}</DescriptionListTerm>
                <DescriptionListDescription>{detailRule.created_by_name}</DescriptionListDescription>
              </DescriptionListGroup>

              <DescriptionListGroup>
                <DescriptionListTerm>{t('suppressionRules.createdAt')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {new Date(detailRule.created_at).toLocaleString(localeDateLocale)}
                </DescriptionListDescription>
              </DescriptionListGroup>

              {detailRule.reviewed_by_name && (
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('suppressionRules.reviewedBy')}</DescriptionListTerm>
                  <DescriptionListDescription>{detailRule.reviewed_by_name}</DescriptionListDescription>
                </DescriptionListGroup>
              )}

              {detailRule.reviewed_at && (
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('suppressionRules.reviewedAt')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    {new Date(detailRule.reviewed_at).toLocaleString(localeDateLocale)}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              )}

              <DescriptionListGroup>
                <DescriptionListTerm>{t('suppressionRules.reviewComment')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {detailRule.review_comment ? (
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {detailRule.review_comment}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--pf-t--global--text--color--subtle)', fontStyle: 'italic' }}>
                      {t('suppressionRules.noReviewComment')}
                    </span>
                  )}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </ModalBody>
        )}
        <ModalFooter>
          {isSecTeam && detailRule?.status === SuppressionStatus.requested && (
            <>
              <Button variant="primary" size="sm" onClick={() => {
                if (detailRule) {
                  setReviewId(detailRule.id)
                  setReviewApprove(true)
                  setDetailRule(null)
                }
              }}>
                {t('suppressionRules.approve')}
              </Button>
              <Button variant="danger" size="sm" onClick={() => {
                if (detailRule) {
                  setReviewId(detailRule.id)
                  setReviewApprove(false)
                  setDetailRule(null)
                }
              }}>
                {t('suppressionRules.reject')}
              </Button>
            </>
          )}
          <Button variant="link" onClick={() => setDetailRule(null)}>
            {t('common.close')}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
