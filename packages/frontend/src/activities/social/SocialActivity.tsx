import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { socialApi } from '@/services/api/socialApi'
import { useAuthStore } from '@/stores/authStore'
import { useSocialStore } from '@/stores/socialStore'
import { errorMessage, toast } from '@/stores/toastStore'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Tabs } from '@/components/ui/Fields'
import { confirmDialog } from '@/components/ui/confirm'
import { PostComposer } from '@/components/social/PostComposer'
import { PostRow } from '@/components/social/PostRow'
import { PLATFORM_LABEL } from '@/components/social/platforms'
import { timeAgo } from '@/utils/common'
import './social.css'

type Tab = 'posts' | 'accounts'

export default function SocialActivity() {
  const user = useAuthStore((s) => s.user)!
  const { platforms, accounts, posts, loaded, load, removeAccount } = useSocialStore()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>(params.get('connected') || params.get('error') ? 'accounts' : 'posts')
  const [error, setError] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)
  const [connecting, setConnecting] = useState<string | null>(null)

  useEffect(() => {
    load().catch((e) => setError(errorMessage(e)))
  }, [load])

  useEffect(() => {
    const connected = params.get('connected')
    const err = params.get('error')
    if (connected) toast.success(`${PLATFORM_LABEL[connected] ?? connected} is connected`)
    if (err) toast.error(err === 'cancelled' || err === 'denied' ? 'The connection was cancelled' : err === 'expired' ? 'That connection attempt expired. Try again.' : err)
    if (connected || err) setParams({}, { replace: true })
  }, [params, setParams])

  async function connect(platform: string) {
    setConnecting(platform)
    try {
      window.location.href = (await socialApi.connect(platform)).url
    } catch (e) {
      toast.error(errorMessage(e))
      setConnecting(null)
    }
  }

  async function disconnect(id: number, name: string) {
    const ok = await confirmDialog({ title: `Disconnect ${name}?`, message: 'Scheduled posts for this account will stop working.', confirmLabel: 'Disconnect', danger: true })
    if (!ok) return
    try {
      await socialApi.disconnect(id)
      removeAccount(id)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => location.reload()} />
  const waiting = posts.filter((p) => p.status === 'PENDING_APPROVAL' && p.reviewerId === user.id)

  return (
    <div className="page__inner">
      <div className="page__head">
        <div>
          <h1>Publishing</h1>
          <p>Draft, review, schedule and publish your designs to social networks.</p>
        </div>
        <Button variant="primary" icon="plus" onClick={() => setComposing(true)}>
          New post
        </Button>
      </div>
      <div style={{ maxWidth: 320, marginBottom: 20 }}>
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'posts', label: waiting.length ? `Posts (${waiting.length} to review)` : 'Posts' },
            { id: 'accounts', label: 'Accounts' },
          ]}
        />
      </div>

      {!loaded ? (
        <Skeleton height={180} radius={16} />
      ) : tab === 'posts' ? (
        posts.length === 0 ? (
          <EmptyState
            icon="send"
            title="No posts yet"
            message={accounts.length ? 'Create a post, or publish straight from the editor.' : 'Connect a social account, then create your first post.'}
            action={
              <Button variant="primary" onClick={() => (accounts.length ? setComposing(true) : setTab('accounts'))}>
                {accounts.length ? 'New post' : 'Connect an account'}
              </Button>
            }
          />
        ) : (
          <div className="post-list">
            {posts.map((p) => (
              <PostRow key={p.id} post={p} userId={user.id} />
            ))}
          </div>
        )
      ) : (
        <div className="platform-grid">
          {platforms.map((p) => {
            const mine = accounts.filter((a) => a.platform === p.platform)
            return (
              <section key={p.platform} className="card platform-card">
                <div className="platform-card__head">
                  <h2>{PLATFORM_LABEL[p.platform] ?? p.platform}</h2>
                  <Button size="sm" disabled={!p.configured} loading={connecting === p.platform} onClick={() => void connect(p.platform)}>
                    {mine.length ? 'Add another' : 'Connect'}
                  </Button>
                </div>
                {!p.configured && <p className="field__hint">Not set up on this server yet. An administrator needs to add the app credentials.</p>}
                {mine.map((a) => (
                  <div key={a.id} className="account-row">
                    <div>
                      <strong>{a.displayName}</strong>
                      <div className="field__hint">
                        Connected {timeAgo(a.connectedAt)}
                        {a.expired && ' · Expired, reconnect'}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => void disconnect(a.id, a.displayName)}>
                      Disconnect
                    </Button>
                  </div>
                ))}
              </section>
            )
          })}
        </div>
      )}

      {composing && <PostComposer onClose={() => setComposing(false)} />}
    </div>
  )
}
