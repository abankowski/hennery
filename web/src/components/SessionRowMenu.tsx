import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNewLikeThis } from '../hooks/useNewLikeThis'
import { Icon } from './ui'

/** Portal the disclosure outside clipped project groups and scroll containers. */
export default function SessionRowMenu({ id, open, setOpen }: { id: string; open: boolean; setOpen: (open: boolean) => void }) {
  const like = useNewLikeThis(id)
  const trigger = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const [place, setPlace] = useState({ top: 0, left: 0 })
  const dismiss = () => { setOpen(false); trigger.current?.focus() }
  useLayoutEffect(() => {
    if (!open || !trigger.current || !menu.current) return
    const anchor = trigger.current.getBoundingClientRect(), box = menu.current.getBoundingClientRect()
    setPlace({ left: Math.max(8, Math.min(anchor.right - box.width, innerWidth - box.width - 8)), top: Math.max(8, anchor.bottom + box.height + 6 < innerHeight ? anchor.bottom + 6 : anchor.top - box.height - 6) })
    menu.current.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
  }, [open])
  useEffect(() => {
    if (!open) return
    const outside = (event: MouseEvent) => { if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false) }
    const move = (event: Event) => { if (!(event.target instanceof Node) || !menu.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('mousedown', outside)
    document.addEventListener('scroll', move, true)
    window.addEventListener('resize', move)
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('scroll', move, true); window.removeEventListener('resize', move) }
  }, [open, setOpen])
  return <div className="session-row-actions">
    <button ref={trigger} type="button" className="session-menu-btn" aria-label="Session actions" aria-expanded={open} aria-controls={open ? menuId : undefined} aria-busy={like.busy} onClick={() => setOpen(!open)}><Icon name="ellipsis-horizontal" size={18} /></button>
    {open && createPortal(<div ref={menu} id={menuId} className="session-menu-list session-row-menu" style={place} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismiss() } }}>
      <button type="button" disabled={like.busy} onClick={() => { dismiss(); void like.start() }}>New like this</button>
    </div>, document.body)}
    {like.busy && <span className="session-like-pending" role="status">Starting session…</span>}
    {like.error && <p className="form-error session-row-error" role="alert"><bdi>{like.error}</bdi></p>}
  </div>
}
