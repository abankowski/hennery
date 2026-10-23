import { useCallback, useEffect, useRef, useState } from 'react'
import { useClient } from '../app-client'
import { markResultRead } from '../api/view'
import { messageOf } from '../api/errors'
import type { ReviewResult } from '../generated/view'

/** The acknowledgement is scoped to the rendered result, never to whatever
 * result happens to be current when the HTTP response arrives. */
export function useReadResult(id: string, review?: ReviewResult) {
  const client = useClient()
  const token = review?.event_id
  const [state, setState] = useState<{ token: number; busy?: boolean; read?: boolean; error?: string } | null>(null)
  const sending = useRef<number | undefined>(undefined)
  const completed = useRef<number | undefined>(undefined)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const read = useCallback(async () => {
    if (token === undefined || sending.current === token || completed.current === token) return
    sending.current = token
    setState({ token, busy: true })
    try {
      await markResultRead(client, id, token)
      completed.current = token
      if (alive.current) setState({ token, read: true })
    } catch (error) {
      if (alive.current) setState({ token, error: messageOf(error) })
    } finally { if (sending.current === token) sending.current = undefined }
  }, [client, id, token])
  return { read, state: state?.token === token ? state : null }
}

export default function ResultReview({ id, review }: { id: string; review: ReviewResult }) {
  const { read, state } = useReadResult(id, review)
  return <div className="result-review-actions">
    <button type="button" className="btn btn-secondary btn-sm" disabled={state?.busy || state?.read} onClick={() => void read()}>{state?.read ? 'Read' : state?.busy ? 'Marking as read…' : 'Mark as read'}</button>
    {state?.error && <p role="alert" className="form-error">{state.error}</p>}
  </div>
}
