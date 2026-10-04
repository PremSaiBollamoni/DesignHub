import { useRef, useState } from 'react'
import { FORMAT_INFO, runExport, type ExportFormat } from '@/services/export'
import { useEditorStore } from '@/stores/editorStore'
import { errorMessage, toast } from '@/stores/toastStore'
import { downloadBlob, safeFileName } from '@/utils/common'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextField } from '@/components/ui/Fields'

const ORDER: ExportFormat[] = ['png', 'jpg', 'pdf', 'svg', 'zip', 'gif', 'mp4']

export function ExportModal({ onClose }: { onClose: () => void }) {
  const title = useEditorStore((s) => s.title)
  const pageCount = useEditorStore((s) => s.pageIds.length)
  const [format, setFormat] = useState<ExportFormat>('png')
  const [scope, setScope] = useState<'current' | 'all'>(pageCount > 1 ? 'all' : 'current')
  const [scale, setScale] = useState(1)
  const [quality, setQuality] = useState(0.92)
  const [fps, setFps] = useState(15)
  const [name, setName] = useState(safeFileName(title))
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ fraction: number; label: string } | null>(null)
  const abort = useRef<AbortController | null>(null)

  const animated = !!FORMAT_INFO[format].animated
  const pageScoped = format !== 'zip'
  const usesScale = format === 'png' || format === 'jpg' || format === 'pdf' || format === 'zip' || animated
  const usesQuality = format === 'jpg' || format === 'pdf'

  async function start() {
    setBusy(true)
    const c = new AbortController()
    abort.current = c
    try {
      const result = await runExport({
        format,
        scope: format === 'zip' ? 'all' : scope,
        scale,
        quality,
        fps,
        fileName: safeFileName(name),
        signal: c.signal,
        onProgress: (fraction, label) => setProgress({ fraction, label }),
      })
      downloadBlob(result.blob, result.fileName)
      toast.success(`Exported ${result.fileName}`)
      onClose()
    } catch (e) {
      if ((e as Error).name === 'AbortError') toast.info('Export cancelled')
      else toast.error(errorMessage(e))
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <Modal
      title="Export"
      onClose={onClose}
      locked={busy}
      wide
      footer={
        busy ? (
          <Button onClick={() => abort.current?.abort()}>Cancel export</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button variant="primary" icon="download" onClick={() => void start()} disabled={!name.trim()}>
              Export {FORMAT_INFO[format].label}
            </Button>
          </>
        )
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8 }}>
        {ORDER.map((f) => (
          <button key={f} className="chip" aria-pressed={format === f} onClick={() => setFormat(f)} disabled={busy} style={{ height: 'auto', padding: '10px 14px', borderRadius: 12, display: 'grid', textAlign: 'left', gap: 2, whiteSpace: 'normal' }}>
            <strong>{FORMAT_INFO[f].label}</strong>
            <span style={{ fontSize: 12, opacity: 0.75 }}>{FORMAT_INFO[f].hint}</span>
          </button>
        ))}
      </div>
      <TextField label="File name" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
      {pageCount > 1 && pageScoped && (
        <div className="field">
          <span className="field__label">Pages</span>
          <div className="seg" role="group" aria-label="Pages to export" style={{ width: 'fit-content' }}>
            <button aria-pressed={scope === 'current'} style={{ width: 'auto', padding: '0 14px' }} onClick={() => setScope('current')} disabled={busy}>
              This page
            </button>
            <button aria-pressed={scope === 'all'} style={{ width: 'auto', padding: '0 14px' }} onClick={() => setScope('all')} disabled={busy}>
              All {pageCount} pages
            </button>
          </div>
        </div>
      )}
      {usesScale && (
        <div className="field">
          <span className="field__label">Size</span>
          <div className="seg" role="group" aria-label="Export size" style={{ width: 'fit-content' }}>
            {[1, 2, 3].map((n) => (
              <button key={n} aria-pressed={scale === n} style={{ width: 'auto', padding: '0 14px' }} onClick={() => setScale(n)} disabled={busy}>
                {n}×
              </button>
            ))}
          </div>
          {animated && <span className="field__hint">Animated exports are capped at {format === 'gif' ? '720' : '1920'} px on the long side.</span>}
        </div>
      )}
      {usesQuality && (
        <div className="field">
          <label className="field__label" htmlFor="q">
            Quality {Math.round(quality * 100)}%
          </label>
          <input id="q" className="range" type="range" min={0.5} max={1} step={0.01} value={quality} onChange={(e) => setQuality(Number(e.target.value))} disabled={busy} />
        </div>
      )}
      {animated && (
        <div className="field">
          <label className="field__label" htmlFor="fps">
            Frames per second: {fps}
          </label>
          <input id="fps" className="range" type="range" min={8} max={format === 'gif' ? 20 : 30} step={1} value={fps} onChange={(e) => setFps(Number(e.target.value))} disabled={busy} />
          <span className="field__hint">Each page plays for its page length. Set it in the timeline.</span>
        </div>
      )}
      {progress && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span>{progress.label}</span>
            <span>{Math.round(progress.fraction * 100)}%</span>
          </div>
          <div className="meter__bar" role="progressbar" aria-valuenow={Math.round(progress.fraction * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Export progress">
            <div className="meter__fill" style={{ width: `${progress.fraction * 100}%` }} />
          </div>
        </div>
      )}
    </Modal>
  )
}
