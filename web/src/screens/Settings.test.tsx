import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Settings from './Settings'
import { Client } from '../api/client'
import { ClientContext } from '../app-client'
import { json, stubServer } from '../test-server'
const mocked = vi.hoisted(() => ({ permission: vi.fn(), enable: vi.fn(), disable: vi.fn(), reg: {} }))
vi.mock('../pwa/lifecycle', () => ({ usePwa: () => ({ registration: mocked.reg, error: null }), registerWorker: vi.fn() }))
vi.mock('../pwa/device', async (original) => {
  const actual = await original<typeof import('../pwa/device')>()
  return { ...actual, BrowserPush: class {
    enable = mocked.enable; disable = mocked.disable
    reconcile = async () => ({ subscription: null, record: { generation: 0, enabled: false }, matches: true })
  } }
})
vi.mock('../pwa/journal', () => ({ pushJournal: () => ({ read: async () => ({ generation: 0, enabled: false }) }) }))
beforeEach(() => {
  vi.stubGlobal('Notification', { permission: 'default', requestPermission: mocked.permission.mockReset().mockResolvedValue('granted') })
  vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('isSecureContext', true)
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {} })
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: vi.fn() } })
  mocked.enable.mockReset(); mocked.disable.mockReset()
})
afterEach(() => vi.unstubAllGlobals())
function page(push = true) {
  const server = stubServer({
    'GET /api/push/vapid': json(200, { public_key: btoa(String.fromCharCode(4, ...Array(64).fill(1))) }),
    'GET /api/push/subscriptions': json(200, []),
    'GET /api/auth/sessions': json(200, [{ id: 'login', user_agent: '<script>bad</script>', current: true, created_at: 'today', last_seen_at: 'today', expires_at: 'tomorrow' }]),
    'GET /api/settings': json(200, { public_url: 'https://app.example', contact: 'mailto:test@example.invalid' }),
    'GET /api/hats': json(200, [{ id: 'hat', name: 'Personal', colour: '#000', default_for_new_hosts: true }]),
    'GET /api/push/policies': json(200, [{ hat_id: 'hat', muted: false, details: false, generic_title: false }]),
    'PATCH /api/settings': json(200, { public_url: 'https://app.example', contact: 'mailto:new@example.invalid' }),
    'PUT /api/push/policies/hat': json(200, { hat_id: 'hat', muted: false, details: true, generic_title: true }),
  })
  const confirm = vi.fn(async () => {})
  const client = new Client({ fetch: server.fetch, here: () => ({ pathname: '/settings', search: '' }), navigate: vi.fn(), stepUp: confirm })
  render(<ClientContext.Provider value={client}><Settings push={push} sessions={push} /></ClientContext.Provider>)
  return { server, confirm }
}
describe('minimum device Settings', () => {
  it('without origin locks omits notification enable and preserves mobile sign-out', async () => {
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined })
    page()
    await screen.findByRole('heading', { name: 'Push devices' })
    expect(screen.queryByRole('button', { name: 'Prepare notifications' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeVisible()
    expect(mocked.permission).not.toHaveBeenCalled()
  })
  it('never prompts on mount; preparation completes step-up, then a fresh enable tap prompts first', async () => {
    const { confirm } = page()
    await userEvent.click(await screen.findByRole('button', { name: 'Prepare notifications' }))
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(mocked.permission).not.toHaveBeenCalled()
    mocked.enable.mockImplementation(() => { expect(mocked.permission).toHaveBeenCalledTimes(1); return Promise.resolve() })
    await userEvent.click(screen.getByRole('button', { name: 'Enable notifications' }))
    await waitFor(() => expect(mocked.enable).toHaveBeenCalledTimes(1))
    expect(mocked.permission).toHaveBeenCalledTimes(1)
    expect(mocked.permission.mock.invocationCallOrder[0]).toBeLessThan(mocked.enable.mock.invocationCallOrder[0])
  })
  it('gateway without web_push omits absent APIs and exposes mobile sign-out', async () => {
    const { server } = page(false)
    await screen.findByRole('heading', { name: 'Signed-in devices' })
    expect(screen.queryByRole('heading', { name: 'Push devices' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Notification privacy by hat' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeVisible()
    expect(server.sent.some((c) => c.path.includes('/api/push'))).toBe(false)
  })
  it('sends only contact and uses read-back, with no public_url field', async () => {
    const { server } = page()
    const contact = await screen.findByLabelText('Push contact', { exact: true })
    await userEvent.clear(contact); await userEvent.type(contact, 'mailto:new@example.invalid')
    await userEvent.click(screen.getByRole('button', { name: 'Save contact' }))
    await waitFor(() => expect(server.sent.filter((c) => c.method === 'PATCH')).toHaveLength(1))
    expect(server.sent.find((c) => c.method === 'PATCH')?.body).toEqual({ contact: 'mailto:new@example.invalid' })
  })
  it('keeps three independent hat controls, renders User-Agent as isolated text', async () => {
    const { server } = page()
    const card = await screen.findByRole('group', { name: 'Personal' })
    await userEvent.click(within(card).getByLabelText('Mute', { exact: true }))
    await userEvent.click(within(card).getByLabelText('Include question details', { exact: true }))
    await userEvent.click(within(card).getByRole('button', { name: 'Save policy' }))
    await waitFor(() => expect(within(card).getByLabelText('Mute', { exact: true })).not.toBeChecked())
    expect(within(card).getByLabelText('Use a generic title', { exact: true })).toBeChecked()
    expect(server.sent.find((r) => r.method === 'PUT')?.body).toEqual({ muted: true, details: true, generic_title: false })
    const agent = screen.getByText('<script>bad</script>', { exact: true })
    expect(agent.tagName).toBe('BDI')
    expect(document.querySelector('script')).toBeNull()
  })
})
