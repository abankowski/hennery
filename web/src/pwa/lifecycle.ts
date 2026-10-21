import { useSyncExternalStore } from 'react'
import { requestUpdate } from './update-client'
interface PwaStatus { registration: ServiceWorkerRegistration | null; error: string | null; waiting: boolean; cleanupWarning: string | null; updating: boolean; updateMessage: string | null }
const rememberedCleanup = () => { try { return sessionStorage.getItem('hennery.logout-cleanup') } catch { return null } }
let status: PwaStatus = { registration: null, error: null, waiting: false, cleanupWarning: rememberedCleanup(), updating: false, updateMessage: null }
const listeners = new Set<() => void>()
const set = (change: Partial<PwaStatus>) => { status = { ...status, ...change }; listeners.forEach((f) => f()) }
let pending: Promise<void> | null = null
export const usePwa = () => useSyncExternalStore((fn) => { listeners.add(fn); return () => { listeners.delete(fn) } }, () => status)
export async function reloadToUpdate() {
  if (status.updating) return
  set({ updating: true, updateMessage: null })
  try { set({ updateMessage: await requestUpdate(status.registration) }) }
  finally { set({ updating: false }) }
}
export const setCleanupWarning = (warning: string | null) => {
  try {
    if (warning) sessionStorage.setItem('hennery.logout-cleanup', warning)
    else sessionStorage.removeItem('hennery.logout-cleanup')
  } catch { /* Still show the result when browser storage is unavailable. */ }
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
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        worker?.addEventListener('statechange', () => {
          check()
          if (worker.state === 'redundant') set({ error: 'Offline shell verification or storage failed. Retry worker setup.' })
        })
        check()
      })
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
