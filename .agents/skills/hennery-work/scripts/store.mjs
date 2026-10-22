import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, lstatSync, openSync, closeSync, readFileSync, writeFileSync, fstatSync, constants } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { homedir } from 'node:os';

const APP_ID = 0x48494e54;
const MAX_TEXT = 256 * 1024;
const MAX_ATTACHMENT = 20 * 1024 * 1024;
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail = message => { throw new Error(message); };
const now = () => new Date().toISOString();
const itemId = value => `HIN-${String(value).padStart(6, '0')}`;
function number(id) {
  if (!/^HIN-\d{6,}$/.test(id) || !Number.isSafeInteger(Number(id.slice(4))) || Number(id.slice(4)) < 1) fail('Invalid item id.');
  return Number(id.slice(4));
}
function text(value, label, max = MAX_TEXT) {
  if (typeof value !== 'string' || !value.trim() || Buffer.byteLength(value) > max || value.includes('\0')) fail(`Invalid ${label}.`);
  return value;
}
function strings(value, label, required = false) {
  if (!Array.isArray(value) || value.length > 100 || (required && value.length === 0)) fail(`Invalid ${label}.`);
  value.forEach(v => text(v, label));
  return value;
}

// Resolve aliases before checking ancestors: even an ignored path in a Git tree
// is an unsuitable home for raw evidence. The check also covers linked worktrees.
export function outsideGit(path) {
  let ancestor = resolve(path);
  const suffix = [];
  while (!existsSync(ancestor)) {
    suffix.unshift(basename(ancestor));
    const parent = dirname(ancestor);
    if (parent === ancestor) fail('Cannot resolve private path.');
    ancestor = parent;
  }
  const canonical = join(realpathSync(ancestor), ...suffix);
  for (let dir = canonical; ; dir = dirname(dir)) {
    if (existsSync(join(dir, '.git'))) fail('Private data must stay outside Git working trees.');
    if (dirname(dir) === dir) break;
  }
  return canonical;
}

function ownerOnly(path, directory) {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile()) || (!directory && stat.nlink !== 1)
      || (typeof process.getuid === 'function' && stat.uid !== process.getuid()) || (stat.mode & 0o077)) {
    fail('Private store must be owner-only, without links.');
  }
}

