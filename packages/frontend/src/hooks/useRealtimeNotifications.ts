import { useEffect } from 'react'
import { realtime } from '@/services/realtime/realtimeClient'
import { useNotificationStore } from '@/stores/notificationStore'
import { toast } from '@/stores/toastStore'
import type { NotificationItem } from '@/models/api'

/** Keeps the bell live for the whole signed-in session. */
export function useRealtimeNotifications() {
  const receive = useNotificationStore((s) => s.receive)
  useEffect(() => {
    const release = realtime.retain()
    const off = realtime.subscribe('/user/queue/notifications', (body) => {
      const n = body as NotificationItem
      receive(n)
      toast.info(n.message)
    })
    return () => {
      off()
      release()
    }
  }, [receive])
}
