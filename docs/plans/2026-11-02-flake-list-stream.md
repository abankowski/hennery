# List-stream removal and MCP cleanup timing (flakes 13–14)

## Execution status

Built on `6cb867c6`, branch `fix/flake-list-stream`. Verification results and
review status are recorded below; independent review and Linux CI are
parent-owned.

Complete locally: test-only fix, required gates, loaded repeats, four caught
copy probes and a fresh replay. Review range starts at `6cb867c6`.
Flake 13 is committed as `27a3b766`; flake 14 follows in a separate commit.

## Scope and root cause

CI run 38662374683 failed the HTTP test's `elapsed < LIST_COALESCE` assertion
at 536.842303 ms, with a 250 ms bound. Rerun 38689826293 passed. The timer
started before the second event's database writes, close and delete, and
stopped after the HTTP consumer received the removal. It therefore measured
synchronous database work, scheduling and transport as well as coalescing.
A correct removal can fail that assertion when the consumer is descheduled.

The list follower has no polling interval. Its broadcast receiver bypasses
the hold for an initial deletion ring, and a deletion received inside
`hold()` terminates that hold. Tombstones exclude subsequent summaries;
late doorbells only trigger a fresh store read. No product change is needed.

## Decisions and constraints

- Keep the HTTP removal payload and next-session ordering assertions.
- Check the no-hold requirement at the real `list_follow` implementation
  with paused Tokio time and explicit polling, covering both deletion paths.
- First populate the sent-summary cache and prove ordinary updates are held.
  After removal, send a late ordinary ring and advance past the hold to
  verify that no stale upsert follows.
- Do not add retries, sleeps, deadlines or production test hooks.
- The reproduction pause is scratch-only diagnostic instrumentation.

## Review focus

The replacement must detect both a direct deletion incorrectly held and a
held update that ignores deletion. A normal update must still coalesce.
The HTTP path must retain message and ordering coverage. All additions in
`hennery-sessions/src/view.rs` belong to its existing `cfg(test)` module.

## File structure

- `crates/hennery-testkit/tests/view.rs`: HTTP behavior and ordering.
- `crates/hennery-sessions/src/view.rs`: deterministic scheduling regression.
- `docs/README.md`: this record's index entry.

## Task 1: reproduce and replace the invalid deadline

- [x] Read the supplied CI log and historical source at `575bcc08`.
- [x] Original macOS test: 1 passed; 4 parallel copies × 10 rounds with four
  nice CPU competitors: 40 passed, no spontaneous reproduction.
- [x] Controlled consumer pause after deletion publication: original test
  RED (exit 101, 538.333833 ms), with the correct removal printed before the
  panic. Replacement with the same diagnostic GREEN (exit 0, 1 passed).
  Removed all diagnostic pause/printing code before final verification.
- [x] Paused-clock regression GREEN without product changes.
- [x] Final targeted suites: `cargo test -p hennery-sessions --lib --locked
  view::tests` (9 passed), `cargo test -p hennery-testkit --test view --locked`
  (57 passed), both exit 0.
- [x] Final loaded repeats: 4×10 HTTP and 4×10 paused-clock executions,
  each family with four nice CPU competitors: 80 passed, exit 0.
- [x] In an APFS-cloned probe copy, removing either deletion bypass or
  the ordinary-update hold failed the new regression (each exit 101,
  0 passed / 1 failed). Restoring the old HTTP bound with the controlled
  consumer pause also failed (exit 101). Restored source matched the
  worktree; 9 unit and 57 HTTP tests passed again, both exit 0.
- [x] `cargo fmt --all --check`, `cargo clippy --workspace --all-targets
  --locked -- -D warnings`, `cargo clippy -p hennery --locked -- -D warnings`,
  `cargo run -p hennery-proto --bin gen --locked -- --check` and
  `cargo run -p hennery-view --bin gen-view --locked -- --check`: exit 0.
- [x] Fresh replay: one extracted diff block, three patched files,
  836 tracked files matched byte for byte, plus the copied execution
  record. Replayed unit suite: 9 passed; HTTP suite: 57 passed; exit 0.

The full workspace run is omitted under the brief's product-change condition:
all Rust changes are test-only. Nix files are untouched, so no flake check.

### Exact patch for fresh replay

Apply this block to `6cb867c6`. Clone `target/` with `/bin/cp -c -R` into the
fresh copy before building; extract this block, require three changed files,
then run the two targeted suites above. The execution record itself is
copied as documentation after the replay; compare all source and index bytes
with the tested worktree. Probe/replay copies remain in the lane's ignored
ledger for parent cleanup.

