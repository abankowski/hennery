import { useSyncExternalStore } from 'react'
interface PwaStatus { registration: ServiceWorkerRegistration | null; error: string | null; waiting: boolean; cleanupWarning: string | null }
let status: PwaStatus = { registration: null, error: null, waiting: false, cleanupWarning: sessionStorage.getItem('hennery.logout-cleanup') }
const listeners = new Set<() => void>()
const set = (change: Partial<PwaStatus>) => { status = { ...status, ...change }; listeners.forEach((f) => f()) }
let pending: Promise<void> | null = null
export const usePwa = () => useSyncExternalStore((fn) => { listeners.add(fn); return () => { listeners.delete(fn) } }, () => status)
export const setCleanupWarning = (warning: string | null) => {
  if (warning) sessionStorage.setItem('hennery.logout-cleanup', warning)
  else sessionStorage.removeItem('hennery.logout-cleanup')
  set({ cleanupWarning: warning })
}

export function bounded<T>(work: Promise<T>, ms = 10000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  return Promise.race([work, new Promise<T>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('Worker setup timed out. Close other windows and retry.')), ms) })]).finally(() => clearTimeout(timer))
}
export function registerWorker(): Promise<void> {
  if (globalThis.isSecureContext !== true || !('serviceWorker' in navigator)) return Promise.resolve()
  if (pending) return pending
  set({ error: null })
  pending = (async () => {
    try {
      const registration = await bounded(navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }))
      const check = () => set({ waiting: !!registration.waiting })
      registration.addEventListener('updatefound', () => { registration.installing?.addEventListener('statechange', check); check() })
      await bounded(new Promise<void>((resolve, reject) => {
        if (registration.active?.state === 'activated') { resolve(); return }
        const worker = registration.installing ?? registration.waiting ?? registration.active
        if (!worker) { reject(new Error('Offline shell installation failed.')); return }
        const change = () => {
          if (worker.state === 'activated') { worker.removeEventListener('statechange', change); resolve() }
          if (worker.state === 'redundant') { worker.removeEventListener('statechange', change); reject(new Error('Offline shell verification or storage failed.')) }
        }
        worker.addEventListener('statechange', change); change()
      }))
      set({ registration, waiting: !!registration.waiting })
      await registration.update()
    } catch (err) { set({ error: err instanceof Error ? err.message : 'Worker setup failed.' }) }
    finally { pending = null }
  })()
  return pending
}
