// Static-only worker cache. A unique attempt is never reused; a final marker
// makes a whole cache selectable across worker restarts. Writes are not atomic.
export interface StaticEntry { url: string; mime: string; digest: string }
export const SHELL_PREFIX = 'hennery-shell-'
const COMPLETE = '/__hennery_shell_complete__'

export async function sha256(bytes: ArrayBuffer): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function installShell(
  storage: CacheStorage, fetcher: typeof fetch, entries: StaticEntry[], build: string, attempt: string,
  deps = { origin: location.origin, digest: sha256 },
): Promise<void> {
  const name = `${SHELL_PREFIX}${build}-${attempt}`
  // Fail rather than touch a cache that may belong to a running worker.
  if ((await storage.keys()).includes(name)) throw new Error('cache attempt already exists')
  try {
    const cache = await storage.open(name)
    for (const entry of entries) {
      const url = new URL(entry.url, deps.origin)
      const r = await fetcher(url.href, { credentials: 'omit', redirect: 'error', cache: 'no-store' })
      if (!r.ok || r.redirected || (r.url && new URL(r.url).origin !== deps.origin)
        || r.headers.get('content-type')?.split(';')[0].trim() !== entry.mime
        || await deps.digest(await r.clone().arrayBuffer()) !== entry.digest) throw new Error(`shell verification failed: ${entry.url}`)
      await cache.put(entry.url, r)
    }
    await cache.put(COMPLETE, new Response(build))
  } catch (err) {
    await storage.delete(name)
    throw err
  }
}

export async function selectShell(storage: CacheStorage, build: string): Promise<Cache | null> {
  for (const name of await storage.keys()) {
    if (!name.startsWith(`${SHELL_PREFIX}${build}-`)) continue
    const cache = await storage.open(name)
    if (await (await cache.match(COMPLETE))?.text() === build) return cache
  }
  return null
}

export async function cleanupShell(storage: CacheStorage, build: string): Promise<void> {
  // CacheStorage.keys is in creation order. A newer install can be writing
  // after our cache already exists: never touch that install, even if complete.
  const names = await storage.keys()
  const boundary = names.findIndex(name => name.startsWith(`${SHELL_PREFIX}${build}-`))
  for (const name of names.slice(0, Math.max(0, boundary))) {
    if (name.startsWith(SHELL_PREFIX)) await storage.delete(name)
  }
}

export function appRoute(path: string): boolean {
  return ['/sessions', '/needs-you', '/more', '/defaults', '/new', '/hosts', '/hats', '/settings', '/mcp'].includes(path)
    || /^\/sessions\/[A-Za-z0-9_-]{1,128}$/.test(path)
}

export async function shellResponse(storage: CacheStorage, build: string, path: string, navigation: boolean, entries: StaticEntry[]): Promise<Response | null> {
  const key = navigation && appRoute(path.split('?')[0]) ? '/index.html' : path
  if (!entries.some((e) => e.url === key)) return null
  return (await (await selectShell(storage, build))?.match(key)) ?? null
}
