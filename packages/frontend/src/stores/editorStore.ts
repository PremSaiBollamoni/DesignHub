import { create } from 'zustand'
import type { Access } from '@/models/api'
import type { DesignDocument, DesignElement } from '@/models/design'
import { applyChanges, invertChanges, type Change, type DocState } from '@/editor/model/changes'
import { docToState } from '@/editor/model/wire'

export type ChangeSource = 'local' | 'undo' | 'redo'
type Listener = (changes: Change[], source: ChangeSource) => void

interface HistoryEntry {
  changes: Change[]
  key?: string
  at: number
}

const HISTORY_LIMIT = 200
const COALESCE_MS = 900
const listeners = new Set<Listener>()

/** Collaboration/persistence subscribe here; remote applications are deliberately not announced. */
export function onLocalChanges(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

interface EditorState extends DocState {
  loaded: boolean
  projectId: number
  title: string
  access: Access
  currentPageId: string
  selection: string[]
  undoStack: HistoryEntry[]
  redoStack: HistoryEntry[]

  load: (doc: DesignDocument, meta: { title: string; access: Access }) => void
  reset: () => void
  setTitle: (title: string) => void
  setCurrentPage: (id: string) => void
  select: (ids: string[], opts?: { additive?: boolean; exact?: boolean }) => void
  commit: (changes: Change[], opts?: { coalesceKey?: string; record?: boolean }) => void
  /** Silent patch (no history, no sync) for derived values such as measured text height. */
  patchSilently: (id: string, data: Partial<DesignElement['data']>) => void
  undo: () => void
  redo: () => void
  applyRemote: (changes: Change[]) => void
  replaceDocument: (doc: DesignDocument) => void
}

const empty: DocState = { width: 1080, height: 1080, pageIds: [], pages: {}, pageElementIds: {}, elements: {} }

function mergeChanges(prev: Change[], next: Change[]): Change[] {
  const out = [...prev]
  for (const c of next) {
    if (c.kind === 'el') {
      const i = out.findIndex((p) => p.kind === 'el' && p.id === c.id)
      if (i >= 0) {
        const p = out[i] as Extract<Change, { kind: 'el' }>
        out[i] = { ...p, after: c.after }
        continue
      }
    }
    out.push(c)
  }
  return out
}

function expandGroups(ids: string[], state: DocState, pageId: string): string[] {
  const result = new Set(ids)
  const groups = new Set<string>()
  for (const id of ids) {
    const g = state.elements[id]?.data.groupId
    if (g) groups.add(g)
  }
  if (groups.size) {
    for (const id of state.pageElementIds[pageId] ?? []) {
      const g = state.elements[id]?.data.groupId
      if (g && groups.has(g)) result.add(id)
    }
  }
  return [...result]
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  ...empty,
  loaded: false,
  projectId: 0,
  title: '',
  access: 'VIEWER',
  currentPageId: '',
  selection: [],
  undoStack: [],
  redoStack: [],

  load: (doc, meta) => {
    const s = docToState(doc)
    set({
      ...s,
      loaded: true,
      projectId: doc.projectId,
      title: meta.title,
      access: meta.access,
      currentPageId: s.pageIds[0] ?? '',
      selection: [],
      undoStack: [],
      redoStack: [],
    })
  },

  reset: () => set({ ...empty, loaded: false, projectId: 0, title: '', currentPageId: '', selection: [], undoStack: [], redoStack: [] }),

  setTitle: (title) => set({ title }),

  setCurrentPage: (id) => {
    if (get().pages[id]) set({ currentPageId: id, selection: [] })
  },

  select: (ids, opts) => {
    const s = get()
    const valid = ids.filter((id) => s.elements[id] && (s.pageElementIds[s.currentPageId] ?? []).includes(id))
    const expanded = opts?.exact ? valid : expandGroups(valid, s, s.currentPageId)
    if (opts?.additive) {
      const cur = new Set(s.selection)
      const allIn = expanded.every((id) => cur.has(id))
      expanded.forEach((id) => (allIn ? cur.delete(id) : cur.add(id)))
      set({ selection: [...cur] })
    } else {
      set({ selection: expanded })
    }
  },

  commit: (changes, opts) => {
    if (!changes.length) return
    const s = get()
    const patch = applyChanges(s, changes, 'redo')
    const selection = s.selection.filter((id) => patch.elements?.[id])
    let undoStack = s.undoStack
    if (opts?.record !== false) {
      const last = undoStack[undoStack.length - 1]
      const now = Date.now()
      if (opts?.coalesceKey && last?.key === opts.coalesceKey && now - last.at < COALESCE_MS) {
        undoStack = [...undoStack.slice(0, -1), { changes: mergeChanges(last.changes, changes), key: last.key, at: now }]
      } else {
        undoStack = [...undoStack, { changes, key: opts?.coalesceKey, at: now }].slice(-HISTORY_LIMIT)
      }
    }
    const currentPageId = patch.pages?.[s.currentPageId] ? s.currentPageId : (patch.pageIds?.[0] ?? '')
    set({ ...patch, selection, undoStack, redoStack: opts?.record === false ? s.redoStack : [], currentPageId })
    listeners.forEach((l) => l(changes, 'local'))
  },

  patchSilently: (id, data) => {
    const el = get().elements[id]
    if (!el) return
    set({ elements: { ...get().elements, [id]: { ...el, data: { ...el.data, ...data } } as DesignElement } })
  },

  undo: () => {
    const s = get()
    const entry = s.undoStack[s.undoStack.length - 1]
    if (!entry) return
    const patch = applyChanges(s, entry.changes, 'undo')
    const currentPageId = patch.pages?.[s.currentPageId] ? s.currentPageId : (patch.pageIds?.[0] ?? '')
    set({
      ...patch,
      currentPageId,
      selection: s.selection.filter((id) => patch.elements?.[id]),
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, entry],
    })
    listeners.forEach((l) => l(invertChanges(entry.changes), 'undo'))
  },

  redo: () => {
    const s = get()
    const entry = s.redoStack[s.redoStack.length - 1]
    if (!entry) return
    const patch = applyChanges(s, entry.changes, 'redo')
    set({
      ...patch,
      selection: s.selection.filter((id) => patch.elements?.[id]),
      redoStack: s.redoStack.slice(0, -1),
      undoStack: [...s.undoStack, entry],
    })
    listeners.forEach((l) => l(entry.changes, 'redo'))
  },

  applyRemote: (changes) => {
    const s = get()
    const patch = applyChanges(s, changes, 'redo')
    const currentPageId = patch.pages?.[s.currentPageId] ? s.currentPageId : (patch.pageIds?.[0] ?? '')
    set({ ...patch, currentPageId, selection: s.selection.filter((id) => patch.elements?.[id]) })
  },

  replaceDocument: (doc) => {
    const s = docToState(doc)
    const keep = get().currentPageId
    set({ ...s, currentPageId: s.pages[keep] ? keep : (s.pageIds[0] ?? ''), selection: [], undoStack: [], redoStack: [] })
  },
}))

export const selectCurrentElementIds = (s: EditorState) => s.pageElementIds[s.currentPageId]
