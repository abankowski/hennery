import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { listenForUpdates, reloadOnce } from './update-client'
import { navigate } from '../router'
beforeEach(() => { vi.useFakeTimers(); history.replaceState(null, '', '/settings') })
afterEach(() => { vi.useRealTimers(); sessionStorage.clear(); document.head.innerHTML = ''; vi.restoreAllMocks() })
function page(controller: object | null = {}) {
  document.head.innerHTML = '<meta name="hennery-build" content="build-A">'
  const service = Object.assign(new EventTarget(), { controller })
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: service })
  const reload = vi.fn(), stop = listenForUpdates(reload)
  return { service, reload, stop, change(controller: object | null) { service.controller = controller; service.dispatchEvent(new Event('controllerchange')) } }
}
it('a controller replacement reloads once, including repeated changes and chunk failures', () => {
  const p = page()
  try {
    p.change(p.service.controller)
    expect(p.reload).not.toHaveBeenCalled()
    p.change({}); p.change({})
    expect(p.reload).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2000)
    window.dispatchEvent(new Event('vite:preloadError', { cancelable: true }))
    expect(p.reload).toHaveBeenCalledOnce()
  } finally { p.stop() }
})
it('first install claims the page without reloading; a later replacement reloads', () => {
  const p = page(null)
  try {
    p.change({})
    expect(p.reload).not.toHaveBeenCalled()
    p.change({})
    vi.advanceTimersByTime(2000)
    expect(p.reload).toHaveBeenCalledOnce()
  } finally { p.stop() }
})
it('a failed lazy import reloads once and suppresses its error only when reloading', () => {
  const p = page()
  try {
    const first = new Event('vite:preloadError', { cancelable: true })
    window.dispatchEvent(first)
    expect(first.defaultPrevented).toBe(true)
    const retry = new Event('vite:preloadError', { cancelable: true })
    window.dispatchEvent(retry)
    expect(retry.defaultPrevented).toBe(false)
    expect(p.reload).toHaveBeenCalledOnce()
  } finally { p.stop() }
})
it('a reload landing on the same build cannot loop, while a new build can reload', () => {
  const reload = vi.fn()
  expect(reloadOnce('A', reload)()).toBe(true)
  expect(reloadOnce('A', reload)()).toBe(false)
  expect(reloadOnce('B', reload)()).toBe(true)
  expect(reload).toHaveBeenCalledTimes(2)
})
it('controller and preload recovery share the marker across document lifetimes', () => {
  const first = page()
  first.change({}); vi.advanceTimersByTime(2000); first.stop()
  const stale = page()
  try {
    stale.change({}); vi.advanceTimersByTime(2000)
    window.dispatchEvent(new Event('vite:preloadError'))
    expect(stale.reload).not.toHaveBeenCalled()
  } finally { stale.stop() }
})
it('storage refusal cannot cause an unbounded reload loop', () => {
  const reload = vi.fn()
  const attempt = reloadOnce('A', reload, { getItem() { throw new Error('storage denied') }, setItem: vi.fn() })
  expect(attempt()).toBe(false)
  expect(reload).not.toHaveBeenCalled()
})
it('disposing the listeners stops automatic reloads', () => {
  const p = page(); p.stop(); p.change({})
  window.dispatchEvent(new Event('vite:preloadError'))
  expect(p.reload).not.toHaveBeenCalled()
})

it('worker navigation plus controllerchange never causes a second reload after pagehide', () => {
  const p = page(), workerNavigate = vi.fn(() => window.dispatchEvent(new Event('pagehide')))
  try {
    p.change({})
    expect(p.reload).not.toHaveBeenCalled()
    workerNavigate()
    vi.advanceTimersByTime(10000)
    window.dispatchEvent(new Event('vite:preloadError'))
    expect(workerNavigate).toHaveBeenCalledOnce()
    expect(p.reload).not.toHaveBeenCalled()
  } finally { p.stop() }
})

