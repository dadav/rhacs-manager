import { useRef, useState } from 'react'
import {
  Alert,
  AlertActionLink,
  Button,
  NotificationBadge,
  NotificationDrawer,
  NotificationDrawerBody,
  NotificationDrawerHeader,
  NotificationDrawerList,
  NotificationDrawerListItem,
  NotificationDrawerListItemBody,
  NotificationDrawerListItemHeader,
  Popper,
} from '@patternfly/react-core'
import { TrashIcon } from '@patternfly/react-icons'
import { useNavigate } from 'react-router'
import {
  useUnreadCount,
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  useDeleteNotification,
  useClearNotifications,
} from '../../api/notifications'
import { useTranslation } from 'react-i18next'
import { useToast } from '../ToastContext'
import { getErrorMessage } from '../../utils/errors'
import type { AppNotification } from '../../types'

function useTimeAgo() {
  const { t } = useTranslation()
  return (dateStr: string): string => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diff < 60) return t('notifications.justNow')
    if (diff < 3600) {
      const mins = Math.floor(diff / 60)
      return t('notifications.minutesAgo', { count: mins })
    }
    if (diff < 86400) {
      const hrs = Math.floor(diff / 3600)
      return t('notifications.hoursAgo', { count: hrs })
    }
    const days = Math.floor(diff / 86400)
    return t('notifications.daysAgo', { count: days })
  }
}

export function NotificationBell() {
  const { t } = useTranslation()
  const timeAgo = useTimeAgo()
  const { addToast } = useToast()
  const [open, setOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [actionError, setActionError] = useState<{ title: string; detail: string } | null>(null)
  const navigate = useNavigate()
  const toggleRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const { data: unread } = useUnreadCount()
  const { data: notifications } = useNotifications()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()
  const deleteNotificationMutation = useDeleteNotification()
  const clearNotificationsMutation = useClearNotifications()

  const count = unread?.count ?? 0
  // Any in-flight deletion locks the other deletion controls to avoid conflicts.
  const deletionPending = deleteNotificationMutation.isPending || clearNotificationsMutation.isPending

  function closeDrawer() {
    setOpen(false)
    setConfirmClear(false)
    setActionError(null)
  }

  function handleClick(notification: AppNotification) {
    markRead.mutate(notification.id)
    closeDrawer()
    if (notification.link) {
      const hashIndex = notification.link.indexOf('#')
      if (hashIndex >= 0) {
        navigate({
          pathname: notification.link.slice(0, hashIndex),
          hash: notification.link.slice(hashIndex),
        })
      } else {
        navigate(notification.link)
      }
    }
  }

  function handleDelete(event: React.MouseEvent, notification: AppNotification) {
    // Stop the item click so deleting neither marks read nor navigates.
    event.stopPropagation()
    setActionError(null)
    deleteNotificationMutation.mutate(notification.id, {
      onSuccess: () => addToast(t('notifications.deleted')),
      onError: error => setActionError({
        title: t('notifications.deleteFailed'),
        detail: getErrorMessage(error),
      }),
    })
  }

  function handleClearAll() {
    setActionError(null)
    clearNotificationsMutation.mutate(undefined, {
      onSuccess: () => {
        addToast(t('notifications.cleared'))
        setConfirmClear(false)
      },
      onError: error => setActionError({
        title: t('notifications.clearFailed'),
        detail: getErrorMessage(error),
      }),
    })
  }

  const headerActions = !confirmClear && (
    <>
      {count > 0 && (
        <Button variant="link" isInline onClick={() => markAllRead.mutate()}>
          {t('notifications.markAllRead')}
        </Button>
      )}
      {!!notifications?.length && (
        <Button
          variant="link"
          isInline
          isDisabled={deletionPending}
          onClick={() => setConfirmClear(true)}
        >
          {t('notifications.clearAll')}
        </Button>
      )}
    </>
  )

  const menu = (
    <div ref={menuRef} style={{ maxWidth: 400, width: '90vw' }}>
      <NotificationDrawer>
        <NotificationDrawerHeader
          title={t('notifications.title')}
          count={count}
          onClose={closeDrawer}
        >
          {headerActions}
        </NotificationDrawerHeader>
        <NotificationDrawerBody style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
          {confirmClear && (
            <Alert
              variant="warning"
              isInline
              title={t('notifications.clearAllConfirm')}
              style={{ margin: 8 }}
              actionLinks={
                <>
                  <AlertActionLink
                    isDanger
                    isDisabled={deletionPending}
                    onClick={handleClearAll}
                  >
                    {t('notifications.clearAllConfirmButton')}
                  </AlertActionLink>
                  <AlertActionLink
                    isDisabled={deletionPending}
                    onClick={() => setConfirmClear(false)}
                  >
                    {t('notifications.clearAllCancel')}
                  </AlertActionLink>
                </>
              }
            />
          )}
          {actionError && (
            <Alert
              variant="danger"
              isInline
              title={actionError.title}
              style={{ margin: 8 }}
            >
              {actionError.detail}
            </Alert>
          )}
          {!notifications?.length ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--pf-t--global--text--color--subtle)' }}>
              {t('notifications.noNotifications')}
            </div>
          ) : (
            <NotificationDrawerList>
              {notifications.map(n => (
                <NotificationDrawerListItem
                  key={n.id}
                  variant="info"
                  isRead={n.read}
                  onClick={() => handleClick(n)}
                >
                  <NotificationDrawerListItemHeader
                    title={n.title}
                    variant="info"
                  >
                    <span style={{ fontSize: 11, color: 'var(--pf-t--global--text--color--subtle)' }}>
                      {timeAgo(n.created_at)}
                    </span>
                    <Button
                      variant="plain"
                      size="sm"
                      aria-label={t('notifications.deleteAriaLabel', { title: n.title })}
                      isDisabled={deletionPending}
                      onClick={event => handleDelete(event, n)}
                    >
                      <TrashIcon />
                    </Button>
                  </NotificationDrawerListItemHeader>
                  <NotificationDrawerListItemBody
                    timestamp={timeAgo(n.created_at)}
                  >
                    {n.message}
                  </NotificationDrawerListItemBody>
                </NotificationDrawerListItem>
              ))}
            </NotificationDrawerList>
          )}
        </NotificationDrawerBody>
      </NotificationDrawer>
    </div>
  )

  const toggle = (
    <div ref={toggleRef} style={{ display: 'inline-flex' }}>
      <NotificationBadge
        variant={count > 0 ? 'unread' : 'read'}
        count={count}
        onClick={() => open ? closeDrawer() : setOpen(true)}
        aria-label={t('notifications.title')}
        style={{ color: '#e0e0e0' }}
      />
    </div>
  )

  return (
    <>
      {toggle}
      <Popper
        triggerRef={toggleRef}
        popper={menu}
        popperRef={menuRef}
        isVisible={open}
        onDocumentClick={(event) => {
          const target = event?.target as Node | undefined
          // Only close on clicks outside both the bell toggle and the drawer,
          // so interacting inside the drawer (delete, clear) never closes it.
          if (
            target &&
            !toggleRef.current?.contains(target) &&
            !menuRef.current?.contains(target)
          ) {
            closeDrawer()
          }
        }}
        placement="bottom-end"
      />
    </>
  )
}
