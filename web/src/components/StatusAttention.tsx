// Attention is paged across the selected hat, then narrowed to the current
// session and the family children already loaded. Never scan extra pages or
// guess completion from a successful acknowledgement request.
import { useEffect, useRef, useState } from 'react'
import { acknowledgeAttention, attentionPage, type OperatorAttention } from '../api/attention'
import { messageOf } from '../api/errors'
import { useClient } from '../app-client'
import type { SessionSummary } from '../generated/view'
import { Link } from '../router'
import { sessionPath } from './SessionRow'

interface Props {
  session: SessionSummary
  children: SessionSummary[]
  enabled: boolean
  refreshKey: string
  onAcknowledged: () => void
}
interface Page { key: string; rows: OperatorAttention[]; cursor?: string }

export default function StatusAttention({ session, children, enabled, refreshKey, onAcknowledged }: Props) {
  const client = useClient()
  const [held, setPage] = useState<Page | null>(null)
  const [error, setError] = useState<{ key: string; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [acknowledging, setAcknowledging] = useState<{ key: string; id: string } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const generation = useRef(0)
  const key = JSON.stringify([session.session_id, session.hat_id, enabled, refreshKey, attempt])
  const latest = useRef(key)
  latest.current = key
  const acknowledged = useRef(onAcknowledged)
  acknowledged.current = onAcknowledged

  useEffect(() => {
    const current = ++generation.current
    setError(null)
    if (!enabled) { setBusy(false); return () => { generation.current++ } }
    setBusy(true)
    attentionPage(client, session.hat_id).then(rows => {
      if (generation.current !== current || latest.current !== key) return
      setPage({ key, rows, cursor: rows.length === 100 ? rows.at(-1)?.id : undefined })
    }, err => { if (generation.current === current && latest.current === key) setError({ key, text: messageOf(err) }) })
      .finally(() => { if (generation.current === current && latest.current === key) setBusy(false) })
    return () => { generation.current++ }
  }, [client, key])

  const page = held?.key === key ? held : null
  const sessions = new Map([session, ...children.filter(child => child.hat_id === session.hat_id)].map(child => [child.session_id, child]))
  const visible = page?.rows.filter(row => row.hat_id === session.hat_id && sessions.has(row.child_id)) ?? []
  const ownError = error?.key === key ? error.text : null
  const ackId = acknowledging?.key === key ? acknowledging.id : null

  const more = async () => {
    if (!page?.cursor || busy || latest.current !== key) return
    const current = generation.current
    setBusy(true); setError(null)
    try {
      const rows = await attentionPage(client, session.hat_id, page.cursor)
      if (generation.current !== current || latest.current !== key) return
      setPage(previous => previous?.key === key ? { key,
        rows: [...previous.rows, ...rows.filter(row => !previous.rows.some(old => old.id === row.id))],
        cursor: rows.length === 100 ? rows.at(-1)?.id : undefined,
      } : previous)
    } catch (err) { if (generation.current === current && latest.current === key) setError({ key, text: messageOf(err) }) }
    finally { if (generation.current === current && latest.current === key) setBusy(false) }
  }

  const acknowledge = async (row: OperatorAttention) => {
    if (ackId || row.pending_id !== null || row.hat_id !== session.hat_id || !sessions.has(row.child_id) || latest.current !== key) return
    const current = generation.current
    setAcknowledging({ key, id: row.id }); setError(null)
    try {
      await acknowledgeAttention(client, row.id)
      if (generation.current !== current || latest.current !== key) return
      acknowledged.current()
    } catch (err) { if (generation.current === current && latest.current === key) setError({ key, text: messageOf(err) }) }
    finally { setAcknowledging(previous => previous?.key === key && previous.id === row.id ? null : previous) }
  }

  if (!enabled) return null
  return <section className="family-attention" aria-label="Delegation attention">
    <h2>Needs your attention</h2>
    {visible.map(row => {
      const title = sessions.get(row.child_id)?.title || row.child_id
      return <p key={row.id}>
        <Link to={sessionPath(row.child_id)}><bdi>{title}</bdi></Link>{' · '}<bdi>{row.reason}</bdi>{' '}
        {row.pending_id === null
          ? <button type="button" className="btn btn-ghost btn-sm" aria-label={`Acknowledge ${row.reason} for ${title}`} disabled={ackId !== null} onClick={() => void acknowledge(row)}>{ackId === row.id ? 'Acknowledging…' : 'Acknowledge'}</button>
          : <Link to={`${sessionPath(row.child_id)}?pending=${encodeURIComponent(row.pending_id)}`}>Open question</Link>}
      </p>
    })}
    {page?.cursor && <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void more()}>Load more attention</button>}
    {busy && <p role="status">Loading attention…</p>}
    {ownError && <p className="form-error" role="alert">{ownError} <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAttempt(n => n + 1)}>Retry attention</button></p>}
  </section>
}
