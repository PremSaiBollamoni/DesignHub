import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Fields'
import { useAuthStore } from '@/stores/authStore'
import { errorMessage } from '@/stores/toastStore'
import { AuthLayout } from './AuthLayout'
import { GoogleButton } from './GoogleButton'
import { domainHint, emailAllowed, useAuthConfig } from '@/hooks/useAuthConfig'

export default function LoginActivity() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cfg = useAuthConfig()
  const domains = cfg?.allowedEmailDomains ?? []
  const emailError = email && !emailAllowed(email, domains) ? `Use your ${domainHint(domains)} email address.` : undefined
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (user) return <Navigate to={from} replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <form className="auth__form" onSubmit={submit} noValidate>
        <div>
          <h1>Sign in to DesignHub</h1>
          <p className="lede">Pick up your designs where you left off.</p>
        </div>
        {error && (
          <div className="auth__error" role="alert">
            {error}
          </div>
        )}
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={emailError} hint={domains.length ? `Open to ${domainHint(domains)} addresses.` : undefined} required autoFocus />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" variant="primary" size="lg" block loading={busy} disabled={!email || !password || !!emailError}>
          Sign in
        </Button>
        <GoogleButton onSignedIn={() => navigate(from, { replace: true })} onError={setError} />
        <p className="auth__alt">
          New to DesignHub? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </AuthLayout>
  )
}
