import { useCallback, useEffect, useState } from 'react'
import type { Access, Collaborator, ShareLink } from '@/models/api'
import { sharingApi } from '@/services/api/sharingApi'
import { useEditorStore } from '@/stores/editorStore'
import { errorMessage, toast } from '@/stores/toastStore'
import { Button, IconButton } from '@/components/ui/Button'
import { Avatar, Tabs } from '@/components/ui/Fields'
import { Modal } from '@/components/ui/Modal'

type Tab = 'people' | 'link'
const ROLE_LABEL: Record<string, string> = { VIEWER: 'Can view', COMMENTER: 'Can comment', MAKER: 'Maker', EDITOR: 'Editor', OWNER: 'Owner' }

export function ShareModal({ onClose }: { onClose: () => void }) {
  const projectId = useEditorStore((s) => s.projectId)
  const isOwner = useEditorStore((s) => s.access === 'OWNER')
  const [tab, setTab] = useState<Tab>('people')
  const [people, setPeople] = useState<Collaborator[]>([])
  const [links, setLinks] = useState<ShareLink[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Access>('MAKER')
  const [linkRole, setLinkRole] = useState<Access>('VIEWER')
  const [days, setDays] = useState('0')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setPeople(await sharingApi.collaborators(projectId))
      if (isOwner) setLinks(await sharingApi.links(projectId))
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }, [projectId, isOwner])
  useEffect(() => {
    void load()
  }, [load])

  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    try {
      await fn()
      await load()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Share this design" onClose={onClose} wide>
      {!isOwner && <p className="field__hint">Only the owner can change who has access.</p>}
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'people', label: 'People' }, { id: 'link', label: 'Link' }]} />
      {tab === 'people' ? (
        <>
          {isOwner && (
            <form
              style={{ display: 'grid', gridTemplateColumns: '1fr 140px auto', gap: 8 }}
              onSubmit={(e) => {
                e.preventDefault()
                void run(async () => {
                  await sharingApi.invite(projectId, email.trim(), role)
                  setEmail('')
                  toast.success('Invitation sent')
                })
              }}
            >
              <input className="input" type="email" placeholder="Add people by email" aria-label="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
              <select className="select" aria-label="Access level" value={role} onChange={(e) => setRole(e.target.value as Access)}>
                <option value="MAKER">Maker (can edit)</option>
                <option value="EDITOR">Editor (can edit and approve)</option>
                <option value="COMMENTER">Can comment</option>
                <option value="VIEWER">Can view</option>
              </select>
              <Button type="submit" variant="primary" loading={busy} disabled={!email.trim()}>
                Invite
              </Button>
            </form>
          )}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
            {people.map((p) => (
              <li key={p.userId} style={{ display: 'grid', gridTemplateColumns: '34px 1fr auto 28px', gap: 10, alignItems: 'center' }}>
                <Avatar name={p.name} src={p.avatarUrl} size={34} />
                <div style={{ minWidth: 0 }}>
                  <strong>{p.name}</strong>
                  <div className="field__hint">{p.email}</div>
                </div>
                <span className="badge">{ROLE_LABEL[p.role]}</span>
                {isOwner && !p.owner ? <IconButton icon="close" size="sm" label={`Remove ${p.name}`} onClick={() => void run(() => sharingApi.removeCollaborator(projectId, p.userId))} /> : <span />}
              </li>
            ))}
          </ul>
        </>
      ) : isOwner ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
            <div className="field">
              <label className="field__label" htmlFor="lr">Anyone with the link</label>
              <select id="lr" className="select" value={linkRole} onChange={(e) => setLinkRole(e.target.value as Access)}>
                <option value="VIEWER">Can view</option>
                <option value="COMMENTER">Can comment</option>
                <option value="EDITOR">Can edit</option>
              </select>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="ld">Expires</label>
              <select id="ld" className="select" value={days} onChange={(e) => setDays(e.target.value)}>
                <option value="0">Never</option>
                <option value="1">In 1 day</option>
                <option value="7">In 7 days</option>
                <option value="30">In 30 days</option>
              </select>
            </div>
            <Button variant="primary" loading={busy} onClick={() => void run(() => sharingApi.createLink(projectId, linkRole, Number(days) || undefined))}>
              Create link
            </Button>
          </div>
          {links.length === 0 && <p className="help">No active links.</p>}
          {links.map((l) => {
            const url = sharingApi.shareUrl(l.token)
            return (
              <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center' }}>
                <input className="input input--sm" readOnly aria-label="Share link" value={url} onFocus={(e) => e.currentTarget.select()} />
                <span className="badge">{ROLE_LABEL[l.role]}</span>
                <span style={{ display: 'flex' }}>
                  <Button size="sm" onClick={() => void navigator.clipboard.writeText(url).then(() => toast.success('Link copied'))}>Copy</Button>
                  <Button size="sm" variant="ghost" onClick={() => void run(() => sharingApi.revokeLink(projectId, l.id))}>Revoke</Button>
                </span>
              </div>
            )
          })}
          <p className="field__hint">Viewers can open the link without an account. Commenting and editing need a DesignHub account.</p>
        </>
      ) : (
        <p className="help">Only the owner can create share links.</p>
      )}
    </Modal>
  )
}