export function context(repo = process.cwd(), store, env = process.env) {
  let project;
  try {
    project = realpathSync(execFileSync('git', ['-C', repo, 'rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim());
  } catch { fail('Run from a Git repository or pass --repo.'); }
  let publicRepo = null;
  try {
    const remote = execFileSync('git', ['-C', repo, 'remote', 'get-url', 'origin'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    const match = /^(?:git@github\.com:|https:\/\/github\.com\/)([\w.-]+\/[\w.-]+?)(?:\.git)?$/.exec(remote);
    publicRepo = match?.[1] ?? null;
  } catch { /* A local repository may have no origin yet. */ }
  const path = store ?? env.HENNERY_WORK_STORE ?? join(env.XDG_DATA_HOME || join(homedir(), '.local', 'share'), 'hennery-work', createHash('sha256').update(project).digest('hex').slice(0, 16));
  return { path: resolve(path), project, publicRepo };
}

export class Intake {
  constructor(path, { project, publicRepo = null, create = false } = {}) {
    text(project, 'repository identity');
    if (publicRepo !== null && !/^[\w.-]+\/[\w.-]+$/.test(publicRepo)) fail('Invalid public repository.');
    // Set before mkdir/open or SQLite creates a journal. No WAL/SHM is used.
    process.umask(0o077);
    if (existsSync(path) && lstatSync(path).isSymbolicLink()) fail('Private store must be owner-only, without links.');
    this.path = outsideGit(path);
    const file = join(this.path, 'intake.sqlite');
    if (create) {
      mkdirSync(this.path, { recursive: true, mode: 0o700 });
      ownerOnly(this.path, true);
      const fd = openSync(file, 'wx', 0o600); closeSync(fd);
    } else if (!existsSync(file)) fail('Private store not initialized; run init first.');
    ownerOnly(this.path, true); ownerOnly(file, false);
    try {
      this.db = new DatabaseSync(file, { timeout: 10_000 });
      if (create) {
        this.db.exec(`BEGIN IMMEDIATE;
          PRAGMA application_id = ${APP_ID};
          PRAGMA user_version = 1;
          CREATE TABLE meta (project TEXT NOT NULL, public_repo TEXT);
          CREATE TABLE items (id INTEGER PRIMARY KEY AUTOINCREMENT, version INTEGER NOT NULL, data TEXT NOT NULL);
          CREATE TABLE attachments (id TEXT PRIMARY KEY, item_id INTEGER NOT NULL REFERENCES items(id), name TEXT NOT NULL, bytes BLOB NOT NULL);
        `);
        this.db.prepare('INSERT INTO meta VALUES (?, ?)').run(project, publicRepo);
        this.db.exec('COMMIT');
      }
      if (this.db.prepare('PRAGMA application_id').get().application_id !== APP_ID || this.db.prepare('PRAGMA user_version').get().user_version !== 1) fail('Not a supported intake database.');
      const meta = this.db.prepare('SELECT * FROM meta').get();
      if (meta.project !== project) fail('Store belongs to a different repository.');
      this.publicRepo = meta.public_repo;
      this.db.exec('PRAGMA foreign_keys = ON');
    } catch (error) { this.db?.close(); throw error; }
  }

  close() { this.db.close(); }
  #transaction(operation) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = operation(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  #read(id) {
    const row = this.db.prepare('SELECT * FROM items WHERE id = ?').get(number(id));
    if (!row) fail('Item not found.');
    return { ...JSON.parse(row.data), id: itemId(row.id), version: row.version };
  }
  #all() {
    return this.db.prepare('SELECT * FROM items ORDER BY id').all().map(row => ({ ...JSON.parse(row.data), id: itemId(row.id), version: row.version }));
  }
  #save(item) {
    item.updated_at = now();
    const { id, version, ...data } = item;
    this.db.prepare('UPDATE items SET version = version + 1, data = ? WHERE id = ?').run(JSON.stringify(data), number(id));
    return this.get(id);
  }
  #edit(id, version, worker, operation) {
    return this.#transaction(() => {
      const item = this.#read(id);
      if (!Number.isSafeInteger(version) || version !== item.version) fail('Item version conflict; show the item and retry deliberately.');
      if (item.claim && item.claim.worker !== worker) fail('Item is claimed by another worker; use an explicit handoff.');
      operation(item);
      return this.#save(item);
    });
  }
  create({ title, details = '', kind = 'idea', priority = 2, session = null } = {}) {
    text(title, 'title', 500);
    if (!['idea', 'bug', 'task'].includes(kind)) fail('Invalid kind.');
    if (![0, 1, 2, 3].includes(priority)) fail('Invalid priority.');
    if (details !== '') text(details, 'details');
    if (session !== null) text(session, 'session', 2000);
    const data = { title, details, kind, priority, session, phase: 'inbox', status: 'queued', scope: null, draft: null, approved_digest: null,
      claim: null, blocked: null, target_release: null, released_in: null, merge_commit: null, pr_url: null, issue_url: null, notes: [], created_at: now(), updated_at: now() };
    const result = this.db.prepare('INSERT INTO items(version, data) VALUES (1, ?)').run(JSON.stringify(data));
    return this.get(itemId(result.lastInsertRowid));
  }
  get(id) {
    return { ...this.#read(id), attachments: this.db.prepare('SELECT id, name, length(bytes) AS size FROM attachments WHERE item_id = ? ORDER BY rowid').all(number(id)).map(row => ({ ...row })) };
  }
  list() {
    return this.#all().map(({ id, version, title, kind, phase, status, priority, claim, blocked, target_release, released_in, issue_url, pr_url }) =>
      ({ id, version, title, kind, phase, status, priority, claim, blocked, target_release, released_in, issue_url, pr_url }));
  }
  summary() {
    const items = this.list();
    return { items, active: items.filter(i => i.claim), blocked: items.filter(i => i.blocked && i.phase !== 'archived'),
      merged_unreleased: items.filter(i => i.status === 'merged' && i.phase !== 'archived'),
      planned: items.filter(i => i.target_release && i.status !== 'released' && i.phase !== 'archived') };
  }
  update(id, version, patch, worker) {
    return this.#edit(id, version, worker, item => {
      if (item.phase === 'archived') fail('Item is archived.');
      const allowed = ['title', 'details', 'priority', 'blocked', 'target_release', 'status', 'merge_commit', 'released_in', 'pr_url', 'note'];
      if (!Object.keys(patch).length || Object.keys(patch).some(k => !allowed.includes(k))) fail('Invalid update fields.');
      for (const [key, value] of Object.entries(patch)) {
        if (key === 'priority') { if (![0, 1, 2, 3].includes(value)) fail('Invalid priority.'); }
        else if (['blocked', 'target_release'].includes(key)) { if (value !== null) text(value, key, 2000); }
        else text(value, key, key === 'title' ? 500 : MAX_TEXT);
      }
      const status = patch.status ?? item.status;
      if (!['queued', 'in_progress', 'review', 'merged', 'released'].includes(status)) fail('Invalid work status.');
      if (status !== 'queued' && !['ready', 'published'].includes(item.phase)) fail('Finish scope before implementation.');
      if (item.status === 'released' && status !== 'released') fail('Released work cannot move backwards.');
      if (item.status === 'merged' && !['merged', 'released'].includes(status)) fail('Merged work cannot move backwards.');
      if (status === 'released' && !['merged', 'released'].includes(item.status)) fail('Work must be merged before recording a release.');
      if (['merged', 'released'].includes(status) && !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(patch.merge_commit ?? item.merge_commit ?? '')) fail('Record the verified merge commit.');
      if (status === 'released' && !/^v?\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(patch.released_in ?? item.released_in ?? '')) fail('Record the actual release tag.');
      if (patch.released_in && status !== 'released') fail('Use released status for an actual release.');
      if (patch.pr_url) this.#githubUrl(patch.pr_url, 'pull');
      const { note, ...fields } = patch;
      Object.assign(item, fields);
      if (note) item.notes.push({ at: now(), text: note });
      if (['merged', 'released'].includes(status)) item.claim = null;
    });
  }
  setScope(id, version, scope, worker) {
    return this.#edit(id, version, worker, item => {
      if (item.phase === 'published' || item.phase === 'archived' || item.status !== 'queued') fail('Cannot rescope this item; capture a follow-up.');
      const keys = ['problem', 'outcome', 'in_scope', 'out_of_scope', 'acceptance', 'questions'];
      if (!scope || Object.keys(scope).some(k => !keys.includes(k))) fail('Invalid scope fields.');
      text(scope.problem, 'problem'); text(scope.outcome, 'outcome');
      strings(scope.in_scope, 'in_scope', true); strings(scope.out_of_scope, 'out_of_scope');
      strings(scope.acceptance, 'acceptance', true); strings(scope.questions, 'questions');
      if (Buffer.byteLength(JSON.stringify(scope)) > MAX_TEXT) fail('Scope too large.');
      item.scope = scope; item.phase = 'scoping'; item.draft = null; item.approved_digest = null;
    });
  }
  markReady(id, version, worker) {
    return this.#edit(id, version, worker, item => {
      if (item.status !== 'queued') fail('Cannot reset active implementation by completing scope.');
      if (!['inbox', 'scoping', 'ready'].includes(item.phase) || !item.scope) fail('Complete the private scope first.');
      if (item.scope.questions.length) fail('Resolve the open questions first.');
      item.phase = 'ready'; item.claim = null;
    });
  }
  next(lane, claim) {
    if (!['scope', 'build'].includes(lane)) fail('Lane must be scope or build.');
    text(claim.worker, 'worker', 2000);
    for (const key of ['session', 'branch', 'worktree']) if (claim[key] !== undefined) text(claim[key], key, 4000);
    return this.#transaction(() => {
      const item = this.#all().filter(i => !i.claim && !i.blocked && (lane === 'scope'
        ? ['inbox', 'scoping'].includes(i.phase)
        : ['ready', 'published'].includes(i.phase) && ['queued', 'in_progress'].includes(i.status)))
        .sort((a, b) => a.priority - b.priority || number(a.id) - number(b.id))[0];
      if (!item) return null;
      item.claim = { worker: claim.worker, lane, session: claim.session ?? null, branch: claim.branch ?? null, worktree: claim.worktree ?? null, at: now() };
      if (lane === 'scope') item.phase = 'scoping'; else item.status = 'in_progress';
      return this.#save(item);
    });
  }
  release(id, version, worker) {
    return this.#edit(id, version, worker, item => { if (!item.claim) fail('Item is not claimed.'); item.claim = null; });
  }
  handoff(id, version, worker, to) {
    text(to, 'new worker', 2000);
    return this.#edit(id, version, worker, item => { if (!item.claim) fail('Item is not claimed.'); item.claim.worker = to; item.claim.at = now(); });
  }
  archive(id, version, worker) {
    return this.#edit(id, version, worker, item => { item.phase = 'archived'; item.claim = null; item.approved_digest = null; });
  }
  setDraft(id, version, draft, worker) {
    return this.#edit(id, version, worker, item => {
      if (item.phase !== 'ready') fail('Finish scope before drafting a public issue.');
      text(draft.title, 'public title', 500); text(draft.body, 'public body');
      // Deliberately reconstruct the projection, never merge a private record.
      item.draft = { title: draft.title, body: draft.body }; item.approved_digest = null;
    });
  }
  preview(id) {
    const item = this.#read(id);
    if (!item.draft) fail('Write a separate public draft first.');
    return { repository: this.publicRepo, ...item.draft, digest: digest(item.draft) };
  }
  approve(id, version, expectedDigest, worker) {
    return this.#edit(id, version, worker, item => {
      if (item.phase !== 'ready' || !item.draft) fail('Write a public draft after scope.');
      if (expectedDigest !== digest(item.draft)) fail('Public draft digest changed; preview it again.');
      item.approved_digest = expectedDigest;
    });
  }
  #approved(item, expectedDigest) {
    if (item.phase !== 'ready' || !item.draft || !item.approved_digest || item.approved_digest !== expectedDigest || digest(item.draft) !== expectedDigest) fail('Exact public draft approval is required.');
  }
  export(id, expectedDigest) {
    const item = this.#read(id); this.#approved(item, expectedDigest);
    return { title: item.draft.title, body: item.draft.body };
  }
  #githubUrl(value, kind) {
    if (!this.publicRepo) fail('Configure a public repository before recording an issue URL.');
    const prefix = `https://github.com/${this.publicRepo}/${kind}/`;
    if (typeof value !== 'string' || !value.startsWith(prefix) || !/^[1-9]\d*$/.test(value.slice(prefix.length))) fail('Invalid issue URL or pull request URL for this repository.');
  }
  published(id, version, expectedDigest, url, worker) {
    return this.#edit(id, version, worker, item => {
      this.#approved(item, expectedDigest); this.#githubUrl(url, 'issues');
      item.phase = 'published'; item.issue_url = url;
    });
  }
  attach(id, version, path, worker) {
    const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    let bytes;
    try {
      const stat = fstatSync(fd);
      if (!stat.isFile() || stat.size > MAX_ATTACHMENT) fail('Attachment must be a regular file up to 20 MiB.');
      bytes = readFileSync(fd);
      if (bytes.length > MAX_ATTACHMENT) fail('Attachment exceeds 20 MiB.');
    } finally { closeSync(fd); }
    return this.#edit(id, version, worker, item => {
      if (item.phase === 'archived') fail('Item is archived.');
      this.db.prepare('INSERT INTO attachments VALUES (?, ?, ?, ?)').run(randomUUID(), number(id), basename(path), bytes);
    });
  }
  extract(attachmentId, path) {
    const row = this.db.prepare('SELECT bytes FROM attachments WHERE id = ?').get(attachmentId);
    if (!row) fail('Attachment not found.');
    const output = outsideGit(path);
    writeFileSync(output, row.bytes, { flag: 'wx', mode: 0o600 });
    return { saved: output, size: row.bytes.length };
  }
}
