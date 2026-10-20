import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { attentionPage, type OperatorAttention } from '../api/attention'
import { messageOf } from '../api/errors'
import { questionCard, sessionDetail } from '../api/view'
import { useClient } from '../app-client'
import type { Client } from '../api/client'
import type { Item, SessionSummary } from '../generated/view'
import { Link } from '../router'
import { sessionPath } from './SessionRow'
import { attentionReason } from '../lib/attentionReason'

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
    if (!reader || !visible) return
    let live = true
    reader.read(session).then(value => { if (live) setState({ reader, session, value }) }, error => { if (live) setState({ reader, session, error: messageOf(error) }) })
    return () => { live = false }
  }, [reader, visible, session])
  const held = state?.reader === reader && state?.session === session ? state : null
  const question = held?.value?.question
  const request = question?.request
  const title = request?.type === 'permission' ? request.title || 'Permission request' : request?.type === 'elicitation' ? request.message : undefined
  const target = question ? `${sessionPath(session.session_id)}?pending=${encodeURIComponent(question.pending_id)}` : sessionPath(session.session_id)
  return <div ref={box} className="attention-preview">
    {title && <p className="preview-question"><bdi>{title}</bdi></p>}
    {question && (!question.answerable || question.answered || question.state !== 'open') && <p>The request changed. Open the session for its current state.</p>}
    {held?.value?.attention && <p><bdi>{attentionReason(held.value.attention.reason)}</bdi></p>}
    {held?.value?.partial && !held.value.attention && <p>More attention records are available in the session.</p>}
    {held?.error && <p className="preview-error">Preview unavailable: <bdi>{held.error}</bdi></p>}
    {!held && <p className="preview-note">Open the session to review the current request.</p>}
    <Link data-session-link to={target} className="btn btn-ghost" aria-label={`Open ${session.title || session.session_id}`}>{question ? request?.type === 'permission' ? 'Open request' : 'Open question' : 'Open session'}</Link>
  </div>
}
