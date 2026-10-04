import { useEffect, useState } from 'react'
import type { BrandColor, BrandFont, BrandKit } from '@/models/api'
import { contentApi } from '@/services/api/contentApi'
import { selectActiveKit, useBrandStore } from '@/stores/brandStore'
import { errorMessage, toast } from '@/stores/toastStore'
import { Button, IconButton } from '@/components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { TextAreaField, TextField } from '@/components/ui/Fields'
import { Icon } from '@/components/ui/Icon'
import { confirmDialog } from '@/components/ui/confirm'
import { FONT_FAMILIES, loadFont, weightsFor, WEIGHT_NAMES } from '@/services/assets/fonts'
import { formatBytes } from '@/utils/common'
import './brand.css'

const FONT_ROLES = ['Heading', 'Subheading', 'Body']

export default function BrandHubActivity() {
  const { kits, loaded, load, setActive, create, save, remove, refresh } = useBrandStore()
  const active = useBrandStore(selectActiveKit)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load().catch((e) => setError(errorMessage(e)))
  }, [load])

  async function addKit() {
    try {
      await create({
        name: kits.length ? `Brand kit ${kits.length + 1}` : 'My brand',
        colors: [
          { name: 'Primary', hex: '#FF5A36' },
          { name: 'Accent', hex: '#FFB547' },
          { name: 'Ink', hex: '#151515' },
        ],
        fonts: [
          { role: 'Heading', family: 'Bricolage Grotesque', weight: 800 },
          { role: 'Body', family: 'Inter Tight', weight: 400 },
        ],
        guidelines: '',
      })
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => location.reload()} />
  if (!loaded) return <Skeleton height={320} radius={16} />

  return (
    <div className="page__inner">
      <div className="page__head">
        <div>
          <h1>Brand hub</h1>
          <p>Keep colors, fonts and logos in one place. They appear inside the editor.</p>
        </div>
        <Button variant="primary" icon="plus" onClick={() => void addKit()}>
          New brand kit
        </Button>
      </div>

      {!kits.length || !active ? (
        <EmptyState
          icon="brand"
          title="Set up your first brand kit"
          message="Add your colors, fonts and logos once, then use them on every design."
          action={
            <Button variant="primary" onClick={() => void addKit()}>
              Create brand kit
            </Button>
          }
        />
      ) : (
        <>
          <div className="folders">
            {kits.map((k) => (
              <button key={k.id} className="chip" aria-pressed={k.id === active.id} onClick={() => setActive(k.id)}>
                {k.name}
              </button>
            ))}
          </div>
          <KitEditor
            key={active.id}
            kit={active}
            onSave={async (data) => {
              await save(active.id, data)
              toast.success('Brand kit saved')
            }}
            onDelete={async () => {
              const ok = await confirmDialog({
                title: `Delete "${active.name}"?`,
                message: 'Its colors, fonts and uploaded logos will be removed.',
                confirmLabel: 'Delete brand kit',
                danger: true,
              })
              if (ok) await remove(active.id)
            }}
            onAssetsChanged={refresh}
          />
        </>
      )}
    </div>
  )
}

interface KitEditorProps {
  kit: BrandKit
  onSave: (data: Pick<BrandKit, 'name' | 'colors' | 'fonts' | 'guidelines'>) => Promise<void>
  onDelete: () => Promise<void>
  onAssetsChanged: () => Promise<void>
}

