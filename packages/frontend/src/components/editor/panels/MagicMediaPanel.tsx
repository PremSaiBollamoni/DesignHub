import { useState } from 'react'
import { Link } from 'react-router-dom'
import { aiApi } from '@/services/api/aiApi'
import { insertAsset } from '@/editor/actions/assetActions'
import { insertElements } from '@/editor/actions/elementActions'
import { createText } from '@/editor/model/defaults'
import { selectActiveKit, useBrandStore } from '@/stores/brandStore'
import { useEditorStore } from '@/stores/editorStore'
import { errorMessage, toast } from '@/stores/toastStore'
import type { Change } from '@/editor/model/changes'
import type { DesignElement } from '@/models/design'
import { uid } from '@/utils/common'
import { Button } from '@/components/ui/Button'
import { Tabs, TextAreaField } from '@/components/ui/Fields'
import { PanelShell } from './PanelShell'

type Mode = 'layout' | 'image' | 'copy'

export function MagicMediaPanel() {
  const [mode, setMode] = useState<Mode>('layout')
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [noProvider, setNoProvider] = useState(false)
  const kit = useBrandStore(selectActiveKit)

  const hints: Record<Mode, { label: string; placeholder: string; action: string }> = {
    layout: { label: 'Describe the design', placeholder: 'A bold launch announcement for a new running shoe', action: 'Design a page' },
    image: { label: 'Describe the picture', placeholder: 'A watercolor of a quiet harbor at sunrise', action: 'Generate image' },
    copy: { label: 'What should the text say?', placeholder: 'A friendly headline for a bakery’s weekend special', action: 'Write text' },
  }

  async function run() {
    const s = useEditorStore.getState()
    setBusy(true)
    setNoProvider(false)
    try {
      if (mode === 'image') {
        const asset = await aiApi.image(prompt, Math.min(s.width, 2048), Math.min(s.height, 2048))
        await insertAsset({ kind: 'image', url: asset.url, width: asset.width, height: asset.height })
      } else if (mode === 'copy') {
        const { text } = await aiApi.text(prompt)
        insertElements([createText({ cx: s.width / 2, cy: s.height / 2 }, 'subheading', { text: text.trim() })])
      } else {
        const brand = kit ? `Colors ${kit.colors.map((c) => c.hex).join(', ')}. Fonts ${kit.fonts.map((f) => f.family).join(', ')}.` : undefined
        const layout = await aiApi.design(prompt, s.width, s.height, brand)
        const pageId = uid()
        const order = [...s.pageIds]
        order.splice(order.indexOf(s.currentPageId) + 1, 0, pageId)
        const els = layout.elements.map((e) => ({ ...e, id: uid() })) as unknown as DesignElement[]
        const changes: Change[] = [{ kind: 'page', id: pageId, before: null, after: { id: pageId, name: 'AI layout', background: layout.background, durationSeconds: null, notes: '' } }]
        els.forEach((e) => changes.push({ kind: 'el', id: e.id, pageId, before: null, after: e }))
        changes.push({ kind: 'order', pageId, before: [], after: els.map((e) => e.id) }, { kind: 'pageOrder', before: s.pageIds, after: order })
        s.commit(changes)
        useEditorStore.getState().setCurrentPage(pageId)
      }
      toast.success('Added to your design')
    } catch (e) {
      const msg = errorMessage(e)
      if (/connect an ai provider/i.test(msg)) setNoProvider(true)
      else toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  const h = hints[mode]
  return (
    <PanelShell title="Magic Media">
      <Tabs<Mode> value={mode} onChange={setMode} tabs={[{ id: 'layout', label: 'Layout' }, { id: 'image', label: 'Image' }, { id: 'copy', label: 'Text' }]} />
      <TextAreaField label={h.label} placeholder={h.placeholder} value={prompt} rows={4} maxLength={mode === 'image' ? 2000 : 1500} onChange={(e) => setPrompt(e.target.value)} />
      <Button className="btn--ai" icon="sparkle" loading={busy} disabled={!prompt.trim()} onClick={() => void run()}>
        {h.action}
      </Button>
      {noProvider && (
        <div className="auth__error" role="alert" style={{ background: 'var(--warn-tint)', color: 'var(--warn)' }}>
          Connect an AI provider to use Magic Media. Open <Link to="/profile">your profile</Link> and add an API key.
        </div>
      )}
      <div className="ai-note">
        <span aria-hidden="true">✦</span>
        <span>
          {mode === 'layout' ? 'Adds a new page laid out for your canvas size, using your brand kit when you have one.' : mode === 'image' ? 'The picture is saved to your uploads and placed on the page.' : 'The text is placed on the page, ready to restyle.'}
        </span>
      </div>
    </PanelShell>
  )
}
