import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useClient } from '../app-client'
import { messageOf } from '../api/errors'
import type { SessionDetail, UpdateSessionRequest } from '../generated/protocol'

export default function RenameSession({ id, title, canReset = false, saved, cancel }: { id: string; title: string; canReset?: boolean; saved: (session: SessionDetail) => void; cancel: () => void }) {
  const client = useClient()
  const [text, setText] = useState(title), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null), request = useRef<AbortController | null>(null)
  const discard = () => cancel()
  useEffect(() => { input.current?.focus(); input.current?.select(); return () => request.current?.abort() }, [])
  async function update(title: string | null) {
    if (busy) return
    const abort = new AbortController(); request.current = abort
    setBusy(true); setError(null)
    const body: UpdateSessionRequest = { title }
    try {
      const result = await client.request<SessionDetail>('PATCH', `/api/sessions/${encodeURIComponent(id)}`, body, { signal: abort.signal })
      if (!abort.signal.aborted) { saved(result) }
    } catch (error) { if (!abort.signal.aborted) { setError(messageOf(error)); setBusy(false) } }
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    if (text.trim()) void update(text.trim())
  }
  return <form className="conv-name session-rename-form" aria-label="Rename session" onSubmit={event => void submit(event)} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!busy) discard() } }}>
    <input ref={input} aria-label="Session name" value={text} maxLength={120} disabled={busy} onChange={event => setText(event.target.value)} />
    <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !text.trim()}>{busy ? 'Saving…' : 'Save'}</button>
    <button type="button" className="btn btn-ghost btn-sm" aria-label="Cancel rename" disabled={busy} onClick={discard}>×</button>
    {canReset && <button type="button" className="btn btn-ghost btn-sm session-rename-reset" disabled={busy} onClick={() => void update(null)}>Reset to agent title</button>}
    {error && <p role="alert" className="form-error">{error}</p>}
  </form>
}
