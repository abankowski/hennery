// UI R4: real host settings previews, persistent defaults and the first-prompt gate.
import { expect, test, type Page, type APIRequestContext } from '@playwright/test'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startCollector, type Collector } from './collector'
import { defaultHostDir, fakeAgent, testHost, type TestHost } from './host'

const PASSWORD = 'correct horse battery staple'
const select = (id: string, current: string, values: string[]) => ({ id, category: id === 'effort' ? 'thought_level' : id, name: id === 'mode' ? 'Permission' : id[0].toUpperCase() + id.slice(1), type: 'select', currentValue: current, options: values.map(value => ({ value, name: value })) })
const options = [select('model', 'opus', ['opus', 'sonnet']), select('mode', 'default', ['default', 'bypass']), select('effort', 'low', ['low', 'high']), { id: 'fast', name: 'Fast', type: 'boolean', currentValue: false }]
const artifact = join(process.cwd(), '../.superpowers/sdd/ui-r4/screenshots')
async function setup(page: Page, collector: Collector) {
  await page.goto(collector.setupLink)
  await page.getByLabel(/^Password at least/).fill(PASSWORD)
  await page.getByLabel('Password again', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Set up', exact: true }).click()
  await page.getByRole('button', { name: 'Skip', exact: true }).click()
  await expect(page).toHaveURL(`${collector.origin}/sessions`)
}
async function pair(request: APIRequestContext, collector: Collector, host: TestHost, name: string) {
  const code = await (await request.post(`${collector.origin}/api/hosts/pairing-codes`, { headers: { origin: collector.origin } })).json()
  expect(await host.join(`hennery host join ${collector.origin} ${code.code}`, ['--name', name, '--no-runtime'])).toBe(0)
  const configPath = join(defaultHostDir(host.dir), 'host.toml')
  const config = readFileSync(configPath, 'utf8')
  writeFileSync(configPath, `workspace_roots = [${JSON.stringify(realpathSync(host.dir))}]\n${config}`)
  host.run()
  let id = ''
  await expect(async () => {
    const hosts = await (await request.get(`${collector.origin}/api/hosts`)).json()
    const found = hosts.find((h: { name: string; connected: boolean }) => h.name === name && h.connected)
    expect(found).toBeTruthy()
    id = found.host_id
  }).toPass({ timeout: 30_000 })
  return id
}
async function capture(page: Page, name: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (process.env.UI_R4_SCREENSHOTS !== '1') return
  mkdirSync(artifact, { recursive: true })
  await page.evaluate(async () => { await document.fonts.ready })
  await page.screenshot({ path: join(artifact, `${name}.png`), fullPage: true, animations: 'disabled' })
}
for (const width of [390, 1280]) for (const appearance of ['light', 'dark'] as const) {
  test(`defaults and reviewed Sonnet launch at ${width}px ${appearance}`, async ({ browser }) => {
    test.setTimeout(120_000)
    const collector = await startCollector(), scratch = mkdtempSync(join(tmpdir(), 'hennery-r4-log-'))
    const log = join(scratch, 'config.log')
    const host = testHost(fakeAgent('claude', { config_options: options, model_switch_drops_option: 'fast', config_log: log, chunks: ['Ready to work.'] }))
    const second = testHost(fakeAgent('claude', { config_options: [select('model', 'other', ['other']), select('mode', 'default', ['default']), select('effort', 'low', ['low'])], chunks: ['Other host.'] }))
    const context = await browser.newContext({ baseURL: collector.origin, viewport: { width, height: width < 768 ? 844 : 900 }, reducedMotion: 'reduce', colorScheme: appearance })
    const page = await context.newPage()
    const starts: object[] = [], prompts: string[] = [], wire: string[] = []
    let releaseStart = () => {}
    page.on('request', request => { wire.push(`${request.method()} ${new URL(request.url()).pathname}${new URL(request.url()).search}`); if (request.method() === 'POST' && request.url().endsWith('/api/sessions')) starts.push(request.postDataJSON()); if (/\/prompt$/.test(request.url()) && request.method() === 'POST') prompts.push(request.url()) })
    try {
      await setup(page, collector)
      const hostId = await pair(context.request, collector, host, 'Catalog host')
      const secondId = await pair(context.request, collector, second, 'Other catalog host')
      const project = join(realpathSync(host.dir), 'synthetic-project'), secondProject = join(realpathSync(second.dir), 'synthetic-project')
      mkdirSync(project); mkdirSync(secondProject)
      const hats = await (await context.request.get('/api/hats')).json(), hat = hats[0]
      const probe = await context.request.get(`/api/hosts/${hostId}/runtime-catalog?${new URLSearchParams({ agent: 'claude', cwd: project })}`)
      expect(await probe.json()).toMatchObject({ freshness: 'fresh' })
      const policyProbe = await context.request.get(`/api/hats/${hat.id}/delegation-policy`)
      expect(policyProbe.ok()).toBe(true)
      const defaultsProbe = await context.request.get(`/api/hats/${hat.id}/session-defaults?agent=claude`)
      expect(defaultsProbe.ok()).toBe(true)
      await page.goto(`/defaults?${new URLSearchParams({ host: hostId, cwd: project, agent: 'claude', hat: hat.id })}`)
      await expect(page.getByRole('status').filter({ hasText: /^Preview: Catalog host/ })).toContainText(project)
      await expect(page.getByRole('group', { name: `Model for ${hat.name}`, exact: true }).getByRole('combobox')).toBeEnabled()
      await capture(page, `defaults-context-${width}-${appearance}`)
      await page.getByText('Advanced editor', { exact: true }).click()
      const editor = page.getByRole('region', { name: `Defaults for ${hat.name}`, exact: true })
      await expect(editor.getByLabel('Model', { exact: true })).toBeEnabled()
      await editor.getByLabel('Model', { exact: true }).selectOption('sonnet')
      await editor.getByLabel('Effort', { exact: true }).selectOption('high')
      if (width < 768) await editor.scrollIntoViewIfNeeded()
      await capture(page, `defaults-${width}-${appearance}`)
      await editor.getByRole('button', { name: 'Save defaults', exact: true }).click()
      await capture(page, `defaults-confirm-${width}-${appearance}`)
      await page.getByRole('button', { name: 'Confirm save', exact: true }).click()
      await expect(editor.getByRole('status')).toHaveText('Defaults saved.')
      await page.reload()
      await expect(page.getByRole('group', { name: `Model for ${hat.name}`, exact: true }).getByRole('combobox')).toBeEnabled()
      await page.getByText('Advanced editor', { exact: true }).click()
      await expect(editor.getByRole('button', { name: 'Reset Model to inherited', exact: true })).toBeVisible()
      await page.goto(`/new?${new URLSearchParams({ host: secondId, cwd: secondProject })}`)
      await expect(page.getByRole('status').filter({ hasText: /^Saved Model/ })).toHaveText('Saved Model “sonnet” is unavailable on this host; using other.')
      await expect(page.getByRole('status').filter({ hasText: /^Saved Effort/ })).toHaveText('Saved Effort “high” is unavailable on this host; using low.')
      const unavailableCatalog = /\/api\/hosts\/[^/]+\/runtime-catalog\?/
      await page.route(unavailableCatalog, route => route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ code: 'catalog_unavailable', message: 'The settings preview is unavailable.' }) }))
      await page.goto(`/new?${new URLSearchParams({ host: hostId, cwd: project })}`)
      const form = page.getByRole('form', { name: 'New session', exact: true })
      const optOut = form.getByRole('checkbox', { name: 'Use agent defaults for this start', exact: true })
      await optOut.check({ timeout: 3_000 })
      await expect(optOut).toBeChecked()
      await capture(page, `launcher-unavailable-${width}-${appearance}`)
      await page.unroute(unavailableCatalog)
      await page.reload()
      await form.getByRole('textbox', { name: /^First prompt/ }).fill('Prepare synthetic notes.')
      await expect(form.getByRole('button', { name: 'Start session', exact: true })).toBeEnabled()
      await capture(page, `launcher-${width}-${appearance}`)
      if (width < 768) await form.getByRole('button', { name: 'Change', exact: true }).click()
      await capture(page, `launcher-config-${width}-${appearance}`)
      await form.getByRole('link', { name: 'Edit defaults', exact: true }).click()
      await page.getByRole('link', { name: 'Back to new session', exact: true }).click()
      await expect(form.getByRole('textbox', { name: /^First prompt/ })).toHaveValue('Prepare synthetic notes.')
      await expect(form.getByRole('button', { name: 'Start session', exact: true })).toBeEnabled()
      const heldStart = new Promise<void>(resolve => { releaseStart = resolve })
      await page.route('**/api/sessions', async route => { if (route.request().method() === 'POST') await heldStart; await route.continue() })
      await form.getByRole('button', { name: 'Start session', exact: true }).click()
      const close = page.getByRole('button', { name: 'Close new session', exact: true })
      await expect(page.getByRole('dialog', { name: 'New session', exact: true })).toBeFocused()
      await expect(form.locator('.launch-fields')).toHaveAttribute('inert', '')
      await page.keyboard.press('Tab'); await expect(close).toBeFocused()
      await page.keyboard.press('Shift+Tab'); await expect(close).toBeFocused()
      await capture(page, `launcher-starting-${width}-${appearance}`)
      releaseStart()
      await expect(page).toHaveURL(/\/sessions\/[^/?]+$/, { timeout: 45_000 })
      await expect(page.locator('.bubble.user')).toHaveText('Prepare synthetic notes.')
      expect(starts.at(-1)).toEqual({ host_id: hostId, agent: 'claude', cwd: project, model: 'sonnet', mode: 'default', axes: { effort: 'high' } })
      expect(prompts).toHaveLength(1)
      const firstPrompt = wire.findIndex(path => path.startsWith('POST ') && path.endsWith('/prompt'))
      expect(wire.slice(0, firstPrompt).some(path => /^GET \/api\/sessions\/[^/]+\/catalog$/.test(path))).toBe(true)
      expect(wire.slice(0, firstPrompt).some(path => /^GET \/api\/view\/sessions\/[^?]+\?limit=1$/.test(path))).toBe(true)
      expect(readFileSync(log, 'utf8')).toBe('model=sonnet\neffort=high\n')
      expect(readFileSync(log, 'utf8')).not.toContain('fast=')
      // A deliberate false override is retained. Sonnet removes the axis,
      // so the real adapter refusal must hold the first prompt as a draft.
      const saved = await (await context.request.get(`/api/hats/${hat.id}/session-defaults?agent=claude`)).json()
      expect((await context.request.put(`/api/hats/${hat.id}/session-defaults?agent=claude`, { headers: { origin: collector.origin }, data: { revision: saved.revision, config: { model: 'sonnet', axes: { fast: false } } } })).ok()).toBe(true)
      await page.goto(`/new?${new URLSearchParams({ host: hostId, cwd: project })}`)
      const projectField = form.getByRole('combobox', { name: /^Project/ })
      await projectField.fill('synthetic-project')
      const recent = form.getByRole('listbox').getByRole('option', { name: /^synthetic-project\b/ })
      await expect(recent.locator('time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}T/)
      await recent.scrollIntoViewIfNeeded()
      await capture(page, `launcher-recents-${width}-${appearance}`)
      await recent.click()
      await form.getByRole('textbox', { name: /^First prompt/ }).fill('Retain this draft.')
      await expect(form.getByRole('button', { name: 'Start session', exact: true })).toBeEnabled()
      await form.getByRole('button', { name: 'Start session', exact: true }).click()
      await expect(page).toHaveURL(/\/sessions\/[^/?]+$/, { timeout: 45_000 })
      expect(starts.at(-1)).toMatchObject({ model: 'sonnet', axes: { fast: false } })
      expect(prompts).toHaveLength(1)
      await expect(page.getByText('The requested session settings could not be confirmed. Requested: Fast: Off · Model: sonnet · Permission: default. Review the settings before sending the first prompt. It waits as this session’s draft.', { exact: true })).toBeVisible()
      await capture(page, `launcher-review-${width}-${appearance}`)
      await expect(page.getByRole('textbox', { name: 'Prompt', exact: true })).toHaveValue('Retain this draft.')
      const sessionId = new URL(page.url()).pathname.split('/').at(-1)!
      expect(await page.evaluate(id => sessionStorage.getItem(`hennery.draft.${id}`), sessionId)).toBe('Retain this draft.')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      // Reset remains explicit and persistent.
      const current = await (await context.request.get(`/api/hats/${hat.id}/session-defaults?agent=claude`)).json()
      expect((await context.request.put(`/api/hats/${hat.id}/session-defaults?agent=claude`, { headers: { origin: collector.origin }, data: { revision: current.revision, config: {} } })).ok()).toBe(true)
      expect((await (await context.request.get(`/api/hats/${hat.id}/session-defaults?agent=claude`)).json()).config).toEqual({})
    } finally { releaseStart(); await context.close(); await host.stop(); await second.stop(); await collector.stop() }
  })
}