function KitEditor({ kit, onSave, onDelete, onAssetsChanged }: KitEditorProps) {
  const [name, setName] = useState(kit.name)
  const [colors, setColors] = useState<BrandColor[]>(kit.colors)
  const [fonts, setFonts] = useState<BrandFont[]>(kit.fonts)
  const [guidelines, setGuidelines] = useState(kit.guidelines ?? '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fonts.forEach((f) => void loadFont(f.family, [f.weight]))
  }, [fonts])

  async function submit() {
    setSaving(true)
    try {
      await onSave({ name: name.trim() || 'Brand kit', colors, fonts, guidelines })
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  async function addLogos(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) await contentApi.upload(file, file.name, { kind: 'logo', brandKitId: kit.id })
      await onAssetsChanged()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="brand-grid">
      <section className="card brand-card">
        <h2>Identity</h2>
        <TextField label="Kit name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        <TextAreaField
          label="Guidelines"
          hint="Tone of voice, spacing rules, what to avoid."
          value={guidelines}
          onChange={(e) => setGuidelines(e.target.value)}
          maxLength={8000}
          rows={5}
        />
      </section>

      <section className="card brand-card">
        <div className="brand-card__head">
          <h2>Colors</h2>
          <Button size="sm" icon="plus" onClick={() => setColors([...colors, { name: `Color ${colors.length + 1}`, hex: '#888888' }])}>
            Add color
          </Button>
        </div>
        <div className="swatches">
          {colors.map((c, i) => (
            <div key={i} className="swatch">
              <label className="swatch__chip" style={{ background: c.hex }}>
                <input
                  type="color"
                  aria-label={`Pick color for ${c.name}`}
                  value={c.hex}
                  onChange={(e) => setColors(colors.map((x, j) => (j === i ? { ...x, hex: e.target.value.toUpperCase() } : x)))}
                />
              </label>
              <input
                className="input input--sm"
                aria-label="Color name"
                value={c.name}
                maxLength={40}
                onChange={(e) => setColors(colors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              />
              <span className="swatch__hex">{c.hex}</span>
              <IconButton icon="close" size="sm" label={`Remove ${c.name}`} onClick={() => setColors(colors.filter((_, j) => j !== i))} />
            </div>
          ))}
        </div>
      </section>

      <section className="card brand-card">
        <div className="brand-card__head">
          <h2>Fonts</h2>
          <Button size="sm" icon="plus" disabled={fonts.length >= 6} onClick={() => setFonts([...fonts, { role: 'Body', family: 'Inter Tight', weight: 400 }])}>
            Add font
          </Button>
        </div>
        {fonts.map((f, i) => (
          <div key={i} className="font-row">
            <select className="select select--sm" aria-label="Role" value={f.role} onChange={(e) => setFonts(fonts.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}>
              {FONT_ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <select
              className="select select--sm"
              aria-label="Font family"
              value={f.family}
              onChange={(e) => setFonts(fonts.map((x, j) => (j === i ? { ...x, family: e.target.value, weight: weightsFor(e.target.value)[0]! } : x)))}
            >
              {FONT_FAMILIES.map((ff) => (
                <option key={ff.family}>{ff.family}</option>
              ))}
            </select>
            <select className="select select--sm" aria-label="Weight" value={f.weight} onChange={(e) => setFonts(fonts.map((x, j) => (j === i ? { ...x, weight: Number(e.target.value) } : x)))}>
              {weightsFor(f.family).map((w) => (
                <option key={w} value={w}>
                  {WEIGHT_NAMES[w] ?? w}
                </option>
              ))}
            </select>
            <IconButton icon="close" size="sm" label="Remove font" onClick={() => setFonts(fonts.filter((_, j) => j !== i))} />
            <p className="font-sample" style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight }}>
              The quick brown fox jumps over the lazy dog
            </p>
          </div>
        ))}
      </section>

      <section className="card brand-card">
        <div className="brand-card__head">
          <h2>Logos and brand assets</h2>
          <label className={`btn btn--sm ${uploading ? 'is-disabled' : ''}`}>
            <Icon name="upload" size={15} />
            {uploading ? 'Uploading…' : 'Upload'}
            <input type="file" className="sr-only" accept="image/*" multiple disabled={uploading} onChange={(e) => void addLogos(e.target.files)} />
          </label>
        </div>
        {kit.assets.length === 0 ? (
          <p style={{ color: 'var(--ink-2)' }}>No logos yet. Upload PNG, SVG or JPG files and they will show in the editor’s Brand tab.</p>
        ) : (
          <div className="logo-grid">
            {kit.assets.map((a) => (
              <figure key={a.id} className="logo-tile">
                <img src={a.url} alt={a.fileName} />
                <figcaption>
                  {a.fileName} · {formatBytes(a.sizeBytes)}
                </figcaption>
                <IconButton
                  icon="trash"
                  size="sm"
                  label={`Delete ${a.fileName}`}
                  onClick={async () => {
                    try {
                      await contentApi.deleteUpload(a.id)
                      await onAssetsChanged()
                    } catch (e) {
                      toast.error(errorMessage(e))
                    }
                  }}
                />
              </figure>
            ))}
          </div>
        )}
      </section>

      <div className="brand-actions">
        <Button variant="danger" icon="trash" onClick={() => void onDelete()}>
          Delete kit
        </Button>
        <Button variant="primary" loading={saving} onClick={() => void submit()}>
          Save brand kit
        </Button>
      </div>
    </div>
  )
}
