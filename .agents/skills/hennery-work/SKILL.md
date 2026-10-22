---
name: hennery-work
description: Capture private ideas, screenshots and bugs for the hennery repository, scope them before creating public issues, resume work across sessions and worktrees, and track implementation and release status.
---

# Private intake and project work

Use this workflow for the hennery repository's private intake and work queue.
This is a repository workflow; it does not add a task hub to the Hennery app.

Resolve the bundled script relative to this SKILL.md and run it with the active
worktree as cwd, inside that worktree's dev shell. If the skill is in another
checkout, use the script's absolute path; do not change cwd to the skill's tree.
When the active checkout contains the skill:

```sh
nix develop -c node .agents/skills/hennery-work/scripts/intake.mjs --help
```

Read [the workflow and command reference](../../../docs/private-intake.md) for
scope/patch schemas, release tracking, handoffs or publication. Resolve that
link relative to this skill directory. Do not read existing private items until
the user's request needs them.

## Capture and scope

- A request to capture an idea or bug authorizes **private capture**, not
  publication. Use `capture`, adding the source session reference when known.
  Copy accessible original screenshots/files with `attach`; if a screenshot is
  only available in a Hennery transcript, keep its session reference and say
  that the original has not been copied. Do not claim to have saved unseen bytes.
- The CLI derives one private store from Git's common directory, shared by all
  local worktrees. On first use, run `init`. An explicit `--store` or
  `HENNERY_WORK_STORE` can choose another location outside Git; initialize only
  for the current repository. Do not change real Hennery data or global config.
- Keep raw notes, screenshots and scope/patch files outside Git. CLI output,
  `list`, `show` and `status` are private too. Do not paste them into public
  issues, PRs or repository docs. The store is not a cross-hat access boundary.
- During scoping, establish the problem, desired outcome, included/excluded
  behavior, acceptance criteria and open questions. Preserve uncertainty; do
  not silently choose a product direction the user has not settled. Use `scope`
  to persist the result. `ready` requires no unresolved questions.
- A scoped item may stay private, be archived for later, or become a public
  issue. Do not equate `ready` with permission to publish or implement it.

## Pick up and hand over work

- For "take the next item", distinguish scoping from implementation using the
  request and context; clarify when genuinely ambiguous. Use `next --lane scope`
  or `next --lane build`, with a stable worker/session identifier. `next`
  reserves one item atomically, preferring priority 0 through 3 and older items.
  It does not start an agent or grant implementation permission by itself.
- Record the session, branch and worktree when claiming. Respect the repo's
  applicable repository instructions and any explicit delegated brief. A claim is
  not permission to edit someone else's tree or spawn additional agents.
- Read `show` before editing and pass its `--version`. On a conflict, reread and
  reconcile; do not automatically retry an old patch over newer work.
- Persist a private `note` with the result, evidence, files/commits and next
  action at meaningful milestones, on a blocker, and before yielding. Keep work
  status current when it enters review, merges or ships. `release` gives up a reservation; `handoff` transfers
  it explicitly. A closed or parked session does not expire a reservation.
  If recovering abandoned work, inspect it and deliberately name the previous
  worker in the handoff rather than silently stealing its claim.
- Record review/merge/release facts only from observed evidence. `target_release`
  is intent; `merged` needs the verified full merge commit; `released_in` records
  the actual published version after verifying that release contains the work.
  The CLI records these facts and does not independently verify GitHub state.

## Prepare a public issue

1. Write a **separate** public title and body using `draft`. Explain the problem
   and acceptance criteria with synthetic examples. Do not copy the raw record,
   client identifiers, original screenshots, private URLs, session references or
   internal discussion. Automated redaction is not a publication guarantee.
2. Use `preview` and show the user the exact title/body, destination repository
   and digest. Ask for publication approval for that concrete draft. Approval
   to implement this workflow or scope an idea is not approval to publish it.
3. Only after explicit approval, record `approve` for the previewed digest and
   current version. Changed drafts invalidate approval; scope changes clear the
   draft entirely. Do not approve on the user's behalf.
4. `export` returns **only** the approved title/body. It never includes raw
   context or attachment bytes. It does not contact GitHub.
5. Follow current GitHub permissions. An independent session may publish the
   approved projection using a verified authorized account. Only an explicitly
   delegated child follows its brief's parent handoff restrictions; a worktree
   or a fleet file does not assign that role. Before retrying an uncertain
   creation, check for an existing issue. Publish only the approved projection,
   then record its URL using `published`. Keep the intake-to-issue link private.
