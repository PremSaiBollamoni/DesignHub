import { useEffect, useState } from 'react'
import type { User } from '@/models/api'
import { authApi } from '@/services/api/authApi'
import { contentApi } from '@/services/api/contentApi'
import { socialApi } from '@/services/api/socialApi'
import { useSocialStore } from '@/stores/socialStore'
import { errorMessage, toast } from '@/stores/toastStore'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SelectField, TextAreaField, TextField, Avatar } from '@/components/ui/Fields'
import { Icon } from '@/components/ui/Icon'
import { PLATFORM_LABEL, CAPTION_LIMIT } from './platforms'

interface Props {
  projectId?: number
  /** Public URL of the design image; when absent the author uploads one. */
  mediaUrl?: string
  caption?: string
  onClose: () => void
  onCreated?: () => void
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function PostComposer({ projectId, mediaUrl: initialMedia, caption: initialCaption, onClose, onCreated }: Props) {
  const { accounts, load, loaded, replacePost } = useSocialStore()
  const [accountId, setAccountId] = useState('')
  const [caption, setCaption] = useState(initialCaption ?? '')
  const [mediaUrl, setMediaUrl] = useState(initialMedia ?? '')
  const [when, setWhen] = useState('')
  const [reviewer, setReviewer] = useState<User | null>(null)
  const [reviewerQuery, setReviewerQuery] = useState('')
  const [matches, setMatches] = useState<User[]>([])
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loaded) void load()
  }, [loaded, load])
  useEffect(() => {
    if (!accountId && accounts[0]) setAccountId(String(accounts[0].id))
  }, [accounts, accountId])
  useEffect(() => {
    if (reviewerQuery.trim().length < 2) {
      setMatches([])
      return
    }
    const t = setTimeout(() => void authApi.searchUsers(reviewerQuery).then(setMatches).catch(() => setMatches([])), 250)
    return () => clearTimeout(t)
  }, [reviewerQuery])

  const account = accounts.find((a) => String(a.id) === accountId)
  const limit = account ? CAPTION_LIMIT[account.platform] : undefined

  async function upload(file: File | undefined) {
    if (!file) return
    setUploading(true)
    try {
      setMediaUrl((await contentApi.upload(file)).url)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setUploading(false)
    }
  }

  async function create(): Promise<void> {
    setBusy(true)
    try {
      const post = await socialApi.createPost({
        accountId: Number(accountId),
        projectId,
        caption,
        mediaUrl: mediaUrl || undefined,
        scheduledAt: when ? new Date(when).toISOString() : undefined,
        reviewerId: reviewer?.id,
      })
      replacePost(post)
      toast.success(reviewer ? 'Post saved as a draft. Submit it for approval when you are ready.' : 'Post saved as a draft.')
      onCreated?.()
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
      setBusy(false)
    }
  }

  if (loaded && accounts.length === 0) {
    return (
      <Modal title="New post" onClose={onClose} footer={<Button onClick={onClose}>Close</Button>}>
        <p style={{ color: 'var(--ink-2)' }}>Connect a social account first. Open Publishing, then choose Accounts.</p>
      </Modal>
    )
  }

  return (
    <Modal
      title="New post"
      onClose={onClose}
      locked={busy}
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} disabled={!accountId || (limit !== undefined && caption.length > limit)} onClick={() => void create()}>
            Save draft
          </Button>
        </>
      }
    >
      <SelectField label="Publish to" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {PLATFORM_LABEL[a.platform] ?? a.platform} · {a.displayName}
          </option>
        ))}
      </SelectField>
      <TextAreaField
        label="Caption"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={4}
        hint={limit ? `${caption.length} of ${limit} characters` : `${caption.length} characters`}
        error={limit !== undefined && caption.length > limit ? `This is ${caption.length - limit} characters over the limit` : undefined}
      />
      <div className="field">
        <span className="field__label">Image</span>
        {mediaUrl ? (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <img src={mediaUrl} alt="" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--line)' }} />
            {!initialMedia && (
              <Button size="sm" variant="ghost" onClick={() => setMediaUrl('')}>
                Remove image
              </Button>
            )}
          </div>
        ) : (
          <label className={`btn ${uploading ? 'is-disabled' : ''}`} style={{ justifySelf: 'start' }}>
            <Icon name="upload" size={16} />
            {uploading ? 'Uploading…' : 'Upload image'}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => void upload(e.target.files?.[0])} />
          </label>
        )}
      </div>
      <TextField
        label="Schedule"
        type="datetime-local"
        min={toLocalInput(new Date())}
        value={when}
        onChange={(e) => setWhen(e.target.value)}
        hint="Leave empty to publish manually after saving."
      />
      <div className="field">
        <span className="field__label">Reviewer (optional)</span>
        {reviewer ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={reviewer.name} src={reviewer.avatarUrl} />
            <span>
              {reviewer.name} <span style={{ color: 'var(--ink-3)' }}>{reviewer.email}</span>
            </span>
            <Button size="sm" variant="ghost" onClick={() => setReviewer(null)}>
              Change
            </Button>
          </div>
        ) : (
          <>
            <input className="input" placeholder="Search by name or email" value={reviewerQuery} onChange={(e) => setReviewerQuery(e.target.value)} aria-label="Search for a reviewer" />
            {matches.map((u) => (
              <button
                key={u.id}
                className="menu-item"
                onClick={() => {
                  setReviewer(u)
                  setMatches([])
                }}
              >
                <Avatar name={u.name} src={u.avatarUrl} size={24} />
                {u.name}
                <span className="menu-item__hint">{u.email}</span>
              </button>
            ))}
            <span className="field__hint">A reviewer must approve the post before it can be published.</span>
          </>
        )}
      </div>
    </Modal>
  )
}
