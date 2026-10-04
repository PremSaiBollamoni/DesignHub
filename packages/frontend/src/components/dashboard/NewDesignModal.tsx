import { useEffect, useState } from 'react'
import { useTeamStore } from '@/stores/teamStore'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextField } from '@/components/ui/Fields'

interface Props {
  initial?: { title: string; width: number; height: number }
  busy: boolean
  onCreate: (data: { title: string; width: number; height: number; teamId?: number }) => void
  onClose: () => void
}

const LIMIT_HINT = 'Between 16 and 16000 px'

export function NewDesignModal({ initial, busy, onCreate, onClose }: Props) {
  const [title, setTitle] = useState(initial?.title ?? 'Untitled design')
  const [width, setWidth] = useState(String(initial?.width ?? 1080))
  const [height, setHeight] = useState(String(initial?.height ?? 1080))
  const teams = useTeamStore((st) => st.teams)
  const loadTeams = useTeamStore((st) => st.load)
  const [teamId, setTeamId] = useState('')
  useEffect(() => {
    void loadTeams().catch(() => undefined)
  }, [loadTeams])
  const w = Number(width)
  const h = Number(height)
  const valid = title.trim() && w >= 16 && w <= 16000 && h >= 16 && h <= 16000

  return (
    <Modal
      title="New design"
      onClose={onClose}
      locked={busy}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} disabled={!valid} onClick={() => onCreate({ title: title.trim(), width: w, height: h, teamId: teamId ? Number(teamId) : undefined })}>
            Create design
          </Button>
        </>
      }
    >
      <TextField label="Name" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
      <div className="size-row">
        <TextField label="Width (px)" type="number" inputMode="numeric" value={width} onChange={(e) => setWidth(e.target.value)} hint={LIMIT_HINT} />
        <TextField label="Height (px)" type="number" inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} hint={LIMIT_HINT} />
      </div>
      {teams.length > 0 && (
        <div className="field">
          <label className="field__label" htmlFor="nd-team">
            Team
          </label>
          <select id="nd-team" className="select" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">Just me</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <span className="field__hint">Team designs are sent to the team’s Editors for approval before they can be published.</span>
        </div>
      )}
    </Modal>
  )
}
