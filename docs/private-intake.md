# Private intake and work queue

This repository workflow captures raw ideas, screenshots and bugs privately,
scopes them, and prepares separately reviewed public issues. It uses a local
SQLite store and the [hennery-work skill](../.agents/skills/hennery-work/SKILL.md).
It does not add a task hub, web screen or service to the Hennery application.

## Storage and discovery

Run from any worktree using the existing flake's Node (24.14 or newer):

```sh
nix develop -c node .agents/skills/hennery-work/scripts/intake.mjs init
nix develop -c node .agents/skills/hennery-work/scripts/intake.mjs status
```

The default store is `$XDG_DATA_HOME/hennery-work/<project hash>` or
`~/.local/share/hennery-work/<project hash>`. The hash comes from the canonical
Git common directory, so linked worktrees on this machine share the queue.
`init` prints the actual location; opening an uninitialized store refuses to
create one implicitly. `--store /absolute/private/path` or `HENNERY_WORK_STORE`
overrides the location. All sessions using an override must choose the same
one. The store records its repository identity and refuses a different repo.

The CLI rejects stores and attachment exports inside any Git working tree,
including ignored directories and linked worktrees. The store directory is
0700, the database and extracted files 0600. Attachments are copied as blobs
into the same private database; deleting a source file does not lose the copy.
Links for the database/store are refused. Files are limited to 20 MiB and text
fields to 256 KiB. SQLite transactions serialize reservations and edits.

This is local persistence under the current OS user, not encryption or a
Hennery hat-isolation mechanism. It is not synchronized between hosts. Do not
share its path with sessions that must not see the same material. Moving a repo
changes its default key and recorded identity; keep the old store and arrange
a deliberate migration rather than initializing over it. Back up a **closed**
store using existing private backup tooling. No new external service is needed.

