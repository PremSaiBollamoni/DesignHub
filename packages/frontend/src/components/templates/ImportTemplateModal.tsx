import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { importTemplateFile } from '@/editor/import/templateImport'
import { errorMessage, toast } from '@/stores/toastStore'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'

interface Row {
  file: File
  status: 'waiting' | 'working' | 'done' | 'failed'
  note?: string
  projectId?: number
}

export function ImportTemplateModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [progress, setProgress] = useState({ fraction: 0, label: '' })
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const [split, setSplit] = useState(true)

  const add = (list: FileList | File[]) =>
    setRows((cur) => [...cur, ...Array.from(list).filter((f) => /^(image\/(png|jpe?g|webp)|application\/pdf)$/.test(f.type)).map((file) => ({ file, status: 'waiting' as const }))])

  async function start() {
    setBusy(true)
    const done: number[] = []
    for (let i = 0; i < rows.length; i++) {
      if (rows[i]!.status === 'done') continue
      setRows((r) => r.map((x, j) => (j === i ? { ...x, status: 'working' } : x)))
      try {
        const { projectId } = await importTemplateFile(rows[i]!.file, rows[i]!.file.name.replace(/\.[^.]+$/, ''), (fraction, label) => setProgress({ fraction, label }), { split })
        done.push(projectId)
        setRows((r) => r.map((x, j) => (j === i ? { ...x, status: 'done', projectId } : x)))
      } catch (e) {
        setRows((r) => r.map((x, j) => (j === i ? { ...x, status: 'failed', note: errorMessage(e) } : x)))
      }
    }
    setBusy(false)
    if (done.length === 1) navigate(`/editor/${done[0]}`)
    else if (done.length > 1) {
      toast.success(`${done.length} templates imported. Find them in your designs.`)
      navigate('/')
    }
  }

  return (
    <Modal
      title="Import a template"
      onClose={onClose}
      locked={busy}
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Close
          </Button>
          <Button variant="primary" loading={busy} disabled={!rows.some((r) => r.status === 'waiting' || r.status === 'failed')} onClick={() => void start()}>
            Make editable
          </Button>
        </>
      }
    >
      <div
        className={`dropzone ${over ? 'is-over' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files) }}
      >
        <Icon name="upload" size={24} />
        <strong>Drop your PDF or image templates here</strong>
        <span style={{ fontSize: 13 }}>PDF, PNG, JPG or WebP. You can add several files at once.</span>
        <input ref={input} type="file" hidden multiple accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => e.target.files && add(e.target.files)} />
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="checkbox" checked={split} onChange={(e) => setSplit(e.target.checked)} disabled={busy} />
        Separate logos, badges and objects into their own layers (needs the ML worker)
      </label>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name={r.status === 'done' ? 'check' : r.status === 'failed' ? 'alert' : 'image'} size={18} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.file.name}</div>
            {r.status === 'working' && (
              <>
                <div className="field__hint">{progress.label}</div>
                <div className="meter__bar" style={{ marginTop: 4 }}><div className="meter__fill" style={{ width: `${progress.fraction * 100}%` }} /></div>
              </>
            )}
            {r.status === 'failed' && <div className="field__error">{r.note}</div>}
          </div>
          {r.status === 'done' && r.projectId && <Button size="sm" onClick={() => navigate(`/editor/${r.projectId}`)}>Open</Button>}
          {r.status === 'waiting' && !busy && <Button size="sm" variant="ghost" onClick={() => setRows(rows.filter((_, j) => j !== i))}>Remove</Button>}
        </div>
      ))}
      <p className="field__hint">
        Text becomes real, editable text boxes. The remaining artwork (logos, photos, shapes) stays as one picture layer you can crop, move or split into layers with the ML worker running.
        Text uses Montserrat; change fonts in the Text panel or your brand kit.
      </p>
    </Modal>
  )
}
