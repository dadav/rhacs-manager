import { Button, Modal, ModalBody, ModalFooter, ModalHeader, Tooltip } from '@patternfly/react-core'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ContactLocation } from '../types'
import { BRAND_BLUE } from '../tokens'

// Tooltip preview length; longer lists are reachable through the "show all" dialog.
export const CONTACT_LOCATION_PREVIEW_LIMIT = 10

interface CveContactEmailsProps {
  emails: string[]
  // Missing on older backends; then every email renders as a plain link.
  locations?: Record<string, ContactLocation[]>
}

function locationKey(location: ContactLocation): string {
  return `${location.cluster_name}\u0000${location.namespace}`
}

function LocationList({ locations }: { locations: ContactLocation[] }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {locations.map(location => (
        <li key={locationKey(location)} style={{ overflowWrap: 'anywhere' }}>
          {location.cluster_name} / {location.namespace}
        </li>
      ))}
    </ul>
  )
}

function LocationPreview({ locations }: { locations: ContactLocation[] }) {
  const { t } = useTranslation()
  const remaining = locations.length - CONTACT_LOCATION_PREVIEW_LIMIT
  return (
    <div style={{ textAlign: 'left' }}>
      <div style={{ fontWeight: 600 }}>{t('cveDetail.contactLocations.heading')}</div>
      <LocationList locations={locations.slice(0, CONTACT_LOCATION_PREVIEW_LIMIT)} />
      {remaining > 0 && <div>{t('cveDetail.contactLocations.remaining', { count: remaining })}</div>}
    </div>
  )
}

function ContactEmail({ email, locations }: { email: string; locations: ContactLocation[] }) {
  const { t } = useTranslation()
  const titleId = useId()
  const [dialogOpen, setDialogOpen] = useState(false)
  const showAllRef = useRef<HTMLButtonElement>(null)
  const wasDialogOpen = useRef(false)
  // Runs after the modal's own unmount cleanup, which restores focus to whatever was
  // active when it opened (body, if the click did not focus the button, as in Safari).
  useEffect(() => {
    if (wasDialogOpen.current && !dialogOpen) showAllRef.current?.focus()
    wasDialogOpen.current = dialogOpen
  }, [dialogOpen])
  const link = (
    <a href={`mailto:${email}`} style={{ color: BRAND_BLUE }}>
      {email}
    </a>
  )
  if (locations.length === 0) return link

  const hasMore = locations.length > CONTACT_LOCATION_PREVIEW_LIMIT
  const closeDialog = () => setDialogOpen(false)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
      <Tooltip content={<LocationPreview locations={locations} />}>{link}</Tooltip>
      {hasMore && (
        <Button
          ref={showAllRef}
          variant="link"
          isInline
          size="sm"
          aria-label={t('cveDetail.contactLocations.showAllFor', { email })}
          onClick={() => setDialogOpen(true)}
        >
          {t('cveDetail.contactLocations.showAll')}
        </Button>
      )}
      {/* Rendered from the current props on every render, so a scope change never shows stale pairs. */}
      {hasMore && dialogOpen && (
        <Modal isOpen variant="small" onClose={closeDialog} aria-labelledby={titleId}>
          <ModalHeader title={t('cveDetail.contactLocations.dialogTitle')} description={email} labelId={titleId} />
          <ModalBody tabIndex={0} role="region" aria-labelledby={titleId}>
            <div style={{ fontWeight: 600 }}>{t('cveDetail.contactLocations.heading')}</div>
            <LocationList locations={locations} />
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" onClick={closeDialog}>
              {t('common.close')}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </span>
  )
}

export function CveContactEmails({ emails, locations }: CveContactEmailsProps) {
  if (emails.length === 0) return <>–</>
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {emails.map(email => (
        <ContactEmail key={email} email={email} locations={locations?.[email] ?? []} />
      ))}
    </div>
  )
}
