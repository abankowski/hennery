import { discardUpdateInputs } from './update-edits'
import { Client } from '../api/client'
import { MessageChannel as NodeMessageChannel } from 'node:worker_threads'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { coordinateUpdate, UPDATE_BUSY } from './update'
import { listenForUpdates, requestUpdate, UpdateReadiness, updateReadiness } from './update-client'
import { NavigationGate, navigationGate, type AppWindow } from './navigation'
import { forgetAllAttachments, hold } from '../lib/attachments'
import { forgetAllDrafts, hasUnstoredDrafts, saveDraft } from '../lib/drafts'

beforeEach(() => { vi.stubGlobal('MessageChannel', NodeMessageChannel) })
afterEach(() => { vi.useRealTimers(); discardUpdateInputs(document.body); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); forgetAllAttachments(); forgetAllDrafts() })

function peer(id: string, verdict: boolean | 'silent' = true) {
  const requests: string[] = [], release = vi.fn()
  const client: AppWindow = { id, url: `https://app.example/sessions/${id}`, focus: vi.fn(), navigate: vi.fn(), postMessage(message, transfer) {
    const m = message as { id: string; kind: string }
    const port = transfer![0] as MessagePort
    requests.push(m.kind)
    port.onmessage = event => {
      requests.push(event.data.kind)
      if (event.data.kind === 'update_release') { release(); port.close(); return }
      port.postMessage({ version: 1, kind: 'update_commit_reply', id: m.id, ready: verdict === true })
    }
    if (verdict !== 'silent') port.postMessage({ version: 1, kind: 'update_prepare_reply', id: m.id, ready: verdict })
    // Close the test's port after success too; production closes on reload.
    if ('unref' in port && typeof port.unref === 'function') port.unref()
  } }
  return { client, requests, release }
}

