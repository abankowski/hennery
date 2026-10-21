import { useState } from 'react'
import { useClient } from '../app-client'
import { messageOf } from '../api/errors'
import { editQueuedPrompt, removeQueuedPrompt } from '../api/turns'
import type { QueuedPrompt } from '../generated/protocol'

export function queuedText(item: QueuedPrompt): string {
  return item.content.filter(block => block.type === 'text').map(block => block.text).join('\n')
}

/** Queue edits have their own draft; they never replace the ordinary composer. */
export default function PromptQueue({ sessionId, items, changed }: { sessionId: string; items: QueuedPrompt[]; changed?: () => Promise<void> }) {
  const client = useClient()
  const [editing, setEditing] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [manualCopy, setManualCopy] = useState<string | null>(null)
  if (!items.length) return null

  async function mutate(work: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await work()
      setEditing(null)
    } catch (err) {
      setError(messageOf(err))
    } finally {
      // Refresh after refusals too: another window or the worker may have won.
      await changed?.()
      setBusy(false)
    }
  }

  return <section className="prompt-queue" aria-label="Queued messages">
    <h3>Queued <span>{items.length}</span></h3>
    <ol>
      {items.map((item, index) => {
        const preview = queuedText(item)
        const images = item.content.filter(block => block.type === 'image').length
        const isEditing = editing === item.id && item.state === 'queued'
        return <li key={item.id} className={item.state === 'failed' ? 'queue-failed' : undefined}>
          <div className="queue-copy">
            <span className="queue-number">{index + 1}</span>
            <div>
              {isEditing ? <textarea aria-label={`Edit queued message ${index + 1}`} value={text} onChange={event => setText(event.target.value)} disabled={busy} /> : <p><bdi>{preview.length > 240 ? `${preview.slice(0, 240)}…` : preview || 'Image message'}</bdi></p>}
              {images > 0 && <small>{images} {images === 1 ? 'image' : 'images'}</small>}
              {item.state === 'delivering' && <small role="status">Delivering…</small>}
              {item.reason && <p className="queue-reason"><bdi>{item.reason}</bdi></p>}
              {manualCopy === item.id && <textarea readOnly aria-label={`Full text of queued message ${index + 1}`} value={preview} onFocus={event => event.currentTarget.select()} />}
            </div>
          </div>
          <div className="queue-actions">
            {isEditing ? <>
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void mutate(() => editQueuedPrompt(client, sessionId, item.id, text))}>Save</button>
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setEditing(null)}>Cancel edit</button>
            </> : item.state === 'queued' && <button className="btn btn-ghost btn-sm" disabled={busy} aria-label={`Edit queued message ${index + 1}`} onClick={() => { setEditing(item.id); setText(preview); setError(null) }}>Edit</button>}
            {item.state === 'failed' && <button className="btn btn-ghost btn-sm" onClick={() => {
              void (async () => {
                try {
                  if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable')
                  await navigator.clipboard.writeText(preview)
                  setCopied(item.id)
                } catch { setManualCopy(item.id); setError('Copy was unavailable. Select the full message text to copy it.') }
              })()
            }}>{copied === item.id ? 'Copied' : 'Copy'}</button>}
            {item.state !== 'delivering' && <button className="btn btn-ghost btn-sm" disabled={busy} aria-label={`${item.state === 'failed' ? 'Dismiss' : 'Remove'} queued message ${index + 1}`} onClick={() => void mutate(() => removeQueuedPrompt(client, sessionId, item.id))}>{item.state === 'failed' ? 'Dismiss' : 'Remove'}</button>}
          </div>
        </li>
      })}
    </ol>
    {error && <p className="form-error" role="alert"><bdi>{error}</bdi></p>}
  </section>
}
