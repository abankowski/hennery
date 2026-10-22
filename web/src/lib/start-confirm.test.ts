import { afterEach, expect, it, vi } from 'vitest'
import { Client } from '../api/client'
import { json, stubServer } from '../test-server'
import { confirmStart } from './start'
const options = [
  { id: 'model', type: 'select', currentValue: 'sonnet', options: [{ value: 'sonnet' }] },
  { id: 'mode', type: 'select', currentValue: 'default', options: [{ value: 'default' }] },
  { id: 'effort', type: 'select', currentValue: 'high', options: [{ value: 'high' }] },
  { id: 'sandbox', type: 'boolean', currentValue: true },
]
function fixture(detail = { hat_id: 'hat-a', lifecycle: 'active' }, actual: object = { model: 'sonnet', mode: 'default', axes: { effort: 'high', sandbox: true } }, empty = false) {
  const server = stubServer({
    'GET /api/view/sessions/s-1?limit=1': json(200, { items: [] }),
    'GET /api/sessions/s-1': json(200, detail),
    'GET /api/sessions/s-1/catalog': json(200, { session_id: 's-1', config_options: empty ? [] : options, commands: [], ...actual }),
  })
  return { ...server, client: new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/new', search: '' }), stepUp: vi.fn() }) }
}
afterEach(() => vi.useRealTimers())
it('confirms every requested model/mode/security/other value against actual read-back', async () => {
  const f = fixture()
  expect(await confirmStart(f.client, 's-1', 'hat-a', { model: 'sonnet', mode: 'default', axes: { effort: 'high', sandbox: true } })).toBe('confirmed')
})
it.each([
  { model: 'opus', mode: 'default', axes: { effort: 'high', sandbox: true } },
  { model: 'sonnet', mode: 'bypass', axes: { effort: 'high', sandbox: true } },
  { model: 'sonnet', mode: 'default', axes: { sandbox: true } },
  { model: 'sonnet', mode: 'default', axes: { effort: 'high', sandbox: false } },
])('refuses clamped or partial configuration %#', async actual => {
  const f = fixture(undefined, actual)
  expect(await confirmStart(f.client, 's-1', 'hat-a', { model: 'sonnet', mode: 'default', axes: { effort: 'high', sandbox: true } })).toBe('config_unconfirmed')
})
it('rejects actual-hat mismatch before checking config', async () => {
  const f = fixture({ hat_id: 'hat-b', lifecycle: 'active' })
  expect(await confirmStart(f.client, 's-1', 'hat-a', {})).toBe('hat_changed')
  expect(f.sent).toHaveLength(1)
})
it('does not treat a failed session as confirmation', async () => {
  const f = fixture({ hat_id: 'hat-a', lifecycle: 'failed' })
  expect(await confirmStart(f.client, 's-1', 'hat-a', {})).toBe('config_unconfirmed')
})
it('bounds waiting for missing evidence to 30 seconds, with no automatic release later', async () => {
  vi.useFakeTimers()
  const f = fixture(undefined, {}, true)
  const pending = confirmStart(f.client, 's-1', 'hat-a', {})
  await vi.advanceTimersByTimeAsync(30_000)
  expect(await pending).toBe('config_unconfirmed')
  expect(f.sent.every(sent => sent.method === 'GET')).toBe(true)
})
it('refuses a recorded configuration failure even if a later catalog happens to match', async () => {
  const server = stubServer({
    'GET /api/sessions/s-1': json(200, { hat_id: 'hat-a', lifecycle: 'active' }),
    'GET /api/sessions/s-1/catalog': json(200, { config_options: options, commands: [], model: 'sonnet' }),
    'GET /api/view/sessions/s-1?limit=1': json(200, { items: [{ kind: 'marker', marker: 'host_note', reason: 'config_failed' }] }),
  })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/new', search: '' }), stepUp: vi.fn() })
  expect(await confirmStart(client, 's-1', 'hat-a', { model: 'sonnet' })).toBe('config_unconfirmed')
})
it('rejects a stale flattened value when the actual option is no longer present', async () => {
  const server = stubServer({
    'GET /api/view/sessions/s-1?limit=1': json(200, { items: [] }),
    'GET /api/sessions/s-1': json(200, { hat_id: 'hat-a', lifecycle: 'active' }),
    'GET /api/sessions/s-1/catalog': json(200, { config_options: options, commands: [], model: 'sonnet', axes: { fast: false } }),
  })
  const client = new Client({ fetch: server.fetch, navigate: vi.fn(), here: () => ({ pathname: '/new', search: '' }), stepUp: vi.fn() })
  expect(await confirmStart(client, 's-1', 'hat-a', { model: 'sonnet', axes: { fast: false } })).toBe('config_unconfirmed')
})
it('shows the requested unsupported setting on its own session without putting values in the URL', async () => {
  const { rememberConfigurationReview, readStartNotice, sessionHref, startNoticeText } = await import('./start')
  const { catalog } = await import('../test-launch-catalog')
  rememberConfigurationReview('review-a', catalog, { model: 'sonnet', axes: { fast: false } })
  const url = sessionHref('review-a', { kind: 'prompt_failed', code: 'config_unconfirmed' })
  expect(url).not.toContain('sonnet')
  const notice = readStartNotice('?notice=prompt_failed&code=config_unconfirmed', 'review-a')!
  expect(startNoticeText(notice)).toContain('Fast: Off')
  expect(startNoticeText(readStartNotice('?notice=prompt_failed&code=config_unconfirmed', 'review-b')!)).not.toContain('Fast: Off')
})
it('checks the actual hat even for a deliberate unverified agent-default start', async () => {
  const f = fixture({ hat_id: 'hat-b', lifecycle: 'active' })
  expect(await confirmStart(f.client, 's-1', 'hat-a', {}, 30_000, false)).toBe('hat_changed')
  const sameHat = fixture()
  expect(await confirmStart(sameHat.client, 's-1', 'hat-a', {}, 30_000, false)).toBe('confirmed')
  expect(sameHat.sent.map(sent => sent.path)).toEqual(['/api/sessions/s-1'])
})

it('labels configuration review from the real session first, then the cached catalog, then the id', async () => {
  const { rememberConfigurationReview, readStartNotice } = await import('./start')
  const { catalog } = await import('../test-launch-catalog')
  const real = { session_id: 'labels', commands: [], config_options: [{ id: 'fast', name: 'Fast mode', type: 'boolean', currentValue: true }] }
  rememberConfigurationReview('labels', catalog, { model: 'sonnet', axes: { fast: false, missing: true } }, real)
  expect(readStartNotice('?notice=prompt_failed&code=config_unconfirmed', 'labels')?.kind).toBe('prompt_failed')
  expect(sessionStorage.getItem('hennery.draft.__launch_review__.labels')).toContain('Fast mode: Off · missing: On · model: sonnet')
})
