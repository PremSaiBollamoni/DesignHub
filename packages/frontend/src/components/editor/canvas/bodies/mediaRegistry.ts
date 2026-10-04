/** Live media elements by design-element id, so panels can start and stop playback without prop drilling. */
const media = new Map<string, HTMLMediaElement>()

export const mediaRegistry = {
  set(id: string, el: HTMLMediaElement) {
    media.set(id, el)
  },
  delete(id: string, el: HTMLMediaElement) {
    if (media.get(id) === el) media.delete(id)
  },
  get(id: string) {
    return media.get(id)
  },
  toggle(id: string) {
    const el = media.get(id)
    if (!el) return false
    if (el.paused) void el.play().catch(() => undefined)
    else el.pause()
    return !el.paused
  },
  pauseAll() {
    media.forEach((m) => m.pause())
  },
}