```diff
diff --git a/crates/hennery-sessions/src/view.rs b/crates/hennery-sessions/src/view.rs
index 87c93a20..9816ce99 100644
--- a/crates/hennery-sessions/src/view.rs
+++ b/crates/hennery-sessions/src/view.rs
@@ -1458,6 +1458,79 @@ mod tests {
         assert!(item(&mut rx).await.contains("t1:tool:c1"));
     }

+    /// A delete bypasses the list hold both as the first ring and while
+    /// an ordinary update is held. Poll the real follower with time
+    /// paused: database work and a descheduled test cannot spend its
+    /// coalescing budget, and neither path can hide an unwanted timer.
+    #[tokio::test(start_paused = true)]
+    async fn a_list_removal_bypasses_the_hold_and_leaves_no_upsert() {
+        for during_hold in [false, true] {
+            let (_dir, store, conn) = store();
+            let start = write(
+                &conn,
+                &store,
+                "user_turn",
+                serde_json::json!({"turn_id": "t1", "content": []}),
+            );
+            let anchor = anchor_now(start.event_id);
+            let (bell, doorbell) = broadcast::channel(16);
+            let (tx, mut rx) = Outbox::new(QUEUE_BYTES);
+            let follow = list_follow(&store, Some(&anchor), None, doorbell, &tx);
+            tokio::pin!(follow);
+            assert!(futures::poll!(&mut follow).is_pending());
+            assert!(format!("{:?}", rx.try_recv().unwrap().0).contains("waiting_changed"));
+
+            // Populate the follower's sent-summary cache first. Ordinary
+            // updates must actually wait for the full hold.
+            bell.send(write(&conn, &store, "acp_update", tool("c0"))).unwrap();
+            assert!(futures::poll!(&mut follow).is_pending());
+            assert!(matches!(rx.try_recv(), Err(mpsc::error::TryRecvError::Empty)));
+            tokio::time::advance(LIST_COALESCE).await;
+            assert!(futures::poll!(&mut follow).is_pending());
+            assert!(format!("{:?}", rx.try_recv().unwrap().0).contains("session_upsert"));
+
+            if during_hold {
+                conn.execute(
+                    "UPDATE sessions SET last_event_at = '2026-10-01T00:00:01.000Z' WHERE id = 's'",
+                    [],
+                )
+                .unwrap();
+                bell.send(write(&conn, &store, "acp_update", tool("c1"))).unwrap();
+                // Poll until the real follower is inside hold(), without
+                // advancing its clock or relying on a spawned task's order.
+                assert!(futures::poll!(&mut follow).is_pending());
+                assert!(matches!(rx.try_recv(), Err(mpsc::error::TryRecvError::Empty)));
+            }
+            conn.execute("UPDATE sessions SET lifecycle = 'closed' WHERE id = 's'", [])
+                .unwrap();
+            let crate::store::Deletion::Done { event: deleted, .. } = store.delete_session("s", None).unwrap() else {
+                panic!("not deleted");
+            };
+            let rung = Instant::now();
+            bell.send(deleted.clone()).unwrap();
+            assert!(futures::poll!(&mut follow).is_pending());
+            let removed = format!("{:?}", rx.try_recv().expect("delete must not wait for a timer").0);
+            assert!(
+                removed.contains("session_removed") && removed.contains(r#"\"session_id\":\"s\""#),
+                "{removed}"
+            );
+            assert_eq!(Instant::now(), rung);
+            assert!(matches!(rx.try_recv(), Err(mpsc::error::TryRecvError::Empty)));
+
+            // A late ordinary ring cannot resurrect the deleted session,
+            // even after the cancelled hold would have expired.
+            bell.send(EventDto {
+                kind: "acp_update".into(),
+                ..deleted
+            })
+            .unwrap();
+            assert!(futures::poll!(&mut follow).is_pending());
+            tokio::time::advance(LIST_COALESCE * 2).await;
+            assert!(futures::poll!(&mut follow).is_pending());
+            assert!(matches!(rx.try_recv(), Err(mpsc::error::TryRecvError::Empty)));
+        }
+    }
+
     /// The re-confirmation's ask, the review's A-2 and the plan review's
     /// 3b, for the list stream: a lagged doorbell is read now, not after
     /// the hold, whether the lag is the first ring or comes during a hold,
diff --git a/crates/hennery-testkit/tests/view.rs b/crates/hennery-testkit/tests/view.rs
index 9c2a4692..f03a9ac5 100644
--- a/crates/hennery-testkit/tests/view.rs
+++ b/crates/hennery-testkit/tests/view.rs
@@ -1818,8 +1818,10 @@ async fn the_list_stream_holds_a_burst_into_one_upsert() {
     assert_eq!(stream.message().await.summary().session.session_id, "b");
 }

-/// The plan review's 3b: a delete is read at once, never behind a held
-/// upsert, and no upsert for the session follows it.
+/// The plan review's 3b over HTTP: a removal arrives and no upsert for
+/// the session follows it. The exact no-hold requirement is checked with
+/// paused time in view::tests::a_list_removal_bypasses_the_hold_and_leaves_no_upsert;
+/// wall time here also includes database work, scheduling and HTTP.
 #[tokio::test]
 async fn the_list_stream_sends_a_removal_at_once_and_nothing_after_it() {
     let collector = Collector::start().await;
@@ -1834,7 +1836,6 @@ async fn the_list_stream_sends_a_removal_at_once_and_nothing_after_it() {
     // An upsert sent, then one held, then the delete.
     collector.event("a", "acp_update", &chunk("0"));
     assert_eq!(stream.message().await.summary().session.session_id, "a");
-    let start = Instant::now();
     collector.event("a", "acp_update", &chunk("1"));
     collector
         .conn()
@@ -1845,7 +1846,6 @@ async fn the_list_stream_sends_a_removal_at_once_and_nothing_after_it() {
     };
     collector.state.hub.publish(deleted);
     let removed = stream.message().await;
-    assert!(start.elapsed() < LIST_COALESCE, "sent after {:?}", start.elapsed());
     assert_eq!(
         (removed.event.as_str(), removed.data.as_str()),
         ("session_removed", r#"{"session_id":"a"}"#)
diff --git a/docs/README.md b/docs/README.md
index 2e91d48b..b97811c5 100644
--- a/docs/README.md
+++ b/docs/README.md
@@ -31,6 +31,7 @@ slice); everything else is design. The maintainer's decisions are recorded below
    - [Spike: per-session MCP over ACP](spikes/2026-09-25-per-session-mcp.md)
      and its [harness](../spikes/2026-09-25-mcp-per-session/).
 4. Plans:
+   - [List-stream removal timing (flake 13)](plans/2026-11-02-flake-list-stream.md) — replaces the HTTP wall-clock upper bound with deterministic checks of both deletion paths in the real list follower; reproduction, guard probes, load and replay evidence recorded. Independent review and Linux/macOS CI remain parent-owned.
    - [Walking skeleton](plans/2026-09-26-walking-skeleton.md) — the first
      implementation plan (9 tasks) — executed 2026-09-27; its "Execution status" section
      lists where the built code deviates from the task text.
```

