import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ProjectSummary } from '@/models/api'
import { projectApi } from '@/services/api/projectApi'
import { useProjectStore } from '@/stores/projectStore'
import { errorMessage, toast } from '@/stores/toastStore'
import { confirmDialog } from '@/components/ui/confirm'
import type { ProjectCardActions } from './ProjectCard'

interface Hooks {
  onRename: (p: ProjectSummary) => void
  onMove: (p: ProjectSummary) => void
}

/** Maps every card action to its API call and keeps the list in sync without a full reload. */
export function useProjectActions({ onRename, onMove }: Hooks): ProjectCardActions {
  const navigate = useNavigate()
  const { patchItem, removeItem, load } = useProjectStore.getState()

  return useMemo<ProjectCardActions>(() => {
    const run = async (fn: () => Promise<void>) => {
      try {
        await fn()
      } catch (e) {
        toast.error(errorMessage(e))
      }
    }
    return {
      open: (p) => navigate(`/editor/${p.id}`),
      rename: onRename,
      move: onMove,
      duplicate: (p) =>
        run(async () => {
          await projectApi.duplicate(p.id)
          toast.success(`Duplicated "${p.title}"`)
          await load()
        }),
      favorite: (p) =>
        run(async () => {
          patchItem(p.id, { favorite: !p.favorite })
          try {
            await projectApi.favorite(p.id)
          } catch (e) {
            patchItem(p.id, { favorite: p.favorite })
            throw e
          }
        }),
      trash: (p) =>
        run(async () => {
          await projectApi.trash(p.id)
          removeItem(p.id)
          toast.success('Moved to trash')
        }),
      restore: (p) =>
        run(async () => {
          await projectApi.restore(p.id)
          removeItem(p.id)
          toast.success(`Restored "${p.title}"`)
        }),
      deleteForever: (p) =>
        run(async () => {
          const ok = await confirmDialog({
            title: 'Delete forever?',
            message: `"${p.title}" and its version history will be permanently deleted. This cannot be undone.`,
            confirmLabel: 'Delete forever',
            danger: true,
          })
          if (!ok) return
          await projectApi.deleteForever(p.id)
          removeItem(p.id)
          toast.success('Design deleted')
        }),
    }
  }, [navigate, onRename, onMove, patchItem, removeItem, load])
}
