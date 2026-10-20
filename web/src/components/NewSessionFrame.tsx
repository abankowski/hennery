// Route frame handed to R4; form state and configuration remain screen-owned.
import { useEffect, useRef, type ReactNode } from 'react'
import { launcherReturn, navigate } from '../router'
import { Icon, useModalLayer } from './ui'
import Sessions from '../screens/Sessions'
export default function NewSessionFrame({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null), closing = useRef(false)
  const { trap, holdFocus } = useModalLayer(ref)
  const close = () => { closing.current = true; navigate(launcherReturn(), { replace: true }) }
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const observer = new MutationObserver(() => {
      if (document.activeElement !== ref.current) return
      ref.current?.querySelector<HTMLElement>('input:not([disabled]), textarea:not([disabled])')?.focus()
    })
    if (ref.current) observer.observe(ref.current, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      if (!closing.current) return
      requestAnimationFrame(() => {
        if (before?.isConnected && before !== document.body) before.focus()
        else { const heading = document.querySelector<HTMLElement>('main h1'); if (heading) { heading.tabIndex = -1; heading.focus() } }
      })
    }
  }, [])
  return <><div inert aria-hidden="true"><Sessions /></div><div className="overlay" onMouseDown={holdFocus}><div ref={ref} className="modal launcher-frame" role="dialog" aria-label="New session" aria-modal="true" tabIndex={-1} onKeyDown={event => {
    if (event.defaultPrevented) return
    // The inner picker handles this Escape before React updates its expanded
    // attribute. A second, unhandled Escape still dismisses the route frame.
    if (event.key === 'Escape' && event.target instanceof HTMLElement && event.target.closest('[role="combobox"][aria-expanded="true"]')) return
    trap(event, close)
  }}><button type="button" className="modal-x" aria-label="Close new session" onClick={close}><Icon name="x-mark" size={18} /></button>{children}</div></div></>
}
