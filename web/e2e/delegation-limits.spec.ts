import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { startCollector } from './collector'

const password = 'correct horse battery staple'
for (const width of [1280, 390]) for (const theme of ['light', 'dark'] as const) test(`global delegation limits round-trip at ${width}px ${theme}`, async ({ browser }) => {
  const collector = await startCollector()
  const context = await browser.newContext({ baseURL: collector.origin, viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: theme })
  try {
    const page = await context.newPage()
    await page.addInitScript(theme => localStorage.setItem('hennery.theme', JSON.stringify({ version: 1, preference: theme })), theme)
    expect((await page.request.post('/api/setup', { headers: { Origin: collector.origin }, data: { token: new URL(collector.setupLink).hash.slice(1), password, public_url: collector.origin } })).status()).toBe(201)
    await page.goto('/settings')
    const card = page.getByRole('region', { name: 'Delegation limits', exact: true })
    const children = card.getByRole('spinbutton', { name: 'Live children per parent', exact: true })
    const starts = card.getByRole('spinbutton', { name: 'Child starts per operator message', exact: true })
    const wakes = card.getByRole('spinbutton', { name: 'Automatic parent wake-ups', exact: true })
    await expect(children).toHaveValue('8'); await expect(starts).toHaveValue('32'); await expect(wakes).toHaveValue('20')
    await children.fill('65')
    await expect(card.getByRole('button', { name: 'Save delegation limits', exact: true })).toBeDisabled()
    await children.fill('2'); await starts.fill('3'); await wakes.fill('4')
    await card.getByRole('button', { name: 'Save delegation limits', exact: true }).click()
    const step = page.getByRole('dialog', { name: 'This needs a fresh confirmation', exact: true })
    await expect(step).toBeVisible()
    await step.getByLabel('Your password', { exact: true }).fill(password)
    await step.getByRole('button', { name: 'Confirm', exact: true }).click()
    await expect(card.getByRole('status')).toHaveText('Delegation limits saved.')
    expect(await (await page.request.get('/api/settings/delegation-limits')).json()).toEqual({ children: 2, starts_per_operator_epoch: 3, automatic_wakes_per_operator_epoch: 4 })
    await page.reload()
    await expect(children).toHaveValue('2'); await expect(starts).toHaveValue('3'); await expect(wakes).toHaveValue('4')
    await expect(card.locator('label').first()).toHaveCSS('font-family', /Roboto/)
    await expect(card.locator('.hint').first()).toHaveCSS('font-family', /Roboto/)
    await expect(children).toHaveCSS('font-family', /Inter/)
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const captures = process.env.HENNERY_DELEGATION_LIMIT_CAPTURES
    if (captures) {
      mkdirSync(captures, { recursive: true })
      await page.evaluate(() => document.fonts.ready)
      await card.screenshot({ path: resolve(captures, `delegation-limits-${width}-${theme}.png`) })
    }
  } finally { await context.close(); await collector.stop() }
})
