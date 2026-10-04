import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'oled' | 'system'
type Resolved = 'light' | 'dark' | 'oled'

const KEY = 'dh-theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')

function stored(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' || v === 'oled' || v === 'system' ? v : 'light'
  } catch {
    return 'light'
  }
}

function resolve(mode: ThemeMode): Resolved {
  return mode === 'system' ? (media.matches ? 'dark' : 'light') : mode
}

function apply(mode: ThemeMode) {
  document.documentElement.dataset.theme = resolve(mode)
}

interface ThemeState {
  mode: ThemeMode
  resolved: Resolved
  setMode: (m: ThemeMode) => void
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initial = stored()
  apply(initial)
  // Follow the operating system live while "System" is selected, with no reload.
  media.addEventListener('change', () => {
    if (get().mode === 'system') {
      apply('system')
      set({ resolved: resolve('system') })
    }
  })
  return {
    mode: initial,
    resolved: resolve(initial),
    setMode: (mode) => {
      apply(mode)
      try {
        localStorage.setItem(KEY, mode)
      } catch {
        /* storage can be unavailable; the theme still applies for this session */
      }
      set({ mode, resolved: resolve(mode) })
    },
  }
})

/** Reads a CSS token for places that cannot use CSS, such as canvas strokes. Re-evaluates when the theme changes. */
export function useToken(name: string, fallback: string): string {
  useThemeStore((s) => s.resolved)
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}
