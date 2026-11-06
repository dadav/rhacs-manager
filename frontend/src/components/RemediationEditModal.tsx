import {
  Alert,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextArea,
  TextInput,
} from '@patternfly/react-core'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUpdateRemediation } from '../api/remediations'
import type { RemediationItem } from '../types'
import { getErrorMessage } from '../utils/errors'

/** Local calendar date as YYYY-MM-DD, directly comparable with date input values. */
function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function normalizeNotes(value: string): string {
  return value.trim() ? value : ''
}

interface RemediationEditModalProps {
  item: RemediationItem
  isOpen: boolean
  onClose: () => void
  onSaved?: () => void
}

/**
 * Edits target date and notes. The assignee stays outside: UserPicker is a modal of its own.
 * Has its own mutation, so the parent's status-keyed mutation reset is not involved.
 */
export function RemediationEditModal({ item, isOpen, onClose, onSaved }: RemediationEditModalProps) {
  const { t } = useTranslation()
  const updateMutation = useUpdateRemediation(item.id)
  const [targetDate, setTargetDate] = useState('')
  const [notes, setNotes] = useState('')
  const idBase = useId()
  const titleId = `${idBase}-title`
  const dateId = `${idBase}-date`
  const notesId = `${idBase}-notes`

  useEffect(() => {
    if (!isOpen) return
    setTargetDate(item.target_date ?? '')
    setNotes(item.notes ?? '')
    updateMutation.reset()
  }, [isOpen])

  const dateChanged = targetDate !== (item.target_date ?? '')
  const notesChanged = normalizeNotes(notes) !== normalizeNotes(item.notes ?? '')
  // An unchanged overdue date stays valid, so the notes can still be edited.
  const dateInPast = dateChanged && targetDate !== '' && targetDate < todayIso()
  const canSave = (dateChanged || notesChanged) && !dateInPast && !updateMutation.isPending

  function handleSave() {
    if (!canSave) return
    const body: { target_date?: string | null; notes?: string | null } = {}
    if (dateChanged) body.target_date = targetDate || null
    if (notesChanged) body.notes = normalizeNotes(notes) || null
    updateMutation.mutate(body, {
      onSuccess: () => {
        onClose()
        onSaved?.()
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} variant="small" aria-labelledby={titleId}>
      <ModalHeader
        title={t('remediations.editTitle')}
        labelId={titleId}
        description={`${item.cve_id}, ${item.cluster_name}/${item.namespace}`}
      />
      <ModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label htmlFor={dateId} style={{ fontSize: 13, fontWeight: 600 }}>{t('cveDetail.targetDate')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <TextInput
                id={dateId}
                type="date"
                value={targetDate}
                onChange={(_, v) => setTargetDate(v)}
                validated={dateInPast ? 'error' : 'default'}
                aria-label={t('cveDetail.targetDate')}
              />
              {targetDate && (
                <Button variant="link" size="sm" isInline style={{ flexShrink: 0 }} onClick={() => setTargetDate('')}>
                  {t('common.remove')}
                </Button>
              )}
            </div>
            {dateInPast && (
              <p style={{ fontSize: 12, color: 'var(--pf-t--global--text--color--status--danger--default)', margin: '6px 0 0' }}>
                {t('remediations.targetDatePast')}
              </p>
            )}
          </div>
          <div>
            <label htmlFor={notesId} style={{ fontSize: 13, fontWeight: 600 }}>{t('cveDetail.notes')}</label>
            <TextArea
              id={notesId}
              value={notes}
              onChange={(_, v) => setNotes(v)}
              rows={4}
              maxLength={5000}
              placeholder={t('cveDetail.notesPlaceholder')}
              aria-label={t('cveDetail.notes')}
              style={{ marginTop: 4 }}
            />
          </div>
          <div role="alert" aria-live="assertive">
            {updateMutation.isError && (
              <Alert variant="danger" isInline title={getErrorMessage(updateMutation.error)} />
            )}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" isDisabled={!canSave} isLoading={updateMutation.isPending} onClick={handleSave}>
          {t('common.save')}
        </Button>
        <Button variant="link" onClick={onClose}>{t('common.cancel')}</Button>
      </ModalFooter>
    </Modal>
  )
}
