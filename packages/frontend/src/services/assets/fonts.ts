/** Curated Google Fonts. Loaded on demand so the editor never ships fonts nobody uses. */
export interface FontFamily {
  family: string
  category: 'sans' | 'serif' | 'display' | 'script' | 'mono'
  weights: number[]
}

export const FONT_FAMILIES: FontFamily[] = [
  { family: 'Inter Tight', category: 'sans', weights: [400, 500, 600, 700] },
  { family: 'Bricolage Grotesque', category: 'sans', weights: [500, 700, 800] },
  { family: 'DM Sans', category: 'sans', weights: [400, 500, 700] },
  { family: 'Manrope', category: 'sans', weights: [400, 600, 800] },
  { family: 'Poppins', category: 'sans', weights: [400, 600, 700] },
  { family: 'Montserrat', category: 'sans', weights: [400, 600, 800] },
  { family: 'Space Grotesk', category: 'sans', weights: [400, 500, 700] },
  { family: 'Work Sans', category: 'sans', weights: [400, 600, 800] },
  { family: 'Fraunces', category: 'serif', weights: [400, 600, 800] },
  { family: 'Playfair Display', category: 'serif', weights: [400, 600, 800] },
  { family: 'Lora', category: 'serif', weights: [400, 600, 700] },
  { family: 'Merriweather', category: 'serif', weights: [400, 700, 900] },
  { family: 'Anton', category: 'display', weights: [400] },
  { family: 'Bebas Neue', category: 'display', weights: [400] },
  { family: 'Archivo Black', category: 'display', weights: [400] },
  { family: 'Righteous', category: 'display', weights: [400] },
  { family: 'Caveat', category: 'script', weights: [400, 700] },
  { family: 'Pacifico', category: 'script', weights: [400] },
  { family: 'Dancing Script', category: 'script', weights: [400, 700] },
  { family: 'JetBrains Mono', category: 'mono', weights: [400, 700] },
]

const requested = new Map<string, Promise<void>>()

function cssName(family: string) {
  return family.replace(/ /g, '+')
}

/** Resolves once the face is usable by canvas text. Safe to call repeatedly. */
export function loadFont(family: string, weights: number[] = [400, 700], italic = false): Promise<void> {
  const known = FONT_FAMILIES.find((f) => f.family === family)
  if (!known) return Promise.resolve()
  const key = `${family}|${italic}`
  let p = requested.get(key)
  if (!p) {
    const wanted = Array.from(new Set([...weights, ...known.weights])).filter((w) => known.weights.includes(w) || known.weights.length === 1)
    const axis = italic ? `ital,wght@${wanted.map((w) => `1,${w}`).join(';')}` : `wght@${wanted.sort((a, b) => a - b).join(';')}`
    const href = `https://fonts.googleapis.com/css2?family=${cssName(family)}:${axis}&display=swap`
    p = new Promise<void>((resolve) => {
      if (!document.querySelector(`link[data-font="${key}"]`)) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = href
        link.dataset.font = key
        link.onload = () => {
          void Promise.all(wanted.map((w) => document.fonts.load(`${italic ? 'italic ' : ''}${w} 32px "${family}"`))).then(() => resolve())
        }
        link.onerror = () => resolve()
        document.head.appendChild(link)
      } else {
        resolve()
      }
    })
    requested.set(key, p)
  }
  return p
}

/** Weights that actually exist for a family, so the weight picker never offers a fake bold. */
export function weightsFor(family: string): number[] {
  return FONT_FAMILIES.find((f) => f.family === family)?.weights ?? [400, 700]
}

export const WEIGHT_NAMES: Record<number, string> = {
  100: 'Thin',
  200: 'Extra light',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'Semibold',
  700: 'Bold',
  800: 'Extra bold',
  900: 'Black',
}