it('all windows ready: prepare and arm every window before explicit activation', async () => {
  const a = peer('a'), b = peer('b'), activate = vi.fn(async () => {})
  expect(await coordinateUpdate({ matchAll: async () => [a.client, b.client], openWindow: vi.fn() }, 'https://app.example', 'a', activate)).toBe(true)
  expect(a.requests).toEqual(['update_prepare', 'update_commit'])
  expect(b.requests).toEqual(['update_prepare', 'update_commit'])
  expect(activate).toHaveBeenCalledOnce()
})
it.each([false, 'silent'] as const)('a busy or silent window (%s) defers activation and releases ready peers', async verdict => {
  const a = peer('a'), b = peer('b', verdict), activate = vi.fn(), report = vi.fn()
  expect(await coordinateUpdate({ matchAll: async () => [a.client, b.client], openWindow: vi.fn() }, 'https://app.example', 'a', activate, report)).toBe(false)
  expect(report).toHaveBeenCalledWith(verdict === 'silent' ? 'silent' : 'busy')
  expect(activate).not.toHaveBeenCalled()
  expect(a.requests).not.toContain('update_commit')
  await vi.waitFor(() => expect(a.release).toHaveBeenCalledOnce())
})
it('a new window between readiness and commit defers activation', async () => {
  const a = peer('a'), b = peer('b'), activate = vi.fn()
  const matchAll = vi.fn().mockResolvedValueOnce([a.client]).mockResolvedValue([a.client, b.client])
  expect(await coordinateUpdate({ matchAll, openWindow: vi.fn() }, 'https://app.example', 'a', activate)).toBe(false)
  expect(activate).not.toHaveBeenCalled()
})
it('no waiting worker is a no-op without confirmation', async () => {
  const confirm = vi.fn()
  expect(await requestUpdate({ waiting: null } as ServiceWorkerRegistration, confirm)).toBeNull()
  expect(confirm).not.toHaveBeenCalled()
})
it('busy worker result supplies the retry explanation', async () => {
  const worker = { postMessage(_m: unknown, ports: MessagePort[]) {
    ports[0].postMessage({ version: 1, kind: 'update_result', ready: false }); ports[0].close()
  } }
  expect(await requestUpdate({ waiting: worker } as unknown as ServiceWorkerRegistration)).toBe(UPDATE_BUSY)
})
it('draft text survives readiness; active mutations, sends and remote volatile edits refuse it', () => {
  const gate = new NavigationGate(), readiness = new UpdateReadiness(gate, () => false, () => false)
  saveDraft('a', 'keep me')
  gate.edit() // notification dirtiness alone does not discard durable drafts
  expect(readiness.reserve('draft', Date.now() + 1000, false)).toBe(true)
  expect(sessionStorage.getItem('hennery.draft.a')).toBe('keep me')
  expect(() => gate.mutation()).toThrow()
  gate.release('draft')
  const finish = gate.mutation()
  expect(readiness.reserve('mutation', Date.now() + 1000, true)).toBe(false)
  finish()
  readiness.edit()
  expect(readiness.reserve('edit', Date.now() + 1000, false)).toBe(false)
  expect(readiness.reserve('confirmed', Date.now() + 1000, true)).toBe(true)
  gate.release('confirmed')
  expect(new UpdateReadiness(gate, () => false, () => true).reserve('send', Date.now() + 1000, true)).toBe(false)
})
it('unsent images require confirmation, including images in an unmounted composer', async () => {
  hold('other-session', { attachments: [{ n: 1, file: new File(['bytes'], 'a.png') }], nextN: 2 })
  const postMessage = vi.fn(), confirm = vi.fn((_text: string) => false)
  expect(await requestUpdate({ waiting: { postMessage } } as unknown as ServiceWorkerRegistration, confirm)).toContain('postponed')
  expect(confirm).toHaveBeenCalledOnce()
  expect(confirm.mock.calls[0][0]).toContain('question input')
  expect(postMessage).not.toHaveBeenCalled()
})
it('a draft that could not reach sessionStorage counts as volatile', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
  saveDraft('quota', 'memory only')
  expect(hasUnstoredDrafts()).toBe(true)
})
it('only the consenting document reloads, exactly once on the intended controllerchange', async () => {
  const service = new EventTarget(), worker = Object.assign(new EventTarget(), { state: 'installed' }), stranger = {}
  let controller: unknown = stranger
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: Object.assign(service, {
    getRegistration: async () => ({ waiting: worker }), get controller() { return controller },
  }) })
  // Object.assign evaluates getters; supply a live controller property.
  Object.defineProperty(service, 'controller', { get: () => controller, configurable: true })
  history.replaceState(null, '', '/sessions/a')
  const reload = vi.fn(), stop = listenForUpdates(reload)
  const channel = new MessageChannel(), replies: unknown[] = []
  channel.port1.onmessage = event => replies.push(event.data)
  try {
    service.dispatchEvent(new Event('controllerchange'))
    expect(reload).not.toHaveBeenCalled()
    service.dispatchEvent(new MessageEvent('message', { source: worker as MessageEventSource, data: { version: 1, kind: 'update_prepare', id: 'once', until: Date.now() + 1000, initiator: false }, ports: [channel.port2] }))
    await vi.waitFor(() => expect(replies).toContainEqual({ version: 1, kind: 'update_prepare_reply', id: 'once', ready: true }))
    channel.port1.postMessage({ version: 1, kind: 'update_commit', id: 'once' })
    await vi.waitFor(() => expect(replies).toContainEqual({ version: 1, kind: 'update_commit_reply', id: 'once', ready: true }))
    service.dispatchEvent(new Event('controllerchange'))
    expect(reload).not.toHaveBeenCalled()
    controller = worker
    service.dispatchEvent(new Event('controllerchange'))
    service.dispatchEvent(new Event('controllerchange'))
    expect(reload).toHaveBeenCalledOnce()
  } finally { stop(); channel.port1.close(); channel.port2.close(); navigationGate.release('once') }
})

