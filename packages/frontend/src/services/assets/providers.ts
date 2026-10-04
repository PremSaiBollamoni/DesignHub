/**
 * Stock media providers share one small interface, so another source (Unsplash, Pexels, a company DAM…)
 * is added by implementing `search` and registering it in the panel.
 */
export interface StockItem {
  id: string
  title: string
  url: string
  thumbnail: string
  width: number
  height: number
  credit?: string
  creditUrl?: string
  license?: string
}

export interface StockPage {
  items: StockItem[]
  hasMore: boolean
}

export interface StockProvider {
  id: string
  label: string
  search(query: string, page: number, signal?: AbortSignal): Promise<StockPage>
}

interface OpenverseResult {
  id: string
  title?: string
  url: string
  thumbnail?: string
  width?: number
  height?: number
  creator?: string
  foreign_landing_url?: string
  license?: string
  license_version?: string
}

interface OpenverseResponse {
  results: OpenverseResult[]
  page_count: number
}

function openverse(id: string, label: string, extra: Record<string, string>): StockProvider {
  return {
    id,
    label,
    async search(query, page, signal) {
      const params = new URLSearchParams({ q: query || 'abstract', page: String(page), page_size: '24', license_type: 'commercial', mature: 'false', ...extra })
      const res = await fetch(`https://api.openverse.org/v1/images/?${params}`, { signal })
      if (res.status === 429) throw new Error('The photo library is busy right now. Try again in a minute.')
      if (!res.ok) throw new Error('The photo library could not be reached.')
      const data = (await res.json()) as OpenverseResponse
      return {
        hasMore: page < data.page_count,
        items: data.results.map((r) => ({
          id: r.id,
          title: r.title || 'Untitled',
          url: r.url,
          thumbnail: r.thumbnail ?? r.url,
          width: r.width ?? 1200,
          height: r.height ?? 800,
          credit: r.creator,
          creditUrl: r.foreign_landing_url,
          license: r.license ? `CC ${r.license.toUpperCase()}${r.license_version ? ` ${r.license_version}` : ''}` : undefined,
        })),
      }
    },
  }
}

export const PHOTO_PROVIDERS: StockProvider[] = [openverse('openverse-photos', 'Openverse photos', { category: 'photograph' })]
export const GIF_PROVIDERS: StockProvider[] = [openverse('openverse-gifs', 'Openverse GIFs', { extension: 'gif' })]
export const ILLUSTRATION_PROVIDERS: StockProvider[] = [openverse('openverse-art', 'Openverse illustrations', { category: 'illustration' })]
