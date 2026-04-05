import { useRef, useState } from 'react'
import {
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
import { useNavigate } from 'react-router'
import { useUnreadCount, useNotifications, useMarkRead, useMarkAllRead } from '../../api/notifications'
import { useTranslation } from 'react-i18next'
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
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const toggleRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const { data: unread } = useUnreadCount()
  const { data: notifications } = useNotifications()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  const count = unread?.count ?? 0

  function handleClick(n: AppNotification) {
    markRead.mutate(n.id)
    setOpen(false)
    if (n.link) {
      const hashIndex = n.link.indexOf('#')
      if (hashIndex >= 0) {
        navigate({
          pathname: n.link.slice(0, hashIndex),
          hash: n.link.slice(hashIndex),
        })
      } else {
        navigate(n.link)
      }
    }
  }

  const toggle = (
    <div ref={toggleRef} style={{ display: 'inline-flex' }}>
      <NotificationBadge
        variant={count > 0 ? 'unread' : 'read'}
        count={count}
        onClick={() => setOpen(o => !o)}
        aria-label={t('notifications.title')}
        style={{ color: '#e0e0e0' }}
      />
    </div>
  )

  const menu = (
    <div ref={menuRef} style={{ maxWidth: 400, width: '90vw' }}>
      <NotificationDrawer>
        <NotificationDrawerHeader
          title={t('notifications.title')}
          count={count}
          onClose={() => setOpen(false)}
        >
          {count > 0 && (
            <Button variant="link" isInline onClick={() => markAllRead.mutate()}>
              {t('notifications.markAllRead')}
            </Button>
          )}
        </NotificationDrawerHeader>
        <NotificationDrawerBody style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
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

  return (
    <>
      {toggle}
      <Popper
        triggerRef={toggleRef}
        popper={menu}
        popperRef={menuRef}
        isVisible={open}
        onDocumentClick={(event) => {
          if (event && !toggleRef.current?.contains(event.target as Node)) {
            setOpen(false)
          }
        }}
        placement="bottom-end"
      />
    </>
  )
}
