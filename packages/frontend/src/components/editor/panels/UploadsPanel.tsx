import { useCallback, useEffect, useRef, useState } from 'react'
import type { AssetFile } from '@/models/api'
import { contentApi } from '@/services/api/contentApi'
import { insertAsset, uploadAndInsert } from '@/editor/actions/assetActions'
import { dragProps } from '@/editor/actions/dropActions'
import { errorMessage, toast } from '@/stores/toastStore'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Feedback'
import { Tabs } from '@/components/ui/Fields'
import { PanelShell } from './PanelShell'

type Kind = 'image' | 'video' | 'audio'

export function UploadsPanel() {
  const [kind, setKind] = useState<Kind>('image')
  const [files, setFiles] = useState<AssetFile[] | null>(null)
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      setFiles(await contentApi.uploads(kind))
    } catch (e) {
      toast.error(errorMessage(e))
      setFiles([])
    }
  }, [kind])
  useEffect(() => {
    setFiles(null)
    void load()
  }, [load])

  async function add(list: FileList | File[]) {
    await uploadAndInsert(Array.from(list))
    await load()
  }

  async function place(f: AssetFile) {
    if (f.kind === 'image') await insertAsset({ kind: 'image', url: f.url, width: f.width, height: f.height })
    else if (f.kind === 'video') {
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.src = f.url
      v.onloadedmetadata = () => void insertAsset({ kind: 'video', url: f.url, width: v.videoWidth, height: v.videoHeight, duration: v.duration })
    } else await insertAsset({ kind: 'audio', url: f.url, title: f.fileName.replace(/\.[^.]+$/, '') })
  }

  return (
    <PanelShell title="Uploads">
      <div
        className={`dropzone ${over ? 'is-over' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          void add(e.dataTransfer.files)
        }}
      >
        <Icon name="upload" size={22} />
        <strong>Upload files</strong>
        <span style={{ fontSize: 12 }}>Drop images, videos or audio here, or click to browse</span>
        <input ref={input} type="file" multiple hidden accept="image/*,video/mp4,video/webm,audio/*" onChange={(e) => e.target.files && void add(e.target.files)} />
      </div>
      <Tabs<Kind> value={kind} onChange={setKind} tabs={[{ id: 'image', label: 'Images' }, { id: 'video', label: 'Videos' }, { id: 'audio', label: 'Audio' }]} />
      {files === null ? (
        <div className="tile-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height={90} />
          ))}
        </div>
      ) : files.length === 0 ? (
        <p className="help">Nothing uploaded yet.</p>
      ) : (
        <div className="tile-grid tile-grid--2">
          {files.map((f) => (
            <div key={f.id} style={{ position: 'relative' }}>
              <button
                className="tile tile--img"
                style={{ width: '100%' }}
                title={f.fileName}
                onClick={() => void place(f)}
                {...(f.kind === 'image' ? dragProps({ kind: 'image', url: f.url, width: f.width, height: f.height }) : {})}
              >
                {f.kind === 'image' ? <img src={f.url} alt={f.fileName} loading="lazy" /> : f.kind === 'video' ? <video src={f.url} muted preload="metadata" /> : <Icon name="audio" size={28} />}
              </button>
              <span style={{ position: 'absolute', top: 4, right: 4 }}>
                <IconButton
                  icon="trash"
                  size="sm"
                  label={`Delete ${f.fileName}`}
                  style={{ background: 'var(--paper)' }}
                  onClick={async () => {
                    try {
                      await contentApi.deleteUpload(f.id)
                      setFiles((cur) => cur?.filter((x) => x.id !== f.id) ?? null)
                    } catch (e) {
                      toast.error(errorMessage(e))
                    }
                  }}
                />
              </span>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  )
}
