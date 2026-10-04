import { projectApi } from '@/services/api/projectApi'
import { sharingApi } from '@/services/api/sharingApi'
import { useApprovalStore } from '@/stores/approvalStore'
import { useCollabStore } from '@/stores/collabStore'
import { useEditorStore } from '@/stores/editorStore'
import { toast } from '@/stores/toastStore'
import type { CommentItem, PresenceUser } from '@/models/api'
import { throttle, uid } from '@/utils/common'
import { EditorSync } from './editorSync'
import { realtime } from './realtimeClient'
import { changesFromRemote } from './remoteApply'
import type { DesignOp, OpEnvelope } from './wireOps'

/** Owns the realtime lifecycle of one open design: room membership, persistence, remote edits, cursors and chat. */
class CollabSession {
  private projectId = 0
  private userId = 0
  private clientId = uid()
  private sync: EditorSync | null = null
  private cleanups: (() => void)[] = []
  private canEdit = false
  private lastSessionList: PresenceUser[] = []
  private saveWatchdog: ReturnType<typeof setTimeout> | undefined

  start(projectId: number, userId: number, canEdit: boolean) {
    this.stop()
    this.projectId = projectId
    this.userId = userId
    this.canEdit = canEdit
    this.clientId = uid()
    const collab = useCollabStore.getState()
    collab.reset()

    this.cleanups.push(realtime.retain())
    this.cleanups.push(realtime.onStatus((s) => useCollabStore.getState().setConnection(s)))
    this.cleanups.push(realtime.subscribe(`/topic/project.${projectId}`, (b) => void this.onEnvelope(b as OpEnvelope)))
    this.cleanups.push(
      realtime.subscribe(`/topic/project.${projectId}.presence`, (b) => {
        this.lastSessionList = b as PresenceUser[]
        useCollabStore.getState().setPresence(this.lastSessionList)
        useCollabStore.getState().pruneCursors(new Set(this.lastSessionList.map((p) => p.sessionId)))
      }),
    )
    this.cleanups.push(realtime.subscribe(`/topic/project.${projectId}.events`, (b) => this.onEvent(b as { type: string; payload: unknown })))
    this.cleanups.push(
      realtime.subscribe('/user/queue/errors', (b) => {
        const msg = (b as { message?: string }).message ?? 'A change could not be saved'
        toast.error(msg)
        useCollabStore.getState().setSaveState('error')
      }),
    )
    this.cleanups.push(realtime.onConnect(() => realtime.publish(`/app/project/${projectId}/join`, {})))

    if (canEdit) {
      this.sync = new EditorSync(projectId, (op) => this.sendOp(op))
      this.sync.start()
    }
    void sharingApi.comments(projectId).then((c) => useCollabStore.getState().setComments(c)).catch(() => undefined)
  }

  stop() {
    this.sync?.flush()
    this.sync?.stop()
    this.sync = null
    clearTimeout(this.saveWatchdog)
    if (this.projectId) realtime.publish(`/app/project/${this.projectId}/leave`, {})
    this.cleanups.forEach((c) => c())
    this.cleanups = []
    this.projectId = 0
  }

  flushNow() {
    this.sync?.flush()
  }

  private sendOp(op: DesignOp): boolean {
    const ok = realtime.publish(`/app/project/${this.projectId}/ops`, { ...op, clientId: this.clientId })
    if (ok) {
      clearTimeout(this.saveWatchdog)
      this.saveWatchdog = setTimeout(() => {
        if ((this.sync?.awaiting ?? 0) > 0) useCollabStore.getState().setSaveState('error')
      }, 10000)
    }
    return ok
  }

  readonly sendCursor = throttle((x: number, y: number, pageId: string) => {
    if (useCollabStore.getState().presence.length < 2) return
    realtime.publish(`/app/project/${this.projectId}/ops`, { type: 'CURSOR', clientId: this.clientId, cursor: { x, y, pageId } })
  }, 60)

  sendChat(text: string) {
    realtime.publish(`/app/project/${this.projectId}/ops`, { type: 'CHAT', clientId: this.clientId, text })
  }

  private async onEnvelope(env: OpEnvelope) {
    const { op } = env
    const mine = op.clientId === this.clientId
    if (mine) {
      if (op.type !== 'CURSOR' && op.type !== 'CHAT') this.sync?.acknowledge()
      if (op.type !== 'CHAT') return
    }
    const collab = useCollabStore.getState()
    switch (op.type) {
      case 'CURSOR': {
        const who = this.lastSessionList.find((p) => p.userId === env.userId)
        if (op.cursor && who) collab.setCursor({ sessionId: who.sessionId, userId: env.userId, name: env.userName, color: who.color, x: op.cursor.x, y: op.cursor.y, pageId: op.cursor.pageId, at: Date.now() })
        return
      }
      case 'CHAT':
        collab.addChat({ id: uid(), userId: env.userId, name: env.userName, text: op.text ?? '', at: Date.now() })
        return
      case 'RELOAD': {
        try {
          useEditorStore.getState().replaceDocument(await projectApi.loadDesign(this.projectId))
          toast.info(`${env.userName} restored an earlier version`)
        } catch {
          toast.error('Could not reload the design. Refresh the page.')
        }
        return
      }
      case 'SELECTION':
        return
      default:
        useEditorStore.getState().applyRemote(changesFromRemote(op))
    }
  }

  private onEvent(e: { type: string; payload: unknown }) {
    const collab = useCollabStore.getState()
    if (e.type === 'COMMENT_UPSERT') collab.upsertComment(e.payload as CommentItem)
    else if (e.type === 'COMMENT_DELETE') collab.removeComment(e.payload as number)
    else if (e.type === 'APPROVAL_CHANGED') void useApprovalStore.getState().load(this.projectId)
  }

  get editable() {
    return this.canEdit
  }

  get me() {
    return this.userId
  }
}

export const collabSession = new CollabSession()
