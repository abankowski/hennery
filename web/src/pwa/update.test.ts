import { MessageChannel as NodeMessageChannel } from 'node:worker_threads'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { coordinateUpdate, UPDATE_BUSY } from './update'
import { listenForUpdates, requestUpdate, UpdateReadiness } from './update-client'
import { NavigationGate, navigationGate, type AppWindow } from './navigation'
import { forgetAllAttachments, hold } from '../lib/attachments'
import { forgetAllDrafts, hasUnstoredDrafts, saveDraft } from '../lib/drafts'

beforeEach(() => { vi.stubGlobal('MessageChannel', NodeMessageChannel) })
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); forgetAllAttachments(); forgetAllDrafts() })

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
  const a = peer('a'), b = peer('b', verdict), activate = vi.fn()
  expect(await coordinateUpdate({ matchAll: async () => [a.client, b.client], openWindow: vi.fn() }, 'https://app.example', 'a', activate)).toBe(false)
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
  const service = new EventTarget(), worker = {}, stranger = {}
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
