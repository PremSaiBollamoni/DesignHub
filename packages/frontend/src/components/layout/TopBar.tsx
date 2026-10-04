import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { Menu } from '@/components/ui/Menu'
import { Avatar } from '@/components/ui/Fields'
import { NotificationBell } from './NotificationBell'
import { ThemeMenu } from './ThemeMenu'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'

export function TopBar() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const query = useProjectStore((s) => s.query.q ?? '')
  const setQuery = useProjectStore((s) => s.setQuery)
  const [text, setText] = useState(query)

  useEffect(() => setText(query), [query])
  useEffect(() => {
    if (text === query) return
    const t = setTimeout(() => setQuery({ q: text }), 250)
    return () => clearTimeout(t)
  }, [text, query, setQuery])

  if (!user) return null
  return (
    <>
      <form
        className="mast__search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          setQuery({ q: text })
          navigate('/')
        }}
      >
        <Icon name="search" size={16} />
        <input className="input" type="search" placeholder="Search your designs" aria-label="Search your designs" value={text} onChange={(e) => setText(e.target.value)} />
      </form>
      <div className="topline__tools">
        <ThemeMenu />
        <NotificationBell />
        <Menu
          align="end"
          trigger={
            <button className="icon-btn" aria-label="Account menu" style={{ width: 40 }}>
              <Avatar name={user.name} src={user.avatarUrl} size={28} />
            </button>
          }
          items={[
            { label: user.name, icon: 'user', disabled: true, onSelect: () => undefined },
            'separator',
            { label: 'Profile and settings', icon: 'settings', onSelect: () => navigate('/profile') },
            { label: 'Plan and billing', icon: 'card', onSelect: () => navigate('/billing') },
            'separator',
            {
              label: 'Sign out',
              icon: 'logout',
              onSelect: () => {
                logout()
                navigate('/login')
              },
            },
          ]}
        />
      </div>
    </>
  )
}
