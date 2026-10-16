# Recall reset contention Implementation Record

**Goal:** fix cross-namespace read stalls during the optional recall service's inventory reset, without relaxing the regression or its lease/deletion rules.

**Base:** `64f46345` (origin/main); branch `fix/recall-reset-contention`. R1 merged as PR #154 per the parent. This is a scoped R1 amendment; no publishing.

**Spec:** [Optional memory design](../specs/2026-10-14-memory-design.md), [reference service R1](2026-11-01-recall-service.md), [C1b](2026-11-01-plugin-inventory-paging.md).

## Execution status

Built and verified. Parent independent review and Linux/macOS CI remain pending. Exact implementation diff SHA-256: `1e49bceadea891865346d5c412d0d7c56fc28aae82f68b94f8314d486e8301a3`; frozen patch and command outputs are in `.superpowers/sdd/recall-reset-contention/` in the recall-fix-17 worktree.

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

## After this plan

Parent: independent review of `64f46345..fix/recall-reset-contention`, current-head CI and full PR status (checks, reviewDecision, mergeStateStatus and unresolved review threads, bots included). The child makes no GitHub API/CLI action or publication. No open product decision.

Generated with Claude AI — please review before distribution.
