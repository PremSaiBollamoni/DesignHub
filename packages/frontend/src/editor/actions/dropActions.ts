import { DRAG_MIME, insertAsset, uploadAndInsert, type AssetPayload } from './assetActions'

/** Handles anything dropped on the canvas: panel items carry a payload, desktop files are uploaded first. */
export async function dropOntoCanvas(dt: DataTransfer, point: { x: number; y: number }): Promise<void> {
  const raw = dt.getData(DRAG_MIME)
  if (raw) {
    try {
      await insertAsset(JSON.parse(raw) as AssetPayload, point)
    } catch {
      /* malformed payloads are ignored */
    }
    return
  }
  const files = Array.from(dt.files).filter((f) => /^(image|video|audio)\//.test(f.type))
  if (files.length) await uploadAndInsert(files, point)
}

/** Makes a panel item draggable onto the canvas while keeping click-to-add working. */
export function dragProps(payload: AssetPayload) {
  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload))
      e.dataTransfer.effectAllowed = 'copy'
    },
  }
}
