import { useSessionName } from './SessionNames'
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { acknowledgeAttention, attentionPage, type OperatorAttention } from '../api/attention'
import { messageOf } from '../api/errors'
import { questionCard, sessionDetail } from '../api/view'
import { useClient } from '../app-client'
import type { Client } from '../api/client'
import type { Item, SessionSummary } from '../generated/view'
import { Link } from '../router'
import { sessionPath } from './SessionRow'
import { attentionReason } from '../lib/attentionReason'
import { AnswerBook, useAnswerState } from '../store/useAnswer'
import { useSessionScope } from './SessionScope'
import { deliveryOf } from '../lib/delivery'
import { dismissAttention, restoreAttention } from '../lib/dismissedAttention'

function PermissionChoices({ question, book }: { question: Extract<Item, { kind: 'question' }>; book: AnswerBook }) {
  const { local, hostAway } = useAnswerState(book, question.id)
  const delivery = deliveryOf(question, local, hostAway)
  const request = question.request
  if (request.type !== 'permission') return null
  return <div className="preview-choices"><p className="preview-question preview-permission"><bdi>{request.title || 'Permission request'}</bdi></p>
    {delivery.controls && <div className="q-opts">{request.options.map(option => <button key={option.option_id} type="button" className={'btn btn-sm ' + (option.option_kind === 'allow_once' ? 'btn-primary' : 'btn-secondary')} disabled={delivery.busy} onClick={() => void book.answer(question, { option_id: option.option_id })}>{option.name}</button>)}</div>}
    {!delivery.controls && <p role="status">{delivery.text}</p>}
    {delivery.error && <p role="alert" className="form-error"><bdi>{delivery.error}</bdi></p>}
    {local?.phase === 'uncertain' && <button className="btn btn-ghost" type="button" onClick={() => void book.checkAnswer(question)}>Refresh question</button>}
  </div>
}

function InlinePermission({ question, session }: { question: Extract<Item, { kind: 'question' }>; session: SessionSummary }) {
  const client = useClient(), scope = useSessionScope()
  const [current, setCurrent] = useState(question)
  const book = useMemo(() => new AnswerBook(client, session.session_id, item => { if (item.kind === 'question') setCurrent(item) }), [client, session.session_id])
  useEffect(() => { setCurrent(question); book.observe([question], 1) }, [book, question])
  const connected = scope?.hosts?.find(h => h.host_id === session.host_id)?.connected
  useEffect(() => { book.setHostAway(session.presumed_parked || connected === false) }, [book, connected, session.presumed_parked])
  return <PermissionChoices question={current} book={book} />
}

