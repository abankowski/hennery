import { expect, type Page } from '@playwright/test'
import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { contrast } from '../src/lib/accent'
/** Optional visual ledger; checks always run against the embedded UI. */
export async function captureManagement(page: Page, state: string, reference: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const directory = process.env.HENNERY_UI_R5_CAPTURE_DIR
  if (directory) mkdirSync(directory, { recursive: true })
  const viewport = page.viewportSize()!
  const main = page.locator('.main')
  const scrollTop = await main.evaluate(element => element.scrollTop)
  for (const theme of ['light', 'dark'] as const) {
    await main.evaluate((element, top) => { element.scrollTop = top }, scrollTop)
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await page.evaluate(() => document.fonts.ready)
    const controls = await page.locator('.manage input:not([type=checkbox]):not([type=radio]):not([type=color]), .manage select, .manage textarea').evaluateAll(elements => elements.filter(element => element.getClientRects().length > 0).map(element => {
      const style = getComputedStyle(element)
      return { boundary: style.borderTopColor, background: style.backgroundColor }
    }))
    const hex = (rgb: string) => '#' + (rgb.match(/\d+/g) ?? []).slice(0, 3).map(value => Number(value).toString(16).padStart(2, '0')).join('')
    for (const control of controls) expect(contrast(hex(control.boundary), hex(control.background))).toBeGreaterThanOrEqual(3)
    if (!directory) continue
    const file = `${state}-${viewport.width}-${theme}.png`
    await page.screenshot({ path: join(directory, file), fullPage: true })
    appendFileSync(join(directory, 'captures.tsv'), `${file}\t${viewport.width}x${viewport.height}\t${page.url().replace(new URL(page.url()).origin, '')}\t${reference}\n`)
    // Management scrolls inside the shell. Record the top and each section,
    // rather than mistaking a fullPage image of a scrolled shell for all UI.
    if (await page.locator('.overlay').count() === 0 && ['settings', 'settings-passkeys', 'hats', 'hosts'].includes(state)) {
      const headings = page.locator('.manage > header, .manage > section > h2, .manage > .cards > li > .card-head > h2')
      for (let index = 0; index < await headings.count(); index++) {
        await headings.nth(index).scrollIntoViewIfNeeded()
        const section = `${state}-section-${index}-${viewport.width}-${theme}.png`
        await page.screenshot({ path: join(directory, section) })
        appendFileSync(join(directory, 'captures.tsv'), `${section}\t${viewport.width}x${viewport.height}\t${page.url().replace(new URL(page.url()).origin, '')}\t${reference}\n`)
      }
    }
  }
  await main.evaluate((element, top) => { element.scrollTop = top }, scrollTop)
  await page.emulateMedia({ colorScheme: 'light' })
}
