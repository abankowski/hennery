# Recall reset contention Implementation Record

**Goal:** fix cross-namespace read stalls during the optional recall service's inventory reset, without relaxing the regression or its lease/deletion rules.

**Base:** `64f46345` (origin/main); branch `fix/recall-reset-contention`. R1 merged as PR #154 per the parent. This is a scoped R1 amendment; no publishing.

**Spec:** [Optional memory design](../specs/2026-10-14-memory-design.md), [reference service R1](2026-11-01-recall-service.md), [C1b](2026-11-01-plugin-inventory-paging.md).

## Execution status

Built and verified. The first review returned CHANGES; both findings are fixed test-first in the amendment below. Parent re-review and current-head Linux/macOS CI remain pending. Initial implementation diff SHA-256: `1e49bceadea891865346d5c412d0d7c56fc28aae82f68b94f8314d486e8301a3`; frozen patch and command outputs are in `.superpowers/sdd/recall-reset-contention/` in the recall-fix-17 worktree.

## Scope

Store/consumer locking, regression coverage and this record. No core, protocol, schema, dependency, Nix filter, web, tool/auth surface or model changes. The original 1,500-note plus 1,500-memory (16,000-byte bodies) regression and its 3-second/12-second assertions are unchanged.

## Decisions

- **Real contention.** CI run 38854056607 on macOS reported a 5.324731833-second reset and a 3.550753208-second foreign read. Preparation already released the shared mutex every 32 rows, but the final atomic deletes, metadata rewrites, COMMIT and TRUNCATE checkpoint still held it. A slower runner therefore extended the mutex hold directly.
- Use one additional kernel-owned SQLite connection per Store, shared by all Store clones, to serialize reset writes. Its WAL transaction and checkpoint run on the blocking pool without the read/state mutex. Other namespaces keep using the original connection. Other SQLite writes retain the existing 100-ms busy budget; this does not promise concurrent SQLite writers.
- Reserve the resetting namespace before preparation. Invalidate earlier delivery stamps, remove its old lease, deny reads and renewals, and carry the reservation into the blocking task. Cancellation of its awaiter cannot release it while disk work is running.
- Keep projection changes and cursor advancement in one transaction. Check the exact job inside the writer transaction, recheck lease expiry before COMMIT, require a successful checkpoint, then recheck epoch/revision/cursor under the state mutex before granting a lease. Failure releases the reservation without restoring the old lease.

## Global constraints and review focus

Owner/hat/epoch isolation, literal/scoped FTS, canonical storage bounds and opt-in behavior remain unchanged. Review WAL connection ownership, lock ordering, cancellation/drop paths, stale-job and post-commit lifecycle fencing, checkpoint honesty and resource bounds. There is one reset writer per service Store, not a connection per request or namespace. New test seams compile only under cfg(test).

## File structure

- `crates/hennery-memory/src/store.rs`: shared Store state, reset connection and namespace read fence.
- `crates/hennery-memory/src/consumer.rs`: reset reservation, blocking transaction/checkpoint, final lease fence and regression seams/tests.
- `crates/hennery-memory/tests/sql_scope.rs`: audit now prepares 52 consumer SQL literals, including one new namespaced checkpoint-test query; all existing scope and query-plan assertions remain.

## Task 1: reproduce and fix

**RED:** the test-only seam pauses the real reset immediately before COMMIT or checkpoint. A foreign search must finish before the writer is released; resetting-scope reads, renewals and prior deliveries must remain denied. On the old lock scope, the COMMIT case failed after its five-second liveness watchdog: “foreign reads waited for the stalled Commit; shared mutex held during reset I/O” (exit 101, 0 passed/1 failed). Cleanup releases and joins both threads even on RED. An earlier draft had the same five-second block but its cleanup assertion obscured the diagnostic; the recorded second RED is direct.

**Built fix:** the transaction/checkpoint use the separate reset writer. The short state-mutex sections reserve or publish a namespace; they do not enclose reset disk I/O. Preparation retains the indexed 32-row reads and one-pass JSON work. The existing full mixed-corpus regression passed in 1.157813042 seconds, with a worst foreign read of 612.375 microseconds. No timing bound was raised.

New regressions also cover duplicate reservations; abandoned preparation and retry; cancellation of an awaiter with a live blocking task; renewal/delivery fences; session and scope forget after COMMIT; expiry rollback during SQL; and checkpoint refusal followed by a successful retry. The two existing prepared revision/expiry regressions remain.

## Task 2: verification and copied probes

Every command below ran in the flake dev shell with private HOME/XDG/tool configuration and the worktree's own target directory.

| Command | Exit | Output |
|---|---:|---|
| `cargo fmt --all --check` | 0 | completed |
| `cargo test -p hennery-memory --locked` | 0 | 62 passed; 1 ignored; 11 result groups |
| `cargo clippy --workspace --all-targets --locked -- -D warnings` | 0 | completed |
| `cargo clippy -p hennery --locked -- -D warnings` | 0 | completed |
| `cargo run -p hennery-proto --bin gen --locked -- --check` | 0 | completed |
| `cargo run -p hennery-view --bin gen-view --locked -- --check` | 0 | completed |
| `cargo test -p hennery-memory --lib --test consumer --locked --no-run --message-format=json` | 0 | fresh binary artifact paths recorded |

