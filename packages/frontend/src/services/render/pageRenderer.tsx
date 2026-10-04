import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { Layer, Stage } from 'react-konva'
import type Konva from 'konva'
import { parseBackground, type DesignElement } from '@/models/design'
import { StaticPageScene } from '@/components/editor/canvas/PageScene'
import { loadFont } from '@/services/assets/fonts'
import { loadImage, loadVideoFrame, svgToDataUrl, tintSvg, whenImagesIdle } from './imageCache'

export interface RenderablePage {
  background: string
  elements: DesignElement[]
}

export interface RenderOptions {
  width: number
  height: number
  pixelRatio?: number
  /** Animation time in seconds; null renders the finished layout. */
  time?: number | null
  /** Seconds used to pick a video still. */
  videoTime?: number
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

/** Loads everything a page needs so the first paint is already final. */
export async function preparePage(page: RenderablePage, videoTime = 0): Promise<void> {
  const jobs: Promise<unknown>[] = []
  const bg = parseBackground(page.background)
  if (bg.type === 'image') jobs.push(loadImage(bg.src).catch(() => null))
  for (const e of page.elements) {
    if (e.data.hidden) continue
    if (e.type === 'text') jobs.push(loadFont(e.data.fontFamily, [e.data.fontWeight], !!e.data.italic))
    else if (e.type === 'table') jobs.push(loadFont(e.data.fontFamily, [400, 700]))
    else if (e.type === 'chart') jobs.push(loadFont(e.data.fontFamily, [400]))
    else if (e.type === 'image') jobs.push(loadImage(e.data.src).catch(() => null))
    else if (e.type === 'frame' && e.data.src) jobs.push(loadImage(e.data.src).catch(() => null))
    else if (e.type === 'icon') jobs.push(loadImage(svgToDataUrl(tintSvg(e.data.svg, e.data.fill))).catch(() => null))
    else if (e.type === 'video') jobs.push(loadVideoFrame(e.data.src, videoTime + (e.data.trimStart ?? 0)).catch(() => null))
  }
  await Promise.all(jobs)
}

/** Mounts the exact same scene the editor draws into a detached stage and returns the pixels. */
export class PageRenderer {
  private host: HTMLDivElement
  private root: ReturnType<typeof createRoot>
  private stage: Konva.Stage | null = null

  constructor() {
    this.host = document.createElement('div')
    this.host.style.cssText = 'position:fixed;left:-100000px;top:0;pointer-events:none;'
    document.body.appendChild(this.host)
    this.root = createRoot(this.host)
  }

  async render(page: RenderablePage, o: RenderOptions): Promise<HTMLCanvasElement> {
    await preparePage(page, o.videoTime ?? o.time ?? 0)
    flushSync(() =>
      this.root.render(
        <Stage width={o.width} height={o.height} ref={(s) => { this.stage = s }}>
          <Layer>
            <StaticPageScene background={page.background} elements={page.elements} width={o.width} height={o.height} time={o.time ?? null} seekMedia={o.videoTime ?? o.time ?? 0} />
          </Layer>
        </Stage>,
      ),
    )
    await nextFrame()
    await whenImagesIdle()
    await nextFrame()
    this.stage!.draw()
    return this.stage!.toCanvas({ pixelRatio: o.pixelRatio ?? 1 })
  }

  dispose() {
    this.root.unmount()
    this.host.remove()
  }
}

/** One-shot helper for thumbnails and single exports. */
export async function renderPageCanvas(page: RenderablePage, o: RenderOptions): Promise<HTMLCanvasElement> {
  const r = new PageRenderer()
  try {
    return await r.render(page, o)
  } finally {
    r.dispose()
  }
}

export async function renderThumbnail(page: RenderablePage, width: number, height: number, maxSide = 360): Promise<string> {
  const ratio = Math.min(1, maxSide / Math.max(width, height))
  const canvas = await renderPageCanvas(page, { width, height, pixelRatio: ratio })
  return canvas.toDataURL('image/jpeg', 0.72)
}