it.each(['/login', '/setup/'])('checks the current route before takeover recovery on %s, but still recovers failed chunks', path => {
  const p = page()
  try {
    p.change({})
    history.replaceState(null, '', path)
    vi.advanceTimersByTime(2000)
    expect(p.reload).not.toHaveBeenCalled()
    window.dispatchEvent(new Event('vite:preloadError'))
    expect(p.reload).toHaveBeenCalledOnce()
  } finally { p.stop() }
})

it.each(['/login', '/setup/'])('a replacement skipped on %s reloads once after in-app sign-in navigation', path => {
  history.replaceState(null, '', path)
  const p = page()
  try {
    p.change({}); vi.advanceTimersByTime(2000)
    expect(p.reload).not.toHaveBeenCalled()
    navigate(path === '/login' ? '/setup/' : '/login')
    expect(p.reload).not.toHaveBeenCalled()
    navigate('/sessions')
    expect(p.reload).toHaveBeenCalledOnce()
    navigate('/settings')
    window.dispatchEvent(new Event('popstate'))
    window.dispatchEvent(new Event('vite:preloadError'))
    expect(p.reload).toHaveBeenCalledOnce()
  } finally { p.stop() }
})

it('history navigation also recovers a replacement skipped on login', () => {
  history.replaceState(null, '', '/login')
  const p = page()
  try {
    p.change({}); vi.advanceTimersByTime(2000)
    history.replaceState(null, '', '/sessions')
    window.dispatchEvent(new Event('popstate'))
    expect(p.reload).toHaveBeenCalledOnce()
  } finally { p.stop() }
})

it('routing during the worker navigation grace never starts an early fallback', () => {
  const p = page()
  try {
    p.change({}); navigate('/sessions')
    expect(p.reload).not.toHaveBeenCalled()
    window.dispatchEvent(new Event('pagehide'))
    vi.advanceTimersByTime(2000)
    expect(p.reload).not.toHaveBeenCalled()
  } finally { p.stop() }
})

it('disposing a skipped replacement stops route recovery', () => {
  history.replaceState(null, '', '/login')
  const p = page()
  p.change({}); vi.advanceTimersByTime(2000); p.stop()
  navigate('/sessions')
  expect(p.reload).not.toHaveBeenCalled()
})

it.each(['before-hide', 'while-hidden', 'without-event'])('a restored page resumes controller recovery: %s', when => {
  const p = page()
  try {
    if (when === 'before-hide') p.change({})
    window.dispatchEvent(new Event('pagehide'))
    if (when === 'while-hidden') p.change({})
    if (when === 'without-event') p.service.controller = {}
    vi.advanceTimersByTime(2000)
    expect(p.reload).not.toHaveBeenCalled()
    window.dispatchEvent(new Event('pageshow'))
    vi.advanceTimersByTime(2000)
    expect(p.reload).toHaveBeenCalledOnce()
  } finally { p.stop() }
})

it('a cancelled beforeunload does not disable failed-chunk recovery', () => {
  const p = page()
  try {
    window.dispatchEvent(new Event('beforeunload', { cancelable: true }))
    window.dispatchEvent(new Event('vite:preloadError'))
    expect(p.reload).toHaveBeenCalledOnce()
  } finally { p.stop() }
})

it('pageshow restores failed-chunk recovery even without a controller replacement', () => {
  const p = page()
  try {
    window.dispatchEvent(new Event('pagehide'))
    window.dispatchEvent(new Event('pageshow'))
    window.dispatchEvent(new Event('vite:preloadError'))
    expect(p.reload).toHaveBeenCalledOnce()
  } finally { p.stop() }
})
it('a live page falls back once when worker navigation is unavailable', () => {
  const p = page()
  try {
    p.change({})
    vi.advanceTimersByTime(1000)
    expect(p.reload).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(p.reload).toHaveBeenCalledOnce()
    p.change({}); vi.advanceTimersByTime(10000)
    expect(p.reload).toHaveBeenCalledOnce()
  } finally { p.stop() }
})
