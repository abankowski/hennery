import { useEffect, useRef, useState } from 'react'
import { useClient } from '../app-client'
import { itemPage } from '../api/view'
import type { Item, ReviewResult } from '../generated/view'
import { useReadResult } from './ResultReview'

/** The list and item streams can arrive in either order. Verify the final
 * item against a page taken after completion before observing its visible end. */
export default function ResultReadObserver({ id, review, lastItem }: { id: string; review: ReviewResult; lastItem: Item }) {
  const client = useClient(), ref = useRef<HTMLDivElement>(null)
  const [target, setTarget] = useState<{ token: number; item: Item } | null>(null)
  const { read } = useReadResult(id, review)
  useEffect(() => {
    let alive = true
    void itemPage(client, id, { limit: 1 }).then(page => {
      const item = [...page.items].reverse().find(item => item.turn_id === review.turn_id)
      if (alive && page.revision >= review.event_id && item) setTarget({ token: review.event_id, item })
    }).catch(() => { /* Manual acknowledgement remains available. */ })
    return () => { alive = false }
  }, [client, id, review.event_id, review.turn_id])
  useEffect(() => {
    if (target?.token !== review.event_id || target.item.id !== lastItem.id || target.item.version > lastItem.version) return
    const el = ref.current, root = el?.closest<HTMLElement>('.transcript')
    if (!el || !root) return
    const check = () => {
      if (document.visibilityState !== 'visible' || !document.hasFocus()) return
      const box = el.getBoundingClientRect(), viewport = root.getBoundingClientRect()
      if (box.width > 0 && box.height > 0 && viewport.height > 0 && box.top >= Math.max(0, viewport.top)
        && box.bottom <= Math.min(window.innerHeight, viewport.bottom)
        && box.left < Math.min(window.innerWidth, viewport.right) && box.right > Math.max(0, viewport.left)) void read()
    }
    const frame = requestAnimationFrame(check)
    root.addEventListener('scroll', check)
    window.addEventListener('focus', check)
    window.addEventListener('resize', check)
    document.addEventListener('visibilitychange', check)
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(check, { root })
    observer?.observe(el)
    return () => {
      cancelAnimationFrame(frame); observer?.disconnect()
      root.removeEventListener('scroll', check); window.removeEventListener('focus', check)
      window.removeEventListener('resize', check); document.removeEventListener('visibilitychange', check)
    }
  }, [target, review.event_id, lastItem.id, lastItem.version, read])
  const ready = target?.token === review.event_id && target.item.id === lastItem.id && target.item.version <= lastItem.version
  return <div ref={ref} data-review-ready={ready ? 'true' : 'false'} className="result-read-sentinel" aria-hidden="true" style={{ height: 1 }} />
}