**Timing load:** four independent fixture processes concurrently, for three rounds. Five timing/concurrency unit cases and four integration cases (mixed corpus, lease renewal/expiry, unfinished-inventory denial and in-flight purge fence): **108 passing executions in 24 groups**, all exit 0. The slowest loaded mixed reset was **3.272 seconds**; the largest foreign read was **12.161 milliseconds**. Static cases were not loaded. Raw timings and group outputs are saved in the ledger.

**Copied probes:** the retained copy is `.superpowers/sdd/recall-reset-contention/probes-1`. Its target was APFS-cloned with `/bin/cp -c -R` before building, and was never shared with the root tree. All **14 mutations failed behaviorally (101)**; compilation failures were not accepted. Coverage: global mutex around COMMIT and checkpoint; duplicate reset reservation; delivery invalidation; old-lease removal; renewal fence; transaction and publication job fences; final lease check; checkpoint confirmation; reservation cleanup on failure/success; blocking-pool execution; and the explicit read fence with a retained-old-lease seam. That last seam passed before its read guard was removed. All eight unit cases passed in the baseline and restored copy; final copy diff was zero and root implementation bytes still matched the frozen patch.

The probe harness initially stopped at its 120-second copied-tree build cap, then at an ambiguous mutation anchor. The build cap and anchor were corrected; completed probes were retained rather than repeated. Those harness failures are logged and are not counted as detected mutations.

Per the parent's targeted amendment budget, no full workspace run, Nix check, web gate or additional full replay was performed. No hotspot/filter/dependency/web file changed. The earlier R1 fresh replay remains historical evidence; CI is the check of record.

## Review amendment: activity transaction fence and panic recovery

**Reviewed head:** `3d6fe4b2`. The review found a stale feed write between its preliminary job check and BEGIN IMMEDIATE, plus permanent reset-writer poisoning after a panic. Both are fixed in the same scoped branch; the historical evidence above remains unchanged.

**Test-first:** the reviewer's two-connection reproduction is now a permanent regression. It pauses reset before COMMIT, admits the old feed job through its preliminary check, then lets reset commit before the feed transaction starts. Before the fix, the feed returned an error after committing `old-feed-cursor` and restoring one absent-source note (exit 101, 0 passed/1 failed). The unwind/retry regression also failed first on the poisoned mutex, as did the incomplete-rollback regression (each exit 101, 0 passed/1 failed). The unwind test covers both pre-COMMIT and post-COMMIT panics, verifies the cursor rollback/commit distinction, and verifies successful retry using a reopened connection.

**Built fixes:** feed application now rechecks the exact namespace epoch, feed revision and cursor inside its own IMMEDIATE transaction, before any mutation. Reset-writer recovery checks SQLite autocommit to confirm the unwound transaction has ended, opens a new kernel-owned connection, restores the 100-ms busy budget, and only then replaces the connection and clears poison. An unconfirmed rollback returns an explicit error, retains poison and leaves reads denied. No global state mutex encloses recovery I/O.

**Write-path audit:** both asynchronous job writers now validate their exact job inside their own write transaction. Attach already reads namespace state/epoch/config after BEGIN. Suppress and forget reconcile current data and advance revision inside their transaction; forget also checks active state or the existing receipt. Namespace/auth/epoch selection for remember and lifecycle operations remains serialized by the main mutex: all identity/state writers hold it, reset reservation needs it, and the separate reset writer never changes namespace identity/auth/state. Existing reservations deny remember. Create is a fresh-identity INSERT; write enablement is an active-state guarded UPDATE; erasure confirmation follows terminal scope purge under the main mutex. Transaction helpers inherit their caller's fence. No other captured feed job is used for a write. Detailed audit: `.superpowers/sdd/recall-reset-contention/amendment-1/audit.md`.

**Verification:** all six amendment gates exited 0: `cargo fmt --all --check`; `cargo test -p hennery-memory --locked` (**65 passed, 1 ignored, 11 result groups**); both clippy commands and both generator checks from the table above. The ignored mounted-service proof retains its existing setup requirement. Fresh lib/consumer artifact discovery also exited 0. The concurrency load ran four processes for three rounds: **132 passing executions in 24 groups**, all exit 0, including stale activity and unwind/retry alongside the existing interleaving/lease/purge cases. The slowest mixed reset was **1.991 seconds** and worst foreign read **5.502 milliseconds**; all original timing bounds remain unchanged.

**Copied probes:** `amendment-1/probes-1` has its own APFS-cloned target, made with `/bin/cp -c -R`. Baseline and restored unit suites each passed all 11 tests (exit 0). All **six guard mutations failed behaviorally (101)**: activity transaction fence, poison recovery, rollback confirmation, connection replacement, reopened busy budget and poison clearing. No compiler failure counts as a detected mutation. The restored copy diff is zero; root implementation bytes match frozen SHA-256 `cd1f89e4f84628bf229cc4bd30a4c0c36dee3d17d885a5bbeb34c4c6e0121f44`. Raw RED/GREEN, gates, load and probe outputs are in `.superpowers/sdd/recall-reset-contention/amendment-1/`. The original `probes-1` and parent-owned `review-probe-1` copies remain for parent cleanup.

No full workspace run, fresh replay, Nix or web gate for this review amendment, per the verification budget; no hotspot, schema, dependency or web files changed. Parent re-review should focus on the transaction fence, poison/rollback/reopen ordering and fail-closed reads. CI remains the check of record.

## After this plan

Parent: independent review of `64f46345..fix/recall-reset-contention`, current-head CI and full PR status (checks, reviewDecision, mergeStateStatus and unresolved review threads, bots included). The child makes no GitHub API/CLI action or publication. No open product decision.

Generated with Claude AI — please review before distribution.
