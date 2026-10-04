import { useEffect, useState } from 'react'
import type { Access, Team, TeamMember } from '@/models/api'
import { accountApi } from '@/services/api/accountApi'
import { useAuthStore } from '@/stores/authStore'
import { useTeamStore } from '@/stores/teamStore'
import { errorMessage, toast } from '@/stores/toastStore'
import { Button, IconButton } from '@/components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Avatar, TextField } from '@/components/ui/Fields'
import { ROLE_HELP, ROLE_LABEL } from '@/models/access'
import { Modal } from '@/components/ui/Modal'
import { confirmDialog } from '@/components/ui/confirm'
import '@/activities/billing/billing.css'
import './workspace.css'

export default function WorkspaceActivity() {
  const { teams, loaded, load, create, remove } = useTeamStore()
  const [selected, setSelected] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load().catch((e) => setError(errorMessage(e)))
  }, [load])
  useEffect(() => {
    if (selected === null && teams[0]) setSelected(teams[0].id)
    if (selected !== null && !teams.some((t) => t.id === selected)) setSelected(teams[0]?.id ?? null)
  }, [teams, selected])

  if (error) return <ErrorState message={error} onRetry={() => location.reload()} />
  if (!loaded) return <Skeleton height={260} radius={16} />
  const team = teams.find((t) => t.id === selected)

  return (
    <div className="page__inner">
      <div className="page__head">
        <div>
          <h1>Workspace</h1>
          <p>Create teams so people can share designs, brand kits and reviews.</p>
        </div>
        <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
          New team
        </Button>
      </div>

      {teams.length === 0 ? (
        <EmptyState
          icon="users"
          title="Work with a team"
          message="Teams give everyone the same access to the designs you put in them."
          action={
            <Button variant="primary" onClick={() => setCreating(true)}>
              Create a team
            </Button>
          }
        />
      ) : (
        <>
          <div className="folders">
            {teams.map((t) => (
              <button key={t.id} className="chip" aria-pressed={t.id === selected} onClick={() => setSelected(t.id)}>
                {t.name}
              </button>
            ))}
          </div>
          {team && <TeamPanel key={team.id} team={team} onDelete={async () => {
            const ok = await confirmDialog({ title: `Delete "${team.name}"?`, message: 'Members lose access to designs shared through this team.', confirmLabel: 'Delete team', danger: true })
            if (ok) await remove(team.id).catch((e) => toast.error(errorMessage(e)))
          }} />}
        </>
      )}
      {creating && <CreateTeamModal onClose={() => setCreating(false)} onCreate={async (name) => { const t = await create(name); setSelected(t.id) }} />}
    </div>
  )
}

function TeamPanel({ team, onDelete }: { team: Team; onDelete: () => Promise<void> }) {
  const me = useAuthStore((s) => s.user)!
  const [members, setMembers] = useState<TeamMember[] | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Access>('MAKER')
  const [busy, setBusy] = useState(false)
  const isOwner = team.ownerId === me.id

  useEffect(() => {
    void accountApi.teamMembers(team.id).then(setMembers).catch((e) => toast.error(errorMessage(e)))
  }, [team.id])

  async function add() {
    setBusy(true)
    try {
      const m = await accountApi.addTeamMember(team.id, email.trim(), role)
      setMembers((cur) => [...(cur ?? []).filter((x) => x.userId !== m.userId), m])
      setEmail('')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card team">
      <div className="team__head">
        <h2>{team.name}</h2>
        {isOwner && (
          <Button size="sm" variant="ghost" icon="trash" onClick={() => void onDelete()}>
            Delete team
          </Button>
        )}
      </div>
      <p className="field__hint">
        <b>Maker</b>: designs and sends work for approval. <b>Editor</b>: approves, edits and publishes. <b>Viewer</b>: can only look.
      </p>
      {isOwner && (
        <form
          className="team__invite"
          onSubmit={(e) => {
            e.preventDefault()
            void add()
          }}
        >
          <TextField label="Add by email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
          <div className="field">
            <label className="field__label" htmlFor="team-role">
              Role
            </label>
            <select id="team-role" className="select" value={role} onChange={(e) => setRole(e.target.value as Access)}>
              <option value="MAKER">Maker</option>
              <option value="EDITOR">Editor</option>
              <option value="COMMENTER">Commenter</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>
          <Button type="submit" variant="primary" loading={busy} disabled={!email.trim()}>
            Add member
          </Button>
        </form>
      )}
      {!members ? (
        <Skeleton height={80} />
      ) : (
        <ul className="members">
          {members.map((m) => (
            <li key={m.userId}>
              <Avatar name={m.name} src={m.avatarUrl} size={34} />
              <div>
                <strong>{m.name}</strong>
                <div className="field__hint">{m.email}</div>
              </div>
              <span className="badge" title={ROLE_HELP[m.role]}>{ROLE_LABEL[m.role] ?? m.role}</span>
              {(isOwner || m.userId === me.id) && m.role !== 'OWNER' && (
                <IconButton
                  icon="close"
                  size="sm"
                  label={m.userId === me.id ? 'Leave team' : `Remove ${m.name}`}
                  onClick={async () => {
                    try {
                      await accountApi.removeTeamMember(team.id, m.userId)
                      setMembers((cur) => (cur ?? []).filter((x) => x.userId !== m.userId))
                    } catch (e) {
                      toast.error(errorMessage(e))
                    }
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function CreateTeamModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit() {
    setBusy(true)
    try {
      await onCreate(name.trim())
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
      setBusy(false)
    }
  }
  return (
    <Modal
      title="New team"
      onClose={onClose}
      locked={busy}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} disabled={!name.trim()} onClick={() => void submit()}>
            Create team
          </Button>
        </>
      }
    >
      <TextField label="Team name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} onKeyDown={(e) => e.key === 'Enter' && name.trim() && void submit()} />
    </Modal>
  )
}
