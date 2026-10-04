import { Button } from '@/components/ui/Button'
import { useApprovalStore } from '@/stores/approvalStore'
import type { EditorDialog } from '../EditorToolbar'

/**
 * Team designs go through approval, so the usual Publish button turns into the step the person is actually on:
 * send for approval, wait, review, or publish. Personal designs keep a plain Publish button.
 */
export function ApprovalControls({ onDialog }: { onDialog: (d: EditorDialog) => void }) {
  const a = useApprovalStore((s) => s.approval)

  if (!a || a.status === 'NO_TEAM') {
    return (
      <Button icon="send" onClick={() => onDialog('publish')}>
        Publish
      </Button>
    )
  }
  if (a.canReview) {
    return (
      <Button variant="primary" icon="check" onClick={() => onDialog('review')} title={`${a.requestedBy} is waiting for your decision`}>
        Review and approve
      </Button>
    )
  }
  if (a.canPublish) {
    return (
      <>
        <span className="badge badge--ok" title={`Approved by ${a.decidedBy}`}>
          Approved
        </span>
        <Button icon="send" variant="primary" onClick={() => onDialog('publish')}>
          Publish
        </Button>
      </>
    )
  }
  if (a.status === 'PENDING') {
    return (
      <span className="badge badge--warn" title={`Waiting for ${a.reviewers.join(', ')}`}>
        Waiting for approval
      </span>
    )
  }
  return (
    <>
      {a.status === 'CHANGES_REQUESTED' && (
        <span className="badge badge--danger" title={a.feedback}>
          Changes requested
        </span>
      )}
      {a.status === 'EXPIRED' && (
        <span className="badge badge--warn" title="The design changed after it was approved">
          Edited after approval
        </span>
      )}
      {a.canSubmit ? (
        <Button icon="send" onClick={() => onDialog('approval')}>
          {a.status === 'CHANGES_REQUESTED' || a.status === 'EXPIRED' ? 'Send for approval again' : 'Send for approval'}
        </Button>
      ) : (
        <span className="badge" title="Only Makers and Editors can send designs for approval">
          View only
        </span>
      )}
    </>
  )
}
