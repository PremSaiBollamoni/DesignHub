import { useEffect, useRef, useState } from 'react'
import { authApi } from '@/services/api/authApi'
import { useAuthStore } from '@/stores/authStore'
import { errorMessage } from '@/stores/toastStore'

interface GoogleId {
  accounts: {
    id: {
      initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }) => void
      renderButton: (el: HTMLElement, o: Record<string, unknown>) => void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleId
  }
}

let loader: Promise<void> | null = null

function loadGoogleScript(): Promise<void> {
  loader ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Google sign-in could not be loaded. Check your connection.'))
    document.head.appendChild(s)
  })
  return loader
}

/** Google's own button, rendered only when the server has a client id. Sign-in then goes through our API. */
export function GoogleButton({ onSignedIn, onError }: { onSignedIn: () => void; onError: (message: string) => void }) {
  const host = useRef<HTMLDivElement>(null)
  const [clientId, setClientId] = useState<string | null | undefined>(undefined)
  const finish = useAuthStore((s) => s.finishGoogle)

  useEffect(() => {
    authApi
      .config()
      .then((c) => setClientId(c.googleClientId || null))
      .catch(() => setClientId(null))
  }, [])

  useEffect(() => {
    if (!clientId || !host.current) return
    let live = true
    loadGoogleScript()
      .then(() => {
        if (!live || !host.current || !window.google) return
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (r) => {
            authApi
              .google(r.credential)
              .then((res) => {
                finish(res)
                onSignedIn()
              })
              .catch((e) => onError(errorMessage(e)))
          },
        })
        window.google.accounts.id.renderButton(host.current, { theme: 'outline', size: 'large', width: 376, text: 'continue_with', shape: 'rectangular', logo_alignment: 'left' })
      })
      .catch((e) => onError(errorMessage(e)))
    return () => {
      live = false
    }
  }, [clientId, finish, onSignedIn, onError])

  if (clientId === undefined) return null
  if (clientId === null) {
    return (
      <button type="button" className="btn btn--block btn--lg" disabled title="An administrator needs to add a Google client id to the server.">
        Continue with Google (not set up yet)
      </button>
    )
  }
  return (
    <>
      <div className="auth__divider">or</div>
      <div ref={host} style={{ display: 'grid', justifyItems: 'center', minHeight: 44 }} />
    </>
  )
}
