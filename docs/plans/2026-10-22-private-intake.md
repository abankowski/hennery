# Private intake workflow implementation plan

**Date:** 2026-10-22

**Goal:** Capture private ideas, screenshots and bugs across this repository's
local sessions/worktrees, scope them before public issues, and resume approved
work with explicit handoffs and separate planned/actual release tracking.

**Base:** `02f2cf82`. **Branch:** `feat/private-intake-workflow`.

## Execution status

Built before writing this plan. The exact implementation patch is embedded
below. Verification evidence and the final fresh replay are recorded under
`.superpowers/sdd/private-intake/` in the implementation worktree. The PR carries
review and hosted CI outcomes. No global agent configuration was changed.

Local verification passed: 18 Node integration tests; 23 detected removal
probes in a separate copy; the concurrency test at 4 copies × 3 rounds (48 CLI
contenders); skill validation; actionlint; fmt; both clippy commands; both
generator checks; and the full Rust workspace (2,953 passed, 9 ignored,
0 failed). All final commands exited 0. The first workspace/generator attempt
failed during compilation with ENOSPC (exit 101), not a failing test. Only this
lane's generated targets were cleaned. The successful retry used
`CARGO_PROFILE_DEV_DEBUG=0 CARGO_PROFILE_TEST_DEBUG=0 CARGO_INCREMENTAL=0
CARGO_BUILD_JOBS=2`, without changing test limits. The exact final replay is
the final local step; its receipt and retained-copy paths are in the ledger.
The Rust proof above was recorded on the original base `7630ebc3`. All selected
PR checks also passed at `c9d6e5f0` on base `1681f4fe`. The final rebase onto
`02f2cf82` incorporates the merged session feature from PR #245 and resolves
only the shared plan-index conflict, retaining both entries. Intake executable
bytes are unchanged. Node regressions, skill validation, workflow lint and fresh
replay are repeated; current-head hosted CI supplies integration acceptance.

## Scope

One task: a repo-local skill, dependency-free Node CLI, private SQLite store,
workflow reference and CI test invocation. No Hennery core/API/database/UI changes,
new account, service, MCP connection or global installation. The CLI performs
no GitHub operation; publication and repository merging use authorized tools.

This follows the operator conversation: private capture precedes scoping; raw
screenshots/details stay private; public issues are separately authored and
reviewed; scope pickup and implementation pickup are separate queues.

## Decisions

- The umbrella spec excludes a core task hub; this is repository tooling.
- Use the existing flake's Node and built-in SQLite. No dependency or lock bump.
- Derive the default private store from the canonical Git common directory.
  Worktrees share it on one host; other hosts are not synchronized.
- Store originals as private database blobs. Reject destinations inside Git,
  even ignored paths. Use owner-only permissions and no WAL sidecars.
- Serialize reservations with SQLite transactions; use versions for edits.
  Claims survive session loss and need explicit release/handoff.
- A public projection has only title/body. Preview includes destination/digest;
  explicit operator approval binds exact content. Scope/draft edits invalidate
  approval. The CLI never contacts GitHub or decides who may publish.
- Release records are observed facts supplied by an authorized session. A target version
  is not proof of inclusion in a release.

## Global constraints

Current AGENTS rules apply. A worktree or fleet file does not assign a delegated
role; child-specific rules apply only to an explicit delegated brief. Use
synthetic fixtures and scratch data; preserve unrelated work and real Hennery
data. Run tools/tests in the dev shell, verify the personal GitHub account for
authorized actions, and complete PR review/CI before merging.

## Review focus

Review private/public separation, approval invalidation and destination checks,
outside-Git storage/attachment extraction, crash-safe claims, stale edits,
cross-worktree identity and honest release semantics. Check that the skill
does not interpret capture/scoping as publication or implementation authority.
The store assumes a trusted local OS user; it is not a hat-isolation boundary.

## File structure

- `.agents/skills/hennery-work/SKILL.md`: session workflow and publication rules.
- `.agents/skills/hennery-work/scripts/store.mjs`: private persistence/lifecycle.
- `.agents/skills/hennery-work/scripts/intake.mjs`: local JSON CLI.
- `.agents/skills/hennery-work/scripts/intake.test.mjs`: real SQLite/Git/CLI tests.
- `docs/private-intake.md`: setup, schemas, examples and limitations.
- `docs/README.md`: discoverability and plan index.
- `.github/workflows/ci.yml`: run the new regressions in the existing checks job.

## Task 1: Private capture, scope and work pickup

1. Apply the exact patch below to the base with git apply --unidiff-zero. The code wins over descriptive text.
2. Run `nix develop -c node --test .agents/skills/hennery-work/scripts/intake.test.mjs`.
3. Validate the skill and workflow; run the six required Rust gates once.
4. Run guard-removal probes in a fresh cloned copy and the concurrency test
   with four copies, three rounds. Never mutate the live worktree for probes.
5. Fresh replay: extract this plan's diff fence, assert nonzero files, apply to
   the exact base, copy this plan as the input document, and compare all tracked
   file bytes. Clone the source target before building/testing in the copy.
6. Check the staged diff matches verified bytes, commit, then complete the
   authorized PR/review/CI flow. Do not claim hosted CI from local checks.

### Exact implementation

