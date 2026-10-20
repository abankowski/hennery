import { captureManagement } from './management-captures'
import { expect, test, type Page } from '@playwright/test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { startCollector } from './collector'
import { defaultHostDir, FAKE_ACP, testHost } from './host'
import { BIN, spawnHennery, type ChildProcess } from './spawn'
import type { Item } from '../src/generated/view'

const PASSWORD = 'correct horse battery staple'
const MODE = { id: 'mode', name: 'Permissions', category: 'mode', type: 'select', currentValue: 'default', options: [{ value: 'default', name: 'Default' }, { value: 'plan', name: 'Plan' }, { value: 'bypassPermissions', name: 'Bypass permissions' }] }
async function end(child: ChildProcess | undefined) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return
  const gone = new Promise<void>(done => child.once('exit', () => done()))
  child.kill('SIGTERM'); const timer = setTimeout(() => child.kill('SIGKILL'), 5000)
  await gone; clearTimeout(timer)
}
async function fixtureBinary(dir: string) {
  // Cargo supplies exact dependency identities, including Tokio feature sets.
  // Reuse downloaded source caches offline, with fresh compiler configuration.
  const toolchain = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(?:NIX_|SDKROOT$|CC$|CXX$|AR$|PKG_CONFIG_PATH$|PKG_CONFIG_LIBDIR$|OPENSSL_DIR$|LIBCLANG_PATH$|RUSTFLAGS$|CARGO_ENCODED_RUSTFLAGS$)/.test(key)))
  const cargoHome = join(dirname(BIN), '..', 'ui-r5-compiler-home'), cache = process.env.CARGO_HOME ?? join(homedir(), '.cargo')
  mkdirSync(cargoHome, { recursive: true })
  for (const part of ['registry', 'git']) if (existsSync(join(cache, part)) && !existsSync(join(cargoHome, part))) symlinkSync(join(cache, part), join(cargoHome, part), 'dir')
  toolchain.CARGO_HOME = cargoHome
  const binary = join(dirname(BIN), '..', 'hennery-delegation-host')
  const build = spawnHennery([resolve('e2e/build-delegation-host.sh')], dir, toolchain, ['ignore', 'ignore', 'pipe'], '/bin/sh')
  let output = ''; build.stderr?.on('data', chunk => { output += chunk })
  const code = await new Promise<number | null>((done, fail) => { build.once('error', fail); build.once('exit', done) })
  expect(code, output).toBe(0)
  return binary
}
async function confirm(page: Page) {
  const step = page.getByRole('dialog', { name: 'This needs a fresh confirmation', exact: true })
  await expect(step).toBeVisible()
  await step.getByLabel('Your password', { exact: true }).fill(PASSWORD)
  await step.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(step).toBeHidden()
}
let harness: string, compilerScratch: string
test.beforeAll(async () => {
  test.setTimeout(180_000)
  compilerScratch = mkdtempSync(join(tmpdir(), 'hennery-delegation-compiler-'))
  harness = await fixtureBinary(compilerScratch)
})
test.afterAll(() => { if (compilerScratch) rmSync(compilerScratch, { recursive: true, force: true }) })
for (const width of [1280, 390]) test(`Settings authorization drives real delegation at ${width}px`, async ({ browser }) => {
  test.setTimeout(180_000)
  const scratch = mkdtempSync(join(tmpdir(), 'hennery-delegation-ui-'))
  const collector = await startCollector(), host = testHost()
  const context = await browser.newContext({ baseURL: collector.origin, viewport: { width, height: width === 390 ? 844 : 900 } })
  let runner: ChildProcess | undefined
  try {
    const page = await context.newPage(), origin = { Origin: collector.origin }
    expect((await page.request.post('/api/setup', { headers: origin, data: { token: new URL(collector.setupLink).hash.slice(1), password: PASSWORD, public_url: collector.origin } })).status()).toBe(201)
    const minted = await (await page.request.post('/api/hosts/pairing-codes', { headers: origin })).json()
    expect(await host.join(`hennery host join ${collector.origin} ${minted.code}`, ['--name', 'Test workstation', '--no-runtime'])).toBe(0)
    const receipt = join(scratch, 'sessions.jsonl'), project = realpathSync(host.dir)
    runner = spawnHennery([defaultHostDir(host.dir), project, FAKE_ACP, JSON.stringify({ chunks: ['Completed.'], echo_prompt: true, session_log: receipt, config_options: [MODE] })], host.dir, {}, undefined, harness)
    let runnerError = ''
    runner.stderr?.on('data', chunk => { runnerError += chunk })
    runner.on('error', error => { runnerError += error.message })
    let hostId = '', hat = ''
    await expect(async () => {
      const rows = await (await page.request.get('/api/hosts')).json()
      expect(rows[0].connected, runnerError).toBe(true); hostId = rows[0].host_id; hat = rows[0].default_hat_id
    }).toPass({ timeout: 30_000 })
    console.log('Delegation acceptance: host ready')
    await page.goto('/settings')
    const toggle = page.getByLabel('Enable delegation session tools', { exact: true })
    await expect(toggle).not.toBeChecked()
    await captureManagement(page, 'settings', 'Desktop settings; mobile adaptation')
    const policyPath = `/api/hats/${hat}/delegation-policy`, toolsPath = `/api/hats/${hat}/session-tools`
    const empty = await (await page.request.get(policyPath)).json(); expect(empty.allowed).toEqual({})
    // Force the same fresh-confirmation response that an expired session gets.
    let toolsRefused = false
    await page.route(`**${toolsPath}`, async route => {
      if (route.request().method() === 'PATCH' && !toolsRefused) { toolsRefused = true; return route.fulfill({ status: 403, json: { code: 'step_up_required' } }) }
      return route.continue()
    })
    await toggle.click(); await confirm(page); await expect(toggle).toBeChecked()
    await page.unroute(`**${toolsPath}`)
    expect((await (await page.request.get(policyPath)).json()).allowed).toEqual({})
    const started = await page.request.post('/api/sessions', { headers: origin, data: { host_id: hostId, agent: 'claude', cwd: project } })
    expect(started.status()).toBe(202)
    const parent = (await started.json()).session_id
    await expect(async () => expect((await (await page.request.get(`/api/sessions/${parent}`)).json()).lifecycle).toBe('active')).toPass({ timeout: 30_000 })
    const records = () => existsSync(receipt) ? readFileSync(receipt, 'utf8').trim().split('\n').map(line => JSON.parse(line)) : []
    const descriptor = records().find(row => row.method === 'session/new').params.mcpServers.find((server: { name: string }) => server.name === 'hennery')
    expect(!!descriptor).toBe(true)
    const token = descriptor.headers.find((header: { name: string }) => header.name.toLowerCase() === 'authorization').value
    const rpc = async (name: string, args: object, expectedStatus = 200) => {
      const response = await page.request.post('/mcp/builtin/hennery', { headers: { Authorization: token, Accept: 'application/json' }, data: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } } })
      expect(response.status()).toBe(expectedStatus)
      const body = await response.json()
      return body.result?.structuredContent ?? body
    }
    const spawnChild = (key: string, mode: string, agent = 'claude', expectedStatus = 200) => rpc('session_spawn', { operation_key: key, cwd: project, agent, brief: `Reviewed brief ${key}`, config: { mode } }, expectedStatus)
    console.log('Delegation acceptance: tools enabled')
    const baseline = await spawnChild('baseline', 'default')
    expect(typeof baseline.child_id).toBe('string')
    const waitChild = async (id: string, mode: string, key: string) => {
      await expect(async () => {
        const detail = await (await page.request.get(`/api/sessions/${id}`)).json()
        expect(detail.lifecycle).toBe('active')
        const view = await (await page.request.get(`/api/view/sessions/${id}`)).json()
        expect(JSON.stringify(view.items)).toContain(`Reviewed brief ${key}`)
        // The fake echoes only bytes it actually received. A saved user turn
        // alone does not prove that the brief reached the adapter.
        expect((view.items as Item[]).some(item => item.kind === 'message' && item.text.includes(`Reviewed brief ${key}`))).toBe(true)
        const actual = await (await page.request.get(`/api/sessions/${id}/catalog`)).json()
        expect(actual.config_options.find((option: { id: string }) => option.id === 'mode').currentValue).toBe(mode)
      }).toPass({ timeout: 30_000 })
    }
    await waitChild(baseline.child_id, 'default', 'baseline')
    console.log('Delegation acceptance: baseline child confirmed')
    const before = records().length
    const refused = await spawnChild('permissive', 'bypassPermissions')
    expect(refused.code).toBe('operator_required')
    expect(records().length).toBe(before)
    const sessionsBefore = (await (await page.request.get('/api/view/sessions')).json()).sessions.map((session: { session_id: string }) => session.session_id).sort()
    console.log('Delegation acceptance: permissive child refused')
    const unknown = await spawnChild('unknown', 'default', 'custom')
    expect(unknown.code).toBe('operator_required')
    // A previously unprobed runtime starts an empty catalog probe, never
    // the requested child or its brief. Assert the actual session boundary.
    console.log('Delegation acceptance: unknown profile refused')
    const sessionsAfter = (await (await page.request.get('/api/view/sessions')).json()).sessions.map((session: { session_id: string }) => session.session_id).sort()
    expect(sessionsAfter).toEqual(sessionsBefore)
    // The only grant is deliberately selected from the real runtime catalog.
    await page.getByLabel('Grant host', { exact: true }).selectOption(hostId)
    await expect(page.getByLabel('Grant agent', { exact: true })).toBeEnabled()
    await page.getByLabel('Grant agent', { exact: true }).fill('custom')
    await page.getByLabel('Grant project path', { exact: true }).fill(project)
    await page.getByRole('button', { name: 'Load grant choices', exact: true }).click()
    const unknownAxis = page.getByRole('group', { name: 'Permissions', exact: true })
    await expect(unknownAxis.getByLabel('Use as policy setting Permissions', { exact: true })).not.toBeChecked()
    await expect(unknownAxis.getByLabel('Default', { exact: true })).toBeDisabled()
    expect((await (await page.request.get(policyPath)).json()).allowed).toEqual({})
    await captureManagement(page, 'settings-unknown-profile', 'Desktop settings / explicit unknown profile; no prototype frame')
    await page.getByLabel('Grant agent', { exact: true }).fill('claude')
    await page.getByRole('button', { name: 'Load grant choices', exact: true }).click()
    const axis = page.getByRole('group', { name: 'Permissions', exact: true })
    await axis.getByLabel('Override Permissions', { exact: true }).check()
    await axis.getByLabel('Bypass permissions', { exact: true }).check()
    await captureManagement(page, 'settings-grants', 'Desktop settings / delegation extension')
    await page.getByRole('button', { name: 'Review execution grants', exact: true }).click()
    const review = page.getByRole('dialog', { name: 'Save execution grants?', exact: true })
    await captureManagement(page, 'settings-grant-review', 'Design System confirmation; no prototype frame')
    let grantRefused = false
    await page.route(`**${policyPath}`, async route => {
      if (route.request().method() === 'PATCH' && !grantRefused) { grantRefused = true; return route.fulfill({ status: 403, json: { code: 'step_up_required' } }) }
      return route.continue()
    })
    await review.getByRole('button', { name: 'Save execution grants', exact: true }).click()
    await confirm(page); await expect(review).toBeHidden(); await page.unroute(`**${policyPath}`)
    expect((await (await page.request.get(policyPath)).json()).allowed).toEqual({ claude: { mode: ['default', 'plan', 'bypassPermissions'] } })
    console.log('Delegation acceptance: explicit grant saved')
    const retried = await spawnChild('permissive-retry', 'bypassPermissions')
    expect(typeof retried.child_id).toBe('string')
    await waitChild(retried.child_id, 'bypassPermissions', 'permissive-retry')
    console.log('Delegation acceptance: granted child confirmed')
    await toggle.click(); await expect(toggle).not.toBeChecked()
    const afterDisable = await spawnChild('disabled', 'default', 'claude', 404)
    expect(afterDisable.code).toBe('not_found')
    expect((await (await page.request.get(`/api/sessions/${retried.child_id}`)).json()).lifecycle).toBe('active')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  } catch (error) {
    console.error('Delegation acceptance failed before cleanup:', error)
    throw error
  } finally { await end(runner); await host.stop(); await collector.stop(); await context.close(); rmSync(scratch, { recursive: true, force: true }) }
})
