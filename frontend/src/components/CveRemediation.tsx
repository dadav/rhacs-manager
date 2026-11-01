import {
  Alert,
  Button,
  Card,
  CardBody,
  Checkbox,
  CardTitle,
  Label,
  Spinner,
  TextArea,
  TextInput,
} from "@patternfly/react-core";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getErrorMessage } from "../utils/errors";
import {
  MAX_REMEDIATION_TARGETS,
  useCreateRemediations,
  useRemediationsByCve,
  useUpdateRemediation,
} from "../api/remediations";
import { useAuth } from "../hooks/useAuth";
import { useScope } from "../hooks/useScope";
import { RemediationStatus } from "../types";
import type { RemediationItem } from "../types";
import {
  REMEDIATION_LABEL_COLORS,
  FIXABLE_COLOR,
} from "../tokens";
import { formatDate } from "../utils/format";
import { UserPicker } from "./UserPicker";
import type { UserSearchResult } from "../api/auth";

function namespaceKey(d: { namespace: string; cluster_name: string }): string {
  return `${d.namespace}:${d.cluster_name}`
}

export function CveRemediationSection({
  cveId,
  deployments,
}: {
  cveId: string
  deployments: { namespace: string; cluster_name: string }[]
}) {
  const { t } = useTranslation();
  const { isSecTeam } = useAuth()
  const { scopeParams } = useScope()
  const { data: remediations, isLoading } = useRemediationsByCve(cveId, scopeParams)
  const createMutation = useCreateRemediations()
  const [showForm, setShowForm] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [targetDate, setTargetDate] = useState('')
  const [notes, setNotes] = useState('')
  const [assignee, setAssignee] = useState<UserSearchResult | null>(null)

  const namespaces = Array.from(
    new Map(deployments.map(d => [namespaceKey(d), d])).values()
  )

  const existingKeys = new Set((remediations ?? []).map(namespaceKey))
  const availableNs = namespaces.filter(d => !existingKeys.has(namespaceKey(d)))

  // Derived from availableNs so a namespace that gained a remediation meanwhile is never submitted.
  const selectedTargets = availableNs.filter(d => selectedKeys.has(namespaceKey(d)))
  const tooManySelected = selectedTargets.length > MAX_REMEDIATION_TARGETS
  const allSelected = availableNs.length > 0 && selectedTargets.length === availableNs.length
  const selectAllState: boolean | null = allSelected ? true : selectedTargets.length === 0 ? false : null

  const REM_STATUS_LABELS: Record<string, string> = {
    open: t('remediations.statusOpen'),
    in_progress: t('remediations.statusInProgress'),
    resolved: t('remediations.statusResolved'),
    verified: t('remediations.statusVerified'),
    wont_fix: t('remediations.statusWontFix'),
  }

  function openForm() {
    // Keep the one-click path when only a single namespace can still be remediated.
    setSelectedKeys(availableNs.length === 1 ? new Set([namespaceKey(availableNs[0])]) : new Set())
    setShowForm(true)
  }

  function toggleNamespace(key: string, checked: boolean) {
    setSelectedKeys(prev => {
      const next = new Set(prev)
      if (checked) next.add(key); else next.delete(key)
      return next
    })
  }

  function toggleAll(checked: boolean) {
    setSelectedKeys(checked ? new Set(availableNs.map(namespaceKey)) : new Set())
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (selectedTargets.length === 0 || tooManySelected) return
    await createMutation.mutateAsync({
      cve_id: cveId,
      targets: selectedTargets.map(d => ({ namespace: d.namespace, cluster_name: d.cluster_name })),
      target_date: targetDate || null,
      notes: notes || null,
      assigned_to: assignee?.id ?? null,
    })
    setShowForm(false)
    setSelectedKeys(new Set())
    setTargetDate('')
    setNotes('')
    setAssignee(null)
  }

  return (
    <Card id="remediation-section">
      <CardTitle>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t('cveDetail.remediationsCount', { count: remediations?.length ?? 0 })}</span>
          {!isSecTeam && availableNs.length > 0 && !showForm && (
            <Button variant="secondary" size="sm" onClick={openForm}>
              {t('cveDetail.startRemediationBtn')}
            </Button>
          )}
        </div>
      </CardTitle>
      <CardBody>
        {isLoading ? (
          <Spinner size="md" aria-label={t('common.loading')} />
        ) : remediations && remediations.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {remediations.map(r => (
              <RemediationCard key={r.id} item={r} remStatusLabels={REM_STATUS_LABELS} />
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--pf-t--global--text--color--subtle)', margin: 0 }}>
            {t('cveDetail.noRemediationsForCve')}
          </p>
        )}

        {showForm && (
          <form onSubmit={handleCreate} style={{ marginTop: 16, padding: 12, border: '1px solid var(--pf-t--global--border--color--default)', borderRadius: 4 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
                <legend style={{ fontSize: 12, fontWeight: 600 }}>{t('cveDetail.selectNamespaces')}</legend>
                {availableNs.length > 1 && (
                  <Checkbox
                    id="remediation-ns-all"
                    label={t('cveDetail.selectAllNamespaces', { count: availableNs.length })}
                    isChecked={selectAllState}
                    onChange={(_e, checked) => toggleAll(checked)}
                    style={{ marginTop: 4 }}
                  />
                )}
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4,
                  paddingLeft: availableNs.length > 1 ? 16 : 0, maxHeight: 240, overflowY: 'auto',
                }}>
                  {availableNs.map(d => {
                    const key = namespaceKey(d)
                    return (
                      <Checkbox
                        key={key}
                        id={`remediation-ns-${key}`}
                        label={`${d.cluster_name}/${d.namespace}`}
                        isChecked={selectedKeys.has(key)}
                        onChange={(_e, checked) => toggleNamespace(key, checked)}
                      />
                    )
                  })}
                </div>
                {tooManySelected && (
                  <p style={{ fontSize: 12, color: 'var(--pf-t--global--text--color--status--danger--default)', margin: '6px 0 0' }}>
                    {t('cveDetail.tooManyNamespaces', { max: MAX_REMEDIATION_TARGETS })}
                  </p>
                )}
              </fieldset>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>{t('cveDetail.assigneeOptional')}</label>
                <div style={{ marginTop: 4 }}>
                  {assignee ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <span>{assignee.display_name}</span>
                      <span style={{ fontSize: 11, color: 'var(--pf-t--global--text--color--subtle)' }}>@{assignee.username}</span>
                      <Button variant="link" size="sm" isInline onClick={() => setAssignee(null)}>
                        {t('common.remove')}
                      </Button>
                    </div>
                  ) : (
                    <UserPicker
                      placeholder={t('riskAcceptance.searchUser')}
                      ariaLabel={t('cveDetail.assigneeOptional')}
                      onSelect={setAssignee}
                    />
                  )}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>{t('cveDetail.targetDate')}</label>
                <TextInput
                  type="date"
                  value={targetDate}
                  onChange={(_, v) => setTargetDate(v)}
                  aria-label={t('cveDetail.targetDate')}
                  style={{ marginTop: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>{t('cveDetail.notes')}</label>
                <TextArea
                  value={notes}
                  onChange={(_, v) => setNotes(v)}
                  rows={2}
                  placeholder={t('cveDetail.notesPlaceholder')}
                  style={{ marginTop: 4 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={createMutation.isPending}
                  isDisabled={selectedTargets.length === 0 || tooManySelected || createMutation.isPending}
                >
                  {t('cveDetail.createRemediationsBtn', { count: selectedTargets.length })}
                </Button>
                <Button variant="link" size="sm" onClick={() => setShowForm(false)}>
                  {t('common.cancel')}
                </Button>
              </div>
              {createMutation.isError && (
                <Alert variant="danger" isInline title={getErrorMessage(createMutation.error)} />
              )}
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  )
}

export function RemediationCard({ item, remStatusLabels }: { item: RemediationItem; remStatusLabels: Record<string, string> }) {
  const { t, i18n } = useTranslation();
  const updateMutation = useUpdateRemediation(item.id)
  const [showWontFix, setShowWontFix] = useState(false)
  const [wontFixReason, setWontFixReason] = useState('')
  const [showAssign, setShowAssign] = useState(false)

  // Reset mutation once refetched data arrives (status changed), so the next action button is enabled
  useEffect(() => {
    if (updateMutation.isSuccess) updateMutation.reset()
  }, [item.status])

  const mutationBusy = updateMutation.isPending || updateMutation.isSuccess
  const canProgress = item.status === RemediationStatus.open
  const canResolve = item.status === RemediationStatus.in_progress
  const canWontFix = item.status === RemediationStatus.open || item.status === RemediationStatus.in_progress
  const canReopen = item.status === RemediationStatus.wont_fix
  const canAssign = item.status === RemediationStatus.open || item.status === RemediationStatus.in_progress

  function handleAssign(user: UserSearchResult) {
    // Assignment does not change item.status, so the status-keyed reset effect above
    // never fires for it; reset here or every action button stays disabled.
    updateMutation.mutate(
      { assigned_to: user.id },
      {
        onSuccess: () => {
          setShowAssign(false)
          updateMutation.reset()
        },
      },
    )
  }

  function handleWontFix() {
    if (!wontFixReason.trim()) return
    updateMutation.mutate(
      { status: 'wont_fix', wont_fix_reason: wontFixReason },
      { onSuccess: () => { setShowWontFix(false); setWontFixReason('') } },
    )
  }

  return (
    <div style={{
      padding: 12,
      border: '1px solid var(--pf-t--global--border--color--default)',
      borderRadius: 4,
      borderLeft: `3px solid ${
        item.is_overdue ? '#c9190b'
        : item.status === RemediationStatus.verified ? '#009596'
        : item.status === RemediationStatus.resolved ? FIXABLE_COLOR
        : item.status === RemediationStatus.in_progress ? '#ec7a08'
        : item.status === RemediationStatus.wont_fix ? '#8a8d90'
        : 'var(--pf-t--global--color--brand--default)'
      }`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {item.cluster_name}/{item.namespace}
        </span>
        <Label color={REMEDIATION_LABEL_COLORS[item.status] ?? 'grey'}>
          {remStatusLabels[item.status] ?? item.status}
        </Label>
      </div>
      <div style={{ fontSize: 12, color: 'var(--pf-t--global--text--color--subtle)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {item.assigned_to_name && <span>{t('cveDetail.assignedLabel', { name: item.assigned_to_name })}</span>}
        {item.target_date && (
          <span style={{ color: item.is_overdue ? '#c9190b' : undefined, fontWeight: item.is_overdue ? 600 : 400 }}>
            {t('cveDetail.dueLabel', { date: formatDate(item.target_date, i18n.language) })}
            {item.is_overdue && ` ${t('cveDetail.overdueLabel')}`}
          </span>
        )}
        <span>{t('cveDetail.createdInfo', { date: formatDate(item.created_at, i18n.language), name: item.created_by_name })}</span>
      </div>
      {item.notes && (
        <p style={{ fontSize: 12, margin: '6px 0 0', color: 'var(--pf-t--global--text--color--regular)', whiteSpace: 'pre-wrap' }}>
          {item.notes}
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {canProgress && (
          <Button variant="secondary" size="sm" isDisabled={mutationBusy} isLoading={mutationBusy} onClick={() => updateMutation.mutate({ status: 'in_progress' })}>
            {t('cveDetail.start')}
          </Button>
        )}
        {canResolve && (
          <Button variant="secondary" size="sm" isDisabled={mutationBusy} isLoading={mutationBusy} onClick={() => updateMutation.mutate({ status: 'resolved' })}>
            {t('cveDetail.markResolvedBtn')}
          </Button>
        )}
        {canAssign && !showAssign && (
          <Button variant="link" size="sm" isDisabled={mutationBusy} onClick={() => setShowAssign(true)}>
            {item.assigned_to ? t('cveDetail.reassign') : t('cveDetail.assign')}
          </Button>
        )}
        {canWontFix && !showWontFix && (
          <Button variant="link" size="sm" isDanger isDisabled={mutationBusy} onClick={() => setShowWontFix(true)}>
            {t('cveDetail.wontFix')}
          </Button>
        )}
        {canReopen && (
          <Button variant="link" size="sm" isDisabled={mutationBusy} isLoading={mutationBusy} onClick={() => updateMutation.mutate({ status: 'open' })}>
            {t('cveDetail.reopen')}
          </Button>
        )}
      </div>
      {showAssign && (
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <UserPicker
              placeholder={t('riskAcceptance.searchUser')}
              ariaLabel={t('cveDetail.assign')}
              onSelect={handleAssign}
            />
          </div>
          <Button variant="link" size="sm" onClick={() => setShowAssign(false)}>
            {t('common.cancel')}
          </Button>
        </div>
      )}
      {updateMutation.isError && (
        <Alert variant="danger" isInline title={getErrorMessage(updateMutation.error)} style={{ marginTop: 8 }} />
      )}
      {showWontFix && (
        <div style={{ marginTop: 8, padding: 10, border: '1px solid var(--pf-t--global--border--color--default)', borderRadius: 4 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>{t('cveDetail.wontFixReason')}</label>
          <TextArea
            value={wontFixReason}
            onChange={(_, v) => setWontFixReason(v)}
            rows={2}
            placeholder={t('cveDetail.wontFixPlaceholder')}
            style={{ marginTop: 4 }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button variant="danger" size="sm" isLoading={mutationBusy} isDisabled={mutationBusy || !wontFixReason.trim()} onClick={handleWontFix}>
              {t('common.confirm')}
            </Button>
            <Button variant="link" size="sm" onClick={() => { setShowWontFix(false); setWontFixReason('') }}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
