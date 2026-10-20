// The family remains a set of independent sessions. Read real receipts and
// routing state; an accepted operation is never rendered as a successful run.
import { useEffect, useRef, useState } from 'react'
import { ApiFailure, messageOf } from '../api/errors'
import { familyPage, takeOver } from '../api/view'
import { useClient } from '../app-client'
import type { FamilyChild, FamilyPage, SessionSummary } from '../generated/view'
import { agentLabel } from '../lib/agent'
import { attentionReason } from '../lib/attentionReason'
import { Link } from '../router'
import { sessionPath } from './SessionRow'
import StatusAttention from './StatusAttention'

interface Props {
  id: string
  summary?: SessionSummary
  hosts: Map<string, string>
  resync: number
  onPage?: (page: FamilyPage) => void
}

export function handlingWords(handling: string): string {
  switch (handling) {
    case 'parent_queued': case 'parent_delivered': return 'Parent is handling'
    case 'operator_required': return 'Operator answer required'
    case 'answer_queued': return 'Answer queued'
    default: return 'Question routing is unavailable'
  }
}

export function routingWords(routing: string): string {
  return routing === 'active' ? 'Parent-driven' : routing === 'detached' ? 'Operator-driven' : routing === 'suspended' ? 'Delegation paused' : 'Routing unavailable'
}
export function operationWords(state: string): string {
  const labels = new Map([['accepted', 'Accepted'], ['waiting_config', 'Checking configuration'], ['dispatching', 'Sending'], ['delivered', 'Delivered'], ['done', 'Done'], ['failed', 'Failed'], ['cancelled', 'Cancelled']])
  return labels.get(state) ?? 'Operation status unavailable'
}
export function operationName(tool: string): string {
  return new Map([['spawn', 'Start child'], ['prompt', 'Prompt'], ['resume', 'Resume'], ['cancel', 'Cancel'], ['close', 'Close'], ['answer', 'Answer']]).get(tool) ?? 'Session operation'
}