```diff
diff --git a/.agents/skills/hennery-work/SKILL.md b/.agents/skills/hennery-work/SKILL.md
new file mode 100644
index 00000000..2c43408c
--- /dev/null
+++ b/.agents/skills/hennery-work/SKILL.md
@@ -0,0 +1,88 @@
+---
+name: hennery-work
+description: Capture private ideas, screenshots and bugs for the hennery repository, scope them before creating public issues, resume work across sessions and worktrees, and track implementation and release status.
+---
+
+# Private intake and project work
+
+Use this workflow for the hennery repository's private intake and work queue.
+This is a repository workflow; it does not add a task hub to the Hennery app.
+
+Resolve the bundled script relative to this SKILL.md and run it with the active
+worktree as cwd, inside that worktree's dev shell. If the skill is in another
+checkout, use the script's absolute path; do not change cwd to the skill's tree.
+When the active checkout contains the skill:
+
+```sh
+nix develop -c node .agents/skills/hennery-work/scripts/intake.mjs --help
+```
+
+Read [the workflow and command reference](../../../docs/private-intake.md) for
+scope/patch schemas, release tracking, handoffs or publication. Resolve that
+link relative to this skill directory. Do not read existing private items until
+the user's request needs them.
+
+## Capture and scope
+
+- A request to capture an idea or bug authorizes **private capture**, not
+  publication. Use `capture`, adding the source session reference when known.
+  Copy accessible original screenshots/files with `attach`; if a screenshot is
+  only available in a Hennery transcript, keep its session reference and say
+  that the original has not been copied. Do not claim to have saved unseen bytes.
+- The CLI derives one private store from Git's common directory, shared by all
+  local worktrees. On first use, run `init`. An explicit `--store` or
+  `HENNERY_WORK_STORE` can choose another location outside Git; initialize only
+  for the current repository. Do not change real Hennery data or global config.
+- Keep raw notes, screenshots and scope/patch files outside Git. CLI output,
+  `list`, `show` and `status` are private too. Do not paste them into public
+  issues, PRs or repository docs. The store is not a cross-hat access boundary.
+- During scoping, establish the problem, desired outcome, included/excluded
+  behavior, acceptance criteria and open questions. Preserve uncertainty; do
+  not silently choose a product direction the user has not settled. Use `scope`
+  to persist the result. `ready` requires no unresolved questions.
+- A scoped item may stay private, be archived for later, or become a public
+  issue. Do not equate `ready` with permission to publish or implement it.
+
+## Pick up and hand over work
+
+- For "take the next item", distinguish scoping from implementation using the
+  request and context; clarify when genuinely ambiguous. Use `next --lane scope`
+  or `next --lane build`, with a stable worker/session identifier. `next`
+  reserves one item atomically, preferring priority 0 through 3 and older items.
+  It does not start an agent or grant implementation permission by itself.
+- Record the session, branch and worktree when claiming. Respect the repo's
+  applicable repository instructions and any explicit delegated brief. A claim is
+  not permission to edit someone else's tree or spawn additional agents.
+- Read `show` before editing and pass its `--version`. On a conflict, reread and
+  reconcile; do not automatically retry an old patch over newer work.
+- Persist a private `note` with the result, evidence, files/commits and next
+  action at meaningful milestones, on a blocker, and before yielding. Keep work
+  status current when it enters review, merges or ships. `release` gives up a reservation; `handoff` transfers
+  it explicitly. A closed or parked session does not expire a reservation.
+  If recovering abandoned work, inspect it and deliberately name the previous
+  worker in the handoff rather than silently stealing its claim.
+- Record review/merge/release facts only from observed evidence. `target_release`
+  is intent; `merged` needs the verified full merge commit; `released_in` records
+  the actual published version after verifying that release contains the work.
+  The CLI records these facts and does not independently verify GitHub state.
+
+## Prepare a public issue
+
+1. Write a **separate** public title and body using `draft`. Explain the problem
+   and acceptance criteria with synthetic examples. Do not copy the raw record,
+   client identifiers, original screenshots, private URLs, session references or
+   internal discussion. Automated redaction is not a publication guarantee.
+2. Use `preview` and show the user the exact title/body, destination repository
+   and digest. Ask for publication approval for that concrete draft. Approval
+   to implement this workflow or scope an idea is not approval to publish it.
+3. Only after explicit approval, record `approve` for the previewed digest and
+   current version. Changed drafts invalidate approval; scope changes clear the
+   draft entirely. Do not approve on the user's behalf.
+4. `export` returns **only** the approved title/body. It never includes raw
+   context or attachment bytes. It does not contact GitHub.
+5. Follow current GitHub permissions. An independent session may publish the
+   approved projection using a verified authorized account. Only an explicitly
+   delegated child follows its brief's parent handoff restrictions; a worktree
+   or a fleet file does not assign that role. Before retrying an uncertain
+   creation, check for an existing issue. Publish only the approved projection,
+   then record its URL using `published`. Keep the intake-to-issue link private.
diff --git a/.agents/skills/hennery-work/scripts/intake.mjs b/.agents/skills/hennery-work/scripts/intake.mjs
new file mode 100644
index 00000000..2d24c698
--- /dev/null
+++ b/.agents/skills/hennery-work/scripts/intake.mjs
@@ -0,0 +1,100 @@
+#!/usr/bin/env node
+import { parseArgs } from 'node:util';
+import { readFileSync } from 'node:fs';
+import { Intake, context } from './store.mjs';
+
+const HELP = `Private project intake (local only; no GitHub requests)
+
+Run from any worktree: nix develop -c node .agents/skills/hennery-work/scripts/intake.mjs COMMAND
+Global options: --repo DIR, --store DIR (or HENNERY_WORK_STORE).
+Default store: XDG_DATA_HOME/hennery-work/<Git-common-directory hash>.
+
+init [--public-repo OWNER/REPO]
+capture --title TEXT [--kind idea|bug|task] [--file PRIVATE_BODY] [--priority 0..3] [--session ID]
+list | status | show ID
+next --lane scope|build --worker ID [--session ID] [--branch NAME] [--worktree DIR]
+scope ID --version N --file PRIVATE_SCOPE_JSON [--worker ID]
+ready ID --version N [--worker ID]
+update ID --version N --file PRIVATE_PATCH_JSON [--worker ID]
+attach ID --version N --file PRIVATE_FILE [--worker ID]
+extract --attachment ID --out PRIVATE_FILE
+release ID --version N --worker ID
+handoff ID --version N --worker OLD --to NEW
+archive ID --version N [--worker ID]
+draft ID --version N --title PUBLIC_TITLE --file PUBLIC_BODY [--worker ID]
+preview ID
+approve ID --version N --digest SHA256 [--worker ID]  (only after operator approval)
+export ID --digest SHA256                        (only title and body)
+published ID --version N --digest SHA256 --url ISSUE_URL [--worker ID]
+
+All ordinary output is PRIVATE JSON. Only export is a public projection.
+--file - reads stdin. Raw files and working drafts belong outside Git.
+Versions prevent overwriting another session; next claims atomically.
+`;
+
+let store;
+try {
+  const { values: v, positionals } = parseArgs({ allowPositionals: true, options: Object.fromEntries([
+    'repo', 'store', 'public-repo', 'title', 'kind', 'file', 'priority', 'session', 'lane', 'worker', 'branch', 'worktree', 'version', 'to', 'attachment', 'out', 'digest', 'url',
+  ].map(k => [k, { type: 'string' }]).concat([['help', { type: 'boolean' }]])) });
+  if (v.help || !positionals.length) { process.stdout.write(HELP); }
+  else {
+    const [command, id, ...extra] = positionals;
+    if (extra.length) throw new Error('Unexpected positional arguments.');
+    const commands = {
+      init: [], capture: ['title', 'kind', 'file', 'priority', 'session'], list: [], status: [], show: [],
+      next: ['lane', 'worker', 'session', 'branch', 'worktree'], scope: ['version', 'file', 'worker'], ready: ['version', 'worker'],
+      update: ['version', 'file', 'worker'], attach: ['version', 'file', 'worker'], extract: ['attachment', 'out'],
+      release: ['version', 'worker'], handoff: ['version', 'worker', 'to'], archive: ['version', 'worker'],
+      draft: ['version', 'title', 'file', 'worker'], preview: [], approve: ['version', 'digest', 'worker'],
+      export: ['digest'], published: ['version', 'digest', 'url', 'worker'],
+    };
+    if (!Object.hasOwn(commands, command)) throw new Error('Unknown command; use --help.');
+    const global = ['repo', 'store', 'help', ...(command === 'init' ? ['public-repo'] : [])];
+    if (Object.keys(v).some(key => ![...global, ...commands[command]].includes(key))) throw new Error('Unexpected option for this command.');
+    const needsId = !['init', 'capture', 'list', 'status', 'next', 'extract'].includes(command);
+    if (needsId !== Boolean(id)) throw new Error(needsId ? 'An item id is required.' : 'Unexpected item id.');
+    const required = key => {
+      if (v[key] === undefined || !v[key].trim()) throw new Error(`Missing --${key}.`);
+      return v[key];
+    };
+    const file = () => readFileSync(required('file') === '-' ? 0 : v.file, 'utf8');
+    const json = () => { try { return JSON.parse(file()); } catch { throw new Error('Cannot read valid JSON input.'); } };
+    const version = () => {
+      const value = required('version');
+      if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error('Invalid --version.');
+      return Number(value);
+    };
+    const ctx = context(v.repo, v.store);
+    store = new Intake(ctx.path, { ...ctx, publicRepo: v['public-repo'] ?? ctx.publicRepo, create: command === 'init' });
+    let result;
+    switch (command) {
+      case 'init': result = { store: ctx.path, initialized: true }; break;
+      case 'capture': result = store.create({ title: required('title'), details: v.file ? file() : '', kind: v.kind, priority: v.priority === undefined ? 2 : Number(v.priority), session: v.session }); break;
+      case 'list': result = store.list(); break;
+      case 'status': result = store.summary(); break;
+      case 'show': result = store.get(id); break;
+      case 'next': result = store.next(required('lane'), { worker: required('worker'), session: v.session, branch: v.branch, worktree: v.worktree }); break;
+      case 'scope': result = store.setScope(id, version(), json(), v.worker); break;
+      case 'ready': result = store.markReady(id, version(), v.worker); break;
+      case 'update': result = store.update(id, version(), json(), v.worker); break;
+      case 'attach': result = store.attach(id, version(), required('file'), v.worker); break;
+      case 'extract': result = store.extract(required('attachment'), required('out')); break;
+      case 'release': result = store.release(id, version(), required('worker')); break;
+      case 'handoff': result = store.handoff(id, version(), required('worker'), required('to')); break;
+      case 'archive': result = store.archive(id, version(), v.worker); break;
+      case 'draft': result = store.setDraft(id, version(), { title: required('title'), body: file() }, v.worker); break;
+      case 'preview': result = store.preview(id); break;
+      case 'approve': result = store.approve(id, version(), required('digest'), v.worker); break;
+      case 'export': result = store.export(id, required('digest')); break;
+      case 'published': result = store.published(id, version(), required('digest'), required('url'), v.worker); break;
+    }
+    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
+  }
+} catch (error) {
+  // Runtime/parser errors can contain private input or paths. Emit only known
+  // application errors; external errors get a fixed message without a stack.
+  const message = error.code ? 'Command failed; check options, private paths and file permissions.' : error.message;
+  process.stderr.write(`intake: ${message}\n`);
+  process.exitCode = 1;
+} finally { store?.close(); }
diff --git a/.agents/skills/hennery-work/scripts/intake.test.mjs b/.agents/skills/hennery-work/scripts/intake.test.mjs
new file mode 100644
index 00000000..8a13ed4c
--- /dev/null
+++ b/.agents/skills/hennery-work/scripts/intake.test.mjs
@@ -0,0 +1,294 @@
+import test from 'node:test';
+import assert from 'node:assert/strict';
+import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, statSync, chmodSync, symlinkSync } from 'node:fs';
+import { tmpdir } from 'node:os';
+import { join, dirname } from 'node:path';
+import { fileURLToPath } from 'node:url';
+import { execFileSync, spawn } from 'node:child_process';
+import { Intake, context } from './store.mjs';
+
+const cli = join(dirname(fileURLToPath(import.meta.url)), 'intake.mjs');
+const scope = { problem: 'A menu covers its action.', outcome: 'The action stays reachable.', in_scope: ['Menu layout'], out_of_scope: ['Navigation redesign'], acceptance: ['The action is reachable at a narrow width.'], questions: [] };
+const root = mkdtempSync(join(tmpdir(), 'hennery-intake-tests-'));
+const env = { ...process.env, HOME: root, XDG_CONFIG_HOME: join(root, 'config'), GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
+let sequence = 0;
+function fixture() {
+  const base = join(root, `case-${++sequence}`);
+  mkdirSync(base);
+  const path = join(base, 'private');
+  const store = new Intake(path, { project: 'fixture', publicRepo: 'example/project', create: true });
+  return { base, path, store };
+}
+function ready(store) {
+  let item = store.create({ title: 'PRIVATE TITLE', details: 'PRIVATE CUSTOMER DETAIL', kind: 'bug' });
+  item = store.setScope(item.id, item.version, scope);
+  return store.markReady(item.id, item.version);
+}
+function drafted(store) {
+  const item = ready(store);
+  return store.setDraft(item.id, item.version, { title: 'Keep the action reachable', body: 'Use a synthetic menu at a narrow width.' });
+}
+function command(args, cwd = root) {
+  return execFileSync(process.execPath, [cli, ...args], { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
+}
+function git(repo, ...args) {
+  return execFileSync('git', ['-C', repo, ...args], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
+}
+function repository(base) {
+  const repo = join(base, 'repo');
+  mkdirSync(repo);
+  git(repo, 'init', '-q');
+  git(repo, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-q', '--allow-empty', '-m', 'test');
+  return repo;
+}
+
+test('capture persists across sessions and keeps private files owner-only', () => {
+  const { path, store } = fixture();
+  const item = store.create({ title: 'An idea', details: 'Raw context', kind: 'idea', session: 'private-session' });
+  store.close();
+  const reopened = new Intake(path, { project: 'fixture' });
+  assert.equal(reopened.get(item.id).details, 'Raw context');
+  assert.equal(reopened.get(item.id).session, 'private-session');
+  assert.equal(statSync(path).mode & 0o777, 0o700);
+  assert.equal(statSync(join(path, 'intake.sqlite')).mode & 0o777, 0o600);
+  reopened.close();
+});
+
+test('stores refuse Git trees including linked worktrees and symlink aliases', () => {
+  const { base, store } = fixture(); store.close();
+  const repo = repository(base);
+  assert.throws(() => new Intake(join(repo, 'private'), { project: 'x', create: true }), /outside Git/);
+  const alias = join(base, 'alias'); symlinkSync(repo, alias);
+  assert.throws(() => new Intake(join(alias, 'private'), { project: 'x', create: true }), /outside Git/);
+  const linked = join(base, 'linked'); git(repo, 'worktree', 'add', '-q', '-b', 'another', linked);
+  assert.throws(() => new Intake(join(linked, 'private'), { project: 'x', create: true }), /outside Git/);
+});
+
+test('repo context maps every worktree to one store, but isolates other repositories', () => {
+  const { base, store } = fixture(); store.close();
+  const repo = repository(base);
+  const linked = join(base, 'linked'); git(repo, 'worktree', 'add', '-q', '-b', 'another', linked);
+  const a = context(repo, undefined, { XDG_DATA_HOME: join(base, 'data') });
+  const b = context(linked, undefined, { XDG_DATA_HOME: join(base, 'data') });
+  assert.equal(a.path, b.path);
+  assert.equal(a.project, b.project);
+  const otherBase = join(base, 'other'); mkdirSync(otherBase);
+  assert.notEqual(a.path, context(repository(otherBase), undefined, { XDG_DATA_HOME: join(base, 'data') }).path);
+});
+
+test('opening does not initialize stores or accept another project or a loose database', () => {
+  const { base, path, store } = fixture(); store.close();
+  assert.throws(() => new Intake(join(base, 'missing'), { project: 'fixture' }), /not initialized/);
+  assert.throws(() => new Intake(path, { project: 'other' }), /different repository/);
+  chmodSync(join(path, 'intake.sqlite'), 0o644);
+  assert.throws(() => new Intake(path, { project: 'fixture' }), /owner-only/);
+});
+
+test('optimistic versions preserve another session edits', () => {
+  const { store } = fixture();
+  const item = store.create({ title: 'First' });
+  store.update(item.id, item.version, { title: 'Second' });
+  assert.throws(() => store.update(item.id, item.version, { title: 'Lost update' }), /version conflict/);
+  assert.equal(store.get(item.id).title, 'Second');
+  store.close();
+});
+
+test('ready requires complete scoping and answers to open questions', () => {
+  const { store } = fixture();
+  let item = store.create({ title: 'Idea' });
+  assert.throws(() => store.markReady(item.id, item.version), /scope/);
+  assert.throws(() => store.setScope(item.id, item.version, { ...scope, acceptance: [] }), /acceptance/);
+  item = store.setScope(item.id, item.version, { ...scope, questions: ['Which behavior?'] });
+  assert.throws(() => store.markReady(item.id, item.version), /questions/);
+  item = store.setScope(item.id, item.version, scope);
+  assert.equal(store.markReady(item.id, item.version).phase, 'ready');
+  store.close();
+});
+
+test('private attachments round-trip without entering the public payload', () => {
+  const { base, store } = fixture();
+  let item = drafted(store);
+  const source = join(base, 'private-customer-screen.bin'); writeFileSync(source, 'PRIVATE IMAGE BYTES');
+  item = store.attach(item.id, item.version, source);
+  const preview = store.preview(item.id);
+  item = store.approve(item.id, item.version, preview.digest);
+  const payload = store.export(item.id, preview.digest);
+  assert.deepEqual(payload, { title: 'Keep the action reachable', body: 'Use a synthetic menu at a narrow width.' });
+  assert.doesNotMatch(JSON.stringify(payload), /PRIVATE|private-customer|session|attachments|scope/);
+  const dest = join(base, 'recovered.bin');
+  store.extract(item.attachments[0].id, dest);
+  assert.equal(readFileSync(dest, 'utf8'), 'PRIVATE IMAGE BYTES');
+  assert.equal(statSync(dest).mode & 0o777, 0o600);
+  assert.throws(() => store.extract(item.attachments[0].id, dest), /exists/);
+  const repo = repository(base);
+  assert.throws(() => store.extract(item.attachments[0].id, join(repo, 'leak.bin')), /outside Git/);
+  store.close();
+});
+
+test('approval binds exact public bytes and edits invalidate it', () => {
+  const { store } = fixture();
+  let item = drafted(store);
+  const first = store.preview(item.id);
+  assert.equal(first.repository, 'example/project');
+  assert.throws(() => store.export(item.id, first.digest), /approval/);
+  assert.throws(() => store.approve(item.id, item.version, '0'.repeat(64)), /digest/);
+  item = store.approve(item.id, item.version, first.digest);
+  assert.equal(store.export(item.id, first.digest).title, first.title);
+  item = store.setDraft(item.id, item.version, { title: 'Changed', body: first.body });
+  assert.equal(item.approved_digest, null);
+  assert.throws(() => store.export(item.id, first.digest), /approval/);
+  assert.throws(() => store.approve(item.id, item.version, first.digest), /digest/);
+  item = store.setDraft(item.id, item.version, { title: first.title, body: first.body });
+  assert.throws(() => store.export(item.id, first.digest), /approval/);
+  const second = store.preview(item.id);
+  item = store.approve(item.id, item.version, second.digest);
+  item = store.setScope(item.id, item.version, { ...scope, outcome: 'A different outcome.' });
+  assert.equal(item.phase, 'scoping');
+  assert.equal(item.draft, null);
+  assert.throws(() => store.export(item.id, second.digest), /draft|approval/);
+  store.close();
+});
+
+test('public issue receipts require approval and the configured repository', () => {
+  const { store } = fixture();
+  let item = drafted(store); const draft = store.preview(item.id);
+  assert.throws(() => store.published(item.id, item.version, draft.digest, 'https://github.com/example/project/issues/12'), /approval/);
+  item = store.approve(item.id, item.version, draft.digest);
+  for (const url of ['https://github.com/other/project/issues/12', 'https://github.com/example/project/issues/12?x=private', 'http://github.com/example/project/issues/12']) {
+    assert.throws(() => store.published(item.id, item.version, draft.digest, url), /issue URL/);
+  }
+  item = store.published(item.id, item.version, draft.digest, 'https://github.com/example/project/issues/12');
+  assert.equal(item.phase, 'published');
+  assert.equal(item.issue_url, 'https://github.com/example/project/issues/12');
+  store.close();
+});
+
+test('scoping and implementation are separate queues; blocked and archived topics stay out', () => {
+  const { store } = fixture();
+  const inbox = store.create({ title: 'Scope me', priority: 1 });
+  let blocked = store.create({ title: 'Blocked', priority: 0 });
+  store.update(blocked.id, blocked.version, { blocked: 'Needs a decision' });
+  const done = store.create({ title: 'Drop this', priority: 0 }); store.archive(done.id, done.version);
+  const build = ready(store);
+  assert.equal(store.next('scope', { worker: 'scoper' }).id, inbox.id);
+  assert.equal(store.next('build', { worker: 'builder', session: 's2', branch: 'feat/example', worktree: '/private/worktree' }).id, build.id);
+  assert.equal(store.next('scope', { worker: 'another' }), null);
+  store.close();
+});
+
+test('highest priority and oldest capture win within an eligible queue', () => {
+  const { store } = fixture();
+  store.create({ title: 'Later priority', priority: 3 });
+  const first = store.create({ title: 'First urgent', priority: 0 });
+  const second = store.create({ title: 'Second urgent', priority: 0 });
+  assert.equal(store.next('scope', { worker: 'one' }).id, first.id);
+  assert.equal(store.next('scope', { worker: 'two' }).id, second.id);
+  store.close();
+});
+
+test('claims survive reconnects, protect edits and require explicit release or handoff', () => {
+  const { store, path } = fixture();
+  const created = store.create({ title: 'Idea' });
+  const claimed = store.next('scope', { worker: 'session-one' }); store.close();
+  const again = new Intake(path, { project: 'fixture' });
+  assert.equal(again.next('scope', { worker: 'session-two' }), null);
+  assert.throws(() => again.update(created.id, claimed.version, { title: 'Wrong worker' }, 'session-two'), /claimed/);
+  const handed = again.handoff(created.id, claimed.version, 'session-one', 'session-two');
+  assert.equal(handed.claim.worker, 'session-two');
+  const released = again.release(created.id, handed.version, 'session-two');
+  assert.equal(released.claim, null);
+  assert.equal(again.next('scope', { worker: 'session-three' }).id, created.id);
+  again.close();
+});
+
+test('finishing a claimed scope durably frees it for a different implementation session', () => {
+  const { store, path } = fixture();
+  store.create({ title: 'Scope then build' });
+  let item = store.next('scope', { worker: 'scoper' });
+  item = store.setScope(item.id, item.version, scope, 'scoper');
+  item = store.markReady(item.id, item.version, 'scoper');
+  assert.equal(item.claim, null);
+  store.close();
+  const builder = new Intake(path, { project: 'fixture' });
+  const picked = builder.next('build', { worker: 'builder', branch: 'feat/example', worktree: '/private/worktree' });
+  assert.equal(picked.id, item.id);
+  assert.equal(picked.status, 'in_progress');
+  assert.equal(picked.claim.worker, 'builder');
+  assert.equal(picked.claim.branch, 'feat/example');
+  builder.close();
+});
+
+test('target release, merge and actual release are distinct recorded facts', () => {
+  const { store } = fixture();
+  let item = ready(store);
+  item = store.update(item.id, item.version, { target_release: '0.4.0' });
+  assert.equal(item.released_in, null);
+  assert.throws(() => store.update(item.id, item.version, { status: 'released', released_in: '0.4.0' }), /merged/);
+  assert.throws(() => store.update(item.id, item.version, { status: 'merged' }), /merge commit/);
+  item = store.update(item.id, item.version, { status: 'merged', merge_commit: 'a'.repeat(40) });
+  assert.equal(store.summary().merged_unreleased[0].id, item.id);
+  item = store.update(item.id, item.version, { status: 'released', released_in: '0.4.1' });
+  assert.equal(item.target_release, '0.4.0');
+  assert.equal(item.released_in, '0.4.1');
+  assert.equal(store.summary().merged_unreleased.length, 0);
+  store.close();
+});
+
+test('active implementation cannot be reset by marking scope ready again', () => {
+  const { store } = fixture();
+  ready(store);
+  const item = store.next('build', { worker: 'builder' });
+  assert.throws(() => store.markReady(item.id, item.version, 'builder'), /implementation/);
+  assert.equal(store.get(item.id).claim.worker, 'builder');
+  store.close();
+});
+
+test('release recording cannot replace verified merge evidence with an invalid value', () => {
+  const { store } = fixture();
+  let item = ready(store);
+  item = store.update(item.id, item.version, { status: 'merged', merge_commit: 'a'.repeat(40) });
+  assert.throws(() => store.update(item.id, item.version, { status: 'released', released_in: '0.4.0', merge_commit: 'invalid' }), /merge commit/);
+  assert.equal(store.get(item.id).status, 'merged');
+  store.close();
+});
+
+test('CLI is usable from separate worktrees and publishes only an approved projection', () => {
+  const { base, store } = fixture(); store.close();
+  const repo = repository(base);
+  git(repo, 'remote', 'add', 'origin', 'git@github.com:example/project.git');
+  const linked = join(base, 'linked'); git(repo, 'worktree', 'add', '-q', '-b', 'another', linked);
+  const path = join(base, 'cli-private');
+  const run = (args, cwd = repo) => JSON.parse(command(['--store', path, ...args], cwd));
+  run(['init']);
+  let item = run(['capture', '--title', 'PRIVATE TITLE', '--kind', 'bug', '--session', 'private-session']);
+  assert.equal(run(['list'], linked)[0].id, item.id);
+  const scopeFile = join(base, 'scope.json'); writeFileSync(scopeFile, JSON.stringify(scope));
+  item = run(['scope', item.id, '--version', String(item.version), '--file', scopeFile]);
+  item = run(['ready', item.id, '--version', String(item.version)]);
+  const body = join(base, 'body.md'); writeFileSync(body, 'A public description.');
+  item = run(['draft', item.id, '--version', String(item.version), '--title', 'Public title', '--file', body]);
+  const preview = run(['preview', item.id]);
+  item = run(['approve', item.id, '--version', String(item.version), '--digest', preview.digest]);
+  assert.deepEqual(run(['export', item.id, '--digest', preview.digest]), { title: 'Public title', body: 'A public description.' });
+  assert.equal(run(['show', item.id]).session, 'private-session');
+  assert.throws(() => command(['--store', path, 'capture', '--title', 'PRIVATE_ERROR_MARKER', '--unknown'], repo), error => {
+    assert.doesNotMatch(error.stderr, /PRIVATE_ERROR_MARKER|at file:/);
+    return error.status === 1;
+  });
+});
+
+test('concurrent sessions cannot claim the same topic', async () => {
+  const { base, store } = fixture(); store.close();
+  const repo = repository(base); const path = join(base, 'concurrent-private');
+  command(['--store', path, 'init'], repo);
+  const topic = JSON.parse(command(['--store', path, 'capture', '--title', 'One topic'], repo));
+  const results = await Promise.all(Array.from({ length: 4 }, (_, i) => new Promise((resolve, reject) => {
+    const child = spawn(process.execPath, [cli, '--store', path, 'next', '--lane', 'scope', '--worker', `worker-${i}`], { cwd: repo, env });
+    let output = ''; let errors = '';
+    child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { errors += chunk; });
+    child.on('error', reject); child.on('close', code => code === 0 ? resolve(JSON.parse(output)) : reject(new Error(errors)));
+  })));
+  const winners = results.filter(Boolean);
+  assert.equal(winners.length, 1);
+  assert.equal(winners[0].id, topic.id);
+});
diff --git a/.agents/skills/hennery-work/scripts/store.mjs b/.agents/skills/hennery-work/scripts/store.mjs
new file mode 100644
index 00000000..92f268d3
--- /dev/null
+++ b/.agents/skills/hennery-work/scripts/store.mjs
@@ -0,0 +1,290 @@
+import { DatabaseSync } from 'node:sqlite';
+import { createHash, randomUUID } from 'node:crypto';
+import { execFileSync } from 'node:child_process';
+import { existsSync, mkdirSync, realpathSync, lstatSync, openSync, closeSync, readFileSync, writeFileSync, fstatSync, constants } from 'node:fs';
+import { resolve, dirname, join, basename } from 'node:path';
+import { homedir } from 'node:os';
+
+const APP_ID = 0x48494e54;
+const MAX_TEXT = 256 * 1024;
+const MAX_ATTACHMENT = 20 * 1024 * 1024;
+const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
+const fail = message => { throw new Error(message); };
+const now = () => new Date().toISOString();
+const itemId = value => `HIN-${String(value).padStart(6, '0')}`;
+function number(id) {
+  if (!/^HIN-\d{6,}$/.test(id) || !Number.isSafeInteger(Number(id.slice(4))) || Number(id.slice(4)) < 1) fail('Invalid item id.');
+  return Number(id.slice(4));
+}
+function text(value, label, max = MAX_TEXT) {
+  if (typeof value !== 'string' || !value.trim() || Buffer.byteLength(value) > max || value.includes('\0')) fail(`Invalid ${label}.`);
+  return value;
+}
+function strings(value, label, required = false) {
+  if (!Array.isArray(value) || value.length > 100 || (required && value.length === 0)) fail(`Invalid ${label}.`);
+  value.forEach(v => text(v, label));
+  return value;
+}
+
+// Resolve aliases before checking ancestors: even an ignored path in a Git tree
+// is an unsuitable home for raw evidence. The check also covers linked worktrees.
+export function outsideGit(path) {
+  let ancestor = resolve(path);
+  const suffix = [];
+  while (!existsSync(ancestor)) {
+    suffix.unshift(basename(ancestor));
+    const parent = dirname(ancestor);
+    if (parent === ancestor) fail('Cannot resolve private path.');
+    ancestor = parent;
+  }
+  const canonical = join(realpathSync(ancestor), ...suffix);
+  for (let dir = canonical; ; dir = dirname(dir)) {
+    if (existsSync(join(dir, '.git'))) fail('Private data must stay outside Git working trees.');
+    if (dirname(dir) === dir) break;
+  }
+  return canonical;
+}
+
+function ownerOnly(path, directory) {
+  const stat = lstatSync(path);
+  if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile()) || (!directory && stat.nlink !== 1)
+      || (typeof process.getuid === 'function' && stat.uid !== process.getuid()) || (stat.mode & 0o077)) {
+    fail('Private store must be owner-only, without links.');
+  }
+}
+
+export function context(repo = process.cwd(), store, env = process.env) {
+  let project;
+  try {
+    project = realpathSync(execFileSync('git', ['-C', repo, 'rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim());
+  } catch { fail('Run from a Git repository or pass --repo.'); }
+  let publicRepo = null;
+  try {
+    const remote = execFileSync('git', ['-C', repo, 'remote', 'get-url', 'origin'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
+    const match = /^(?:git@github\.com:|https:\/\/github\.com\/)([\w.-]+\/[\w.-]+?)(?:\.git)?$/.exec(remote);
+    publicRepo = match?.[1] ?? null;
+  } catch { /* A local repository may have no origin yet. */ }
+  const path = store ?? env.HENNERY_WORK_STORE ?? join(env.XDG_DATA_HOME || join(homedir(), '.local', 'share'), 'hennery-work', createHash('sha256').update(project).digest('hex').slice(0, 16));
+  return { path: resolve(path), project, publicRepo };
+}
+
+export class Intake {
+  constructor(path, { project, publicRepo = null, create = false } = {}) {
+    text(project, 'repository identity');
+    if (publicRepo !== null && !/^[\w.-]+\/[\w.-]+$/.test(publicRepo)) fail('Invalid public repository.');
+    // Set before mkdir/open or SQLite creates a journal. No WAL/SHM is used.
+    process.umask(0o077);
+    if (existsSync(path) && lstatSync(path).isSymbolicLink()) fail('Private store must be owner-only, without links.');
+    this.path = outsideGit(path);
+    const file = join(this.path, 'intake.sqlite');
+    if (create) {
+      mkdirSync(this.path, { recursive: true, mode: 0o700 });
+      ownerOnly(this.path, true);
+      const fd = openSync(file, 'wx', 0o600); closeSync(fd);
+    } else if (!existsSync(file)) fail('Private store not initialized; run init first.');
+    ownerOnly(this.path, true); ownerOnly(file, false);
+    try {
+      this.db = new DatabaseSync(file, { timeout: 10_000 });
+      if (create) {
+        this.db.exec(`BEGIN IMMEDIATE;
+          PRAGMA application_id = ${APP_ID};
+          PRAGMA user_version = 1;
+          CREATE TABLE meta (project TEXT NOT NULL, public_repo TEXT);
+          CREATE TABLE items (id INTEGER PRIMARY KEY AUTOINCREMENT, version INTEGER NOT NULL, data TEXT NOT NULL);
+          CREATE TABLE attachments (id TEXT PRIMARY KEY, item_id INTEGER NOT NULL REFERENCES items(id), name TEXT NOT NULL, bytes BLOB NOT NULL);
+        `);
+        this.db.prepare('INSERT INTO meta VALUES (?, ?)').run(project, publicRepo);
+        this.db.exec('COMMIT');
+      }
+      if (this.db.prepare('PRAGMA application_id').get().application_id !== APP_ID || this.db.prepare('PRAGMA user_version').get().user_version !== 1) fail('Not a supported intake database.');
+      const meta = this.db.prepare('SELECT * FROM meta').get();
+      if (meta.project !== project) fail('Store belongs to a different repository.');
+      this.publicRepo = meta.public_repo;
+      this.db.exec('PRAGMA foreign_keys = ON');
+    } catch (error) { this.db?.close(); throw error; }
+  }
+
+  close() { this.db.close(); }
+  #transaction(operation) {
+    this.db.exec('BEGIN IMMEDIATE');
+    try { const result = operation(); this.db.exec('COMMIT'); return result; }
+    catch (error) { this.db.exec('ROLLBACK'); throw error; }
+  }
+  #read(id) {
+    const row = this.db.prepare('SELECT * FROM items WHERE id = ?').get(number(id));
+    if (!row) fail('Item not found.');
+    return { ...JSON.parse(row.data), id: itemId(row.id), version: row.version };
+  }
+  #all() {
+    return this.db.prepare('SELECT * FROM items ORDER BY id').all().map(row => ({ ...JSON.parse(row.data), id: itemId(row.id), version: row.version }));
+  }
+  #save(item) {
+    item.updated_at = now();
+    const { id, version, ...data } = item;
+    this.db.prepare('UPDATE items SET version = version + 1, data = ? WHERE id = ?').run(JSON.stringify(data), number(id));
+    return this.get(id);
+  }
+  #edit(id, version, worker, operation) {
+    return this.#transaction(() => {
+      const item = this.#read(id);
+      if (!Number.isSafeInteger(version) || version !== item.version) fail('Item version conflict; show the item and retry deliberately.');
+      if (item.claim && item.claim.worker !== worker) fail('Item is claimed by another worker; use an explicit handoff.');
+      operation(item);
+      return this.#save(item);
+    });
+  }
+  create({ title, details = '', kind = 'idea', priority = 2, session = null } = {}) {
+    text(title, 'title', 500);
+    if (!['idea', 'bug', 'task'].includes(kind)) fail('Invalid kind.');
+    if (![0, 1, 2, 3].includes(priority)) fail('Invalid priority.');
+    if (details !== '') text(details, 'details');
+    if (session !== null) text(session, 'session', 2000);
+    const data = { title, details, kind, priority, session, phase: 'inbox', status: 'queued', scope: null, draft: null, approved_digest: null,
+      claim: null, blocked: null, target_release: null, released_in: null, merge_commit: null, pr_url: null, issue_url: null, notes: [], created_at: now(), updated_at: now() };
+    const result = this.db.prepare('INSERT INTO items(version, data) VALUES (1, ?)').run(JSON.stringify(data));
+    return this.get(itemId(result.lastInsertRowid));
+  }
+  get(id) {
+    return { ...this.#read(id), attachments: this.db.prepare('SELECT id, name, length(bytes) AS size FROM attachments WHERE item_id = ? ORDER BY rowid').all(number(id)).map(row => ({ ...row })) };
+  }
+  list() {
+    return this.#all().map(({ id, version, title, kind, phase, status, priority, claim, blocked, target_release, released_in, issue_url, pr_url }) =>
+      ({ id, version, title, kind, phase, status, priority, claim, blocked, target_release, released_in, issue_url, pr_url }));
+  }
+  summary() {
+    const items = this.list();
+    return { items, active: items.filter(i => i.claim), blocked: items.filter(i => i.blocked && i.phase !== 'archived'),
+      merged_unreleased: items.filter(i => i.status === 'merged' && i.phase !== 'archived'),
+      planned: items.filter(i => i.target_release && i.status !== 'released' && i.phase !== 'archived') };
+  }
+  update(id, version, patch, worker) {
+    return this.#edit(id, version, worker, item => {
+      if (item.phase === 'archived') fail('Item is archived.');
+      const allowed = ['title', 'details', 'priority', 'blocked', 'target_release', 'status', 'merge_commit', 'released_in', 'pr_url', 'note'];
+      if (!Object.keys(patch).length || Object.keys(patch).some(k => !allowed.includes(k))) fail('Invalid update fields.');
+      for (const [key, value] of Object.entries(patch)) {
+        if (key === 'priority') { if (![0, 1, 2, 3].includes(value)) fail('Invalid priority.'); }
+        else if (['blocked', 'target_release'].includes(key)) { if (value !== null) text(value, key, 2000); }
+        else text(value, key, key === 'title' ? 500 : MAX_TEXT);
+      }
+      const status = patch.status ?? item.status;
+      if (!['queued', 'in_progress', 'review', 'merged', 'released'].includes(status)) fail('Invalid work status.');
+      if (status !== 'queued' && !['ready', 'published'].includes(item.phase)) fail('Finish scope before implementation.');
+      if (item.status === 'released' && status !== 'released') fail('Released work cannot move backwards.');
+      if (item.status === 'merged' && !['merged', 'released'].includes(status)) fail('Merged work cannot move backwards.');
+      if (status === 'released' && !['merged', 'released'].includes(item.status)) fail('Work must be merged before recording a release.');
+      if (['merged', 'released'].includes(status) && !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(patch.merge_commit ?? item.merge_commit ?? '')) fail('Record the verified merge commit.');
+      if (status === 'released' && !/^v?\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(patch.released_in ?? item.released_in ?? '')) fail('Record the actual release tag.');
+      if (patch.released_in && status !== 'released') fail('Use released status for an actual release.');
+      if (patch.pr_url) this.#githubUrl(patch.pr_url, 'pull');
+      const { note, ...fields } = patch;
+      Object.assign(item, fields);
+      if (note) item.notes.push({ at: now(), text: note });
+      if (['merged', 'released'].includes(status)) item.claim = null;
+    });
+  }
+  setScope(id, version, scope, worker) {
+    return this.#edit(id, version, worker, item => {
+      if (item.phase === 'published' || item.phase === 'archived' || item.status !== 'queued') fail('Cannot rescope this item; capture a follow-up.');
+      const keys = ['problem', 'outcome', 'in_scope', 'out_of_scope', 'acceptance', 'questions'];
+      if (!scope || Object.keys(scope).some(k => !keys.includes(k))) fail('Invalid scope fields.');
+      text(scope.problem, 'problem'); text(scope.outcome, 'outcome');
+      strings(scope.in_scope, 'in_scope', true); strings(scope.out_of_scope, 'out_of_scope');
+      strings(scope.acceptance, 'acceptance', true); strings(scope.questions, 'questions');
+      if (Buffer.byteLength(JSON.stringify(scope)) > MAX_TEXT) fail('Scope too large.');
+      item.scope = scope; item.phase = 'scoping'; item.draft = null; item.approved_digest = null;
+    });
+  }
+  markReady(id, version, worker) {
+    return this.#edit(id, version, worker, item => {
+      if (item.status !== 'queued') fail('Cannot reset active implementation by completing scope.');
+      if (!['inbox', 'scoping', 'ready'].includes(item.phase) || !item.scope) fail('Complete the private scope first.');
+      if (item.scope.questions.length) fail('Resolve the open questions first.');
+      item.phase = 'ready'; item.claim = null;
+    });
+  }
+  next(lane, claim) {
+    if (!['scope', 'build'].includes(lane)) fail('Lane must be scope or build.');
+    text(claim.worker, 'worker', 2000);
+    for (const key of ['session', 'branch', 'worktree']) if (claim[key] !== undefined) text(claim[key], key, 4000);
+    return this.#transaction(() => {
+      const item = this.#all().filter(i => !i.claim && !i.blocked && (lane === 'scope'
+        ? ['inbox', 'scoping'].includes(i.phase)
+        : ['ready', 'published'].includes(i.phase) && ['queued', 'in_progress'].includes(i.status)))
+        .sort((a, b) => a.priority - b.priority || number(a.id) - number(b.id))[0];
+      if (!item) return null;
+      item.claim = { worker: claim.worker, lane, session: claim.session ?? null, branch: claim.branch ?? null, worktree: claim.worktree ?? null, at: now() };
+      if (lane === 'scope') item.phase = 'scoping'; else item.status = 'in_progress';
+      return this.#save(item);
+    });
+  }
+  release(id, version, worker) {
+    return this.#edit(id, version, worker, item => { if (!item.claim) fail('Item is not claimed.'); item.claim = null; });
+  }
+  handoff(id, version, worker, to) {
+    text(to, 'new worker', 2000);
+    return this.#edit(id, version, worker, item => { if (!item.claim) fail('Item is not claimed.'); item.claim.worker = to; item.claim.at = now(); });
+  }
+  archive(id, version, worker) {
+    return this.#edit(id, version, worker, item => { item.phase = 'archived'; item.claim = null; item.approved_digest = null; });
+  }
+  setDraft(id, version, draft, worker) {
+    return this.#edit(id, version, worker, item => {
+      if (item.phase !== 'ready') fail('Finish scope before drafting a public issue.');
+      text(draft.title, 'public title', 500); text(draft.body, 'public body');
+      // Deliberately reconstruct the projection, never merge a private record.
+      item.draft = { title: draft.title, body: draft.body }; item.approved_digest = null;
+    });
+  }
+  preview(id) {
+    const item = this.#read(id);
+    if (!item.draft) fail('Write a separate public draft first.');
+    return { repository: this.publicRepo, ...item.draft, digest: digest(item.draft) };
+  }
+  approve(id, version, expectedDigest, worker) {
+    return this.#edit(id, version, worker, item => {
+      if (item.phase !== 'ready' || !item.draft) fail('Write a public draft after scope.');
+      if (expectedDigest !== digest(item.draft)) fail('Public draft digest changed; preview it again.');
+      item.approved_digest = expectedDigest;
+    });
+  }
+  #approved(item, expectedDigest) {
+    if (item.phase !== 'ready' || !item.draft || !item.approved_digest || item.approved_digest !== expectedDigest || digest(item.draft) !== expectedDigest) fail('Exact public draft approval is required.');
+  }
+  export(id, expectedDigest) {
+    const item = this.#read(id); this.#approved(item, expectedDigest);
+    return { title: item.draft.title, body: item.draft.body };
+  }
+  #githubUrl(value, kind) {
+    if (!this.publicRepo) fail('Configure a public repository before recording an issue URL.');
+    const prefix = `https://github.com/${this.publicRepo}/${kind}/`;
+    if (typeof value !== 'string' || !value.startsWith(prefix) || !/^[1-9]\d*$/.test(value.slice(prefix.length))) fail('Invalid issue URL or pull request URL for this repository.');
+  }
+  published(id, version, expectedDigest, url, worker) {
+    return this.#edit(id, version, worker, item => {
+      this.#approved(item, expectedDigest); this.#githubUrl(url, 'issues');
+      item.phase = 'published'; item.issue_url = url;
+    });
+  }
+  attach(id, version, path, worker) {
+    const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
+    let bytes;
+    try {
+      const stat = fstatSync(fd);
+      if (!stat.isFile() || stat.size > MAX_ATTACHMENT) fail('Attachment must be a regular file up to 20 MiB.');
+      bytes = readFileSync(fd);
+      if (bytes.length > MAX_ATTACHMENT) fail('Attachment exceeds 20 MiB.');
+    } finally { closeSync(fd); }
+    return this.#edit(id, version, worker, item => {
+      if (item.phase === 'archived') fail('Item is archived.');
+      this.db.prepare('INSERT INTO attachments VALUES (?, ?, ?, ?)').run(randomUUID(), number(id), basename(path), bytes);
+    });
+  }
+  extract(attachmentId, path) {
+    const row = this.db.prepare('SELECT bytes FROM attachments WHERE id = ?').get(attachmentId);
+    if (!row) fail('Attachment not found.');
+    const output = outsideGit(path);
+    writeFileSync(output, row.bytes, { flag: 'wx', mode: 0o600 });
+    return { saved: output, size: row.bytes.length };
+  }
+}
diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
index 74cfcbe5..c222ac4e 100644
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -50,0 +51,2 @@ jobs:
+    - name: Private intake workflow regressions
+      run: nix develop -c node --test .agents/skills/hennery-work/scripts/intake.test.mjs
diff --git a/docs/README.md b/docs/README.md
index 6f2124f4..f54dcf9f 100644
--- a/docs/README.md
+++ b/docs/README.md
@@ -7,0 +8,4 @@ slice); everything else is design. The maintainer's decisions are recorded below
+For private ideas, screenshots, scoping and work pickup, use the
+[private intake workflow](private-intake.md) and its repo-local skill. Its
+state stays outside Git; public issues are separate approved projections.
+
@@ -146,0 +151,2 @@ slice); everything else is design. The maintainer's decisions are recorded below
+   - [Private intake workflow](plans/2026-10-22-private-intake.md) — repo-local skill and private queue shared by local worktrees, structured scoping, approved public projections and implementation/release tracking. Local verification passed: 18 integration tests, 23 removal probes, 4×3 concurrency and six Rust gates (2,953 passed, 9 ignored). The PR carries platform CI and review outcomes.
+
diff --git a/docs/private-intake.md b/docs/private-intake.md
new file mode 100644
index 00000000..0af6406c
--- /dev/null
+++ b/docs/private-intake.md
@@ -0,0 +1,192 @@
+# Private intake and work queue
+
+This repository workflow captures raw ideas, screenshots and bugs privately,
+scopes them, and prepares separately reviewed public issues. It uses a local
+SQLite store and the [hennery-work skill](../.agents/skills/hennery-work/SKILL.md).
+It does not add a task hub, web screen or service to the Hennery application.
+
+## Storage and discovery
+
+Run from any worktree using the existing flake's Node (24.14 or newer):
+
+```sh
+nix develop -c node .agents/skills/hennery-work/scripts/intake.mjs init
+nix develop -c node .agents/skills/hennery-work/scripts/intake.mjs status
+```
+
+The default store is `$XDG_DATA_HOME/hennery-work/<project hash>` or
+`~/.local/share/hennery-work/<project hash>`. The hash comes from the canonical
+Git common directory, so linked worktrees on this machine share the queue.
+`init` prints the actual location; opening an uninitialized store refuses to
+create one implicitly. `--store /absolute/private/path` or `HENNERY_WORK_STORE`
+overrides the location. All sessions using an override must choose the same
+one. The store records its repository identity and refuses a different repo.
+
+The CLI rejects stores and attachment exports inside any Git working tree,
+including ignored directories and linked worktrees. The store directory is
+0700, the database and extracted files 0600. Attachments are copied as blobs
+into the same private database; deleting a source file does not lose the copy.
+Links for the database/store are refused. Files are limited to 20 MiB and text
+fields to 256 KiB. SQLite transactions serialize reservations and edits.
+
+This is local persistence under the current OS user, not encryption or a
+Hennery hat-isolation mechanism. It is not synchronized between hosts. Do not
+share its path with sessions that must not see the same material. Moving a repo
+changes its default key and recorded identity; keep the old store and arrange
+a deliberate migration rather than initializing over it. Back up a **closed**
+store using existing private backup tooling. No new external service is needed.
+
+Codex supports repo-local skills in `.agents/skills`; see the
+[official skills guidance](https://learn.chatgpt.com/docs/build-skills).
+New sessions in a checkout containing this change can discover the skill.
+For a runtime which does not discover that directory, put this instruction in
+its session brief: "Use `.agents/skills/hennery-work/SKILL.md` for private intake,
+scoping, task pickup and release tracking." This change does not install global
+skills or alter agent configuration. Older worktrees can invoke the script by
+its absolute path in a checkout containing it, while keeping their own worktree
+as cwd. For example, use `nix develop -c node /absolute/checkout/.agents/skills/hennery-work/scripts/intake.mjs status`.
+The repository context comes from cwd, not the script location; the integration
+tests exercise exactly this case. After merging/updating a worktree, the relative
+command above is available there too.
+
+## Lifecycle
+
+`inbox → scoping → ready → published` describes preparation of an issue.
+An item can remain private at `ready`; `archived` retains its original evidence.
+Archiving is not erasure. `queued → in_progress → review → merged → released`
+tracks implementation separately. No stage causes an agent start, a GitHub
+request or a release. Ready items need not become public issues.
+
+All CLI commands print private JSON except `export`, whose output is a public
+projection. Treat private titles, filenames, scope and queue summaries as
+private even if the corresponding code change is public.
+
+## Commands
+
+The examples use synthetic input. IDs and versions are illustrative: use the
+actual `id` and `version` from each command. Put every working file named below
+in the private store directory or another directory outside Git.
+
+The command prefix below is abbreviated as `intake` for readability; there is
+no installed executable or alias:
+
+```text
+nix develop -c node .agents/skills/hennery-work/scripts/intake.mjs
+```
+
+Capture needs only a title. `--file` adds raw private text; `--file -` reads stdin.
+
+```text
+intake capture --kind bug --title "Menu covers the action" --file /private/intake/raw.md --session SESSION_ID
+intake attach HIN-000001 --version 1 --file /private/intake/screenshot.png
+intake list
+intake show HIN-000001
+intake next --lane scope --worker SESSION_ID --session SESSION_ID
+```
+
+`next --lane scope` selects unclaimed, unblocked `inbox`/`scoping` records.
+`next --lane build` selects unclaimed, unblocked `ready`/`published` records
+whose work is queued or in progress. Priority 0 is highest, 3 lowest, default 2;
+ties use capture order. Claims persist across crashes and session restarts.
+
+Scoping input is JSON with exactly these fields:
+
+```json
+{
+  "problem": "A menu covers its action on a narrow screen.",
+  "outcome": "The action remains reachable.",
+  "in_scope": ["Menu layout"],
+  "out_of_scope": ["Navigation redesign"],
+  "acceptance": ["The action can be used at the supported narrow width."],
+  "questions": []
+}
+```
+
+```text
+intake scope HIN-000001 --version 3 --file /private/intake/scope.json --worker SESSION_ID
+intake ready HIN-000001 --version 4 --worker SESSION_ID
+```
+
+Saving scope clears an earlier public draft and its approval. `ready` requires
+a complete scope and no open questions, then releases the scoping reservation.
+Once implementation starts, capture a follow-up rather than silently changing
+the agreed scope of active work.
+
+`update --file` accepts a private JSON patch with these optional fields:
+`title`, `details`, `priority` (0–3), `blocked` (text or null), `target_release`
+(text or null), `status`, `merge_commit`, `released_in`, `pr_url`, `note`.
+`note` appends a timestamped handoff/result rather than replacing prior notes.
+Pass `--worker` when the record is reserved.
+
+```text
+intake next --lane build --worker BUILDER --session SESSION_ID --branch feat/example --worktree /private/worktree
+intake update HIN-000001 --version 6 --file /private/intake/progress.json --worker BUILDER
+intake handoff HIN-000001 --version 7 --worker BUILDER --to REVIEWER
+intake release HIN-000001 --version 8 --worker REVIEWER
+intake archive HIN-000001 --version 9
+```
+
+A version conflict means another session changed the record: reread and
+reconcile. A claim cannot be overwritten by another worker's ordinary edit.
+Handoff is explicit recovery, not authentication against someone with access
+to the store. Branch/worktree references and notes survive transfer; update
+the handoff note when the incoming session uses a different worktree.
+
+## Public preparation
+
+`init` recognizes a GitHub `origin`; `init --public-repo OWNER/REPO` can specify
+the destination when origin is absent or another host. Existing stores retain
+their configured destination. Public URLs must name that exact repository.
+
+Write the public title/body independently using synthetic details. Preview
+contains the exact strings and their SHA-256 digest, but no raw attachments,
+private title, scope, session references or intake link.
+
+```text
+intake draft HIN-000001 --version 5 --title "Keep the menu action reachable" --file /private/intake/public-body.md
+intake preview HIN-000001
+```
+
+Show the destination and exact draft to the user. After explicit approval:
+
+```text
+intake approve HIN-000001 --version 6 --digest APPROVED_SHA256
+intake export HIN-000001 --digest APPROVED_SHA256
+```
+
+Export returns only `{"title":"…","body":"…"}`. Approval records the reviewed
+bytes, not a wildcard permission to publish a future rewrite. Changed drafts
+invalidate approval; there is no automated privacy-classification guarantee.
+The CLI does not upload files, issue network requests or invoke GitHub tools.
+An authorized independent session may publish the approved projection using the
+verified personal GitHub account. Explicitly delegated children follow their
+brief's publication restrictions; do not infer a parent from a worktree or fleet
+file. Keep raw intake material private in either case.
+If publication's outcome is uncertain, the publisher checks for an existing
+issue before retrying. After confirmed creation, record:
+
+```text
+intake published HIN-000001 --version 7 --digest APPROVED_SHA256 --url https://github.com/OWNER/REPO/issues/123
+```
+
+`extract --attachment UUID --out /private/intake/recovered.png` recovers an
+original privately, refusing existing destinations or paths inside Git. It is
+never part of public export.
+
+## Releases and remaining setup
+
+Use `target_release` for planned scope, `status: "merged"` plus the verified
+full `merge_commit` for main, and subsequently `status: "released"` plus
+`released_in` for the actual published tag. A planned version is not evidence
+that a change shipped. `status` shows claims, blocked work, planned releases
+and merged-but-unreleased items. The authorized session verifies PRs, merge commits and
+published release contents before recording those facts.
+
+An authorized session can configure a GitHub Project, labels and milestones separately
+when its account access is authorized. This CLI intentionally has no GitHub
+credentials or publication action. A ready record and approved projection are
+usable before that setup, and private implementation need not wait for it.
+
+Verification: `nix develop -c node --test .agents/skills/hennery-work/scripts/intake.test.mjs`.
+The test uses synthetic data, isolated Git configuration and private temporary
+directories, including a real linked worktree and concurrent CLI processes.
```

## After this plan

- Complete PR review and current-head CI, then merge through the normal flow.
  Worktrees need the merged tool/skill files or an absolute script path.
- Optionally initialize the private store from a session when first
  capturing an actual item; initialization creates no public issue.
- Configure GitHub Project/labels/milestones using the verified account when
  authorized. Only explicitly delegated children inherit parent restrictions.
- Runtimes without repo skill discovery can load the exact SKILL.md from their
  brief. No global config or skill installation was silently performed.
- Cross-host synchronization and an in-app inbox are separate product scope.
