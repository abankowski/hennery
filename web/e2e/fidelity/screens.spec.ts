// Opt-in comparison with a locally supplied design bundle. No prototype ships.
// HENNERY_PROTOTYPE_DIR=/absolute/path/to/project HENNERY_FIDELITY_SCREEN=overview
// nix develop -c pnpm --dir web exec playwright test e2e/fidelity/screens.spec.ts
import { expect, test, type BrowserContext } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { startCollector } from '../collector'

const prototype = process.env.HENNERY_PROTOTYPE_DIR
const screen = process.env.HENNERY_FIDELITY_SCREEN ?? 'overview'
const output = resolve('../.superpowers/fidelity')
const ts = '2026-10-20T10:00:00Z'
const hats = [ { id: 'work', name: 'Studio', colour: '#a78bfa', default_for_new_hosts: true, created_at: ts }, { id: 'personal', name: 'Personal', colour: '#4dbbb2', default_for_new_hosts: false, created_at: ts } ]
const hosts = [{ host_id: 'dev', name: 'Development', platform: 'linux', host_version: '0.1.4', capabilities: ['projects', 'resolve_path'], default_hat_id: 'work', workspace_roots: ['/srv'], connected: true, created_at: ts, last_seen_at: ts, mcp_delivery: { claude: 'native', codex: 'native' } }]
const base = { host_id: 'dev', hat_id: 'work', agent: 'claude', cwd: '/srv/project', lifecycle: 'active', activity: 'idle', presumed_parked: false, question_waits: false, operator_attention: 0, parent_handled_questions: 0, created_at: ts, last_event_at: ts }
const rows = [
 { ...base, session_id: 'permission', title: 'Port parser tests', activity: 'blocked', operator_attention: 1, question_waits: true, model: 'Sonnet' },
 { ...base, session_id: 'question', title: 'Choose provider fallback', agent: 'codex', activity: 'blocked', operator_attention: 1, question_waits: true },
 { ...base, session_id: 'running', title: 'Regenerate protocol', activity: 'running', agent: 'codex', git_branch: 'protocol' },
 { ...base, session_id: 'idle', title: 'Update project documentation', hat_id: 'personal' },
]
const question = { id: 'question:permission', version: 1, ts, kind: 'question', pending_id: 'permission', question_kind: 'permission', request: { type: 'permission', title: 'Run pnpm test for the parser', options: [{ option_id: 'once', name: 'Allow once', option_kind: 'allow_once' }, { option_id: 'always', name: 'Always', option_kind: 'allow_always' }, { option_id: 'reject', name: 'Reject', option_kind: 'reject_once' }] }, answerable: true, answered: false, state: 'open' }
const elicitation = { ...question, id: 'question:question', pending_id: 'question', question_kind: 'elicitation', request: { type: 'elicitation', message: 'Which provider should the service fall back to first?', form_supported: true, fields: [{ key: 'provider', field_kind: 'single', label: 'Provider', options: [{ value: 'azure', label: 'Azure first' }, { value: 'google', label: 'Google first' }] }], required: ['provider'] } }
const select = (id: string, name: string, values: string[]) => ({ id, name, category: id === 'effort' ? 'thought_level' : id, type: 'select', currentValue: values[0], options: values.map(value => ({ value, name: value })) })
async function fixtures(context: BrowserContext) {
 const held: (() => Promise<void>)[] = []
 await context.route('**/api/**', async route => {
  const url = new URL(route.request().url()), path = url.pathname
  const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  if (path.startsWith('/api/stream/')) { held.push(() => route.abort().catch(() => {})); return }
  if (path === '/api/capabilities') return json({ mode: 'full', features: ['session_defaults', 'mcp_connections', 'mcp_stdio'] })
  if (path === '/api/hats') return json(hats)
  if (path === '/api/hosts') return json(hosts)
  if (path === '/api/view/sessions') return json({ sessions: rows, epoch: 'fixture', revision: 1, waiting: 2 })
  if (/\/questions\//.test(path)) return json(path.endsWith('question') ? elicitation : question)
  if (path.endsWith('/answer')) { expect(route.request().method()).toBe('POST'); return json({ status: 'queued' }, 202) }
  if (/^\/api\/sessions\/[^/]+$/.test(path)) { const row = rows.find(r => path.endsWith(r.session_id)) ?? rows[0]; return json({ ...row, pending: [{ pending_id: row.session_id, kind: row.session_id === 'question' ? 'elicitation' : 'permission', state: 'open', answered: false }] }) }
  if (/^\/api\/view\/sessions\/[^/]+$/.test(path)) return json({ items: [{ id: 'message', version: 1, ts, kind: 'message', text: 'Converted all parser tests. Running the suite next to check the fixtures.' }, path.endsWith('question') ? elicitation : question], older: false, epoch: 'items', revision: 1 })
  if (path.endsWith('/catalog')) return json({ session_id: 'permission', config_options: [], commands: [] })
  if (path.endsWith('/family')) return json({ session_id: 'permission', children: [], questions: [] })
  if (path.endsWith('/projects')) return json({ home: '/srv', recents_hat_id: 'work', recents: [{ path: '/srv/project', last_used_at: ts }], items: [{ path: '/srv/project' }], partial: false })
  if (path === '/api/hats/resolve') return json({ hat_id: 'work', canonical: '/srv/project', exists: true, is_dir: true, matched_rule: null })
  if (path.endsWith('/runtime-catalog')) return json({ agent: url.searchParams.get('agent'), adapter_revision: 'fixture', freshness: 'fresh', config_options: [select('model', 'Model', ['Sonnet', 'Opus']), select('mode', 'Permission mode', ['Default', 'Accept edits', 'Bypass permissions']), select('effort', 'Reasoning effort', ['Medium', 'High'])], defaults: { model: 'Sonnet', mode: 'Default', axes: { effort: 'Medium' } }, security: { known: true, axes: { mode: ['Default'] } } })
  if (path.endsWith('/session-defaults')) return json({ hat_id: path.split('/')[3], agent: url.searchParams.get('agent'), revision: 0, config: {} })
  if (path.endsWith('/delegation-policy')) return json({ allowed: {}, revision: 0 })
  if (path.endsWith('/session-tools')) return json({ enabled: false, revision: 0 })
  if (path === '/api/settings') return json({ public_url: 'https://collector.example.test' })
  if (path.endsWith('/agents')) return json([{ agent: 'claude', available: true }, { agent: 'codex', available: true }])
  if (path === '/api/mcp/connections') return json([{ id: 'docs', name: 'Project docs', slug: 'docs', url: 'https://docs.example.test/mcp', auth_kind: 'none', hat_id: 'work', created_at: ts, status: 'connected' }])
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
  const route = screen === 'overview' ? '/sessions' : screen === 'session' ? '/sessions/permission' : screen === 'elicitation' ? '/sessions/question' : screen === 'new-session' ? '/new' : screen === 'palette' ? '/sessions' : '/' + screen
  await app.goto(collector.origin + route)
  await expect(app.locator('main')).toBeVisible()
  if ((screen === 'overview' && width === 1280) || screen === 'needs-you') await expect(app.getByText('Run pnpm test for the parser', { exact: true })).toBeVisible()
  await app.evaluate(() => document.fonts.ready)
  const mobileFrames: Record<string, string> = { overview: '1b · Sessions tab', 'needs-you': '1 · Needs you tab', session: '3 · Deep link → permission card', elicitation: '4 · Answer a question', 'new-session': '5 · New session sheet' }
  const mobile = width === 390 && mobileFrames[screen]
  await reference.goto(pathToFileURL(join(prototype!, mobile ? 'Hennery Mobile.dc.html' : 'Hennery Desktop.dc.html')).href)
  await reference.evaluate(({ theme, mobile }) => { (window as unknown as { __dcSetProps: (name: string, props: object) => void }).__dcSetProps(mobile ? 'Hennery Mobile' : 'Hennery Desktop', { theme }) }, { theme, mobile: !!mobile })
  await expect(reference.locator('.tw-dark')).toHaveCount(theme === 'dark' ? 1 : 0)
  await reference.evaluate(() => document.fonts.ready)
  if (!mobile && !['overview', 'needs-you'].includes(screen)) {
   if (screen === 'session' || screen === 'elicitation') await reference.getByRole('button', { name: /^Port VAD tests/ }).first().click()
   else if (screen === 'new-session') await reference.getByRole('button', { name: /^New session/ }).first().click()
   else if (screen === 'palette') { await reference.getByRole('button', { name: /^Jump to/ }).click(); await app.keyboard.press('ControlOrMeta+k') }
   else await reference.getByRole('button', { name: new RegExp('^' + screen[0].toUpperCase() + screen.slice(1), 'i') }).first().click()
  }
  if (!mobile && screen === 'needs-you') await reference.getByRole('button', { name: /^Needs you/ }).first().click()
  mkdirSync(output, { recursive: true })
  const name = `${screen}-${width}-${theme}`
  if (mobile) {
   const phone = reference.locator('figure').filter({ has: reference.getByText(mobileFrames[screen], { exact: true }) }).locator(':scope > div')
   await phone.screenshot({ path: join(output, `${name}-prototype.png`) })
  } else await reference.screenshot({ path: join(output, `${name}-prototype.png`) })
  await app.screenshot({ path: join(output, `${name}-app.png`) })
  expect(await app.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  writeFileSync(join(output, `${name}.html`), `<!doctype html><meta charset="utf-8"><title>${name}</title><style>body{margin:0;display:flex;gap:12px;background:#888}figure{margin:0}figcaption{font:16px sans-serif;padding:8px}img{max-width:none}</style><figure><figcaption>Prototype · ${width}px · ${theme}</figcaption><img src="${name}-prototype.png"></figure><figure><figcaption>Application · ${width}px · ${theme}</figcaption><img src="${name}-app.png"></figure>`)
  if (screen === 'overview' && width === 1280) {
   const choice = app.getByRole('article', { name: 'Choose provider fallback', exact: true })
   const answer = app.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/pending/question/answer'))
   await choice.getByRole('button', { name: 'Azure first', exact: true }).click()
   expect((await answer).postDataJSON()).toEqual({ action: 'accept', content: { provider: 'azure' } })
   await expect(choice.getByText('Sent', { exact: true })).toBeVisible()
   const permission = app.getByRole('article', { name: 'Port parser tests', exact: true })
   const post = app.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/pending/permission/answer'))
   await permission.getByRole('button', { name: 'Allow once', exact: true }).click()
   expect((await post).postDataJSON()).toEqual({ option_id: 'once' })
   await expect(permission.getByText('Sent', { exact: true })).toBeVisible()
  }
 } finally { await release(); await context.close(); await collector.stop() }
})
