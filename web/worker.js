import { installShell, shellResponse, SHELL_PREFIX } from './src/pwa/shell'
import { pushJournal } from './src/pwa/journal'
import { decodePush } from './src/pwa/notification'
import { subscriptionBody } from './src/pwa/subscription'

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
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let text = null
    try { text = event.data?.text() ?? null } catch { /* Neutral attention. */ }
    const payload = decodePush(text)
    await self.registration.showNotification(payload.title, {
      body: payload.body, tag: payload.tag, icon: '/icon-192.png', badge: '/icon-192.png',
      data: { url: payload.url, tag: payload.tag },
    })
  })())
})
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    const journal = pushJournal(), row = await journal.read()
    if (!row.enabled || !row.id || !row.endpoint) return
    let replacement = event.newSubscription
    if (!replacement) {
      if (!event.oldSubscription?.options?.applicationServerKey || await self.registration.pushManager.permissionState({ userVisibleOnly: true }) !== 'granted') {
        await journal.needsRepair(row.generation); return
      }
      try { replacement = await self.registration.pushManager.subscribe(event.oldSubscription.options) }
      catch { await journal.needsRepair(row.generation); return }
    }
    await journal.queueRotation(subscriptionBody(replacement), Date.now(), row.generation)
    await journal.attempt()
  })())
})
