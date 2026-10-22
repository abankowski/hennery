#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { Intake, context } from './store.mjs';

const HELP = `Private project intake (local only; no GitHub requests)

Run from any worktree: nix develop -c node .agents/skills/hennery-work/scripts/intake.mjs COMMAND
Global options: --repo DIR, --store DIR (or HENNERY_WORK_STORE).
Default store: XDG_DATA_HOME/hennery-work/<Git-common-directory hash>.

init [--public-repo OWNER/REPO]
capture --title TEXT [--kind idea|bug|task] [--file PRIVATE_BODY] [--priority 0..3] [--session ID]
list | status | show ID
next --lane scope|build --worker ID [--session ID] [--branch NAME] [--worktree DIR]
scope ID --version N --file PRIVATE_SCOPE_JSON [--worker ID]
ready ID --version N [--worker ID]
update ID --version N --file PRIVATE_PATCH_JSON [--worker ID]
attach ID --version N --file PRIVATE_FILE [--worker ID]
extract --attachment ID --out PRIVATE_FILE
release ID --version N --worker ID
handoff ID --version N --worker OLD --to NEW
archive ID --version N [--worker ID]
draft ID --version N --title PUBLIC_TITLE --file PUBLIC_BODY [--worker ID]
preview ID
approve ID --version N --digest SHA256 [--worker ID]  (only after operator approval)
export ID --digest SHA256                        (only title and body)
published ID --version N --digest SHA256 --url ISSUE_URL [--worker ID]

All ordinary output is PRIVATE JSON. Only export is a public projection.
--file - reads stdin. Raw files and working drafts belong outside Git.
Versions prevent overwriting another session; next claims atomically.
`;

let store;
try {
  const { values: v, positionals } = parseArgs({ allowPositionals: true, options: Object.fromEntries([
    'repo', 'store', 'public-repo', 'title', 'kind', 'file', 'priority', 'session', 'lane', 'worker', 'branch', 'worktree', 'version', 'to', 'attachment', 'out', 'digest', 'url',
  ].map(k => [k, { type: 'string' }]).concat([['help', { type: 'boolean' }]])) });
  if (v.help || !positionals.length) { process.stdout.write(HELP); }
  else {
    const [command, id, ...extra] = positionals;
    if (extra.length) throw new Error('Unexpected positional arguments.');
    const commands = {
      init: [], capture: ['title', 'kind', 'file', 'priority', 'session'], list: [], status: [], show: [],
      next: ['lane', 'worker', 'session', 'branch', 'worktree'], scope: ['version', 'file', 'worker'], ready: ['version', 'worker'],
      update: ['version', 'file', 'worker'], attach: ['version', 'file', 'worker'], extract: ['attachment', 'out'],
      release: ['version', 'worker'], handoff: ['version', 'worker', 'to'], archive: ['version', 'worker'],
      draft: ['version', 'title', 'file', 'worker'], preview: [], approve: ['version', 'digest', 'worker'],
      export: ['digest'], published: ['version', 'digest', 'url', 'worker'],
    };
    if (!Object.hasOwn(commands, command)) throw new Error('Unknown command; use --help.');
    const global = ['repo', 'store', 'help', ...(command === 'init' ? ['public-repo'] : [])];
    if (Object.keys(v).some(key => ![...global, ...commands[command]].includes(key))) throw new Error('Unexpected option for this command.');
    const needsId = !['init', 'capture', 'list', 'status', 'next', 'extract'].includes(command);
    if (needsId !== Boolean(id)) throw new Error(needsId ? 'An item id is required.' : 'Unexpected item id.');
    const required = key => {
      if (v[key] === undefined || !v[key].trim()) throw new Error(`Missing --${key}.`);
      return v[key];
    };
    const file = () => readFileSync(required('file') === '-' ? 0 : v.file, 'utf8');
    const json = () => { try { return JSON.parse(file()); } catch { throw new Error('Cannot read valid JSON input.'); } };
    const version = () => {
      const value = required('version');
      if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error('Invalid --version.');
      return Number(value);
    };
    const ctx = context(v.repo, v.store);
    store = new Intake(ctx.path, { ...ctx, publicRepo: v['public-repo'] ?? ctx.publicRepo, create: command === 'init' });
    let result;
    switch (command) {
      case 'init': result = { store: ctx.path, initialized: true }; break;
      case 'capture': result = store.create({ title: required('title'), details: v.file ? file() : '', kind: v.kind, priority: v.priority === undefined ? 2 : Number(v.priority), session: v.session }); break;
      case 'list': result = store.list(); break;
      case 'status': result = store.summary(); break;
      case 'show': result = store.get(id); break;
      case 'next': result = store.next(required('lane'), { worker: required('worker'), session: v.session, branch: v.branch, worktree: v.worktree }); break;
      case 'scope': result = store.setScope(id, version(), json(), v.worker); break;
      case 'ready': result = store.markReady(id, version(), v.worker); break;
      case 'update': result = store.update(id, version(), json(), v.worker); break;
      case 'attach': result = store.attach(id, version(), required('file'), v.worker); break;
      case 'extract': result = store.extract(required('attachment'), required('out')); break;
      case 'release': result = store.release(id, version(), required('worker')); break;
      case 'handoff': result = store.handoff(id, version(), required('worker'), required('to')); break;
      case 'archive': result = store.archive(id, version(), v.worker); break;
      case 'draft': result = store.setDraft(id, version(), { title: required('title'), body: file() }, v.worker); break;
      case 'preview': result = store.preview(id); break;
      case 'approve': result = store.approve(id, version(), required('digest'), v.worker); break;
      case 'export': result = store.export(id, required('digest')); break;
      case 'published': result = store.published(id, version(), required('digest'), required('url'), v.worker); break;
    }
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  }
} catch (error) {
  // Runtime/parser errors can contain private input or paths. Emit only known
  // application errors; external errors get a fixed message without a stack.
  const message = error.code ? 'Command failed; check options, private paths and file permissions.' : error.message;
  process.stderr.write(`intake: ${message}\n`);
  process.exitCode = 1;
} finally { store?.close(); }