function pendingWindow(controller: object | null = null, path = '/sessions/a') {
  const service = new EventTarget(), worker = Object.assign(new EventTarget(), { state: 'installed' })
  Object.defineProperty(service, 'controller', { configurable: true, writable: true, value: controller })
  Object.assign(service, { getRegistration: async () => ({ waiting: worker }) })
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: service })
  history.replaceState(null, '', path)
  const channel = new MessageChannel(), replies: { kind: string; ready: boolean }[] = []
  channel.port1.onmessage = event => replies.push(event.data)
  const reload = vi.fn(), report = vi.fn()
  const stop = listenForUpdates(reload, report)
  const commit = async () => {
    service.dispatchEvent(new MessageEvent('message', { source: worker as unknown as MessageEventSource, data: { version: 1, kind: 'update_prepare', id: 'recovery', until: Date.now() + 1000, initiator: false }, ports: [channel.port2] }))
    await vi.waitFor(() => expect(replies).toContainEqual({ version: 1, kind: 'update_prepare_reply', id: 'recovery', ready: true }))
    channel.port1.postMessage({ version: 1, kind: 'update_commit', id: 'recovery' })
    await vi.waitFor(() => expect(replies).toContainEqual({ version: 1, kind: 'update_commit_reply', id: 'recovery', ready: true }))
  }
  return { service, worker, reload, report, commit, close() { stop(); channel.port1.close(); channel.port2.close(); navigationGate.release('recovery') } }
}
it('an uncontrolled committed document reloads once when its worker activates without controllerchange', async () => {
  const page = pendingWindow()
  try {
    await page.commit()
    page.worker.state = 'activated'; page.worker.dispatchEvent(new Event('statechange'))
    page.worker.dispatchEvent(new Event('statechange'))
    expect(page.reload).toHaveBeenCalledOnce()
  } finally { page.close() }
})
it.each(['redundant', 'silent'] as const)('a committed %s worker releases the page and reports retry even with no release message', async outcome => {
  const page = pendingWindow()
  try {
    if (outcome === 'silent') vi.useFakeTimers()
    await page.commit()
    expect(navigationGate.blocked()).toBe(true)
    if (outcome === 'redundant') { page.worker.state = 'redundant'; page.worker.dispatchEvent(new Event('statechange')) }
    else await vi.advanceTimersByTimeAsync(6000)
    expect(navigationGate.blocked()).toBe(false)
    expect(page.report).toHaveBeenCalledWith('Update did not start — retry', false)
    page.worker.state = 'activated'; page.worker.dispatchEvent(new Event('statechange'))
    expect(page.reload).not.toHaveBeenCalled()
  } finally { vi.useRealTimers(); page.close() }
})
it('a previously controlled but unarmed document reports an older-version banner', () => {
  const page = pendingWindow({})
  try {
    Object.assign(page.service, { controller: {} })
    page.service.dispatchEvent(new Event('controllerchange'))
    expect(page.report).toHaveBeenCalledWith('This window is on an older version — reload', true)
    expect(page.reload).not.toHaveBeenCalled()
  } finally { page.close() }
})
it('non-app windows never participate in update readiness', async () => {
  const a = peer('a'), attachment = peer('image', 'silent')
  attachment.client.url = 'https://app.example/api/attachments/image'
  const activate = vi.fn(async () => {})
  expect(await coordinateUpdate({ matchAll: async () => [a.client, attachment.client], openWindow: vi.fn() }, 'https://app.example', 'a', activate)).toBe(true)
  expect(attachment.requests).toEqual([])
})
it.each(['/', '/settings/', '/sessions/a.b', '/sessions/with%20space/'])('router-recognized app window participates at %s', async path => {
  const a = peer('a'), b = peer('b', false), activate = vi.fn()
  b.client.url = 'https://app.example' + path
  expect(await coordinateUpdate({ matchAll: async () => [a.client, b.client], openWindow: vi.fn() }, 'https://app.example', 'a', activate)).toBe(false)
  expect(b.requests).toContain('update_prepare')
  expect(activate).not.toHaveBeenCalled()
})
it.each(['/', '/settings/', '/sessions/a.b', '/sessions/with%20space/'])('router-recognized app document consents at %s', async path => {
  const page = pendingWindow(null, path)
  try { await page.commit() } finally { page.close() }
})
it('focused durable composer and search input do not make a window busy', () => {
  for (const durable of ['data-persisted-draft', 'type="search"']) {
    document.body.innerHTML = `<input ${durable} value="keep this">`
    document.querySelector('input')!.focus()
    const gate = new NavigationGate(), readiness = new UpdateReadiness(gate, () => false, () => false)
    expect(readiness.reserve('durable', Date.now() + 1000, false)).toBe(true)
    gate.release('durable')
  }
  document.body.innerHTML = ''
})

