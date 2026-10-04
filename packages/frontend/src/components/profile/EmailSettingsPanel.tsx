import { useEffect, useState } from 'react'
import type { EmailSettings } from '@/models/api'
import { accountApi } from '@/services/api/accountApi'
import { errorMessage, toast } from '@/stores/toastStore'
import { Switch } from '@/components/ui/Fields'
import { Skeleton } from '@/components/ui/Feedback'

const ROWS: { key: keyof EmailSettings; label: string; hint: string }[] = [
  { key: 'comments', label: 'Comments', hint: 'Someone comments on a design you own.' },
  { key: 'mentions', label: 'Mentions', hint: 'Someone mentions you.' },
  { key: 'invitations', label: 'Invitations', hint: 'You are added to a design or a team.' },
  { key: 'approvals', label: 'Approvals', hint: 'A post needs your review, or yours was reviewed.' },
  { key: 'productUpdates', label: 'Product updates', hint: 'What is new in DesignHub.' },
]

export function EmailSettingsPanel() {
  const [settings, setSettings] = useState<EmailSettings | null>(null)

  useEffect(() => {
    void accountApi.emailSettings().then(setSettings).catch((e) => toast.error(errorMessage(e)))
  }, [])

  async function toggle(key: keyof EmailSettings, value: boolean) {
    if (!settings) return
    const previous = settings
    const next = { ...settings, [key]: value }
    setSettings(next)
    try {
      await accountApi.saveEmailSettings(next)
    } catch (e) {
      setSettings(previous)
      toast.error(errorMessage(e))
    }
  }

  return (
    <section className="card brand-card">
      <h2>Email notifications</h2>
      {!settings ? (
        <Skeleton height={120} />
      ) : (
        ROWS.map((r) => (
          <div key={r.key} className="setting-row">
            <div>
              <strong>{r.label}</strong>
              <div className="field__hint">{r.hint}</div>
            </div>
            <Switch label={r.label} checked={settings[r.key]} onChange={(v) => void toggle(r.key, v)} />
          </div>
        ))
      )}
    </section>
  )
}
