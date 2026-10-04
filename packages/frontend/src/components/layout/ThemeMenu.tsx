import { IconButton } from '@/components/ui/Button'
import { Menu } from '@/components/ui/Menu'
import type { IconName } from '@/components/ui/iconPaths'
import { useThemeStore, type ThemeMode } from '@/stores/themeStore'

const MODES: { mode: ThemeMode; label: string; icon: IconName }[] = [
  { mode: 'light', label: 'Light', icon: 'sun' },
  { mode: 'dark', label: 'Dark', icon: 'moon' },
  { mode: 'oled', label: 'OLED black', icon: 'moon' },
  { mode: 'system', label: 'Match system', icon: 'settings' },
]

/** One control for Light, Dark, OLED and System. The choice applies instantly and is remembered. */
export function ThemeMenu() {
  const mode = useThemeStore((s) => s.mode)
  const resolved = useThemeStore((s) => s.resolved)
  const setMode = useThemeStore((s) => s.setMode)
  return (
    <Menu
      align="end"
      trigger={<IconButton icon={resolved === 'light' ? 'sun' : 'moon'} label="Change theme" />}
      items={MODES.map((m) => ({ label: m.label, icon: m.icon, hint: mode === m.mode ? 'Selected' : undefined, onSelect: () => setMode(m.mode) }))}
    />
  )
}
