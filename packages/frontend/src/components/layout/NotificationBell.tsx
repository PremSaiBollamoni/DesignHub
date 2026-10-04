import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconButton, Button } from '@/components/ui/Button'
import { Popover } from '@/components/ui/Menu'
import { Spinner } from '@/components/ui/Feedback'
import { useNotificationStore } from '@/stores/notificationStore'
import { timeAgo } from '@/utils/common'

export function NotificationBell() {
  const navigate = useNavigate()
  const { items, unread, loading, load, markRead, markAllRead } = useNotificationStore()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const close = useCallback(() => setAnchor(null), [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <span style={{ position: 'relative', display: 'inline-flex' }}>
        <IconButton icon="bell" label={unread ? `Notifications, ${unread} unread` : 'Notifications'} onClick={(e) => setAnchor(anchor ? null : e.currentTarget)} />
        {unread > 0 && <span className="badge-dot">{unread > 9 ? '9+' : unread}</span>}
      </span>
      {anchor && (
        <Popover anchor={anchor} onClose={close} align="end" width={360}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px 8px' }}>
            <strong>Notifications</strong>
            <Button size="sm" variant="ghost" disabled={!unread} onClick={() => void markAllRead()}>
              Mark all as read
            </Button>
          </div>
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {loading && !items.length && (
              <div style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
                <Spinner />
              </div>
            )}
            {!loading && !items.length && (
              <p style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--ink-2)' }}>
                You are all caught up. Mentions, comments and invitations show up here.
              </p>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                className="menu-item"
                style={{ height: 'auto', padding: '10px', alignItems: 'flex-start', background: n.read ? undefined : 'var(--ultra-tint)' }}
                onClick={() => {
                  void markRead(n.id)
                  close()
                  if (n.link) navigate(n.link)
                }}
              >
                <span style={{ display: 'grid', gap: 2 }}>
                  <span>{n.message}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        </Popover>
      )}
    </>
  )
}
