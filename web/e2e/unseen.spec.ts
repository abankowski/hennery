import { expect, test, type Route } from '@playwright/test'
import type { Item, SessionSummary } from '../src/generated/view'
import { startCollector, type Collector } from './collector'

let collector: Collector
test.beforeAll(async () => { collector = await startCollector() })
test.afterAll(async () => { await collector?.stop() })

for (const width of [1280, 390]) test(`unseen is distinct from Needs you and clears only at the visible tail at ${width}px`, async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width, height: 900 } })
  const held: Route[] = [], reads: number[] = []
  let eventId = 10, seenId = 0
  const ts = '2026-10-22T10:00:00Z'
  const base: SessionSummary = { session_id: '01900000-0000-4000-8000-000000000001', title: 'Finished work', host_id: 'host', hat_id: 'hat', agent: 'claude', cwd: '/srv/project', created_at: ts, last_event_at: ts, lifecycle: 'active', activity: 'idle', question_waits: false, operator_attention: 0, parent_handled_questions: 0, presumed_parked: false }
  const row = (): SessionSummary => ({ ...base, unseen: seenId < eventId ? { event_id: eventId } : undefined })
  const waiting: SessionSummary = { ...base, session_id: 'waiting', title: 'Permission needed', activity: 'blocked', operator_attention: 1, question_waits: true, unseen: { event_id: 5 } }
  const items: Item[] = Array.from({ length: 4 }, (_, n) => ({ id: `message-${n}`, version: eventId, ts, turn_id: 'turn', kind: 'message', text: `Result ${n}\n\n` + 'A line of the agent output. '.repeat(400) }))
  await context.route('**/api/**', route => {
    const request = route.request(), path = new URL(request.url()).pathname
    const json = (value: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(value) })
    if (path === '/api/capabilities') return json({ mode: 'full', features: [] })
    if (path === '/api/hats') return json([{ id: 'hat', name: 'Personal', colour: '#8050d0', created_at: ts, purging: false, default_for_new_hosts: false }])
    if (path === '/api/hosts') return json([{ host_id: 'host', name: 'Test workstation', connected: true, capabilities: [] }])
    if (path === '/api/view/sessions') return json({ sessions: [row(), waiting, { ...base, session_id: 'seen', title: 'Already seen' }], waiting: 1, epoch: 'list', revision: eventId })
    if (path.startsWith('/api/stream/')) { held.push(route); return }
    if (path === '/api/view/sessions/01900000-0000-4000-8000-000000000001/seen') {
      const token = request.postDataJSON().event_id as number
      reads.push(token); seenId = Math.max(seenId, token)
      return route.fulfill({ status: 204 })
    }
    if (path === '/api/view/sessions/01900000-0000-4000-8000-000000000001') return json({ items: items.map(item => ({ ...item, version: eventId })), revision: eventId, epoch: 'items', older: false })
    if (path === '/api/sessions/01900000-0000-4000-8000-000000000001') return json({ ...row(), pending: [] })
    if (path === '/api/sessions/01900000-0000-4000-8000-000000000001/catalog') return json({ session_id: '01900000-0000-4000-8000-000000000001', config_options: [], commands: [] })
    if (path === '/api/sessions/01900000-0000-4000-8000-000000000001/queue' || path === '/api/sessions/01900000-0000-4000-8000-000000000001/events' || path === '/api/delegation/attention' || path === '/api/push/subscriptions') return json([])
    if (path === '/api/view/sessions/01900000-0000-4000-8000-000000000001/family') return json({ summary: row(), children: [], questions: [] })
    return route.fulfill({ status: 404, body: '{}' })
  })
  try {
    const page = await context.newPage()
    await page.goto(collector.origin + '/sessions')
    const result = page.locator('.sess[data-session-link][href="/sessions/01900000-0000-4000-8000-000000000001"]')
    await expect(result).toHaveClass(/session-unseen/)
    await expect(result.getByRole('img', { name: 'Idle', exact: true })).toBeVisible()
    await expect(result.getByRole('img', { name: 'Unseen', exact: true })).toBeVisible()
    expect(await result.locator('.sess-name').evaluate(el => Number(getComputedStyle(el).fontWeight))).toBeGreaterThanOrEqual(700)
    const dot = result.locator('.unseen-dot')
    expect(await dot.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)')
    await page.screenshot({ path: testInfo.outputPath('unseen-sessions.png'), fullPage: true })
    if (width < 768) await page.getByRole('button', { name: 'Filters', exact: true }).click()
    await page.getByRole('button', { name: /^Unseen / }).click()
    if (width < 768) await page.getByRole('button', { name: 'Close filters', exact: true }).click()
    await expect(page.locator('.sess[href="/sessions/01900000-0000-4000-8000-000000000001een"]')).toHaveCount(0)
    await expect(result).toBeVisible()
    await page.goto(collector.origin + '/needs-you')
    await expect(page.getByRole('article', { name: 'Finished work', exact: true })).toHaveCount(0)
    await expect(page.getByRole('article', { name: 'Permission needed', exact: true })).toBeVisible()
    expect(reads).toEqual([])

    // Opening behind another tab must not acknowledge the automatically scrolled tail.
    const cover = await context.newPage()
    await cover.goto('about:blank')
    await page.goto(collector.origin + '/sessions/01900000-0000-4000-8000-000000000001')
    await expect(page.locator('.unseen-sentinel')).toHaveCount(1)
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    expect(reads).toEqual([])
    await page.locator('.transcript').evaluate(el => { el.scrollTop = 0; el.dispatchEvent(new Event('scroll')) })
    await page.bringToFront()
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    expect(reads).toEqual([])
    await page.locator('.transcript').evaluate(el => { el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event('scroll')) })
    await expect.poll(() => reads).toEqual([10])
    await page.goto(collector.origin + '/sessions')
    if (width < 768) await page.getByRole('button', { name: 'Filters', exact: true }).click()
    await page.getByRole('button', { name: /^All [0-9]/ }).click()
    if (width < 768) await page.getByRole('button', { name: 'Close filters', exact: true }).click()
    await expect(result).not.toHaveClass(/session-unseen/)
    await expect(result.getByRole('img', { name: 'Unseen', exact: true })).toHaveCount(0)
    eventId = 20
    await page.reload()
    await expect(result).toHaveClass(/session-unseen/)
    if (width >= 768) {
      await expect(page.locator('.recent-session[href="/sessions/01900000-0000-4000-8000-000000000001"]')).toHaveClass(/session-unseen/)
      await page.getByRole('button', { name: 'Jump to', exact: true }).click()
      const option = page.getByRole('option', { name: 'Finished work /srv/project', exact: true })
      await expect(option).toHaveClass(/session-unseen/)
      await expect(option.getByRole('img', { name: 'Unseen', exact: true })).toBeVisible()
    }
    await cover.close()
  } finally {
    for (const route of held) await route.abort().catch(() => {})
    await context.close()
  }
})
