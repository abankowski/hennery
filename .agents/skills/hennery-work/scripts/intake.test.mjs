import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, statSync, chmodSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { Intake, context } from './store.mjs';

const cli = join(dirname(fileURLToPath(import.meta.url)), 'intake.mjs');
const scope = { problem: 'A menu covers its action.', outcome: 'The action stays reachable.', in_scope: ['Menu layout'], out_of_scope: ['Navigation redesign'], acceptance: ['The action is reachable at a narrow width.'], questions: [] };
const root = mkdtempSync(join(tmpdir(), 'hennery-intake-tests-'));
const env = { ...process.env, HOME: root, XDG_CONFIG_HOME: join(root, 'config'), GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
let sequence = 0;
function fixture() {
  const base = join(root, `case-${++sequence}`);
  mkdirSync(base);
  const path = join(base, 'private');
  const store = new Intake(path, { project: 'fixture', publicRepo: 'example/project', create: true });
  return { base, path, store };
}
function ready(store) {
  let item = store.create({ title: 'PRIVATE TITLE', details: 'PRIVATE CUSTOMER DETAIL', kind: 'bug' });
  item = store.setScope(item.id, item.version, scope);
  return store.markReady(item.id, item.version);
}
function drafted(store) {
  const item = ready(store);
  return store.setDraft(item.id, item.version, { title: 'Keep the action reachable', body: 'Use a synthetic menu at a narrow width.' });
}
function command(args, cwd = root) {
  return execFileSync(process.execPath, [cli, ...args], { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}
function git(repo, ...args) {
  return execFileSync('git', ['-C', repo, ...args], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function repository(base) {
  const repo = join(base, 'repo');
  mkdirSync(repo);
  git(repo, 'init', '-q');
  git(repo, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-q', '--allow-empty', '-m', 'test');
  return repo;
}

test('capture persists across sessions and keeps private files owner-only', () => {
  const { path, store } = fixture();
  const item = store.create({ title: 'An idea', details: 'Raw context', kind: 'idea', session: 'private-session' });
  store.close();
  const reopened = new Intake(path, { project: 'fixture' });
  assert.equal(reopened.get(item.id).details, 'Raw context');
  assert.equal(reopened.get(item.id).session, 'private-session');
  assert.equal(statSync(path).mode & 0o777, 0o700);
  assert.equal(statSync(join(path, 'intake.sqlite')).mode & 0o777, 0o600);
  reopened.close();
});

test('stores refuse Git trees including linked worktrees and symlink aliases', () => {
  const { base, store } = fixture(); store.close();
  const repo = repository(base);
  assert.throws(() => new Intake(join(repo, 'private'), { project: 'x', create: true }), /outside Git/);
  const alias = join(base, 'alias'); symlinkSync(repo, alias);
  assert.throws(() => new Intake(join(alias, 'private'), { project: 'x', create: true }), /outside Git/);
  const linked = join(base, 'linked'); git(repo, 'worktree', 'add', '-q', '-b', 'another', linked);
  assert.throws(() => new Intake(join(linked, 'private'), { project: 'x', create: true }), /outside Git/);
});

test('repo context maps every worktree to one store, but isolates other repositories', () => {
  const { base, store } = fixture(); store.close();
  const repo = repository(base);
  const linked = join(base, 'linked'); git(repo, 'worktree', 'add', '-q', '-b', 'another', linked);
  const a = context(repo, undefined, { XDG_DATA_HOME: join(base, 'data') });
  const b = context(linked, undefined, { XDG_DATA_HOME: join(base, 'data') });
  assert.equal(a.path, b.path);
  assert.equal(a.project, b.project);
  const otherBase = join(base, 'other'); mkdirSync(otherBase);
  assert.notEqual(a.path, context(repository(otherBase), undefined, { XDG_DATA_HOME: join(base, 'data') }).path);
});

test('opening does not initialize stores or accept another project or a loose database', () => {
  const { base, path, store } = fixture(); store.close();
  assert.throws(() => new Intake(join(base, 'missing'), { project: 'fixture' }), /not initialized/);
  assert.throws(() => new Intake(path, { project: 'other' }), /different repository/);
  chmodSync(join(path, 'intake.sqlite'), 0o644);
  assert.throws(() => new Intake(path, { project: 'fixture' }), /owner-only/);
});

test('optimistic versions preserve another session edits', () => {
  const { store } = fixture();
  const item = store.create({ title: 'First' });
  store.update(item.id, item.version, { title: 'Second' });
  assert.throws(() => store.update(item.id, item.version, { title: 'Lost update' }), /version conflict/);
  assert.equal(store.get(item.id).title, 'Second');
  store.close();
});

test('ready requires complete scoping and answers to open questions', () => {
  const { store } = fixture();
  let item = store.create({ title: 'Idea' });
  assert.throws(() => store.markReady(item.id, item.version), /scope/);
  assert.throws(() => store.setScope(item.id, item.version, { ...scope, acceptance: [] }), /acceptance/);
  item = store.setScope(item.id, item.version, { ...scope, questions: ['Which behavior?'] });
  assert.throws(() => store.markReady(item.id, item.version), /questions/);
  item = store.setScope(item.id, item.version, scope);
  assert.equal(store.markReady(item.id, item.version).phase, 'ready');
  store.close();
});

test('private attachments round-trip without entering the public payload', () => {
  const { base, store } = fixture();
  let item = drafted(store);
  const source = join(base, 'private-customer-screen.bin'); writeFileSync(source, 'PRIVATE IMAGE BYTES');
  item = store.attach(item.id, item.version, source);
  const preview = store.preview(item.id);
  item = store.approve(item.id, item.version, preview.digest);
  const payload = store.export(item.id, preview.digest);
  assert.deepEqual(payload, { title: 'Keep the action reachable', body: 'Use a synthetic menu at a narrow width.' });
  assert.doesNotMatch(JSON.stringify(payload), /PRIVATE|private-customer|session|attachments|scope/);
  const dest = join(base, 'recovered.bin');
  store.extract(item.attachments[0].id, dest);
  assert.equal(readFileSync(dest, 'utf8'), 'PRIVATE IMAGE BYTES');
  assert.equal(statSync(dest).mode & 0o777, 0o600);
  assert.throws(() => store.extract(item.attachments[0].id, dest), /exists/);
  const repo = repository(base);
  assert.throws(() => store.extract(item.attachments[0].id, join(repo, 'leak.bin')), /outside Git/);
  store.close();
});

test('approval binds exact public bytes and edits invalidate it', () => {
  const { store } = fixture();
  let item = drafted(store);
  const first = store.preview(item.id);
  assert.equal(first.repository, 'example/project');
  assert.throws(() => store.export(item.id, first.digest), /approval/);
  assert.throws(() => store.approve(item.id, item.version, '0'.repeat(64)), /digest/);
  item = store.approve(item.id, item.version, first.digest);
  assert.equal(store.export(item.id, first.digest).title, first.title);
  item = store.setDraft(item.id, item.version, { title: 'Changed', body: first.body });
  assert.equal(item.approved_digest, null);
  assert.throws(() => store.export(item.id, first.digest), /approval/);
  assert.throws(() => store.approve(item.id, item.version, first.digest), /digest/);
  item = store.setDraft(item.id, item.version, { title: first.title, body: first.body });
  assert.throws(() => store.export(item.id, first.digest), /approval/);
  const second = store.preview(item.id);
  item = store.approve(item.id, item.version, second.digest);
  item = store.setScope(item.id, item.version, { ...scope, outcome: 'A different outcome.' });
  assert.equal(item.phase, 'scoping');
  assert.equal(item.draft, null);
  assert.throws(() => store.export(item.id, second.digest), /draft|approval/);
  store.close();
});

test('public issue receipts require approval and the configured repository', () => {
  const { store } = fixture();
  let item = drafted(store); const draft = store.preview(item.id);
  assert.throws(() => store.published(item.id, item.version, draft.digest, 'https://github.com/example/project/issues/12'), /approval/);
  item = store.approve(item.id, item.version, draft.digest);
  for (const url of ['https://github.com/other/project/issues/12', 'https://github.com/example/project/issues/12?x=private', 'http://github.com/example/project/issues/12']) {
    assert.throws(() => store.published(item.id, item.version, draft.digest, url), /issue URL/);
  }
  item = store.published(item.id, item.version, draft.digest, 'https://github.com/example/project/issues/12');
  assert.equal(item.phase, 'published');
  assert.equal(item.issue_url, 'https://github.com/example/project/issues/12');
  store.close();
});

test('scoping and implementation are separate queues; blocked and archived topics stay out', () => {
  const { store } = fixture();
  const inbox = store.create({ title: 'Scope me', priority: 1 });
  let blocked = store.create({ title: 'Blocked', priority: 0 });
  store.update(blocked.id, blocked.version, { blocked: 'Needs a decision' });
  const done = store.create({ title: 'Drop this', priority: 0 }); store.archive(done.id, done.version);
  const build = ready(store);
  assert.equal(store.next('scope', { worker: 'scoper' }).id, inbox.id);
  assert.equal(store.next('build', { worker: 'builder', session: 's2', branch: 'feat/example', worktree: '/private/worktree' }).id, build.id);
  assert.equal(store.next('scope', { worker: 'another' }), null);
  store.close();
});

test('highest priority and oldest capture win within an eligible queue', () => {
  const { store } = fixture();
  store.create({ title: 'Later priority', priority: 3 });
  const first = store.create({ title: 'First urgent', priority: 0 });
  const second = store.create({ title: 'Second urgent', priority: 0 });
  assert.equal(store.next('scope', { worker: 'one' }).id, first.id);
  assert.equal(store.next('scope', { worker: 'two' }).id, second.id);
  store.close();
});

test('claims survive reconnects, protect edits and require explicit release or handoff', () => {
  const { store, path } = fixture();
  const created = store.create({ title: 'Idea' });
  const claimed = store.next('scope', { worker: 'session-one' }); store.close();
  const again = new Intake(path, { project: 'fixture' });
  assert.equal(again.next('scope', { worker: 'session-two' }), null);
  assert.throws(() => again.update(created.id, claimed.version, { title: 'Wrong worker' }, 'session-two'), /claimed/);
  const handed = again.handoff(created.id, claimed.version, 'session-one', 'session-two');
  assert.equal(handed.claim.worker, 'session-two');
  const released = again.release(created.id, handed.version, 'session-two');
  assert.equal(released.claim, null);
  assert.equal(again.next('scope', { worker: 'session-three' }).id, created.id);
  again.close();
});

test('finishing a claimed scope durably frees it for a different implementation session', () => {
  const { store, path } = fixture();
  store.create({ title: 'Scope then build' });
  let item = store.next('scope', { worker: 'scoper' });
  item = store.setScope(item.id, item.version, scope, 'scoper');
  item = store.markReady(item.id, item.version, 'scoper');
  assert.equal(item.claim, null);
  store.close();
  const builder = new Intake(path, { project: 'fixture' });
  const picked = builder.next('build', { worker: 'builder', branch: 'feat/example', worktree: '/private/worktree' });
  assert.equal(picked.id, item.id);
  assert.equal(picked.status, 'in_progress');
  assert.equal(picked.claim.worker, 'builder');
  assert.equal(picked.claim.branch, 'feat/example');
  builder.close();
});

test('target release, merge and actual release are distinct recorded facts', () => {
  const { store } = fixture();
  let item = ready(store);
  item = store.update(item.id, item.version, { target_release: '0.4.0' });
  assert.equal(item.released_in, null);
  assert.throws(() => store.update(item.id, item.version, { status: 'released', released_in: '0.4.0' }), /merged/);
  assert.throws(() => store.update(item.id, item.version, { status: 'merged' }), /merge commit/);
  item = store.update(item.id, item.version, { status: 'merged', merge_commit: 'a'.repeat(40) });
  assert.equal(store.summary().merged_unreleased[0].id, item.id);
  item = store.update(item.id, item.version, { status: 'released', released_in: '0.4.1' });
  assert.equal(item.target_release, '0.4.0');
  assert.equal(item.released_in, '0.4.1');
  assert.equal(store.summary().merged_unreleased.length, 0);
  store.close();
});

test('active implementation cannot be reset by marking scope ready again', () => {
  const { store } = fixture();
  ready(store);
  const item = store.next('build', { worker: 'builder' });
  assert.throws(() => store.markReady(item.id, item.version, 'builder'), /implementation/);
  assert.equal(store.get(item.id).claim.worker, 'builder');
  store.close();
});

test('release recording cannot replace verified merge evidence with an invalid value', () => {
  const { store } = fixture();
  let item = ready(store);
  item = store.update(item.id, item.version, { status: 'merged', merge_commit: 'a'.repeat(40) });
  assert.throws(() => store.update(item.id, item.version, { status: 'released', released_in: '0.4.0', merge_commit: 'invalid' }), /merge commit/);
  assert.equal(store.get(item.id).status, 'merged');
  store.close();
});

test('CLI is usable from separate worktrees and publishes only an approved projection', () => {
  const { base, store } = fixture(); store.close();
  const repo = repository(base);
  git(repo, 'remote', 'add', 'origin', 'git@github.com:example/project.git');
  const linked = join(base, 'linked'); git(repo, 'worktree', 'add', '-q', '-b', 'another', linked);
  const path = join(base, 'cli-private');
  const run = (args, cwd = repo) => JSON.parse(command(['--store', path, ...args], cwd));
  run(['init']);
  let item = run(['capture', '--title', 'PRIVATE TITLE', '--kind', 'bug', '--session', 'private-session']);
  assert.equal(run(['list'], linked)[0].id, item.id);
  const scopeFile = join(base, 'scope.json'); writeFileSync(scopeFile, JSON.stringify(scope));
  item = run(['scope', item.id, '--version', String(item.version), '--file', scopeFile]);
  item = run(['ready', item.id, '--version', String(item.version)]);
  const body = join(base, 'body.md'); writeFileSync(body, 'A public description.');
  item = run(['draft', item.id, '--version', String(item.version), '--title', 'Public title', '--file', body]);
  const preview = run(['preview', item.id]);
  item = run(['approve', item.id, '--version', String(item.version), '--digest', preview.digest]);
  assert.deepEqual(run(['export', item.id, '--digest', preview.digest]), { title: 'Public title', body: 'A public description.' });
  assert.equal(run(['show', item.id]).session, 'private-session');
  assert.throws(() => command(['--store', path, 'capture', '--title', 'PRIVATE_ERROR_MARKER', '--unknown'], repo), error => {
    assert.doesNotMatch(error.stderr, /PRIVATE_ERROR_MARKER|at file:/);
    return error.status === 1;
  });
});

test('concurrent sessions cannot claim the same topic', async () => {
  const { base, store } = fixture(); store.close();
  const repo = repository(base); const path = join(base, 'concurrent-private');
  command(['--store', path, 'init'], repo);
  const topic = JSON.parse(command(['--store', path, 'capture', '--title', 'One topic'], repo));
  const results = await Promise.all(Array.from({ length: 4 }, (_, i) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, '--store', path, 'next', '--lane', 'scope', '--worker', `worker-${i}`], { cwd: repo, env });
    let output = ''; let errors = '';
    child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { errors += chunk; });
    child.on('error', reject); child.on('close', code => code === 0 ? resolve(JSON.parse(output)) : reject(new Error(errors)));
  })));
  const winners = results.filter(Boolean);
  assert.equal(winners.length, 1);
  assert.equal(winners[0].id, topic.id);
});
