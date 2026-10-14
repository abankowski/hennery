import { installShell, shellResponse, SHELL_PREFIX } from './src/pwa/shell'

self.addEventListener('install', (event) => {
  event.waitUntil(installShell(caches, fetch, __PRECACHE__, __BUILD_ID__, crypto.randomUUID()))
})
self.addEventListener('activate', (event) => {
  // Natural activation only, once the old controlled windows have closed.
  // Never claim an existing document or call skipWaiting.
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(SHELL_PREFIX) && !name.startsWith(`${SHELL_PREFIX}${__BUILD_ID__}-`)) await caches.delete(name)
    }
  })())
})
self.addEventListener('fetch', (event) => {
  const r = event.request, url = new URL(r.url)
  if (r.method !== 'GET' || url.origin !== location.origin) return
  event.respondWith((async () => {
    const cached = await shellResponse(caches, __BUILD_ID__, url.pathname + url.search, r.mode === 'navigate', __PRECACHE__)
    return cached ?? fetch(r)
  })())
})
