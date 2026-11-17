# Session worktrees and archival

- **Date:** 2026-11-17
- **Status:** proposal, awaiting owner approval; no implementation authorized
- **Scope:** product decision and feasibility, not an implementation specification
- **Builds on:** [ACP core](2026-09-26-acp-core-design.md),
  [kernel](2026-09-26-kernel-design.md), and
  [external session MCP](2026-10-29-external-session-mcp.md)

## Problem and intended outcome

An optional setting would create each new session in a separate Git worktree.
This gives concurrent sessions separate working files and branches. Hennery
would own creation and cleanup on the session's host.

Cleanup cannot be attached to `closed`: a closed session can currently be
explicitly resumed, and resume requires its recorded working directory.
Preserving that behavior is a constraint of this proposal.

Introduce `archived` as an explicit end to further work in a session. Its
history remains readable, while its Hennery-managed worktree is removed.
Deleting a session also requests removal of its managed worktree.

## Approaches considered

1. **Remove worktrees on close.** Rejected: changes existing resume behavior.
2. **Keep worktrees until session deletion.** Simpler, but users must erase
   conversation history to reclaim the workspace through the session UI.
3. **Add archival and remove worktrees on archive or delete.** Recommended:
   preserves close/resume behavior and retains history after workspace cleanup.
   Costs a new lifecycle state and consistent handling across UI, API and MCP.

The third approach is proposed, not yet approved by the owner.

## Proposed lifecycle

| State | Hennery-managed worktree | Further work |
| --- | --- | --- |
| `active` | retained | agent can work |
| `parked` | retained | session can resume |
| `closed` | retained | explicit resume, unchanged |
| `archived` (new) | removal requested; eventually absent | history is read-only |
| `deleted` | removal requested; eventually absent | existing deletion semantics |

Archival is an explicit operator action on a closed session. Archived sessions
cannot resume, accept prompts, or be automatically reactivated by delegation
or external clients. Starting further work requires a new session. Restoring
an archived workspace or conversation is outside the initial scope.

An archived session can subsequently be deleted. Archival is not transcript
erasure and does not invoke the adapter's transcript-forgetting path.
Sessions without managed worktrees can still be archived; their directories
are untouched. Existing sessions are not automatically migrated or archived.

## Proposed worktree ownership and cleanup

- The setting is opt-in and applies to new sessions. Its location, inheritance
  and per-session override remain design questions.
- Hennery creates a unique branch and linked worktree, records their ownership,
  and supplies the resulting absolute directory as the ACP session `cwd`.
- Only worktrees Hennery created and registered are eligible for removal.
  User-selected directories and externally created worktrees are never adopted
  for automatic deletion.
- Removing a worktree does not automatically delete its branch. Keeping the
  branch preserves committed work; it does not preserve uncommitted files.
- Modified or untracked files block automatic removal. The operator must
  preserve them or explicitly approve discarding them. Ignored local files
  also need a defined preservation/discard policy before destructive cleanup.
- Cleanup waits until the session's adapter process group has stopped.
  Parking, adapter exit, application closure and host restart do not request it.
- Cleanup has a durable state separate from the session lifecycle, such as
  pending, blocked, failed or removed. Archive/delete can be logically complete
  while cleanup is outstanding; the UI must not claim the directory is gone.
- Host reconnect retries outstanding cleanup. Ownership metadata must survive
  session deletion, which currently scrubs `cwd`, until cleanup is confirmed.
- Failed session creation also needs recovery for partially created worktrees.

Deleting a session does not implicitly authorize force-removing dirty files.
If history is deleted while cleanup is blocked, a separate cleanup record must
remain visible and actionable without restoring deleted conversation content.

## ACP feasibility and existing integration points

ACP provides the required directory selection through `session/new` and,
when supported, `session/load`. Its standard schema has no worktree creation
or removal operation. Optional `session/close` and `session/delete` capabilities
do not provide a portable worktree lifecycle contract. Hennery can manage Git
directly without introducing an ACP extension.

The host already starts adapters using the session directory and passes that
directory into ACP new/load requests (`crates/hennery-host/src/session.rs`).
Git probing already recognizes linked worktrees and tests their shared project
identity (`crates/hennery-host/src/git.rs`). The sessions service validates
directory existence and hat assignment before start/resume
(`crates/hennery-sessions/src/api.rs`).

These are source-level findings, not a live compatibility result. Before an
implementation design is finalized, test both pinned adapters for new, file
changes, park/load, close/load, process termination and cleanup in a disposable
repository.

References checked for the feasibility analysis:

- [ACP session setup](https://agentclientprotocol.com/protocol/v1/session-setup)
- [ACP schema](https://agentclientprotocol.com/protocol/v1/schema)
- [ACP session deletion](https://agentclientprotocol.com/protocol/v1/session-delete)
- [Git worktree](https://git-scm.com/docs/git-worktree)

## Owner decision requested

Approve, amend or reject the following product direction:

1. Optional Hennery-managed worktree per new session.
2. Preserve `parked` and `closed`, including their current resume behavior.
3. Add explicit `archived`, retaining readable history but preventing resume.
4. Archive and delete request managed-worktree cleanup, with visible deferred
   cleanup when the host is offline or files need an operator decision.
5. Retain branches and require explicit approval before discarding local work.

Approval here accepts a direction for a subsequent design. It does not approve
implementation or resolve the remaining design questions below. Record the
owner's explicit decision in PR review and update this status accordingly.

## Remaining design questions

- Setting scope, inheritance and coverage of operator, MCP, clone and child
  session creation; behavior when the source directory is not a Git repository.
- Base commit and branch naming; starting from a subdirectory or another linked
  worktree; whether source checkout changes can be included.
- Worktree placement and consistent hat/root authorization, including external
  MCP grants. A generated path must not silently change the session's hat.
- Setup of ignored files, dependencies, submodules and development environments.
- Archive authorization, confirmation, list filters, retention and exports.
- Cleanup retry, ownership validation, races with resume/delete/purge, process
  termination failures and treatment of locked or externally moved worktrees.
- Schema and host protocol changes, capability negotiation and old-host behavior.
- Delegation family rules and external MCP capacity accounting for archived
  sessions, which must not remain eligible for automatic resume.

Worktrees isolate working files, not all shared resources: Git refs, ports,
databases and external services can still be shared. Automatic merge, branch
deletion and full runtime sandboxing are outside this proposal.
