import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from '@patternfly/react-core'
import { useId, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { isSessionExpired, subscribeSessionExpired } from '../utils/sessionExpiry'

export function SessionExpiredModal() {
  const expired = useSyncExternalStore(subscribeSessionExpired, isSessionExpired)
  const { t } = useTranslation()
  const id = useId()
  const titleId = `${id}-title`
  const bodyId = `${id}-body`
  const returnPath = window.location.pathname + window.location.search + window.location.hash

  return (
    <Modal
      isOpen={expired}
      variant="small"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onKeyDownCapture={(event) => {
        // Keep underlying edit modals open so unsaved input survives.
        if (event.key === 'Escape') event.stopPropagation()
      }}
    >
      <ModalHeader title={t('app.sessionExpired.title')} labelId={titleId} />
      <ModalBody id={bodyId}>{t('app.sessionExpired.body')}</ModalBody>
      <ModalFooter>
        <Button component="a" href={`/oauth/start?rd=${encodeURIComponent(returnPath)}`} variant="primary">
          {t('app.sessionExpired.relogin')}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
