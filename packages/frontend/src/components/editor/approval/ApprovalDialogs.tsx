import { useState } from 'react'
import { approvalApi, type EmailDelivery } from '@/services/api/approvalApi'
import { collabSession } from '@/services/realtime/collabSession'
import { useApprovalStore } from '@/stores/approvalStore'
import { useEditorStore } from '@/stores/editorStore'
import { errorMessage, toast } from '@/stores/toastStore'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { TextAreaField } from '@/components/ui/Fields'

/** The Maker's side: tell the team's Editors the design is ready, with an optional note. */
export function SendApprovalModal({ onClose }: { onClose: () => void }) {
  const projectId = useEditorStore((s) => s.projectId)
  const a = useApprovalStore((s) => s.approval)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ emails: EmailDelivery[]; emailConfigured: boolean } | null>(null)

  async function send() {
    setBusy(true)
    try {
      collabSession.flushNow()
      await new Promise((r) => setTimeout(r, 700))
      const res = await approvalApi.submit(projectId, message.trim())
      useApprovalStore.getState().set(res.approval)
      setResult({ emails: res.emails, emailConfigured: res.emailConfigured })
    } catch (e) {
      toast.error(errorMessage(e))
      setBusy(false)
    }
  }

  if (result) {
    const failed = result.emails.filter((e) => !e.sent)
    return (
      <Modal title="Sent for approval" onClose={onClose} footer={<Button variant="primary" onClick={onClose}>Done</Button>}>
        <div className="ai-note" style={{ background: 'var(--success-tint)', color: 'var(--success)' }}>
          <Icon name="check" size={16} />
          <span>The Editors have been notified inside DesignHub. You will hear back here and by email.</span>
        </div>
        {!result.emailConfigured && <p className="field__hint">Email is not set up on the server, so only in-app notifications were sent.</p>}
        {result.emailConfigured && (
          <p className="field__hint">
            {result.emails.length - failed.length} email{result.emails.length - failed.length === 1 ? '' : 's'} sent.
          </p>
        )}
        {failed.length > 0 && result.emailConfigured && (
          <div className="form-error" role="alert" style={{ display: 'grid' }}>
            <b>{failed.length} email{failed.length === 1 ? '' : 's'} could not be delivered:</b>
            {failed.map((f) => (
              <span key={f.email}>
                {f.name || f.email}: {f.problem}
              </span>
            ))}
          </div>
        )}
      </Modal>
    )
  }

  return (
    <Modal
      title="Send for approval"
      onClose={onClose}
      locked={busy}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" icon="send" loading={busy} onClick={() => void send()}>
            Send to Editors
          </Button>
        </>
      }
    >
      {a?.status === 'CHANGES_REQUESTED' && a.feedback && (
        <div className="form-error" role="status" style={{ display: 'grid' }}>
          <b>{a.decidedBy} asked for changes:</b>
          <span>{a.feedback}</span>
        </div>
      )}
      <p>
        Everyone with the <b>Editor</b> role in <b>{a?.teamName}</b> gets an email and a notification. Any one of them can review, edit and approve this design.
      </p>
      {a && a.reviewers.length > 0 && (
        <p className="field__hint">
          Reviewers: {a.reviewers.join(', ')}
        </p>
      )}
      <TextAreaField label="Note for the Editors (optional)" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={2000} placeholder="What should they look at?" />
      <p className="field__hint">Your design is saved first, so they see exactly what you see now.</p>
    </Modal>
  )
}

/** The Editor's side: approve, with a caption for the post, or send it back with a reason. */
export function ReviewModal({ onClose }: { onClose: () => void }) {
  const a = useApprovalStore((s) => s.approval)
  const [caption, setCaption] = useState('')
  const [feedback, setFeedback] = useState('')
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  if (!a?.id) return null

  async function act(kind: 'approve' | 'changes') {
    setBusy(true)
    try {
      collabSession.flushNow()
      const next = kind === 'approve' ? await approvalApi.approve(a!.id!, caption) : await approvalApi.requestChanges(a!.id!, feedback)
      useApprovalStore.getState().set(next)
      toast.success(kind === 'approve' ? 'Approved. You can publish it now.' : 'Sent back to the Maker with your notes.')
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Review this design"
      onClose={onClose}
      locked={busy}
      footer={
        asking ? (
          <>
            <Button variant="ghost" onClick={() => setAsking(false)} disabled={busy}>Back</Button>
            <Button variant="danger" loading={busy} disabled={!feedback.trim()} onClick={() => void act('changes')}>
              Send back with notes
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setAsking(true)} disabled={busy}>Request changes</Button>
            <Button variant="primary" icon="check" loading={busy} onClick={() => void act('approve')}>
              Approve
            </Button>
          </>
        )
      }
    >
      <p>
        <b>{a.requestedBy}</b> sent this design for approval.
      </p>
      {a.message && (
        <blockquote style={{ margin: 0, padding: '10px 14px', borderLeft: '3px solid var(--brand)', background: 'var(--brand-subtle)' }}>{a.message}</blockquote>
      )}
      <p className="field__hint">You can edit the design before deciding. Approving locks in the version you see now, and any later change asks for approval again.</p>
      {asking ? (
        <TextAreaField label="What should change?" value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4} autoFocus maxLength={2000} />
      ) : (
        <TextAreaField label="Post caption (optional)" hint="Suggested text for when this is published." value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} maxLength={3000} />
      )}
    </Modal>
  )
}
