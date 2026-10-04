import { useEffect, useState } from 'react'
import { authApi } from '@/services/api/authApi'

export interface AuthConfig {
  googleClientId: string
  allowedEmailDomains: string[]
}

let cached: Promise<AuthConfig> | null = null

/** Public sign-in settings (Google availability and the email rule), fetched once. */
export function useAuthConfig(): AuthConfig | null {
  const [config, setConfig] = useState<AuthConfig | null>(null)
  useEffect(() => {
    cached ??= authApi.config().catch(() => ({ googleClientId: '', allowedEmailDomains: [] }))
    let live = true
    void cached.then((c) => live && setConfig(c))
    return () => {
      live = false
    }
  }, [])
  return config
}

export function emailAllowed(email: string, domains: string[]): boolean {
  if (!domains.length) return true
  const host = email.trim().toLowerCase().split('@')[1]
  return !!host && domains.some((d) => host === d || host.endsWith(`.${d}`))
}

export function domainHint(domains: string[]): string {
  if (domains.length <= 1) return domains[0] ?? ''
  return `${domains.slice(0, -1).join(', ')} or ${domains[domains.length - 1]}`
}
