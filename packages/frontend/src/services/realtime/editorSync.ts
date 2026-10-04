import type { Change } from '@/editor/model/changes'
import { stateToDoc } from '@/editor/model/wire'
import { projectApi } from '@/services/api/projectApi'
import { onLocalChanges, useEditorStore } from '@/stores/editorStore'
import { useCollabStore } from '@/stores/collabStore'
import type { DesignOp, WireElement } from './wireOps'

const FLUSH_DELAY = 350
const MAX_CHUNK = 40

type Send = (op: DesignOp) => boolean

/**
 * Coalesces local changes into compact collaboration operations. Because server writes are idempotent
 * upserts, a lost or repeated message can never corrupt the document, and retries are always safe.
 */
export class EditorSync {
  private elements = new Map<string, string>()
  private deletes = new Set<string>()
  private pages = new Set<string>()
  private deletedPages = new Set<string>()
  private orderedPages = new Set<string>()
  private pageOrderDirty = false
  private sizeDirty = false
  private timer: ReturnType<typeof setTimeout> | undefined
  private unsubscribe: (() => void) | null = null
  private offlineSince = 0
  awaiting = 0

  private readonly projectId: number
  private readonly send: Send

  constructor(projectId: number, send: Send) {
    this.projectId = projectId
    this.send = send
  }

  start() {
    this.unsubscribe = onLocalChanges((changes) => this.collect(changes))
  }

  stop() {
    this.unsubscribe?.()
    clearTimeout(this.timer)
  }

  get dirty() {
    return this.elements.size + this.deletes.size + this.pages.size + this.deletedPages.size + this.orderedPages.size > 0 || this.pageOrderDirty || this.sizeDirty
  }

  private collect(changes: Change[]) {
    for (const c of changes) {
      switch (c.kind) {
        case 'el':
          if (c.after) {
            this.elements.set(c.id, c.pageId)
            this.deletes.delete(c.id)
          } else {
            this.deletes.add(c.id)
            this.elements.delete(c.id)
          }
          break
        case 'order':
          this.orderedPages.add(c.pageId)
          break
        case 'page':
          if (c.after) {
            this.pages.add(c.id)
            this.deletedPages.delete(c.id)
          } else {
            this.deletedPages.add(c.id)
            this.pages.delete(c.id)
          }
          break
        case 'pageOrder':
          this.pageOrderDirty = true
          break
        case 'size':
          this.sizeDirty = true
          break
      }
    }
    useCollabStore.getState().setSaveState('saving')
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.flush(), FLUSH_DELAY)
  }

  flush() {
    clearTimeout(this.timer)
    if (!this.dirty) return
    const s = useEditorStore.getState()
    const ops: DesignOp[] = []

    for (const id of this.pages) {
      const meta = s.pages[id]
      if (!meta) continue
      ops.push({ type: 'PAGE_UPSERT', page: { id, name: meta.name, background: meta.background, durationSeconds: meta.durationSeconds, notes: meta.notes, position: s.pageIds.indexOf(id) } })
    }
    if (this.pageOrderDirty) ops.push({ type: 'PAGES_ORDER', order: s.pageIds })

    for (const pid of this.orderedPages) for (const id of s.pageElementIds[pid] ?? []) this.elements.set(id, pid)

    const byPage = new Map<string, WireElement[]>()
    for (const [id, pid] of this.elements) {
      const el = s.elements[id]
      if (!el || this.deletedPages.has(pid)) continue
      const z = (s.pageElementIds[pid] ?? []).indexOf(id)
      byPage.set(pid, [...(byPage.get(pid) ?? []), { id, type: el.type, zIndex: Math.max(0, z), data: el.data }])
    }
    for (const [pageId, list] of byPage) {
      for (let i = 0; i < list.length; i += MAX_CHUNK) ops.push({ type: 'ELEMENTS_UPSERT', pageId, elements: list.slice(i, i + MAX_CHUNK) })
    }
    const doomed = [...this.deletes]
    for (let i = 0; i < doomed.length; i += 200) ops.push({ type: 'ELEMENTS_DELETE', ids: doomed.slice(i, i + 200) })
    for (const id of this.deletedPages) ops.push({ type: 'PAGE_DELETE', pageId: id })
    if (this.sizeDirty) ops.push({ type: 'PROJECT_SIZE', width: s.width, height: s.height })

    const sentAll = ops.every((op) => this.send(op))
    if (sentAll) {
      this.awaiting += ops.length
      this.clear()
      this.offlineSince = 0
    } else {
      // Socket is down: keep everything pending and fall back to a full REST save if it stays down.
      useCollabStore.getState().setSaveState('offline')
      this.offlineSince ||= Date.now()
      this.timer = setTimeout(() => (Date.now() - this.offlineSince > 4000 ? void this.restSave() : this.flush()), 1500)
    }
  }

  private async restSave() {
    try {
      await projectApi.saveDesign(this.projectId, stateToDoc(this.projectId, useEditorStore.getState()))
      this.clear()
      this.offlineSince = 0
      useCollabStore.getState().setSaveState('saved')
    } catch {
      useCollabStore.getState().setSaveState('error')
      this.timer = setTimeout(() => this.flush(), 5000)
    }
  }

  private clear() {
    this.elements.clear()
    this.deletes.clear()
    this.pages.clear()
    this.deletedPages.clear()
    this.orderedPages.clear()
    this.pageOrderDirty = false
    this.sizeDirty = false
  }

  acknowledge() {
    this.awaiting = Math.max(0, this.awaiting - 1)
    if (this.awaiting === 0 && !this.dirty) useCollabStore.getState().setSaveState('saved')
  }
}