type Preview = { question?: Extract<Item, { kind: 'question' }>; attention?: OperatorAttention; partial?: boolean }
/** One scheduler per visit, including detail, question and attention reads. */
export class PreviewReader {
  private active = 0
  private queue: (() => void)[] = []
  private stopped = false
  private abort = new AbortController()
  private cache = new WeakMap<SessionSummary, Promise<Preview>>()
  private questions = new Map<string, Extract<Item, { kind: 'question' }>>()
  constructor(private client: Client) {}
  stop() { this.stopped = true; this.abort.abort(); this.queue = []; this.cache = new WeakMap(); this.questions.clear() }
  private task<T>(read: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const begin = () => {
        if (this.stopped) return
        this.active++
        void read().then(resolve, reject).finally(() => { this.active--; if (!this.stopped) this.queue.shift()?.() })
      }
      if (this.active < 2) begin(); else this.queue.push(begin)
    })
  }
  read(session: SessionSummary): Promise<Preview> {
    // Every immutable summary upsert can change which pending id is live,
    // even when its timestamp/count ties. Focus creates a new visit reader.
    let held = this.cache.get(session)
    if (!held) {
      held = this.load(session); this.cache.set(session, held)
    }
    return held
  }
  private async load(session: SessionSummary): Promise<Preview> {
    const detail = await this.task(() => sessionDetail(this.client, session.session_id, this.abort.signal))
    if (this.stopped) return {}
    const pending = detail.pending?.find(p => p.state === 'open' && !p.answered && !p.delivered)
    if (pending) {
      const item = await this.task(() => questionCard(this.client, session.session_id, pending.pending_id, this.abort.signal))
      if (item.kind !== 'question' || item.pending_id !== pending.pending_id) throw new Error('Question preview unavailable.')
      const key = JSON.stringify([session.session_id, pending.pending_id, item.id])
      const before = this.questions.get(key)
      const question = before && before.version > item.version ? before : item
      this.questions.set(key, question)
      return { question }
    }
    const page = await this.task(() => attentionPage(this.client, session.hat_id, undefined, this.abort.signal))
    return { attention: page.find(row => row.hat_id === session.hat_id && row.child_id === session.session_id && row.pending_id === null), partial: page.length === 100 }
  }
}
const Context = createContext<PreviewReader | null>(null)
export function AttentionPreviews({ children }: { children: ReactNode }) {
  const client = useClient(), [visit, setVisit] = useState(0)
  const [reader, setReader] = useState<PreviewReader | null>(null)
  useEffect(() => {
    const next = new PreviewReader(client); setReader(next)
    return () => next.stop()
  }, [client, visit])
  useEffect(() => {
    const refresh = () => setVisit(n => n + 1)
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])
  return <Context.Provider value={reader}>{children}</Context.Provider>
}
export default function AttentionPreview({ session }: { session: SessionSummary }) {
  const scope = useSessionScope(), client = useClient()
  const dismissed = scope?.isAttentionDismissed(session.session_id) ?? false
  const [dismissing, setDismissing] = useState(false)
  const [dismissError, setDismissError] = useState<string | null>(null)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const name = useSessionName(session, session.session_id)
  const reader = useContext(Context), box = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(typeof IntersectionObserver === 'undefined')
  const [state, setState] = useState<{ reader: PreviewReader; session: SessionSummary; value?: Preview; error?: string } | null>(null)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(entries => setVisible(entries.some(e => e.isIntersecting)))
    if (box.current) observer.observe(box.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!reader || (!visible && !dismissed)) return
    let live = true
    reader.read(session).then(value => { if (live) setState({ reader, session, value }) }, error => { if (live) setState({ reader, session, error: messageOf(error) }) })
    return () => { live = false }
  }, [reader, visible, dismissed, session])
  const held = state?.reader === reader && state?.session.session_id === session.session_id ? state : null
  const question = held?.value?.question
  const request = question?.request
  const title = request?.type === 'permission' ? request.title || 'Permission request' : request?.type === 'elicitation' ? request.message : undefined
  const attention = held?.value?.attention
  const key = question ? `pending:${question.pending_id}:${session.operator_attention}` : attention ? `attention:${attention.id}:${attention.reason}:${session.operator_attention}` : held ? `session:${session.last_event_at}:${session.operator_attention}` : undefined
  const reportKey = scope?.reportAttentionKey
  useEffect(() => { if (key) reportKey?.(session.session_id, key) }, [reportKey, session.session_id, key])
  async function dismiss() {
    if (!key) return
    if (dismissed) { restoreAttention(session.session_id); return }
    setDismissing(true); setDismissError(null)
    try {
      if (attention) await acknowledgeAttention(client, attention.id)
      if (alive.current) dismissAttention(session.session_id, key)
    } catch (error) { setDismissError(messageOf(error)) }
    finally { if (alive.current) setDismissing(false) }
  }
  const target = question ? `${sessionPath(session.session_id)}?pending=${encodeURIComponent(question.pending_id)}` : sessionPath(session.session_id)
  const openLabel = request?.type === 'elicitation' ? 'Open to answer' : 'Open'
  return <div ref={box} className="attention-preview">
    <button type="button" className="attention-dismiss" aria-label={dismissed ? 'Restore' : 'Dismiss'} title={attention ? 'Acknowledge this attention' : 'Dismiss in this browser'} disabled={!key || dismissing} onClick={() => void dismiss()}>{dismissed ? '↶' : '×'}</button>
    {question && request?.type === 'permission' ? <InlinePermission key={question.pending_id} question={question} session={session} /> : title && <p className="preview-question preview-elicitation"><bdi>{title}</bdi></p>}
    {held?.value?.attention && <p><bdi>{attentionReason(held.value.attention.reason)}</bdi></p>}
    {held?.value?.partial && !held.value.attention && <p>More attention records are available in the session.</p>}
    {held?.error && <p className="preview-error">Preview unavailable: <bdi>{held.error}</bdi></p>}
    {!held && <p className="preview-note">Open the session to review the current request.</p>}
    {dismissError && <p role="alert" className="form-error">{dismissError}</p>}
    <div className="preview-actions"><Link data-session-link to={target} className="btn btn-primary" aria-label={`${openLabel} ${name.text}`}>{openLabel}</Link>{attention && !dismissed && <button className="btn btn-ghost" type="button" disabled={dismissing} onClick={() => void dismiss()}>Acknowledge</button>}</div>
  </div>
}
