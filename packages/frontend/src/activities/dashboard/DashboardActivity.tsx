import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { ProjectSummary } from '@/models/api'
import { projectApi } from '@/services/api/projectApi'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { errorMessage, toast } from '@/stores/toastStore'
import { Button } from '@/components/ui/Button'
import { Tabs, SelectField } from '@/components/ui/Fields'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Modal } from '@/components/ui/Modal'
import { TextField } from '@/components/ui/Fields'
import { CreateStrip } from '@/components/dashboard/CreateStrip'
import { NewDesignModal } from '@/components/dashboard/NewDesignModal'
import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { FolderBar } from '@/components/dashboard/FolderBar'
import { useProjectActions } from '@/components/dashboard/useProjectActions'
import { approvalApi, type WaitingItem } from '@/services/api/approvalApi'
import { useTeamStore } from '@/stores/teamStore'
import { timeAgo } from '@/utils/common'
import './dashboard.css'

type View = 'all' | 'favorites' | 'shared' | 'trash'

export default function DashboardActivity() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)!
  const { items, total, loading, error, query, setQuery, load } = useProjectStore()
  const [creating, setCreating] = useState<{ title: string; width: number; height: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [renaming, setRenaming] = useState<ProjectSummary | null>(null)
  const [moving, setMoving] = useState<ProjectSummary | null>(null)

  const [params] = useSearchParams()
  const urlView = params.get('view')
  useEffect(() => {
    const next = urlView === 'trash' ? 'trash' : 'all'
    if (useProjectStore.getState().query.view !== next && (urlView !== null || useProjectStore.getState().query.view === 'trash')) setQuery({ view: next })
  }, [urlView, setQuery])

  useEffect(() => {
    void load()
  }, [query, load])

  const actions = useProjectActions({ onRename: setRenaming, onMove: setMoving })
  const view = (query.view ?? 'all') as View
  const page = query.page ?? 0
  const size = query.size ?? 24
  const pages = Math.max(1, Math.ceil(total / size))

  const [waiting, setWaiting] = useState<WaitingItem[]>([])
  useEffect(() => {
    void approvalApi.waiting().then(setWaiting).catch(() => setWaiting([]))
  }, [])

  const create = useCallback(
    async (data: { title: string; width: number; height: number; teamId?: number }) => {
      setBusy(true)
      try {
        const p = await projectApi.create({ ...data, folderId: query.folderId })
        navigate(`/editor/${p.id}`)
      } catch (e) {
        toast.error(errorMessage(e))
        setBusy(false)
      }
    },
    [navigate, query.folderId],
  )

  return (
    <div className="page__inner">
      <section className="stage">
        <div className="stage__copy">
          <h1>Hi {user.name.split(' ')[0]}, what are we making today?</h1>
          <p>Pick a size to start fresh, or open something you already began.</p>
        </div>
        <CreateStrip onPick={(p) => void create(p)} onCustom={() => setCreating({ title: 'Untitled design', width: 1080, height: 1080 })} />
      </section>

      {waiting.length > 0 && (
        <section className="waiting" aria-label="Waiting for your approval">
          <h2>Waiting for your approval</h2>
          <div className="waiting__list">
            {waiting.map((w) => (
              <button key={w.projectId} className="waiting__item" onClick={() => navigate(`/editor/${w.projectId}`)}>
                {w.thumbnail ? <img src={w.thumbnail} alt="" /> : <span className="waiting__ph" />}
                <span>
                  <b>{w.title}</b>
                  <small>
                    From {w.requestedBy} · {timeAgo(w.requestedAt)}
                  </small>
                </span>
                <span className="badge badge--warn">Review</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="toolbar">
        <Tabs<View>
          value={view}
          onChange={(v) => setQuery({ view: v })}
          tabs={[
            { id: 'all', label: 'All designs' },
            { id: 'favorites', label: 'Favorites' },
            { id: 'shared', label: 'Shared with me' },
            { id: 'trash', label: 'Trash' },
          ]}
        />
        <span className="toolbar__spacer" />
        <label className="sr-only" htmlFor="sort">
          Sort designs
        </label>
        <select id="sort" className="select select--sm" style={{ width: 160 }} value={query.sort} onChange={(e) => setQuery({ sort: e.target.value as 'updated' | 'created' | 'title' })}>
          <option value="updated">Recently edited</option>
          <option value="created">Recently created</option>
          <option value="title">Name, A to Z</option>
        </select>
      </div>

      {view === 'all' && <FolderBar />}
      {query.q && (
        <p style={{ marginBottom: 14, color: 'var(--ink-2)' }}>
          {total} result{total === 1 ? '' : 's'} for “{query.q}”
        </p>
      )}

      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : loading && !items.length ? (
        <div className="grid">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} style={{ display: 'grid', gap: 10 }}>
              <Skeleton height={170} radius={16} />
              <Skeleton height={14} width="70%" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={view === 'trash' ? 'trash' : view === 'favorites' ? 'star' : 'image'}
          title={
            query.q ? 'No designs match your search' : view === 'trash' ? 'Trash is empty' : view === 'favorites' ? 'No favorites yet' : view === 'shared' ? 'Nothing shared with you yet' : 'Your first design starts here'
          }
          message={
            query.q
              ? 'Try a different word or clear the search.'
              : view === 'trash'
                ? 'Designs you delete wait here until you remove them for good.'
                : view === 'favorites'
                  ? 'Star a design to keep it one click away.'
                  : view === 'shared'
                    ? 'When someone invites you to a design, it appears here.'
                    : 'Choose a size above or start from a template.'
          }
          action={
            view === 'all' && !query.q ? (
              <Button variant="primary" onClick={() => navigate('/templates')}>
                Browse templates
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 150ms' }}>
            {items.map((p) => (
              <ProjectCard key={p.id} project={p} actions={actions} userId={user.id} />
            ))}
          </div>
          {pages > 1 && (
            <div className="pager">
              <Button size="sm" icon="chevronLeft" disabled={page === 0} onClick={() => setQuery({ page: page - 1 })}>
                Previous
              </Button>
              <span>
                Page {page + 1} of {pages}
              </span>
              <Button size="sm" disabled={page + 1 >= pages} onClick={() => setQuery({ page: page + 1 })}>
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {creating && <NewDesignModal initial={creating} busy={busy} onClose={() => setCreating(null)} onCreate={(d) => void create(d)} />}
      {renaming && <RenameModal project={renaming} onClose={() => setRenaming(null)} />}
      {moving && <MoveModal project={moving} onClose={() => setMoving(null)} />}
    </div>
  )
}

function RenameModal({ project, onClose }: { project: ProjectSummary; onClose: () => void }) {
  const patchItem = useProjectStore((s) => s.patchItem)
  const [title, setTitle] = useState(project.title)
  const [busy, setBusy] = useState(false)
  async function save() {
    setBusy(true)
    try {
      const updated = await projectApi.update(project.id, { title })
      patchItem(project.id, { title: updated.title })
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
      setBusy(false)
    }
  }
  return (
    <Modal
      title="Rename design"
      onClose={onClose}
      locked={busy}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} disabled={!title.trim()} onClick={() => void save()}>
            Save name
          </Button>
        </>
      }
    >
      <TextField label="Name" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} onKeyDown={(e) => e.key === 'Enter' && title.trim() && void save()} />
    </Modal>
  )
}

function MoveModal({ project, onClose }: { project: ProjectSummary; onClose: () => void }) {
  const folders = useProjectStore((s) => s.folders)
  const teams = useTeamStore((s) => s.teams)
  const loadTeams = useTeamStore((s) => s.load)
  const [teamId, setTeamId] = useState(String(project.teamId ?? 0))
  useEffect(() => {
    void loadTeams().catch(() => undefined)
  }, [loadTeams])
  const load = useProjectStore((s) => s.load)
  const [folderId, setFolderId] = useState(String(project.folderId ?? 0))
  const [busy, setBusy] = useState(false)
  async function save() {
    setBusy(true)
    try {
      await projectApi.update(project.id, { ...(Number(folderId) ? { folderId: Number(folderId) } : { clearFolder: true }), teamId: Number(teamId) })
      await load()
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
      setBusy(false)
    }
  }
  return (
    <Modal
      title="Folder and team"
      onClose={onClose}
      locked={busy}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} onClick={() => void save()}>
            Move design
          </Button>
        </>
      }
    >
      <SelectField label="Folder" value={folderId} onChange={(e) => setFolderId(e.target.value)}>
        <option value="0">No folder</option>
        {folders.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </SelectField>
      <SelectField label="Team" hint="Team designs go to the team’s Editors for approval before publishing." value={teamId} onChange={(e) => setTeamId(e.target.value)}>
        <option value="0">Just me</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </SelectField>
    </Modal>
  )
}