export default function FamilyPanel({ id, summary, hosts, resync, onPage }: Props) {
  const client = useClient()
  const [loadedPage, setPage] = useState<FamilyPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [taking, setTaking] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)
  const generation = useRef(0)
  const report = useRef(onPage)
  report.current = onPage
  // Family summaries change only on family facts. Ordinary transcript tokens
  // must never refetch the whole family. Resync invalidates these pages too.
  const familyKey = JSON.stringify([summary?.hat_id, summary?.lifecycle, summary?.activity, summary?.family, summary?.operator_attention, summary?.parent_handled_questions])
  useEffect(() => {
    const current = ++generation.current
    setPage(held => held?.summary.session_id === id ? held : null)
    setError(null)
    setBusy(true)
    familyPage(client, id).then(value => {
      if (generation.current !== current) return
      setPage(value)
      report.current?.(value)
    }, err => { if (generation.current === current && !(err instanceof ApiFailure && err.status === 404)) setError(messageOf(err)) })
      .finally(() => { if (generation.current === current) setBusy(false) })
    return () => { generation.current++ }
  }, [client, id, familyKey, resync, refresh])

  const page = loadedPage?.summary.session_id !== id || (summary && (summary.hat_id !== loadedPage?.summary.hat_id || summary.family?.revision !== loadedPage?.summary.family?.revision)) ? null : loadedPage
  const more = async () => {
    if (!page?.next_cursor || busy) return
    const current = generation.current
    setBusy(true); setError(null)
    try {
      const next = await familyPage(client, id, page.next_cursor)
      if (generation.current !== current) return
      setPage(held => held && ({ ...next, children: [...held.children, ...next.children.filter(child => !held.children.some(old => old.summary.session_id === child.summary.session_id))] }))
    } catch (err) { if (generation.current === current) setError(messageOf(err)) }
    finally { if (generation.current === current) setBusy(false) }
  }
  const takeover = async (child: Pick<FamilyChild, 'summary'>) => {
    if (taking) return
    const current = generation.current
    setTaking(child.summary.session_id); setError(null)
    try {
      await takeOver(client, child.summary.session_id)
      if (generation.current === current) setRefresh(n => n + 1)
    } catch (err) { if (generation.current === current) setError(messageOf(err)) }
    finally { setTaking(null) }
  }

  const family = summary ? summary.family : page?.summary.family
  const selected = summary ?? page?.summary
  const hasAttention = (selected?.operator_attention ?? 0) > 0 || (selected?.family?.attention ?? 0) > 0 || (page?.summary.operator_attention ?? 0) > 0 || (page?.summary.family?.attention ?? 0) > 0
  if (!family?.parent && !family?.child_counts.total && !error && !hasAttention) return <p className="item-note">{busy ? 'Loading family…' : 'No related sessions.'}</p>
  return <section className="family-panel" aria-label="Session family">
    <details open>
      <summary>{family?.parent || family?.child_counts.total ? 'Family' : 'Attention'}{family?.child_counts.total ? ` · ${family.child_counts.total} children` : ''}</summary>
      {selected && <StatusAttention session={selected} children={page?.children.map(child => child.summary) ?? []} enabled={hasAttention && page !== null} refreshKey={`${familyKey}:${resync}:${refresh}`} onAcknowledged={() => setRefresh(n => n + 1)} />}
      {family?.parent && <p>Parent: <Link to={sessionPath(family.parent.session_id)}><bdi>{family.parent.title || agentLabel(family.parent.agent)}</bdi></Link></p>}
      {page?.routing && <p>{routingWords(page.routing)}{page.reason && <> · {attentionReason(page.reason)}</>}</p>}
      {family?.parent && page?.routing === 'active' && <button type="button" className="btn btn-ghost btn-sm" disabled={taking !== null} onClick={() => void takeover({ summary: page.summary })}>{taking === id ? 'Taking over…' : 'Take over'}</button>}
      {page?.children.map(child => {
        const s = child.summary
        const title = s.title || s.session_id
        return <article key={s.session_id} className="family-child" aria-label={title}>
          <Link to={sessionPath(s.session_id)}><bdi>{title}</bdi></Link>
          <div className="family-meta">
            <span>{agentLabel(s.agent)}</span>{s.model && <bdi>{s.model}</bdi>}
            <bdi>{hosts.get(s.host_id) || s.host_id}</bdi><bdi>{s.cwd}</bdi>
            <span>{s.lifecycle}</span>{s.activity && <span>{s.activity}</span>}
            <span>{routingWords(child.routing)}</span>
          </div>
          {child.reason && <p>{attentionReason(child.reason)}</p>}
          {child.operations.length >= 16 && <p className="item-note">Latest 16 operations</p>}
          {child.operations.map(op => <p key={op.operation_id} className="family-operation">{operationName(op.tool)}: {operationWords(op.state)}{op.code && <> · {attentionReason(op.code)}</>}</p>)}
          {child.questions.map(question => <p key={question.pending_id}>
            <span>{handlingWords(question.handling)}</span>{question.reason && <> · {attentionReason(question.reason)}</>}{' '}
            <Link to={`${sessionPath(s.session_id)}?pending=${encodeURIComponent(question.pending_id)}`}>Open question</Link>
          </p>)}
          {child.routing === 'active' && <button type="button" className="btn btn-ghost btn-sm" aria-label={`Take over ${title}`} disabled={taking !== null} onClick={() => void takeover(child)}>{taking === s.session_id ? 'Taking over…' : 'Take over'}</button>}
        </article>
      })}
      {page?.next_cursor && <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void more()}>Load more children</button>}
      {busy && <p role="status">Loading family…</p>}
      {error && <p className="form-error" role="alert">{error} <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRefresh(n => n + 1)}>Retry family</button></p>}
    </details>
  </section>
}
