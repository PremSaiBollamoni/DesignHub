import { Client, type IMessage } from '@stomp/stompjs'
import { tokenStore, wsUrl } from '@/services/api/http'

type Handler = (body: unknown) => void
export type ConnectionStatus = 'idle' | 'connecting' | 'online' | 'offline'

interface Sub {
  destination: string
  handler: Handler
  unsubscribe?: () => void
}

/**
 * One shared STOMP connection for the whole app. Subscriptions survive reconnects, and callers that
 * publish while offline get `false` back so they can fall back to REST.
 */
class RealtimeClient {
  private client: Client | null = null
  private subs = new Set<Sub>()
  private statusListeners = new Set<(s: ConnectionStatus) => void>()
  private connectListeners = new Set<() => void>()
  private refs = 0
  status: ConnectionStatus = 'idle'

  /** Reference counted so the notification bell and an open editor can share the socket. */
  retain() {
    this.refs++
    if (!this.client) this.start()
    return () => {
      this.refs--
      if (this.refs <= 0) this.stop()
    }
  }

  private start() {
    const token = tokenStore.get()
    if (!token) return
    this.setStatus('connecting')
    const client = new Client({
      brokerURL: wsUrl(),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        this.setStatus('online')
        this.subs.forEach((s) => this.attach(s))
        this.connectListeners.forEach((l) => l())
      },
      onWebSocketClose: () => {
        this.subs.forEach((s) => (s.unsubscribe = undefined))
        if (this.refs > 0) this.setStatus('offline')
      },
      onStompError: () => this.setStatus('offline'),
    })
    this.client = client
    client.activate()
  }

  private stop() {
    void this.client?.deactivate()
    this.client = null
    this.setStatus('idle')
  }

  private attach(sub: Sub) {
    if (!this.client?.connected || sub.unsubscribe) return
    const s = this.client.subscribe(sub.destination, (m: IMessage) => {
      try {
        sub.handler(JSON.parse(m.body))
      } catch {
        /* ignore malformed frames */
      }
    })
    sub.unsubscribe = () => s.unsubscribe()
  }

  subscribe(destination: string, handler: Handler): () => void {
    const sub: Sub = { destination, handler }
    this.subs.add(sub)
    this.attach(sub)
    return () => {
      sub.unsubscribe?.()
      this.subs.delete(sub)
    }
  }

  publish(destination: string, body: unknown): boolean {
    if (!this.client?.connected) return false
    this.client.publish({ destination, body: JSON.stringify(body) })
    return true
  }

  onStatus(listener: (s: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener)
    listener(this.status)
    return () => this.statusListeners.delete(listener)
  }

  /** Fires on the first connect and on every reconnect (used to re-join a project room). */
  onConnect(listener: () => void): () => void {
    this.connectListeners.add(listener)
    if (this.client?.connected) listener()
    return () => this.connectListeners.delete(listener)
  }

  private setStatus(s: ConnectionStatus) {
    this.status = s
    this.statusListeners.forEach((l) => l(s))
  }
}

export const realtime = new RealtimeClient()