it('a successful form submit clears only its unchanged edits; failed saves stay busy', async () => {
  const service = new EventTarget()
  Object.assign(service, { getRegistration: async () => undefined })
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: service })
  const stop = listenForUpdates(vi.fn())
  document.body.innerHTML = '<form><input value="before"><button>Save</button></form>'
  const form = document.querySelector('form')!, input = document.querySelector('input')!
  const client = new Client({ fetch: vi.fn(async () => new Response('{}', { headers: { 'Content-Type': 'application/json' } })), here: () => ({ pathname: '/settings', search: '' }), navigate: vi.fn(), stepUp: vi.fn() })
  let saved!: Promise<unknown>
  form.addEventListener('submit', event => { event.preventDefault(); saved = client.request('PATCH', '/api/settings', { name: input.value }) })
  try {
    input.value = 'after'; input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(updateReadiness.losses()).toBe(true)
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await saved
    expect(updateReadiness.losses()).toBe(false)
  } finally { stop(); discardUpdateInputs(document.body); document.body.innerHTML = '' }
})

it.each(['worker-first', 'controller-first'] as const)('activation and controller signals deduplicate while armed: %s', async order => {
  const page = pendingWindow({})
  try {
    await page.commit()
    const state = () => { page.worker.state = 'activated'; page.worker.dispatchEvent(new Event('statechange')) }
    const controller = () => { Object.assign(page.service, { controller: page.worker }); page.service.dispatchEvent(new Event('controllerchange')) }
    if (order === 'worker-first') { state(); controller() } else { controller(); state() }
    state(); controller()
    expect(page.reload).toHaveBeenCalledOnce()
  } finally { page.close() }
})
it.each([['silent', 'did not respond'], ['busy', 'Another hennery window is busy'], ['self-changed', 'unsaved input changed'], ['replaced', 'A newer update arrived — try again']] as const)('worker result explains %s distinctly', async (reason, message) => {
  const worker = { postMessage(_m: unknown, ports: MessagePort[]) {
    ports[0].postMessage({ version: 1, kind: 'update_result', ready: false, reason }); ports[0].close()
  } }
  expect(await requestUpdate({ waiting: worker } as unknown as ServiceWorkerRegistration)).toContain(message)
})
it('the initiating window identifies its own mutation without asking peers', async () => {
  const finish = navigationGate.mutation(), postMessage = vi.fn()
  try {
    expect(await requestUpdate({ waiting: { postMessage } } as unknown as ServiceWorkerRegistration)).toBe('This window has a send in progress — try again')
    expect(postMessage).not.toHaveBeenCalled()
  } finally { finish() }
})
it.each([false, true])('failed saves and edits made during a successful save remain busy: success=%s', async success => {
  const service = new EventTarget()
  Object.assign(service, { getRegistration: async () => undefined })
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: service })
  const stop = listenForUpdates(vi.fn())
  document.body.innerHTML = '<form><input value="before"></form>'
  const form = document.querySelector('form')!, input = document.querySelector('input')!
  let finish!: (response: Response) => void
  const client = new Client({ fetch: vi.fn(() => new Promise<Response>(resolve => { finish = resolve })), here: () => ({ pathname: '/settings', search: '' }), navigate: vi.fn(), stepUp: vi.fn() })
  let saved!: Promise<unknown>
  form.addEventListener('submit', event => { event.preventDefault(); saved = client.request('PATCH', '/api/settings', {}).catch(() => {}) })
  try {
    input.value = 'draft'; input.dispatchEvent(new Event('input', { bubbles: true }))
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    if (success) { input.value = 'newer'; input.dispatchEvent(new Event('input', { bubbles: true })) }
    finish(new Response('{}', { status: success ? 200 : 400, headers: { 'Content-Type': 'application/json' } }))
    await saved
    expect(updateReadiness.losses()).toBe(true)
  } finally { stop(); document.body.innerHTML = '' }
})
it('clearing a focused select remains an unsaved edit', () => {
  const service = new EventTarget()
  Object.assign(service, { getRegistration: async () => undefined })
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: service })
  const stop = listenForUpdates(vi.fn())
  document.body.innerHTML = '<select><option value="">None</option><option value="saved" selected>Saved</option></select>'
  try {
    const select = document.querySelector('select')!
    select.focus(); select.value = ''; select.dispatchEvent(new Event('change', { bubbles: true }))
    expect(updateReadiness.losses()).toBe(true)
  } finally { stop(); discardUpdateInputs(document.body); document.body.innerHTML = '' }
})
