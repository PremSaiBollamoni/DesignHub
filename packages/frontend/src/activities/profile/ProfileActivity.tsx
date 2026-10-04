import { useEffect, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { authApi } from '@/services/api/authApi'
import { contentApi } from '@/services/api/contentApi'
import { useAuthStore } from '@/stores/authStore'
import { errorMessage, toast } from '@/stores/toastStore'
import { Button } from '@/components/ui/Button'
import { Avatar, TextField } from '@/components/ui/Fields'
import { Icon } from '@/components/ui/Icon'
import { AiSettingsPanel } from '@/components/profile/AiSettingsPanel'
import { EmailSettingsPanel } from '@/components/profile/EmailSettingsPanel'
import '@/activities/brand/brand.css'
import './profile.css'

export default function ProfileActivity() {
  const user = useAuthStore((s) => s.user)!
  const { hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const [name, setName] = useState(user.name)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [changing, setChanging] = useState(false)

  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateProfile({ name })
      toast.success('Profile saved')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function changeAvatar(file: File | undefined) {
    if (!file) return
    setUploading(true)
    try {
      const asset = await contentApi.upload(file, file.name, { kind: 'avatar' })
      await updateProfile({ avatarUrl: asset.url })
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault()
    setChanging(true)
    try {
      await authApi.changePassword(current, next)
      setCurrent('')
      setNext('')
      toast.success('Password updated')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setChanging(false)
    }
  }

  return (
    <div className="page__inner profile">
      <div className="page__head">
        <div>
          <h1>Profile</h1>
          <p>Your account, notifications and AI connections.</p>
        </div>
      </div>

      <section className="card brand-card">
        <h2>Your details</h2>
        <div className="profile__avatar">
          <Avatar name={user.name} src={user.avatarUrl} size={72} />
          <label className={`btn btn--sm ${uploading ? 'is-disabled' : ''}`}>
            <Icon name="upload" size={15} />
            {uploading ? 'Uploading…' : 'Change photo'}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void changeAvatar(e.target.files?.[0])} />
          </label>
        </div>
        <form className="profile__form" onSubmit={saveProfile}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          <TextField label="Email" value={user.email} disabled hint="Your email is your sign-in and cannot be changed here." />
          <Button type="submit" variant="primary" loading={saving} disabled={!name.trim() || name === user.name}>
            Save profile
          </Button>
        </form>
      </section>

      <section className="card brand-card">
        <h2>Password</h2>
        <form className="profile__form" onSubmit={changePassword}>
          <TextField label="Current password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          <TextField label="New password" type="password" autoComplete="new-password" hint="At least 8 characters" value={next} onChange={(e) => setNext(e.target.value)} />
          <Button type="submit" loading={changing} disabled={!current || next.length < 8}>
            Update password
          </Button>
        </form>
      </section>

      <EmailSettingsPanel />
      <AiSettingsPanel />
    </div>
  )
}
