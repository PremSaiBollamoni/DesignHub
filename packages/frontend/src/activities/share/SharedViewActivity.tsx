import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Access, ProjectSummary } from '@/models/api'
import type { DesignDocument } from '@/models/design'
import { sharingApi } from '@/services/api/sharingApi'
import { useAuthStore } from '@/stores/authStore'
import { errorMessage, toast } from '@/stores/toastStore'
import { PresentView } from '@/components/editor/PresentView'
import { Button } from '@/components/ui/Button'
import { ErrorState, Spinner } from '@/components/ui/Feedback'
import { Logo } from '@/components/ui/Icon'

/** Public, read-only viewer for share links. Signed-in visitors can turn the link into real access. */
export default function SharedViewActivity() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const booting = useAuthStore((s) => s.booting)
  const [data, setData] = useState<{ project: ProjectSummary; design: DesignDocument; role: Access } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [present, setPresent] = useState(false)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    sharingApi.publicView(token).then(setData).catch((e) => setError(errorMessage(e)))
  }, [token])

  async function join() {
    if (!user) return navigate('/login', { state: { from: `/s/${token}` } })
    setJoining(true)
    try {
      const { projectId } = await sharingApi.acceptLink(token)
      navigate(`/editor/${projectId}`)
    } catch (e) {
      toast.error(errorMessage(e))
      setJoining(false)
    }
  }

  if (error) return <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}><ErrorState message="This link is not available. It may have expired or been turned off." /></div>
  if (!data || booting) return <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}><Spinner size={28} /></div>

  const roleText = data.role === 'EDITOR' ? 'edit' : data.role === 'COMMENTER' ? 'comment on' : 'view'
  return (
    <div style={{ minHeight: '100%', display: 'grid', gridTemplateRows: 'auto 1fr', background: 'var(--bone)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', background: 'var(--paper)', borderBottom: '1px solid var(--line)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink)', textDecoration: 'none', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
          <Logo size={26} /> DesignHub
        </Link>
        <strong style={{ marginLeft: 12 }}>{data.project.title}</strong>
        <span style={{ flex: 1 }} />
        <Button icon="play" onClick={() => setPresent(true)}>Play</Button>
        <Button variant="primary" loading={joining} onClick={() => void join()}>
          {user ? `Open to ${roleText}` : `Sign in to ${roleText}`}
        </Button>
      </header>
      <main style={{ padding: 24, display: 'grid', gap: 24, justifyItems: 'center', alignContent: 'start' }}>
        {data.design.pages.map((p) => (
          <figure key={p.id} style={{ margin: 0, width: 'min(920px, 100%)' }}>
            <PageImage doc={data.design} index={data.design.pages.indexOf(p)} />
            <figcaption className="field__hint" style={{ marginTop: 6 }}>{p.name}</figcaption>
          </figure>
        ))}
      </main>
      {present && <PresentView doc={data.design} onExit={() => setPresent(false)} />}
    </div>
  )
}

function PageImage({ doc, index }: { doc: DesignDocument; index: number }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    void import('@/services/render/pageRenderer').then(async ({ renderPageCanvas }) => {
      const p = doc.pages[index]!
      const canvas = await renderPageCanvas({ background: p.background, elements: p.elements.filter((e) => !e.data.hidden) }, { width: doc.width, height: doc.height, pixelRatio: Math.min(1.5, 1400 / Math.max(doc.width, doc.height)) })
      if (live) setUrl(canvas.toDataURL('image/png'))
    })
    return () => {
      live = false
    }
  }, [doc, index])
  return url ? <img src={url} alt={`Page ${index + 1}`} style={{ width: '100%', display: 'block', boxShadow: 'var(--shadow-2)', background: '#fff' }} /> : <div className="skeleton" style={{ aspectRatio: `${doc.width} / ${doc.height}` }} />
}
