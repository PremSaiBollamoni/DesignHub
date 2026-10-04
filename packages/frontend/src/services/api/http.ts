const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8787').replace(/\/$/, '')
const TOKEN_KEY = 'dh-token'

export class ApiError extends Error {
  status: number
  fields?: Record<string, string>

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

let unauthorizedHandler: (() => void) | null = null

export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler
}

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      /* storage can be unavailable in private windows */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* ignore */
    }
  },
}

export const apiBase = BASE

export function wsUrl(): string {
  return BASE.replace(/^http/, 'ws') + '/ws'
}

interface RequestOptions {
  method?: string
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | null>
  signal?: AbortSignal
  form?: FormData
  auth?: boolean
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(BASE + path)
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
    }
  }
  const headers: Record<string, string> = {}
  const token = tokenStore.get()
  if (token && opts.auth !== false) headers.Authorization = `Bearer ${token}`
  let body: BodyInit | undefined
  if (opts.form) {
    body = opts.form
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }

  let res: Response
  try {
    res = await fetch(url, { method: opts.method ?? 'GET', headers, body, signal: opts.signal })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new ApiError(0, 'Cannot reach the DesignHub server. Check your connection and try again.')
  }

  if (res.status === 401 && opts.auth !== false) {
    tokenStore.clear()
    unauthorizedHandler?.()
  }
  if (!res.ok) {
    let message = 'Something went wrong. Try again.'
    let fields: Record<string, string> | undefined
    try {
      const data = await res.json()
      message = data.message ?? message
      fields = data.fields
    } catch {
      if (res.status === 401) message = 'Your session has ended. Sign in again.'
    }
    throw new ApiError(res.status, message, fields)
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const get = <T>(path: string, query?: RequestOptions['query'], signal?: AbortSignal) =>
  request<T>(path, { query, signal })
export const post = <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body })
export const put = <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body })
export const patch = <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body })
export const del = <T = void>(path: string) => request<T>(path, { method: 'DELETE' })
export const upload = <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', form })
