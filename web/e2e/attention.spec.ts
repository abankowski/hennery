import { expect, test, type Route } from '@playwright/test'
import type { Item, SessionSummary } from '../src/generated/view'
import { startCollector, type Collector } from './collector'
let collector: Collector
test.beforeAll(async () => { collector = await startCollector() })
test.afterAll(async () => { await collector?.stop() })

for (const width of [1280, 390]) test(`question previews, closed child attention and local dismiss at ${width}px`, async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width, height: 900 } })
  const ts = '2026-10-21T10:00:00Z'
  const base: SessionSummary = { session_id: 'question', title: 'Choose parser', host_id: 'host', hat_id: 'hat', agent: 'claude', cwd: '/srv/project', created_at: ts, last_event_at: ts, lifecycle: 'active', activity: 'blocked', question_waits: true, operator_attention: 1, parent_handled_questions: 0, presumed_parked: false }
  const closed: SessionSummary = { ...base, session_id: 'child', title: 'Closed worker', lifecycle: 'closed', question_waits: false, family: { revision: 1, parent: { session_id: 'parent', title: 'Coordinator', agent: 'claude' }, children: [], child_counts: { total: 0, active: 0, waiting: 0 }, attention: 1 } }
  let pending = 'one', acknowledged = false
  const streams: Route[] = [], held: Route[] = [], mutations: string[] = [], unmatched: string[] = []
  const question = (): Item => ({ id: `question:${pending}`, version: 1, ts, kind: 'question', pending_id: pending, question_kind: 'elicitation', request: { type: 'elicitation', message: 'Which parser should handle the input? '.repeat(15), form_supported: true, fields: [{ key: 'parser', label: 'Parser', field_kind: 'single', options: [{ value: 'strict', label: 'Strict' }] }, { key: 'other', label: 'Other', field_kind: 'text' }] }, state: 'open', answerable: true, answered: false })
  await context.route('**/api/**', route => {
    const url = new URL(route.request().url()), path = url.pathname
    const json = (value: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(value) })
    if (route.request().method() !== 'GET') mutations.push(path)
    if (/^\/api\/sessions\/[^/]+\/queue$/.test(path)) return json([])
    if (path === '/api/capabilities') return json({ mode: 'full', features: [] })
    if (path === '/api/hats') return json([{ id: 'hat', name: 'Personal', colour: '#8050d0', created_at: ts, purging: false, default_for_new_hosts: false }])
    if (path === '/api/hosts') return json([{ host_id: 'host', name: 'Test workstation', connected: true, capabilities: [] }])
    if (path === '/api/view/sessions') return json({ sessions: [base, ...(acknowledged ? [] : [closed])].filter(s => !url.searchParams.has('lifecycle') || url.searchParams.get('lifecycle')!.split(',').includes(s.lifecycle)), waiting: acknowledged ? 1 : 2, epoch: 'list', revision: 1 })
    if (path === '/api/stream/sessions') { streams.push(route); held.push(route); return }
    if (path === '/api/sessions/question') return json({ ...base, pending: [{ pending_id: pending, state: 'open', answered: false }] })
    if (path === '/api/sessions/child') return json({ ...closed, pending: [] })
    if (path.includes('/questions/')) return json(question())
    if (path === '/api/view/sessions/question') return json({ items: [question()], older: false, epoch: 'items', revision: 1 })
    if (path === '/api/sessions/question/catalog') return json({ session_id: 'question', config_options: [], commands: [] })
    if (path === '/api/view/sessions/question/family') return json({ summary: base, children: [], questions: [] })
    if (path === '/api/stream/view/sessions/question') { held.push(route); return }
    if (path === '/api/delegation/attention') return json(acknowledged ? [] : [{ id: 'report', child_id: 'child', hat_id: 'hat', pending_id: null, reason: 'endpoint_unavailable' }])
    if (path === '/api/delegation/attention/report/acknowledge') { acknowledged = true; return route.fulfill({ status: 204 }) }
    if (path === '/api/auth/logout') return route.fulfill({ status: 204 })
    if (path === '/api/auth/passkeys/login/start') return json({ options: {} })
    if (path === '/api/push/subscriptions') return json([])
    unmatched.push(path); return route.fulfill({ status: 404, body: '{}' })
  })
  try {
    const page = await context.newPage(); await page.goto(collector.origin + (width === 1280 ? '/sessions' : '/needs-you'))
    const queue = page.getByRole('region', { name: 'Attention queue', exact: true })
    await expect(queue.getByText('2 sessions need you', { exact: true })).toBeVisible()
    await expect(queue.getByText("Couldn't deliver this child's report to its parent", { exact: true })).toBeVisible()
    await expect(queue.getByText('Closed', { exact: true })).toBeVisible()
    await expect(queue.getByText('Child of Coordinator', { exact: true })).toBeVisible()
    await page.getByRole('group', { name: 'Hat', exact: true }).getByRole('button', { name: 'Personal', exact: true }).click()
    await expect(queue.getByText('2 sessions need you', { exact: true })).toBeVisible()
    const card = queue.getByRole('article', { name: 'Choose parser', exact: true })
    await expect(card.locator('.preview-elicitation')).toBeVisible()
    await expect(card.getByRole('radio')).toHaveCount(0)
    await expect(card.getByRole('textbox')).toHaveCount(0)
    await expect(card.getByRole('button', { name: 'Decline', exact: true })).toHaveCount(0)
    expect(await card.locator('.preview-elicitation').evaluate(el => el.clientHeight <= 3 * parseFloat(getComputedStyle(el).fontSize) + 1 && el.scrollHeight > el.clientHeight)).toBe(true)
    await card.getByRole('button', { name: 'Dismiss', exact: true }).click()
    await expect(card).toHaveCount(0)
    await expect(queue.getByText('1 session needs you', { exact: true })).toBeVisible()
    await page.reload()
    await expect(queue.getByRole('button', { name: 'Show 1 dismissed', exact: true })).toBeVisible()
    await expect(card).toHaveCount(0)
    await queue.getByRole('button', { name: 'Show 1 dismissed', exact: true }).click()
    await expect(card.getByRole('button', { name: 'Restore', exact: true })).toBeVisible()
    await queue.getByRole('button', { name: 'Hide 1 dismissed', exact: true }).click()
    pending = 'two'
    await expect.poll(() => streams.length).toBeGreaterThan(0)
    await streams.pop()!.fulfill({ contentType: 'text/event-stream', body: `event: session_upsert\ndata: ${JSON.stringify({ ...base, last_event_at: '2026-10-21T11:00:00Z' })}\nid: list:2\n\n` })
    await expect(card).toBeVisible()
    await expect(queue.getByText('2 sessions need you', { exact: true })).toBeVisible()
    await queue.getByRole('button', { name: 'Acknowledge', exact: true }).click()
    await expect(queue.getByText('1 session needs you', { exact: true })).toBeVisible()
    await card.getByRole('button', { name: 'Dismiss', exact: true }).click()
    await expect(queue.getByText('0 sessions need you', { exact: true })).toBeVisible()
    await page.goto(collector.origin + '/sessions')
    await expect(page.locator('[data-session-id="question"]')).toBeVisible()
    if (width === 390) await page.getByRole('button', { name: 'Filters', exact: true }).click()
    await page.getByRole('button', { name: 'Needs you 0', exact: true }).click()
    await expect(page.locator('[data-session-id="question"]')).toHaveCount(0)
    await page.goto(collector.origin + '/needs-you')
    await queue.getByRole('button', { name: 'Show 1 dismissed', exact: true }).click()
    await card.getByRole('button', { name: 'Restore', exact: true }).click()
    await card.getByRole('link', { name: 'Open Choose parser', exact: true }).click()
    await expect(page).toHaveURL(collector.origin + '/sessions/question?pending=two')
    await expect(page.locator('[data-pending-id="two"]').getByRole('radio', { name: 'Strict', exact: true })).toBeVisible()
    if (width === 390) await page.goto(collector.origin + '/more')
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await expect(page).toHaveURL(collector.origin + '/login')
    expect(await page.evaluate(() => localStorage.getItem('hennery.dismissedAttention'))).toBeNull()
    expect(mutations).toEqual(['/api/delegation/attention/report/acknowledge', '/api/auth/logout', '/api/auth/passkeys/login/start'])
    expect(unmatched).toEqual([])
  } finally { for (const route of held) await route.abort().catch(() => {}); await context.close() }
})
