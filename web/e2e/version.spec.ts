import { expect, test } from '@playwright/test'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { startCollector } from './collector'
import { spawnHennery } from './spawn'

let release: string
let source: string | undefined
test.beforeAll(async () => {
  const dir = mkdtempSync(join(tmpdir(), 'hennery-version-'))
  try {
    const child = spawnHennery(['--version'], dir, {}, ['ignore', 'pipe', 'pipe'])
    let output = ''
    child.stdout!.on('data', chunk => { output += chunk.toString() })
    await new Promise<void>((done, reject) => {
      child.once('error', reject)
      child.once('exit', code => code === 0 ? done() : reject(new Error(`--version exited ${code}`)))
    })
    release = /^hennery (\S+)/.exec(output)![1]
    source = /^source: ([a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/m.exec(output)?.[1]
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

for (const width of [1280, 390]) for (const theme of ['light', 'dark'] as const) {
  test(`collector version in footer and About at ${width}px ${theme}`, async ({ browser }) => {
    const collector = await startCollector()
    const context = await browser.newContext({ baseURL: collector.origin, viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: theme })
    try {
      const setup = await context.request.post('/api/setup', {
        headers: { Origin: collector.origin },
        data: { token: new URL(collector.setupLink).hash.slice(1), password: 'correct horse battery staple', public_url: collector.origin, default_hat_name: 'Personal' },
      })
      expect(setup.ok()).toBe(true)
      const response = await context.request.get('/api/capabilities')
      const caps = await response.json()
      expect(caps.collector_version).toBe(release)
      expect(caps.source_commit).toBe(source ?? null)
      const label = `hennery ${release}${source ? ` · ${source.slice(0, 8)}` : ''}`
      const page = await context.newPage()
      const captures = process.env.HENNERY_VERSION_CAPTURES
      const capture = async (name: string) => {
        if (!captures) return
        mkdirSync(captures, { recursive: true })
        await page.evaluate(async () => { await document.fonts.ready })
        await page.screenshot({ path: resolve(captures, `${name}-${width}-${theme}.png`) })
      }
      await page.goto('/sessions')
      if (width === 1280) {
        const footer = page.locator('.rail-foot .version-info')
        await expect(footer).toHaveText(label)
        await expect(footer).toHaveCSS('font-family', /Roboto/)
        await expect(footer).toHaveCSS('font-size', '11px')
        expect(await footer.evaluate(el => {
          const sample = document.createElement('span')
          sample.style.color = 'var(--hn-fg-3)'
          el.append(sample)
          const matches = getComputedStyle(el).color === getComputedStyle(sample).color
          sample.remove()
          return matches
        })).toBe(true)
        await capture('sidebar')
        await page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: 'Settings', exact: true }).click()
      } else {
        await page.getByRole('navigation', { name: 'Primary navigation', exact: true }).getByRole('link', { name: 'More', exact: true }).click()
        await expect(page.locator('.more-version')).toHaveText(label)
        expect((await page.locator('.more-version').boundingBox())!.y).toBeGreaterThan(844 * 0.7)
        await capture('more')
        await page.getByRole('navigation', { name: 'More navigation', exact: true }).getByRole('link', { name: 'Settings', exact: true }).click()
      }
      const about = page.getByRole('region', { name: 'About', exact: true })
      expect(await about.evaluate(el => el.parentElement?.lastElementChild === el)).toBe(true)
      await about.scrollIntoViewIfNeeded()
      await expect(about.getByText(label, { exact: true })).toBeVisible()
      await expect(about.locator('.version-hint')).toHaveCount(0)
      await expect(about.locator('.version-info')).toHaveCSS('font-family', /Roboto/)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await capture('settings')

      // A window left open across a collector upgrade refreshes on focus.
      await context.route('**/api/capabilities', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...caps, collector_version: '99.0.0' }) }))
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await expect(about.locator('.version-hint')).toHaveText(`page ${release} · server 99.0.0`)
      if (width === 1280) await expect(page.locator('.rail-foot .version-hint')).toHaveText(`page ${release} · server 99.0.0`)
    } finally {
      await context.close()
      await collector.stop()
    }
  })
}
