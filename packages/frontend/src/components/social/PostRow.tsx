import { useState } from 'react'
import type { SocialPost } from '@/models/api'
import { socialApi } from '@/services/api/socialApi'
import { useSocialStore } from '@/stores/socialStore'
import { errorMessage, toast } from '@/stores/toastStore'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextAreaField } from '@/components/ui/Fields'
import { confirmDialog } from '@/components/ui/confirm'
import { timeAgo } from '@/utils/common'
import { PLATFORM_LABEL, STATUS_LABEL, STATUS_TONE } from './platforms'

export function PostRow({ post, userId }: { post: SocialPost; userId: number }) {
  const { replacePost, removePost } = useSocialStore()
  const [busy, setBusy] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [when, setWhen] = useState('')

  const isAuthor = post.authorId === userId
  const isReviewer = post.reviewerId === userId

  async function run(label: string, fn: () => Promise<SocialPost | void>) {
    setBusy(label)
    try {
      const result = await fn()
      if (result) replacePost(result)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <article className="card post-row">
      {post.mediaUrl ? <img className="post-row__img" src={post.mediaUrl} alt="" /> : <div className="post-row__img post-row__img--empty" />}
      <div className="post-row__body">
        <div className="post-row__top">
          <strong>{PLATFORM_LABEL[post.platform] ?? post.platform}</strong>
          <span style={{ color: 'var(--ink-3)' }}>{post.accountName}</span>
          <span className={`badge ${STATUS_TONE[post.status]}`}>{STATUS_LABEL[post.status]}</span>
        </div>
        <p className="post-row__caption">{post.caption || <em style={{ color: 'var(--ink-3)' }}>No caption</em>}</p>
        <p className="post-row__meta">
          By {post.authorName}
          {post.reviewerName && ` · Reviewer ${post.reviewerName}`}
          {post.scheduledAt && post.status === 'SCHEDULED' && ` · Goes out ${new Date(post.scheduledAt).toLocaleString()}`}
          {post.publishedAt && ` · Published ${timeAgo(post.publishedAt)}`}
        </p>
        {post.feedback && <p className="post-row__note">Feedback: {post.feedback}</p>}
        {post.error && <p className="post-row__note post-row__note--error">{post.error}</p>}
        <div className="post-row__actions">
          {isAuthor && ['DRAFT', 'REJECTED'].includes(post.status) && post.reviewerId && (
            <Button size="sm" variant="primary" loading={busy === 'submit'} onClick={() => void run('submit', () => socialApi.submit(post.id))}>
              Submit for approval
            </Button>
          )}
          {isReviewer && post.status === 'PENDING_APPROVAL' && (
            <>
              <Button size="sm" variant="primary" loading={busy === 'approve'} onClick={() => void run('approve', () => socialApi.review(post.id, true))}>
                Approve
              </Button>
              <Button size="sm" onClick={() => setRejecting(true)}>
                Request changes
              </Button>
            </>
          )}
          {isAuthor && (['APPROVED', 'FAILED'].includes(post.status) || (post.status === 'DRAFT' && !post.reviewerId)) && (
            <>
              <Button size="sm" variant="primary" icon="send" loading={busy === 'publish'} onClick={() => void run('publish', () => socialApi.publish(post.id))}>
                Publish now
              </Button>
              <Button size="sm" icon="calendar" onClick={() => setScheduling(true)}>
                Schedule
              </Button>
            </>
          )}
          {isAuthor && !['PUBLISHED', 'PUBLISHING'].includes(post.status) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                const ok = await confirmDialog({ title: 'Delete this post?', message: 'It will not be published.', confirmLabel: 'Delete post', danger: true })
                if (ok) await run('delete', async () => { await socialApi.deletePost(post.id); removePost(post.id) })
              }}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {rejecting && (
        <Modal
          title="Request changes"
          onClose={() => setRejecting(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setRejecting(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!feedback.trim()}
                onClick={async () => {
                  await run('reject', () => socialApi.review(post.id, false, feedback.trim()))
                  setRejecting(false)
                }}
              >
                Send feedback
              </Button>
            </>
          }
        >
          <TextAreaField label="What should change?" value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4} />
        </Modal>
      )}
      {scheduling && (
        <Modal
          title="Schedule post"
          onClose={() => setScheduling(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setScheduling(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!when}
                onClick={async () => {
                  await run('schedule', () => socialApi.publish(post.id, new Date(when).toISOString()))
                  setScheduling(false)
                }}
              >
                Schedule post
              </Button>
            </>
          }
        >
          <div className="field">
            <label className="field__label" htmlFor="sched">
              Publish at
            </label>
            <input id="sched" type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
        </Modal>
      )}
    </article>
  )
}