## Task 2: await MCP popup cleanup (flake 14)

**Root cause:** CI run 38830162524 observed the changed connection card
and no waiting text, then synchronously asserted `popup.close`. Saving the
same client increments `clientRevision`, remounting `OauthConnect`. Closing
the old popup happens in `useMcpOauth`'s passive unmount cleanup. The DOM
commit is observable before that cleanup; finding the new card does not
establish that the popup was closed. A fast incidental follow-up GET/render
or Testing Library's timer-drain turn commonly masks the ordering.

**Decision:** await the popup-close assertion and require exactly one close.
Hold the post-save GET response until after closure, so an extra list render
cannot be required for cleanup. Assert exactly two list GETs in total, before
and after resolving that follow-up read. No product changes or timeout changes.

**Controlled reproduction:** the unchanged file passed 56 tests, and the
unchanged focused test passed 40 loaded executions. Hold the follow-up GET;
for diagnosis only, make Testing Library's `asyncWrapper` return after its
DOM condition without the incidental timer-drain turn. The synchronous
assertion fails with the same missing `popup.close` call (exit 1, one failed).
Awaiting the assertion under the same seam passes (exit 0, one passed).
Remove the diagnostic wrapper override before final verification; its exact
RED patch is retained in the ignored ledger as `mcp-red-fixture.patch`.

**Verification:** frozen install, typecheck and production build exit 0;
related screen/hook/client/scope suites: 117 passed across five files, exit 0;
full web suite: 1,823 passed across 102 files, exit 0. Forty complete MCP
screen runs (4 parallel × 10 rounds, with four nice CPU competitors) passed:
2,240 test executions. In an APFS-cloned copy, omitting the popup close,
omitting the key remount, and restoring the synchronous assertion under the
fast-observer seam each failed an assertion (exit 1, one failed each).
Restored related suites: 117 passed, exit 0; copied source matches the
worktree. No Rust bytes changed after flake 13's verification.
Fresh flake 14 replay: one extracted block, two patched files, 117 related
tests passed and typecheck passed (exit 0); all 837 tracked files matched
after copying the execution record.

**Review focus:** the await must observe actual cleanup, the GET remains
pending until closure, exactly one popup close and no extra list reads are
required. No diagnostic Testing Library configuration reaches the commit.
Review flake 14 from `27a3b766` to its separate commit; review both flakes
from `6cb867c6` to branch head.

