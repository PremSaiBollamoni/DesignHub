import { useCallback, useEffect, useState } from 'react'
import type { AiSetting } from '@/models/api'
import { accountApi } from '@/services/api/accountApi'
import { errorMessage, toast } from '@/stores/toastStore'
import { Button } from '@/components/ui/Button'
import { Switch, TextField } from '@/components/ui/Fields'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Feedback'

const LABEL: Record<string, string> = { openrouter: 'OpenRouter', openai: 'OpenAI or compatible', anthropic: 'Anthropic', google: 'Google Gemini' }
const ORDER = ['openrouter', 'openai', 'anthropic', 'google']

const OPENROUTER_MODELS = ['openai/gpt-4o-mini', 'anthropic/claude-sonnet-4.5', 'google/gemini-2.5-flash', 'meta-llama/llama-3.3-70b-instruct', 'deepseek/deepseek-chat']

export function AiSettingsPanel() {
  const [settings, setSettings] = useState<AiSetting[] | null>(null)
  const refresh = useCallback(async () => setSettings(await accountApi.aiSettings()), [])

  useEffect(() => {
    refresh().catch((e) => toast.error(errorMessage(e)))
  }, [refresh])

  const sorted = settings ? [...settings].sort((a, b) => ORDER.indexOf(a.provider) - ORDER.indexOf(b.provider)) : null
  const active = settings?.find((s) => s.active)

  return (
    <section className="card brand-card" id="ai">
      <h2>AI providers</h2>
      <p style={{ color: 'var(--ink-2)' }}>
        Bring your own key to power Magic AI: layouts, writing and image tools. Keys are encrypted on the server and never shown again after you save them.
      </p>
      {active ? (
        <div className="ai-note">
          <span aria-hidden="true">✦</span>
          <span>
            Magic AI is using <b>{LABEL[active.provider] ?? active.provider}</b>
            {active.textModel ? ` with ${active.textModel}` : ''}.
          </span>
        </div>
      ) : (
        settings && <p className="field__hint">No provider is switched on yet. Connect one below and Magic AI will use it.</p>
      )}
      {!sorted ? <Skeleton height={160} /> : sorted.map((s) => <ProviderRow key={s.provider} setting={s} onChanged={refresh} />)}
    </section>
  )
}

interface TestState {
  ok: boolean
  message: string
  reply?: string
}

function ProviderRow({ setting: s, onChanged }: { setting: AiSetting; onChanged: () => Promise<void> }) {
  const connected = !!s.keyHint
  const [apiKey, setApiKey] = useState('')
  const [textModel, setTextModel] = useState(s.textModel ?? '')
  const [imageModel, setImageModel] = useState(s.imageModel ?? '')
  const [baseUrl, setBaseUrl] = useState(s.baseUrl ?? '')
  const [open, setOpen] = useState(!connected)
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<TestState | null>(null)
  const isRouter = s.provider === 'openrouter'
  const modelLabel = isRouter ? 'Model name' : 'Text model'

  async function save(extra?: { active?: boolean }) {
    setBusy(true)
    try {
      await accountApi.saveAiSetting(s.provider, { apiKey: apiKey || undefined, textModel, imageModel, baseUrl, ...extra })
      setApiKey('')
      await onChanged()
      toast.success(`${LABEL[s.provider] ?? s.provider} saved`)
      setOpen(false)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  /** Makes one real request with what is typed. If it works, the provider is saved and switched on for Magic AI. */
  async function test() {
    setTesting(true)
    setResult(null)
    try {
      const r = await accountApi.testAiSetting(s.provider, { apiKey: apiKey || undefined, textModel: textModel || undefined, baseUrl: baseUrl || undefined, useIfWorks: true })
      setResult({ ok: r.ok, message: r.message, reply: r.reply })
      if (r.ok) {
        setApiKey('')
        await onChanged()
        toast.success(`Connected. Magic AI now uses ${LABEL[s.provider] ?? s.provider}.`)
      }
    } catch (e) {
      setResult({ ok: false, message: errorMessage(e) })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="ai-provider">
      <div className="ai-provider__head">
        <strong>{LABEL[s.provider] ?? s.provider}</strong>
        {connected && <span className="badge badge--ok">Key {s.keyHint}</span>}
        {s.active && <span className="badge badge--ultra">In use</span>}
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {connected && (
            <>
              <span className="field__hint">Use for Magic AI</span>
              <Switch label={`Use ${LABEL[s.provider]} for Magic AI`} checked={s.active} onChange={(v) => void save({ active: v })} />
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => setOpen(!open)}>
            {open ? 'Close' : connected ? 'Edit' : 'Connect'}
          </Button>
        </span>
      </div>
      {open && (
        <>
          <TextField
            label={connected ? 'Replace API key' : 'API key'}
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={connected ? 'Leave empty to keep the current key' : isRouter ? 'sk-or-v1-…' : 'Paste your key'}
          />
          <div className="ai-provider__grid">
            <div className="field">
              <label className="field__label" htmlFor={`m-${s.provider}`}>
                {modelLabel}
              </label>
              <input
                id={`m-${s.provider}`}
                className="input"
                list={isRouter ? 'openrouter-models' : undefined}
                value={textModel}
                onChange={(e) => setTextModel(e.target.value)}
                placeholder={s.defaultTextModel}
                autoComplete="off"
                spellCheck={false}
              />
              {isRouter && (
                <>
                  <datalist id="openrouter-models">
                    {OPENROUTER_MODELS.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                  <span className="field__hint">Copy the exact name from openrouter.ai/models, for example openai/gpt-4o-mini.</span>
                </>
              )}
            </div>
            {s.supportsImages && <TextField label="Image model" value={imageModel} onChange={(e) => setImageModel(e.target.value)} placeholder={s.defaultImageModel} />}
          </div>
          {s.provider === 'openai' && (
            <TextField label="Base URL (optional)" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" hint="Point this at any OpenAI-compatible gateway." />
          )}
          {result && (
            <div className={result.ok ? 'ai-note' : 'form-error'} role={result.ok ? 'status' : 'alert'} style={{ alignItems: 'flex-start' }}>
              <Icon name={result.ok ? 'check' : 'alert'} size={16} />
              <span>
                {result.message}
                {result.ok && result.reply ? ` It replied: “${result.reply}”.` : ''}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button className="btn--ai" icon="sparkle" loading={testing} disabled={busy || (!connected && !apiKey) || (isRouter && !textModel.trim())} onClick={() => void test()}>
              Test connection
            </Button>
            <Button variant="primary" loading={busy} disabled={testing || (!connected && !apiKey)} onClick={() => void save()}>
              Save without testing
            </Button>
            {connected && (
              <Button
                variant="ghost"
                disabled={busy || testing}
                onClick={async () => {
                  await accountApi.deleteAiSetting(s.provider)
                  setResult(null)
                  await onChanged()
                }}
              >
                Remove key
              </Button>
            )}
          </div>
          <p className="field__hint">Testing sends one tiny request. If it works, this provider is saved and switched on for Magic AI.</p>
        </>
      )}
    </div>
  )
}
