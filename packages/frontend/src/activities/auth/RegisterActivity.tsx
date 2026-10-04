import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Fields'
import { useAuthStore } from '@/stores/authStore'
import { ApiError } from '@/services/api/http'
import { errorMessage } from '@/stores/toastStore'
import { AuthLayout } from './AuthLayout'
import { GoogleButton } from './GoogleButton'
import { domainHint, emailAllowed, useAuthConfig } from '@/hooks/useAuthConfig'

export default function RegisterActivity() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const register = useAuthStore((s) => s.register)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const cfg = useAuthConfig()
  const domains = cfg?.allowedEmailDomains ?? []
  const emailError = email && !emailAllowed(email, domains) ? `Use your ${domainHint(domains)} email address.` : fields.email

  if (user) return <Navigate to="/" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setFields({})
    try {
      await register(name, email, password)
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.fields) setFields(err.fields)
      else setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <form className="auth__form" onSubmit={submit} noValidate>
        <div>
          <h1>Create your account</h1>
          <p className="lede">Start designing in under a minute. No card needed.</p>
        </div>
        {error && (
          <div className="auth__error" role="alert">
            {error}
          </div>
        )}
        <TextField label="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={fields.name} required autoFocus />
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={emailError} hint={domains.length ? `Open to ${domainHint(domains)} addresses.` : undefined} required />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fields.password}
          required
        />
        <Button type="submit" variant="primary" size="lg" block loading={busy} disabled={!name || !email || password.length < 8 || !!emailError}>
          Create account
        </Button>
        <GoogleButton onSignedIn={() => navigate('/', { replace: true })} onError={setError} />
        <p className="auth__alt">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  )
}
