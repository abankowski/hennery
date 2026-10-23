import { expect, test, type Route } from '@playwright/test'
import type { Item, SessionSummary } from '../src/generated/view'
import { startCollector, type Collector } from './collector'

let collector: Collector
test.beforeAll(async () => { collector = await startCollector() })
test.afterAll(async () => { await collector?.stop() })

for (const width of [1280, 390]) test(`durable review action and visible-result reading at ${width}px`, async ({ browser }, testInfo) => {
  const contexts = await Promise.all([browser.newContext({ viewport: { width, height: 900 } }), browser.newContext({ viewport: { width, height: 900 } })])
  const held: Route[] = [], snapshots: Route[] = [], reads: number[] = []
  let eventId = 10, readId = 0, holdSnapshot = false
  const ts = '2026-10-22T10:00:00Z'
  const base: SessionSummary = { session_id: 'root', title: 'Review coordinator', host_id: 'host', hat_id: 'hat', agent: 'claude', cwd: '/srv/project', created_at: ts, last_event_at: ts, lifecycle: 'active', activity: 'idle', question_waits: false, operator_attention: 0, parent_handled_questions: 0, presumed_parked: false }
  const row = (): SessionSummary => ({ ...base, review: readId < eventId ? { event_id: eventId, turn_id: 'turn', outcome: 'completed' } : undefined })
  const child: SessionSummary = { ...base, session_id: 'child', title: 'Parent handled worker', family: { revision: 1, parent: { session_id: 'root', agent: 'claude' }, child_counts: { total: 0, active: 0, waiting: 0 }, children: [], attention: 0 } }
  const items: Item[] = Array.from({ length: 4 }, (_, n) => ({ id: `message-${n}`, version: 9, ts, turn_id: 'turn', kind: 'message', text: `Result ${n}\n\n` + 'A line of the completed result. '.repeat(400) }))
  const pageBody = () => ({ items, revision: eventId, epoch: 'items', older: false })
  for (const context of contexts) await context.route('**/api/**', route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname
    const json = (value: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(value) })
    if (path === '/api/capabilities') return json({ mode: 'full', features: [] })
    if (path === '/api/hats') return json([{ id: 'hat', name: 'Personal', colour: '#8050d0', created_at: ts, purging: false, default_for_new_hosts: false }])
    if (path === '/api/hosts') return json([{ host_id: 'host', name: 'Test workstation', connected: true, capabilities: [] }])
    if (path === '/api/view/sessions') return json({ sessions: [row(), child], waiting: 0, epoch: 'list', revision: eventId })
    if (path.startsWith('/api/stream/')) { held.push(route); return }
    if (path === '/api/view/sessions/root/read') { const token = request.postDataJSON().event_id as number; reads.push(token); readId = Math.max(readId, token); return route.fulfill({ status: 204 }) }
    if (path === '/api/view/sessions/root') {
      if (holdSnapshot && url.searchParams.get('limit') === '1') { snapshots.push(route); return }
      return json(pageBody())
    }
    if (path === '/api/sessions/root') return json({ ...row(), pending: [] })
    if (path === '/api/sessions/root/catalog') return json({ session_id: 'root', config_options: [], commands: [] })
    if (path === '/api/sessions/root/events' || path === '/api/delegation/attention' || path === '/api/push/subscriptions') return json([])
    if (path === '/api/view/sessions/root/family') return json({ summary: row(), children: [], questions: [] })
    return route.fulfill({ status: 404, body: '{}' })
  })
  try {
    const a = await contexts[0].newPage(), b = await contexts[1].newPage()
    await a.goto(collector.origin + '/needs-you')
    await expect(a.getByRole('article', { name: 'Review coordinator', exact: true })).toHaveCount(0)
    await expect(a.getByRole('article', { name: 'Parent handled worker', exact: true })).toHaveCount(0)
    holdSnapshot = true
    await b.goto(collector.origin + '/sessions/root')
    const footer = b.locator('.transcript .result-review-footer')
    await expect(footer).toHaveCount(1)
    const lastMessage = b.locator('.transcript .bubble').last()
    expect(await footer.evaluate((el, message) => !!(message.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING), await lastMessage.elementHandle())).toBe(true)
    await footer.scrollIntoViewIfNeeded()
    await b.screenshot({ path: testInfo.outputPath('result-footer.png'), fullPage: true })
    await footer.getByRole('button', { name: 'Mark as read', exact: true }).click()
    expect(reads).toEqual([10])
    await b.goto(collector.origin + '/needs-you')
    await a.reload()
    await expect(a.getByText('Nothing needs you', { exact: true })).toBeVisible()
    eventId = 20
    await a.reload()
    await expect(a.getByRole('article', { name: 'Review coordinator', exact: true })).toHaveCount(0)
    holdSnapshot = true
    await a.goto(collector.origin + '/sessions/root')
    await expect(a.locator('.result-read-sentinel')).toHaveCount(1)
    await a.locator('.transcript').evaluate(el => { el.scrollTop = 0; el.dispatchEvent(new Event('scroll')) })
    await expect.poll(() => snapshots.length).toBeGreaterThan(0)
    for (const route of snapshots.splice(0)) await route.fulfill({ contentType: 'application/json', body: JSON.stringify(pageBody()) })
    await expect(a.locator('[data-review-ready="true"]')).toHaveCount(1)
    await a.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    expect(reads).toEqual([10])
    await a.bringToFront()
    await a.locator('.transcript').evaluate(el => { el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event('scroll')) })
    await expect.poll(() => reads).toEqual([10, 20])
  } finally {
    for (const route of [...held, ...snapshots]) await route.abort().catch(() => {})
    for (const context of contexts) await context.close()
  }
})
