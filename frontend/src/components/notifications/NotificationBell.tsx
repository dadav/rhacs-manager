import { useState } from 'react'
import { Badge, Button } from '@patternfly/react-core'
import { BellIcon } from '@patternfly/react-icons'
import { useNavigate } from 'react-router-dom'
import { useUnreadCount, useNotifications, useMarkRead, useMarkAllRead } from '../../api/notifications'
import { useTranslation } from 'react-i18next'
import type { AppNotification } from '../../types'

const PANEL_BACKGROUND = 'var(--pf-v6-global--BackgroundColor--100, #ffffff)'
const PANEL_TEXT_COLOR = 'var(--pf-v6-global--Color--100, #151515)'
const PANEL_MUTED_COLOR = 'var(--pf-v6-global--Color--200, #6a6e73)'
const PANEL_BORDER_COLOR = 'var(--pf-v6-global--BorderColor--100, #d2d2d2)'

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

  const { data: unread } = useUnreadCount()
  const { data: notifications } = useNotifications()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  const count = unread?.count ?? 0

  function handleClick(n: AppNotification) {
    markRead.mutate(n.id)
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  return (
    <div style={{ position: 'relative' }}>
      <Button
        variant="plain"
        aria-label={t('notifications.title')}
        onClick={() => setOpen(o => !o)}
        style={{ color: '#fff', position: 'relative' }}
      >
        <BellIcon />
        {count > 0 && (
          <Badge
            isRead={false}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              minWidth: 16,
              height: 16,
              fontSize: 10,
              background: '#c9190b',
              color: '#fff',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {count > 99 ? '99+' : count}
          </Badge>
        )}
      </Button>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              width: 380,
              maxHeight: 480,
              overflowY: 'auto',
              background: PANEL_BACKGROUND,
              color: PANEL_TEXT_COLOR,
              border: `1px solid ${PANEL_BORDER_COLOR}`,
              borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,.15)',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: `1px solid ${PANEL_BORDER_COLOR}`,
                position: 'sticky',
                top: 0,
                background: PANEL_BACKGROUND,
              }}
            >
              <strong>{t('notifications.title')}</strong>
              {count > 0 && (
                <Button variant="link" isInline onClick={() => markAllRead.mutate()}>
                  {t('notifications.markAllRead')}
                </Button>
              )}
            </div>

            {!notifications?.length ? (
              <div style={{ padding: '24px', textAlign: 'center', color: PANEL_MUTED_COLOR }}>
                {t('notifications.noNotifications')}
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: `1px solid ${PANEL_BORDER_COLOR}`,
                    cursor: n.link ? 'pointer' : 'default',
                    background: n.read
                      ? 'var(--pf-v6-global--BackgroundColor--100, #ffffff)'
                      : 'var(--pf-v6-global--BackgroundColor--200, #f5f5f5)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => {
                    if (n.link) {
                      ;(e.currentTarget as HTMLDivElement).style.background = 'var(--pf-v6-global--BackgroundColor--200, #f5f5f5)'
                    }
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLDivElement).style.background = n.read
                      ? 'var(--pf-v6-global--BackgroundColor--100, #ffffff)'
                      : 'var(--pf-v6-global--BackgroundColor--200, #f5f5f5)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <strong
                      style={{
                        fontSize: 14,
                        color: n.read
                          ? 'var(--pf-v6-global--Color--200, #6a6e73)'
                          : 'var(--pf-v6-global--Color--100, #151515)',
                      }}
                    >
                      {n.title}
                    </strong>
                    <span style={{ fontSize: 11, color: 'var(--pf-v6-global--Color--200, #6a6e73)' }}>
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--pf-v6-global--Color--200, #6a6e73)' }}>
                    {n.message}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
