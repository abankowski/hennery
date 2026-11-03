import { expect, test } from '@playwright/test'
import { startCollector } from './collector'

for (const width of [1280, 390]) test(`global parking settings round-trip at ${width}px`, async ({ browser }, testInfo) => {
  const collector = await startCollector()
  const context = await browser.newContext({ baseURL: collector.origin, viewport: { width, height: 900 } })
  try {
    const page = await context.newPage()
    expect((await page.request.post('/api/setup', {
      headers: { Origin: collector.origin },
      data: { token: new URL(collector.setupLink).hash.slice(1), password: 'correct horse battery staple', public_url: collector.origin },
    })).status()).toBe(201)
    await page.goto('/settings')
    const card = page.getByRole('region', { name: 'Automatic session parking', exact: true })
    const mode = card.getByRole('combobox', { name: 'Automatic parking', exact: true })
    const save = card.getByRole('button', { name: 'Save parking settings', exact: true })
    await expect(mode).toHaveValue('host')
    await mode.selectOption('after')
    const input = card.getByRole('spinbutton', { name: 'Idle timeout (seconds)', exact: true })
    await expect(input).toHaveValue('1800')
    await input.fill('0'); await expect(save).toBeDisabled()
    await input.fill('3600'); await save.click()
    await expect(card.getByRole('status')).toHaveText('Parking settings saved.')
    await page.reload(); await expect(input).toHaveValue('3600')
    await card.scrollIntoViewIfNeeded()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await card.screenshot({ path: testInfo.outputPath(`parking-${width}.png`) })
    await mode.selectOption('off'); await save.click()
    await expect(card.getByRole('status')).toHaveText('Parking settings saved.')
    expect(await (await page.request.get('/api/settings/idle-parking')).json()).toEqual({ idle_timeout_secs: 0 })
    await page.reload(); await expect(mode).toHaveValue('off')
    await mode.selectOption('host'); await save.click()
    await expect(card.getByRole('status')).toHaveText('Parking settings saved.')
    expect(await (await page.request.get('/api/settings/idle-parking')).json()).toEqual({ idle_timeout_secs: null })
  } finally { await context.close(); await collector.stop() }
})
