import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deriveAccent } from './accent'
import { THEME_KEY, makeTheme, readTheme } from './theme-record'
const runBootstrap = () => new Function(readFileSync('public/theme.js', 'utf8'))()
let change: (() => void) | undefined
let dark = false
beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
  dark = false
  vi.stubGlobal('matchMedia', vi.fn(() => ({ get matches() { return dark }, addEventListener: (_: string, f: () => void) => { change = f } })))
  document.documentElement.removeAttribute('style')
  document.head.innerHTML = '<meta name="theme-color" content="#ffffff">'
})
afterEach(() => vi.unstubAllGlobals())
describe('blocking theme bootstrap', () => {
  it('selects per-theme derived palettes before React, including system dark', () => {
    localStorage.setItem(THEME_KEY, JSON.stringify(makeTheme('dark', '#ffff00')))
    runBootstrap()
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.style.getPropertyValue('--hn-on-accent')).toBe(deriveAccent('#ffff00').dark['on-accent'])
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(document.querySelector('meta')?.content).toBe('#141517')
    localStorage.clear(); dark = true; runBootstrap()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
  it('migrates legacy colours once without touching the selected hat', () => {
    localStorage.setItem('hennery.hat', 'saved')
    const legacy = JSON.stringify({ '--accent': '#112233', '--accent-2': '#445566' })
    expect(readTheme(legacy)).toEqual(makeTheme('system', '#112233'))
    localStorage.setItem(THEME_KEY, legacy)
    runBootstrap()
    expect(JSON.parse(localStorage.getItem(THEME_KEY)!)).toEqual(makeTheme('system', '#112233'))
    expect(localStorage.getItem('hennery.hat')).toBe('saved')
    runBootstrap()
    expect(readTheme(localStorage.getItem(THEME_KEY)).source).toBe('#112233')
  })
  it('rejects malformed records, arbitrary properties and CSS payloads atomically', () => {
    const good = makeTheme()
    for (const raw of ['not json', 'null', '[]', '"#112233"', JSON.stringify({ ...good, background: '#000000' }), JSON.stringify({ ...good, dark: { ...good.dark, accent: 'red; background:url(https://example.invalid)' } }), JSON.stringify({ ...good, light: { ...good.light, 'on-accent': '#777777' } }), JSON.stringify({ ...good, source: '#fff' }), JSON.stringify({ ...good, preference: 'purple' })]) {
      localStorage.setItem(THEME_KEY, raw)
      runBootstrap()
      expect(readTheme(localStorage.getItem(THEME_KEY))).toEqual(good)
      expect(document.documentElement.style.getPropertyValue('--hn-accent')).toBe(good.light.accent)
      expect(document.documentElement.style.background).toBe('')
    }
  })
  it('works with storage denied', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw Error('denied') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('denied') })
    expect(runBootstrap).not.toThrow()
    expect(document.documentElement.dataset.theme).toBe('light')
    vi.restoreAllMocks()
  })
})
describe('live appearance', () => {
  it('cycles preferences, follows System only and preserves the hat source', async () => {
    const t = await import('./theme')
    t.saveTheme(deriveAccent('#ff00ff'))
    dark = true; change?.()
    expect(document.documentElement.dataset.theme).toBe('dark')
    t.cycleAppearance()
    expect(t.getTheme().preference).toBe('light')
    change?.()
    expect(document.documentElement.dataset.theme).toBe('light')
    t.cycleAppearance(); expect(t.getTheme().preference).toBe('dark')
    t.cycleAppearance(); expect(t.getTheme().preference).toBe('system')
    expect(t.getTheme().source).toBe('#ff00ff')
    t.saveTheme(null)
    expect(t.getTheme().source).toBe('#64748b')
  })
  it('reconciles storage changes without modifying hat scope or other storage', async () => {
    const t = await import('./theme')
    localStorage.setItem('hennery.hat', 'hat-a')
    localStorage.setItem('draft', 'keep')
    const notify = vi.fn()
    const unsubscribe = t.subscribeTheme(notify)
    localStorage.setItem(THEME_KEY, JSON.stringify(makeTheme('dark', '#0000ff')))
    window.dispatchEvent(new StorageEvent('storage', { key: THEME_KEY }))
    expect(t.getTheme()).toEqual(makeTheme('dark'))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('hennery.hat')).toBe('hat-a')
    expect(localStorage.getItem('draft')).toBe('keep')
    expect(notify).toHaveBeenCalled()
    unsubscribe()
  })
  it('syncs remote preferences while keeping this document’s hat palette, session and draft', async () => {
    const t = await import('./theme')
    const local = deriveAccent('#ff0000')
    localStorage.setItem('hennery.hat', 'hat-a')
    localStorage.setItem('session', 'session-a')
    localStorage.setItem('draft', 'keep')
    t.saveTheme(local)
    const write = vi.spyOn(Storage.prototype, 'setItem')
    try {
      dark = true
      for (const preference of ['dark', 'light', 'system'] as const) {
        const remote = JSON.stringify(makeTheme(preference, '#0000ff'))
        localStorage.setItem(THEME_KEY, remote)
        write.mockClear()
        window.dispatchEvent(new StorageEvent('storage', { key: THEME_KEY }))
        const appearance = preference === 'light' ? 'light' : 'dark'
        expect(t.getTheme()).toEqual({ version: 1, preference, ...local })
        expect(document.documentElement.dataset.theme).toBe(appearance)
        for (const [role, value] of Object.entries(local[appearance])) {
          expect(document.documentElement.style.getPropertyValue(`--hn-${role}`)).toBe(value)
        }
        expect(localStorage.getItem('hennery.hat')).toBe('hat-a')
        expect(localStorage.getItem('session')).toBe('session-a')
        expect(localStorage.getItem('draft')).toBe('keep')
        expect(localStorage.getItem(THEME_KEY)).toBe(remote)
        expect(write).not.toHaveBeenCalled()
      }
    } finally {
      write.mockRestore()
    }
  })
  it('keeps the startup palette while hats load, then accepts the local scope', async () => {
    localStorage.setItem(THEME_KEY, JSON.stringify(makeTheme('dark', '#112233')))
    const t = await import('./theme')
    expect(t.getTheme()).toEqual(makeTheme('dark', '#112233'))
    localStorage.setItem(THEME_KEY, JSON.stringify(makeTheme('light', '#0000ff')))
    window.dispatchEvent(new StorageEvent('storage', { key: THEME_KEY }))
    expect(t.getTheme()).toEqual(makeTheme('light', '#112233'))
    t.saveTheme(deriveAccent('#ff0000'))
    expect(t.getTheme()).toEqual(makeTheme('light', '#ff0000'))
  })
  it('keeps the local palette and follows System when storage is denied', async () => {
    const t = await import('./theme')
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw Error('denied') })
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('denied') })
    try {
      expect(() => t.saveTheme(deriveAccent('#ff0000'))).not.toThrow()
      expect(() => t.setAppearance('dark')).not.toThrow()
      window.dispatchEvent(new StorageEvent('storage', { key: null }))
      expect(t.getTheme()).toEqual(makeTheme('system', '#ff0000'))
      dark = true; change?.()
      expect(document.documentElement.dataset.theme).toBe('dark')
      expect(document.documentElement.style.getPropertyValue('--hn-accent')).toBe(deriveAccent('#ff0000').dark.accent)
    } finally {
      read.mockRestore()
      write.mockRestore()
    }
  })
})
