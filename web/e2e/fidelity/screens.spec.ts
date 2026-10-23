// Opt-in comparison with a locally supplied design bundle. No prototype ships.
// HENNERY_PROTOTYPE_DIR=/absolute/path/to/project HENNERY_FIDELITY_SCREEN=overview
// nix develop -c pnpm --dir web exec playwright test e2e/fidelity/screens.spec.ts
import { expect, test, type BrowserContext } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { startCollector } from '../collector'
import type { HostItem } from '../../src/generated/protocol'
import type { SessionSummary } from '../../src/generated/view'

const prototype = process.env.HENNERY_PROTOTYPE_DIR
const screen = process.env.HENNERY_FIDELITY_SCREEN ?? 'overview'
const output = resolve('../.superpowers/fidelity')
const ts = '2026-10-20T10:00:00Z'
const firstPrompts: Record<string, string> = { permission: 'Check parser permission handling', question: 'Choose a provider fallback', running: 'Regenerate the service protocol', idle: 'Update project documentation' }
const hats = [ { id: 'work', name: 'Studio', colour: '#a78bfa', default_for_new_hosts: true, created_at: ts }, { id: 'personal', name: 'Personal', colour: '#4dbbb2', default_for_new_hosts: false, created_at: ts } ]
const hosts: HostItem[] = [{ host_id: 'dev', name: 'Development', platform: 'linux', host_version: '0.1.4', capabilities: ['projects', 'resolve_path', 'mcp_servers'], default_hat_id: 'work', workspace_roots: ['/srv'], connected: true, created_at: ts, last_seen_at: ts, mcp_delivery: { claude: 'isolated', codex: 'default_hat_only' } }]
const base: Omit<SessionSummary, 'session_id'> = { host_id: 'dev', hat_id: 'work', agent: 'claude', cwd: '/srv/project', lifecycle: 'active', activity: 'idle', presumed_parked: false, question_waits: false, operator_attention: 0, parent_handled_questions: 0, created_at: ts, last_event_at: ts }
const rows = [
 { ...base, session_id: 'permission', title: 'Port parser tests', activity: 'blocked', operator_attention: 1, question_waits: true, model: 'Sonnet', family: { revision: 1, parent: { session_id: 'running', title: 'Regenerate protocol', agent: 'codex' }, children: [], child_counts: { total: 0, active: 0, waiting: 0 }, attention: 0 } },
 { ...base, session_id: 'question', title: 'Choose provider fallback', agent: 'codex', activity: 'blocked', operator_attention: 1, question_waits: true },
 { ...base, session_id: 'running', title: 'Regenerate protocol', activity: 'running', agent: 'codex', git_branch: 'protocol', family: { revision: 1, children: [{ session_id: 'permission', title: 'Port parser tests', agent: 'claude' }], child_counts: { total: 1, active: 1, waiting: 1 }, attention: 0 } },
 { ...base, session_id: 'idle', title: 'Update project documentation', hat_id: 'personal' },
].map((row: SessionSummary): SessionSummary => screen === 'busy-turn' && row.session_id === 'permission' ? { ...row, activity: 'idle' } : row).map((row): SessionSummary => screen.startsWith('provisional') ? { ...row, title: firstPrompts[row.session_id], title_source: 'prompt', family: row.family ? { ...row.family, parent: row.family.parent ? { ...row.family.parent, title: firstPrompts[row.family.parent.session_id], title_source: 'prompt' } : undefined, children: row.family.children.map(child => ({ ...child, title: firstPrompts[child.session_id], title_source: 'prompt' })) } : undefined } : row)
const question = { id: 'question:permission', version: 1, ts, kind: 'question', pending_id: 'permission', question_kind: 'permission', request: { type: 'permission', title: 'Run pnpm test for the parser', options: [{ option_id: 'once', name: 'Allow once', option_kind: 'allow_once' }, { option_id: 'always', name: 'Always', option_kind: 'allow_always' }, { option_id: 'reject', name: 'Reject', option_kind: 'reject_once' }] }, answerable: true, answered: false, state: 'open' }
const elicitation = { ...question, id: 'question:question', pending_id: 'question', question_kind: 'elicitation', request: { type: 'elicitation', message: 'Which provider should the service fall back to first?', form_supported: true, fields: [{ key: 'provider', field_kind: 'single', label: 'Provider', options: [{ value: 'azure', label: 'Azure first' }, { value: 'google', label: 'Google first' }] }], required: ['provider'] } }
const select = (id: string, name: string, values: string[]) => ({ id, name, category: id === 'effort' ? 'thought_level' : id, type: 'select', currentValue: values[0], options: values.map(value => ({ value, name: value })) })
async function fixtures(context: BrowserContext) {
 const held: (() => Promise<void>)[] = []
 await context.route('**/api/**', async route => {
  const url = new URL(route.request().url()), path = url.pathname
  const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  if (path.startsWith('/api/stream/')) { held.push(() => route.abort().catch(() => {})); return }
  if (path === '/api/capabilities') return json({ mode: 'full', features: ['session_defaults', 'mcp_connections', 'mcp_stdio', ...(screen === 'settings' ? ['web_push'] : [])] })
  if (path === '/api/hats') return json(hats)
  if (path === '/api/hosts') return json(hosts)
  if (path === '/api/hosts/pairing-codes') return json({ code: 'TEST-1234', expires_at: '2026-10-20T10:15:00Z' })
  if (path === '/api/view/sessions') return json({ sessions: rows, epoch: 'fixture', revision: 1, waiting: 2 })
  if (/\/questions\//.test(path)) return json(path.endsWith('question') ? elicitation : question)
  if (path.endsWith('/answer')) { expect(route.request().method()).toBe('POST'); return json({ status: 'queued' }, 202) }
  if (path.endsWith('/prompt') && screen === 'busy-turn') return json({ code: 'conflict', message: 'wait for the current turn to end' }, 409)
  if (path.endsWith('/events')) return json([{ event_id: 1, session_id: path.split('/')[3], kind: 'user_turn', body: { content: [{ type: 'text', text: `${firstPrompts[path.split('/')[3]] ?? 'Inspect project work'}\nKeep later details out of the name` }] }, ts }])
  if (/^\/api\/sessions\/[^/]+$/.test(path)) { const row = rows.find(r => path.endsWith(r.session_id)) ?? rows[0]; return json({ ...row, pending: ['permission', 'question'].includes(row.session_id) ? [{ pending_id: row.session_id, kind: row.session_id === 'question' ? 'elicitation' : 'permission', state: 'open', answered: false }] : [] }) }
  if (/^\/api\/view\/sessions\/[^/]+$/.test(path)) return json({ items: [{ id: 'prompt', version: 1, ts, kind: 'user_turn', content: [{ type: 'text', text: 'Check the parser fixtures and report the results.' }] }, { id: 'message', version: 2, ts, kind: 'message', text: 'Converted all parser tests. Running the suite next to check the fixtures.\n\n| Check | Result |\n| --- | --- |\n| Parser fixtures | Passed |\n\n```ts\nconst result = parse(input)\n```' }, { id: 'tool', version: 3, ts, kind: 'tool_call', tool_call_id: 'test', title: 'Run checks', status: 'completed', input: { command: 'pnpm test parser' }, output: 'All parser checks passed.' }, { id: 'plan', version: 4, ts, kind: 'plan', entries: [{ content: 'Find existing tests', status: 'completed' }, { content: 'Convert parser fixtures', status: 'completed' }, { content: 'Run the parser suite', status: 'in_progress' }, { content: 'Report the results', status: 'pending' }] }, ...(path.endsWith('running') ? [] : [path.endsWith('question') ? elicitation : question])], older: false, epoch: 'items', revision: 4 })
  if (path.endsWith('/catalog')) return json({ session_id: 'permission', config_options: [select('model', 'Model', ['Sonnet', 'Opus']), select('mode', 'Mode', ['Default', 'Bypass permissions']), select('effort', 'Effort', ['Medium', 'High'])], commands: [] })
  if (path.endsWith('/family')) { const row = rows.find(r => path.split('/').at(-2) === r.session_id) ?? rows[0]; return json({ summary: row, routing: row.session_id === 'permission' ? 'active' : undefined, children: row.session_id === 'running' ? [{ summary: rows[0], routing: 'active', operations: [], questions: [{ pending_id: 'permission', kind: 'permission', handling: 'operator_required' }] }] : [], questions: [] }) }
  if (path.endsWith('/projects')) return json({ home: '/srv', recents_hat_id: 'work', recents: [{ path: '/srv/project', last_used_at: ts }], items: [{ path: '/srv/project' }], partial: false })
  if (path.endsWith('/browse')) return json({ path: '/srv', entries: [{ name: 'project' }, { name: 'project-archive' }], truncated: false })
  if (path === '/api/hats/resolve') return json({ hat_id: 'work', canonical: '/srv/project', exists: true, is_dir: true, matched_rule: null })
  if (path.endsWith('/path-rules')) return json([{ prefix: '/srv/project', hat_id: 'work', verified: true }, { prefix: '/srv/personal', hat_id: 'personal', verified: true }])
  if (path.endsWith('/runtime-catalog')) return json({ agent: url.searchParams.get('agent'), adapter_revision: 'fixture', freshness: 'fresh', config_options: [select('model', 'Model', ['Sonnet', 'Opus']), select('mode', 'Permission mode', ['Default', 'Accept edits', 'Bypass permissions']), select('effort', 'Reasoning effort', ['Medium', 'High'])], defaults: { model: 'Sonnet', mode: 'Default', axes: { effort: 'Medium' } }, security: { known: true, axes: { mode: ['Default'] } } })
  if (path.endsWith('/session-defaults')) return json({ hat_id: path.split('/')[3], agent: url.searchParams.get('agent'), revision: 0, config: {} })
  if (path.endsWith('/session-tools')) return json({ delegation_enabled: false, revision: 0 })
  if (path === '/api/settings') return json({ public_url: 'https://collector.example.test' })
  if (path === '/api/settings/attachments') return json({ count: 2, bytes: 4096 })
  if (path === '/api/settings/host-removals') return json([])
  if (path === '/api/auth/passkeys') return json([{ id: 'desktop-key', label: 'Desktop passkey', created_at: ts, last_used_at: ts }, { id: 'phone-key', label: 'Phone passkey', created_at: ts }])
  if (path === '/api/push/vapid') return json({ public_key: Buffer.from([4, ...Array(64).fill(1)]).toString('base64url') })
  if (path === '/api/push/subscriptions') return json([])
  if (path === '/api/push/policies') return json(hats.map(hat => ({ hat_id: hat.id, muted: false, details: false, generic_title: true })))
  if (path.endsWith('/agents')) return json([{ agent: 'claude', available: true }, { agent: 'codex', available: true }])
  if (path === '/api/mcp/connections') return json([{ id: 'docs', label: 'Project docs', slug: 'docs', url: 'https://docs.example.test/mcp', cred_kind: 'none', static_header: 'Authorization', static_prefix: 'Bearer ', tool_allowlist: null, internal_network: false, hat_id: 'work', created_at: ts, updated_at: ts, status_at: ts, status: 'ok', has_credential: false, mounts: ['dev'] }])
  if (path === '/api/mcp/stdio-servers') return json({ host_id: 'dev', hat_id: 'work', servers: [{ name: 'browser', command: 'browser-mcp', args: ['--headless'], env: [] }, { name: 'database', command: 'database-mcp', args: [], env: [{ name: 'DATABASE_URL', has_value: true }] }] })
  if (path.endsWith('/notification-policy')) return json({})
  if (path.endsWith('/passkeys') || path.endsWith('/sessions') || path.endsWith('/path-rules') || path.endsWith('/mounts') || path.endsWith('/recent-projects') || path === '/api/delegation/attention') return json([])
  return json({ code: 'not_found', message: 'Unavailable in synthetic fixture' }, 404)
 })
 return async () => { for (const release of held) await release() }
}
for (const width of [1280, 390]) for (const theme of ['dark', 'light'] as const) test(`fidelity ${screen} ${width} ${theme}`, async ({ browser }) => {
 test.skip(!prototype, 'Supply a local prototype bundle to render comparisons')
 const collector = await startCollector()
 const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: theme, reducedMotion: 'reduce' })
 const release = await fixtures(context)
 try {
  const app = await context.newPage(), reference = await context.newPage()
  await app.clock.setFixedTime(new Date('2026-10-20T10:05:00Z'))
  const route = screen === 'overview' || screen === 'provisional-overview' ? '/sessions' : ['session', 'busy-turn', 'provisional-session'].includes(screen) ? '/sessions/permission?pending=permission' : screen === 'running-family' ? '/sessions/running' : screen === 'elicitation' ? '/sessions/question?pending=question' : ['new-session', 'autocomplete'].includes(screen) ? '/new' : screen === 'palette' || screen === 'provisional-palette' ? '/sessions' : '/' + screen
  await app.goto(collector.origin + route)
  await expect(app.locator('main')).toBeVisible()
  if (screen.startsWith('provisional')) await expect(app.locator('.session-name-provisional').filter({ hasText: screen !== 'provisional-session' && width === 390 ? firstPrompts.running : firstPrompts.permission }).first()).toBeVisible()
  if (screen === 'new-session' || screen === 'autocomplete') {
   const dialog = app.getByRole('dialog', { name: 'New session', exact: true })
   await dialog.getByRole('textbox', { name: /^First prompt/ }).fill('Check why the latency panel has gaps after midnight')
   if (screen === 'autocomplete') {
    await dialog.getByRole('combobox', { name: /^Project/ }).fill('/srv/project')
    await expect(dialog.getByRole('option', { name: 'project-archive', exact: true })).toBeVisible()
   } else await dialog.getByRole('option', { name: /project/ }).click()
   await expect(dialog.getByRole('region', { name: 'Session settings', exact: true })).toBeVisible()
   await expect(dialog.getByRole('button', { name: 'Session settings', exact: true })).toHaveText('Settings: Sonnet · Default · Medium⌄')
   await expect(dialog.getByRole('button', { name: 'Session settings', exact: true })).toHaveAttribute('aria-expanded', 'false')
   const edit = await dialog.getByRole('link', { name: 'Edit defaults', exact: true }).boundingBox()
   const start = await dialog.getByRole('button', { name: 'Start session', exact: true }).boundingBox()
   expect(edit && start && Math.abs(edit.y + edit.height / 2 - start.y - start.height / 2) < 2 && edit.x < start.x).toBe(true)
  }
  if (screen === 'defaults') await expect(app.getByRole('group', { name: 'Model for Studio', exact: true }).getByRole('combobox')).toBeEnabled()
  if (screen === 'hosts') {
   await app.getByRole('button', { name: 'Add host', exact: true }).click()
   await expect(app.getByRole('heading', { name: 'Pairing code', exact: true })).toBeVisible()
  }
  if ((screen === 'overview' && width === 1280) || screen === 'needs-you') await expect(app.getByText('Run pnpm test for the parser', { exact: true })).toBeVisible()
  if (screen === 'needs-you') {
   const actions = app.getByRole('article', { name: 'Port parser tests', exact: true })
   const allow = await actions.getByRole('button', { name: 'Allow once', exact: true }).boundingBox()
   const reject = await actions.getByRole('button', { name: 'Reject', exact: true }).boundingBox()
   expect(allow && reject && Math.abs(allow.y - reject.y) < 2 && allow.x < reject.x).toBe(true)
  }
  if (screen === 'session') await expect(app.locator('.transcript').getByText('Run pnpm test for the parser', { exact: true })).toBeVisible()
  if (screen === 'busy-turn') {
   await expect(app.locator('.transcript').getByText('Run pnpm test for the parser', { exact: true })).toBeVisible()
   if (width === 390) await app.locator('.ask[data-pending-id="permission"]').getByRole('button', { name: 'Write a prompt', exact: true }).click()
   await app.getByRole('textbox', { name: 'Prompt', exact: true }).fill('Keep the next check as a draft')
   await app.locator('.composer').getByRole('button', { name: 'Send', exact: true }).click()
   await expect(app.getByText('The agent is still working or waiting for your answer. Finish the current turn before sending another prompt.', { exact: true })).toBeVisible()
   await expect(app.getByRole('textbox', { name: 'Prompt', exact: true })).toHaveValue('Keep the next check as a draft')
   await app.getByRole('button', { name: 'Go to open request', exact: true }).click()
   await expect(app.locator('.ask[data-pending-id="permission"]')).toBeFocused()
  }
  if (screen === 'elicitation') {
   await expect(app.locator('.transcript').getByText('Which provider should the service fall back to first?', { exact: true })).toBeVisible()
   await app.getByRole('radio', { name: 'Azure first', exact: true }).check()
  }
  if (screen === 'running-family' && width === 390) await app.getByRole('button', { name: 'Session details', exact: true }).click()
  await app.evaluate(() => document.fonts.ready)
  const mobileFrames: Record<string, string> = { overview: '1b · Sessions tab', 'provisional-overview': '1b · Sessions tab', 'needs-you': '1 · Needs you tab', session: '3 · Deep link → permission card', 'provisional-session': '3 · Deep link → permission card', 'busy-turn': '3 · Deep link → permission card', 'running-family': '1c · Running session · family sheet', elicitation: '4 · Answer a question', 'new-session': '5 · New session sheet', autocomplete: '5 · New session sheet' }
  const mobile = width === 390 && mobileFrames[screen]
  await reference.goto(pathToFileURL(join(prototype!, mobile ? 'Hennery Mobile.dc.html' : 'Hennery Desktop.dc.html')).href)
  await reference.evaluate(({ theme, mobile }) => { (window as unknown as { __dcSetProps: (name: string, props: object) => void }).__dcSetProps(mobile ? 'Hennery Mobile' : 'Hennery Desktop', { theme }) }, { theme, mobile: !!mobile })
  await expect(reference.locator('.tw-dark')).toHaveCount(theme === 'dark' ? 1 : 0)
  await reference.evaluate(() => document.fonts.ready)
  if (!mobile && !['overview', 'provisional-overview', 'needs-you'].includes(screen)) {
   if (screen === 'session' || screen === 'provisional-session' || screen === 'busy-turn' || screen === 'elicitation' || screen === 'running-family') await reference.getByRole('button', { name: /^Port VAD tests/ }).first().click()
   else if (screen === 'new-session' || screen === 'autocomplete') await reference.getByRole('button', { name: /^New session/ }).first().click()
   else if (screen === 'palette' || screen === 'provisional-palette') { await reference.getByRole('button', { name: /^Jump to/ }).click(); await app.keyboard.press('ControlOrMeta+k') }
   else await reference.getByRole('button', { name: new RegExp('^' + screen[0].toUpperCase() + screen.slice(1), 'i') }).first().click()
  }
  if (!mobile && screen === 'needs-you') await reference.getByRole('button', { name: /^Needs you/ }).first().click()
  if (screen === 'provisional-palette') await expect(app.getByRole('dialog', { name: 'Command palette', exact: true }).locator('.session-name-provisional').filter({ hasText: firstPrompts.permission }).first()).toBeVisible()
  mkdirSync(output, { recursive: true })
  const name = `${screen}-${width}-${theme}`
  if (mobile) {
   const phone = reference.locator('figure').filter({ has: reference.getByText(mobileFrames[screen], { exact: true }) }).locator(':scope > div')
   await phone.screenshot({ path: join(output, `${name}-prototype.png`) })
  } else await reference.screenshot({ path: join(output, `${name}-prototype.png`) })
  await app.screenshot({ path: join(output, `${name}-app.png`) })
  if (screen === 'session') {
   if (width === 390) await app.locator('[data-pending-id="permission"]').getByRole('button', { name: 'Write a prompt', exact: true }).click()
   await app.locator('.transcript').evaluate(el => { el.scrollTop = 0 })
   expect((await app.locator('.composer').boundingBox())!.height).toBeLessThanOrEqual(88)
   await app.screenshot({ path: join(output, `${name}-conversation-app.png`) })
   await app.getByRole('button', { name: 'Session settings', exact: true }).click()
   await expect(app.getByRole('dialog', { name: 'Session settings', exact: true })).toBeVisible()
   await app.screenshot({ path: join(output, `${name}-settings-app.png`) })
   await app.getByRole('button', { name: 'Close session settings', exact: true }).click()
   await app.locator('.session-head').getByRole('button', { name: 'Rename session', exact: true }).click()
   await expect(app.getByRole('textbox', { name: 'Session name', exact: true })).toBeFocused()
   const renameInput = (await app.getByRole('textbox', { name: 'Session name', exact: true }).boundingBox())!
   const renameSave = (await app.getByRole('button', { name: 'Save', exact: true }).boundingBox())!
   expect(renameInput.y).toBeGreaterThanOrEqual(0)
   expect(Math.abs(renameInput.y + renameInput.height / 2 - renameSave.y - renameSave.height / 2)).toBeLessThan(2)
   if (width === 390) expect((await app.getByRole('button', { name: 'Cancel rename', exact: true }).boundingBox())!.width).toBeGreaterThanOrEqual(44)
   expect(await app.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
   await app.screenshot({ path: join(output, `${name}-rename-app.png`) })
   await app.keyboard.press('Escape')
   await expect(app.getByRole('textbox', { name: 'Session name', exact: true })).toHaveCount(0)
  }
  if (screen === 'settings') {
   await app.locator('.delegation-settings').scrollIntoViewIfNeeded()
   await expect(app.getByRole('switch', { name: 'Delegation', exact: true })).toBeVisible()
   await app.screenshot({ path: join(output, `${name}-delegation-app.png`) })
  }
  const fits = await app.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
  if (!fits) console.log(await app.locator('.application-root,.app,.shell,.main,.defaults-screen,.defaults-screen > header,.defaults-matrix-scroll').evaluateAll(elements => elements.map(element => ({ class: element.className, width: element.getBoundingClientRect().width, right: element.getBoundingClientRect().right, scroll: element.scrollWidth }))))
  expect(fits).toBe(true)
  writeFileSync(join(output, `${name}.html`), `<!doctype html><meta charset="utf-8"><title>${name}</title><style>body{margin:0;display:flex;gap:12px;background:#888}figure{margin:0}figcaption{font:16px sans-serif;padding:8px}img{max-width:none}</style><figure><figcaption>Prototype · ${width}px · ${theme}</figcaption><img src="${name}-prototype.png"></figure><figure><figcaption>Application · ${width}px · ${theme}</figcaption><img src="${name}-app.png"></figure>`)
  if (screen === 'overview' && width === 1280) {
   const choice = app.getByRole('article', { name: 'Choose provider fallback', exact: true })
   await expect(choice.getByRole('button', { name: 'Azure first', exact: true })).toHaveCount(0)
   await expect(choice.getByRole('link', { name: 'Open to answer Choose provider fallback', exact: true })).toHaveAttribute('href', '/sessions/question?pending=question')
   const permission = app.getByRole('article', { name: 'Port parser tests', exact: true })
   const post = app.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/pending/permission/answer'))
   await permission.getByRole('button', { name: 'Allow once', exact: true }).click()
   expect((await post).postDataJSON()).toEqual({ option_id: 'once' })
   await expect(permission.getByText('Sent', { exact: true })).toBeVisible()
  }
 } finally { await release(); await context.close(); await collector.stop() }
})
