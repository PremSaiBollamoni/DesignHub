import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Button } from './Button'
import { Modal } from './Modal'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
}

function ConfirmDialog({ options, onResult }: { options: ConfirmOptions; onResult: (ok: boolean) => void }) {
  const [busy] = useState(false)
  return (
    <Modal
      title={options.title}
      onClose={() => onResult(false)}
      locked={busy}
      footer={
        <>
          <Button variant="ghost" onClick={() => onResult(false)}>
            Cancel
          </Button>
          <Button variant={options.danger ? 'danger' : 'primary'} onClick={() => onResult(true)}>
            {options.confirmLabel}
          </Button>
        </>
      }
    >
      <p style={{ color: 'var(--ink-2)' }}>{options.message}</p>
    </Modal>
  )
}

/** Imperative confirmation: `if (await confirmDialog({...})) ...`. Button labels name the action, never "OK". */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const finish = (ok: boolean) => {
      root.unmount()
      host.remove()
      resolve(ok)
    }
    root.render(<ConfirmDialog options={options} onResult={finish} />)
  })
}
