import { appRoute, installShell, shellResponse, SHELL_PREFIX } from './src/pwa/shell'
import { pushJournal } from './src/pwa/journal'
import { decodePush } from './src/pwa/notification'
import { subscriptionBody } from './src/pwa/subscription'
import { withPushOwnership } from './src/pwa/ownership'

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
  const path = url.pathname + url.search
  if (!(r.mode === 'navigate' && appRoute(url.pathname)) && !__PRECACHE__.some((entry) => entry.url === path)) return
  event.respondWith((async () => {
    const cached = await shellResponse(caches, __BUILD_ID__, path, r.mode === 'navigate', __PRECACHE__)
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
    if (event.oldSubscription && event.oldSubscription.endpoint !== row.endpoint && event.oldSubscription.endpoint !== row.rotation?.subscription.endpoint) return
    // Permission can pause independently of disable; it authorizes nothing.
    const permitted = !!event.newSubscription || (!!event.oldSubscription?.options?.applicationServerKey && await self.registration.pushManager.permissionState({ userVisibleOnly: true }) === 'granted')
    await withPushOwnership(async () => {
      const latest = await journal.read()
      if (!latest.enabled || latest.generation !== row.generation || latest.id !== row.id) return
      if (event.oldSubscription && event.oldSubscription.endpoint !== latest.endpoint && event.oldSubscription.endpoint !== latest.rotation?.subscription.endpoint) return
      if (!permitted) { await journal.needsRepair(row.generation); return }
      let owned
      try { owned = await journal.beginRenew() } catch { return }
      try {
        let replacement = event.newSubscription
        if (!await journal.current(owned)) return
        if (!replacement) {
          try { replacement = await self.registration.pushManager.subscribe(event.oldSubscription.options) }
          catch { if (await journal.current(owned)) await journal.needsRepair(row.generation); return }
        }
        if (!await journal.current(owned)) {
          const current = await journal.read()
          if (!current.enabled || current.endpoint !== replacement.endpoint) await replacement.unsubscribe()
          return
        }
        await journal.queueRotation(subscriptionBody(replacement), Date.now(), row.generation)
        await journal.release(owned)
        await journal.attempt()
      } finally { await journal.release(owned) }
    })
  })())
})
