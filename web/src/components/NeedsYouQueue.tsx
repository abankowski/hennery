import { useEffect, useRef } from 'react'
import { needsOperator, statusOf } from '../lib/status'
import { relTime } from '../lib/time'
import { useNow } from '../hooks/useNow'
import { Link } from '../router'
import { agentLabel } from '../lib/agent'
import { useSessionScope } from './SessionScope'
import AttentionPreview, { AttentionPreviews } from './AttentionPreview'
import { moveListFocus } from './SessionList'
import { HatChip } from './ui'
export default function NeedsYouQueue() {
  const scope = useSessionScope(), now = useNow(60_000)
  const scan = useRef({ key: '', remaining: 2 })
  const list = scope?.list
  useEffect(() => {
    if (!list) return
    if (scan.current.key !== list.queryKey) scan.current = { key: list.queryKey, remaining: 2 }
    if (list.loading || list.loadingMore || list.error || !list.hasMore || scan.current.remaining === 0) return
    scan.current.remaining--
    void list.loadMore()
  }, [list?.queryKey, list?.loading, list?.loadingMore, list?.hasMore, list?.error, list?.loadMore])
  if (!scope || !list) return null
  const rows = list.shown.filter(needsOperator)
  const total = list.counts.waiting
  const complete = !list.loading && !list.hasMore && !list.error
  return <section className="needs-queue" aria-label="Attention queue" onKeyDown={moveListFocus}>
    <div className="queue-heading"><span>{rows.length} loaded · {list.loading ? 'checking attention' : `${total} need you`}</span><span>Most recent first</span></div>
    <p className="queue-help">Permissions, questions and delegation attention. Open a session to respond.</p>
    {list.error && <p role="alert" className="form-error"><bdi>{list.error}</bdi></p>}
    {list.stream === 'reconnecting' && <p role="status">Reconnecting…</p>}
    {list.loading && <p role="status">Loading attention…</p>}
    {!list.loading && !rows.length && <p className="queue-empty">{complete && total === 0 ? 'Nothing needs you' : 'No attention loaded yet'}</p>}
    <AttentionPreviews>{rows.map(session => {
      const hat = scope.hats?.find(h => h.id === session.hat_id)
      return <article key={session.session_id} className="attention-card" aria-label={session.title || session.session_id}>
        <div className="attention-card-meta"><span className="attention-status">{statusOf(session).label}</span><span>{relTime(session.last_event_at, now)}</span></div>
        <h2><bdi>{session.title || session.session_id}</bdi></h2>
        <div className="attention-origin"><HatChip colour={hat?.colour}><bdi>{hat?.name || 'Unknown hat'}</bdi></HatChip><bdi>{scope.hostNames.get(session.host_id) || 'Unknown host'}</bdi><bdi>{agentLabel(session.agent)}</bdi></div>
        <AttentionPreview session={session} />
      </article>
    })}</AttentionPreviews>
    {!list.loading && list.hasMore && <button type="button" className="btn btn-ghost" disabled={list.loadingMore} onClick={() => { scan.current.remaining = 2; void list.loadMore() }}>{list.loadingMore ? 'Loading…' : 'Load more'}</button>}
    <p className="queue-help queue-keys">J / K moves between focused cards. Enter opens the current request.</p>
    <Link className="queue-summary" to="/sessions">View sessions · {list.shown.filter(s => s.lifecycle === 'active' && s.activity === 'running').length} running · {list.shown.filter(s => s.lifecycle === 'active' && s.activity === 'idle').length} idle · {list.shown.filter(s => s.lifecycle === 'parked').length} parked{list.hasMore ? ' (loaded)' : ''}</Link>
  </section>
}
