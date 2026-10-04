import { create } from 'zustand'

export type LeftPanel =
  | 'templates'
  | 'elements'
  | 'text'
  | 'uploads'
  | 'photos'
  | 'gifs'
  | 'illustrations'
  | 'animations'
  | 'magic'
  | 'brand'
  | null

export type RightTab = 'design' | 'layers' | 'comments' | 'history'

interface EditorUiState {
  leftPanel: LeftPanel
  rightTab: RightTab
  rightOpen: boolean
  zoom: number
  panX: number
  panY: number
  /** When true the next layout pass re-fits the page into view. */
  autoFit: boolean
  snapping: boolean
  showGrid: boolean
  drawing: boolean
  eraserId: string | null
  notesOpen: boolean
  showRulers: boolean
  guides: { x: number[]; y: number[] }
  brush: { color: string; size: number }
  contextMenu: { x: number; y: number } | null
  timelineOpen: boolean
  presenting: boolean
  editingTextId: string | null
  croppingId: string | null
  /** Seconds into the current page while previewing animations; null means static editing view. */
  playhead: number | null
  playing: boolean
  setLeftPanel: (p: LeftPanel) => void
  toggleLeftPanel: (p: Exclude<LeftPanel, null>) => void
  setRightTab: (t: RightTab) => void
  setRightOpen: (open: boolean) => void
  setView: (v: { zoom?: number; panX?: number; panY?: number; autoFit?: boolean }) => void
  setSnapping: (v: boolean) => void
  setShowGrid: (v: boolean) => void
  setDrawing: (v: boolean) => void
  setEraser: (id: string | null) => void
  setNotesOpen: (v: boolean) => void
  setShowRulers: (v: boolean) => void
  setGuides: (g: { x: number[]; y: number[] }) => void
  setBrush: (b: Partial<{ color: string; size: number }>) => void
  setContextMenu: (m: { x: number; y: number } | null) => void
  setTimelineOpen: (v: boolean) => void
  setPresenting: (v: boolean) => void
  setEditingText: (id: string | null) => void
  setCropping: (id: string | null) => void
  setPlayhead: (t: number | null, playing?: boolean) => void
}

export const useEditorUiStore = create<EditorUiState>((set, get) => ({
  leftPanel: 'templates',
  rightTab: 'design',
  rightOpen: true,
  zoom: 0.5,
  panX: 0,
  panY: 0,
  autoFit: true,
  snapping: true,
  showGrid: false,
  drawing: false,
  eraserId: null,
  notesOpen: false,
  showRulers: true,
  guides: { x: [], y: [] },
  brush: { color: '#151515', size: 8 },
  contextMenu: null,
  timelineOpen: false,
  presenting: false,
  editingTextId: null,
  croppingId: null,
  playhead: null,
  playing: false,
  setLeftPanel: (p) => set({ leftPanel: p }),
  toggleLeftPanel: (p) => set({ leftPanel: get().leftPanel === p ? null : p }),
  setRightTab: (t) => set({ rightTab: t, rightOpen: true }),
  setRightOpen: (open) => set({ rightOpen: open }),
  setView: (v) => set(v),
  setSnapping: (v) => set({ snapping: v }),
  setShowGrid: (v) => set({ showGrid: v }),
  setDrawing: (drawing) => set({ drawing }),
  setEraser: (eraserId) => set({ eraserId }),
  setNotesOpen: (notesOpen) => set({ notesOpen }),
  setShowRulers: (showRulers) => set({ showRulers }),
  setGuides: (guides) => set({ guides }),
  setBrush: (b) => set({ brush: { ...get().brush, ...b } }),
  setContextMenu: (contextMenu) => set({ contextMenu }),
  setTimelineOpen: (v) => set({ timelineOpen: v }),
  setPresenting: (v) => set({ presenting: v }),
  setEditingText: (id) => set({ editingTextId: id }),
  setCropping: (id) => set({ croppingId: id }),
  setPlayhead: (t, playing) => set({ playhead: t, playing: playing ?? get().playing }),
}))
