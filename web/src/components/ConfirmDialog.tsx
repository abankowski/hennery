import { useModalLayer } from './ui/useModalLayer'
// A confirmation before an action that cannot be taken back (frontend spec
// §8: renaming or revoking a host, purging a hat, removing a passkey or a
// device). The action runs from here: while it runs the dialog stays open,
// so a step-up dialog can open over it, and a refusal is shown in it, as
// text. Focus moves in, stays in (Tab cycles within it, and a click on the
// backdrop keeps it), and goes back where it was when it closes, or to
// `returnFocus` when that is gone.
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { messageOf } from '../api/errors'
import { Text } from '../lib/text'

interface Props {
  title: string
  children: ReactNode
  /** The button that runs `action`. */
  confirm: string
  danger?: boolean
  /** The action cannot run now; the body says why. */
  disabled?: boolean
  /** Runs on the confirm button; the dialog closes when it resolves. */
  action: () => Promise<void>
  onClose: () => void
  /** Where focus goes on close when what opened the dialog is gone (the
   *  action removed it, or it was gone before the dialog opened). Read on
   *  close. */
  returnFocus?: () => HTMLElement | null
}

export default function ConfirmDialog({ title, children, confirm, danger, disabled, action, onClose, returnFocus }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const { trap, holdFocus } = useModalLayer(dialog)
  const live = useRef(true)
  const titleId = useId()
  const fallback = useRef(returnFocus)
  fallback.current = returnFocus

  useEffect(() => {
    live.current = true
    const before = document.activeElement as HTMLElement | null
    dialog.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    return () => {
      live.current = false
      // An opener removed as the dialog opened leaves focus on the body.
      const gone = !before || before === document.body || !before.isConnected
      const back = gone ? fallback.current?.() : before
      back?.focus?.()
    }
  }, [])

  const run = async () => {
    // Its buttons are disabled while the action runs: focus is held by the
    // dialog itself, so a step-up opened over it returns focus here.
    dialog.current?.focus()
    setBusy(true)
    setError(null)
    try {
      await action()
      if (live.current) onClose()
    } catch (err) {
      if (live.current) setError(messageOf(err))
    } finally {
      if (live.current) setBusy(false)
    }
  }

  return (
    <div className="overlay" onKeyDown={(e) => trap(e, onClose, !busy)} onMouseDown={holdFocus}>
      <div className="modal dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialog} tabIndex={-1}>
        <div className="modal-head">
          <h2 className="modal-title" id={titleId}>
            {title}
          </h2>
        </div>
        <div className="modal-body">
          {children}
          {error && (
            <p className="form-error" role="alert">
              <Text>{error}</Text>
            </p>
          )}
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy} data-autofocus>
            Cancel
          </button>
          <span className="spacer" />
          <button type="button" className={danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={run} disabled={busy || disabled}>
            {confirm}
          </button>
        </div>
      </div>
    </div>
  )
}