### Exact flake 14 replay patch

Apply the following second diff block to `27a3b766` in a fresh copy with its
own APFS-cloned `target/` and `web/node_modules`. Require two patched files,
run the five related suites and typecheck, then compare tracked source/index
bytes with the worktree. The combined execution record is copied separately
as documentation.

```diff
diff --git a/docs/README.md b/docs/README.md
index b97811c5..9aa0fa52 100644
--- a/docs/README.md
+++ b/docs/README.md
@@ -31,7 +31,7 @@ slice); everything else is design. The maintainer's decisions are recorded below
    - [Spike: per-session MCP over ACP](spikes/2026-09-25-per-session-mcp.md)
      and its [harness](../spikes/2026-09-25-mcp-per-session/).
 4. Plans:
-   - [List-stream removal timing (flake 13)](plans/2026-11-02-flake-list-stream.md) — replaces the HTTP wall-clock upper bound with deterministic checks of both deletion paths in the real list follower; reproduction, guard probes, load and replay evidence recorded. Independent review and Linux/macOS CI remain parent-owned.
+   - [List-stream and MCP timing (flakes 13–14)](plans/2026-11-02-flake-list-stream.md) — paused-clock deletion checks and an awaited OAuth popup cleanup assertion, with controlled regressions, guard probes, load and replay evidence. Independent review and Linux/macOS CI remain parent-owned.
    - [Walking skeleton](plans/2026-09-26-walking-skeleton.md) — the first
      implementation plan (9 tasks) — executed 2026-09-27; its "Execution status" section
      lists where the built code deviates from the task text.
diff --git a/web/src/screens/Mcp.test.tsx b/web/src/screens/Mcp.test.tsx
index 5e6809bb..b4d0a29b 100644
--- a/web/src/screens/Mcp.test.tsx
+++ b/web/src/screens/Mcp.test.tsx
@@ -63,10 +63,12 @@ it('saving the same client resets waiting and folds the returned report without
   const c = connection({ cred_kind: 'oauth_client', has_credential: true, status: 'ok', oauth: { redirect_uri: '', has_client_secret: false, client_id: 'public' } })
   const popup = { opener: null, closed: false, location: { href: '' }, close: vi.fn() }; vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window)
   const fresh = { ...c, label: 'Changed' }
-  let reported = c
-  const s = open({ 'GET /api/mcp/connections': () => json(200, [reported]), 'GET /api/mcp/oauth/redirect-uri': OAUTH_REDIRECT,
+  // Keep the post-save read pending: its render must not be needed to close the popup.
+  let reread!: (response: Response) => void
+  let reads = 0
+  const s = open({ 'GET /api/mcp/connections': () => ++reads === 1 ? json(200, [c]) : new Promise<Response>(resolve => { reread = resolve }), 'GET /api/mcp/oauth/redirect-uri': OAUTH_REDIRECT,
     ['POST ' + ITEM + '/authorize']: json(200, { consent_url: 'https://vendor.example/authorize', expires_at: '2099-01-01T00:00:00Z' }),
-    ['PUT ' + ITEM + '/oauth-client']: () => { reported = fresh; return json(200, fresh) },
+    ['PUT ' + ITEM + '/oauth-client']: json(200, fresh),
   }, OAUTH_CAPS)
   const docs = await card('Docs'); expect(sent(s, 'GET', PATH)).toHaveLength(1)
   fireEvent.click(within(docs).getByRole('button', { name: 'Reconnect' }))
@@ -74,7 +76,11 @@ it('saving the same client resets waiting and folds the returned report without
   fireEvent.click(within(docs).getByRole('button', { name: 'Save client' }))
   expect(await card('Changed')).toBeVisible()
   expect(screen.queryByText('Waiting for sign-in. Return here after consent.', { exact: true })).toBeNull()
-  expect(popup.close).toHaveBeenCalled()
+  // The new card can commit before the old OAuth control's passive cleanup.
+  await waitFor(() => expect(popup.close).toHaveBeenCalledTimes(1))
+  expect(sent(s, 'GET', PATH)).toHaveLength(2)
+  await act(async () => { reread(json(200, [fresh])) })
+  expect(sent(s, 'GET', PATH)).toHaveLength(2)
 })
 it('only both capabilities enable the shared reader away from MCP', async () => {
   const s = open({ 'GET /api/mcp/oauth/redirect-uri': OAUTH_REDIRECT }, OAUTH_CAPS)
```

## After this plan

The parent runs independent review and Ubuntu/macOS PR CI. Local macOS
load results do not establish Linux execution; both supplied CI failures
are reproduced with controlled test scheduling, with no product bug found.
The parent owns cleanup of the retained probe/replay copies in the ledger.

Generated with Claude AI — please review before distribution.
