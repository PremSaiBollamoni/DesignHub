import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { DesignElement } from '@/models/design'
import { updateElements } from '@/editor/actions/elementActions'
import { useEditorStore } from '@/stores/editorStore'

export function useSelectedElements(): DesignElement[] {
  return useEditorStore(useShallow((s) => s.selection.map((id) => s.elements[id]).filter((e): e is DesignElement => !!e)))
}

/** Returns a patch function that applies to the whole selection and merges rapid edits (sliders, typing) into one undo step. */
export function useApply(ids: string[]) {
  return useCallback(
    (patch: Partial<DesignElement['data']> | ((el: DesignElement) => Partial<DesignElement['data']>), key?: string) =>
      updateElements(ids, patch, { coalesceKey: key ? `prop-${key}` : undefined }),
    [ids],
  )
}