Codex supports repo-local skills in `.agents/skills`; see the
[official skills guidance](https://learn.chatgpt.com/docs/build-skills).
New sessions in a checkout containing this change can discover the skill.
For a runtime which does not discover that directory, put this instruction in
its session brief: "Use `.agents/skills/hennery-work/SKILL.md` for private intake,
scoping, task pickup and release tracking." This change does not install global
skills or alter agent configuration. Older worktrees can invoke the script by
its absolute path in a checkout containing it, while keeping their own worktree
as cwd. For example, use `nix develop -c node /absolute/checkout/.agents/skills/hennery-work/scripts/intake.mjs status`.
The repository context comes from cwd, not the script location; the integration
tests exercise exactly this case. After merging/updating a worktree, the relative
command above is available there too.

## Lifecycle

`inbox → scoping → ready → published` describes preparation of an issue.
An item can remain private at `ready`; `archived` retains its original evidence.
Archiving is not erasure. `queued → in_progress → review → merged → released`
tracks implementation separately. No stage causes an agent start, a GitHub
request or a release. Ready items need not become public issues.

All CLI commands print private JSON except `export`, whose output is a public
projection. Treat private titles, filenames, scope and queue summaries as
private even if the corresponding code change is public.

## Commands

The examples use synthetic input. IDs and versions are illustrative: use the
actual `id` and `version` from each command. Put every working file named below
in the private store directory or another directory outside Git.

The command prefix below is abbreviated as `intake` for readability; there is
no installed executable or alias:

```text
nix develop -c node .agents/skills/hennery-work/scripts/intake.mjs
```

Capture needs only a title. `--file` adds raw private text; `--file -` reads stdin.

```text
intake capture --kind bug --title "Menu covers the action" --file /private/intake/raw.md --session SESSION_ID
intake attach HIN-000001 --version 1 --file /private/intake/screenshot.png
intake list
intake show HIN-000001
intake next --lane scope --worker SESSION_ID --session SESSION_ID
```

`next --lane scope` selects unclaimed, unblocked `inbox`/`scoping` records.
`next --lane build` selects unclaimed, unblocked `ready`/`published` records
whose work is queued or in progress. Priority 0 is highest, 3 lowest, default 2;
ties use capture order. Claims persist across crashes and session restarts.

Scoping input is JSON with exactly these fields:

```json
{
  "problem": "A menu covers its action on a narrow screen.",
  "outcome": "The action remains reachable.",
  "in_scope": ["Menu layout"],
  "out_of_scope": ["Navigation redesign"],
  "acceptance": ["The action can be used at the supported narrow width."],
  "questions": []
}
```

```text
intake scope HIN-000001 --version 3 --file /private/intake/scope.json --worker SESSION_ID
intake ready HIN-000001 --version 4 --worker SESSION_ID
```

Saving scope clears an earlier public draft and its approval. `ready` requires
a complete scope and no open questions, then releases the scoping reservation.
Once implementation starts, capture a follow-up rather than silently changing
the agreed scope of active work.

`update --file` accepts a private JSON patch with these optional fields:
`title`, `details`, `priority` (0–3), `blocked` (text or null), `target_release`
(text or null), `status`, `merge_commit`, `released_in`, `pr_url`, `note`.
`note` appends a timestamped handoff/result rather than replacing prior notes.
Pass `--worker` when the record is reserved.

```text
intake next --lane build --worker BUILDER --session SESSION_ID --branch feat/example --worktree /private/worktree
intake update HIN-000001 --version 6 --file /private/intake/progress.json --worker BUILDER
intake handoff HIN-000001 --version 7 --worker BUILDER --to REVIEWER
intake release HIN-000001 --version 8 --worker REVIEWER
intake archive HIN-000001 --version 9
```

A version conflict means another session changed the record: reread and
reconcile. A claim cannot be overwritten by another worker's ordinary edit.
Handoff is explicit recovery, not authentication against someone with access
to the store. Branch/worktree references and notes survive transfer; update
the handoff note when the incoming session uses a different worktree.

## Public preparation

`init` recognizes a GitHub `origin`; `init --public-repo OWNER/REPO` can specify
the destination when origin is absent or another host. Existing stores retain
their configured destination. Public URLs must name that exact repository.

Write the public title/body independently using synthetic details. Preview
contains the exact strings and their SHA-256 digest, but no raw attachments,
private title, scope, session references or intake link.

```text
intake draft HIN-000001 --version 5 --title "Keep the menu action reachable" --file /private/intake/public-body.md
intake preview HIN-000001
```

Show the destination and exact draft to the user. After explicit approval:

```text
intake approve HIN-000001 --version 6 --digest APPROVED_SHA256
intake export HIN-000001 --digest APPROVED_SHA256
```

Export returns only `{"title":"…","body":"…"}`. Approval records the reviewed
bytes, not a wildcard permission to publish a future rewrite. Changed drafts
invalidate approval; there is no automated privacy-classification guarantee.
The CLI does not upload files, issue network requests or invoke GitHub tools.
An authorized independent session may publish the approved projection using the
verified personal GitHub account. Explicitly delegated children follow their
brief's publication restrictions; do not infer a parent from a worktree or fleet
file. Keep raw intake material private in either case.
If publication's outcome is uncertain, the publisher checks for an existing
issue before retrying. After confirmed creation, record:

```text
intake published HIN-000001 --version 7 --digest APPROVED_SHA256 --url https://github.com/OWNER/REPO/issues/123
```

`extract --attachment UUID --out /private/intake/recovered.png` recovers an
original privately, refusing existing destinations or paths inside Git. It is
never part of public export.

## Releases and remaining setup

Use `target_release` for planned scope, `status: "merged"` plus the verified
full `merge_commit` for main, and subsequently `status: "released"` plus
`released_in` for the actual published tag. A planned version is not evidence
that a change shipped. `status` shows claims, blocked work, planned releases
and merged-but-unreleased items. The authorized session verifies PRs, merge commits and
published release contents before recording those facts.

An authorized session can configure a GitHub Project, labels and milestones separately
when its account access is authorized. This CLI intentionally has no GitHub
credentials or publication action. A ready record and approved projection are
usable before that setup, and private implementation need not wait for it.

Verification: `nix develop -c node --test .agents/skills/hennery-work/scripts/intake.test.mjs`.
The test uses synthetic data, isolated Git configuration and private temporary
directories, including a real linked worktree and concurrent CLI processes.
