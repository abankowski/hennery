import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useModalLayer } from './ui'

export function SettingsSummary({ trigger, summary, expanded, open, warning = false, pending = false, launch = false }: { trigger: RefObject<HTMLButtonElement | null>; summary: string; expanded: boolean; open: () => void; warning?: boolean; pending?: boolean; launch?: boolean }) {
  return <button ref={trigger} type="button" className={'composer-settings-trigger' + (launch ? ' launch-settings-disclosure' : '')} aria-label="Session settings" aria-haspopup="dialog" aria-expanded={expanded} title={summary} onClick={open}>
    {warning && <span className="config-warning-icon" aria-label="Settings need attention">⚠</span>}<bdi>{launch ? 'Settings: ' : ''}{summary}</bdi>
    {pending ? <span className="config-chip-badge" role="status">Applying…</span> : warning && !launch ? <span className="config-chip-badge config-chip-warning" role="status">Check settings</span> : null}<span aria-hidden="true">⌄</span>
  </button>
}

/** The same settings dialog is an anchored popover or a phone bottom sheet. */
export default function ComposerSettings({ trigger, close, children }: { trigger: RefObject<HTMLButtonElement | null>; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const desktop = useMediaQuery('(min-width: 768px)')
  const [position, setPosition] = useState<{ left: number; bottom: number }>()
  const { trap } = useModalLayer(ref)
  useLayoutEffect(() => {
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect()
      if (rect) setPosition({ left: Math.max(12, Math.min(rect.right - 360, innerWidth - 372)), bottom: innerHeight - rect.top + 8 })
    }
    place(); window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [trigger])
  useEffect(() => {
    const button = trigger.current
    ref.current?.querySelector<HTMLElement>('select, input, button')?.focus()
    return () => { if (button?.isConnected) button.focus() }
  }, [trigger])
  return createPortal(<div className="composer-settings-layer" onMouseDown={event => { if (event.target === event.currentTarget) close() }}>
    <div ref={ref} className="composer-settings-panel" style={desktop ? position : undefined} role="dialog" aria-modal="true" aria-label="Session settings" tabIndex={-1} onKeyDown={event => trap(event, close)}>
      <header><h2>Session settings</h2><button type="button" className="btn btn-ghost" aria-label="Close session settings" onClick={close}>×</button></header>
      {children}
    </div>
  </div>, document.body)
}
