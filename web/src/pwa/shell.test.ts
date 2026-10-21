import { describe, expect, it, vi } from 'vitest'
import { appRoute, installShell, selectShell, shellResponse, type StaticEntry } from './shell'
import { webcrypto } from 'node:crypto'
import { sha256 } from './shell'

// The same Cache API calls as the worker, with separate cache instances.
function storage() {
  const data = new Map<string, Map<string, Response>>()
  const api = {
    open: vi.fn(async (name: string) => {
      if (!data.has(name)) data.set(name, new Map())
      const rows = data.get(name)!
      return { put: async (key: string, r: Response) => { rows.set(key, r) },
        match: async (key: string) => rows.get(key)?.clone() }
    }),
    keys: async () => [...data.keys()],
    delete: vi.fn(async (name: string) => data.delete(name)),
  }
  return { api: api as unknown as CacheStorage, data }
}
const entry: StaticEntry = { url: '/index.html', mime: 'text/html', digest: 'good' }
const deps = { origin: 'https://app.example', digest: async () => 'good' }
const response = () => new Response('shell', { headers: { 'Content-Type': 'text/html', 'Content-Security-Policy': "script-src 'self'" } })

describe('verified static shell', () => {
  it('hashes decoded bytes with SHA-256', async () => {
    vi.stubGlobal('crypto', webcrypto)
    try { expect(await sha256(new TextEncoder().encode('abc').buffer)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad') }
    finally { vi.unstubAllGlobals() }
  })
  it.each([
    ['/index.html', 'text/html'], ['/theme.js', 'text/javascript'], ['/manifest.webmanifest', 'application/manifest+json'],
    ['/icon-192.png', 'image/png'], ['/assets/main-hash.js', 'text/javascript'], ['/assets/lazy-hash.js', 'text/javascript'], ['/assets/main-hash.css', 'text/css'],
  ])('rejects unexpected bytes in %s despite status 200 and the expected MIME', async (url, mime) => {
    const { api, data } = storage()
    await expect(installShell(api, async () => new Response('changed bytes', { headers: { 'Content-Type': mime } }), [{ ...entry, url, mime }], 'v1', 'mixed', { ...deps, digest: async () => 'bad' })).rejects.toThrow()
    expect(data.size).toBe(0)
  })
  it('selects only a completed cache for this build, preserving response headers', async () => {
    const { api } = storage()
    const fetcher = vi.fn(async () => response()) as unknown as typeof fetch
    await installShell(api, fetcher, [entry], 'v1', 'attempt1', deps)
    expect(fetcher).toHaveBeenCalledWith('https://app.example/index.html', expect.objectContaining({ credentials: 'omit', redirect: 'error', cache: 'no-store' }))
    const cache = await selectShell(api, 'v1')
    expect(cache).not.toBeNull()
    const r = await shellResponse(api, 'v1', '/sessions/a', true, [entry])
    expect(await r?.text()).toBe('shell')
    expect(r?.headers.get('Content-Security-Policy')).toBe("script-src 'self'")
    expect(await selectShell(api, 'v2')).toBeNull()
    await api.open('hennery-shell-v2-partial')
    expect(await selectShell(api, 'v2')).toBeNull()
  })
  it.each(['digest', 'mime', 'status', 'redirect', 'foreign', 'fetch'])('rejects %s without touching the active cache', async (fault) => {
    const { api, data } = storage()
    await installShell(api, async () => response(), [entry], 'v1', 'active', deps)
    const fetcher = async () => {
      if (fault === 'fetch') throw new Error('offline')
      const r = fault === 'status' ? new Response('missing', { status: 404, headers: { 'Content-Type': 'text/html' } }) : response()
      if (fault === 'mime') r.headers.set('Content-Type', 'text/plain')
      if (fault === 'redirect') Object.defineProperty(r, 'redirected', { value: true })
      if (fault === 'foreign') Object.defineProperty(r, 'url', { value: 'https://evil.example/index.html' })
      return r
    }
    await expect(installShell(api, fetcher, [entry], 'v1', 'retry', { ...deps, digest: async () => fault === 'digest' ? 'bad' : 'good' })).rejects.toThrow()
    expect([...data.keys()]).toEqual(['hennery-shell-v1-active'])
    expect(await selectShell(api, 'v1')).not.toBeNull()
  })
  it('rejects a mixed build and drops every partial write', async () => {
    const { api, data } = storage()
    let call = 0
    await expect(installShell(api, async () => response(), [entry, { ...entry, url: '/theme.js' }], 'v1', 'mix', { ...deps, digest: async () => ++call === 1 ? 'good' : 'bad' })).rejects.toThrow()
    expect(data.size).toBe(0)
  })
  it('does not overwrite an existing attempt even when retrying the same build', async () => {
    const { api } = storage()
    await installShell(api, async () => response(), [entry], 'v1', 'active', deps)
    await expect(installShell(api, async () => response(), [entry], 'v1', 'active', deps)).rejects.toThrow('already exists')
    expect(await (await (await selectShell(api, 'v1'))?.match('/index.html'))?.text()).toBe('shell')
  })
  it('checks the namespace as well as completion, and ignores unexpected cached URLs', async () => {
    const { api } = storage()
    const foreign = await api.open('hennery-shell-v2-other')
    await foreign.put('/__hennery_shell_complete__', new Response('v1'))
    await foreign.put('/index.html', response())
    expect(await selectShell(api, 'v1')).toBeNull()
    await installShell(api, async () => response(), [entry], 'v1', 'active', deps)
    const cache = (await selectShell(api, 'v1'))!
    await cache.put('/api/secret', new Response('secret'))
    expect(await shellResponse(api, 'v1', '/api/secret', false, [entry])).toBeNull()
  })
  it('serves only exact static URLs and controlled routes, never APIs or queries', async () => {
    const { api } = storage()
    await installShell(api, async () => response(), [entry], 'v1', 'active', deps)
    for (const path of ['/api/auth/login', '/api/sessions', '/mcp/', '/mcp/proxy', '/setup', '/login', '/oauth/callback', '/index.html?x=1', '/logos/a', '/unknown']) {
      expect(await shellResponse(api, 'v1', path, true, [entry])).toBeNull()
    }
    expect(await shellResponse(api, 'v1', '/index.html', false, [entry])).not.toBeNull()
    expect(await shellResponse(api, 'v1', '/sessions/a?pending=p', true, [entry])).not.toBeNull()
    for (const path of ['/', '/sessions/', '/settings/']) expect(await shellResponse(api, 'v1', path, true, [entry])).not.toBeNull()
  })
  it.each(['/sessions', '/sessions/s-1', '/new', '/hosts', '/hats', '/settings', '/mcp'])('recognizes app route %s', (path) => expect(appRoute(path)).toBe(true))
  it.each(['/api', '/login', '/setup', '/mcp/', '/mcp/mount', '/sessions/a/b', '/sessions/%2f', '/sessions/..', '//sessions'])('bypasses %s', (path) => expect(appRoute(path)).toBe(false))
})

it('recognizes new app shell routes without widening notification receipt targets', async () => {
  const { appRoute } = await import('./shell')
  const { notificationTarget } = await import('./notification')
  for (const route of ['/needs-you', '/more', '/defaults']) {
    expect(appRoute(route)).toBe(true)
    expect(notificationTarget(route)).toBe('/sessions')
  }
  expect(appRoute('/needs-you/arbitrary')).toBe(false)
})
