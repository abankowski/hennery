import { useMemo, useSyncExternalStore } from 'react'
const KEY = 'hennery.dismissedAttention'
const listeners = new Set<() => void>()
const notify = () => listeners.forEach(listener => listener())
let volatile: string | undefined
const snapshot = () => { if (volatile !== undefined) return volatile; try { return localStorage.getItem(KEY) ?? '{}' } catch { return '{}' } }
function parse(value: string): Record<string, string> {
  try {
    const stored: unknown = JSON.parse(value)
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? Object.fromEntries(Object.entries(stored).filter(([, key]) => typeof key === 'string')) : {}
  } catch { return {} }
}
const read = () => parse(snapshot())
function write(value: Record<string, string>) { const text = JSON.stringify(value); try { localStorage.setItem(KEY, text); volatile = undefined } catch { volatile = text } notify() }
export function dismissAttention(id: string, key: string) { write(Object.fromEntries([...Object.entries(read()).filter(([session]) => session !== id).slice(-999), [id, key]])) }
export function restoreAttention(id: string) { write(Object.fromEntries(Object.entries(read()).filter(([session]) => session !== id))) }
export function clearDismissedAttention() { volatile = undefined; try { localStorage.removeItem(KEY) } catch { volatile = '{}' } notify() }
export function useDismissedAttention() {
  const stored = useSyncExternalStore(listener => { listeners.add(listener); window.addEventListener('storage', listener); return () => { listeners.delete(listener); window.removeEventListener('storage', listener) } }, snapshot)
  return useMemo(() => parse(stored), [stored])
}
