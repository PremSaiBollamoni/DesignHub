import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Icon, Logo } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/iconPaths'
import { Button } from '@/components/ui/Button'
import { NewDesignModal } from '@/components/dashboard/NewDesignModal'
import { TopBar } from './TopBar'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { projectApi } from '@/services/api/projectApi'
import { errorMessage, toast } from '@/stores/toastStore'
import '@/styles/shell.css'

interface Item {
  to: string
  label: string
  icon: IconName
  /** Query string that must match for the item to count as current. */
  search?: string
}

const MAIN: Item[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/templates', label: 'Templates', icon: 'template' },
  { to: '/brand', label: 'Brand kit', icon: 'brand' },
  { to: '/social', label: 'Publishing', icon: 'send' },
  { to: '/workspace', label: 'Teams', icon: 'users' },
]

const MORE: Item[] = [
  { to: '/profile#ai', label: 'AI tools', icon: 'sparkle' },
  { to: '/?view=trash', label: 'Trash', icon: 'trash', search: '?view=trash' },
  { to: '/profile', label: 'Settings', icon: 'settings' },
]

function SideLink({ item, ai }: { item: Item; ai?: boolean }) {
  const loc = useLocation()
  const [pathAndSearch, hash] = item.to.split('#')
  const [path] = pathAndSearch!.split('?')
  const active = loc.pathname === path && (item.search ? loc.search === item.search : !loc.search.includes('view=trash')) && (hash ? loc.hash === `#${hash}` : !loc.hash)
  const current = active
  return (
    <Link to={item.to} className={`nav-link ${current ? 'is-active' : ''}`} aria-current={current ? 'page' : undefined} title={item.label}>
      <Icon name={item.icon} size={18} />
      <span style={ai ? { color: current ? undefined : 'var(--ai)' } : undefined}>{item.label}</span>
    </Link>
  )
}

export function AppShell() {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  useRealtimeNotifications()

  async function create(data: { title: string; width: number; height: number; teamId?: number }) {
    setBusy(true)
    try {
      navigate(`/editor/${(await projectApi.create(data)).id}`)
    } catch (e) {
      toast.error(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <div className="shell">
      <nav className="side" aria-label="Main">
        <Link className="shell__brand" to="/">
          <Logo size={30} />
          <span>DesignHub</span>
        </Link>
        <Button variant="primary" icon="plus" className="side__create" onClick={() => setCreating(true)} aria-label="Create a design">
          <span className="btn-label">Create a design</span>
        </Button>
        {MAIN.map((l) => (
          <SideLink key={l.label} item={l} />
        ))}
        <div className="nav-group">More</div>
        {MORE.map((l) => (
          <SideLink key={l.label} item={l} ai={l.label === 'AI tools'} />
        ))}
        <div className="side__spacer" />
      </nav>
      <div className="shell__main">
        <header className="topline">
          <TopBar />
        </header>
        <main className="page" id="main">
          <Outlet />
        </main>
      </div>
      {creating && <NewDesignModal busy={busy} onClose={() => setCreating(false)} onCreate={(d) => void create(d)} />}
    </div>
  )
}
