# MCP gateway (plan 8f): OAuth, single-flight refresh, the probe and the Notifier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ] `) syntax for tracking.

**Goal:** an early tester adds an MCP connection that signs in with OAuth to a hat, from the web UI, and its sessions use it (plan 8, sub-plan 8f). With it:
- **Connect:** discovery (gateway §4.1), dynamic registration or a pre-registered client (§4.2), consent with PKCE and the flow cookie, the callback and the exchange (§4.3), behind step-up, through the egress policy;
- **refresh:** one lock per connection, shared by the API, the proxy and the probe; a proactive refresh before expiry and one refresh and retry after a 401, each outcome its own answer (§4.4, §4.5, §5.4);
- **health:** the probe, a real MCP handshake every 15 minutes and on demand (§7), and the `Notifier`, which tells Web Push of a connection moving into or out of `needs_auth` or `error` (lane L9);
- the `mcp_oauth` capability, so the frontend offers the OAuth kinds.

It implements Part B of the lane's pre-designed API ("API design, implementation later: plans 8e and 8f", security-reviewed 2026-10-02, lane L13), sent to the frontend as a contract; the [firm] items are kept, with the two rulings below (decisions 14, 15).

**Architecture:** seven new modules in `hennery-gateway`, one migration, two helpers in the kernel's egress.
- `oauth`: the OAuth client, hand-written on the kernel's egress clients: discovery, RFC 7591 registration, PKCE S256, the consent URL, the token endpoint's two grants. Every document is read capped, refused with a duplicate or odd-spelt key (lane L16), and no token response is logged.
- `flows`: the flows in flight, in memory, keyed by `state`, single use, 15 minutes, one per connection, 16 per owner, and the flow cookie.
- `runtime`: what the API, the proxy and the probe share, once per collector: the stores, the master key, the collector's one `Egress`, the `Notifier`, the flows, one refresh lock per connection, the probes in flight.
- `refresh`: single-flight refresh, its outcomes `Refreshed`, and `Fresh` (a token with the URL it was granted for).
- `proxy::send_through`: the one forwarding path, the proxy's and the probe's, with the 401 refresh and retry.
- `probe`: the handshake, the background loop and probe now. `notify`: the `Notifier` trait and its Web Push mapping.
- `oauth_api` and `callback`: the routes. `GET /api/mcp/oauth/callback` sits outside the operator's session and the browser rules (kernel §3.3's write-back).
- Storage: `gw_oauth_clients` and six columns of `gw_connections` (gateway migration 4); grants sealed as `gw_credentials.oauth_tokens`, client secrets as `gw_oauth_clients.client_secret` and `…pending_client_secret`.
- The collector builds the gateway on its one `Egress` with Web Push as its `Notifier`, announces the problems present at start once, and runs the probe loop until shutdown (`start_gateway`).

**Tech Stack:** Rust (edition 2024, MSRV 1.88), axum 0.8, reqwest 0.12 (through the kernel's egress clients), rusqlite, serde_json, tokio, base64 and sha2. **No new crate:** the gateway takes the workspace's `base64` and `sha2`, so `Cargo.lock` gains two lines in its stanza. `rmcp`'s `auth` module is not used (decision 1).

**Spec:** gateway §4 (OAuth), §5.4 (upstream 401), §6 (credentials at rest), §7 (health, probe and notification), §9 (API); kernel §3.3 (the one state-changing `GET`), §3.4 (step-up on gateway credentials and pre-registered clients), §7.1 (egress), §7.2 (CSP); umbrella §9.1, §10.2 (`Notifier`). All written back in Task 8; the security-review amendments are Task 7.

It builds on plans 8a (the store, the master key, the API; its `is_supported` seam and decision 10), 8b and 8b-ii (egress; OAuth URLs `https` or loopback even under the internal-network marking), 8d (the proxy's 401 seam, `ProxyStore`'s status writes, the owner audit), the gateway differential and JSON-answers plans (`tests/support/differential.rs`, lane L16), 4b (`GET /api/capabilities`, lane L14) and 10b-ii (the collector's `Push`, lane L9).

**Base:** `origin/main` at `7a8dab28` (8e and 4e-i merged). All executable blocks below are extracted from the Phase B feature commits on that base. OAuth is gateway migration 4, after the unchanged merged stdio migration 3.

**Status:** v4 executed 2026-10-13 after the scoped security re-confirmation; OAuth remains in wave 1 by the maintainer’s 2026-10-12 decision. Phase B task reviews are requested from the parent.

**How the code blocks were made and checked:**
- The code was built first, TDD, on a scratch branch, and cut into the task series below by a script (every file and every hunk of a file assigned to a task's test or code step, plus the few intermediate edits no commit of the scratch branch holds; "File structure" lists them). Each test step was run and seen to fail as its Step 2 says, and Phase B ran targeted tests per task and the complete gate on its finished implementation.
- Every block below was generated from that series' commits by a script, one region of a file per block.
- The plan was replayed from its own text onto `d54c704c` in a scratch worktree, task by task; 282 blocks over 56 changed files applied (count > 0); every test and implementation snapshot matched its Phase B commit. Cargo.lock is embedded in the task blocks (the gateway adds base64; SHA-256 was already present from 8e), then locked metadata resolution is validated. After both generators, the complete tree equals pre-rebase implementation tip `0e643efb`, tree `d61af5fab40a8c5498b6b585ac5f8be557703037`, with nothing excluded. The prebuilt generators run only after their replayed sources match; no target is shared or built in the replay tree. The final execution-record documentation is installed from this plan artifact and the README record, then compared byte for byte with the final feature tip.
- 326 code anchors match once; the complete Phase B rerun yields **325 BITE and one previously accepted equivalent (C23)**, with zero invalid probes, hangs or unresolved survivors. The nine new re-confirmation/integration probes bite, as do all probes whose anchor files conflicted with 8e. F7’s separate D9 document wording probe also bites. O38 was refreshed for F5’s unsigned parsing and AP10 includes its existing api_log positive test; both fresh reruns bite, with original observations retained in the ledger.

## Execution status

Rebased onto 4e-i (`7a8dab28`) on 2026-10-13. Both README plan entries were retained automatically; all 18 commits initially compared equal in `git range-diff`. No task content changed, so the earlier byte-for-byte replay remains the replay evidence and was not repeated, as directed by the parent. Both real generators produced no diff. Web typecheck, test (**1368 passed, 75 files**), build and full CI browser checks (**50 passed, 11 skipped**) passed; the embedded hennery/testkit binary build, formatting, both Clippy runs and workspace tests (**1907 passed**) each exited 0. No web compatibility fix was required. The record alone updates the base, commit mapping and verification evidence.

Executed Tasks 1–9 in order on `feat/gateway-8f-oauth`, base `7a8dab28`, implementation tip `4d4f98d0`. Each test step was seen red before implementation, and each task received its targeted green run. The final Rust gate passed: formatting, workspace/all-targets Clippy, hennery Clippy, workspace tests (**1907 passed, 0 failed**), protocol generator check and view generator check; each exit 0. Web frozen install, typecheck, test (**1303 passed across 73 files**) and build each exit 0. The complete `oauth`, `oauth_proxy` and `probe` test binaries ran in four parallel copies, two rounds: **24 runs, 936 passes, zero failures**. The final documentation commit repeats the gate on its tip; it changes no implementation or generated bytes.

The security amendments were confirmed with notes by the opus security-auditor on the maintainer’s behalf on 2026-10-13 for `648788c6..46699185`. Phase B takes m2 and the F6 probe-body canary; m1 is a rotation follow-up and m4 is noted below. The maintainer’s PQ1–4 retain their built defaults. Task reviews of the integrated execution are requested from the parent; the earlier security confirmation does not substitute for those reviews.

**Conflicts with 8e:** preserve all stdio/OAuth protocol exports and regenerate schema/TypeScript; append OAuth migration 4 after byte-identical merged migrations 1–3; retain stdio ciphertext/key checks, owner filtering and transactional purge/revocation; share Runtime and revocations across API, proxy and SessionMcp; retain validated/wrapped MCP session IDs, Last-Event-ID restriction and JSON-answer deadline through refresh; preserve both collector startup tests and session/purge fixture assertions; retain stdio/OAuth routes and both capability flags; preserve the complete stdio API spec row. Owner audit counts are 46 at Task 3 and 48 after Task 7. The merged hat-purge hook now drops only its hat’s pending OAuth flows after commit without asynchronous refresh locks.

SSH pushes for Tasks 4–8 initially failed because the operator’s YubiKey PIN was not cached and SSH fell back to the work key. No other key, remote or transport was tried. The parent authorized local continuation; one attempt was made after each finished task. After the operator unlocked the key, Task 9’s push succeeded and published every finished task. The final record is pushed after author and data-hygiene checks.

| Task | Test commit | Implementation/spec commit | Review range |
|---|---|---|---|
| 1 | `80be77aa` | `3809362e` | `7a8dab28..3809362e` |
| 2 | `2f98b141` | `6e09ab87` | `3809362e..6e09ab87` |
| 3 | `a69327fc` | `392488f2` | `6e09ab87..392488f2` |
| 4 | `d5429841` | `3b4f1d90` | `392488f2..3b4f1d90` |
| 5 | `0f548939` | `9a21e6a2` | `3b4f1d90..9a21e6a2` |
| 6 | `2f95ea16` | `ebd15ba9` | `9a21e6a2..ebd15ba9` |
| 7 | `de36f0d3` | `cc7cf683` | `ebd15ba9..cc7cf683` |
| 8 | — | `38e189ba` | `cc7cf683..38e189ba` |
| 9 | `d87abd0d` | `4d4f98d0` | `38e189ba..4d4f98d0` |

**Test-first evidence:** Tasks 1, 3 and 4 fail to compile for the new APIs; Task 2 has 7 passing/2 failing protocol tests; Task 5 fails for missing Runtime APIs; Task 6 fails 75 route/canary tests and the capability assertion; Task 7 fails the security and purge-flow regressions, with the deadline helper separately absent; Task 8’s D9 wording validator changes from exit 1 to 0; Task 9’s lost-pin row fails 409 vs 404 and its fake-body field is absent before implementation. Erroneous intermediate test edits were corrected before counting red evidence or publishing their commits. The capability-list formatting correction is in Task 7’s test snapshot.

**Documentation record:** save this complete plan as `docs/plans/2026-10-15-gateway-oauth.md`, update its entry in `docs/README.md`, and commit `docs(plan): record the execution of plan 8f`. The replay compares all implementation bytes, then applies those prepared record artifacts and compares the complete final tree. No PR action is performed by this child.

**Probe evidence:** 326 exact-once anchors; 325 BITE plus accepted C23 EQUIVALENT, zero invalids/hangs/unresolved survivors; SF7doc BITE separately. The nine new probes cover deleted pin rereads (M2), the 503 body canary (SF6body), both sides of shared revocations (I01/I07), collector SessionMcp installation (I02), validated external/internal MCP session forwarding (I03/I04), and hat-scoped OAuth flow cleanup (I05/I06). Original O38 filter removal became redundant after F5’s unsigned parser; its replacement changes the negative-number verdict and bites the existing token-response test. AP10 adds the existing unknown-status api_log test target and bites it. No feature code, test or rule was weakened. Verification shards used separate targets on identical pre-rebase `0e643efb` worktrees; their clean restoration, selected manifests and output were checked on disk, then their trees/targets removed.

## Scope

1. The kernel's egress: `is_https_or_loopback` (the scheme rule for OAuth's URLs) and `read_capped` (a body read with a cap, shared with Web Push) (Task 1).
2. The wire types: the connection item's `checked_at`, `oauth` and `oauth_error`; the pre-registered client; authorize; probe now (Task 2).
3. Storage: gateway migration 4, the grant and client secrets sealed under their own fields, the compare-and-swap for a refresh, the key check over every kind (Task 3).
4. The OAuth client and the flows (Task 4).
5. The `Notifier`, the runtime, single-flight refresh, OAuth through the proxy, the probe and the collector's wiring (Task 5).
6. The Connect API: the redirect URI, the pre-registered client, authorize, the callback, probe now; the OAuth kinds taken (the lift of 8a's `is_supported`); the `mcp_oauth` capability (Task 6).
7. The security-review amendments, tests then code (Task 7).
8. The spec write-back, including those amendments (Task 8).
9. The scoped re-confirmation notes: deleted connections during a pin race and a probe failure-body canary (Task 9).

**Out:**
- Standalone clients, renderers, `hennery gateway`, `rotate-key` and `up`'s multi-hat warning (8g, deferred past the first test, lane L22).
- Operator-set OAuth scopes for `oauth_client` (the API design's open product question); `account_label` (v1 learns none).
- Live calls to real vendors (lane L10): the fakes in `tests/support/oauth.rs` only; the vendor matrix is an operator item ("After this plan").

## Decisions this plan makes where the spec is silent

The API decisions F1–F5 and B1–B7 are the lane's pre-designed API (lane L13); this plan implements them, with decisions 14 and 15 below. **"The review's R1–R7"**, as the code cites them, are the amendments of that API design's own security review (2026-10-02): R1 a flow bound to the connection as it was, edits drop flows; R2 a pre-registered client pinned to its issuer and token endpoint; R3 one cookie per flow, named by `state`'s hash; R4 only a same-origin `resource` mismatch can be accepted; R6 the `iss` check and the metadata `issuer`; R7 the kernel's write-back for the one state-changing `GET`. This plan's own security review numbers its findings "finding N".

1. **Hand-written on the kernel's egress clients, not `rmcp`'s `auth` module.** `rmcp` 3.5 tries the authorization server's metadata in another order than §4.1, follows redirects during discovery itself, and brings `reqwest` 0.13 beside the workspace's 0.12. Every OAuth request goes through `hennery_kernel::egress` under the connection's allowance; no redirect is followed; every metadata URL, endpoint and the consent URL is `https`, or plain `http` to loopback, checked by the gateway before sending, even on a connection marked internal network (plan 8b-ii's hand-off).
2. **Refresh has five outcomes, `Refreshed`**: `Retry(Fresh)`, `NotRefreshable`, `Refused`, `Unavailable`, `Unsaved`. 8d's 401 seam (`refreshed`) becomes `proxy::send_through`, which maps them: `needs_auth` and 502 `upstream_auth` for a second 401, `NotRefreshable` and `Refused`; 502 `upstream_unreachable` and 502 `credential_unsaved` without `needs_auth` (§4.5: a click cannot fix a disk). The probe goes through the same function (§7: "through the same forwarding path").
3. **One `Runtime` per collector**, one `Arc` for the API's state and the proxy's: two would be two lock tables, and no refresh would be single-flight. Its refresh lock is taken by every credential write: a refresh, a callback's grant, a static token's `PUT`, a URL or kind edit, a delete (§4.5).
4. **A started refresh runs to completion and persists**: it is spawned and awaited, so a caller that goes away drops the wait, not the task (G-11), and only the task sets `needs_auth` (G-12); it is bounded at 20 s at the vendor. A proactive refresh is done only for a grant with a refresh token, so a request never waits for the lock of a grant that cannot be refreshed.
5. **A discovery candidate that answers anything but 200** (a 3xx: redirects are not followed; a 5xx: the next may answer), or a body over 1 MiB, **is "not here"**, and the next candidate is tried. A 5xx at every candidate is 502 `upstream_unreachable`, not `discovery_failed`.
6. **Two issuer identifiers are the same when equal but for one final `/`.** RFC 8414 §3.3 wants them identical; vendors differ on the slash. Anything else is 502 `discovery_failed`.
7. **A protected-resource document without `resource` is not one** (RFC 9728 §3.2 requires it): the next candidate is tried.
8. **An OAuth document with a key twice or spelt otherwise is no document** (lane L16): which `issuer` or endpoint it names would depend on the parser. Metadata, registration and token responses are read only so; the callback's parameters refuse a duplicate.
9. **A refresh's write is a compare-and-swap** on the sealed blob (fresh nonce per write) it read (`GatewayStore::store_refreshed`). API PATCH, DELETE and credential/client PUTs hold the refresh lock. The CAS protects against writers outside it, such as a hat purge: a deleted or replaced grant cannot match, and a lost swap uses what is stored. Tests forcing those races deliberately bypass the API's lock. (D9 approved with this wording by the security auditor on 2026-10-03.)
10. **Status writes** (§7): every one is guarded by the URL the request or probe went to; `error` is the probe's alone; live traffic's `ok` moves `checked_at` at most once a minute when nothing changes (as `last_used_at`); a completed Connect sets `ok` and moves `status_at` even when it was `ok`; a failed Connect never changes the status (G-7). A stored status the API does not know is logged and shown as `not_connected` (8a's follow-up), never silently.
11. **`invalid_target` at consent** comes back on the authorization server's redirect, when the flow is already over: the callback records it in memory for that (connection, URL), and the next Connect omits `resource`. At the token endpoint (exchange and refresh) it is retried once without `resource`, server-side. Either way `resource_param_accepted = false` is stored with the grant (§4.3).
12. **The `Notifier`** hears of a move into `needs_auth` or `error`, or out of either into `ok`, from the store that made it, in the statement that made it (`StatusChange`), so two writers cannot both announce one move; a problem present at start is announced once. Web Push mapping (lane L9): title the label, generic title "An MCP connection needs attention", body "needs sign-in again", "is failing" or "is working again", URL `/mcp`, tag `mcp-<connection id>`, urgency normal.
13. **A token goes only to the upstream it was granted for.** `Refreshed::Retry` carries `Fresh`: the access token with the URL and the allowance read in the same statement. A retry after a 401 is sent only if both equal what the first attempt went to; otherwise nothing more is sent and the answer is 502 `upstream_changed`, without `needs_auth`. A proactive refresh drops its result and reads the URL and token again, together. (Found by the advisor on 2026-10-03: a URL edit and a new Connect while a 401 waited for the lock would have sent the new upstream's token to the old one.)
14. **A stale `accept_resource` is 409 `resource_mismatch`** (the lane parent's ruling of 2026-10-03, keeping the [firm] F3): an acceptance that is not what discovery finds now is a mismatch again, the new value kept in `oauth.resource_mismatch`, so the frontend's one refetch rule (on 409) shows it. 400 `invalid` is left for an `accept_resource` where no protected-resource document names one.
15. **`resource` is omitted after `invalid_target`** (the lane parent's ruling of 2026-10-03): the contract's B4 reads "the `resource` sent on consent, exchange and refresh stays the connection URL, accepted or not". Gateway §4.3 requires the retry without the parameter, and the spec wins: `resource` is the connection URL or nothing, never another value (an accepted mismatching value included). Recorded in the PR body.
16. **The callback is its own router**, outside the operator's session and the browser-`GET` `Sec-Fetch-Site` layer (the vendor's redirect arrives `cross-site` without the `SameSite=Strict` session cookie), authenticated by `state` and the flow cookie: the one `GET` that changes state (kernel §3.3's write-back, R7). It answers `no-store`, `no-referrer`, `nosniff`, and layers the kernel's `csp::on_html` itself: the kernel's layer is on the sessions router and covers nothing merged beside it ("After this plan").
17. **Nine tasks after scoped re-confirmation** (the advisor's split of 2026-10-03): the modules' own dependencies decide the order. The runtime holds the probes in flight and the `Notifier`, the probe goes through the proxy's forwarding path, and the proxy through the refresh, so the `Notifier`, runtime, refresh, proxy and probe are one task (5), before the Connect API (6). The API's state moves to the runtime in Task 5, its OAuth routes in 6. The store takes the OAuth kinds from Task 3 (its tests make OAuth connections); the API refuses them (400 `unsupported_cred_kind`, as 8a's seam did) until Task 6 serves Connect, so no tree in the series lets an operator create an OAuth connection that cannot be connected. The status writes take their new signatures in Task 3, and the old proxy is adapted to them until Task 5 rewrites it. The security review adds Task 7 (tests then amendments); the original spec write-back is Task 8; the scoped re-confirmation adds Task 9.

18. **Security review F1–F5:** without advertised `iss`, the authorization, token and registration endpoints share one origin (502 `discovery_failed`); a callback checks its connection generation before exchange and again under the lock, including a same-ID secret edit; a lost client pin is re-read before consent (404 `not_found` if deleted, otherwise 409 `issuer_changed` on a different winner); pending secrets have `pending_key_version` and `pending_updated_at`, and startup opens the newest pending secret; lifetimes are capped at one year and expiry/due arithmetic saturates. Discovery is bounded at 60 seconds in total, and quoted challenge text cannot name metadata.

## The security review's answers

**Reviewer:** opus security-auditor `a9d476818216bffca`, 2026-10-03, on v2 and `ac2a7279..194ac4ee`. **Verdict:** approve after amendments. The amendments were built by the Codex child on 2026-10-12, keeping that base. **Scoped re-confirmation:** opus security-auditor on the maintainer’s behalf, 2026-10-13, `648788c6..46699185`: **CONFIRMED WITH NOTES**. F1–F7 closed; no Critical or Important finding and no regression. m2 (deleted connection during pin race → 404) and the F6 503 response-body canary are taken as Task 9, test first. m1 (newest active secret selected by registration time rather than last seal) is deferred to rotate-key; m3 remains PQ1 with the strict no-iss default; m4’s malformed/duplicate challenge fallback fails safe and is documented. All deferrals accepted. Opener-null is acceptable only if 4e-ii lands before shipping the popup. PQ1–4 remain open, defaults unchanged.

| Finding / ruling | Answer in v4 | Evidence |
|---|---|---|
| F1 blocking: no-iss mix-up | Authorization/token/registration endpoints share an origin, else discovery_failed | Endpoint rows, iss differential rows, SF1a–c |
| F2 exchange before re-check | Unlocked pre-exchange generation/client check; retained transaction check; merged purge hook drops its hat’s flows after commit (I05/I06) | Edited/unreadable connection and gated same-ID secret tests, SF2a–g |
| F3 lost client pin | Re-read the winning slot; different ID/secret/issuer/endpoint yields 409 issuer_changed | Both slots, same/different winners, SF3a–e |
| F4 shared key version | Separate pending version/timestamp; startup checks newest pending; clear on promotion/client upsert | Pending version, startup, clear tests, SF4* |
| F5 lifetime overflow | One-year cap; saturating expiry and due; huge numeric/string responses stay known | Boundary and vendor differential tests, SF5a–e |
| F6 failure canaries | All five failure paths, including a served 503 body canary and fixed status note | oauth_log and SF6a–e / SF6body unsafe-logging probes |
| F7 / D9 wording | CAS is on the sealed blob (fresh nonce per write), with API writers locked | Wording check red/green, SF7doc BIT; Task 8 and decision 9 |
| D11, D13, D14, D15, D16 | Approved; implemented decisions retained | Existing tests/probes, including cross-site collector callback |
| Cheap notes | Same-ID secret generation; quote-aware challenge; whole-discovery deadline | Gated exchange, challenge differential rows, SNquote/clean/duplicate/deadline |
| Deferred notes / PQ1–4 | Listed under After this plan with strict current defaults | Parent presents product questions to maintainer |
| m2 | Deleted connection on a lost-pin reread is 404; missing client row remains 409 | Both slots and no flow/cookie/consent URL; M2 |
| F6 partial probe leg | 503 serves a unique body canary, absent from logs/answers | Fixed HTTP status note; SF6body |
| m1 / m4 / opener-null | Rotation follow-up, safe challenge fallback, 4e-ii before popup shipping | After this plan; approved deferrals |


## Global Constraints

- Rust edition 2024, `rust-version = "1.88"`. The final execution gate runs the five checks:
  - `nix develop -c cargo fmt --all --check`
  - `nix develop -c cargo clippy --workspace --all-targets --locked -- -D warnings`
  - `nix develop -c cargo clippy -p hennery --locked -- -D warnings`
  - `nix develop -c cargo test --workspace --locked`
  - `nix develop -c cargo run -p hennery-proto --bin gen --locked -- --check`
- **No token, code, verifier, client secret or token-endpoint body in a log, an error body or a `Debug`**; an upstream or vendor URL only as its origin (lane L11). The log canaries are `tests/oauth_log.rs`.
- **Every credential write takes the connection's refresh lock** (decision 3); a refresh's write is a compare-and-swap (decision 9).
- **A token goes only where it was granted for** (decision 13).
- Every SQL statement of the gateway names the owner (the owner audit, `owner_filter.rs`).
- Every side-effect line has its own revert-probe, and every outcome of `Refreshed`, `Sent`, `Verdict`, `Alert`, `ResourceFit`, `DiscoveryError`, `RegisterError`, `TokenError`, `Taken`, `ClientChange` and `GrantStored` its own positive test.
- Tests that start the binary go through the testkit's scratch-home helper; fakes only (lane L10).
- Commits: Conventional Commits, the gmail identity (signing disabled for this execution; `git log --format='%ae' origin/main..HEAD` before every push).

## Review Focus

1. **Single-flight refresh and its outcomes** (decisions 2, 3, 4, 9): `tests/oauth_proxy.rs` (concurrent 401s share one refresh; a caller dropped mid-refresh still persists; each outcome's answer; the compare-and-swap against an edit and against a newer grant).
2. **A token only where it was granted for** (decision 13): `a_token_connected_elsewhere_before_the_refresh_is_not_retried`, `a_retry_keeps_the_allowance_it_was_read_with`, `a_probe_whose_connection_moved_during_its_refresh_changes_nothing`.
3. **Discovery** (§4.1, decisions 5–8): `tests/oauth.rs`'s discovery tests and `tests/oauth_differential.rs` (metadata, token responses, callback parameters through every decoder of `support/differential.rs`).
4. **The callback's order** (B5, R1, R3, R6): one test per outcome in `tests/oauth.rs`; the cookie's name, attributes and clearing; `connection_changed` under the lock; the page names nothing.
5. **The resource** (decisions 11, 14, 15; R4): `a_mismatching_resource_is_accepted_only_exactly`, the `invalid_target` tests at consent, exchange and refresh.
6. **Storage** (Task 3): `tests/oauth_store.rs` (the fields, the AAD binding, the pending client, the pins, the key check, the purge).
7. **The probe and the Notifier** (decisions 10, 12): `tests/probe.rs`, `crates/hennery/src/main.rs`'s `the_gateway_announces_through_push_and_probes`.
8. **Logs** (lane L11): `tests/oauth_log.rs`, including consent denial, exchange refusal body, exchange egress refusal, DCR refusal and failed probe; each branch asserts its verdict and gets its own unsafe-logging probe.
9. **Amendments:** Task 7’s origin, generation, competing-pin, pending-key, lifetime and quoted-challenge tests; the overall-discovery deadline. Each new verdict and state write has a probe.

## Revert-probes

Each line below was removed or neutered on the scratch branch, the named test binary or binaries run, and the line restored; a probe whose file changed after its run was run again on the series' tip (the integrated Phase B execution, below). The script is the lane's ledger `probes/run.py`.

| Id | Line (file) | Test that failed |
|---|---|---|
| R01 | single-flight: a token another refresh stored is used (Retry without a send) (`refresh.rs`) | `concurrent_401s_share_one_refresh` |
| R02 | proactive refresh only if still due under the lock (`refresh.rs`) | `concurrent_requests_near_expiry_refresh_once` |
| R03 | Refreshed::NotRefreshable (no refresh token) (`refresh.rs`) | `a_grant_without_a_refresh_token_is_needs_auth_on_401` |
| R04 | Refreshed::NotRefreshable (no grant) (`refresh.rs`) | `a_grant_gone_before_its_refresh_is_needs_auth` |
| R05 | Refreshed::Unsaved (grant unreadable) (`refresh.rs`) | `a_grant_that_does_not_open_at_its_refresh_is_not_needs_auth` |
| R06 | resource sent on refresh (G-10) (`refresh.rs`) | `a_401_is_refreshed_and_retried_once`, `a_refresh_is_retried_once_without_resource` |
| R07 | invalid_target on refresh retried once without resource (`refresh.rs`) | `a_refresh_is_retried_once_without_resource` |
| R08 | refresh records resource_param_accepted = false after invalid_target (`refresh.rs`) | `a_refresh_is_retried_once_without_resource` |
| R09 | Refreshed::Unavailable (timeout) (`refresh.rs`) | `an_unreachable_token_endpoint_is_not_needs_auth` |
| R10 | a response without a refresh token keeps the old one (`refresh.rs`) | `a_refresh_without_a_new_refresh_token_keeps_the_old_one` |
| R11 | CAS lost: use what is stored, not our token (`refresh.rs`) | `a_retry_keeps_the_allowance_it_was_read_with`, `a_retry_never_sends_another_url_s_token` |
| R12 | Refreshed::Unsaved (store failed) (`refresh.rs`) | `a_probe_the_gateway_fails_changes_nothing`, `an_unsaved_refresh_is_not_needs_auth` |
| R13 | refused refresh sets needs_auth (+ alert) (`refresh.rs`) | `a_refused_refresh_is_needs_auth` |
| R14 | Refreshed::Refused outcome (`refresh.rs`) | `a_refused_refresh_is_needs_auth` |
| R15 | Refreshed::Unavailable (vendor unreachable) (`refresh.rs`) | `a_failing_token_endpoint_is_not_needs_auth`, `a_redirect_an_unreachable_refresh_or_a_timeout_probes_error` |
| R16 | a started refresh runs to completion though the caller goes (`refresh.rs`) | `a_caller_cancelled_mid_refresh_leaves_it_to_complete` |
| R17 | the refresh lock (single-flight) (`refresh.rs`) | `a_grant_gone_before_its_refresh_is_needs_auth`, `a_grant_that_does_not_open_at_its_refresh_is_not_needs_auth` … |
| R18 | proactive window 5 min (`refresh.rs`) | `a_refresh_before_use_never_sends_another_url_s_token`, `a_token_about_to_expire_is_refreshed_first` … |
| RU01 | client from the stored flag (`runtime.rs`) | `a_401_is_refreshed_and_retried_once`, `a_callback_after_the_session_ended_is_refused` … |
| RU02 | status transitions are announced (`runtime.rs`) | `a_failing_upstream_probes_error`, `a_healthy_connection_probes_ok_with_a_whole_handshake` … |
| RU03 | startup announce (`runtime.rs`) | `a_problem_at_startup_is_announced_once` |
| RU04 | one lock per connection, shared (`runtime.rs`) | `a_grant_gone_before_its_refresh_is_needs_auth`, `a_grant_that_does_not_open_at_its_refresh_is_not_needs_auth` … |
| N01 | no alert without a transition (`notify.rs`) | `alerts_are_for_transitions_into_or_out_of_a_problem_only` |
| N02 | Alert::NeedsAuth (`notify.rs`) | `a_refused_credential_probes_needs_auth_after_one_refresh`, `alerts_are_for_transitions_into_or_out_of_a_problem_only` |
| N03 | Alert::Failing (`notify.rs`) | `a_failing_upstream_probes_error`, `a_problem_at_startup_is_announced_once` … |
| N04 | Alert::Recovered (`notify.rs`) | `a_healthy_connection_probes_ok_with_a_whole_handshake`, `alerts_are_for_transitions_into_or_out_of_a_problem_only` |
| N05 | not_connected -> ok is no alert (`notify.rs`) | `alerts_are_for_transitions_into_or_out_of_a_problem_only` |
| N06 | announce calls the notifier (`notify.rs`) | `a_failing_upstream_probes_error`, `a_healthy_connection_probes_ok_with_a_whole_handshake` … |
| N07 | L9 urgency Normal (`notify.rs`) | `the_push_notice_is_the_agreed_one` |
| N08 | L9 url (`notify.rs`) | `the_push_notice_is_the_agreed_one` |
| N09 | L9 tag (`notify.rs`) | `the_push_notice_is_the_agreed_one` |
| N10 | L9 body (`notify.rs`) | `the_push_notice_is_the_agreed_one` |
| N11 | Push is the full-mode Notifier (`notify.rs`) | `the_gateway_announces_through_push_and_probes` |
| P01 | reuse within 10 s (`probe.rs`) | `a_probe_within_ten_seconds_reuses_the_last` |
| P02 | timeout is error (`probe.rs`) | `a_redirect_an_unreachable_refresh_or_a_timeout_probes_error` |
| P03 | the probe records its verdict (`probe.rs`) | `a_failing_upstream_probes_error`, `a_healthy_connection_probes_ok_with_a_whole_handshake` … |
| P04 | the verdict is kept for reuse (`probe.rs`) | `a_probe_within_ten_seconds_reuses_the_last` |
| P05 | Verdict::Ok -> ok (`probe.rs`) | `a_healthy_connection_probes_ok_with_a_whole_handshake`, `the_background_probe_takes_oauth_connections_with_a_grant_only` |
| P06 | Verdict::Error -> error (`probe.rs`) | `a_failing_upstream_probes_error`, `a_problem_at_startup_is_announced_once` … |
| P07 | Verdict::NoChange moves checked_at (`probe.rs`) | `another_4xx_changes_nothing` |
| P08 | Verdict::NoCredential (`probe.rs`) | `a_connection_without_a_credential_is_not_probed` |
| P09 | Verdict::NeedsAuth (`probe.rs`) | `a_refused_credential_probes_needs_auth_after_one_refresh` |
| P10 | unreachable -> error (`probe.rs`) | `an_unreachable_upstream_probes_error` |
| P11 | refresh unavailable -> error (`probe.rs`) | `a_redirect_an_unreachable_refresh_or_a_timeout_probes_error` |
| P12 | probe: Sent::RefreshUnsaved is no change (`probe.rs`) | `a_probe_the_gateway_fails_changes_nothing` |
| P13 | 5xx -> error (`probe.rs`) | `a_failing_upstream_probes_error`, `a_problem_at_startup_is_announced_once` … |
| P14 | 3xx -> error (`probe.rs`) | `a_redirect_an_unreachable_refresh_or_a_timeout_probes_error` |
| P15 | other 4xx -> no change (`probe.rs`) | `another_4xx_changes_nothing` |
| P16 | session id carried (`probe.rs`) | `a_healthy_connection_probes_ok_with_a_whole_handshake` |
| P17 | protocol version carried (`probe.rs`) | `a_healthy_connection_probes_ok_with_a_whole_handshake` |
| P18 | notifications/initialized sent (`probe.rs`) | `a_healthy_connection_probes_ok_with_a_whole_handshake` |
| P19 | DELETE ends the session (`probe.rs`) | `a_healthy_connection_probes_ok_with_a_whole_handshake` |
| P20 | the tick probes each target (`probe.rs`) | `a_hung_tick_is_abandoned_and_the_loop_goes_on`, `a_tick_that_panics_does_not_end_the_loop` |
| P21 | a hung tick is aborted (`probe.rs`) | `a_hung_tick_is_abandoned_and_the_loop_goes_on` |
| P22 | a tick is bounded (`probe.rs`) | `a_hung_tick_is_abandoned_and_the_loop_goes_on` |
| P23 | a tick is a task (panic isolation) (`probe.rs`) | `a_hung_tick_is_abandoned_and_the_loop_goes_on`, `a_tick_that_panics_does_not_end_the_loop` |
| P24 | shutdown ends the loop (no test expected; checks) (`probe.rs`) | `a_hung_tick_is_abandoned_and_the_loop_goes_on`, `a_tick_that_panics_does_not_end_the_loop` |
| P25 | answers read (no verdict depends on it) (`probe.rs`) | `a_healthy_connection_probes_ok_with_a_whole_handshake` |
| F01 | a new flow supersedes the connection's previous (`flows.rs`) | `a_flow_expires_and_a_new_one_supersedes_it` |
| F02 | MAX_FLOWS (`flows.rs`) | `at_most_sixteen_flows_live_and_an_edit_drops_its_connection_s` |
| F03 | an expired flow is unknown (`flows.rs`) | `a_flow_expires_and_a_new_one_supersedes_it` |
| F04 | the cookie must match (Taken::Mismatch) (`flows.rs`) | `a_callback_without_the_flow_s_cookie_is_refused`, `a_flow_is_single_use_and_needs_its_cookie` |
| F05 | Taken::Mismatch outcome (`flows.rs`) | `a_callback_without_the_flow_s_cookie_is_refused`, `a_flow_is_single_use_and_needs_its_cookie` |
| F06 | single use (`flows.rs`) | `a_callback_without_the_flow_s_cookie_is_refused`, `a_flow_is_single_use_and_needs_its_cookie` |
| F07 | an edit drops the flows (`flows.rs`) | `a_client_put_a_kind_change_or_a_delete_drops_the_flows`, `a_hat_purge_drops_its_oauth_flows` … |
| F08 | an edit drops the held registration (`flows.rs`) | `a_registration_is_reused_only_for_the_same_endpoint_and_redirect` |
| F09 | an edit forgets resource refusal (`flows.rs`) | `an_edit_forgets_a_refused_resource`, `dropping_a_connection_forgets_its_refused_resource` |
| F10 | registration reuse only for same endpoint+redirect (`flows.rs`) | `a_registration_is_reused_only_for_the_same_endpoint_and_redirect` |
| F11 | live() except (`flows.rs`) | `at_most_sixteen_flows_live_and_an_edit_drops_its_connection_s` |
| F12 | a registration is held (repeated clicks) (`flows.rs`) | `repeated_clicks_register_once` |
| F13 | resource refusal remembered (`flows.rs`) | `a_consent_refusing_resource_is_retried_without_it_by_the_next_connect` |
| F14 | live() drops expired (`flows.rs`) | `expired_flows_are_not_live` |
| C01 | no-store (`callback.rs`) | `the_callback_page_keeps_its_contract` |
| C02 | no-referrer (`callback.rs`) | `the_callback_page_keeps_its_contract` |
| C03 | nosniff (`callback.rs`) | `the_callback_page_keeps_its_contract` |
| C04 | CSP on the page (`callback.rs`) | `the_callback_page_keeps_its_contract` |
| C05 | a case variant of a parameter is refused (`callback.rs`) | `a_callback_s_parameters_are_read_only_once`, `the_callback_acts_only_on_a_query_every_reader_reads_alike` |
| C06 | length/control refused (`callback.rs`) | `a_callback_s_parameters_are_read_only_once`, `a_parameter_twice_or_with_a_control_character_is_refused` … |
| C07 | a parameter twice is refused (`callback.rs`) | `a_callback_s_parameters_are_read_only_once`, `a_parameter_twice_or_with_a_control_character_is_refused` … |
| C08 | flow_mismatch (clears the cookie) (`callback.rs`) | `a_callback_without_the_flow_s_cookie_is_refused` |
| C09 | callback failures kept in oauth_error (`callback.rs`) | `a_callback_from_another_issuer_is_refused`, `an_exchange_refused_by_egress_or_unreachable_has_its_code` … |
| C10 | the starting session still live (`callback.rs`) | `a_callback_after_the_session_ended_is_refused` |
| C11 | iss compared (RFC 9207) (`callback.rs`) | `a_callback_from_another_issuer_is_refused` |
| C12 | iss required when advertised (`callback.rs`) | `a_callback_from_another_issuer_is_refused` |
| C13 | consent invalid_target -> next Connect omits resource (`callback.rs`) | `a_consent_refusing_resource_is_retried_without_it_by_the_next_connect` |
| C14 | exchange retried without resource (`callback.rs`) | `the_exchange_is_retried_once_without_resource` |
| C15 | exchange records resource_param_accepted false (`callback.rs`) | `the_exchange_is_retried_once_without_resource` |
| C16 | exchange unreachable code (`callback.rs`) | `an_exchange_refused_by_egress_or_unreachable_has_its_code`, `an_exchange_with_a_failing_token_endpoint_is_unreachable` |
| C17 | exchange egress refused code (`callback.rs`) | `an_exchange_refused_by_egress_or_unreachable_has_its_code` |
| C18 | grant stored under the lock (`callback.rs`) | `the_callback_stores_the_grant_under_the_lock` |
| C19 | Connect announces recovery (`callback.rs`) | `a_connect_clears_the_last_failure_and_recovers_the_status` |
| C20 | GrantStored::ConnectionChanged outcome (`callback.rs`) | `a_secret_changed_during_exchange_is_not_overwritten` |
| C21 | the flow cookie is cleared (`callback.rs`) | `a_callback_without_the_flow_s_cookie_is_refused`, `a_connect_clears_the_last_failure_and_recovers_the_status` |
| C22 | resource sent at the exchange (`callback.rs`) | `a_dynamically_registered_connect_completes`, `the_exchange_is_retried_once_without_resource` |
| C23 | an unreadable query is refused (`callback.rs`) | none: equivalent (see below) |
| C24 | invalid_target consent message/refusal (`callback.rs`) | `a_consent_refusing_resource_is_retried_without_it_by_the_next_connect` |
| A01 | client PUT takes the lock (`oauth_api.rs`) | `every_credential_write_waits_for_the_refresh_lock` |
| A02 | client PUT drops flows (`oauth_api.rs`) | `a_client_put_a_kind_change_or_a_delete_drops_the_flows` |
| A03 | ClientChange::WrongKind -> 409 (`oauth_api.rs`) | `a_secret_never_moves_to_another_client` |
| A04 | authorize only for OAuth kinds (`oauth_api.rs`) | `authorize_needs_step_up_and_an_oauth_kind` |
| A05 | authorize clears the last failure (`oauth_api.rs`) | `a_connect_clears_the_last_failure_and_recovers_the_status` |
| A06 | authorize failures kept (`oauth_api.rs`) | `a_connect_clears_the_last_failure_and_recovers_the_status`, `a_metadata_fetch_the_egress_policy_refuses_ends_discovery` … |
| A07 | no_oauth_client (`oauth_api.rs`) | `a_pre_registered_confidential_client_connects` |
| A08 | too_many_flows before discovery (`oauth_api.rs`) | `at_most_sixteen_connects_are_in_flight` |
| A09 | DiscoveryError::Failed (`oauth_api.rs`) | `a_resource_document_reads_one_way_or_not_at_all`, `a_token_endpoint_with_a_fragment_is_no_endpoint` … |
| A10 | DiscoveryError::Insecure (`oauth_api.rs`) | `plain_http_documents_and_servers_are_refused`, `plain_http_endpoints_are_refused_even_on_the_internal_network` |
| A11 | DiscoveryError::Refused (`oauth_api.rs`) | `a_metadata_fetch_the_egress_policy_refuses_ends_discovery`, `egress_refusals_and_unreachable_servers_are_told_apart` |
| A12 | DiscoveryError::Unreachable (`oauth_api.rs`) | `an_oversized_document_is_not_here_and_a_failing_one_is_an_outage`, `egress_refusals_and_unreachable_servers_are_told_apart` … |
| A13 | ResourceFit::Matches clears the mismatch (`oauth_api.rs`) | `a_resource_that_matches_again_clears_the_mismatch` |
| A14 | ResourceFit::Foreign refused (`oauth_api.rs`) | `a_mismatching_resource_is_accepted_only_exactly` |
| A15 | accept only exactly (`oauth_api.rs`) | `a_mismatching_resource_is_accepted_only_exactly` |
| A16 | the acceptance is stored (`oauth_api.rs`) | `a_mismatching_resource_is_accepted_only_exactly` |
| A17 | a mismatch is recorded (ResourceFit::Mismatch) (`oauth_api.rs`) | `a_mismatching_resource_is_accepted_only_exactly` |
| A17b | a stale acceptance is 409 resource_mismatch (F3) (`oauth_api.rs`) | `a_mismatching_resource_is_accepted_only_exactly` |
| A18 | nothing to accept (`oauth_api.rs`) | `accepting_a_resource_no_document_names_is_invalid` |
| A19 | PKCE S256 required (`oauth_api.rs`) | `a_connect_clears_the_last_failure_and_recovers_the_status`, `a_server_without_s256_is_refused` … |
| A20 | pinned client refuses another AS (`oauth_api.rs`) | `a_pinned_client_refuses_another_issuer`, `a_pinned_client_refuses_another_token_endpoint` |
| A21 | pinned client refuses another token endpoint (`oauth_api.rs`) | `a_pinned_client_refuses_another_token_endpoint` |
| A22 | first authorize pins (`oauth_api.rs`) | `a_lost_client_pin_is_reread_before_consent`, `a_pinned_client_refuses_another_issuer` … |
| A23 | a pending client is used (Slot::Pending) (`oauth_api.rs`) | `a_lost_client_pin_is_reread_before_consent`, `a_new_client_replaces_a_live_grant_s_only_when_its_connect_completes` |
| A24 | ClientSource::Pending (`oauth_api.rs`) | `a_new_client_replaces_a_live_grant_s_only_when_its_connect_completes` |
| A25 | a stored DCR client reused (`oauth_api.rs`) | `a_stored_dynamic_client_is_reused_after_a_restart` |
| A26 | a held registration reused (`oauth_api.rs`) | `repeated_clicks_register_once` |
| A27 | a new registration is held (`oauth_api.rs`) | `repeated_clicks_register_once` |
| A28 | RegisterError::Refused (`oauth_api.rs`) | `a_registration_refusal_shows_the_vendor_s_text` |
| A29 | RegisterError::Invalid (`oauth_api.rs`) | `a_registration_s_answer_is_checked_before_use`, `a_registration_with_a_secret_uses_it_and_one_without_an_id_is_refused` |
| A30 | RegisterError::EgressRefused (`oauth_api.rs`) | `a_registration_refused_by_egress_or_failing_has_its_code` |
| A31 | RegisterError::Unreachable (`oauth_api.rs`) | `a_registration_refused_by_egress_or_failing_has_its_code` |
| A32 | the next Connect omits a refused resource (`oauth_api.rs`) | `a_consent_refusing_resource_is_retried_without_it_by_the_next_connect` |
| A33 | flow cookie HttpOnly (`oauth_api.rs`) | `the_flow_cookie_is_http_only_lax_secure_and_scoped_to_the_callback` |
| A34 | flow cookie Secure (`oauth_api.rs`) | `the_flow_cookie_is_http_only_lax_secure_and_scoped_to_the_callback` |
| A35 | probe-now needs a credential (`oauth_api.rs`) | `a_probe_now_answers_the_item_after_it` |
| A36 | ResourceFit::Foreign by origin (`oauth_api.rs`) | `resource_fit_compares_origins_and_path_segments` |
| A37 | path segments (`oauth_api.rs`) | `resource_fit_compares_origins_and_path_segments` |
| A38 | an accepted resource only if it is this one (`oauth_api.rs`) | `a_mismatching_resource_is_accepted_only_exactly`, `a_resource_that_matches_again_clears_the_mismatch` |
| O01 | 3xx is NotHere (never followed) (`oauth.rs`) | `a_redirecting_candidate_is_not_followed` |
| O02 | 5xx is Unreachable (`oauth.rs`) | `an_oversized_document_is_not_here_and_a_failing_one_is_an_outage`, `failing_metadata_everywhere_is_unreachable` |
| O03 | an oversized document is NotHere (`oauth.rs`) | `an_oversized_document_is_not_here_and_a_failing_one_is_an_outage` |
| O04 | duplicate keys refused (L16) (`oauth.rs`) | `a_registration_is_taken_only_as_every_decoder_reads_it`, `a_resource_document_is_taken_only_as_every_decoder_reads_it` … |
| O05 | respelt keys refused (L16) (`oauth.rs`) | `a_registration_is_taken_only_as_every_decoder_reads_it`, `a_resource_document_is_taken_only_as_every_decoder_reads_it` … |
| O07 | control chars in values refused (L16) (`oauth.rs`) | `an_authorization_server_document_reads_one_way_or_not_at_all`, `server_metadata_is_taken_only_as_every_decoder_reads_it` |
| O08 | no fragment in endpoints (`oauth.rs`) | `a_token_endpoint_with_a_fragment_is_no_endpoint` |
| O09 | DiscoveryError::Insecure (secure()) (`oauth.rs`) | `plain_http_documents_and_servers_are_refused`, `plain_http_endpoints_are_refused_even_on_the_internal_network` |
| O10 | the challenge's resource_metadata first (`oauth.rs`) | `plain_http_documents_and_servers_are_refused`, `the_challenge_s_resource_metadata_is_tried_first` |
| O11 | the challenge's URL checked https (`oauth.rs`) | `plain_http_documents_and_servers_are_refused` |
| O12 | a PR document needs resource (`oauth.rs`) | `a_resource_document_without_resource_is_passed_over` |
| O13 | an unreachable PR candidate counts toward Unreachable (`oauth.rs`) | `an_oversized_document_is_not_here_and_a_failing_one_is_an_outage` |
| O14 | issuer must match (RFC 8414 3.3) (`oauth.rs`) | `an_authorization_server_document_reads_one_way_or_not_at_all`, `metadata_naming_another_issuer_is_refused` |
| O15 | authorization endpoint https (`oauth.rs`) | `plain_http_endpoints_are_refused_even_on_the_internal_network` |
| O16 | token endpoint https (`oauth.rs`) | `plain_http_endpoints_are_refused_even_on_the_internal_network` |
| O17 | registration endpoint https (`oauth.rs`) | `plain_http_documents_and_servers_are_refused` |
| O18 | AS metadata URL https (`oauth.rs`) | `plain_http_documents_and_servers_are_refused` |
| O19 | wrong issuer reported over unreachable (`oauth.rs`) | `metadata_naming_another_issuer_is_refused` |
| O20 | DiscoveryError::Unreachable (`oauth.rs`) | `an_oversized_document_is_not_here_and_a_failing_one_is_an_outage`, `egress_refusals_and_unreachable_servers_are_told_apart` … |
| O21 | DiscoveryError::Refused from a fetch (`oauth.rs`) | `a_metadata_fetch_the_egress_policy_refuses_ends_discovery` |
| O22 | registration endpoint https (O13) (`oauth.rs`) | `a_plain_http_registration_endpoint_is_egress_refused` |
| O23 | a registration 5xx is unreachable (`oauth.rs`) | `a_registration_refused_by_egress_or_failing_has_its_code` |
| O24 | RegisterError::Refused with vendor text (`oauth.rs`) | `a_registration_refusal_shows_the_vendor_s_text` |
| O25 | a registered client_id validated (`oauth.rs`) | `a_registration_s_answer_is_checked_before_use` |
| O26 | a registered secret validated (`oauth.rs`) | `a_registration_s_answer_is_checked_before_use` |
| O27 | registered post method (`oauth.rs`) | `a_registration_s_answer_is_checked_before_use` |
| O28 | a public client (`oauth.rs`) | `a_registration_s_answer_is_checked_before_use` |
| O29 | consent sends resource (`oauth.rs`) | `a_callback_s_parameters_are_read_only_once`, `a_completed_reconnect_moves_status_at_even_when_ok` … |
| O30 | consent sends scopes (G-5) (`oauth.rs`) | `a_dynamically_registered_connect_completes` |
| O31 | S256 at consent (`oauth.rs`) | `a_callback_after_the_session_ended_is_refused`, `a_callback_from_another_issuer_is_refused` … |
| O32 | token endpoint https (TokenError::EgressRefused) (`oauth.rs`) | `a_refused_token_endpoint_is_egress_refused` |
| O33 | 429 is Unavailable (`oauth.rs`) | `a_failing_token_endpoint_is_not_needs_auth` |
| O34 | TokenError::InvalidTarget (`oauth.rs`) | `a_refresh_is_retried_once_without_resource`, `the_exchange_is_retried_once_without_resource` |
| O35 | only named errors shown (`oauth.rs`) | `an_exchange_refusal_with_an_unknown_error_shows_only_its_status` |
| O36 | token_type must be bearer (`oauth.rs`) | `a_token_response_reads_one_way_or_not_at_all` |
| O37 | access token validated (`oauth.rs`) | `a_token_response_s_tokens_are_checked` |
| O38 | a negative expires_in is unknown (unsigned parser after F5) (`oauth.rs`) | `a_token_response_reads_one_way_or_not_at_all` |
| O39 | TokenError::Unavailable (transport) (`oauth.rs`) | `an_exchange_refused_by_egress_or_unreachable_has_its_code` |
| O40 | TokenError::Invalid (`oauth.rs`) | `a_token_response_reads_one_way_or_not_at_all` |
| O41 | TokenError::Refused names the error (`oauth.rs`) | `an_exchange_refusal_names_only_a_known_error` |
| O42 | client_secret_basic header (`oauth.rs`) | `a_pre_registered_confidential_client_connects`, `a_registration_with_a_secret_uses_it_and_one_without_an_id_is_refused` |
| O43 | client_secret_post in form (`oauth.rs`) | `a_registration_s_answer_is_checked_before_use`, `a_server_taking_only_client_secret_post_gets_the_secret_in_the_form` |
| O44 | resource in token form (`oauth.rs`) | `a_401_is_refreshed_and_retried_once`, `a_dynamically_registered_connect_completes` … |
| O45 | scopes sent on refresh (G-10) (`oauth.rs`) | `a_401_is_refreshed_and_retried_once` |
| O46 | verifier sent (`oauth.rs`) | `a_callback_s_parameters_are_read_only_once`, `a_completed_reconnect_moves_status_at_even_when_ok` … |
| O47 | resource_metadata name boundary (`oauth.rs`) | `a_challenge_s_resource_metadata_is_read_quoted_or_not` |
| O48 | a refresh token of another type invalidates (`oauth.rs`) | `a_token_response_s_tokens_are_checked` |
| O49 | path-inserted PR document (`oauth.rs`) | `a_dynamically_registered_connect_completes`, `a_metadata_fetch_the_egress_policy_refuses_ends_discovery` … |
| O50 | Basic header sent (`oauth.rs`) | `a_pre_registered_confidential_client_connects`, `a_registration_with_a_secret_uses_it_and_one_without_an_id_is_refused` |
| S01 | O3 origin/kind change deletes the OAuth client (`store.rs`) | `an_origin_change_or_a_delete_takes_the_client_and_the_grant` |
| S02 | origin/kind change clears oauth_error (`store.rs`) | `an_origin_change_clears_the_last_failure` |
| S03 | any URL change clears resource found/accepted (F1) (`store.rs`) | `a_mismatching_resource_is_accepted_only_exactly` |
| S04 | O17 DELETE removes the client (`store.rs`) | `a_changed_connection_never_exchanges_its_code`, `a_lost_client_pin_is_reread_before_consent` … |
| S05 | ClientChange::WrongKind (`store.rs`) | `a_secret_never_moves_to_another_client`, `a_static_token_is_no_grant` |
| S06 | ClientChange::Invalid (client id) (`store.rs`) | `a_pre_registered_client_s_id_and_secret_are_checked` |
| S07 | client secret validated (`store.rs`) | `a_pre_registered_client_s_id_and_secret_are_checked` |
| S08 | a kept secret never moves to another client (`store.rs`) | `a_secret_never_moves_to_another_client` |
| S09 | with a live grant a new client is pending (G-7) (`store.rs`) | `a_client_put_without_a_grant_clears_pending_key_columns`, `a_completed_connect_leaves_no_stale_columns` … |
| S10 | a new active client's pins cleared (R2) (`store.rs`) | `a_pinned_client_refuses_another_issuer` |
| S11 | pin once (active) (`store.rs`) | `a_client_is_pinned_once`, `a_lost_client_pin_is_reread_before_consent` |
| S12 | pin once (pending) (`store.rs`) | `a_lost_client_pin_is_reread_before_consent`, `a_pending_client_opens_its_secret_and_is_pinned_once` |
| S13 | oauth_credential only for OAuth kinds (`store.rs`) | `a_static_token_is_no_grant` |
| S14 | refresh write is a CAS (`store.rs`) | `a_late_refresh_never_overwrites_a_newer_grant`, `a_refresh_before_use_never_sends_another_url_s_token` … |
| S15 | refresh records resource_param_accepted (`store.rs`) | `a_refresh_is_retried_once_without_resource` |
| S16 | GrantStored::ConnectionChanged (connection edited) (`store.rs`) | `a_grant_is_stored_only_for_the_connection_as_it_was` |
| S17 | same active client (`store.rs`) | `a_changed_connection_never_exchanges_its_code`, `a_grant_is_stored_only_for_the_connection_as_it_was` |
| S18 | same pending client (`store.rs`) | `a_grant_for_a_pending_client_needs_that_very_client` |
| S19 | a stored grant is ok (`store.rs`) | `a_connect_clears_the_last_failure_and_recovers_the_status`, `a_dynamically_registered_connect_completes` |
| S20 | status_at moves even when ok (`store.rs`) | `a_completed_reconnect_moves_status_at_even_when_ok` |
| S21 | a Connect clears the last failure (`store.rs`) | `a_completed_connect_leaves_no_stale_columns` |
| S22 | a stored grant clears the pending pins (`store.rs`) | `a_completed_connect_leaves_no_stale_columns` |
| S23 | a pending client becomes the client (G-7) (`store.rs`) | `a_new_client_replaces_a_live_grant_s_only_when_its_connect_completes` |
| S24 | clearing oauth_error clears its time (`store.rs`) | `a_completed_connect_leaves_no_stale_columns` |
| S25 | mismatch only for the URL it was found for (`store.rs`) | `a_resource_is_recorded_only_for_the_url_it_was_found_for` |
| S26 | acceptance only for the URL (`store.rs`) | `a_resource_is_recorded_only_for_the_url_it_was_found_for` |
| S27 | O4 has_ciphertext counts client secrets (`store.rs`) | `a_client_secret_counts_as_ciphertext`, `a_pending_secret_alone_counts_as_ciphertext` |
| S28 | has_ciphertext counts pending secrets (`store.rs`) | `a_pending_secret_alone_counts_as_ciphertext` |
| S29 | O2 check_key opens a client secret (`store.rs`) | `the_key_check_opens_each_kind_with_its_field` |
| S30 | O2 check_key opens a grant with its field (`store.rs`) | `the_key_check_opens_each_kind_with_its_field`, `the_key_check_opens_the_newest_pending_secret` |
| S31 | O18 purge_hat deletes OAuth clients (`store.rs`) | `a_hat_purge_takes_its_oauth_clients` |
| S32 | oauth view only for OAuth kinds (`store.rs`) | `oauth_kinds_are_taken` |
| S33 | pending secret under its field (`store.rs`) | `a_lost_client_pin_is_reread_before_consent`, `a_pending_client_opens_its_secret_and_is_pinned_once` … |
| S34 | pending sealed under its field (`store.rs`) | `a_pending_client_opens_its_secret_and_is_pinned_once`, `a_pending_secret_has_its_own_key_version` … |
| SC01 | O11 checked_at throttled 60 s (traffic) (`scope.rs`) | `traffic_and_checks_record_only_for_the_url_reached` |
| SC02 | traffic 2xx -> ok (`scope.rs`) | `a_live_grant_is_sent_as_a_bearer_token`, `an_upstream_401_is_502_upstream_auth_and_needs_auth` … |
| SC03 | traffic ok only for the URL it reached (`scope.rs`) | `traffic_and_checks_record_only_for_the_url_reached` |
| SC04 | the same status keeps status_at (`scope.rs`) | `the_same_status_again_keeps_status_at` |
| SC05 | a transition only when it moved (dedupe at the source) (`scope.rs`) | `the_same_status_again_keeps_status_at` |
| SC06 | status only for the URL (`scope.rs`) | `a_late_refresh_never_resurrects_a_deleted_grant` |
| SC07 | checked only for the URL (`scope.rs`) | `traffic_and_checks_record_only_for_the_url_reached` |
| SC08 | C6: problems() lists only problems (`scope.rs`) | `startup_problems_are_the_needs_auth_and_error_connections_only` |
| SC09 | probe targets: OAuth only (`scope.rs`) | `the_background_probe_takes_oauth_connections_with_a_grant_only` |
| SC10 | probe targets: with a grant (`scope.rs`) | `the_background_probe_takes_oauth_connections_with_a_grant_only` |
| SC11 | traffic ok only with a credential (`scope.rs`) | `traffic_and_checks_record_only_for_the_url_reached` |
| PX01 | proactive refresh before use (`proxy.rs`) | `a_refresh_before_use_never_sends_another_url_s_token`, `a_token_about_to_expire_is_refreshed_first` … |
| PX02 | no proactive refresh without a refresh token (`proxy.rs`) | `an_unrefreshable_grant_does_not_wait_for_the_lock` |
| PX03 | O8 OAuth upstream arms (`proxy.rs`) | `a_401_is_refreshed_and_retried_once`, `a_caller_cancelled_mid_refresh_leaves_it_to_complete` … |
| PX04 | bearer header applied (`proxy.rs`) | `a_401_is_refreshed_and_retried_once`, `a_failing_upstream_probes_error` … |
| PX05 | a 401 nothing fixes is needs_auth (`proxy.rs`) | `a_grant_gone_before_its_refresh_is_needs_auth`, `a_grant_without_a_refresh_token_is_needs_auth_on_401` … |
| PX06 | static 401 sets needs_auth (`proxy.rs`) | `a_static_connection_s_401_is_not_refreshed`, `an_upstream_401_is_502_upstream_auth_and_needs_auth` |
| PX07 | second 401 -> needs_auth + 502 (`proxy.rs`) | `a_refused_credential_probes_needs_auth_after_one_refresh`, `a_second_401_is_needs_auth` |
| PX08 | NotRefreshable sets needs_auth (`proxy.rs`) | `a_grant_gone_before_its_refresh_is_needs_auth`, `a_grant_without_a_refresh_token_is_needs_auth_on_401` |
| PX09 | Refreshed::Refused -> upstream_auth (`proxy.rs`) | `a_refused_refresh_is_needs_auth` |
| PX10 | Sent::RefreshUnavailable (`proxy.rs`) | `a_failing_token_endpoint_is_not_needs_auth`, `a_redirect_an_unreachable_refresh_or_a_timeout_probes_error` … |
| PX11 | Sent::RefreshUnsaved (`proxy.rs`) | `a_grant_that_does_not_open_at_its_refresh_is_not_needs_auth`, `a_probe_the_gateway_fails_changes_nothing` … |
| PX12 | refresh unavailable -> 502 upstream_unreachable (`proxy.rs`) | `a_failing_token_endpoint_is_not_needs_auth`, `an_unreachable_token_endpoint_is_not_needs_auth` |
| PX13 | refresh unsaved -> 502 credential_unsaved (`proxy.rs`) | `a_grant_that_does_not_open_at_its_refresh_is_not_needs_auth`, `an_unsaved_refresh_is_not_needs_auth` |
| PX14 | O9 live traffic ok (+ Recovered) (`proxy.rs`) | `a_live_grant_is_sent_as_a_bearer_token`, `an_upstream_401_is_502_upstream_auth_and_needs_auth` … |
| PX15 | the retry uses the fresh token (`proxy.rs`) | `a_401_is_refreshed_and_retried_once`, `a_refresh_is_retried_once_without_resource` … |
| PX16 | proactive: URL and token read together after the refresh (decision 13) (`proxy.rs`) | `a_refresh_before_use_never_sends_another_url_s_token` |
| AP01 | PATCH takes the lock (`api.rs`) | `every_credential_write_waits_for_the_refresh_lock` |
| AP02 | PATCH of URL/kind/internal drops flows (`api.rs`) | `a_client_put_a_kind_change_or_a_delete_drops_the_flows`, `an_edit_drops_the_connection_s_flows` … |
| AP03 | kind change drops flows (`api.rs`) | `a_client_put_a_kind_change_or_a_delete_drops_the_flows`, `an_edit_forgets_a_refused_resource` |
| AP04 | DELETE takes the lock (`api.rs`) | `every_credential_write_waits_for_the_refresh_lock` |
| AP05 | DELETE drops flows (`api.rs`) | `a_client_put_a_kind_change_or_a_delete_drops_the_flows` |
| AP06 | static credential PUT takes the lock (`api.rs`) | `every_credential_write_waits_for_the_refresh_lock` |
| AP07 | client PUT behind step-up (`api.rs`) | `a_secret_never_moves_to_another_client` |
| AP08 | authorize behind step-up (`api.rs`) | `authorize_needs_step_up_and_an_oauth_kind` |
| AP09 | Secure unless loopback http (`api.rs`) | `the_flow_cookie_is_http_only_lax_secure_and_scoped_to_the_callback` |
| AP10 | O6 unknown status logged (`api.rs`) | `an_unknown_stored_status_is_logged` |
| AP11 | the callback is served (`api.rs`) | `a_callback_after_the_session_ended_is_refused`, `a_callback_from_another_issuer_is_refused` … |
| AP12 | redirect_uri is <origin>/api/mcp/oauth/callback (`api.rs`) | `a_callback_after_the_session_ended_is_refused`, `a_callback_from_another_issuer_is_refused` … |
| CR01 | O1 OAuth grant under its own AAD field (`crypto.rs`) | `the_key_check_opens_each_kind_with_its_field`, `the_key_check_opens_the_newest_pending_secret` |
| J01 | Kelvin sign folds to k (token_endpoint) (`jsonrpc.rs`) | `a_token_response_is_taken_only_as_every_decoder_reads_it`, `server_metadata_is_taken_only_as_every_decoder_reads_it` |
| L01 | open() uses the given notifier (`lib.rs`) | `the_gateway_announces_through_push_and_probes` |
| M01 | startup announce wired (`main.rs`) | `the_gateway_announces_through_push_and_probes` |
| M02 | background probe wired (`main.rs`) | `the_gateway_announces_through_push_and_probes` |
| M03 | O20 Notifier is Push (`main.rs`) | `the_gateway_announces_through_push_and_probes` |
| M04 | one runtime for API and proxy (`main.rs`) | `the_gateway_announces_through_push_and_probes` |
| E01 | is_https_or_loopback: http only to loopback (`egress.rs`) | `oauth_urls_are_https_or_loopback_http` |
| E02 | declared length over the cap refused before reading (`egress.rs`) | `a_body_is_read_up_to_its_cap` |
| E03 | read stops past the cap (`egress.rs`) | `a_body_is_read_up_to_its_cap` |
| D13a | decision 13: a retry only to the URL its token was granted for (`proxy.rs`) | `a_probe_whose_connection_moved_during_its_refresh_changes_nothing`, `a_retry_never_sends_another_url_s_token` … |
| D13b | decision 13: a retry only with the allowance its token was read with (`proxy.rs`) | `a_retry_keeps_the_allowance_it_was_read_with` |
| D13c | Sent::Changed outcome (`proxy.rs`) | `a_probe_whose_connection_moved_during_its_refresh_changes_nothing`, `a_retry_keeps_the_allowance_it_was_read_with` … |
| D13d | Sent::Changed -> 502 upstream_changed (`proxy.rs`) | `a_retry_keeps_the_allowance_it_was_read_with`, `a_retry_never_sends_another_url_s_token` … |
| D13e | CAS lost: the stored token comes with the stored URL, not the one read before (`refresh.rs`) | `a_retry_keeps_the_allowance_it_was_read_with`, `a_retry_never_sends_another_url_s_token` |
| D13f | single-flight Retry carries the URL read with its token (`refresh.rs`) | `concurrent_401s_share_one_refresh` |
| D13g | probe: Sent::Changed is no change (`probe.rs`) | `a_probe_whose_connection_moved_during_its_refresh_changes_nothing` |
| CB01 | egress_refused: the operator's oauth_error keeps the policy's reason (`callback.rs`) | `an_exchange_refused_by_egress_or_unreachable_has_its_code` |
| CB02 | detail, not the page message, is recorded (`callback.rs`) | `an_exchange_refused_by_egress_or_unreachable_has_its_code` |
| CB03 | the page shows no address (`callback.rs`) | `an_exchange_refused_by_egress_or_unreachable_has_its_code` |
| SF1a | F1 authorization/token origin binding (`oauth.rs`) | `endpoints_without_iss_share_one_origin` |
| SF1b | F1 registration origin binding (`oauth.rs`) | `endpoints_without_iss_share_one_origin` |
| SF1c | F1 verdict discovery_failed (`oauth.rs`) | `endpoints_without_iss_share_one_origin` |
| SF2a | F2 check before exchange (`callback.rs`) | `a_changed_connection_never_exchanges_its_code`, `a_connection_changed_meanwhile_gets_no_grant` … |
| SF2b | F2 early URL generation (`store.rs`) | `a_connection_changed_meanwhile_gets_no_grant` |
| SF2c | F2 early kind generation (`store.rs`) | `a_changed_connection_never_exchanges_its_code` |
| SF2d | F2 early allowance generation (`store.rs`) | `a_changed_connection_never_exchanges_its_code` |
| SF2e | F2 same-ID secret invalidates consumed flow (`store.rs`) | `a_secret_changed_during_exchange_is_not_overwritten` |
| SF2f | F2 unreadable early connection is internal (`callback.rs`) | `an_unreadable_connection_before_exchange_sends_nothing` |
| SF2g | F2 retain persistence check after exchange (`store.rs`) | `a_secret_changed_during_exchange_is_not_overwritten` |
| SF3a | F3 lost pin is re-read (`oauth_api.rs`) | `a_lost_client_pin_is_reread_before_consent` |
| SF3b | F3 re-read client ID (`oauth_api.rs`) | `a_lost_client_pin_is_reread_before_consent` |
| SF3c | F3 re-read secret (`oauth_api.rs`) | `a_lost_client_pin_is_reread_before_consent` |
| SF3d | F3 re-read issuer (`oauth_api.rs`) | `a_lost_client_pin_is_reread_before_consent` |
| SF3e | F3 re-read token endpoint (`oauth_api.rs`) | `a_lost_client_pin_is_reread_before_consent` |
| SF4a | F4 pending write leaves active version intact (`store.rs`) | `a_pending_secret_has_its_own_key_version` |
| SF4b | F4 Keep opens pending with pending version (`store.rs`) | `a_pending_secret_has_its_own_key_version` |
| SF4c | F4 slots open pending version (`store.rs`) | `a_pending_secret_has_its_own_key_version` |
| SF4d | F4 startup opens newest pending (`store.rs`) | `the_key_check_opens_the_newest_pending_secret` |
| SF4e | F4 newest pending timestamp (`store.rs`) | `the_key_check_opens_the_newest_pending_secret` |
| SF4f | F4 pending timestamp stored (`store.rs`) | `a_client_put_without_a_grant_clears_pending_key_columns` |
| SF4clear0pending_key_version | F4 clear pending_key_version upsert 0 (`store.rs`) | `a_client_put_without_a_grant_clears_pending_key_columns` |
| SF4clear0pending_updated_at | F4 clear pending_updated_at upsert 0 (`store.rs`) | `a_client_put_without_a_grant_clears_pending_key_columns` |
| SF4clear1pending_key_version | F4 clear pending_key_version upsert 1 (`store.rs`) | `a_completed_connect_leaves_no_stale_columns` |
| SF4clear1pending_updated_at | F4 clear pending_updated_at upsert 1 (`store.rs`) | `a_completed_connect_leaves_no_stale_columns` |
| SF5a | F5 lifetime cap (`oauth.rs`) | `expiry_is_capped_and_saturates` |
| SF5b | F5 timestamp saturation (`oauth.rs`) | `expiry_is_capped_and_saturates` |
| SF5c | F5 due cannot overflow (`refresh.rs`) | `refresh_due_handles_extreme_stamps` |
| SF5d | F5 large numeric lifetime remains known (`oauth.rs`) | `vendor_lifetimes_have_one_bounded_interpretation` |
| SF5e | F5 large string lifetime remains known (`oauth.rs`) | `vendor_lifetimes_have_one_bounded_interpretation` |
| SF6a | F6 vendor denial canary (`callback.rs`) | `no_url_secret_code_verifier_token_or_client_secret_is_logged_or_answered` |
| SF6b | F6 failed exchange body canary (`oauth.rs`) | `no_url_secret_code_verifier_token_or_client_secret_is_logged_or_answered` |
| SF6c | F6 egress-refused exchange URL canary (`callback.rs`) | `no_url_secret_code_verifier_token_or_client_secret_is_logged_or_answered` |
| SF6d | F6 DCR refusal canary (`oauth_api.rs`) | `no_url_secret_code_verifier_token_or_client_secret_is_logged_or_answered` |
| SF6e | F6 probe failure URL canary (`probe.rs`) | `no_url_secret_code_verifier_token_or_client_secret_is_logged_or_answered` |
| SNquote | quoted challenge text does not name metadata (`oauth.rs`) | `challenge_parameters_respect_quotes_and_have_one_reading` |
| SNclean | challenge URL controls cannot disappear (`oauth.rs`) | `challenge_parameters_respect_quotes_and_have_one_reading` |
| SNduplicate | duplicate metadata parameters have no first/last verdict (`oauth.rs`) | `challenge_parameters_respect_quotes_and_have_one_reading` |
| SNdeadline | discovery overall deadline (`oauth.rs`) | `discovery_has_one_deadline` |
| SF4write | F4 pending key version is stored (`store.rs`) | `a_pending_secret_has_its_own_key_version` |
| M2 | deleted connection during pin reread is 404 (`oauth_api.rs`) | `a_lost_client_pin_is_reread_before_consent` |
| SF6body | upstream 503 error body never logged (`probe.rs`) | `no_url_secret_code_verifier_token_or_client_secret_is_logged_or_answered` |
| I01 | proxy and session transitions share revocations (`proxy.rs`) | `a_revoke_committed_during_the_resolve_ends_the_request`, `a_revoke_cuts_the_tokens_open_stream_and_not_another_tokens` … |
| I03 | OAuth forwarding retains validated raw MCP session ID (`proxy.rs`) | `a_replay_cursor_goes_up_only_with_a_bound_session_id`, `a_request_goes_up_with_the_credential_and_the_allowed_headers_only` … |
| I04 | internal probe uses its raw MCP session ID (`probe.rs`) | `a_healthy_connection_probes_ok_with_a_whole_handshake` |
| I05 | hat purge drops pending OAuth flows (`session.rs`) | `a_hat_purge_drops_its_oauth_flows` |
| I06 | hat purge preserves another hat flows (`session.rs`) | `a_hat_purge_drops_its_oauth_flows` |
| I02 | collector installs session gateway on the shared runtime (`main.rs`) | `the_collector_gives_its_sessions_the_gateway` |
| I07 | session transitions cut the runtime registry (`session.rs`) | `a_revoke_committed_during_the_resolve_ends_the_request`, `a_revoke_cuts_the_tokens_open_stream_and_not_another_tokens` … |

**C23** (an unreadable query refused before anything else) remains the previously accepted equivalent: a failed parse has no `state`, so both paths answer `flow_unknown`. It is not counted as a bite. Phase B re-ran the entire probe set on the integrated tip, including every conflicted file and all nine new probes; 325 bite. O38 was updated to mutate the negative-number parser decision after F5 made its old filter-removal mutation redundant. AP10 now includes its existing `api_log` positive test. Both fresh reruns bite; raw prior observations are retained. Every anchor occurs once, every BITE has named failing tests, and no source/test weakening was used. F7’s separate document-wording probe bites.

## File structure

| Path | Responsibility | Task |
|---|---|---|
| `crates/hennery-kernel/src/egress.rs` | `is_https_or_loopback`, `read_capped` | 1 |
| `crates/hennery-proto/src/rest.rs`, `codegen.rs` | the OAuth wire types | 2 |
| `crates/hennery-gateway/src/schema.rs`, `model.rs`, `crypto.rs`, `key.rs`, `store.rs`, `scope.rs` | migration 4, the model's OAuth types, the fields, the store's OAuth writes, the status writes reporting their changes | 3 |
| `crates/hennery-gateway/src/oauth.rs` (new), `flows.rs` (new), `jsonrpc.rs` | the OAuth client, the flows | 4 |
| `crates/hennery-gateway/src/notify.rs`, `runtime.rs`, `refresh.rs`, `probe.rs` (new); `proxy.rs`, `lib.rs`, `api.rs` (its state); `crates/hennery/src/main.rs` | the engine and its wiring | 5 |
| `crates/hennery-gateway/src/oauth_api.rs`, `callback.rs` (new); `api.rs` (routes, item; OAuth kinds taken); `crates/hennery-kernel/src/capabilities.rs` | the Connect API | 6 |
| `crates/hennery-gateway/src/{oauth,callback,oauth_api,refresh,store,schema}.rs`, OAuth tests and owner audit | security amendments, regression tests and failure canaries | 7 |
| `docs/specs/…` | write-back including the amendments | 8 |
| `src/oauth_api.rs`, OAuth/log tests and fake server | re-confirmation notes m2 and F6 body leg | 9 |

**The intermediate edits** (what no commit of the scratch branch holds; each is undone by a later task's block): from Task 3 to Task 6, the API's create and update refuse the OAuth kinds (`Change::Unsupported`, kept until Task 6); from Task 3 to Task 5, the old proxy calls the status writes' new signatures; from Task 2 to Task 6 the wire item's `checked_at`, `oauth` and `oauth_error` are `None`; in Task 5 the list builds items without a redirect URI and `update` reads nothing before; `lib.rs` declares each module from the task that brings it.

**Reading the steps:** "Create `path`" is a whole file; "In `path`, replace: … with: …" replaces its one occurrence, in order, as the file stands after the blocks before it. A test step that creates a module file with only its `#[cfg(test)]` part (Task 4) is replaced whole by its code step.

---
### Task 1: The kernel's egress: the scheme rule for OAuth, a capped body read

**Files:** Modify `crates/hennery-kernel/src/egress.rs`, `crates/hennery-kernel/tests/egress.rs`.

- [ ] **Step 1: Write the failing tests**

In `crates/hennery-kernel/tests/egress.rs`, replace:

  ```rust
      SlowBody(Duration),
  }
  ```

with:

  ```rust
      SlowBody(Duration),
      /// Headers declaring a long body, then nothing (plan 8f).
      DeclaredOnly,
  }
  ```

In `crates/hennery-kernel/tests/egress.rs`, replace:

  ```rust
              Answer::Silent => {
                  tokio::time::sleep(Duration::from_secs(3600)).await;
  ```

with:

  ```rust
              Answer::Silent => {
                  tokio::time::sleep(Duration::from_secs(3600)).await;
                  return;
              }
              Answer::DeclaredOnly => {
                  let head = b"HTTP/1.1 200 OK\r\ncontent-length: 1000000\r\n\r\n";
                  if stream.write_all(head).await.is_err() {
                      return;
                  }
                  tokio::time::sleep(Duration::from_secs(3600)).await;
  ```

In `crates/hennery-kernel/tests/egress.rs`, replace:

  ```rust
      assert_eq!(clone.client(Allowance::PublicOnly).allowance(), Allowance::PublicOnly);
  }
  ```

with:

  ```rust
      assert_eq!(clone.client(Allowance::PublicOnly).allowance(), Allowance::PublicOnly);
  }

  /// Plan 8f (the egress plan's O3): a whole body is read up to its cap;
  /// a declared length over it is refused before reading, and a body that
  /// grows past it as read is refused too.
  #[tokio::test]
  async fn a_body_is_read_up_to_its_cap() {
      use hennery_kernel::egress::{BodyError, read_capped};
      let ok = Server::start(Answer::Ok).await;
      let client = egress().client(Allowance::InternalNetwork);
      let response = within(client.send(get(ok.url("127.0.0.1")))).await.unwrap();
      assert_eq!(read_capped(response, 2).await.unwrap(), b"ok");
      let response = within(client.send(get(ok.url("127.0.0.1")))).await.unwrap();
      assert!(matches!(read_capped(response, 1).await, Err(BodyError::TooLarge)));
      // A declared length over the cap is refused before anything is read:
      // this body never comes.
      let declared = Server::start(Answer::DeclaredOnly).await;
      let response = within(client.send_streaming(get(declared.url("127.0.0.1"))))
          .await
          .unwrap();
      assert!(matches!(
          within(read_capped(response, 10)).await,
          Err(BodyError::TooLarge)
      ));
      // Chunked, no declared length: "first" then "last", 9 bytes.
      let slow = Server::start(Answer::SlowBody(Duration::from_millis(10))).await;
      let response = within(client.send_streaming(get(slow.url("127.0.0.1")))).await.unwrap();
      assert!(matches!(
          within(read_capped(response, 6)).await,
          Err(BodyError::TooLarge)
      ));
      let response = within(client.send_streaming(get(slow.url("127.0.0.1")))).await.unwrap();
      assert_eq!(within(read_capped(response, 9)).await.unwrap(), b"firstlast");
  }

  /// Plan 8f (plan 8b-ii's hand-off): OAuth's scheme rule, `https` or plain
  /// `http` to loopback, whatever the allowance.
  #[test]
  fn oauth_urls_are_https_or_loopback_http() {
      use hennery_kernel::egress::is_https_or_loopback;
      for (url, expected) in [
          ("https://as.example/token", true),
          ("https://10.0.0.1/token", true),
          ("http://127.0.0.1:8080/token", true),
          ("http://[::1]/token", true),
          ("http://localhost/token", true),
          ("http://10.0.0.1/token", false),
          ("http://192.168.1.1/token", false),
          ("http://as.example/token", false),
          ("ftp://as.example/token", false),
      ] {
          assert_eq!(is_https_or_loopback(&Url::parse(url).unwrap()), expected, "{url}");
      }
  }
  ```

- [ ] **Step 2: Run them and see them fail, then commit them**

   ```sh
   nix develop -c cargo test -p hennery-kernel --locked --test egress
   ```

   It does not compile: `egress::is_https_or_loopback`, `read_capped` and `BodyError` do not exist.

   ```sh
   git add -A && git -c commit.gpgsign=false commit -m "test(kernel): OAuth's scheme rule and a capped body read"
   ```

- [ ] **Step 3: Implement**

In `crates/hennery-kernel/src/egress.rs`, replace:

  ```rust
      Ok(())
  }
  ```

with:

  ```rust
      Ok(())
  }

  /// `https`, or plain `http` to loopback: the scheme rule for OAuth's URLs
  /// (gateway spec §4, §5.7), which stays this even for a connection marked
  /// "internal network", whose client [`check_url`] lets send plain `http`
  /// to internal addresses (plan 8b-ii). The OAuth caller checks it itself
  /// before sending (plan 8f).
  pub fn is_https_or_loopback(url: &Url) -> bool {
      match url.scheme() {
          "https" => true,
          "http" => is_loopback_host(url),
          _ => false,
      }
  }

  /// Why [`read_capped`] did not return a body.
  #[derive(Debug)]
  pub enum BodyError {
      /// Longer than the cap, declared or as read.
      TooLarge,
      /// It failed while it was read (its deadline included), without the
      /// URL.
      Failed(reqwest::Error),
  }

  impl fmt::Display for BodyError {
      fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
          match self {
              BodyError::TooLarge => f.write_str("the response body is over its limit"),
              BodyError::Failed(err) => write!(f, "{err}"),
          }
      }
  }

  impl std::error::Error for BodyError {}

  /// `response`'s body, refused past `max` bytes: a declared length over it
  /// is refused before anything is read, and the read stops at the first
  /// chunk past it. [`EgressClient::send`] bounds a request's time, not its
  /// size; this is the size (the egress plan's O3), for every caller that
  /// reads a whole body (OAuth's documents and token responses, plan 8f).
  pub async fn read_capped(mut response: Response, max: usize) -> Result<Vec<u8>, BodyError> {
      if response.content_length().is_some_and(|len| len > max as u64) {
          return Err(BodyError::TooLarge);
      }
      let mut out = Vec::new();
      while let Some(chunk) = response
          .chunk()
          .await
          .map_err(|err| BodyError::Failed(err.without_url()))?
      {
          if out.len() + chunk.len() > max {
              return Err(BodyError::TooLarge);
          }
          out.extend_from_slice(&chunk);
      }
      Ok(out)
  }
  ```

- [ ] **Step 4: Run the checks**

   Run the five checks:

   ```sh
   nix develop -c cargo fmt --all --check
   nix develop -c cargo clippy --workspace --all-targets --locked -- -D warnings
   nix develop -c cargo clippy -p hennery --locked -- -D warnings
   nix develop -c cargo test --workspace --locked
   nix develop -c cargo run -p hennery-proto --bin gen --locked -- --check
   ```

   Phase B targeted tests: exit 0, 17 passed. See Execution status for the final full gate and task-specific supplementary checks.

- [ ] **Step 5: Commit**

   ```sh
   git add -A && git -c commit.gpgsign=false commit -m "feat(kernel): egress's https-or-loopback rule and a capped body read for OAuth"
   ```

### Task 2: The wire types

**Files:** Modify `crates/hennery-proto/src/rest.rs`, `src/codegen.rs`, `tests/codegen.rs`; `crates/hennery-gateway/src/api.rs` (the item's new fields, `None` until Task 6); regenerate `schema/hennery-protocol.schema.json` and `web/src/generated/protocol.ts`.

- [ ] **Step 1: Write the failing tests**

In `crates/hennery-proto/tests/codegen.rs`, replace:

  ```rust
  const GATEWAY_TYPES: [&str; 16] = [
  ```

with:

  ```rust
  const GATEWAY_TYPES: [&str; 23] = [
  ```

In `crates/hennery-proto/tests/codegen.rs`, replace:

  ```rust
      "McpStdioServersRequest",
  ];
  ```

with:

  ```rust
      "McpStdioServersRequest",
      // Plan 8f.
      "McpOauthState",
      "McpOauthPendingClient",
      "McpOauthError",
      "McpOauthRedirect",
      "McpOauthClientRequest",
      "McpAuthorizeRequest",
      "McpAuthorizeResponse",
  ];
  ```

In `crates/hennery-proto/tests/codegen.rs`, replace:

  ```rust
          "unsupported_cred_kind",
  ```

with:

  ```rust
  ```

In `crates/hennery-proto/tests/codegen.rs`, replace:

  ```rust
          "internal",
      ] {
  ```

with:

  ```rust
          "internal",
          // Plan 8f: authorize, the callback and the probe.
          "no_oauth_client",
          "no_registration_endpoint",
          "resource_mismatch",
          "issuer_changed",
          "resource_foreign",
          "too_many_flows",
          "discovery_failed",
          "insecure_metadata",
          "pkce_unsupported",
          "registration_refused",
          "egress_refused",
          "upstream_unreachable",
          "flow_unknown",
          "flow_mismatch",
          "session_ended",
          "issuer_mismatch",
          "consent_denied",
          "connection_changed",
          "exchange_failed",
          "no_credential",
      ] {
  ```

- [ ] **Step 2: Run them and see them fail, then commit them**

   ```sh
   nix develop -c cargo test -p hennery-proto --locked --test codegen
   ```

   `the_gateways_wire_types_document_every_field_and_variant` and `a_types_doc_reaches_the_typescript` fail: the OAuth wire types do not exist.

   ```sh
   git add -A && git -c commit.gpgsign=false commit -m "test(proto): the OAuth wire types are generated, every field documented"
   ```

- [ ] **Step 3: Implement**

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
          },
          id: record.id,
  ```

with:

  ```rust
          },
          checked_at: None,
          oauth: None,
          oauth_error: None,
          id: record.id,
  ```

In `crates/hennery-proto/src/codegen.rs`, replace:

  ```rust
          rest::McpStdioServerInput,
          rest::McpStdioServersRequest,
      );
      // `serde_json::Map` is a `BTreeMap` (always iterates sorted) by default,
  ```

with:

  ```rust
          rest::McpStdioServerInput,
          rest::McpStdioServersRequest,
          rest::McpOauthState,
          rest::McpOauthPendingClient,
          rest::McpOauthError,
          rest::McpOauthRedirect,
          rest::McpOauthClientRequest,
          rest::McpAuthorizeRequest,
          rest::McpAuthorizeResponse,
      );
      // `serde_json::Map` is a `BTreeMap` (always iterates sorted) by default,
  ```

In `crates/hennery-proto/src/codegen.rs`, replace:

  ```rust
          rest::McpStdioServersRequest,
      );
  ```

with:

  ```rust
          rest::McpStdioServersRequest,
          rest::McpOauthState,
          rest::McpOauthPendingClient,
          rest::McpOauthError,
          rest::McpOauthRedirect,
          rest::McpOauthClientRequest,
          rest::McpAuthorizeRequest,
          rest::McpAuthorizeResponse,
      );
  ```

In `crates/hennery-proto/src/rest.rs`, replace:

  ```rust
  /// `oauth_client`, OAuth (plan 8f). Plan 8a takes `none` and `static`;
  /// naming an OAuth kind in a create or a change answers 400
  /// `unsupported_cred_kind` until plan 8f.
  ```

with:

  ```rust
  /// `oauth_client`, OAuth (plan 8f): Connect with
  /// `POST /api/mcp/connections/{id}/authorize`.
  ```

In `crates/hennery-proto/src/rest.rs`, replace:

  ```rust
      /// OAuth, the client registered dynamically (plan 8f).
      OauthDcr,
      /// OAuth, with a client the operator registered with the vendor (plan 8f).
      OauthClient,
  }

  /// A connection's health (gateway spec §7): `not_connected`, not checked
  /// yet; `ok`; `needs_auth`, the operator must sign in again; `error`, with
  /// `status_note`. Plan 8a only ever reports `not_connected`; the probe
  /// (plan 8f) sets the others.
  ```

with:

  ```rust
      /// OAuth, the client registered dynamically as a public client at the
      /// first Connect (RFC 7591).
      OauthDcr,
      /// OAuth, with a client the operator registered with the vendor
      /// (`PUT /api/mcp/connections/{id}/oauth-client`).
      OauthClient,
  }

  /// A connection's health (gateway spec §7): `not_connected`, no credential
  /// yet (offer Connect); `ok`; `needs_auth`, the vendor refused the
  /// credential (offer Reconnect, or "set the token again"); `error`, an
  /// outage, with `status_note` (never offer a reconnect). Live traffic, the
  /// 15-minute probe of OAuth connections, and a probe the operator asks for
  /// set it; a `needs_auth` connection stays mounted.
  ```

In `crates/hennery-proto/src/rest.rs`, replace:

  ```rust
  /// mounts and credential deleted with it; 403 `step_up_required`, 404
  /// `not_found`.
  ```

with:

  ```rust
  /// mounts, credential and OAuth client deleted with it, its OAuth flows in
  /// flight dropped; 403 `step_up_required`, 404 `not_found`.
  ///
  /// `POST /api/mcp/connections/{id}/probe` (no step-up; may change) takes
  /// `{}`: the gateway spec §7 handshake now, through the proxy's forwarding
  /// path, and 200 with the item after it. Single-flight per connection; a
  /// call within 10 s of a completed probe answers its result without a new
  /// request; bounded at 30 s (`error`, "the probe timed out"). Its own
  /// codes, beyond every route's: 404 `not_found`; 409 `no_credential` (a
  /// `static` or OAuth connection with none stored: set the token or Connect
  /// first).
  ```

In `crates/hennery-proto/src/rest.rs`, replace:

  ```rust
      /// Why `status` is what it is, when the probe (plan 8f) says; absent
  ```

with:

  ```rust
      /// Why `status` is what it is (`needs_auth`, `error`), as text; absent
  ```

In `crates/hennery-proto/src/rest.rs`, replace:

  ```rust
      /// The upstream account it is signed in as, when the probe (plan 8f)
      /// learns it; absent otherwise.
  ```

with:

  ```rust
      /// The upstream account it is signed in as, when the vendor reports one;
      /// absent otherwise (none is learned yet: plan 8f's Q3).
  ```

In `crates/hennery-proto/src/rest.rs`, replace:

  ```rust
      pub mounts: Vec<String>,
  }
  ```

with:

  ```rust
      pub mounts: Vec<String>,
      /// When the gateway last learned the status, from the 15-minute probe,
      /// a probe the operator asked for, or live traffic: RFC 3339.
      /// `status_at` is when it last changed. Absent: never checked.
      #[serde(default, skip_serializing_if = "Option::is_none")]
      #[ts(type = "string | undefined", optional)]
      pub checked_at: Option<String>,
      /// OAuth set-up, for `oauth_dcr` and `oauth_client` only; absent for the
      /// other kinds.
      #[serde(default, skip_serializing_if = "Option::is_none")]
      #[ts(type = "McpOauthState | undefined", optional)]
      pub oauth: Option<McpOauthState>,
      /// Why the latest Connect did not complete; cleared by the next
      /// completed one and by the next authorize. Not the status: a failed
      /// reconnect of a working grant leaves `ok`.
      #[serde(default, skip_serializing_if = "Option::is_none")]
      #[ts(type = "McpOauthError | undefined", optional)]
      pub oauth_error: Option<McpOauthError>,
  }

  /// A connection's OAuth set-up (gateway spec §4), without a secret. Its
  /// `Debug` shows neither `resource` value (lane L11: they are URLs).
  #[derive(Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
  pub struct McpOauthState {
      /// What to register at the vendor for `oauth_client`:
      /// `<public_url>/api/mcp/oauth/callback`.
      pub redirect_uri: String,
      /// The client in use: the pre-registered one, or the one registered
      /// dynamically. Absent: none yet (an `oauth_dcr` before its first
      /// Connect, an `oauth_client` before `PUT …/oauth-client`). Not a
      /// secret.
      #[serde(default, skip_serializing_if = "Option::is_none")]
      #[ts(type = "string | undefined", optional)]
      pub client_id: Option<String>,
      /// A client secret is stored. No route answers it.
      pub has_client_secret: bool,
      /// [may change] A pre-registered client saved while a grant is live: it
      /// replaces `client_id` only when a Connect with it completes (G-7).
      #[serde(default, skip_serializing_if = "Option::is_none")]
      #[ts(type = "McpOauthPendingClient | undefined", optional)]
      pub pending_client: Option<McpOauthPendingClient>,
      /// The protected-resource document's `resource` that does not match the
      /// URL (gateway spec §4.1, G-4), as the latest authorize found it, not
      /// yet accepted. Shown with `url` for the operator to compare.
      #[serde(default, skip_serializing_if = "Option::is_none")]
      #[ts(type = "string | undefined", optional)]
      pub resource_mismatch: Option<String>,
      /// The mismatching `resource` the operator accepted; cleared by any
      /// change of `url`.
      #[serde(default, skip_serializing_if = "Option::is_none")]
      #[ts(type = "string | undefined", optional)]
      pub accepted_resource: Option<String>,
  }

  /// A pre-registered client waiting for a Connect to complete (G-7).
  #[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
  pub struct McpOauthPendingClient {
      /// The client id the operator saved. Not a secret.
      pub client_id: String,
      /// A client secret is stored with it. No route answers it.
      pub has_client_secret: bool,
  }

  /// Why the latest Connect failed. `code` is one of the authorize or
  /// callback codes; `message` is rendered as text, any vendor text in it
  /// cut to 300 characters.
  #[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
  pub struct McpOauthError {
      /// An authorize code (`discovery_failed`, `registration_refused`, …) or
      /// a callback result (`consent_denied`, `exchange_failed`, …).
      pub code: String,
      /// What to show, as text.
      pub message: String,
      /// RFC 3339.
      pub at: String,
  }

  /// `GET /api/mcp/oauth/redirect-uri` (200): the redirect URI to register at
  /// a vendor for an `oauth_client` connection, before any connection exists
  /// (the add form). Changes only with `public_url`.
  #[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
  pub struct McpOauthRedirect {
      /// `<public_url>/api/mcp/oauth/callback`.
      pub redirect_uri: String,
  }

  /// `PUT /api/mcp/connections/{id}/oauth-client` (step-up): the client the
  /// operator registered at the vendor (gateway spec §4.2, G-1). 200 with the
  /// `McpConnectionItem`. Write-only for the secret: `client_secret` absent
  /// keeps the stored one, but only while `client_id` equals the client this
  /// `PUT` replaces (the pending one if any, else the active one); a secret
  /// never moves to another client id. `null` stores none (a public client);
  /// a string sets it. The first authorize with a client pins its `issuer`
  /// and `token_endpoint`; the secret is only ever sent to that token
  /// endpoint. A `PUT` drops the connection's live flows. With a live grant
  /// the client is saved as `oauth.pending_client` and takes effect when a
  /// Connect with it completes (G-7); without one it takes effect at once.
  /// Its `Debug` never shows the secret.
  ///
  /// Its own codes, beyond every route's (see `McpConnectionItem`): 403
  /// `step_up_required`; 404 `not_found`; 409 `wrong_cred_kind` (the
  /// connection is not `oauth_client`); 400 `invalid` (`client_id` not 1 to
  /// 512 visible ASCII characters; a secret not 1 to 8192 visible ASCII
  /// characters without spaces, never quoted; a new `client_id` without
  /// `client_secret`: send the secret, or `null` for a public client).
  #[derive(Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
  #[serde(deny_unknown_fields)]
  pub struct McpOauthClientRequest {
      /// The client id registered at the vendor: 1 to 512 visible ASCII
      /// characters.
      pub client_id: String,
      /// Absent: kept (same `client_id` only). `null`: none. A string: set.
      #[serde(default, with = "present", skip_serializing_if = "Option::is_none")]
      #[schemars(with = "Option<String>")]
      #[ts(type = "string | null | undefined", optional)]
      pub client_secret: Option<Option<String>>,
  }

  impl std::fmt::Debug for McpOauthState {
      fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
          f.debug_struct("McpOauthState")
              .field("client_id", &self.client_id)
              .field("has_client_secret", &self.has_client_secret)
              .field("pending_client", &self.pending_client)
              .field("resource_mismatch", &self.resource_mismatch.is_some())
              .field("accepted_resource", &self.accepted_resource.is_some())
              .finish_non_exhaustive()
      }
  }

  impl std::fmt::Debug for McpOauthClientRequest {
      fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
          f.debug_struct("McpOauthClientRequest")
              .field("client_id", &self.client_id)
              .field(
                  "client_secret",
                  &self.client_secret.as_ref().map(|s| s.as_ref().map(|_| "<redacted>")),
              )
              .finish()
      }
  }

  /// `POST /api/mcp/connections/{id}/authorize` (step-up): starts OAuth
  /// (gateway spec §4.1–§4.3). Discovery and, for `oauth_dcr`, registration
  /// happen here, through the egress policy. 200 with the consent URL; the
  /// answer sets the flow's own cookie (`hennery_mcp_flow_<16 hex of
  /// sha256(state)>`, `HttpOnly`, `SameSite=Lax`, `Secure` unless
  /// `public_url` is loopback `http`, `Path=/api/mcp/oauth/callback`,
  /// `Max-Age=900`). The frontend never reads the cookie. Send `{}` when
  /// accepting nothing: a body is required.
  ///
  /// Its own codes, beyond every route's (see `McpConnectionItem`):
  /// - 403 `step_up_required`; 404 `not_found`;
  /// - 409 `wrong_cred_kind`: the connection is `none` or `static`;
  /// - 409 `no_oauth_client`: an `oauth_client` connection with no client yet:
  ///   `PUT …/oauth-client` first;
  /// - 409 `no_registration_endpoint`: `oauth_dcr`, and the authorization
  ///   server offers no dynamic registration: switch to `oauth_client`;
  /// - 409 `resource_mismatch`: the protected-resource document names another
  ///   `resource` (in `oauth.resource_mismatch`); accept it with
  ///   `accept_resource`, or fix the URL. An `accept_resource` that is not
  ///   the one found now is this answer too, with the new value;
  /// - 409 `issuer_changed`: an `oauth_client` whose pinned issuer differs
  ///   from what discovery finds now: `PUT …/oauth-client` again;
  /// - 400 `invalid`: an `accept_resource` where no protected-resource
  ///   document names a resource to accept;
  /// - 502 `resource_foreign`: the protected-resource document names a
  ///   `resource` on another origin, or one that is not `https`; it cannot be
  ///   accepted;
  /// - 429 `too_many_flows`: 16 Connects are in flight;
  /// - 502 `discovery_failed`: no protected-resource or authorization-server
  ///   document with both endpoints, or authorization-server metadata whose
  ///   `issuer` is not the identifier it was fetched for (the message names
  ///   only origins);
  /// - 502 `insecure_metadata`: a metadata document, an endpoint or the
  ///   consent URL is not `https` (loopback `http` excepted);
  /// - 502 `pkce_unsupported`: the server does not advertise `S256`;
  /// - 502 `registration_refused`: the vendor refused registration; `message`
  ///   holds its RFC 7591 `error` and `error_description`, control and bidi
  ///   characters stripped, cut to 300 characters, after "The vendor said: ",
  ///   to be rendered as text;
  /// - 502 `egress_refused`: an address the egress policy refuses (a
  ///   non-public one: mark the connection internal network, if it is);
  /// - 502 `upstream_unreachable`: a timeout or a transport failure.
  ///
  /// Each failure after the connection was found is also kept in
  /// `oauth_error`.
  #[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
  #[serde(deny_unknown_fields)]
  pub struct McpAuthorizeRequest {
      /// The mismatching `resource` the operator accepts, exactly as
      /// `oauth.resource_mismatch` showed it (gateway spec §4.1, G-4).
      #[serde(default, skip_serializing_if = "Option::is_none")]
      #[ts(type = "string | undefined", optional)]
      pub accept_resource: Option<String>,
  }

  /// The answer to `POST /api/mcp/connections/{id}/authorize`.
  ///
  /// The callback, `GET /api/mcp/oauth/callback`, is the vendor's redirect
  /// target, outside the operator's routes (the flow cookie and `state`
  /// authenticate it): a static page, `<body data-outcome="connected|failed"
  /// data-result="<code>" data-connection="<id or empty>">`, whose script
  /// posts `{type: "done", connection_id, outcome, result}` on
  /// `BroadcastChannel("hennery-mcp-oauth")` and closes the window on
  /// `connected`. Its results: 200 `connected`; 400 `flow_unknown`,
  /// `flow_mismatch`, `session_ended`, `issuer_mismatch`, `consent_denied`,
  /// `connection_changed`; 502 `exchange_failed`, `upstream_unreachable`,
  /// `egress_refused`; 500 `internal`. The broadcast is a hint: refetch the
  /// item.
  #[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema, TS)]
  pub struct McpAuthorizeResponse {
      /// `https`, at the vendor (loopback `http` excepted): navigate the
      /// popup to it, and show it as a link if the popup was blocked.
      pub consent_url: String,
      /// RFC 3339: when the flow expires (15 minutes).
      pub expires_at: String,
  }
  ```

In `crates/hennery-proto/src/rest.rs`, replace:

  ```rust
  /// which, or a hat that is not the owner's); 400 `unsupported_cred_kind`
  /// (an OAuth kind, until plan 8f); 409 `slug_taken` (another of the owner's
  /// connections has the slug); 409 `too_many_connections` (at most 256 per
  /// owner).
  ```

with:

  ```rust
  /// which, or a hat that is not the owner's); 409 `slug_taken` (another of
  /// the owner's connections has the slug); 409 `too_many_connections` (at
  /// most 256 per owner).
  ```

In `crates/hennery-proto/src/rest.rs`, replace:

  ```rust
      /// `none` or `static` until plan 8f.
  ```

with:

  ```rust
      /// Any kind; an OAuth one is connected with `…/authorize` afterwards.
  ```

In `crates/hennery-proto/src/rest.rs`, replace:

  ```rust
  /// another kind deletes the stored credential and starts the status over
  /// at `not_connected`, in the same change. The slug and the hat cannot
  /// change: naming them is an unknown field.
  ///
  /// Its own codes, beyond every route's (see `McpConnectionItem`): 403
  /// `step_up_required`; 404 `not_found`; 400 `invalid` (`message` says
  /// which field); 400 `unsupported_cred_kind`. A refused change changes
  /// nothing.
  ```

with:

  ```rust
  /// another kind deletes the stored credential and the OAuth client and
  /// starts the status over at `not_connected`, in the same change: the
  /// client has to be entered again and Connect run again. Any change of the
  /// URL, a path's too, clears `oauth.resource_mismatch` and
  /// `oauth.accepted_resource`; a change of the URL, the kind or the
  /// internal marking drops the connection's OAuth flows in flight. The slug
  /// and the hat cannot change: naming them is an unknown field.
  ///
  /// Its own codes, beyond every route's (see `McpConnectionItem`): 403
  /// `step_up_required`; 404 `not_found`; 400 `invalid` (`message` says
  /// which field). A refused change changes nothing.
  ```

- [ ] **Step 4: Run the checks**

   Regenerate the wire files, then run the five checks:

   ```sh
   nix develop -c cargo run -p hennery-proto --bin gen
   ```

   ```sh
   nix develop -c cargo fmt --all --check
   nix develop -c cargo clippy --workspace --all-targets --locked -- -D warnings
   nix develop -c cargo clippy -p hennery --locked -- -D warnings
   nix develop -c cargo test --workspace --locked
   nix develop -c cargo run -p hennery-proto --bin gen --locked -- --check
   ```

   Phase B targeted tests: exit 0, 9 passed. See Execution status for the final full gate and task-specific supplementary checks.

- [ ] **Step 5: Commit**

   ```sh
   git add -A && git -c commit.gpgsign=false commit -m "feat(proto): the OAuth wire types: connection state, the pre-registered client, authorize, probe now"
   ```

### Task 3: Storage: the OAuth tables, the sealed grant and client secrets, status changes

**Files:** Create `crates/hennery-gateway/tests/oauth_store.rs`, `tests/support/oauth.rs` (the fake authorization server and MCP upstream); modify the gateway's `Cargo.toml` (`base64`, `sha2`), `src/schema.rs`, `model.rs`, `crypto.rs`, `key.rs`, `store.rs`, `scope.rs`, `api.rs` (the OAuth kinds refused until Task 6), `proxy.rs` (the status writes' new signatures), `tests/store.rs`, `tests/tokens.rs`, `tests/support/mod.rs`; `crates/hennery-testkit/tests/owner_filter.rs`.

- [ ] **Step 1: Write the failing tests**

The test step includes the gateway base64 dependency and its Cargo.lock delta; SHA-256 is already present from 8e.

In `Cargo.lock`, replace:

  ```
   "axum",
   "chacha20poly1305",
  ```

with:

  ```
   "axum",
   "base64 0.22.1",
   "chacha20poly1305",
  ```

In `crates/hennery-gateway/Cargo.toml`, replace:

  ```toml
  axum.workspace = true
  chacha20poly1305.workspace = true
  ```

with:

  ```toml
  axum.workspace = true
  # OAuth (plan 8f): PKCE's base64url and a client's Basic credentials.
  base64.workspace = true
  chacha20poly1305.workspace = true
  ```

In `crates/hennery-gateway/Cargo.toml`, replace:

  ```toml
  serde_json.workspace = true
  sha2.workspace = true
  ```

with:

  ```toml
  serde_json.workspace = true
  # Session identifiers and OAuth PKCE use SHA-256.
  sha2.workspace = true
  ```

Create `crates/hennery-gateway/tests/oauth_store.rs`:

  ```rust
  //! The store's OAuth half (gateway spec §2, §6; plan 8a's hand-offs to
  //! 8f): grants and client secrets sealed each under a field of its own, a
  //! stored secret counting as ciphertext, the start's key check opening each
  //! kind with its field, a hat purge taking the OAuth clients, and a list
  //! that reads no ciphertext.

  mod support;

  use hennery_gateway::crypto::{self, CLIENT_SECRET, OAUTH_TOKENS, PENDING_CLIENT_SECRET, STATIC_TOKEN};
  use hennery_gateway::key::MasterKey;
  use hennery_gateway::model::{CredKind, NewConnection};
  use hennery_gateway::store::{ClientChange, SecretInput};
  use hennery_kernel::secret::unix_now;
  use support::World;
  use support::oauth::{Config, FakeAs, seed_grant};
  use zeroize::Zeroizing;

  fn oauth(w: &World, slug: &str, kind: CredKind) -> String {
      w.connection_with(NewConnection {
          slug: slug.into(),
          label: slug.into(),
          url: "https://mcp.vendor.example/mcp".into(),
          hat_id: w.hat(),
          cred_kind: kind,
          static_header: None,
          static_prefix: None,
          tool_allowlist: None,
          internal_network: false,
      })
  }

  fn blob(w: &World, sql: &str, id: &str) -> (u32, Vec<u8>) {
      w.raw().query_row(sql, [id], |r| Ok((r.get(0)?, r.get(1)?))).unwrap()
  }

  /// Gateway spec §6 (plan 8a's O1): a grant is sealed as
  /// `gw_credentials.oauth_tokens`, a client secret as
  /// `gw_oauth_clients.client_secret`, a pending one as its own field; none
  /// opens as another.
  #[tokio::test]
  async fn each_secret_is_sealed_under_its_own_field() {
      let w = World::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = w.connection("linear", &fake.mcp_url(), CredKind::OauthClient);
      let set = |client: &str, secret: &str| {
          w.store
              .set_oauth_client(
                  &id,
                  client,
                  SecretInput::Set(Zeroizing::new(secret.into())),
                  &w.key,
                  unix_now(),
              )
              .unwrap()
      };
      assert!(matches!(set("pre-1", "first-secret"), ClientChange::Done(_)));
      let (access, refresh) = fake.issue();
      seed_grant(&w, &id, &fake, &access, Some(&refresh), None);
      // A grant is live: the next client waits as pending.
      assert!(matches!(set("pre-2", "second-secret"), ClientChange::Done(_)));
      let (version, grant) = blob(
          &w,
          "SELECT key_version, ciphertext FROM gw_credentials WHERE connection_id = ?1",
          &id,
      );
      assert!(crypto::open(&w.key, &id, OAUTH_TOKENS, version, &grant).is_ok());
      assert!(crypto::open(&w.key, &id, STATIC_TOKEN, version, &grant).is_err());
      let (version, pending) = blob(
          &w,
          "SELECT key_version, pending_secret_ciphertext FROM gw_oauth_clients WHERE connection_id = ?1",
          &id,
      );
      assert_eq!(
          &*crypto::open(&w.key, &id, PENDING_CLIENT_SECRET, version, &pending).unwrap(),
          b"second-secret"
      );
      assert!(crypto::open(&w.key, &id, CLIENT_SECRET, version, &pending).is_err());
      // A static token's field does not open a grant either way round.
      let fixed = w.connection("fixed", &fake.mcp_url(), CredKind::Static);
      w.set_token(&fixed, "tok");
      let (version, token) = blob(
          &w,
          "SELECT key_version, ciphertext FROM gw_credentials WHERE connection_id = ?1",
          &fixed,
      );
      assert!(crypto::open(&w.key, &fixed, OAUTH_TOKENS, version, &token).is_err());
  }

  /// Plan 8a's O4: a stored client secret is ciphertext, so a missing key is
  /// an error then, never a new key.
  #[test]
  fn a_client_secret_counts_as_ciphertext() {
      let w = World::new();
      let id = oauth(&w, "linear", CredKind::OauthClient);
      assert!(!w.store.has_ciphertext().unwrap());
      w.store
          .set_oauth_client(&id, "pre-1", SecretInput::Clear, &w.key, unix_now())
          .unwrap();
      assert!(!w.store.has_ciphertext().unwrap(), "a public client holds no secret");
      w.store
          .set_oauth_client(
              &id,
              "pre-1",
              SecretInput::Set(Zeroizing::new("s".into())),
              &w.key,
              unix_now(),
          )
          .unwrap();
      assert!(w.store.has_ciphertext().unwrap());
  }

  /// Plan 8a's O2: the start's key check opens an OAuth grant with its own
  /// field, and a client secret, and refuses another key for either.
  #[tokio::test]
  async fn the_key_check_opens_each_kind_with_its_field() {
      let w = World::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = w.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let (access, refresh) = fake.issue();
      seed_grant(&w, &id, &fake, &access, Some(&refresh), None);
      w.store.check_key(&w.key).unwrap();
      assert!(w.store.check_key(&MasterKey::from_bytes([1; 32])).is_err());
      let w = World::new();
      let id = oauth(&w, "secret-only", CredKind::OauthClient);
      w.store
          .set_oauth_client(
              &id,
              "pre-1",
              SecretInput::Set(Zeroizing::new("s".into())),
              &w.key,
              unix_now(),
          )
          .unwrap();
      w.store.check_key(&w.key).unwrap();
      let err = w.store.check_key(&MasterKey::from_bytes([1; 32])).unwrap_err();
      assert!(
          format!("{err:#}").contains("gw_oauth_clients"),
          "the way out names the table: {err:#}"
      );
  }

  /// Plan 8a's O18: a hat purge takes its connections' OAuth clients; the
  /// other hat's stay.
  #[test]
  fn a_hat_purge_takes_its_oauth_clients() {
      let w = World::new();
      let work = w.other_hat();
      let mut gone = NewConnection {
          slug: "gone".into(),
          label: "gone".into(),
          url: "https://mcp.vendor.example/mcp".into(),
          hat_id: work.clone(),
          cred_kind: CredKind::OauthClient,
          static_header: None,
          static_prefix: None,
          tool_allowlist: None,
          internal_network: false,
      };
      let gone_id = w.connection_with(gone.clone());
      gone.slug = "kept".into();
      gone.hat_id = w.hat();
      let kept = w.connection_with(gone);
      for id in [&gone_id, &kept] {
          w.store
              .set_oauth_client(id, "pre-1", SecretInput::Clear, &w.key, unix_now())
              .unwrap();
      }
      w.store.purge_hat(&work).unwrap();
      let count: i64 = w
          .raw()
          .query_row("SELECT count(*) FROM gw_oauth_clients", [], |r| r.get(0))
          .unwrap();
      assert_eq!(count, 1);
      assert!(
          w.store
              .connection(&kept)
              .unwrap()
              .unwrap()
              .oauth_client
              .unwrap()
              .client_id
              .is_some()
      );
      w.store.purge_hat(&work).unwrap();
  }

  /// The review's R1: a grant is stored only for the connection as its flow
  /// found it: the same URL, kind and internal marking, and for a
  /// pre-registered client the same client in the same place.
  #[test]
  fn a_grant_is_stored_only_for_the_connection_as_it_was() {
      use hennery_gateway::model::{AuthMethod, GrantTokens, TokenClient};
      use hennery_gateway::store::{ClientSource, GrantStored, GrantToStore};
      let w = World::new();
      let id = oauth(&w, "linear", CredKind::OauthClient);
      let url = "https://mcp.vendor.example/mcp";
      w.store
          .set_oauth_client(&id, "pre-1", SecretInput::Clear, &w.key, unix_now())
          .unwrap();
      let client = |id: &str| TokenClient {
          client_id: id.into(),
          secret: None,
          auth_method: AuthMethod::None,
          token_endpoint: "https://as.example/token".into(),
      };
      let tokens = GrantTokens::from_opened(br#"{"access_token":"a"}"#).unwrap();
      let store = |url: &str, kind: CredKind, internal: bool, source: ClientSource, client: &TokenClient| {
          w.store
              .store_grant(
                  &GrantToStore {
                      connection_id: &id,
                      url,
                      cred_kind: kind,
                      internal_network: internal,
                      source,
                      client,
                      issuer: "https://as.example",
                      authorization_endpoint: "https://as.example/authorize",
                      redirect_uri: "https://hennery.example/api/mcp/oauth/callback",
                      scopes: &[],
                      resource: url,
                      resource_param_accepted: true,
                      registered_at: 1,
                      tokens: &tokens,
                      expires_at: None,
                  },
                  &w.key,
                  unix_now(),
              )
              .unwrap()
      };
      let active = ClientSource::Active;
      for (what, stored) in [
          (
              "another url",
              store(
                  "https://mcp.vendor.example/other",
                  CredKind::OauthClient,
                  false,
                  active,
                  &client("pre-1"),
              ),
          ),
          (
              "another kind",
              store(url, CredKind::OauthDcr, false, active, &client("pre-1")),
          ),
          (
              "another marking",
              store(url, CredKind::OauthClient, true, active, &client("pre-1")),
          ),
          (
              "another client",
              store(url, CredKind::OauthClient, false, active, &client("pre-2")),
          ),
          (
              "a pending one that is not",
              store(
                  url,
                  CredKind::OauthClient,
                  false,
                  ClientSource::Pending,
                  &client("pre-1"),
              ),
          ),
      ] {
          assert_eq!(stored, GrantStored::ConnectionChanged, "{what}");
      }
      assert!(!w.store.connection(&id).unwrap().unwrap().has_credential);
      assert!(matches!(
          store(url, CredKind::OauthClient, false, active, &client("pre-1")),
          GrantStored::Stored(_)
      ));
      // With a grant, a new client is pending; a flow of the old active one
      // no longer matches, the pending one's does.
      w.store
          .set_oauth_client(&id, "pre-2", SecretInput::Clear, &w.key, unix_now())
          .unwrap();
      assert_eq!(
          store(url, CredKind::OauthClient, false, active, &client("pre-1")),
          GrantStored::ConnectionChanged
      );
      assert!(matches!(
          store(
              url,
              CredKind::OauthClient,
              false,
              ClientSource::Pending,
              &client("pre-2")
          ),
          GrantStored::Stored(_)
      ));
      assert_eq!(
          w.store
              .connection(&id)
              .unwrap()
              .unwrap()
              .oauth_client
              .unwrap()
              .client_id
              .as_deref(),
          Some("pre-2")
      );
  }

  /// Gateway spec §7: `status_at` is when the status last changed; a write
  /// of the same status moves only `checked_at`.
  #[test]
  fn the_same_status_again_keeps_status_at() {
      use hennery_gateway::model::Status;
      let w = World::new();
      let url = "https://mcp.vendor.example/mcp";
      let id = oauth(&w, "linear", CredKind::OauthDcr);
      w.proxy_store
          .record_status(&id, url, Status::Error, Some("down"), 100)
          .unwrap();
      let change = w
          .proxy_store
          .record_status(&id, url, Status::Error, Some("down"), 200)
          .unwrap();
      assert!(change.is_none());
      let record = w.store.connection(&id).unwrap().unwrap();
      assert_eq!((record.status_at, record.checked_at), (100, Some(200)));
  }

  /// The review's R2: a pin is set once, for the client it was found for.
  #[test]
  fn a_client_is_pinned_once() {
      use hennery_gateway::store::Slot;
      let w = World::new();
      let id = oauth(&w, "linear", CredKind::OauthClient);
      w.store
          .set_oauth_client(&id, "pre-1", SecretInput::Clear, &w.key, unix_now())
          .unwrap();
      assert!(
          !w.store
              .pin_client(&id, Slot::Active, "other", "https://as.example", "https://as.example/t")
              .unwrap()
      );
      assert!(
          w.store
              .pin_client(&id, Slot::Active, "pre-1", "https://as.example", "https://as.example/t")
              .unwrap()
      );
      assert!(
          !w.store
              .pin_client(
                  &id,
                  Slot::Active,
                  "pre-1",
                  "https://evil.example",
                  "https://evil.example/t"
              )
              .unwrap()
      );
      let slots = w.store.oauth_clients(&id, &w.key).unwrap().unwrap();
      assert_eq!(slots.active.unwrap().issuer.as_deref(), Some("https://as.example"));
  }

  /// A pre-registered client with a live grant: `pending`, its secret opened
  /// for the next authorize, and pinned once, for that client only (G-7, the
  /// review's R2).
  #[tokio::test]
  async fn a_pending_client_opens_its_secret_and_is_pinned_once() {
      use hennery_gateway::store::Slot;
      let w = World::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = w.connection("linear", &fake.mcp_url(), CredKind::OauthClient);
      w.store
          .set_oauth_client(&id, "pre-1", SecretInput::Clear, &w.key, unix_now())
          .unwrap();
      let (access, refresh) = fake.issue();
      seed_grant(&w, &id, &fake, &access, Some(&refresh), None);
      w.store
          .set_oauth_client(
              &id,
              "pre-2",
              SecretInput::Set(Zeroizing::new("pending-secret".into())),
              &w.key,
              unix_now(),
          )
          .unwrap();
      let slots = w.store.oauth_clients(&id, &w.key).unwrap().unwrap();
      let pending = slots.pending.unwrap();
      assert_eq!(pending.client_id, "pre-2");
      assert_eq!(pending.secret.as_deref().map(String::as_str), Some("pending-secret"));
      let pin = |client: &str, issuer: &str| {
          w.store
              .pin_client(&id, Slot::Pending, client, issuer, &format!("{issuer}/t"))
              .unwrap()
      };
      assert!(!pin("other", "https://as.example"));
      assert!(pin("pre-2", "https://as.example"));
      assert!(!pin("pre-2", "https://evil.example"));
      let slots = w.store.oauth_clients(&id, &w.key).unwrap().unwrap();
      assert_eq!(slots.pending.unwrap().issuer.as_deref(), Some("https://as.example"));
  }

  /// The review's R1: a flow of a pending client stores its grant only while
  /// that client is still the pending one.
  #[test]
  fn a_grant_for_a_pending_client_needs_that_very_client() {
      use hennery_gateway::model::{AuthMethod, GrantTokens, TokenClient};
      use hennery_gateway::store::{ClientSource, GrantStored, GrantToStore};
      let w = World::new();
      let id = oauth(&w, "linear", CredKind::OauthClient);
      let url = "https://mcp.vendor.example/mcp";
      let tokens = GrantTokens::from_opened(br#"{"access_token":"a"}"#).unwrap();
      let store = |source: ClientSource, client_id: &str| {
          let client = TokenClient {
              client_id: client_id.into(),
              secret: None,
              auth_method: AuthMethod::None,
              token_endpoint: "https://as.example/token".into(),
          };
          w.store
              .store_grant(
                  &GrantToStore {
                      connection_id: &id,
                      url,
                      cred_kind: CredKind::OauthClient,
                      internal_network: false,
                      source,
                      client: &client,
                      issuer: "https://as.example",
                      authorization_endpoint: "https://as.example/authorize",
                      redirect_uri: "https://hennery.example/api/mcp/oauth/callback",
                      scopes: &[],
                      resource: url,
                      resource_param_accepted: true,
                      registered_at: 1,
                      tokens: &tokens,
                      expires_at: None,
                  },
                  &w.key,
                  unix_now(),
              )
              .unwrap()
      };
      w.store
          .set_oauth_client(&id, "pre-1", SecretInput::Clear, &w.key, unix_now())
          .unwrap();
      assert!(matches!(store(ClientSource::Active, "pre-1"), GrantStored::Stored(_)));
      w.store
          .set_oauth_client(&id, "pre-2", SecretInput::Clear, &w.key, unix_now())
          .unwrap();
      assert_eq!(store(ClientSource::Pending, "pre-3"), GrantStored::ConnectionChanged);
  }

  /// What a completed Connect leaves in the row, beyond what the API shows:
  /// no time of a failure that is gone, no pins of a pending client that is
  /// gone; clearing a failure clears its time.
  #[tokio::test]
  async fn a_completed_connect_leaves_no_stale_columns() {
      let w = World::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = w.connection("linear", &fake.mcp_url(), CredKind::OauthClient);
      w.store
          .set_oauth_client(&id, "pre-1", SecretInput::Clear, &w.key, unix_now())
          .unwrap();
      let (access, refresh) = fake.issue();
      seed_grant(&w, &id, &fake, &access, Some(&refresh), None);
      w.store
          .set_oauth_client(&id, "pre-2", SecretInput::Clear, &w.key, unix_now())
          .unwrap();
      w.store
          .pin_client(
              &id,
              hennery_gateway::store::Slot::Pending,
              "pre-2",
              "https://as.example",
              "https://as.example/t",
          )
          .unwrap();
      w.store
          .set_oauth_error(&id, Some(("consent_denied", "x")), unix_now())
          .unwrap();
      let columns = || -> (Option<i64>, Option<String>, Option<String>) {
          w.raw()
              .query_row(
                  "SELECT c.oauth_error_at, o.pending_issuer, o.pending_token_endpoint
                   FROM gw_connections c JOIN gw_oauth_clients o ON o.connection_id = c.id WHERE c.id = ?1",
                  [&id],
                  |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
              )
              .unwrap()
      };
      assert!(columns().0.is_some());
      // The pending client's Connect completes.
      let (access, refresh) = fake.issue();
      let tokens = hennery_gateway::model::GrantTokens {
          access_token: Zeroizing::new(access),
          refresh_token: Some(Zeroizing::new(refresh)),
      };
      let client = hennery_gateway::model::TokenClient {
          client_id: "pre-2".into(),
          secret: None,
          auth_method: hennery_gateway::model::AuthMethod::None,
          token_endpoint: format!("{}/token", fake.origin()),
      };
      let record = w.store.connection(&id).unwrap().unwrap();
      let stored = w
          .store
          .store_grant(
              &hennery_gateway::store::GrantToStore {
                  connection_id: &id,
                  url: &record.url,
                  cred_kind: CredKind::OauthClient,
                  internal_network: record.internal_network,
                  source: hennery_gateway::store::ClientSource::Pending,
                  client: &client,
                  issuer: &fake.issuer(),
                  authorization_endpoint: &format!("{}/authorize", fake.origin()),
                  redirect_uri: "https://hennery.example/api/mcp/oauth/callback",
                  scopes: &[],
                  resource: &record.url,
                  resource_param_accepted: true,
                  registered_at: 1,
                  tokens: &tokens,
                  expires_at: None,
              },
              &w.key,
              unix_now(),
          )
          .unwrap();
      assert!(matches!(stored, hennery_gateway::store::GrantStored::Stored(_)));
      assert_eq!(columns(), (None, None, None));
      // Clearing a failure clears its time.
      w.store
          .set_oauth_error(&id, Some(("consent_denied", "x")), unix_now())
          .unwrap();
      w.store.set_oauth_error(&id, None, unix_now()).unwrap();
      assert_eq!(columns().0, None);
  }

  /// Gateway spec §4.1 (G-4): a `resource` found or accepted for a URL is
  /// recorded only while the connection still has that URL.
  #[test]
  fn a_resource_is_recorded_only_for_the_url_it_was_found_for() {
      let w = World::new();
      let id = oauth(&w, "linear", CredKind::OauthDcr);
      let stale = "https://mcp.vendor.example/old";
      w.store
          .set_resource_mismatch(&id, stale, Some("https://mcp.vendor.example/v2"))
          .unwrap();
      assert!(
          !w.store
              .accept_resource(&id, stale, "https://mcp.vendor.example/v2")
              .unwrap()
      );
      let record = w.store.connection(&id).unwrap().unwrap();
      assert_eq!((record.resource_mismatch, record.accepted_resource), (None, None));
  }

  /// Plan 8a's O4, for the key's sake: a pending client's secret alone (an
  /// operator who ran only half of `GIVE_UP`'s statement) is still
  /// ciphertext.
  #[test]
  fn a_pending_secret_alone_counts_as_ciphertext() {
      let w = World::new();
      let id = oauth(&w, "linear", CredKind::OauthClient);
      w.store
          .set_oauth_client(&id, "pre-1", SecretInput::Clear, &w.key, unix_now())
          .unwrap();
      w.raw()
          .execute(
              "UPDATE gw_oauth_clients SET pending_client_id = 'pre-2', pending_has_secret = 1,
                   pending_secret_ciphertext = x'0102', key_version = 1 WHERE connection_id = ?1",
              [&id],
          )
          .unwrap();
      assert!(w.store.has_ciphertext().unwrap());
  }

  /// An OAuth grant is read only for an OAuth kind: a static connection's
  /// token is never opened as a grant.
  #[test]
  fn a_static_token_is_no_grant() {
      let w = World::new();
      let id = w.connection("fixed", "https://mcp.vendor.example/mcp", CredKind::Static);
      w.set_token(&id, "tok");
      w.store
          .set_oauth_client(&id, "pre-1", SecretInput::Clear, &w.key, unix_now())
          .unwrap();
      w.raw()
          .execute(
              "INSERT INTO gw_oauth_clients(connection_id, owner_id, client_id, has_client_secret, registered_at,
                                            token_endpoint_auth_method, token_endpoint)
               SELECT id, owner_id, 'pre-1', 0, 1, 'none', 'https://as.example/token' FROM gw_connections WHERE id = ?1",
              [&id],
          )
          .unwrap();
      assert!(w.store.oauth_credential(&id, &w.key).unwrap().is_none());
  }

  /// Gateway spec §7 and the 8d hand-off: what live traffic and the probe
  /// record is about the URL they reached, and only with a credential;
  /// `checked_at` moves at most every 60 seconds on traffic to an `ok`
  /// connection.
  #[test]
  fn traffic_and_checks_record_only_for_the_url_reached() {
      use hennery_gateway::model::Status;
      let w = World::new();
      let url = "https://mcp.vendor.example/mcp";
      let stale = "https://mcp.vendor.example/old";
      let id = oauth(&w, "linear", CredKind::OauthDcr);
      let checked = || w.store.connection(&id).unwrap().unwrap().checked_at;
      // No credential: traffic's 2xx says nothing.
      w.proxy_store
          .record_status(&id, url, Status::Error, Some("down"), 100)
          .unwrap();
      assert!(w.proxy_store.record_traffic_ok(&id, url, 200).unwrap().is_none());
      assert_eq!(w.status(&id), "error");
      w.raw()
          .execute(
              "INSERT INTO gw_credentials(connection_id, owner_id, key_version, ciphertext, updated_at)
               SELECT id, owner_id, 1, x'00', 1 FROM gw_connections WHERE id = ?1",
              [&id],
          )
          .unwrap();
      // Another URL: nothing.
      assert!(w.proxy_store.record_traffic_ok(&id, stale, 200).unwrap().is_none());
      w.proxy_store.record_checked(&id, stale, 300).unwrap();
      assert_eq!((w.status(&id), checked()), ("error".to_string(), Some(100)));
      // This URL: ok, then `checked_at` throttled.
      assert!(w.proxy_store.record_traffic_ok(&id, url, 400).unwrap().is_some());
      assert_eq!(checked(), Some(400));
      w.proxy_store.record_traffic_ok(&id, url, 459).unwrap();
      assert_eq!(checked(), Some(400));
      w.proxy_store.record_traffic_ok(&id, url, 460).unwrap();
      assert_eq!(checked(), Some(460));
  }
  ```

In `crates/hennery-gateway/tests/store.rs`, replace:

  ```rust
  #[test]
  fn oauth_kinds_wait_for_plan_8f() {
      let w = World::new();
      for kind in [CredKind::OauthDcr, CredKind::OauthClient] {
          let mut oauth = w.new_connection("oauth");
          oauth.cred_kind = kind;
          assert!(matches!(w.store.create(&oauth, NOW).unwrap(), Change::Unsupported(k) if k == kind));
          let id = w.create(&format!("s-{}", kind.as_str().replace('_', "-")));
  ```

with:

  ```rust
  /// Plan 8f: the OAuth kinds are taken, on create and by a change, and an
  /// OAuth connection shows its (empty) client in the list.
  #[test]
  fn oauth_kinds_are_taken() {
      let w = World::new();
      for kind in [CredKind::OauthDcr, CredKind::OauthClient] {
          let slug = format!("o-{}", kind.as_str().replace('_', "-"));
          let mut oauth = w.new_connection(&slug);
          oauth.cred_kind = kind;
          let created = done(w.store.create(&oauth, NOW).unwrap());
          assert_eq!(created.cred_kind, kind);
          assert_eq!(created.oauth_client, Some(Default::default()));
          let id = w.create(&format!("s-{}", kind.as_str().replace('_', "-")));
          assert_eq!(w.store.connection(&id).unwrap().unwrap().oauth_client, None);
  ```

In `crates/hennery-gateway/tests/store.rs`, replace:

  ```rust
          assert!(matches!(w.store.update(&id, &patch, NOW).unwrap(), Change::Unsupported(k) if k == kind));
      }
      assert_eq!(w.count("gw_connections"), 2);
  ```

with:

  ```rust
          assert_eq!(done(w.store.update(&id, &patch, NOW).unwrap()).cred_kind, kind);
      }
      assert_eq!(w.count("gw_connections"), 4);
  ```

In `crates/hennery-gateway/tests/store.rs`, replace:

  ```rust
      // Plan 8a's tables, then plan 8d's session tokens, then plan 8e's
      // stdio servers.
      assert_eq!(version, 3);
  ```

with:

  ```rust
      // Connections, session tokens, stdio servers, then OAuth clients.
      assert_eq!(version, 4);
  ```

In `crates/hennery-gateway/tests/support/mod.rs`, replace:

  ```rust
  pub mod differential;
  pub mod upstream;
  ```

with:

  ```rust
  pub mod differential;
  pub mod oauth;
  pub mod upstream;
  ```

Create `crates/hennery-gateway/tests/support/oauth.rs`:

  ```rust
  //! A fake OAuth authorization server with an MCP endpoint behind it (gateway
  //! spec §11, plan 8f), on loopback: the protected-resource document where a
  //! test puts it, the authorization server's metadata in one of its forms,
  //! dynamic registration, consent, and a token endpoint that checks PKCE,
  //! `resource`, the client and rotating refresh tokens with reuse detection.
  //! Connections reach it under `internal_network`, as every test connection
  //! must (lane L7).

  use axum::Router;
  use axum::body::Body;
  use axum::extract::{Request, State};
  use axum::http::{HeaderMap, StatusCode, header};
  use axum::response::{IntoResponse, Response};
  use base64::Engine;
  use serde_json::{Value, json};
  use sha2::{Digest, Sha256};
  use std::collections::HashMap;
  use std::net::SocketAddr;
  use std::sync::{Arc, Mutex};
  use tokio::sync::watch;

  /// Where the protected-resource document is served.
  #[derive(Debug, Clone, Copy, PartialEq, Eq)]
  pub enum PrAt {
      /// Only at the URL a 401's `WWW-Authenticate` names.
      Challenge,
      /// Only at `/.well-known/oauth-protected-resource/mcp`.
      PathInserted,
      /// Only at `/.well-known/oauth-protected-resource`.
      Origin,
      /// Nowhere: the resource's origin is the authorization server.
      Nowhere,
  }

  /// Where the authorization server's metadata is served.
  #[derive(Debug, Clone, Copy, PartialEq, Eq)]
  pub enum MetaAt {
      /// `/.well-known/oauth-authorization-server<path>` (RFC 8414).
      Inserted,
      /// `<path>/.well-known/oauth-authorization-server`.
      Appended,
      /// `<path>/.well-known/openid-configuration`.
      Openid,
  }

  /// What the fake does; a test changes it before and between requests.
  #[derive(Debug, Clone)]
  pub struct Config {
      pub pr_at: PrAt,
      /// The PR document's `resource`; `None`: the MCP URL.
      pub resource: Option<String>,
      /// The PR document as raw text, replacing the built one.
      pub raw_pr: Option<String>,
      /// The authorization server's path: `""` or `/tenant`.
      pub as_path: String,
      pub meta_at: MetaAt,
      /// The metadata as raw text, replacing the built one.
      pub raw_meta: Option<String>,
      /// An `issuer` other than the one the metadata is fetched for.
      pub issuer: Option<String>,
      /// Replaces the advertised endpoints.
      pub token_endpoint: Option<String>,
      pub authorization_endpoint: Option<String>,
      pub s256: bool,
      pub registration: bool,
      /// A registration refusal: its status and body.
      pub dcr_refusal: Option<(u16, Value)>,
      pub iss_parameter: bool,
      /// What `iss` the consent's redirect carries: `None` the issuer.
      pub iss_sent: Option<Option<String>>,
      /// A confidential client the token endpoint takes by Basic auth.
      pub confidential: Option<(String, String)>,
      pub auth_methods: Vec<String>,
      /// The token endpoint refuses `resource` (`invalid_target`).
      pub refuse_resource_at_token: bool,
      /// Consent refuses `resource` (`error=invalid_target`).
      pub refuse_resource_at_consent: bool,
      /// Consent is refused (`error=access_denied`) with this description.
      pub deny: Option<String>,
      /// A refresh issues no new refresh token.
      pub refresh_keeps_token: bool,
      pub expires_in: Option<i64>,
      /// Token responses wait until the gate opens.
      pub gate_token: bool,
      /// The token endpoint's refusal body (a canary for logs).
      pub refusal_body: Option<Value>,
      /// The scopes the PR document lists.
      pub scopes: Vec<String>,
      /// The MCP endpoint answers every authenticated request with this
      /// status instead.
      pub mcp_status: Option<u16>,
      /// The MCP endpoint never answers an authenticated request.
      pub mcp_hang: bool,
      /// Whether any authorization-server metadata is served.
      pub serve_metadata: bool,
      /// The path-inserted PR URL answers a redirect to `/elsewhere`, which
      /// serves a hostile document (never to be followed).
      pub pr_redirect: bool,
      /// The path-inserted PR URL answers this status.
      pub pr_status: Option<u16>,
      /// The token endpoint's success body as raw text.
      pub raw_token: Option<String>,
      /// What every code and token starts with (a canary for logs).
      pub prefix: String,
      /// Every metadata URL answers this status.
      pub meta_status: Option<u16>,
      /// The token endpoint answers this status, empty.
      pub token_status: Option<u16>,
      /// A registration issues a client secret too (Basic at the token
      /// endpoint).
      pub dcr_secret: bool,
      /// A registration answers 201 without a `client_id`.
      pub dcr_without_client_id: bool,
      /// The `resource_metadata` a 401's challenge names, instead of the
      /// fake's own.
      pub challenge_url: Option<String>,
      /// The MCP endpoint is stateful: a request other than `initialize`
      /// without the session's `Mcp-Session-Id`, or without the protocol
      /// version `initialize` answered, is 400 (G-21).
      pub stateful: bool,
  }

  impl Default for Config {
      fn default() -> Self {
          Self {
              pr_at: PrAt::PathInserted,
              resource: None,
              raw_pr: None,
              as_path: String::new(),
              meta_at: MetaAt::Inserted,
              raw_meta: None,
              issuer: None,
              token_endpoint: None,
              authorization_endpoint: None,
              s256: true,
              registration: true,
              dcr_refusal: None,
              iss_parameter: false,
              iss_sent: None,
              confidential: None,
              auth_methods: Vec::new(),
              refuse_resource_at_token: false,
              refuse_resource_at_consent: false,
              deny: None,
              refresh_keeps_token: false,
              expires_in: Some(3600),
              gate_token: false,
              refusal_body: None,
              scopes: vec!["read".into(), "write".into()],
              mcp_status: None,
              mcp_hang: false,
              serve_metadata: true,
              pr_redirect: false,
              pr_status: None,
              raw_token: None,
              prefix: String::new(),
              meta_status: None,
              token_status: None,
              dcr_secret: false,
              dcr_without_client_id: false,
              challenge_url: None,
              stateful: false,
          }
      }
  }

  /// A code waiting for its exchange.
  #[derive(Debug, Clone)]
  struct Code {
      client_id: String,
      challenge: String,
      redirect_uri: String,
      resource: Option<String>,
  }

  /// A refresh token, and whether it was used (rotation: once).
  #[derive(Debug, Clone)]
  struct Refresh {
      family: u32,
      used: bool,
  }

  #[derive(Default)]
  pub struct Recorded {
      /// Every request's method and path (with its query).
      pub requests: Vec<(String, String)>,
      pub registered: Vec<String>,
      /// The `resource` each consent, exchange and refresh carried.
      pub consent_resources: Vec<Option<String>>,
      pub token_resources: Vec<(String, Option<String>)>,
      /// The `scope` each refresh carried.
      pub refresh_scopes: Vec<Option<String>>,
      pub refreshes: usize,
      pub exchanges: usize,
      /// Reuse of a spent refresh token was seen.
      pub reuse_detected: bool,
      /// Basic auth the token endpoint received.
      pub basic: Vec<String>,
      /// The PKCE verifiers exchanges carried.
      pub verifiers: Vec<String>,
      /// Every code, access and refresh token issued.
      pub issued: Vec<String>,
      /// A client secret came in the form (`client_secret_post`).
      pub posted_secret: bool,
      /// Every bearer token the MCP endpoint was sent, in order.
      pub bearers: Vec<String>,
  }

  pub struct Inner {
      pub config: Config,
      pub recorded: Recorded,
      codes: HashMap<String, Code>,
      access: HashMap<String, u32>,
      refresh: HashMap<String, Refresh>,
      revoked: Vec<u32>,
      next: u32,
      clients: Vec<String>,
      /// Registered confidential clients: (id, secret).
      secrets: Vec<(String, String)>,
  }

  #[derive(Clone)]
  struct Shared {
      inner: Arc<Mutex<Inner>>,
      origin: String,
      gate: watch::Receiver<bool>,
  }

  pub struct FakeAs {
      pub addr: SocketAddr,
      inner: Arc<Mutex<Inner>>,
      gate: watch::Sender<bool>,
      task: tokio::task::JoinHandle<()>,
  }

  impl Drop for FakeAs {
      fn drop(&mut self) {
          let _ = self.gate.send(true);
          self.task.abort();
      }
  }

  impl FakeAs {
      pub async fn start(config: Config) -> Self {
          let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
          let addr = listener.local_addr().unwrap();
          let inner = Arc::new(Mutex::new(Inner {
              config,
              recorded: Recorded::default(),
              codes: HashMap::new(),
              access: HashMap::new(),
              refresh: HashMap::new(),
              revoked: Vec::new(),
              next: 0,
              clients: Vec::new(),
              secrets: Vec::new(),
          }));
          let (gate, open) = watch::channel(false);
          let shared = Shared {
              inner: inner.clone(),
              origin: format!("http://{addr}"),
              gate: open,
          };
          let app = Router::new().fallback(handle).with_state(shared);
          let task = tokio::spawn(async move {
              axum::serve(listener, app).await.unwrap();
          });
          Self {
              addr,
              inner,
              gate,
              task,
          }
      }

      pub fn origin(&self) -> String {
          format!("http://{}", self.addr)
      }

      /// The MCP endpoint's URL: the connection's.
      pub fn mcp_url(&self) -> String {
          format!("{}/mcp", self.origin())
      }

      pub fn issuer(&self) -> String {
          let path = self.inner.lock().unwrap().config.as_path.clone();
          format!("{}{path}", self.origin())
      }

      pub fn configure(&self, change: impl FnOnce(&mut Config)) {
          change(&mut self.inner.lock().unwrap().config);
      }

      pub fn with<T>(&self, read: impl FnOnce(&Recorded) -> T) -> T {
          read(&self.inner.lock().unwrap().recorded)
      }

      /// The paths requested, in order.
      pub fn paths(&self) -> Vec<String> {
          self.with(|r| r.requests.iter().map(|(_, p)| p.clone()).collect())
      }

      /// Let gated token responses go.
      pub fn open_gate(&self) {
          let _ = self.gate.send(true);
      }

      /// A grant issued directly, as if consented: its access and refresh
      /// tokens, valid at the token endpoint and the MCP endpoint.
      pub fn issue(&self) -> (String, String) {
          let mut inner = self.inner.lock().unwrap();
          inner.next += 1;
          let family = inner.next;
          let prefix = inner.config.prefix.clone();
          let access = format!("{prefix}access-{family}-0");
          let refresh = format!("{prefix}refresh-{family}-0");
          inner.access.insert(access.clone(), family);
          inner.refresh.insert(refresh.clone(), Refresh { family, used: false });
          (access, refresh)
      }

      /// Invalidate every access token (they "expired"); refresh tokens stay.
      pub fn expire_access(&self) {
          self.inner.lock().unwrap().access.clear();
      }

      /// Whether `token` is a live access token.
      pub fn is_live(&self, token: &str) -> bool {
          let inner = self.inner.lock().unwrap();
          inner.access.get(token).is_some_and(|f| !inner.revoked.contains(f))
      }

      /// Consent as a browser would: GET the consent URL and return the
      /// redirect's `Location`, which goes back to hennery's callback.
      pub async fn consent(&self, consent_url: &str) -> String {
          let client = reqwest::Client::builder()
              .no_proxy()
              .redirect(reqwest::redirect::Policy::none())
              .build()
              .unwrap();
          let response = client.get(consent_url).send().await.unwrap();
          assert_eq!(response.status(), StatusCode::FOUND, "consent did not redirect");
          response.headers()[header::LOCATION].to_str().unwrap().to_string()
      }
  }

  /// Store a grant for `id` as a completed Connect would, without the
  /// consent: `access` and `refresh` from `fake.issue()`, the fake's token
  /// endpoint, the MCP URL as its `resource`, `read write` as its scopes.
  pub fn seed_grant(
      world: &super::World,
      id: &str,
      fake: &FakeAs,
      access: &str,
      refresh: Option<&str>,
      expires_at: Option<i64>,
  ) {
      use hennery_gateway::model::{AuthMethod, GrantTokens, TokenClient};
      use hennery_gateway::store::{ClientSource, GrantStored, GrantToStore};
      let record = world.store.connection(id).unwrap().unwrap();
      let client = TokenClient {
          client_id: "pre-seeded".into(),
          secret: None,
          auth_method: AuthMethod::None,
          token_endpoint: format!("{}/token", fake.origin()),
      };
      let tokens = GrantTokens {
          access_token: zeroize::Zeroizing::new(access.to_string()),
          refresh_token: refresh.map(|r| zeroize::Zeroizing::new(r.to_string())),
      };
      let scopes = vec!["read".to_string(), "write".to_string()];
      let stored = world
          .store
          .store_grant(
              &GrantToStore {
                  connection_id: id,
                  url: &record.url,
                  cred_kind: record.cred_kind,
                  internal_network: record.internal_network,
                  source: ClientSource::Registered,
                  client: &client,
                  issuer: &fake.issuer(),
                  authorization_endpoint: &format!("{}/authorize", fake.origin()),
                  redirect_uri: "https://hennery.example/api/mcp/oauth/callback",
                  scopes: &scopes,
                  resource: &record.url,
                  resource_param_accepted: true,
                  registered_at: 1,
                  tokens: &tokens,
                  expires_at,
              },
              &world.key,
              hennery_kernel::secret::unix_now(),
          )
          .unwrap();
      assert!(matches!(stored, GrantStored::Stored(_)), "{stored:?}");
  }

  fn json_response(status: u16, value: &Value) -> Response {
      Response::builder()
          .status(status)
          .header(header::CONTENT_TYPE, "application/json")
          .body(Body::from(value.to_string()))
          .unwrap()
  }

  fn raw_json(text: &str) -> Response {
      Response::builder()
          .status(200)
          .header(header::CONTENT_TYPE, "application/json")
          .body(Body::from(text.to_string()))
          .unwrap()
  }

  fn not_found() -> Response {
      StatusCode::NOT_FOUND.into_response()
  }

  fn form(body: &[u8]) -> HashMap<String, String> {
      url::form_urlencoded::parse(body).into_owned().collect()
  }

  fn query(uri: &axum::http::Uri) -> HashMap<String, String> {
      url::form_urlencoded::parse(uri.query().unwrap_or_default().as_bytes())
          .into_owned()
          .collect()
  }

  fn bearer(headers: &HeaderMap) -> Option<String> {
      headers
          .get(header::AUTHORIZATION)?
          .to_str()
          .ok()?
          .strip_prefix("Bearer ")
          .map(String::from)
  }

  async fn handle(State(shared): State<Shared>, request: Request) -> Response {
      let (parts, body) = request.into_parts();
      let body = axum::body::to_bytes(body, 1 << 20).await.unwrap();
      let path = parts.uri.path().to_string();
      let path_and_query = parts.uri.to_string();
      let method = parts.method.to_string();
      let origin = shared.origin.clone();
      let config = {
          let mut inner = shared.inner.lock().unwrap();
          inner.recorded.requests.push((method.clone(), path_and_query));
          inner.config.clone()
      };
      let issuer = config
          .issuer
          .clone()
          .unwrap_or_else(|| format!("{origin}{}", config.as_path));
      let mcp_url = format!("{origin}/mcp");
      let pr = || match &config.raw_pr {
          Some(raw) => raw_json(raw),
          None => json_response(
              200,
              &json!({
                  "resource": config.resource.clone().unwrap_or_else(|| mcp_url.clone()),
                  "authorization_servers": [format!("{origin}{}", config.as_path)],
                  "scopes_supported": config.scopes,
              }),
          ),
      };
      let meta_path = match config.meta_at {
          MetaAt::Inserted => format!("/.well-known/oauth-authorization-server{}", config.as_path),
          MetaAt::Appended => format!("{}/.well-known/oauth-authorization-server", config.as_path),
          MetaAt::Openid => format!("{}/.well-known/openid-configuration", config.as_path),
      };
      match (method.as_str(), path.as_str()) {
          (_, p) if p == "/mcp" || (p.ends_with("/mcp") && !p.starts_with("/.well-known")) => {
              if config.mcp_hang && bearer(&parts.headers).is_some() {
                  std::future::pending::<()>().await;
              }
              mcp(&shared, &config, &parts.headers, &method, &body, &origin)
          }
          ("GET", "/prm-from-challenge") if config.pr_at == PrAt::Challenge => pr(),
          // The redirect carries a document of its own, as hostile as the
          // one it points to: a 3xx is never read.
          ("GET", "/.well-known/oauth-protected-resource/mcp") if config.pr_redirect => Response::builder()
              .status(StatusCode::FOUND)
              .header(header::LOCATION, format!("{origin}/elsewhere"))
              .header(header::CONTENT_TYPE, "application/json")
              .body(Body::from(
                  json!({ "resource": mcp_url, "authorization_servers": ["https://evil.example"] }).to_string(),
              ))
              .unwrap(),
          ("GET", "/.well-known/oauth-protected-resource/mcp") if config.pr_status.is_some() => {
              StatusCode::from_u16(config.pr_status.unwrap()).unwrap().into_response()
          }
          ("GET", "/elsewhere") => json_response(
              200,
              &json!({ "resource": mcp_url, "authorization_servers": ["https://evil.example"] }),
          ),
          ("GET", "/.well-known/oauth-protected-resource/mcp") if config.pr_at == PrAt::PathInserted => pr(),
          ("GET", "/.well-known/oauth-protected-resource") if config.pr_at == PrAt::Origin => pr(),
          ("GET", p)
              if config.meta_status.is_some()
                  && (p.contains("oauth-authorization-server") || p.contains("openid-configuration")) =>
          {
              StatusCode::from_u16(config.meta_status.unwrap())
                  .unwrap()
                  .into_response()
          }
          ("GET", p) if p == meta_path && config.serve_metadata => match &config.raw_meta {
              Some(raw) => raw_json(raw),
              None => {
                  let mut meta = json!({
                      "issuer": issuer,
                      "authorization_endpoint": config.authorization_endpoint.clone().unwrap_or_else(|| format!("{origin}/authorize")),
                      "token_endpoint": config.token_endpoint.clone().unwrap_or_else(|| format!("{origin}/token")),
                      "code_challenge_methods_supported": if config.s256 { json!(["S256"]) } else { json!(["plain"]) },
                      "authorization_response_iss_parameter_supported": config.iss_parameter,
                  });
                  if config.registration {
                      meta["registration_endpoint"] = json!(format!("{origin}/register"));
                  }
                  if !config.auth_methods.is_empty() {
                      meta["token_endpoint_auth_methods_supported"] = json!(config.auth_methods);
                  }
                  json_response(200, &meta)
              }
          },
          ("POST", "/register") => register(&shared, &config, &body),
          ("GET", "/authorize") => authorize(&shared, &config, &parts.uri, &issuer),
          ("POST", "/token") => {
              if config.gate_token {
                  let mut gate = shared.gate.clone();
                  while !*gate.borrow() {
                      if gate.changed().await.is_err() {
                          break;
                      }
                  }
              }
              if let Some(status) = config.token_status {
                  return StatusCode::from_u16(status).unwrap().into_response();
              }
              token(&shared, &config, &parts.headers, &body)
          }
          _ => not_found(),
      }
  }

  fn mcp(shared: &Shared, config: &Config, headers: &HeaderMap, method: &str, body: &[u8], origin: &str) -> Response {
      let live = {
          let mut inner = shared.inner.lock().unwrap();
          if let Some(token) = bearer(headers) {
              inner.recorded.bearers.push(token);
          }
          bearer(headers).is_some_and(|t| inner.access.get(&t).is_some_and(|f| !inner.revoked.contains(f)))
      };
      if !live {
          let mut response = StatusCode::UNAUTHORIZED.into_response();
          if config.pr_at == PrAt::Challenge {
              response.headers_mut().insert(
                  header::WWW_AUTHENTICATE,
                  format!(
                      "Bearer resource_metadata=\"{}\"",
                      config
                          .challenge_url
                          .clone()
                          .unwrap_or_else(|| format!("{origin}/prm-from-challenge"))
                  )
                  .parse()
                  .unwrap(),
              );
          } else {
              response
                  .headers_mut()
                  .insert(header::WWW_AUTHENTICATE, "Bearer".parse().unwrap());
          }
          return response;
      }
      if let Some(status) = config.mcp_status {
          return StatusCode::from_u16(status).unwrap().into_response();
      }
      if method == "DELETE" {
          return StatusCode::OK.into_response();
      }
      let message: Value = serde_json::from_slice(body).unwrap_or(Value::Null);
      let header = |name: &str| headers.get(name).and_then(|v| v.to_str().ok());
      if config.stateful
          && message["method"] != "initialize"
          && (header("mcp-session-id") != Some("fake-session") || header("mcp-protocol-version") != Some("2025-06-18"))
      {
          return StatusCode::BAD_REQUEST.into_response();
      }
      let Some(id) = message.get("id").cloned() else {
          return StatusCode::ACCEPTED.into_response();
      };
      let result = match message["method"].as_str() {
          Some("initialize") => {
              json!({ "protocolVersion": "2025-06-18", "capabilities": {}, "serverInfo": { "name": "fake" } })
          }
          Some("tools/list") => json!({ "tools": [{ "name": "search", "inputSchema": { "type": "object" } }] }),
          _ => json!({}),
      };
      let mut response = json_response(200, &json!({ "jsonrpc": "2.0", "id": id, "result": result }));
      response
          .headers_mut()
          .insert("mcp-session-id", "fake-session".parse().unwrap());
      response
  }

  fn register(shared: &Shared, config: &Config, body: &[u8]) -> Response {
      if let Some((status, refusal)) = &config.dcr_refusal {
          return json_response(*status, refusal);
      }
      let request: Value = serde_json::from_slice(body).unwrap();
      assert_eq!(request["token_endpoint_auth_method"], "none", "a public client");
      if config.dcr_without_client_id {
          return json_response(201, &json!({ "redirect_uris": request["redirect_uris"] }));
      }
      let mut inner = shared.inner.lock().unwrap();
      inner.next += 1;
      let client_id = format!("client-{}", inner.next);
      inner.recorded.registered.push(client_id.clone());
      if config.dcr_secret {
          let secret = format!("dcr-secret-{}", inner.next);
          inner.secrets.push((client_id.clone(), secret.clone()));
          return json_response(
              201,
              &json!({ "client_id": client_id, "client_secret": secret, "redirect_uris": request["redirect_uris"] }),
          );
      }
      inner.clients.push(client_id.clone());
      json_response(
          201,
          &json!({ "client_id": client_id, "redirect_uris": request["redirect_uris"] }),
      )
  }

  fn authorize(shared: &Shared, config: &Config, uri: &axum::http::Uri, issuer: &str) -> Response {
      let q = query(uri);
      assert_eq!(q.get("response_type").map(String::as_str), Some("code"));
      assert_eq!(q.get("code_challenge_method").map(String::as_str), Some("S256"));
      let redirect_uri = q["redirect_uri"].clone();
      let state = q["state"].clone();
      let resource = q.get("resource").cloned();
      let mut inner = shared.inner.lock().unwrap();
      inner.recorded.consent_resources.push(resource.clone());
      let iss = match &config.iss_sent {
          Some(sent) => sent.clone(),
          None => Some(issuer.to_string()),
      };
      let mut location = url::Url::parse(&redirect_uri).unwrap();
      {
          let mut pairs = location.query_pairs_mut();
          if config.refuse_resource_at_consent && resource.is_some() {
              pairs.append_pair("error", "invalid_target");
          } else if let Some(description) = &config.deny {
              pairs
                  .append_pair("error", "access_denied")
                  .append_pair("error_description", description);
          } else {
              inner.next += 1;
              let code = format!("{}code-{}", config.prefix, inner.next);
              inner.recorded.issued.push(code.clone());
              inner.codes.insert(
                  code.clone(),
                  Code {
                      client_id: q["client_id"].clone(),
                      challenge: q["code_challenge"].clone(),
                      redirect_uri: redirect_uri.clone(),
                      resource,
                  },
              );
              pairs.append_pair("code", &code);
          }
          pairs.append_pair("state", &state);
          if let Some(iss) = iss {
              pairs.append_pair("iss", &iss);
          }
      }
      Response::builder()
          .status(StatusCode::FOUND)
          .header(header::LOCATION, location.as_str())
          .body(Body::empty())
          .unwrap()
  }

  fn refused(config: &Config, error: &str) -> Response {
      json_response(400, config.refusal_body.as_ref().unwrap_or(&json!({ "error": error })))
  }

  fn token(shared: &Shared, config: &Config, headers: &HeaderMap, body: &[u8]) -> Response {
      let f = form(body);
      let mut inner = shared.inner.lock().unwrap();
      // The client.
      let basic = headers
          .get(header::AUTHORIZATION)
          .and_then(|v| v.to_str().ok())
          .and_then(|v| v.strip_prefix("Basic "))
          .map(|b| String::from_utf8(base64::engine::general_purpose::STANDARD.decode(b).unwrap()).unwrap());
      if let Some(basic) = &basic {
          inner.recorded.basic.push(basic.clone());
      }
      let posted = f.get("client_id").zip(f.get("client_secret"));
      let client_ok = match (&config.confidential, &basic) {
          (Some((id, secret)), Some(basic)) => *basic == format!("{id}:{secret}"),
          // `client_secret_post`.
          (Some((id, secret)), None) => posted == Some((id, secret)),
          (None, Some(basic)) => inner
              .secrets
              .iter()
              .any(|(id, secret)| *basic == format!("{id}:{secret}")),
          (None, None) => f
              .get("client_id")
              .is_some_and(|id| inner.clients.contains(id) || id.starts_with("pre-")),
      };
      if posted.is_some() {
          inner.recorded.posted_secret = true;
      }
      if !client_ok {
          return json_response(401, &json!({ "error": "invalid_client" }));
      }
      let resource = f.get("resource").cloned();
      let grant_type = f.get("grant_type").cloned().unwrap_or_default();
      inner
          .recorded
          .token_resources
          .push((grant_type.clone(), resource.clone()));
      if config.refuse_resource_at_token && resource.is_some() {
          return json_response(400, &json!({ "error": "invalid_target" }));
      }
      let family = match grant_type.as_str() {
          "authorization_code" => {
              inner.recorded.exchanges += 1;
              let Some(code) = f.get("code").and_then(|c| inner.codes.remove(c)) else {
                  return refused(config, "invalid_grant");
              };
              let verifier = f.get("code_verifier").cloned().unwrap_or_default();
              inner.recorded.verifiers.push(verifier.clone());
              let challenge =
                  base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
              if challenge != code.challenge
                  || f.get("redirect_uri") != Some(&code.redirect_uri)
                  || (basic.is_none() && f.get("client_id") != Some(&code.client_id))
                  || basic
                      .as_ref()
                      .is_some_and(|b| !b.starts_with(&format!("{}:", code.client_id)))
                  || (resource.is_some() && resource != code.resource)
              {
                  return refused(config, "invalid_grant");
              }
              inner.next += 1;
              inner.next
          }
          "refresh_token" => {
              inner.recorded.refreshes += 1;
              inner.recorded.refresh_scopes.push(f.get("scope").cloned());
              let Some(presented) = f.get("refresh_token").cloned() else {
                  return refused(config, "invalid_request");
              };
              let Some(held) = inner.refresh.get(&presented).cloned() else {
                  return refused(config, "invalid_grant");
              };
              if inner.revoked.contains(&held.family) {
                  return refused(config, "invalid_grant");
              }
              if held.used {
                  // Reuse: the whole family is revoked (OAuth 2.0 Security BCP).
                  inner.recorded.reuse_detected = true;
                  inner.revoked.push(held.family);
                  return refused(config, "invalid_grant");
              }
              if !config.refresh_keeps_token {
                  inner.refresh.get_mut(&presented).unwrap().used = true;
              }
              held.family
          }
          _ => return refused(config, "unsupported_grant_type"),
      };
      if let Some(raw) = &config.raw_token {
          return raw_json(raw);
      }
      let n = inner.access.len() + inner.refresh.len();
      let access = format!("{}access-{family}-{n}", config.prefix);
      inner.recorded.issued.push(access.clone());
      inner.access.insert(access.clone(), family);
      let mut issued = json!({ "access_token": access, "token_type": "Bearer" });
      if let Some(expires_in) = config.expires_in {
          issued["expires_in"] = json!(expires_in);
      }
      let rotate = grant_type == "authorization_code" || !config.refresh_keeps_token;
      if rotate {
          let refresh = format!("{}refresh-{family}-{n}", config.prefix);
          inner.recorded.issued.push(refresh.clone());
          inner.refresh.insert(refresh.clone(), Refresh { family, used: false });
          issued["refresh_token"] = json!(refresh);
      }
      json_response(200, &issued)
  }
  ```

In `crates/hennery-gateway/tests/tokens.rs`, replace:

  ```rust
  use hennery_gateway::model::CredKind;
  ```

with:

  ```rust
  use hennery_gateway::model::{CredKind, Status};
  ```

In `crates/hennery-gateway/tests/tokens.rs`, replace:

  ```rust
      let id = h.connection("linear", url, CredKind::Static);
      assert!(!h.proxy_store.mark_ok(&id, url, 1).unwrap(), "no token: not ok");
      h.set_token(&id, "tok");
      assert!(!h.proxy_store.mark_ok(&id, "http://127.0.0.1:9/other", 1).unwrap());
      assert!(
          !h.proxy_store
              .mark_needs_auth(&id, "http://127.0.0.1:9/other", 1)
              .unwrap()
      );
      assert_eq!(h.status(&id), "not_connected");
      assert!(h.proxy_store.mark_needs_auth(&id, url, 2).unwrap());
      assert!(!h.proxy_store.mark_needs_auth(&id, url, 3).unwrap(), "already");
      assert_eq!(h.status(&id), "needs_auth");
      assert!(h.proxy_store.mark_ok(&id, url, 4).unwrap());
      assert!(!h.proxy_store.mark_ok(&id, url, 5).unwrap(), "already");
      assert_eq!(h.status(&id), "ok");
      let none = h.connection("public", url, CredKind::None);
      assert!(h.proxy_store.mark_ok(&none, url, 1).unwrap());
  }
  ```

with:

  ```rust
      let note = "refused";
      let id = h.connection("linear", url, CredKind::Static);
      assert!(
          h.proxy_store.record_traffic_ok(&id, url, 1).unwrap().is_none(),
          "no token: not ok"
      );
      assert_eq!(h.store.connection(&id).unwrap().unwrap().checked_at, None);
      h.set_token(&id, "tok");
      let other = "http://127.0.0.1:9/other";
      assert!(h.proxy_store.record_traffic_ok(&id, other, 1).unwrap().is_none());
      assert!(h.proxy_store.mark_needs_auth(&id, other, note, 1).unwrap().is_none());
      assert_eq!(h.status(&id), "not_connected");
      let change = h.proxy_store.mark_needs_auth(&id, url, note, 2).unwrap().unwrap();
      assert_eq!((change.from, change.to), (Status::NotConnected, Status::NeedsAuth));
      assert!(
          h.proxy_store.mark_needs_auth(&id, url, note, 3).unwrap().is_none(),
          "already"
      );
      assert_eq!(h.status(&id), "needs_auth");
      let change = h.proxy_store.record_traffic_ok(&id, url, 4).unwrap().unwrap();
      assert_eq!((change.from, change.to), (Status::NeedsAuth, Status::Ok));
      assert!(
          h.proxy_store.record_traffic_ok(&id, url, 5).unwrap().is_none(),
          "already"
      );
      assert_eq!(h.status(&id), "ok");
      let none = h.connection("public", url, CredKind::None);
      assert!(h.proxy_store.record_traffic_ok(&none, url, 1).unwrap().is_some());
  }

  /// Plan 8d's hand-off: live traffic moves `checked_at` at most once a
  /// minute, not on every request.
  #[test]
  fn live_traffic_moves_checked_at_once_a_minute() {
      let h = World::new();
      let url = "http://127.0.0.1:9/mcp";
      let id = h.connection("public", url, CredKind::None);
      let checked = || h.store.connection(&id).unwrap().unwrap().checked_at;
      h.proxy_store.record_traffic_ok(&id, url, 1000).unwrap();
      assert_eq!(checked(), Some(1000));
      h.proxy_store.record_traffic_ok(&id, url, 1059).unwrap();
      assert_eq!(checked(), Some(1000));
      h.proxy_store.record_traffic_ok(&id, url, 1060).unwrap();
      assert_eq!(checked(), Some(1060));
  }
  ```

In `crates/hennery-testkit/tests/owner_filter.rs`, replace:

  ```rust
          5,
  ```

with:

  ```rust
          // Plan 8f: status writes, the probe's reads.
          12,
  ```

In `crates/hennery-testkit/tests/owner_filter.rs`, replace:

  ```rust
  /// The gateway store's statements (plan 8a), apart from the list above so
  /// that other lanes' changes to it stay apart from this one.
  const GATEWAY_STATEMENTS: usize = 25;
  ```

with:

  ```rust
  /// The gateway store's statements, including stdio and OAuth clients.
  const GATEWAY_STATEMENTS: usize = 46;
  ```

- [ ] **Step 2: Run them and see them fail, then commit them**

   ```sh
   nix develop -c cargo test -p hennery-gateway --locked --test oauth_store --test store --test tokens
   ```

   It does not compile: `GatewayStore::store_grant`, `GrantToStore`, `ClientSource`, `GrantStored`, `AuthMethod`, `GrantTokens`, `TokenClient`, `Status` and `ProxyStore::record_traffic_ok`, `record_status` and `record_checked` do not exist. The owner audit (`owner_filter.rs`) fails on the gateway's statement counts.

   ```sh
   git add -A && git -c commit.gpgsign=false commit -m "test(gateway): OAuth grants and clients sealed under their own fields, status changes reported, a refresh's compare-and-swap"
   ```

- [ ] **Step 3: Implement**

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
      };
      match state.store.create(&new, unix_now()) {
  ```

with:

  ```rust
      };
      if new.cred_kind.is_oauth() {
          return changed(Change::Unsupported(new.cred_kind), StatusCode::CREATED);
      }
      match state.store.create(&new, unix_now()) {
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
      };
      match state.store.update(&id, &patch, unix_now()) {
  ```

with:

  ```rust
      };
      if let Some(kind) = patch.cred_kind.filter(|kind| kind.is_oauth()) {
          return changed(Change::Unsupported(kind), StatusCode::OK);
      }
      match state.store.update(&id, &patch, unix_now()) {
  ```

In `crates/hennery-gateway/src/crypto.rs`, replace:

  ```rust
  pub const STATIC_TOKEN: &str = "gw_credentials.static_token";

  ```

with:

  ```rust
  pub const STATIC_TOKEN: &str = "gw_credentials.static_token";

  /// An OAuth connection's grant (`cred_kind = oauth_dcr | oauth_client`):
  /// its access and refresh tokens, as one JSON object (plan 8f).
  pub const OAUTH_TOKENS: &str = "gw_credentials.oauth_tokens";

  /// An OAuth client's secret: the client the grant was made with.
  pub const CLIENT_SECRET: &str = "gw_oauth_clients.client_secret";

  /// The secret of a pre-registered client saved while a grant is live
  /// (G-7): a field of its own, so it never opens as the active client's.
  pub const PENDING_CLIENT_SECRET: &str = "gw_oauth_clients.pending_client_secret";

  /// The field a connection's credential is sealed under, from its kind: a
  /// row left under another kind does not open as this one's (G-14).
  pub fn credential_field(kind: crate::model::CredKind) -> &'static str {
      match kind {
          crate::model::CredKind::OauthDcr | crate::model::CredKind::OauthClient => OAUTH_TOKENS,
          crate::model::CredKind::None | crate::model::CredKind::Static => STATIC_TOKEN,
      }
  }

  ```

In `crates/hennery-gateway/src/key.rs`, replace:

  ```rust
       `sqlite3 <data>/hennery.db 'DELETE FROM gw_credentials'`, then set each connection's credential again.";
  ```

with:

  ```rust
       `sqlite3 <data>/hennery.db 'DELETE FROM gw_credentials; DELETE FROM gw_oauth_clients'`, then set each \
       connection's credential (and OAuth client) again.";
  ```

In `crates/hennery-gateway/src/model.rs`, replace:

  ```rust
      /// Whether this plan's store takes it: OAuth comes with plan 8f
      /// (plan 8a decision 10).
      pub fn is_supported(self) -> bool {
          matches!(self, Self::None | Self::Static)
      }
  ```

with:

  ```rust
      /// An OAuth kind (gateway spec §4): its credential is a grant, and it
      /// has an OAuth client.
      pub fn is_oauth(self) -> bool {
          matches!(self, Self::OauthDcr | Self::OauthClient)
      }
  }

  /// A connection's health (gateway spec §7), as stored.
  #[derive(Debug, Clone, Copy, PartialEq, Eq)]
  pub enum Status {
      NotConnected,
      Ok,
      NeedsAuth,
      Error,
  }

  impl Status {
      pub fn as_str(self) -> &'static str {
          match self {
              Self::NotConnected => "not_connected",
              Self::Ok => "ok",
              Self::NeedsAuth => "needs_auth",
              Self::Error => "error",
          }
      }

      pub fn parse(text: &str) -> Option<Self> {
          Some(match text {
              "not_connected" => Self::NotConnected,
              "ok" => Self::Ok,
              "needs_auth" => Self::NeedsAuth,
              "error" => Self::Error,
              _ => return None,
          })
      }

      /// A problem the operator is told about (gateway spec §7).
      pub fn is_problem(self) -> bool {
          matches!(self, Self::NeedsAuth | Self::Error)
      }
  }

  /// A connection's status moved from `from` to `to` (gateway spec §7): what
  /// the `Notifier` hears of, and only of these.
  #[derive(Debug, Clone, PartialEq, Eq)]
  pub struct StatusChange {
      pub connection_id: String,
      pub hat_id: String,
      pub label: String,
      pub from: Status,
      pub to: Status,
  }

  /// The most characters of vendor text the operator is shown (gateway
  /// spec §4.2, §4.3).
  pub const MAX_VENDOR_TEXT: usize = 300;

  /// Vendor text as the operator is shown it (plan 8f; api-8e-8f S4): no
  /// control or bidirectional formatting character, cut to
  /// `MAX_VENDOR_TEXT` characters, after "The vendor said: ". Rendered as
  /// text, never as markup.
  pub fn vendor_text(text: &str) -> String {
      let kept: String = text
          .chars()
          .filter(|c| !c.is_control() && !is_bidi_control(*c))
          .take(MAX_VENDOR_TEXT)
          .collect();
      format!("The vendor said: {}", kept.trim())
  }

  fn is_bidi_control(c: char) -> bool {
      matches!(c, '\u{061c}' | '\u{200e}' | '\u{200f}' | '\u{202a}'..='\u{202e}' | '\u{2066}'..='\u{2069}')
  }

  /// A client id the operator registered at a vendor: 1 to 512 visible
  /// ASCII characters (api-8e-8f B2).
  pub fn client_id_problem(client_id: &str) -> Option<String> {
      let ok = (1..=512).contains(&client_id.len()) && client_id.bytes().all(|b| (0x21..=0x7e).contains(&b));
      (!ok).then(|| "a client id is 1 to 512 visible ASCII characters".into())
  }

  /// A client secret: 1 to 8192 visible ASCII characters, without spaces,
  /// as a static token (api-8e-8f B2).
  pub fn client_secret_problem(secret: &str) -> Option<String> {
      token_problem(secret)
          .map(|_| format!("a client secret is 1 to {MAX_TOKEN} visible ASCII characters, without spaces"))
  }

  /// A connection's OAuth client, as the list shows it: never a secret,
  /// only whether one is stored.
  #[derive(Debug, Clone, PartialEq, Eq, Default)]
  pub struct OauthClientView {
      /// The client in use; `None` before an `oauth_dcr`'s first Connect or
      /// an `oauth_client`'s first `PUT …/oauth-client`.
      pub client_id: Option<String>,
      pub has_client_secret: bool,
      /// A pre-registered client saved while a grant is live (G-7): its id,
      /// and whether it has a secret.
      pub pending: Option<(String, bool)>,
  }

  /// Why the latest Connect did not complete (api-8e-8f B3, B5).
  #[derive(Debug, Clone, PartialEq, Eq)]
  pub struct OauthError {
      pub code: String,
      pub message: String,
      pub at: i64,
  ```

In `crates/hennery-gateway/src/model.rs`, replace:

  ```rust
      pub mounts: Vec<String>,
  }
  ```

with:

  ```rust
      pub mounts: Vec<String>,
      /// When the gateway last learned its status (plan 8f).
      pub checked_at: Option<i64>,
      /// For an OAuth kind: its client (plan 8f).
      pub oauth_client: Option<OauthClientView>,
      /// The protected-resource document's `resource`, when the latest
      /// authorize found one that is not the URL, and the one the operator
      /// accepted (gateway spec §4.1, G-4). Never in a `Debug` (lane L11).
      pub resource_mismatch: Option<String>,
      pub accepted_resource: Option<String>,
      pub oauth_error: Option<OauthError>,
  }
  ```

In `crates/hennery-gateway/src/model.rs`, replace:

  ```rust
      Ok(out)
  }
  ```

with:

  ```rust
      Ok(out)
  }

  /// How an OAuth client authenticates at the token endpoint (RFC 6749
  /// §2.3, RFC 8414 `token_endpoint_auth_methods_supported`).
  #[derive(Debug, Clone, Copy, PartialEq, Eq)]
  pub enum AuthMethod {
      /// A public client: its `client_id` in the form, no secret.
      None,
      /// `Authorization: Basic`, the id and secret form-encoded first.
      Basic,
      /// `client_id` and `client_secret` in the form.
      Post,
  }

  impl AuthMethod {
      pub fn as_str(self) -> &'static str {
          match self {
              Self::None => "none",
              Self::Basic => "client_secret_basic",
              Self::Post => "client_secret_post",
          }
      }

      pub fn parse(text: &str) -> Option<Self> {
          Some(match text {
              "none" => Self::None,
              "client_secret_basic" => Self::Basic,
              "client_secret_post" => Self::Post,
              _ => return None,
          })
      }
  }

  /// An OAuth grant's tokens, sealed together as one JSON object
  /// (`crypto::OAUTH_TOKENS`). Wiped when dropped; its `Debug` shows neither.
  #[derive(Clone, PartialEq, Eq)]
  pub struct GrantTokens {
      pub access_token: zeroize::Zeroizing<String>,
      /// `None`: the vendor gave none, so the grant cannot be refreshed.
      pub refresh_token: Option<zeroize::Zeroizing<String>>,
  }

  impl std::fmt::Debug for GrantTokens {
      fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
          f.debug_struct("GrantTokens")
              .field("access_token", &"<redacted>")
              .field("refresh_token", &self.refresh_token.as_ref().map(|_| "<redacted>"))
              .finish()
      }
  }

  impl GrantTokens {
      /// The plaintext that is sealed, built in a buffer that is wiped.
      pub fn to_sealable(&self) -> zeroize::Zeroizing<Vec<u8>> {
          #[derive(serde::Serialize)]
          struct Out<'a> {
              access_token: &'a str,
              #[serde(skip_serializing_if = "Option::is_none")]
              refresh_token: Option<&'a str>,
          }
          let mut out = zeroize::Zeroizing::new(Vec::with_capacity(
              64 + self.access_token.len() + self.refresh_token.as_ref().map_or(0, |t| t.len()),
          ));
          serde_json::to_writer(
              &mut *out,
              &Out {
                  access_token: &self.access_token,
                  refresh_token: self.refresh_token.as_ref().map(|t| t.as_str()),
              },
          )
          .expect("two strings serialise");
          out
      }

      /// What `to_sealable` made, opened.
      pub fn from_opened(bytes: &[u8]) -> Option<Self> {
          #[derive(serde::Deserialize)]
          struct In {
              access_token: String,
              #[serde(default)]
              refresh_token: Option<String>,
          }
          let parsed: In = serde_json::from_slice(bytes).ok()?;
          Some(Self {
              access_token: zeroize::Zeroizing::new(parsed.access_token),
              refresh_token: parsed.refresh_token.map(zeroize::Zeroizing::new),
          })
      }
  }

  /// The client a grant is refreshed with, at its token endpoint.
  #[derive(Clone, PartialEq, Eq)]
  pub struct TokenClient {
      pub client_id: String,
      pub secret: Option<zeroize::Zeroizing<String>>,
      pub auth_method: AuthMethod,
      /// `https` (or loopback `http`), checked when it was discovered.
      pub token_endpoint: String,
  }

  impl std::fmt::Debug for TokenClient {
      fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
          f.debug_struct("TokenClient")
              .field("client_id", &self.client_id)
              .field("secret", &self.secret.as_ref().map(|_| "<redacted>"))
              .field("auth_method", &self.auth_method)
              .field("token_endpoint", &url_for_logs(&self.token_endpoint))
              .finish()
      }
  }

  /// An OAuth connection's grant with everything a request or a refresh
  /// needs, read in one statement (as `StaticCredential`, plan 8a's R2): the
  /// URL it goes to, the allowance, the client and where to refresh it.
  #[derive(Clone)]
  pub struct OauthCredential {
      pub tokens: GrantTokens,
      /// `now + expires_in − 60 s` (gateway spec §4.4); `None`: unknown.
      pub expires_at: Option<i64>,
      pub url: String,
      pub internal_network: bool,
      pub cred_kind: CredKind,
      pub client: TokenClient,
      /// The scopes the grant was asked for, sent again on refresh (G-10).
      pub scopes: Vec<String>,
      /// The `resource` the grant was made for, sent on refresh (RFC 8707)
      /// unless the authorization server refused it.
      pub resource: Option<String>,
      pub resource_param_accepted: bool,
      /// The sealed blob as read: a refresh stores its result only while the
      /// row still holds it (a compare-and-swap; plan 8f decision 9).
      pub(crate) sealed: Vec<u8>,
  }

  impl std::fmt::Debug for OauthCredential {
      fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
          f.debug_struct("OauthCredential")
              .field("tokens", &self.tokens)
              .field("expires_at", &self.expires_at)
              .field("url", &url_for_logs(&self.url))
              .field("internal_network", &self.internal_network)
              .field("cred_kind", &self.cred_kind)
              .field("client", &self.client)
              .field("scopes", &self.scopes)
              .field("resource_param_accepted", &self.resource_param_accepted)
              .finish_non_exhaustive()
      }
  }
  ```

In `crates/hennery-gateway/src/proxy.rs`, replace:

  ```rust
          if let Err(err) = state
              .statuses
              .mark_needs_auth(&connection.id, upstream.url.as_str(), now)
          {
  ```

with:

  ```rust
          if let Err(err) = state.statuses.mark_needs_auth(
              &connection.id,
              upstream.url.as_str(),
              "the upstream refused the credential (401)",
              now,
          ) {
  ```

In `crates/hennery-gateway/src/proxy.rs`, replace:

  ```rust
          && let Err(err) = state.statuses.mark_ok(&connection.id, upstream.url.as_str(), now)
  ```

with:

  ```rust
          && let Err(err) = state
              .statuses
              .record_traffic_ok(&connection.id, upstream.url.as_str(), now)
  ```

In `crates/hennery-gateway/src/schema.rs`, replace:

  ```rust
  //! session tokens; later plans add standalone clients, OAuth clients and
  //! stdio servers.
  ```

with:

  ```rust
  //! session tokens, plan 8f the OAuth clients; later plans add standalone
  //! clients and stdio servers.
  ```

In `crates/hennery-gateway/src/schema.rs`, replace:

  ```rust
      ",
  ];
  ```

with:

  ```rust
      ",
      // Plan 8f: OAuth (gateway spec §4, §7). A connection learns when it was
      // last checked, why its latest Connect failed, and the protected-resource
      // document's `resource` when it is not the URL (found, or accepted). Its
      // OAuth client is one row: the client its grant was made with (or, with
      // no grant yet, the one the next Connect uses), pinned to the
      // authorization server it was first used with, and a pre-registered
      // client saved while a grant is live, which replaces it only when a
      // Connect with it completes (G-7). Secrets are sealed (`crypto`), each
      // under a field of its own; whether one is stored is a column apart, so
      // a list never reads a ciphertext (plan 8a decision 3).
      "
      ALTER TABLE gw_connections ADD COLUMN checked_at INTEGER;
      ALTER TABLE gw_connections ADD COLUMN oauth_error_code TEXT;
      ALTER TABLE gw_connections ADD COLUMN oauth_error_message TEXT;
      ALTER TABLE gw_connections ADD COLUMN oauth_error_at INTEGER;
      ALTER TABLE gw_connections ADD COLUMN resource_mismatch TEXT;
      ALTER TABLE gw_connections ADD COLUMN accepted_resource TEXT;
      CREATE TABLE gw_oauth_clients (
          connection_id TEXT PRIMARY KEY,
          owner_id TEXT NOT NULL,
          client_id TEXT NOT NULL,
          has_client_secret INTEGER NOT NULL CHECK (has_client_secret IN (0, 1)),
          client_secret_ciphertext BLOB,
          key_version INTEGER,
          token_endpoint_auth_method TEXT
              CHECK (token_endpoint_auth_method IN ('none', 'client_secret_basic', 'client_secret_post')),
          issuer TEXT,
          authorization_endpoint TEXT,
          token_endpoint TEXT,
          redirect_uri TEXT,
          scopes TEXT,
          resource TEXT,
          resource_param_accepted INTEGER NOT NULL DEFAULT 1 CHECK (resource_param_accepted IN (0, 1)),
          registered_at INTEGER NOT NULL,
          pending_client_id TEXT,
          pending_has_secret INTEGER NOT NULL DEFAULT 0 CHECK (pending_has_secret IN (0, 1)),
          pending_secret_ciphertext BLOB,
          pending_issuer TEXT,
          pending_token_endpoint TEXT,
          FOREIGN KEY (connection_id, owner_id) REFERENCES gw_connections(id, owner_id));
      ",
  ];
  ```

In `crates/hennery-gateway/src/scope.rs`, replace:

  ```rust
  use crate::model::{CredKind, url_for_logs};
  ```

with:

  ```rust
  use crate::model::{CredKind, Status, StatusChange, url_for_logs};
  ```

In `crates/hennery-gateway/src/scope.rs`, replace:

  ```rust
      pub status: String,
  }
  ```

with:

  ```rust
      pub status: String,
      /// Whether a credential is stored, as of the read.
      pub has_credential: bool,
  }
  ```

In `crates/hennery-gateway/src/scope.rs`, replace:

  ```rust
      /// connection was changed meanwhile, to another URL or to a `static`
      /// kind without a credential: the answer was about what it was. True if
      /// the status changed.
      pub fn mark_ok(&self, id: &str, url: &str, now: i64) -> Result<bool> {
          let changed = self.conn().execute(
              "UPDATE gw_connections SET status = 'ok', status_note = NULL, status_at = ?4
               WHERE id = ?1 AND owner_id = ?2 AND url = ?3 AND status != 'ok'
                   AND (cred_kind = 'none'
                        OR EXISTS (SELECT 1 FROM gw_credentials k WHERE k.connection_id = ?1 AND k.owner_id = ?2))",
              params![id, self.owner, url, now],
          )?;
          Ok(changed == 1)
      }

      /// The upstream at `url` refused `id`'s credential, or its lack of one
      /// (401; gateway spec §5.4, §7): `needs_auth`, unless the connection
      /// was changed to another URL meanwhile. True if the status changed.
      pub fn mark_needs_auth(&self, id: &str, url: &str, now: i64) -> Result<bool> {
          let changed = self.conn().execute(
              "UPDATE gw_connections SET status = 'needs_auth', status_note = ?4, status_at = ?5
               WHERE id = ?1 AND owner_id = ?2 AND url = ?3 AND status != 'needs_auth'",
              params![id, self.owner, url, "the upstream refused the credential (401)", now],
          )?;
          Ok(changed == 1)
  ```

with:

  ```rust
      /// connection was changed meanwhile, to another URL or to a kind
      /// without a credential: the answer was about what it was. `checked_at`
      /// moves at most every `LAST_USED_EVERY` seconds (plan 8d's hand-off),
      /// not on every request. The transition, if there was one.
      pub fn record_traffic_ok(&self, id: &str, url: &str, now: i64) -> Result<Option<StatusChange>> {
          let mut conn = self.conn();
          let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
          let row: Option<(String, String, String, Option<i64>)> = tx
              .query_row(
                  "SELECT status, label, hat_id, checked_at FROM gw_connections
                   WHERE id = ?1 AND owner_id = ?2 AND url = ?3
                       AND (cred_kind = 'none'
                            OR EXISTS (SELECT 1 FROM gw_credentials k WHERE k.connection_id = ?1 AND k.owner_id = ?2))",
                  params![id, self.owner, url],
                  |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
              )
              .optional()?;
          let Some((status, label, hat_id, checked_at)) = row else {
              return Ok(None);
          };
          let from = Status::parse(&status).ok_or_else(|| anyhow!("a stored status"))?;
          if from == Status::Ok {
              if checked_at.is_none_or(|at| now - at >= LAST_USED_EVERY) {
                  tx.execute(
                      "UPDATE gw_connections SET checked_at = ?3 WHERE id = ?1 AND owner_id = ?2",
                      params![id, self.owner, now],
                  )?;
                  tx.commit()?;
              }
              return Ok(None);
          }
          tx.execute(
              "UPDATE gw_connections SET status = 'ok', status_note = NULL, status_at = ?3, checked_at = ?3
               WHERE id = ?1 AND owner_id = ?2",
              params![id, self.owner, now],
          )?;
          tx.commit()?;
          Ok(Some(StatusChange {
              connection_id: id.to_string(),
              hat_id,
              label,
              from,
              to: Status::Ok,
          }))
      }

      /// `id`'s status is `to` as of `now`, with `note`, unless the
      /// connection was changed to another URL than `url` meanwhile (gateway
      /// spec §5.4, §7): the upstream refused its credential (`needs_auth`),
      /// or the probe says `ok` or `error`. `checked_at` moves either way.
      /// The transition, if there was one.
      pub fn record_status(
          &self,
          id: &str,
          url: &str,
          to: Status,
          note: Option<&str>,
          now: i64,
      ) -> Result<Option<StatusChange>> {
          let mut conn = self.conn();
          let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
          let row: Option<(String, String, String)> = tx
              .query_row(
                  "SELECT status, label, hat_id FROM gw_connections WHERE id = ?1 AND owner_id = ?2 AND url = ?3",
                  params![id, self.owner, url],
                  |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
              )
              .optional()?;
          let Some((status, label, hat_id)) = row else {
              return Ok(None);
          };
          let from = Status::parse(&status).ok_or_else(|| anyhow!("a stored status"))?;
          tx.execute(
              "UPDATE gw_connections SET status = ?3, status_note = ?4, checked_at = ?5,
                   status_at = CASE WHEN status = ?3 THEN status_at ELSE ?5 END
               WHERE id = ?1 AND owner_id = ?2",
              params![id, self.owner, to.as_str(), note, now],
          )?;
          tx.commit()?;
          Ok((from != to).then(|| StatusChange {
              connection_id: id.to_string(),
              hat_id,
              label,
              from,
              to,
          }))
      }

      /// The upstream at `url` refused `id`'s credential, or its lack of one
      /// (401; gateway spec §5.4, §7): `needs_auth`, with `note`.
      pub fn mark_needs_auth(&self, id: &str, url: &str, note: &str, now: i64) -> Result<Option<StatusChange>> {
          self.record_status(id, url, Status::NeedsAuth, Some(note), now)
      }

      /// Only `checked_at` moves: the probe learned nothing that changes the
      /// status (another 4xx: gateway spec §7), while the URL is `url`.
      pub fn record_checked(&self, id: &str, url: &str, now: i64) -> Result<()> {
          self.conn().execute(
              "UPDATE gw_connections SET checked_at = ?4 WHERE id = ?1 AND owner_id = ?2 AND url = ?3",
              params![id, self.owner, url, now],
          )?;
          Ok(())
      }

      /// Every connection in `needs_auth` or `error` now, as the transition
      /// a startup announces once (gateway spec §7).
      pub fn problems(&self) -> Result<Vec<StatusChange>> {
          let conn = self.conn();
          let mut stmt = conn.prepare(
              "SELECT id, hat_id, label, status FROM gw_connections
               WHERE owner_id = ?1 AND status IN ('needs_auth', 'error') ORDER BY created_at, id",
          )?;
          let rows = stmt.query_map([&self.owner], |r| {
              Ok((r.get::<_, String>(0)?, r.get(1)?, r.get(2)?, r.get::<_, String>(3)?))
          })?;
          let mut out = Vec::new();
          for row in rows {
              let (connection_id, hat_id, label, status) = row?;
              out.push(StatusChange {
                  connection_id,
                  hat_id,
                  label,
                  from: Status::Ok,
                  to: Status::parse(&status).ok_or_else(|| anyhow!("a stored status"))?,
              });
          }
          Ok(out)
      }

      /// The connections the background probe checks (gateway spec §7): the
      /// OAuth ones with a grant. Static and `none` connections are not
      /// probed, nor any without a credential.
      pub fn probe_targets(&self) -> Result<Vec<ScopedConnection>> {
          let conn = self.conn();
          let mut stmt = conn.prepare(
              "SELECT c.id FROM gw_connections c
               WHERE c.owner_id = ?1 AND c.cred_kind IN ('oauth_dcr', 'oauth_client')
                   AND EXISTS (SELECT 1 FROM gw_credentials k WHERE k.connection_id = c.id AND k.owner_id = ?1)
               ORDER BY c.created_at, c.id",
          )?;
          let ids = stmt
              .query_map([&self.owner], |r| r.get::<_, String>(0))?
              .collect::<rusqlite::Result<Vec<_>>>()?;
          drop(stmt);
          drop(conn);
          let mut out = Vec::new();
          for id in ids {
              if let Some(connection) = self.connection_by_id(&id)? {
                  out.push(connection);
              }
          }
          Ok(out)
      }

      /// The connection `id` as the proxy reads one, whatever its mounts: for
      /// a probe, which acts for the operator, not for a principal. With
      /// whether it has a credential.
      pub fn connection_by_id(&self, id: &str) -> Result<Option<ScopedConnection>> {
          type Row = (String, String, String, String, bool, Option<String>, String, bool);
          let row: Option<Row> = self
              .conn()
              .query_row(
                  "SELECT c.slug, c.label, c.url, c.cred_kind, c.internal_network, c.tool_allowlist, c.status,
                          EXISTS (SELECT 1 FROM gw_credentials k WHERE k.connection_id = c.id AND k.owner_id = ?1)
                   FROM gw_connections c WHERE c.owner_id = ?1 AND c.id = ?2",
                  params![self.owner, id],
                  |r| {
                      Ok((
                          r.get(0)?,
                          r.get(1)?,
                          r.get(2)?,
                          r.get(3)?,
                          r.get(4)?,
                          r.get(5)?,
                          r.get(6)?,
                          r.get(7)?,
                      ))
                  },
              )
              .optional()?;
          let Some((slug, label, url, kind, internal_network, allowlist, status, has_credential)) = row else {
              return Ok(None);
          };
          Ok(Some(ScopedConnection {
              cred_kind: CredKind::parse(&kind).ok_or_else(|| anyhow!("a stored credential kind"))?,
              tool_allowlist: allowlist
                  .map(|json| serde_json::from_str(&json))
                  .transpose()
                  .context("a stored tool allowlist")?,
              id: id.to_string(),
              slug,
              label,
              url,
              internal_network,
              status,
              has_credential,
          }))
  ```

In `crates/hennery-gateway/src/scope.rs`, replace:

  ```rust
          type Row = (String, String, String, String, bool, Option<String>, String);
          let row: Option<Row> = self
              .conn()
              .query_row(
                  "SELECT c.id, c.label, c.url, c.cred_kind, c.internal_network, c.tool_allowlist, c.status
  ```

with:

  ```rust
          type Row = (String, String, String, String, bool, Option<String>, String, bool);
          let row: Option<Row> = self
              .conn()
              .query_row(
                  "SELECT c.id, c.label, c.url, c.cred_kind, c.internal_network, c.tool_allowlist, c.status,
                          EXISTS (SELECT 1 FROM gw_credentials k WHERE k.connection_id = c.id AND k.owner_id = ?1)
  ```

In `crates/hennery-gateway/src/scope.rs`, replace:

  ```rust
                          r.get(6)?,
                      ))
  ```

with:

  ```rust
                          r.get(6)?,
                          r.get(7)?,
                      ))
  ```

In `crates/hennery-gateway/src/scope.rs`, replace:

  ```rust
          let Some((id, label, url, kind, internal_network, allowlist, status)) = row else {
  ```

with:

  ```rust
          let Some((id, label, url, kind, internal_network, allowlist, status, has_credential)) = row else {
  ```

In `crates/hennery-gateway/src/scope.rs`, replace:

  ```rust
              status,
          }))
  ```

with:

  ```rust
              status,
              has_credential,
          }))
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
  //! there (plan 8a decision 3): never the ciphertext, nor its version.

  use crate::crypto::{self, STATIC_TOKEN};
  use crate::key::MasterKey;
  use crate::model::{
      Change, ConnectionPatch, ConnectionRecord, CredKind, CredentialChange, DEFAULT_HEADER, DEFAULT_PREFIX,
      MAX_CONNECTIONS, MAX_HOST_ID, MAX_MOUNTS, NewConnection, StaticCredential, header_problem, label_problem,
      parse_url, prefix_problem, slug_problem, token_problem, tools,
  ```

with:

  ```rust
  //! there (plan 8a decision 3): never the ciphertext, nor its version. Of
  //! `gw_oauth_clients` it reads the client ids and whether a secret is
  //! stored, a column of its own, never a ciphertext (plan 8f).
  //!
  //! Every write of a credential or an OAuth client is in this file, on this
  //! one connection. A refresh's write is a compare-and-swap on the sealed
  //! blob it read (plan 8f decision 9), so a writer that cannot take the
  //! connection's refresh lock (a hat purge from the kernel's hook) cannot be
  //! overwritten by a late refresh either.

  use crate::crypto::{self, CLIENT_SECRET, OAUTH_TOKENS, PENDING_CLIENT_SECRET, STATIC_TOKEN};
  use crate::key::MasterKey;
  use crate::model::{
      AuthMethod, Change, ConnectionPatch, ConnectionRecord, CredKind, CredentialChange, DEFAULT_HEADER, DEFAULT_PREFIX,
      GrantTokens, MAX_CONNECTIONS, MAX_HOST_ID, MAX_MOUNTS, NewConnection, OauthClientView, OauthCredential, OauthError,
      StaticCredential, Status, StatusChange, TokenClient, client_id_problem, client_secret_problem, header_problem,
      label_problem, parse_url, prefix_problem, slug_problem, token_problem, tools,
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
  /// A connection's columns, then whether it has a credential: `?1` is the
  /// owner, `?2` one connection's id or `NULL` for all of them.
  const SELECT_CONNECTIONS: &str = "SELECT c.id, c.slug, c.label, c.url, c.hat_id, c.cred_kind, c.static_header,
              c.static_prefix, c.tool_allowlist, c.internal_network, c.status, c.status_note, c.account_label,
              c.status_at, c.created_at, c.updated_at,
              EXISTS (SELECT 1 FROM gw_credentials k WHERE k.connection_id = c.id AND k.owner_id = ?1)
       FROM gw_connections c
  ```

with:

  ```rust
  /// A connection's columns, then whether it has a credential, then its OAuth
  /// client's ids and whether each has a secret: `?1` is the owner, `?2` one
  /// connection's id or `NULL` for all of them.
  const SELECT_CONNECTIONS: &str = "SELECT c.id, c.slug, c.label, c.url, c.hat_id, c.cred_kind, c.static_header,
              c.static_prefix, c.tool_allowlist, c.internal_network, c.status, c.status_note, c.account_label,
              c.status_at, c.created_at, c.updated_at,
              EXISTS (SELECT 1 FROM gw_credentials k WHERE k.connection_id = c.id AND k.owner_id = ?1),
              c.checked_at, c.oauth_error_code, c.oauth_error_message, c.oauth_error_at, c.resource_mismatch,
              c.accepted_resource, o.client_id, o.has_client_secret, o.pending_client_id, o.pending_has_secret
       FROM gw_connections c
       LEFT JOIN gw_oauth_clients o ON o.connection_id = c.id AND o.owner_id = ?1
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
          }
          if !new.cred_kind.is_supported() {
              return Ok(Change::Unsupported(new.cred_kind));
  ```

with:

  ```rust
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
      /// another kind deletes the connection's credential first, in the same
      /// transaction, and its status starts over: the token was granted for
      /// the old upstream and the old kind (G-14).
  ```

with:

  ```rust
      /// another kind deletes the connection's credential and its OAuth
      /// client first, in the same transaction, and its status starts over:
      /// the token was granted for the old upstream and the old kind (G-14).
      /// Any change of the URL, a path's too, clears a `resource` found or
      /// accepted for the old one (api-8e-8f F1). The caller holds the
      /// connection's refresh lock (gateway spec §4.5).
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
          }
          if !kind.is_supported() {
              return Ok(Change::Unsupported(kind));
  ```

with:

  ```rust
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
                  "UPDATE gw_connections SET status = 'not_connected', status_note = NULL, account_label = NULL,
                                             status_at = ?3
                   WHERE id = ?1 AND owner_id = ?2",
                  params![id, self.owner, now],
  ```

with:

  ```rust
                  "DELETE FROM gw_oauth_clients WHERE connection_id = ?1 AND owner_id = ?2",
                  [id, &self.owner],
              )?;
              tx.execute(
                  "UPDATE gw_connections SET status = 'not_connected', status_note = NULL, account_label = NULL,
                                             status_at = ?3, oauth_error_code = NULL, oauth_error_message = NULL,
                                             oauth_error_at = NULL
                   WHERE id = ?1 AND owner_id = ?2",
                  params![id, self.owner, now],
              )?;
          }
          if url.as_str() != current.url {
              tx.execute(
                  "UPDATE gw_connections SET resource_mismatch = NULL, accepted_resource = NULL
                   WHERE id = ?1 AND owner_id = ?2",
                  [id, &self.owner],
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
      /// Delete a connection with its credential and mounts. False if there
      /// was none.
  ```

with:

  ```rust
      /// Delete a connection with its credential, OAuth client and mounts.
      /// False if there was none.
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
              "DELETE FROM gw_credentials WHERE connection_id = ?1 AND owner_id = ?2",
              [id, &self.owner],
  ```

with:

  ```rust
              "DELETE FROM gw_credentials WHERE connection_id = ?1 AND owner_id = ?2",
              [id, &self.owner],
          )?;
          tx.execute(
              "DELETE FROM gw_oauth_clients WHERE connection_id = ?1 AND owner_id = ?2",
              [id, &self.owner],
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust

      /// Whether any credential is stored: then a missing master key is an
  ```

with:

  ```rust

      /// An `oauth_client` connection's pre-registered client (gateway spec
      /// §4.2, api-8e-8f B2), replacing the one before. With a live grant it
      /// is saved as pending and replaces the grant's client only when a
      /// Connect with it completes (G-7); without one it is the client at
      /// once, its pins cleared (the review's R2: the next authorize pins it
      /// again). `Keep` keeps the stored secret only while `client_id` is
      /// that of the client this replaces (the pending one if any, else the
      /// active one): a secret never moves to another client. The caller
      /// holds the connection's refresh lock and drops its live flows.
      pub fn set_oauth_client(
          &self,
          id: &str,
          client_id: &str,
          secret: SecretInput,
          key: &MasterKey,
          now: i64,
      ) -> Result<ClientChange> {
          let mut conn = self.conn();
          let tx = conn.transaction()?;
          let kind: Option<String> = tx
              .query_row(
                  "SELECT cred_kind FROM gw_connections WHERE id = ?1 AND owner_id = ?2",
                  [id, &self.owner],
                  |r| r.get(0),
              )
              .optional()?;
          let Some(kind) = kind else {
              return Ok(ClientChange::NotFound);
          };
          let kind = CredKind::parse(&kind).ok_or_else(|| anyhow!("a stored credential kind"))?;
          if kind != CredKind::OauthClient {
              return Ok(ClientChange::WrongKind(kind));
          }
          if let Some(problem) = client_id_problem(client_id) {
              return Ok(ClientChange::Invalid(problem));
          }
          if let SecretInput::Set(secret) = &secret
              && let Some(problem) = client_secret_problem(secret)
          {
              return Ok(ClientChange::Invalid(problem));
          }
          let has_grant: bool = tx.query_row(
              "SELECT EXISTS (SELECT 1 FROM gw_credentials WHERE connection_id = ?1 AND owner_id = ?2)",
              [id, &self.owner],
              |r| r.get(0),
          )?;
          type Row = (String, Option<u32>, Option<Vec<u8>>, Option<String>, Option<Vec<u8>>);
          let stored: Option<Row> = tx
              .query_row(
                  "SELECT client_id, key_version, client_secret_ciphertext, pending_client_id, pending_secret_ciphertext
                   FROM gw_oauth_clients WHERE connection_id = ?1 AND owner_id = ?2",
                  [id, &self.owner],
                  |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
              )
              .optional()?;
          // The client this replaces, and its secret, opened.
          let replaced: Option<(String, Option<Zeroizing<String>>)> = match &stored {
              None => None,
              Some((_, version, _, Some(pending), pending_blob)) => Some((
                  pending.clone(),
                  open_secret(key, id, PENDING_CLIENT_SECRET, *version, pending_blob)?,
              )),
              Some((active, version, blob, None, _)) => {
                  Some((active.clone(), open_secret(key, id, CLIENT_SECRET, *version, blob)?))
              }
          };
          let secret: Option<Zeroizing<String>> = match secret {
              SecretInput::Set(secret) => Some(secret),
              SecretInput::Clear => None,
              SecretInput::Keep => match replaced {
                  Some((replaced_id, kept)) if replaced_id == client_id => kept,
                  _ => {
                      return Ok(ClientChange::Invalid(
                          "a new client_id needs client_secret: send the secret, or null for a public client".into(),
                      ));
                  }
              },
          };
          let has_secret = secret.is_some();
          if has_grant && stored.is_some() {
              let sealed = secret
                  .as_ref()
                  .map(|s| crypto::seal(key, id, PENDING_CLIENT_SECRET, s.as_bytes()));
              tx.execute(
                  "UPDATE gw_oauth_clients SET pending_client_id = ?3, pending_has_secret = ?4,
                       pending_secret_ciphertext = ?5, pending_issuer = NULL, pending_token_endpoint = NULL,
                       key_version = ?6
                   WHERE connection_id = ?1 AND owner_id = ?2",
                  params![id, self.owner, client_id, has_secret, sealed, key.version()],
              )?;
          } else {
              let sealed = secret
                  .as_ref()
                  .map(|s| crypto::seal(key, id, CLIENT_SECRET, s.as_bytes()));
              tx.execute(
                  "INSERT INTO gw_oauth_clients(connection_id, owner_id, client_id, has_client_secret,
                                                client_secret_ciphertext, key_version, registered_at)
                   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                   ON CONFLICT(connection_id) DO UPDATE SET client_id = excluded.client_id,
                       has_client_secret = excluded.has_client_secret,
                       client_secret_ciphertext = excluded.client_secret_ciphertext,
                       key_version = excluded.key_version, token_endpoint_auth_method = NULL, issuer = NULL,
                       authorization_endpoint = NULL, token_endpoint = NULL, redirect_uri = NULL, scopes = NULL,
                       resource = NULL, resource_param_accepted = 1, registered_at = excluded.registered_at,
                       pending_client_id = NULL, pending_has_secret = 0, pending_secret_ciphertext = NULL,
                       pending_issuer = NULL, pending_token_endpoint = NULL
                       WHERE gw_oauth_clients.owner_id = excluded.owner_id",
                  params![id, self.owner, client_id, has_secret, sealed, key.version(), now],
              )?;
          }
          let record = read(&tx, &self.owner, Some(id))?.pop();
          tx.commit()?;
          Ok(record.map_or(ClientChange::NotFound, |record| ClientChange::Done(Box::new(record))))
      }

      /// The connection's OAuth clients, their secrets opened, for an
      /// authorize (gateway spec §4.2): the one in use and a pending one, and
      /// whether a grant is live. `None`: no such connection.
      pub fn oauth_clients(&self, id: &str, key: &MasterKey) -> Result<Option<ClientSlots>> {
          let conn = self.conn();
          let has_grant: Option<bool> = conn
              .query_row(
                  "SELECT EXISTS (SELECT 1 FROM gw_credentials k WHERE k.connection_id = c.id AND k.owner_id = ?2)
                   FROM gw_connections c WHERE c.id = ?1 AND c.owner_id = ?2",
                  [id, &self.owner],
                  |r| r.get(0),
              )
              .optional()?;
          let Some(has_grant) = has_grant else {
              return Ok(None);
          };
          type Row = (
              String,
              Option<u32>,
              Option<Vec<u8>>,
              Option<String>,
              Option<String>,
              Option<String>,
              Option<String>,
              Option<String>,
              Option<Vec<u8>>,
              Option<String>,
              Option<String>,
          );
          let row: Option<Row> = conn
              .query_row(
                  "SELECT client_id, key_version, client_secret_ciphertext, token_endpoint_auth_method, issuer,
                          token_endpoint, redirect_uri, pending_client_id, pending_secret_ciphertext, pending_issuer,
                          pending_token_endpoint
                   FROM gw_oauth_clients WHERE connection_id = ?1 AND owner_id = ?2",
                  [id, &self.owner],
                  |r| {
                      Ok((
                          r.get(0)?,
                          r.get(1)?,
                          r.get(2)?,
                          r.get(3)?,
                          r.get(4)?,
                          r.get(5)?,
                          r.get(6)?,
                          r.get(7)?,
                          r.get(8)?,
                          r.get(9)?,
                          r.get(10)?,
                      ))
                  },
              )
              .optional()?;
          drop(conn);
          let Some((
              client_id,
              version,
              blob,
              method,
              issuer,
              token_endpoint,
              redirect_uri,
              pending_id,
              pending_blob,
              pending_issuer,
              pending_token_endpoint,
          )) = row
          else {
              return Ok(Some(ClientSlots {
                  active: None,
                  pending: None,
                  has_grant,
              }));
          };
          let active = ClientSlot {
              secret: open_secret(key, id, CLIENT_SECRET, version, &blob)?,
              client_id,
              auth_method: method.as_deref().and_then(AuthMethod::parse),
              issuer,
              token_endpoint,
              redirect_uri,
          };
          let pending = match pending_id {
              Some(client_id) => Some(ClientSlot {
                  secret: open_secret(key, id, PENDING_CLIENT_SECRET, version, &pending_blob)?,
                  client_id,
                  auth_method: None,
                  issuer: pending_issuer,
                  token_endpoint: pending_token_endpoint,
                  redirect_uri: None,
              }),
              None => None,
          };
          Ok(Some(ClientSlots {
              active: Some(active),
              pending,
              has_grant,
          }))
      }

      /// Pin a pre-registered client to the authorization server its first
      /// authorize found (the review's R2): its secret only ever goes to that
      /// token endpoint. Only while `client_id` is still that slot's client.
      pub fn pin_client(
          &self,
          id: &str,
          slot: Slot,
          client_id: &str,
          issuer: &str,
          token_endpoint: &str,
      ) -> Result<bool> {
          let sql = match slot {
              Slot::Active => {
                  "UPDATE gw_oauth_clients SET issuer = ?4, token_endpoint = ?5
                   WHERE connection_id = ?1 AND owner_id = ?2 AND client_id = ?3 AND issuer IS NULL"
              }
              Slot::Pending => {
                  "UPDATE gw_oauth_clients SET pending_issuer = ?4, pending_token_endpoint = ?5
                   WHERE connection_id = ?1 AND owner_id = ?2 AND pending_client_id = ?3 AND pending_issuer IS NULL"
              }
          };
          Ok(self
              .conn()
              .execute(sql, params![id, self.owner, client_id, issuer, token_endpoint])?
              == 1)
      }

      /// An OAuth connection's grant with where it goes and how it is
      /// refreshed, all read in one statement (`OauthCredential`); `None`
      /// without one. An error if it does not open.
      pub fn oauth_credential(&self, id: &str, key: &MasterKey) -> Result<Option<OauthCredential>> {
          type Row = (
              (u32, Vec<u8>, Option<i64>, String, String, bool),
              (String, Option<u32>, Option<Vec<u8>>, Option<String>, Option<String>),
              (Option<String>, Option<String>, bool),
          );
          let row: Option<Row> = self
              .conn()
              .query_row(
                  "SELECT k.key_version, k.ciphertext, k.expires_at, c.cred_kind, c.url, c.internal_network,
                          o.client_id, o.key_version, o.client_secret_ciphertext, o.token_endpoint_auth_method,
                          o.token_endpoint, o.scopes, o.resource, o.resource_param_accepted
                   FROM gw_credentials k
                   JOIN gw_connections c ON c.id = k.connection_id AND c.owner_id = k.owner_id
                   JOIN gw_oauth_clients o ON o.connection_id = k.connection_id AND o.owner_id = k.owner_id
                   WHERE k.connection_id = ?1 AND k.owner_id = ?2",
                  [id, &self.owner],
                  |r| {
                      Ok((
                          (r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?),
                          (r.get(6)?, r.get(7)?, r.get(8)?, r.get(9)?, r.get(10)?),
                          (r.get(11)?, r.get(12)?, r.get(13)?),
                      ))
                  },
              )
              .optional()?;
          let Some((
              (version, sealed, expires_at, kind, url, internal_network),
              (client_id, secret_version, secret_blob, method, token_endpoint),
              (scopes, resource, resource_param_accepted),
          )) = row
          else {
              return Ok(None);
          };
          let cred_kind = CredKind::parse(&kind).ok_or_else(|| anyhow!("a stored credential kind"))?;
          if !cred_kind.is_oauth() {
              return Ok(None);
          }
          let opened =
              crypto::open(key, id, OAUTH_TOKENS, version, &sealed).with_context(|| format!("connection {id}"))?;
          let tokens = GrantTokens::from_opened(&opened).ok_or_else(|| anyhow!("connection {id}: not a grant"))?;
          Ok(Some(OauthCredential {
              tokens,
              expires_at,
              url,
              internal_network,
              cred_kind,
              client: TokenClient {
                  secret: open_secret(key, id, CLIENT_SECRET, secret_version, &secret_blob)?,
                  client_id,
                  auth_method: method
                      .as_deref()
                      .and_then(AuthMethod::parse)
                      .ok_or_else(|| anyhow!("connection {id}: a grant without its client's method"))?,
                  token_endpoint: token_endpoint
                      .ok_or_else(|| anyhow!("connection {id}: a grant without a token endpoint"))?,
              },
              scopes: scopes
                  .map(|json| serde_json::from_str(&json))
                  .transpose()
                  .context("stored scopes")?
                  .unwrap_or_default(),
              resource,
              resource_param_accepted,
              sealed,
          }))
      }

      /// Store what a refresh gave (gateway spec §4.4, §4.5): only while the
      /// credential is still the very blob `read` holds, else nothing (false).
      /// Every write of a credential seals it with a fresh nonce, so a grant
      /// deleted (another origin or kind, a delete, a purge) or replaced (a
      /// completed Connect) meanwhile never matches; a path-only edit, which
      /// keeps the grant (§4.6), does, and keeps the rotated token. A
      /// response without a refresh token keeps the old one (the caller
      /// passes it on).
      pub fn store_refreshed(
          &self,
          id: &str,
          read: &OauthCredential,
          refreshed: &RefreshedGrant<'_>,
          key: &MasterKey,
          now: i64,
      ) -> Result<bool> {
          let RefreshedGrant {
              tokens,
              expires_at,
              resource_param_accepted,
          } = *refreshed;
          let sealed = crypto::seal(key, id, OAUTH_TOKENS, &tokens.to_sealable());
          let mut conn = self.conn();
          let tx = conn.transaction()?;
          let changed = tx.execute(
              "UPDATE gw_credentials SET key_version = ?3, ciphertext = ?4, expires_at = ?5, updated_at = ?6
               WHERE connection_id = ?1 AND owner_id = ?2 AND ciphertext = ?7",
              params![id, self.owner, key.version(), sealed, expires_at, now, read.sealed],
          )?;
          if changed == 1 && resource_param_accepted != read.resource_param_accepted {
              tx.execute(
                  "UPDATE gw_oauth_clients SET resource_param_accepted = ?3 WHERE connection_id = ?1 AND owner_id = ?2",
                  params![id, self.owner, resource_param_accepted],
              )?;
          }
          tx.commit()?;
          Ok(changed == 1)
      }

      /// Store a completed Connect's grant with the client and authorization
      /// server it was made with (gateway spec §4.3; api-8e-8f B5 step 8),
      /// under the connection's refresh lock, which the caller holds: only if
      /// the connection is still what the flow started from (its URL, kind,
      /// internal marking, and for a pre-registered client the same client),
      /// else nothing (the review's R1). A pending client becomes the client
      /// (G-7). The status is `ok` as of `now`, `status_at` too even when it
      /// was `ok` already (the UI waits for a newer one), and the latest
      /// Connect's failure is cleared.
      pub fn store_grant(&self, grant: &GrantToStore<'_>, key: &MasterKey, now: i64) -> Result<GrantStored> {
          let id = grant.connection_id;
          let mut conn = self.conn();
          let tx = conn.transaction()?;
          type Row = (String, String, bool, String, String, String);
          let current: Option<Row> = tx
              .query_row(
                  "SELECT url, cred_kind, internal_network, status, label, hat_id FROM gw_connections
                   WHERE id = ?1 AND owner_id = ?2",
                  [id, &self.owner],
                  |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?)),
              )
              .optional()?;
          let Some((url, kind, internal_network, status, label, hat_id)) = current else {
              return Ok(GrantStored::ConnectionChanged);
          };
          if url != grant.url || kind != grant.cred_kind.as_str() || internal_network != grant.internal_network {
              return Ok(GrantStored::ConnectionChanged);
          }
          let clients: Option<(String, Option<String>)> = tx
              .query_row(
                  "SELECT client_id, pending_client_id FROM gw_oauth_clients WHERE connection_id = ?1 AND owner_id = ?2",
                  [id, &self.owner],
                  |r| Ok((r.get(0)?, r.get(1)?)),
              )
              .optional()?;
          let same_client = match grant.source {
              ClientSource::Registered => true,
              ClientSource::Active => {
                  matches!(&clients, Some((active, None)) if *active == grant.client.client_id)
              }
              ClientSource::Pending => {
                  matches!(&clients, Some((_, Some(pending))) if *pending == grant.client.client_id)
              }
          };
          if !same_client {
              return Ok(GrantStored::ConnectionChanged);
          }
          let secret = grant
              .client
              .secret
              .as_ref()
              .map(|s| crypto::seal(key, id, CLIENT_SECRET, s.as_bytes()));
          tx.execute(
              "INSERT INTO gw_oauth_clients(connection_id, owner_id, client_id, has_client_secret, client_secret_ciphertext,
                                            key_version, token_endpoint_auth_method, issuer, authorization_endpoint,
                                            token_endpoint, redirect_uri, scopes, resource, resource_param_accepted,
                                            registered_at)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
               ON CONFLICT(connection_id) DO UPDATE SET client_id = excluded.client_id,
                   has_client_secret = excluded.has_client_secret,
                   client_secret_ciphertext = excluded.client_secret_ciphertext, key_version = excluded.key_version,
                   token_endpoint_auth_method = excluded.token_endpoint_auth_method, issuer = excluded.issuer,
                   authorization_endpoint = excluded.authorization_endpoint, token_endpoint = excluded.token_endpoint,
                   redirect_uri = excluded.redirect_uri, scopes = excluded.scopes, resource = excluded.resource,
                   resource_param_accepted = excluded.resource_param_accepted, registered_at = excluded.registered_at,
                   pending_client_id = NULL, pending_has_secret = 0, pending_secret_ciphertext = NULL,
                   pending_issuer = NULL, pending_token_endpoint = NULL
                   WHERE gw_oauth_clients.owner_id = excluded.owner_id",
              params![
                  id,
                  self.owner,
                  grant.client.client_id,
                  grant.client.secret.is_some(),
                  secret,
                  key.version(),
                  grant.client.auth_method.as_str(),
                  grant.issuer,
                  grant.authorization_endpoint,
                  grant.client.token_endpoint,
                  grant.redirect_uri,
                  serde_json::to_string(grant.scopes)?,
                  grant.resource,
                  grant.resource_param_accepted,
                  grant.registered_at,
              ],
          )?;
          let sealed = crypto::seal(key, id, OAUTH_TOKENS, &grant.tokens.to_sealable());
          tx.execute(
              "INSERT INTO gw_credentials(connection_id, owner_id, key_version, ciphertext, expires_at, updated_at)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6)
               ON CONFLICT(connection_id) DO UPDATE SET key_version = excluded.key_version,
                   ciphertext = excluded.ciphertext, expires_at = excluded.expires_at, updated_at = excluded.updated_at
                   WHERE gw_credentials.owner_id = excluded.owner_id",
              params![id, self.owner, key.version(), sealed, grant.expires_at, now],
          )?;
          tx.execute(
              "UPDATE gw_connections SET status = 'ok', status_note = NULL, account_label = NULL, status_at = ?3,
                                         checked_at = ?3, oauth_error_code = NULL, oauth_error_message = NULL,
                                         oauth_error_at = NULL, resource_mismatch = NULL
               WHERE id = ?1 AND owner_id = ?2",
              params![id, self.owner, now],
          )?;
          tx.commit()?;
          let from = Status::parse(&status).ok_or_else(|| anyhow!("a stored status"))?;
          Ok(GrantStored::Stored(StatusChange {
              connection_id: id.to_string(),
              hat_id,
              label,
              from,
              to: Status::Ok,
          }))
      }

      /// Why the latest Connect of `id` did not complete (api-8e-8f B3, B5);
      /// `None` clears it. The status is not touched: a failed reconnect of a
      /// working grant leaves it `ok`.
      pub fn set_oauth_error(&self, id: &str, error: Option<(&str, &str)>, now: i64) -> Result<()> {
          let (code, message) = error.unzip();
          self.conn().execute(
              "UPDATE gw_connections SET oauth_error_code = ?3, oauth_error_message = ?4,
                                         oauth_error_at = CASE WHEN ?3 IS NULL THEN NULL ELSE ?5 END
               WHERE id = ?1 AND owner_id = ?2",
              params![id, self.owner, code, message, now],
          )?;
          Ok(())
      }

      /// The `resource` the latest authorize found that is not `url`, or
      /// `None` when it matched (gateway spec §4.1, G-4). Only while the
      /// connection still has `url`.
      pub fn set_resource_mismatch(&self, id: &str, url: &str, found: Option<&str>) -> Result<()> {
          self.conn().execute(
              "UPDATE gw_connections SET resource_mismatch = ?4 WHERE id = ?1 AND owner_id = ?2 AND url = ?3",
              params![id, self.owner, url, found],
          )?;
          Ok(())
      }

      /// The operator accepted `resource` for the connection at `url`
      /// (api-8e-8f F3): kept until the URL changes.
      pub fn accept_resource(&self, id: &str, url: &str, resource: &str) -> Result<bool> {
          Ok(self.conn().execute(
              "UPDATE gw_connections SET accepted_resource = ?4, resource_mismatch = NULL
               WHERE id = ?1 AND owner_id = ?2 AND url = ?3",
              params![id, self.owner, url, resource],
          )? == 1)
      }

      /// Whether any credential is stored: then a missing master key is an
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
                   OR EXISTS (SELECT 1 FROM gw_stdio_servers WHERE owner_id = ?1 AND env_ciphertext IS NOT NULL)",
  ```

with:

  ```rust
                   OR EXISTS (SELECT 1 FROM gw_stdio_servers WHERE owner_id = ?1 AND env_ciphertext IS NOT NULL)
                   OR EXISTS (SELECT 1 FROM gw_oauth_clients WHERE owner_id = ?1
                                  AND (client_secret_ciphertext IS NOT NULL OR pending_secret_ciphertext IS NOT NULL))",
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
          let row: Option<(String, u32, Vec<u8>, String)> = self
              .conn()
  ```

with:

  ```rust
          let conn = self.conn();
          let row: Option<(String, u32, Vec<u8>, String)> = conn
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
          if let Some((id, version, blob, kind)) = row {
              anyhow::ensure!(
                  kind == CredKind::Static.as_str(),
                  "connection {id} has a credential of kind {kind}"
              );
              crypto::open(key, &id, STATIC_TOKEN, version, &blob)
                  .map(drop)
                  .with_context(|| {
                      format!(
                          "the master key does not open the stored credential of connection {id}: restore the key it \
                           was sealed with. {}",
                          crate::key::GIVE_UP
                      )
                  })?;
  ```

with:

  ```rust
          // And the newest client secret: a key that opens no grant may still
          // be asked to open one (plan 8f).
          let secret: Option<(String, u32, Vec<u8>)> = conn
              .query_row(
                  "SELECT connection_id, key_version, client_secret_ciphertext FROM gw_oauth_clients
                   WHERE owner_id = ?1 AND client_secret_ciphertext IS NOT NULL
                   ORDER BY registered_at DESC, connection_id LIMIT 1",
                  [&self.owner],
                  |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
              )
              .optional()?;
          drop(conn);
          let refused = |id: &str| {
              format!(
                  "the master key does not open the stored credential of connection {id}: restore the key it was \
                   sealed with. {}",
                  crate::key::GIVE_UP
              )
          };
          if let Some((id, version, blob, kind)) = row {
              let kind =
                  CredKind::parse(&kind).ok_or_else(|| anyhow!("connection {id} has a credential of kind {kind}"))?;
              anyhow::ensure!(kind != CredKind::None, "connection {id} has a credential of kind none");
              crypto::open(key, &id, crypto::credential_field(kind), version, &blob)
                  .map(drop)
                  .with_context(|| refused(&id))?;
          }
          if let Some((id, version, blob)) = secret {
              crypto::open(key, &id, CLIENT_SECRET, version, &blob)
                  .map(drop)
                  .with_context(|| refused(&id))?;
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
          let Some((id, host_id, hat_id, version, blob)) = row else {
              return Ok(());
          };
          crypto::open_stdio(key, &id, &host_id, &hat_id, version, &blob)
  ```

with:

  ```rust
          if let Some((id, host_id, hat_id, version, blob)) = row {
              crypto::open_stdio(key, &id, &host_id, &hat_id, version, &blob)
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
              })
  ```

with:

  ```rust
              })?;
          }
          Ok(())
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
      /// its stdio servers (plan 8e), and its connections with their
  ```

with:

  ```rust
      /// its stdio servers (plan 8e), and its connections with their OAuth clients,
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
          tx.execute(
              "DELETE FROM gw_mounts WHERE owner_id = ?2
  ```

with:

  ```rust
          tx.execute(
              "DELETE FROM gw_oauth_clients WHERE owner_id = ?2
                   AND connection_id IN (SELECT id FROM gw_connections WHERE hat_id = ?1 AND owner_id = ?2)",
              [hat_id, &self.owner],
          )?;
          tx.execute(
              "DELETE FROM gw_mounts WHERE owner_id = ?2
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
          Ok(cut)
      }
  ```

with:

  ```rust
          Ok(cut)
      }
  }

  /// What a `PUT …/oauth-client` does with the secret (api-8e-8f B2).
  pub enum SecretInput {
      /// Absent: keep the stored one, for the same client id only.
      Keep,
      /// `null`: a public client.
      Clear,
      /// A string: this one.
      Set(Zeroizing<String>),
  }

  /// The outcome of setting a pre-registered client.
  #[derive(Debug, Clone, PartialEq, Eq)]
  pub enum ClientChange {
      Done(Box<ConnectionRecord>),
      NotFound,
      /// The connection is not `oauth_client`.
      WrongKind(CredKind),
      Invalid(String),
  }

  /// Which of a connection's two client places.
  #[derive(Debug, Clone, Copy, PartialEq, Eq)]
  pub enum Slot {
      /// The client the grant was made with, or the next Connect's when there
      /// is no grant.
      Active,
      /// A pre-registered client saved while a grant is live (G-7).
      Pending,
  }

  /// One client, its secret opened. Its `Debug` never shows the secret.
  #[derive(Clone)]
  pub struct ClientSlot {
      pub client_id: String,
      pub secret: Option<Zeroizing<String>>,
      /// `None` until a Connect with it completes.
      pub auth_method: Option<AuthMethod>,
      /// The authorization server it is pinned to (the review's R2); `None`
      /// until its first authorize.
      pub issuer: Option<String>,
      pub token_endpoint: Option<String>,
      /// The redirect URI it was registered or used with.
      pub redirect_uri: Option<String>,
  }

  impl std::fmt::Debug for ClientSlot {
      fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
          f.debug_struct("ClientSlot")
              .field("client_id", &self.client_id)
              .field("secret", &self.secret.as_ref().map(|_| "<redacted>"))
              .field("auth_method", &self.auth_method)
              .field("issuer", &self.issuer.as_deref().map(crate::model::url_for_logs))
              .finish_non_exhaustive()
      }
  }

  /// A connection's OAuth clients, for an authorize.
  #[derive(Debug, Clone)]
  pub struct ClientSlots {
      pub active: Option<ClientSlot>,
      pub pending: Option<ClientSlot>,
      /// A grant is stored (live, even when `needs_auth`: G-7).
      pub has_grant: bool,
  }

  /// Where a flow's client came from (api-8e-8f S3): the callback stores the
  /// grant only if that place still holds it.
  #[derive(Debug, Clone, Copy, PartialEq, Eq)]
  pub enum ClientSource {
      Active,
      Pending,
      /// Registered dynamically by the authorize (`oauth_dcr`), held by the
      /// flow until the callback stores it with the grant.
      Registered,
  }

  /// A completed Connect, to be stored (`GatewayStore::store_grant`).
  pub struct GrantToStore<'a> {
      pub connection_id: &'a str,
      /// What the connection was when the flow started (the review's R1).
      pub url: &'a str,
      pub cred_kind: CredKind,
      pub internal_network: bool,
      pub source: ClientSource,
      pub client: &'a TokenClient,
      pub issuer: &'a str,
      pub authorization_endpoint: &'a str,
      pub redirect_uri: &'a str,
      pub scopes: &'a [String],
      pub resource: &'a str,
      pub resource_param_accepted: bool,
      pub registered_at: i64,
      pub tokens: &'a GrantTokens,
      pub expires_at: Option<i64>,
  }

  /// What a refresh gave, to be stored (`GatewayStore::store_refreshed`).
  #[derive(Clone, Copy)]
  pub struct RefreshedGrant<'a> {
      pub tokens: &'a GrantTokens,
      pub expires_at: Option<i64>,
      /// Whether the token endpoint took `resource` this time.
      pub resource_param_accepted: bool,
  }

  /// The outcome of storing a grant.
  #[derive(Debug, Clone, PartialEq, Eq)]
  pub enum GrantStored {
      /// Stored; the status moved from what it was to `ok`.
      Stored(StatusChange),
      /// The connection was edited, deleted or given another client since
      /// the flow started: nothing was stored.
      ConnectionChanged,
  }

  /// A secret column opened under `field`; `None` when there is none.
  fn open_secret(
      key: &MasterKey,
      id: &str,
      field: &str,
      version: Option<u32>,
      blob: &Option<Vec<u8>>,
  ) -> Result<Option<Zeroizing<String>>> {
      let Some(blob) = blob else {
          return Ok(None);
      };
      let version = version.ok_or_else(|| anyhow!("connection {id}: a secret without its key version"))?;
      let mut opened = crypto::open(key, id, field, version, blob).with_context(|| format!("connection {id}"))?;
      match String::from_utf8(std::mem::take(&mut *opened)) {
          Ok(secret) => Ok(Some(Zeroizing::new(secret))),
          Err(err) => {
              drop(Zeroizing::new(err.into_bytes()));
              Err(anyhow!("connection {id}: not a secret"))
          }
      }
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
              },
              r.get::<_, String>(5)?,
              r.get::<_, Option<String>>(8)?,
  ```

with:

  ```rust
                  checked_at: r.get(17)?,
                  oauth_client: None,
                  oauth_error: match (r.get::<_, Option<String>>(18)?, r.get(19)?, r.get(20)?) {
                      (Some(code), Some(message), Some(at)) => Some(OauthError { code, message, at }),
                      _ => None,
                  },
                  resource_mismatch: r.get(21)?,
                  accepted_resource: r.get(22)?,
              },
              r.get::<_, String>(5)?,
              r.get::<_, Option<String>>(8)?,
              (
                  r.get::<_, Option<String>>(23)?,
                  r.get::<_, Option<bool>>(24)?,
                  r.get::<_, Option<String>>(25)?,
                  r.get::<_, Option<bool>>(26)?,
              ),
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
          let (mut record, kind, allowlist) = row?;
  ```

with:

  ```rust
          let (mut record, kind, allowlist, client) = row?;
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
              .context("a stored tool allowlist")?;
          out.push(record);
  ```

with:

  ```rust
              .context("a stored tool allowlist")?;
          if record.cred_kind.is_oauth() {
              let (client_id, has_secret, pending, pending_secret) = client;
              record.oauth_client = Some(OauthClientView {
                  has_client_secret: client_id.is_some() && has_secret.unwrap_or(false),
                  client_id,
                  pending: pending.map(|id| (id, pending_secret.unwrap_or(false))),
              });
          }
          out.push(record);
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
          assert_eq!(credentials, expected);
      }
  }
  ```

with:

  ```rust
          assert_eq!(credentials, expected);
      }

      /// Plan 8f: what the list reads of `gw_oauth_clients` is the clients'
      /// ids and whether each has a secret, never a ciphertext.
      #[test]
      fn listing_connections_reads_no_client_secret() {
          let store = GatewayStore::open_in_memory().unwrap();
          let conn = store.conn();
          let clients: BTreeSet<String> = reads(&conn, SELECT_CONNECTIONS)
              .into_iter()
              .filter(|(table, _)| table == "gw_oauth_clients")
              .map(|(_, column)| column)
              .collect();
          let expected: BTreeSet<String> = [
              "client_id",
              "connection_id",
              "has_client_secret",
              "owner_id",
              "pending_client_id",
              "pending_has_secret",
          ]
          .map(String::from)
          .into();
          assert_eq!(clients, expected);
      }
  }
  ```

- [ ] **Step 4: Run the checks**

   Run the five checks:

   ```sh
   nix develop -c cargo fmt --all --check
   nix develop -c cargo clippy --workspace --all-targets --locked -- -D warnings
   nix develop -c cargo clippy -p hennery --locked -- -D warnings
   nix develop -c cargo test --workspace --locked
   nix develop -c cargo run -p hennery-proto --bin gen --locked -- --check
   ```

   Phase B targeted tests: exit 0, 43 passed. See Execution status for the final full gate and task-specific supplementary checks.

- [ ] **Step 5: Commit**

   ```sh
   git add -A && git -c commit.gpgsign=false commit -m "feat(gateway): the OAuth tables; grants and client secrets sealed under their own fields; status writes report their changes"
   ```

### Task 4: The OAuth client and the flows in flight

**Files:** Create `crates/hennery-gateway/src/oauth.rs`, `src/flows.rs` (their unit tests first); modify `src/jsonrpc.rs`, `src/lib.rs`.

- [ ] **Step 1: Write the failing tests**

Create `crates/hennery-gateway/src/flows.rs`:

  ```rust
  #[cfg(test)]
  mod tests {
      use super::*;

      fn snapshot(connection_id: &str) -> Snapshot {
          Snapshot {
              connection_id: connection_id.into(),
              url: "https://mcp.example/mcp".into(),
              cred_kind: CredKind::OauthDcr,
              internal_network: false,
              source: ClientSource::Registered,
              client: registered_client("c".into(), None, AuthMethod::None, "https://as.example/token".into()),
              issuer: "https://as.example".into(),
              authorization_endpoint: "https://as.example/authorize".into(),
              iss_parameter: false,
              redirect_uri: "https://h.example/api/mcp/oauth/callback".into(),
              scopes: Vec::new(),
              resource: "https://mcp.example/mcp".into(),
              resource_param: true,
              verifier: Zeroizing::new("v".into()),
              registered_at: 0,
              auth_session: "s".into(),
          }
      }

      #[test]
      fn a_flow_is_single_use_and_needs_its_cookie() {
          let flows = Flows::default();
          let started = flows.start(snapshot("conn-a"), 100).unwrap();
          assert!(matches!(
              flows.take(&started.state, &["wrong", started.cookie.as_str()], 101),
              Taken::Taken(_)
          ));
          assert!(matches!(
              flows.take(&started.state, &[started.cookie.as_str()], 101),
              Taken::Unknown
          ));
          let other = flows.start(snapshot("conn-a"), 100).unwrap();
          // A cookie of the right length, not the flow's.
          let wrong = "0".repeat(other.cookie.len());
          assert!(matches!(
              flows.take(&other.state, &[wrong.as_str()], 101),
              Taken::Mismatch(_)
          ));
          // Consumed by the mismatch: the right cookie is too late.
          assert!(matches!(
              flows.take(&other.state, &[other.cookie.as_str()], 101),
              Taken::Unknown
          ));
      }

      #[test]
      fn a_flow_expires_and_a_new_one_supersedes_it() {
          let flows = Flows::default();
          let first = flows.start(snapshot("conn-a"), 100).unwrap();
          assert_eq!(first.expires_at, 100 + FLOW_TTL);
          assert!(matches!(
              flows.take(&first.state, &[first.cookie.as_str()], 100 + FLOW_TTL),
              Taken::Unknown
          ));
          let first = flows.start(snapshot("conn-a"), 100).unwrap();
          let second = flows.start(snapshot("conn-a"), 100).unwrap();
          assert!(matches!(
              flows.take(&first.state, &[first.cookie.as_str()], 101),
              Taken::Unknown
          ));
          assert!(matches!(
              flows.take(&second.state, &[second.cookie.as_str()], 100 + FLOW_TTL - 1),
              Taken::Taken(_)
          ));
      }

      #[test]
      fn at_most_sixteen_flows_live_and_an_edit_drops_its_connection_s() {
          let flows = Flows::default();
          let started: Vec<Started> = (0..MAX_FLOWS)
              .map(|i| flows.start(snapshot(&format!("conn-{i}")), 100).unwrap())
              .collect();
          assert!(flows.start(snapshot("conn-x"), 100).is_none());
          assert_eq!(flows.live("conn-0", 100), MAX_FLOWS - 1);
          flows.drop_connection("conn-0");
          assert!(matches!(
              flows.take(&started[0].state, &[started[0].cookie.as_str()], 100),
              Taken::Unknown
          ));
          assert!(flows.start(snapshot("conn-x"), 100).is_some());
      }

      /// api-8e-8f S3: a held registration is reused only for the same token
      /// endpoint and redirect URI.
      #[test]
      fn a_registration_is_reused_only_for_the_same_endpoint_and_redirect() {
          let flows = Flows::default();
          let client = registered_client("c".into(), None, AuthMethod::None, "https://as.example/token".into());
          flows.hold_registration(
              "conn-a",
              Registration {
                  client,
                  redirect_uri: "https://h.example/cb".into(),
                  registered_at: 1,
              },
          );
          assert!(
              flows
                  .registration("conn-a", "https://as.example/token", "https://h.example/cb")
                  .is_some()
          );
          assert!(
              flows
                  .registration("conn-a", "https://as.example/other", "https://h.example/cb")
                  .is_none()
          );
          assert!(
              flows
                  .registration("conn-a", "https://as.example/token", "https://h2.example/cb")
                  .is_none()
          );
          assert!(
              flows
                  .registration("conn-b", "https://as.example/token", "https://h.example/cb")
                  .is_none()
          );
          flows.drop_connection("conn-a");
          assert!(
              flows
                  .registration("conn-a", "https://as.example/token", "https://h.example/cb")
                  .is_none()
          );
      }

      /// An edit forgets that the server refused `resource` (the review's
      /// R1): the next Connect sends it again.
      #[test]
      fn dropping_a_connection_forgets_its_refused_resource() {
          let flows = Flows::default();
          flows.refuse_resource("conn-a", "https://mcp.example/mcp");
          flows.refuse_resource("conn-b", "https://mcp.example/mcp");
          flows.drop_connection("conn-a");
          assert!(!flows.resource_refused("conn-a", "https://mcp.example/mcp"));
          assert!(flows.resource_refused("conn-b", "https://mcp.example/mcp"));
      }

      /// An expired flow does not count toward `MAX_FLOWS`.
      #[test]
      fn expired_flows_are_not_live() {
          let flows = Flows::default();
          for i in 0..3 {
              flows.start(snapshot(&format!("conn-{i}")), 100).unwrap();
          }
          assert_eq!(flows.live("none", 100 + FLOW_TTL - 1), 3);
          assert_eq!(flows.live("none", 100 + FLOW_TTL), 0);
      }

      #[test]
      fn a_cookie_s_name_comes_from_its_state() {
          let name = cookie_name("abc");
          assert_eq!(name.len(), FLOW_COOKIE_PREFIX.len() + 16);
          assert_ne!(name, cookie_name("abd"));
      }
  }
  ```

In `crates/hennery-gateway/src/lib.rs`, replace:

  ```rust
  mod jsonrpc;
  pub mod key;
  pub mod model;
  ```

with:

  ```rust
  pub mod flows;
  mod jsonrpc;
  pub mod key;
  pub mod model;
  pub mod oauth;
  ```

Create `crates/hennery-gateway/src/oauth.rs`:

  ```rust
  #[cfg(test)]
  mod tests {
      use super::*;

      fn url(text: &str) -> Url {
          Url::parse(text).unwrap()
      }

      /// Gateway spec §4.1: RFC 8414 inserted before appended, then OpenID
      /// configuration.
      #[test]
      fn server_metadata_is_tried_inserted_then_appended_then_openid() {
          let found: Vec<String> = server_metadata_urls(&url("https://as.example/tenant/"))
              .iter()
              .map(|u| u.to_string())
              .collect();
          assert_eq!(
              found,
              [
                  "https://as.example/.well-known/oauth-authorization-server/tenant",
                  "https://as.example/tenant/.well-known/oauth-authorization-server",
                  "https://as.example/tenant/.well-known/openid-configuration",
                  "https://as.example/.well-known/openid-configuration/tenant",
              ]
          );
          let root: Vec<String> = server_metadata_urls(&url("https://as.example"))
              .iter()
              .map(|u| u.to_string())
              .collect();
          assert_eq!(
              root,
              [
                  "https://as.example/.well-known/oauth-authorization-server",
                  "https://as.example/.well-known/openid-configuration",
              ]
          );
      }

      #[test]
      fn the_resource_document_is_tried_path_inserted_then_at_the_origin() {
          let found: Vec<String> = resource_metadata_urls(&url("https://mcp.example/v1/mcp?x=1"))
              .iter()
              .map(|u| u.to_string())
              .collect();
          assert_eq!(
              found,
              [
                  "https://mcp.example/.well-known/oauth-protected-resource/v1/mcp",
                  "https://mcp.example/.well-known/oauth-protected-resource",
              ]
          );
      }

      #[test]
      fn a_challenge_s_resource_metadata_is_read_quoted_or_not() {
          for (challenge, expected) in [
              (
                  r#"Bearer realm="x", resource_metadata="https://m.example/.well-known/oauth-protected-resource""#,
                  Some("https://m.example/.well-known/oauth-protected-resource"),
              ),
              (
                  "Bearer resource_metadata=https://m.example/prm, error=\"invalid_token\"",
                  Some("https://m.example/prm"),
              ),
              (
                  r#"Bearer RESOURCE_METADATA="https://m.example/a\"b""#,
                  Some("https://m.example/a\"b"),
              ),
              (r#"Bearer xresource_metadata="https://evil.example""#, None),
              ("Bearer realm=\"x\"", None),
          ] {
              assert_eq!(param_resource_metadata(challenge).as_deref(), expected, "{challenge}");
          }
      }

      #[test]
      fn the_s256_challenge_is_rfc_7636_s() {
          // RFC 7636 appendix B.
          assert_eq!(
              challenge_for("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
              "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
          );
          assert_eq!(verifier().len(), 43);
      }

      #[test]
      fn expiry_keeps_a_60_second_margin_and_unknown_stays_unknown() {
          assert_eq!(expires_at(1000, Some(3600)), Some(1000 + 3540));
          assert_eq!(expires_at(1000, Some(10)), Some(1000));
          assert_eq!(expires_at(1000, None), None);
      }

      #[test]
      fn a_secret_client_uses_basic_unless_only_post_is_offered() {
          assert_eq!(auth_method_for(false, &[]), AuthMethod::None);
          assert_eq!(auth_method_for(true, &[]), AuthMethod::Basic);
          assert_eq!(auth_method_for(true, &["client_secret_post".into()]), AuthMethod::Post);
          assert_eq!(
              auth_method_for(true, &["client_secret_post".into(), "client_secret_basic".into()]),
              AuthMethod::Basic
          );
      }

      /// O13: a token endpoint the policy refuses, or one at plain `http` to
      /// a name, is refused before anything is sent; neither is a vendor's
      /// refusal.
      #[tokio::test]
      async fn a_refused_token_endpoint_is_egress_refused() {
          let egress = hennery_kernel::egress::Egress::new(hennery_kernel::egress::Timeouts::DEFAULT).unwrap();
          let public = egress.client(hennery_kernel::egress::Allowance::PublicOnly);
          let internal = egress.client(hennery_kernel::egress::Allowance::InternalNetwork);
          let grant = Grant::Refresh {
              refresh_token: "r",
              scopes: &[],
          };
          for (client, endpoint) in [
              (&public, "https://127.0.0.1:1/token"),
              (&internal, "http://10.0.0.1/token"),
              (&internal, "http://as.example/token"),
          ] {
              let token_client = TokenClient {
                  client_id: "c".into(),
                  secret: None,
                  auth_method: AuthMethod::None,
                  token_endpoint: endpoint.into(),
              };
              let err = token(client, &token_client, &grant, None).await.unwrap_err();
              assert!(matches!(err, TokenError::EgressRefused(_)), "{endpoint}: {err:?}");
              assert!(!err.message().contains("/token"), "origins only: {}", err.message());
          }
      }

      /// O13: a registration endpoint that is not `https` (or loopback
      /// `http`) is refused before anything is sent, whatever discovery let
      /// through.
      #[tokio::test]
      async fn a_plain_http_registration_endpoint_is_egress_refused() {
          let egress = hennery_kernel::egress::Egress::new(hennery_kernel::egress::Timeouts::DEFAULT).unwrap();
          let internal = egress.client(hennery_kernel::egress::Allowance::InternalNetwork);
          let err = register(
              &internal,
              &url("http://as.example/register"),
              "https://h.example/cb",
              &[],
          )
          .await
          .err()
          .unwrap();
          assert!(matches!(err, RegisterError::EgressRefused(_)), "{err:?}");
      }

      #[test]
      fn issuers_compare_but_for_one_final_slash() {
          assert!(same_issuer("https://as.example/", "https://as.example"));
          assert!(same_issuer("https://as.example/t", "https://as.example/t/"));
          assert!(!same_issuer("https://as.example/t", "https://as.example/u"));
          assert!(!same_issuer("", "https://as.example"));
      }
  }
  ```

- [ ] **Step 2: Run them and see them fail, then commit them**

   ```sh
   nix develop -c cargo test -p hennery-gateway --locked --lib
   ```

   The gateway's unit tests do not compile: `oauth.rs` and `flows.rs` hold only their test modules (`register`, `token`, `same_issuer`, `Snapshot`, `cookie_name`, … do not exist).

   ```sh
   git add -A && git -c commit.gpgsign=false commit -m "test(gateway): OAuth discovery, registration, PKCE, the token endpoint and the flows"
   ```

- [ ] **Step 3: Implement**

In `crates/hennery-gateway/src/flows.rs`, replace:

  ```rust
  #[cfg(test)]
  ```

with:

  ```rust
  //! OAuth flows in flight (gateway spec §4.3; api-8e-8f F5, B5): in memory,
  //! keyed by `state`, single use, for `FLOW_TTL` seconds. The callback uses
  //! only what the flow snapshotted when it started (G-8), never storage
  //! re-read.
  //!
  //! - **One flow per connection**: a new authorize supersedes the previous
  //!   one, whose callback then finds no flow.
  //! - **At most `MAX_FLOWS`** live flows per owner (one owner per
  //!   installation in v1).
  //! - **Edits drop flows** (the review's R1): a URL or kind change, a client
  //!   `PUT` or a delete; the callback re-checks the connection besides.
  //! - **The flow cookie** holds 256 random bits, and its name is derived from
  //!   `state` (`hennery_mcp_flow_<16 hex of sha256(state)>`): a consent
  //!   completed in another browser has no cookie to match (the review's R3).
  //! - **A dynamically registered client** is held by the flow (S3) until its
  //!   callback stores it, and the latest unconsumed one is reused by the
  //!   next authorize of the same connection, so repeated clicks do not
  //!   register again.

  use crate::model::{AuthMethod, CredKind, TokenClient};
  use crate::store::ClientSource;
  use hennery_kernel::secret::{random_bytes, sha256_hex};
  use std::collections::{HashMap, HashSet};
  use std::sync::Mutex;
  use zeroize::Zeroizing;

  /// How long a flow lives, in seconds, and its cookie's `Max-Age` (gateway
  /// spec §4.3: 15 minutes).
  pub const FLOW_TTL: i64 = 15 * 60;

  /// The most live flows (api-8e-8f F5).
  pub const MAX_FLOWS: usize = 16;

  /// What every flow cookie's name starts with.
  pub const FLOW_COOKIE_PREFIX: &str = "hennery_mcp_flow_";

  /// At most this many same-name flow cookies of a request are tried, as
  /// `operator::MAX_SESSION_COOKIES` for the session's.
  pub const MAX_FLOW_COOKIES: usize = hennery_kernel::operator::MAX_SESSION_COOKIES;

  /// The cookie's name for `state`.
  pub fn cookie_name(state: &str) -> String {
      format!("{FLOW_COOKIE_PREFIX}{}", &sha256_hex(state.as_bytes())[..16])
  }

  /// What a flow fixed when it started (G-8). Its `Debug` shows no secret.
  #[derive(Clone)]
  pub struct Snapshot {
      pub connection_id: String,
      pub url: String,
      pub cred_kind: CredKind,
      pub internal_network: bool,
      pub source: ClientSource,
      pub client: TokenClient,
      pub issuer: String,
      pub authorization_endpoint: String,
      pub iss_parameter: bool,
      pub redirect_uri: String,
      pub scopes: Vec<String>,
      /// `resource`, sent on consent unless the server refused it before.
      pub resource: String,
      pub resource_param: bool,
      pub verifier: Zeroizing<String>,
      pub registered_at: i64,
      /// The operator's session that started it (`Authenticated::session_id`).
      pub auth_session: String,
  }

  impl std::fmt::Debug for Snapshot {
      fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
          f.debug_struct("Snapshot")
              .field("connection_id", &self.connection_id)
              .field("cred_kind", &self.cred_kind)
              .field("source", &self.source)
              .field("client", &self.client)
              .finish_non_exhaustive()
      }
  }

  struct Flow {
      cookie: Zeroizing<String>,
      expires_at: i64,
      snapshot: Snapshot,
  }

  /// A dynamically registered client not yet stored with a grant (S3).
  #[derive(Clone)]
  pub struct Registration {
      pub client: TokenClient,
      pub redirect_uri: String,
      pub registered_at: i64,
  }

  #[derive(Default)]
  struct Table {
      flows: HashMap<String, Flow>,
      registrations: HashMap<String, Registration>,
      /// (connection, url) pairs whose authorization server refused
      /// `resource` at consent: the next authorize omits it (plan 8f
      /// decision 11).
      resource_refused: HashSet<(String, String)>,
  }

  /// The live flows, shared by authorize and the callback.
  #[derive(Default)]
  pub struct Flows {
      table: Mutex<Table>,
  }

  /// A started flow: its `state`, its cookie's value and when it expires.
  pub struct Started {
      pub state: String,
      pub cookie: Zeroizing<String>,
      pub expires_at: i64,
  }

  /// What the callback found for a `state`.
  pub enum Taken {
      /// No flow, or one past its time.
      Unknown,
      /// The flow, consumed, but its cookie did not match.
      Mismatch(Box<Snapshot>),
      /// The flow, consumed: its snapshot.
      Taken(Box<Snapshot>),
  }

  impl Flows {
      fn table(&self) -> std::sync::MutexGuard<'_, Table> {
          self.table.lock().unwrap_or_else(std::sync::PoisonError::into_inner)
      }

      /// How many flows are live now, `except` a connection's (its flow is
      /// superseded by the next).
      pub fn live(&self, except: &str, now: i64) -> usize {
          let mut table = self.table();
          table.flows.retain(|_, flow| flow.expires_at > now);
          table
              .flows
              .values()
              .filter(|flow| flow.snapshot.connection_id != except)
              .count()
      }

      /// Start a flow for `snapshot`, superseding the connection's previous
      /// one. `None`: `MAX_FLOWS` are live.
      pub fn start(&self, snapshot: Snapshot, now: i64) -> Option<Started> {
          let mut table = self.table();
          table.flows.retain(|_, flow| flow.expires_at > now);
          table
              .flows
              .retain(|_, flow| flow.snapshot.connection_id != snapshot.connection_id);
          if table.flows.len() >= MAX_FLOWS {
              return None;
          }
          let state = hex::encode(random_bytes::<32>());
          let cookie = Zeroizing::new(hex::encode(Zeroizing::new(random_bytes::<32>()).as_slice()));
          let expires_at = now + FLOW_TTL;
          table.flows.insert(
              state.clone(),
              Flow {
                  cookie: cookie.clone(),
                  expires_at,
                  snapshot,
              },
          );
          Some(Started {
              state,
              cookie,
              expires_at,
          })
      }

      /// Take the flow of `state` (single use), if `cookies` holds its
      /// cookie: the callback's first check, in memory, before any storage.
      /// A flow is consumed whether or not the cookie matched; one past its
      /// time is unknown.
      pub fn take(&self, state: &str, cookies: &[&str], now: i64) -> Taken {
          let Some(flow) = self.table().flows.remove(state) else {
              return Taken::Unknown;
          };
          if flow.expires_at <= now {
              return Taken::Unknown;
          }
          let matches = cookies
              .iter()
              .take(MAX_FLOW_COOKIES)
              .any(|value| constant_time_eq(value.as_bytes(), flow.cookie.as_bytes()));
          if matches {
              Taken::Taken(Box::new(flow.snapshot))
          } else {
              Taken::Mismatch(Box::new(flow.snapshot))
          }
      }

      /// Drop every live flow of `connection_id` and its held registration
      /// (the review's R1): after a URL or kind edit, a client `PUT` or a
      /// delete.
      pub fn drop_connection(&self, connection_id: &str) {
          let mut table = self.table();
          table
              .flows
              .retain(|_, flow| flow.snapshot.connection_id != connection_id);
          table.registrations.remove(connection_id);
          table.resource_refused.retain(|(id, _)| id != connection_id);
      }

      /// The registration an authorize may reuse: the latest unconsumed one
      /// of the connection, for the same token endpoint and redirect URI.
      pub fn registration(&self, connection_id: &str, token_endpoint: &str, redirect_uri: &str) -> Option<Registration> {
          self.table()
              .registrations
              .get(connection_id)
              .filter(|r| r.client.token_endpoint == token_endpoint && r.redirect_uri == redirect_uri)
              .cloned()
      }

      pub fn hold_registration(&self, connection_id: &str, registration: Registration) {
          self.table()
              .registrations
              .insert(connection_id.to_string(), registration);
      }

      /// The authorization server refused `resource` at consent for this
      /// connection's `url`: the next authorize omits it.
      pub fn refuse_resource(&self, connection_id: &str, url: &str) {
          self.table()
              .resource_refused
              .insert((connection_id.to_string(), url.to_string()));
      }

      pub fn resource_refused(&self, connection_id: &str, url: &str) -> bool {
          self.table()
              .resource_refused
              .contains(&(connection_id.to_string(), url.to_string()))
      }
  }

  /// Compare without stopping at the first difference.
  fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
      if a.len() != b.len() {
          return false;
      }
      a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
  }

  /// A dynamically registered client as a token client (S3).
  pub fn registered_client(
      client_id: String,
      secret: Option<Zeroizing<String>>,
      auth_method: AuthMethod,
      token_endpoint: String,
  ) -> TokenClient {
      TokenClient {
          client_id,
          secret,
          auth_method,
          token_endpoint,
      }
  }

  #[cfg(test)]
  ```

In `crates/hennery-gateway/src/jsonrpc.rs`, replace:

  ```rust
  /// strings; ASCII case, and `ſ` as `s`. Unicode folds only one other letter
  /// to an ASCII one, the Kelvin sign to `k`, and no name read here has a
  /// `k`. Go's `encoding/json/v2`, matching names case-insensitively, ignores
  /// `_` and `-` as well (the re-confirmation's F1).
  ```

with:

  ```rust
  /// strings; ASCII case, `ſ` as `s`, and the Kelvin sign as `k`, the two
  /// letters Unicode folds to ASCII ones (plan 8f: `token_endpoint` has a
  /// `k`). Go's `encoding/json/v2`, matching names case-insensitively,
  /// ignores `_` and `-` as well (the re-confirmation's F1).
  ```

In `crates/hennery-gateway/src/jsonrpc.rs`, replace:

  ```rust
              '\u{17f}' => 's',
              c => c.to_ascii_lowercase(),
  ```

with:

  ```rust
              '\u{17f}' => 's',
              '\u{212a}' => 'k',
              c => c.to_ascii_lowercase(),
  ```

In `crates/hennery-gateway/src/jsonrpc.rs`, replace:

  ```rust
  fn respelt(object: &serde_json::Map<String, Value>, names: &[&str]) -> bool {
  ```

with:

  ```rust
  pub(crate) fn respelt(object: &serde_json::Map<String, Value>, names: &[&str]) -> bool {
  ```

In `crates/hennery-gateway/src/jsonrpc.rs`, replace:

  ```rust
      (!ambiguous(&value)).then_some(value)
  }
  ```

with:

  ```rust
      (!ambiguous(&value)).then_some(value)
  }

  /// Whether `bytes` is JSON with no key twice in one object at any depth:
  /// what a parser keeping the first of two keys and one keeping the last
  /// read alike (plan 8d; plan 8f reads OAuth documents only so).
  pub(crate) fn unique_keys(bytes: &[u8]) -> bool {
      serde_json::from_slice::<Unique>(bytes).is_ok()
  }
  ```

In `crates/hennery-gateway/src/oauth.rs`, replace:

  ```rust
  #[cfg(test)]
  ```

with:

  ```rust
  //! The gateway's OAuth client (gateway spec §4): discovery, dynamic
  //! registration, PKCE, the consent URL, and the token endpoint's two grants.
  //! Hand-written on the kernel's egress clients (plan 8f decision 1), not on
  //! `rmcp`'s `auth` module: that one tries the authorization server's
  //! metadata in another order than §4.1, follows redirects in discovery
  //! itself, and brings reqwest 0.13 beside the workspace's 0.12.
  //!
  //! - **Every request goes through the egress policy** (kernel spec §7.1),
  //!   under the connection's allowance, and redirects are never followed:
  //!   a 3xx is "not here". Before anything is sent, every metadata document,
  //!   every endpoint and the consent URL must be `https`, or plain `http` to
  //!   loopback ([`hennery_kernel::egress::is_https_or_loopback`]), even on a
  //!   connection marked "internal network" (plan 8b-ii's hand-off).
  //! - **Discovery order** (§4.1): the protected-resource (PR) document from
  //!   a `WWW-Authenticate` challenge to one unauthenticated `initialize`,
  //!   then at the path-inserted well-known URL, then at the origin's; then,
  //!   for each authorization server it names (else the resource's origin),
  //!   RFC 8414's inserted form, its appended form, then OpenID
  //!   configuration (appended, then inserted). The first metadata with both
  //!   endpoints and the `issuer` it was fetched for (RFC 8414 §3.3) wins.
  //! - **Bodies are capped** (`MAX_DOCUMENT`) and token responses are never
  //!   logged or echoed: they can repeat the code (§4.3). An error names only
  //!   origins (lane L11), and of a token endpoint's refusal only its RFC 6749
  //!   `error` when it is one of the fixed values.

  use crate::model::{AuthMethod, MAX_URL, TokenClient, url_for_logs, vendor_text};
  use base64::Engine;
  use base64::engine::general_purpose::URL_SAFE_NO_PAD;
  use hennery_kernel::egress::{
      self, EgressClient, EgressError, Method, Request, StatusCode, Url, header, is_https_or_loopback,
  };
  use serde_json::{Map, Value};
  use sha2::{Digest, Sha256};
  use std::time::Duration;
  use zeroize::Zeroizing;

  /// The largest document or token response read (rmcp's cap too).
  pub const MAX_DOCUMENT: usize = 1024 * 1024;

  /// How long one OAuth request may take, body included.
  pub const REQUEST_TIMEOUT: Duration = Duration::from_secs(15);

  /// The most authorization servers of one PR document tried.
  const MAX_SERVERS: usize = 4;

  /// The `expires_in` margin (gateway spec §4.4).
  pub const EXPIRY_MARGIN: i64 = 60;

  /// The RFC 6749 §5.2 errors a refusal's message may name; any other is
  /// shown only as its HTTP status (api-8e-8f B5 step 7).
  const NAMED_ERRORS: &[&str] = &[
      "invalid_grant",
      "invalid_client",
      "invalid_request",
      "unauthorized_client",
      "unsupported_grant_type",
      "invalid_scope",
  ];

  /// What discovery found (gateway spec §4.1).
  #[derive(Clone, PartialEq, Eq)]
  pub struct Discovered {
      /// The PR document's `resource`; `None` when no PR document was found
      /// and the resource's origin was taken as the authorization server.
      pub resource: Option<String>,
      /// The PR document's `scopes_supported`, requested at consent (G-5).
      pub scopes: Vec<String>,
      pub issuer: String,
      pub authorization_endpoint: Url,
      pub token_endpoint: Url,
      pub registration_endpoint: Option<Url>,
      /// `code_challenge_methods_supported` names `S256`.
      pub s256: bool,
      /// `token_endpoint_auth_methods_supported`, as advertised.
      pub auth_methods: Vec<String>,
      /// RFC 9207's `authorization_response_iss_parameter_supported`.
      pub iss_parameter: bool,
  }

  impl std::fmt::Debug for Discovered {
      fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
          f.debug_struct("Discovered")
              .field("issuer", &url_for_logs(&self.issuer))
              .field("s256", &self.s256)
              .field("iss_parameter", &self.iss_parameter)
              .finish_non_exhaustive()
      }
  }

  /// Why discovery found nothing to use. Each message names only origins.
  #[derive(Debug, Clone, PartialEq, Eq)]
  pub enum DiscoveryError {
      /// No usable PR or authorization-server document, or none whose
      /// `issuer` is the one it was fetched for.
      Failed(String),
      /// A document, an endpoint or a server named is not `https` (loopback
      /// `http` excepted).
      Insecure(String),
      /// The egress policy refused an address.
      Refused(String),
      /// Nothing answered: timeouts, transport failures or 5xx only.
      Unreachable(String),
  }

  /// A fetched candidate, as discovery reads it.
  enum Fetched {
      Document(Map<String, Value>),
      /// Any other answer: a 3xx (never followed), 4xx, or not a JSON object.
      NotHere,
      /// A timeout, a transport failure, or a 5xx.
      Unreachable,
  }

  /// GET `url` as a JSON object the gateway trusts for `keys`. `Err` only
  /// for the egress policy's refusal, which ends discovery.
  async fn fetch(client: &EgressClient, url: &Url, keys: &[&str]) -> Result<Fetched, DiscoveryError> {
      let mut request = Request::new(Method::GET, url.clone());
      request
          .headers_mut()
          .insert(header::ACCEPT, header::HeaderValue::from_static("application/json"));
      *request.timeout_mut() = Some(REQUEST_TIMEOUT);
      let response = match client.send(request).await {
          Ok(response) => response,
          Err(EgressError::Refused(refused)) => {
              return Err(DiscoveryError::Refused(format!(
                  "{} is refused by the egress policy: {refused}",
                  url_for_logs(url.as_str())
              )));
          }
          Err(_) => return Ok(Fetched::Unreachable),
      };
      let status = response.status();
      if status.is_server_error() {
          return Ok(Fetched::Unreachable);
      }
      if status != StatusCode::OK {
          return Ok(Fetched::NotHere);
      }
      match egress::read_capped(response, MAX_DOCUMENT).await {
          // A key twice, or one spelt otherwise, is no document: which
          // `issuer` or endpoint it names depends on the parser (plan 8f
          // decision 8, lane L16).
          Ok(bytes) => Ok(trusted_object(&bytes, keys).map_or(Fetched::NotHere, Fetched::Document)),
          Err(egress::BodyError::TooLarge) => Ok(Fetched::NotHere),
          Err(egress::BodyError::Failed(_)) => Ok(Fetched::Unreachable),
      }
  }

  /// `url`, if it may carry OAuth (§4): else why not, by origin.
  fn secure(url: &Url, what: &str) -> Result<(), DiscoveryError> {
      if is_https_or_loopback(url) {
          Ok(())
      } else {
          Err(DiscoveryError::Insecure(format!(
              "{what} at {} is not https",
              url_for_logs(url.as_str())
          )))
      }
  }

  /// The keys gateway reads of a protected-resource document, of an
  /// authorization server's metadata, of a registration's answer and of a
  /// token response. A document spelling one of them otherwise (`Issuer`,
  /// `token-endpoint`), as a decoder matching names whatever their case
  /// would read it, is no document (lane L16, as plan 8d's request bodies).
  const RESOURCE_KEYS: &[&str] = &["resource", "authorization_servers", "scopes_supported"];
  const SERVER_KEYS: &[&str] = &[
      "issuer",
      "authorization_endpoint",
      "token_endpoint",
      "registration_endpoint",
      "code_challenge_methods_supported",
      "token_endpoint_auth_methods_supported",
      "authorization_response_iss_parameter_supported",
  ];
  const REGISTRATION_KEYS: &[&str] = &[
      "client_id",
      "client_secret",
      "token_endpoint_auth_method",
      "error",
      "error_description",
  ];
  const TOKEN_KEYS: &[&str] = &["access_token", "token_type", "refresh_token", "expires_in", "error"];

  /// Text the gateway trusts: no control character. `url::Url` drops a tab
  /// or a newline inside a URL silently, so `https://as.exa\tmple` would be
  /// read as another text than the one sent (lane L16).
  fn clean(text: &str) -> bool {
      !text.chars().any(char::is_control)
  }

  /// A string field the gateway trusts; `None` when absent, not a string or
  /// not clean, which every caller reads as "not there" (fail closed).
  fn text<'a>(document: &'a Map<String, Value>, field: &str) -> Option<&'a str> {
      document.get(field)?.as_str().filter(|text| clean(text))
  }

  /// A URL in a document: absolute, at most `MAX_URL` bytes, clean, no
  /// fragment.
  fn document_url(document: &Map<String, Value>, field: &str) -> Option<Url> {
      let text = text(document, field)?;
      if text.len() > MAX_URL {
          return None;
      }
      Url::parse(text).ok().filter(|url| url.fragment().is_none())
  }

  /// A list of strings; an entry that is not a clean string of 1 to 256
  /// bytes is left out.
  fn strings(document: &Map<String, Value>, field: &str) -> Vec<String> {
      document
          .get(field)
          .and_then(Value::as_array)
          .map(|list| {
              list.iter()
                  .filter_map(Value::as_str)
                  .filter(|s| (1..=256).contains(&s.len()) && clean(s))
                  .map(String::from)
                  .collect()
          })
          .unwrap_or_default()
  }

  /// `bytes` as a JSON object the gateway trusts: no key twice anywhere, and
  /// none of `keys` spelt otherwise (lane L16). `None` otherwise.
  fn trusted_object(bytes: &[u8], keys: &[&str]) -> Option<Map<String, Value>> {
      if !crate::jsonrpc::unique_keys(bytes) {
          return None;
      }
      match serde_json::from_slice::<Value>(bytes) {
          // `respelt` reads a key as json-c and cJSON do, cut at its first
          // NUL: `token_endpoint\u0000x` is `token_endpoint` spelt otherwise.
          Ok(Value::Object(object)) if !crate::jsonrpc::respelt(&object, keys) => Some(object),
          _ => None,
      }
  }

  /// `url`'s path without its last `/`, as a well-known suffix: `""` for the
  /// root.
  fn path_suffix(url: &Url) -> String {
      url.path().trim_end_matches('/').to_string()
  }

  /// `url`'s origin with `path`.
  fn at(url: &Url, path: &str) -> Url {
      let mut out = url.clone();
      out.set_path(path);
      out.set_query(None);
      out.set_fragment(None);
      out
  }

  /// The PR document's well-known URLs for `resource` (RFC 9728 §3.1):
  /// path-inserted, then the origin's.
  pub fn resource_metadata_urls(resource: &Url) -> Vec<Url> {
      let suffix = path_suffix(resource);
      let mut out = Vec::new();
      if !suffix.is_empty() {
          out.push(at(resource, &format!("/.well-known/oauth-protected-resource{suffix}")));
      }
      out.push(at(resource, "/.well-known/oauth-protected-resource"));
      out
  }

  /// The authorization server's metadata URLs for `issuer` (gateway spec
  /// §4.1): RFC 8414 inserted, RFC 8414 appended, then OpenID configuration
  /// appended (OpenID Connect Discovery) and inserted.
  pub fn server_metadata_urls(issuer: &Url) -> Vec<Url> {
      let suffix = path_suffix(issuer);
      if suffix.is_empty() {
          return vec![
              at(issuer, "/.well-known/oauth-authorization-server"),
              at(issuer, "/.well-known/openid-configuration"),
          ];
      }
      vec![
          at(issuer, &format!("/.well-known/oauth-authorization-server{suffix}")),
          at(issuer, &format!("{suffix}/.well-known/oauth-authorization-server")),
          at(issuer, &format!("{suffix}/.well-known/openid-configuration")),
          at(issuer, &format!("/.well-known/openid-configuration{suffix}")),
      ]
  }

  /// Whether two issuer identifiers are the same: equal, but for one final
  /// `/` (plan 8f decision 6; RFC 8414 §3.3 wants them identical, and
  /// vendors differ on the slash).
  pub fn same_issuer(a: &str, b: &str) -> bool {
      a.strip_suffix('/').unwrap_or(a) == b.strip_suffix('/').unwrap_or(b)
  }

  /// The `resource_metadata` of a `WWW-Authenticate` challenge (RFC 9728
  /// §5.1), if any header names one.
  pub fn challenge_metadata(headers: &header::HeaderMap) -> Option<String> {
      headers
          .get_all(header::WWW_AUTHENTICATE)
          .iter()
          .filter_map(|value| value.to_str().ok())
          .find_map(param_resource_metadata)
  }

  fn param_resource_metadata(challenge: &str) -> Option<String> {
      let lower = challenge.to_ascii_lowercase();
      let mut from = 0;
      while let Some(found) = lower[from..].find("resource_metadata") {
          let start = from + found;
          from = start + "resource_metadata".len();
          // A parameter's name starts the challenge's parameters or follows a
          // space or comma.
          let boundary = start == 0 || matches!(lower.as_bytes()[start - 1], b' ' | b',' | b'\t');
          let rest = challenge[from..].trim_start();
          let Some(rest) = rest.strip_prefix('=') else {
              continue;
          };
          if !boundary {
              continue;
          }
          let rest = rest.trim_start();
          if let Some(quoted) = rest.strip_prefix('"') {
              let mut value = String::new();
              let mut chars = quoted.chars();
              while let Some(c) = chars.next() {
                  match c {
                      '\\' => value.push(chars.next()?),
                      '"' => return Some(value),
                      c => value.push(c),
                  }
              }
              return None;
          }
          let value: String = rest.chars().take_while(|c| !matches!(c, ',' | ' ' | '\t')).collect();
          return (!value.is_empty()).then_some(value);
      }
      None
  }

  /// One unauthenticated `initialize` to the resource: the challenge's
  /// `resource_metadata`, if it answers 401 with one. `Err` only for the
  /// egress policy's refusal.
  async fn challenge(client: &EgressClient, resource: &Url) -> Result<Option<String>, DiscoveryError> {
      let body = serde_json::json!({
          "jsonrpc": "2.0",
          "id": 0,
          "method": "initialize",
          "params": {
              "protocolVersion": "2025-06-18",
              "capabilities": {},
              "clientInfo": { "name": "hennery", "version": env!("CARGO_PKG_VERSION") },
          },
      });
      let mut request = Request::new(Method::POST, resource.clone());
      let headers = request.headers_mut();
      headers.insert(
          header::CONTENT_TYPE,
          header::HeaderValue::from_static("application/json"),
      );
      headers.insert(
          header::ACCEPT,
          header::HeaderValue::from_static("application/json, text/event-stream"),
      );
      *request.body_mut() = Some(body.to_string().into());
      *request.timeout_mut() = Some(REQUEST_TIMEOUT);
      match client.send_streaming(request).await {
          Ok(response) if response.status() == StatusCode::UNAUTHORIZED => Ok(challenge_metadata(response.headers())),
          Ok(_) => Ok(None),
          Err(EgressError::Refused(refused)) => Err(DiscoveryError::Refused(format!(
              "{} is refused by the egress policy: {refused}",
              url_for_logs(resource.as_str())
          ))),
          Err(_) => Ok(None),
      }
  }

  /// Discover `resource`'s authorization server (gateway spec §4.1).
  pub async fn discover(client: &EgressClient, resource: &Url) -> Result<Discovered, DiscoveryError> {
      let origin = url_for_logs(resource.as_str());
      let mut unreachable = false;
      let mut candidates = Vec::new();
      if let Some(found) = challenge(client, resource).await? {
          let url = Url::parse(&found)
              .ok()
              .filter(|u| found.len() <= MAX_URL && u.fragment().is_none())
              .ok_or_else(|| DiscoveryError::Failed(format!("{origin} named a resource_metadata that is not a URL")))?;
          secure(&url, "the protected-resource document")?;
          candidates.push(url);
      }
      for url in resource_metadata_urls(resource) {
          if !candidates.contains(&url) {
              secure(&url, "the protected-resource document")?;
              candidates.push(url);
          }
      }
      let mut document = None;
      for url in &candidates {
          match fetch(client, url, RESOURCE_KEYS).await? {
              // RFC 9728 §3.2: `resource` is required; a document without it
              // is not one (plan 8f decision 7).
              Fetched::Document(found) if text(&found, "resource").is_some() => {
                  document = Some(found);
                  break;
              }
              Fetched::Document(_) | Fetched::NotHere => {}
              Fetched::Unreachable => unreachable = true,
          }
      }
      let (resource_named, scopes, servers) = match &document {
          Some(document) => {
              let named = text(document, "resource").map(String::from);
              let mut servers = Vec::new();
              for text in strings(document, "authorization_servers").iter().take(MAX_SERVERS) {
                  let url = Url::parse(text)
                      .ok()
                      .filter(|u| text.len() <= MAX_URL && u.fragment().is_none())
                      .ok_or_else(|| {
                          DiscoveryError::Failed(format!(
                              "{origin}'s protected-resource document names a server that is not a URL"
                          ))
                      })?;
                  // Its metadata URLs are checked before they are fetched.
                  servers.push((text.clone(), url));
              }
              (named, strings(document, "scopes_supported"), servers)
          }
          None => (None, Vec::new(), Vec::new()),
      };
      let servers = if servers.is_empty() {
          let issuer = at(resource, "/");
          vec![(issuer.as_str().trim_end_matches('/').to_string(), issuer)]
      } else {
          servers
      };
      let mut wrong_issuer = false;
      for (identifier, issuer) in &servers {
          for url in server_metadata_urls(issuer) {
              secure(&url, "the authorization server's metadata")?;
              let document = match fetch(client, &url, SERVER_KEYS).await? {
                  Fetched::Document(document) => document,
                  Fetched::NotHere => continue,
                  Fetched::Unreachable => {
                      unreachable = true;
                      continue;
                  }
              };
              let (Some(authorization_endpoint), Some(token_endpoint)) = (
                  document_url(&document, "authorization_endpoint"),
                  document_url(&document, "token_endpoint"),
              ) else {
                  continue;
              };
              let found_issuer = text(&document, "issuer").unwrap_or_default();
              if !same_issuer(found_issuer, identifier) {
                  wrong_issuer = true;
                  continue;
              }
              secure(&authorization_endpoint, "the authorization endpoint")?;
              secure(&token_endpoint, "the token endpoint")?;
              let registration_endpoint = document_url(&document, "registration_endpoint");
              if let Some(url) = &registration_endpoint {
                  secure(url, "the registration endpoint")?;
              }
              return Ok(Discovered {
                  resource: resource_named,
                  scopes,
                  issuer: found_issuer.to_string(),
                  authorization_endpoint,
                  token_endpoint,
                  registration_endpoint,
                  s256: strings(&document, "code_challenge_methods_supported")
                      .iter()
                      .any(|m| m == "S256"),
                  auth_methods: strings(&document, "token_endpoint_auth_methods_supported"),
                  iss_parameter: document
                      .get("authorization_response_iss_parameter_supported")
                      .and_then(Value::as_bool)
                      .unwrap_or(false),
              });
          }
      }
      let servers: Vec<String> = servers.iter().map(|(_, url)| url_for_logs(url.as_str())).collect();
      let servers = servers.join(", ");
      if wrong_issuer {
          Err(DiscoveryError::Failed(format!(
              "the authorization server metadata at {servers} does not name the issuer it was fetched for"
          )))
      } else if unreachable {
          Err(DiscoveryError::Unreachable(format!(
              "the authorization server at {servers} could not be reached"
          )))
      } else {
          Err(DiscoveryError::Failed(format!(
              "no protected-resource or authorization-server document with both endpoints was found for {origin}"
          )))
      }
  }

  /// A client registered dynamically (RFC 7591).
  #[derive(Clone)]
  pub struct Registered {
      pub client_id: String,
      /// Kept when the vendor issues one anyway.
      pub secret: Option<Zeroizing<String>>,
      pub auth_method: AuthMethod,
  }

  /// Why registration failed.
  #[derive(Debug, Clone, PartialEq, Eq)]
  pub enum RegisterError {
      /// The vendor refused: its RFC 7591 `error` and `error_description` as
      /// `model::vendor_text` shows them (G-6).
      Refused(String),
      Unreachable,
      EgressRefused(String),
      /// A success that is not one: no usable `client_id`.
      Invalid,
  }

  /// Register as a public client (gateway spec §4.2): `none` at the token
  /// endpoint, `authorization_code` and `refresh_token`, the one redirect.
  pub async fn register(
      client: &EgressClient,
      endpoint: &Url,
      redirect_uri: &str,
      scopes: &[String],
  ) -> Result<Registered, RegisterError> {
      if !is_https_or_loopback(endpoint) {
          return Err(RegisterError::EgressRefused(format!(
              "the registration endpoint at {} is not https",
              url_for_logs(endpoint.as_str())
          )));
      }
      let mut body = serde_json::json!({
          "client_name": "hennery",
          "redirect_uris": [redirect_uri],
          "grant_types": ["authorization_code", "refresh_token"],
          "response_types": ["code"],
          "token_endpoint_auth_method": "none",
      });
      if !scopes.is_empty() {
          body["scope"] = Value::String(scopes.join(" "));
      }
      let mut request = Request::new(Method::POST, endpoint.clone());
      let headers = request.headers_mut();
      headers.insert(
          header::CONTENT_TYPE,
          header::HeaderValue::from_static("application/json"),
      );
      headers.insert(header::ACCEPT, header::HeaderValue::from_static("application/json"));
      *request.body_mut() = Some(body.to_string().into());
      *request.timeout_mut() = Some(REQUEST_TIMEOUT);
      let response = match client.send(request).await {
          Ok(response) => response,
          Err(EgressError::Refused(refused)) => {
              return Err(RegisterError::EgressRefused(format!(
                  "{} is refused by the egress policy: {refused}",
                  url_for_logs(endpoint.as_str())
              )));
          }
          Err(_) => return Err(RegisterError::Unreachable),
      };
      let status = response.status();
      if status.is_server_error() {
          return Err(RegisterError::Unreachable);
      }
      let bytes = match egress::read_capped(response, MAX_DOCUMENT).await {
          Ok(bytes) => bytes,
          Err(egress::BodyError::TooLarge) => return Err(RegisterError::Invalid),
          Err(egress::BodyError::Failed(_)) => return Err(RegisterError::Unreachable),
      };
      let document = trusted_object(&bytes, REGISTRATION_KEYS);
      if !status.is_success() {
          let said = document.as_ref().and_then(|d| d.get("error")).and_then(Value::as_str);
          let description = document
              .as_ref()
              .and_then(|d| d.get("error_description"))
              .and_then(Value::as_str);
          let text = match (said, description) {
              (Some(error), Some(description)) => format!("{error}: {description}"),
              (Some(error), None) => error.to_string(),
              (None, _) => format!("HTTP {}", status.as_u16()),
          };
          return Err(RegisterError::Refused(vendor_text(&text)));
      }
      let Some(document) = document else {
          return Err(RegisterError::Invalid);
      };
      let Some(client_id) = text(&document, "client_id").filter(|id| crate::model::client_id_problem(id).is_none())
      else {
          return Err(RegisterError::Invalid);
      };
      let secret = text(&document, "client_secret")
          .filter(|s| crate::model::client_secret_problem(s).is_none())
          .map(|s| Zeroizing::new(s.to_string()));
      let auth_method = match (&secret, text(&document, "token_endpoint_auth_method")) {
          (None, _) => AuthMethod::None,
          (Some(_), Some("client_secret_post")) => AuthMethod::Post,
          (Some(_), _) => AuthMethod::Basic,
      };
      Ok(Registered {
          client_id: client_id.to_string(),
          secret,
          auth_method,
      })
  }

  /// How a pre-registered client authenticates (RFC 6749 §2.3.1, RFC 8414):
  /// `client_secret_basic`, the default, unless the server lists only
  /// `client_secret_post`; a client without a secret is public.
  pub fn auth_method_for(has_secret: bool, advertised: &[String]) -> AuthMethod {
      if !has_secret {
          return AuthMethod::None;
      }
      let basic = advertised.is_empty() || advertised.iter().any(|m| m == "client_secret_basic");
      let post = advertised.iter().any(|m| m == "client_secret_post");
      if !basic && post {
          AuthMethod::Post
      } else {
          AuthMethod::Basic
      }
  }

  /// A PKCE verifier (RFC 7636): 32 random bytes, base64url.
  pub fn verifier() -> Zeroizing<String> {
      Zeroizing::new(URL_SAFE_NO_PAD.encode(Zeroizing::new(hennery_kernel::secret::random_bytes::<32>()).as_slice()))
  }

  /// Its S256 challenge.
  pub fn challenge_for(verifier: &str) -> String {
      URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()))
  }

  /// What the consent URL carries (gateway spec §4.3).
  pub struct Consent<'a> {
      pub client_id: &'a str,
      pub redirect_uri: &'a str,
      pub state: &'a str,
      pub challenge: &'a str,
      pub scopes: &'a [String],
      /// RFC 8707's `resource`: the connection URL, unless the server
      /// refused the parameter.
      pub resource: Option<&'a str>,
  }

  /// The consent URL: the authorization endpoint with the request's
  /// parameters added to its own query. Never `response_mode=form_post`: the
  /// flow cookie is `SameSite=Lax` (api-8e-8f R3).
  pub fn consent_url(authorization_endpoint: &Url, consent: &Consent<'_>) -> Url {
      let mut url = authorization_endpoint.clone();
      {
          let mut query = url.query_pairs_mut();
          query
              .append_pair("response_type", "code")
              .append_pair("client_id", consent.client_id)
              .append_pair("redirect_uri", consent.redirect_uri)
              .append_pair("state", consent.state)
              .append_pair("code_challenge", consent.challenge)
              .append_pair("code_challenge_method", "S256");
          if !consent.scopes.is_empty() {
              query.append_pair("scope", &consent.scopes.join(" "));
          }
          if let Some(resource) = consent.resource {
              query.append_pair("resource", resource);
          }
      }
      url
  }

  /// What the token endpoint is asked for.
  pub enum Grant<'a> {
      /// The code a consent returned, with its PKCE verifier.
      Code {
          code: &'a str,
          redirect_uri: &'a str,
          verifier: &'a str,
      },
      /// A refresh, with the scopes the grant was asked for (G-10).
      Refresh {
          refresh_token: &'a str,
          scopes: &'a [String],
      },
  }

  /// Tokens the endpoint issued. Its `Debug` shows none.
  pub struct Issued {
      pub access_token: Zeroizing<String>,
      pub refresh_token: Option<Zeroizing<String>>,
      pub expires_in: Option<i64>,
  }

  impl std::fmt::Debug for Issued {
      fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
          f.debug_struct("Issued")
              .field("expires_in", &self.expires_in)
              .finish_non_exhaustive()
      }
  }

  /// `now + expires_in − 60 s`; `None` when the server said nothing
  /// (unknown, not expired: gateway spec §4.4).
  pub fn expires_at(now: i64, expires_in: Option<i64>) -> Option<i64> {
      expires_in.map(|secs| now + (secs - EXPIRY_MARGIN).max(0))
  }

  /// Why the token endpoint gave nothing. None of them carries its body.
  #[derive(Debug, Clone, PartialEq, Eq)]
  pub enum TokenError {
      /// The vendor refused (a 4xx): its RFC 6749 `error` when it is a named
      /// one, else only the status.
      Refused { error: Option<&'static str>, status: u16 },
      /// RFC 8707's `invalid_target`: the server does not take `resource`.
      InvalidTarget,
      /// A timeout, a transport failure, a 429 or a 5xx: not the vendor
      /// refusing the grant.
      Unavailable,
      /// The egress policy refused, or the endpoint is not `https`.
      EgressRefused(String),
      /// A 200 that is not a token response.
      Invalid,
  }

  impl TokenError {
      /// What the operator is shown (api-8e-8f B5 step 7).
      pub fn message(&self) -> String {
          match self {
              Self::Refused { error: Some(error), .. } => format!("the authorization server refused: {error}"),
              Self::Refused { error: None, status } => format!("the authorization server refused (HTTP {status})"),
              Self::InvalidTarget => "the authorization server refused: invalid_target".into(),
              Self::Unavailable => "the authorization server could not be reached".into(),
              Self::EgressRefused(why) => why.clone(),
              Self::Invalid => "the authorization server answered with no usable token".into(),
          }
      }
  }

  /// Ask `client`'s token endpoint for `grant` (gateway spec §4.3, §4.4).
  /// The response is read into wiped memory and never logged or echoed.
  pub async fn token(
      egress: &EgressClient,
      client: &TokenClient,
      grant: &Grant<'_>,
      resource: Option<&str>,
  ) -> Result<Issued, TokenError> {
      let endpoint = Url::parse(&client.token_endpoint).map_err(|_| TokenError::Invalid)?;
      if !is_https_or_loopback(&endpoint) {
          return Err(TokenError::EgressRefused(format!(
              "the token endpoint at {} is not https",
              url_for_logs(endpoint.as_str())
          )));
      }
      let (body, basic) = token_form(client, grant, resource)?;
      let mut request = Request::new(Method::POST, endpoint.clone());
      let headers = request.headers_mut();
      headers.insert(
          header::CONTENT_TYPE,
          header::HeaderValue::from_static("application/x-www-form-urlencoded"),
      );
      headers.insert(header::ACCEPT, header::HeaderValue::from_static("application/json"));
      if let Some(basic) = basic {
          headers.insert(header::AUTHORIZATION, basic);
      }
      *request.body_mut() = Some(body.as_bytes().to_vec().into());
      *request.timeout_mut() = Some(REQUEST_TIMEOUT);
      let response = match egress.send(request).await {
          Ok(response) => response,
          Err(EgressError::Refused(refused)) => {
              return Err(TokenError::EgressRefused(format!(
                  "{} is refused by the egress policy: {refused}",
                  url_for_logs(endpoint.as_str())
              )));
          }
          Err(_) => return Err(TokenError::Unavailable),
      };
      let status = response.status();
      if status.is_server_error() || status == StatusCode::TOO_MANY_REQUESTS {
          return Err(TokenError::Unavailable);
      }
      let bytes = match egress::read_capped(response, MAX_DOCUMENT).await {
          Ok(bytes) => Zeroizing::new(bytes),
          Err(egress::BodyError::TooLarge) => return Err(TokenError::Invalid),
          Err(egress::BodyError::Failed(_)) => return Err(TokenError::Unavailable),
      };
      // Read once, into a map whose strings are wiped with it; never logged.
      let parsed = trusted_object(&bytes, TOKEN_KEYS);
      if !status.is_success() {
          let said = parsed.as_ref().and_then(|p| text(p, "error"));
          if said == Some("invalid_target") {
              return Err(TokenError::InvalidTarget);
          }
          let error = said.and_then(|said| NAMED_ERRORS.iter().copied().find(|named| *named == said));
          let refused = TokenError::Refused {
              error,
              status: status.as_u16(),
          };
          wipe(parsed);
          return Err(refused);
      }
      let Some(parsed) = parsed else {
          return Err(TokenError::Invalid);
      };
      let issued = (|| {
          // Absent `token_type` is taken as Bearer; any other is refused.
          let bearer = match parsed.get("token_type") {
              None => true,
              Some(value) => value.as_str().is_some_and(|t| t.eq_ignore_ascii_case("bearer")),
          };
          let access_token = text(&parsed, "access_token").filter(|t| crate::model::token_problem(t).is_none())?;
          let refresh_token = match parsed.get("refresh_token") {
              None | Some(Value::Null) => None,
              Some(_) => Some(text(&parsed, "refresh_token").filter(|t| crate::model::token_problem(t).is_none())?),
          };
          // A whole number of seconds, or a string of one; anything else is
          // unknown (not expired: gateway spec §4.4).
          let expires_in = match parsed.get("expires_in") {
              Some(Value::Number(n)) => n.as_i64(),
              Some(Value::String(s)) if s.bytes().all(|b| b.is_ascii_digit()) && !s.is_empty() => s.parse().ok(),
              _ => None,
          }
          .filter(|secs| *secs >= 0);
          bearer.then(|| Issued {
              access_token: Zeroizing::new(access_token.to_string()),
              refresh_token: refresh_token.map(|t| Zeroizing::new(t.to_string())),
              expires_in,
          })
      })();
      wipe(Some(parsed));
      issued.ok_or(TokenError::Invalid)
  }

  /// The token request's form, and the client's `Authorization: Basic` when
  /// it authenticates so (RFC 6749 §2.3.1: id and secret form-encoded first).
  fn token_form(
      client: &TokenClient,
      grant: &Grant<'_>,
      resource: Option<&str>,
  ) -> Result<(Zeroizing<String>, Option<header::HeaderValue>), TokenError> {
      let mut form = url::form_urlencoded::Serializer::new(String::new());
      match grant {
          Grant::Code {
              code,
              redirect_uri,
              verifier,
          } => {
              form.append_pair("grant_type", "authorization_code")
                  .append_pair("code", code)
                  .append_pair("redirect_uri", redirect_uri)
                  .append_pair("code_verifier", verifier);
          }
          Grant::Refresh { refresh_token, scopes } => {
              form.append_pair("grant_type", "refresh_token")
                  .append_pair("refresh_token", refresh_token);
              if !scopes.is_empty() {
                  form.append_pair("scope", &scopes.join(" "));
              }
          }
      }
      if let Some(resource) = resource {
          form.append_pair("resource", resource);
      }
      let mut basic = None;
      match (client.auth_method, &client.secret) {
          (AuthMethod::Basic, Some(secret)) => {
              let encode = |s: &str| url::form_urlencoded::byte_serialize(s.as_bytes()).collect::<String>();
              let pair = Zeroizing::new(format!("{}:{}", encode(&client.client_id), encode(secret)));
              let mut value = header::HeaderValue::from_str(&format!(
                  "Basic {}",
                  base64::engine::general_purpose::STANDARD.encode(pair.as_bytes())
              ))
              .map_err(|_| TokenError::Invalid)?;
              value.set_sensitive(true);
              basic = Some(value);
          }
          (AuthMethod::Post, Some(secret)) => {
              form.append_pair("client_id", &client.client_id)
                  .append_pair("client_secret", secret);
          }
          _ => {
              form.append_pair("client_id", &client.client_id);
          }
      }
      Ok((Zeroizing::new(form.finish()), basic))
  }

  /// Wipe the strings of a parsed token response before it is dropped.
  fn wipe(object: Option<Map<String, Value>>) {
      use zeroize::Zeroize;
      for (_, value) in object.into_iter().flatten() {
          if let Value::String(mut text) = value {
              text.zeroize();
          }
      }
  }

  #[cfg(test)]
  ```

- [ ] **Step 4: Run the checks**

   Run the five checks:

   ```sh
   nix develop -c cargo fmt --all --check
   nix develop -c cargo clippy --workspace --all-targets --locked -- -D warnings
   nix develop -c cargo clippy -p hennery --locked -- -D warnings
   nix develop -c cargo test --workspace --locked
   nix develop -c cargo run -p hennery-proto --bin gen --locked -- --check
   ```

   Phase B targeted tests: exit 0, 41 passed. See Execution status for the final full gate and task-specific supplementary checks.

- [ ] **Step 5: Commit**

   ```sh
   git add -A && git -c commit.gpgsign=false commit -m "feat(gateway): the OAuth client on the egress policy, and the flows in flight"
   ```

### Task 5: The Notifier, the runtime, single-flight refresh, OAuth through the proxy, the probe, the wiring

**Files:** Create `crates/hennery-gateway/src/notify.rs`, `src/runtime.rs`, `src/refresh.rs`, `src/probe.rs`, `tests/oauth_proxy.rs`, `tests/probe.rs`; modify `src/lib.rs`, `src/api.rs` (its state on the runtime, the lock on every credential write), `src/proxy.rs`, `tests/api.rs`, `tests/api_log.rs`, `tests/open.rs`, `tests/support/mod.rs`, `tests/support/upstream.rs`; `crates/hennery/src/main.rs` (`start_gateway` and its test). Adapt the merged session/purge fixtures and `src/session.rs` to the same Runtime; retain revocations, wrapped session IDs and answer deadlines.

- [ ] **Step 1: Write the failing tests**

In `crates/hennery-gateway/tests/api.rs`, replace:

  ```rust
  use hennery_gateway::store::GatewayStore;
  ```

with:

  ```rust
  use hennery_gateway::notify::Silent;
  use hennery_gateway::runtime::Runtime;
  use hennery_gateway::scope::ProxyStore;
  use hennery_gateway::store::GatewayStore;
  use hennery_kernel::egress::{Egress, Timeouts};
  ```

In `crates/hennery-gateway/tests/api.rs`, replace:

  ```rust
          let app = router(GatewayState {
              store: store.clone(),
              key: key.clone(),
              operator: operator.clone(),
              revocations: Default::default(),
  ```

with:

  ```rust
          let runtime = Arc::new(Runtime::new(
              store.clone(),
              Arc::new(ProxyStore::open(&db).unwrap()),
              key.clone(),
              Egress::new(Timeouts::DEFAULT).unwrap(),
              Arc::new(Silent),
          ));
          let app = router(GatewayState {
              runtime,
              operator: operator.clone(),
  ```

In `crates/hennery-gateway/tests/api_log.rs`, replace:

  ```rust
  use hennery_gateway::store::GatewayStore;
  ```

with:

  ```rust
  use hennery_gateway::notify::Silent;
  use hennery_gateway::runtime::Runtime;
  use hennery_gateway::scope::ProxyStore;
  use hennery_gateway::store::GatewayStore;
  use hennery_kernel::egress::{Egress, Timeouts};
  ```

In `crates/hennery-gateway/tests/api_log.rs`, replace:

  ```rust
  }

  #[tokio::test]
  async fn a_static_token_is_never_logged_answered_or_stored_in_clear() {
  ```

with:

  ```rust
  }

  /// The gateway's runtime on `db`, as the collector makes it.
  fn runtime(db: &std::path::Path, store: Arc<GatewayStore>, key: Arc<MasterKey>) -> Arc<Runtime> {
      Arc::new(Runtime::new(
          store,
          Arc::new(ProxyStore::open(db).unwrap()),
          key,
          Egress::new(Timeouts::DEFAULT).unwrap(),
          Arc::new(Silent),
      ))
  }

  #[tokio::test]
  async fn a_static_token_is_never_logged_answered_or_stored_in_clear() {
  ```

In `crates/hennery-gateway/tests/api_log.rs`, replace:

  ```rust
          store: store.clone(),
          key: key.clone(),
  ```

with:

  ```rust
          runtime: runtime(&db, store.clone(), key.clone()),
  ```

In `crates/hennery-gateway/tests/api_log.rs`, replace:

  ```rust
          store: Arc::new(GatewayStore::open(&db).unwrap()),
          key: Arc::new(MasterKey::from_bytes([5; 32])),
  ```

with:

  ```rust
          runtime: runtime(
              &db,
              Arc::new(GatewayStore::open(&db).unwrap()),
              Arc::new(MasterKey::from_bytes([5; 32])),
          ),
  ```

Create `crates/hennery-gateway/tests/oauth_proxy.rs`:

  ```rust
  //! The proxy's OAuth path (gateway spec §4.4, §4.5, §5.4, §11; plan 8f):
  //! an upstream 401 is one single-flight refresh and one retry; concurrent
  //! 401s share one refresh, so a rotating refresh token with reuse detection
  //! survives; a refresh runs to completion whatever the caller does; and each
  //! refresh outcome answers its own way. Against the fake authorization
  //! server, whose `/mcp` takes only its live access tokens.

  mod support;

  use hennery_gateway::model::{CredKind, Status};
  use hennery_gateway::notify::Alert;
  use hennery_gateway::proxy::Limits;
  use hennery_gateway::store::RefreshedGrant;
  use hennery_kernel::secret::unix_now;
  use std::time::Duration;
  use support::oauth::{Config, FakeAs, seed_grant};
  use support::upstream::{Harness, list};

  /// A harness, a fake, an OAuth connection mounted on `host-a` with a grant
  /// from the fake, and a session token of that host.
  async fn setup(config: Config, expires_at: Option<i64>) -> (Harness, FakeAs, String, String) {
      setup_with(config, expires_at, |r| r).await
  }

  async fn setup_with(
      config: Config,
      expires_at: Option<i64>,
      adjust: impl FnOnce(hennery_gateway::runtime::Runtime) -> hennery_gateway::runtime::Runtime,
  ) -> (Harness, FakeAs, String, String) {
      let h = Harness::with(
          Limits::new(64, 8, Duration::from_secs(10), Duration::from_secs(2)),
          adjust,
      )
      .await;
      let fake = FakeAs::start(config).await;
      h.host("host-a", 1);
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      h.mount(&id, &["host-a"]);
      let (access, refresh) = fake.issue();
      seed_grant(&h, &id, &fake, &access, Some(&refresh), expires_at);
      let token = h.mint("sess-1", "host-a", &h.hat());
      (h, fake, id, token)
  }

  fn grant(h: &Harness, id: &str) -> hennery_gateway::model::OauthCredential {
      h.store.oauth_credential(id, &h.key).unwrap().unwrap()
  }

  /// Requests that reached the token endpoint, held at its gate or not.
  fn token_requests(fake: &FakeAs) -> usize {
      fake.paths().iter().filter(|p| *p == "/token").count()
  }

  /// Wait until `check` holds, at most 10 s: a positive signal, never a
  /// sleep (fleet rules: Linux races).
  async fn until(mut check: impl FnMut() -> bool) {
      for _ in 0..1000 {
          if check() {
              return;
          }
          tokio::time::sleep(Duration::from_millis(10)).await;
      }
      panic!("never");
  }

  /// A live grant: the request goes with its access token, no refresh.
  #[tokio::test]
  async fn a_live_grant_is_sent_as_a_bearer_token() {
      let (h, fake, id, token) = setup(Config::default(), None).await;
      let url = h.store.connection(&id).unwrap().unwrap().url;
      h.proxy_store
          .record_status(&id, &url, Status::Error, Some("down"), 1)
          .unwrap();
      let response = h.post("linear", &token, &list(1)).await;
      assert_eq!(response.status(), 200);
      assert_eq!(fake.with(|r| r.refreshes), 0);
      assert_eq!(h.status(&id), "ok", "live traffic sets ok");
      assert_eq!(h.alerts.alerts(), [(id, Alert::Recovered)]);
  }

  /// Gateway spec §5.4: a 401 is a refresh and one retry; the refresh sends
  /// `resource` and the grant's scopes (G-10); the new tokens are stored.
  #[tokio::test]
  async fn a_401_is_refreshed_and_retried_once() {
      let (h, fake, id, token) = setup(Config::default(), None).await;
      let before = grant(&h, &id);
      fake.expire_access();
      let response = h.post("linear", &token, &list(1)).await;
      assert_eq!(response.status(), 200, "{:?}", response.text().await);
      assert_eq!(fake.with(|r| r.refreshes), 1);
      assert_eq!(
          fake.with(|r| r.token_resources.clone()),
          [("refresh_token".to_string(), Some(fake.mcp_url()))]
      );
      assert_eq!(
          fake.with(|r| r.refresh_scopes.clone()),
          [Some("read write".to_string())]
      );
      let after = grant(&h, &id);
      assert_ne!(after.tokens.access_token, before.tokens.access_token);
      assert_ne!(after.tokens.refresh_token, before.tokens.refresh_token, "rotated");
      assert!(fake.is_live(&after.tokens.access_token));
  }

  /// Gateway spec §5.4: a second 401 after the refresh is `needs_auth` and
  /// 502 `upstream_auth`, and the `Notifier` hears of it.
  #[tokio::test]
  async fn a_second_401_is_needs_auth() {
      let (h, fake, id, token) = setup(
          Config {
              mcp_status: Some(401),
              ..Config::default()
          },
          None,
      )
      .await;
      let response = h.post("linear", &token, &list(1)).await;
      assert_eq!(response.status(), 502);
      assert!(response.headers().get("www-authenticate").is_none());
      let body: serde_json::Value = response.json().await.unwrap();
      assert_eq!(body["code"], "upstream_auth");
      assert_eq!(fake.with(|r| r.refreshes), 1, "one refresh, one retry");
      assert_eq!(h.status(&id), "needs_auth");
      assert_eq!(h.alerts.alerts(), [(id, Alert::NeedsAuth)]);
  }

  /// Gateway spec §4.5 and §11: concurrent 401s share one refresh, so a
  /// rotating refresh token with reuse detection is never presented twice.
  #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
  async fn concurrent_401s_share_one_refresh() {
      let (h, fake, id, token) = setup(Config::default(), None).await;
      fake.expire_access();
      let mut calls = Vec::new();
      for i in 0..8 {
          let h = &h;
          let token = token.clone();
          calls.push(async move { h.post("linear", &token, &list(i)).await.status() });
      }
      let statuses = futures::future::join_all(calls).await;
      assert!(statuses.iter().all(|s| *s == 200), "{statuses:?}");
      assert_eq!(fake.with(|r| r.refreshes), 1);
      assert!(!fake.with(|r| r.reuse_detected));
      assert_eq!(h.status(&id), "ok");
  }

  /// Gateway spec §4.4: a refresh without a new refresh token keeps the old
  /// one, and the grant goes on refreshing with it.
  #[tokio::test]
  async fn a_refresh_without_a_new_refresh_token_keeps_the_old_one() {
      let (h, fake, id, token) = setup(
          Config {
              refresh_keeps_token: true,
              ..Config::default()
          },
          None,
      )
      .await;
      let before = grant(&h, &id);
      fake.expire_access();
      assert_eq!(h.post("linear", &token, &list(1)).await.status(), 200);
      let after = grant(&h, &id);
      assert_eq!(after.tokens.refresh_token, before.tokens.refresh_token);
      fake.expire_access();
      assert_eq!(h.post("linear", &token, &list(2)).await.status(), 200);
      assert_eq!(fake.with(|r| r.refreshes), 2);
  }

  /// Gateway spec §4.5: the vendor's refusal of a refresh is `needs_auth`.
  #[tokio::test]
  async fn a_refused_refresh_is_needs_auth() {
      let (h, fake, id, token) = setup(Config::default(), None).await;
      // The vendor revoked the grant: its refresh token no longer works.
      let stale = grant(&h, &id);
      fake.expire_access();
      assert_eq!(h.post("linear", &token, &list(1)).await.status(), 200);
      // Presenting the spent one again is reuse: the family is revoked.
      let refreshed = RefreshedGrant {
          tokens: &stale.tokens,
          expires_at: None,
          resource_param_accepted: true,
      };
      h.store
          .store_refreshed(&id, &grant(&h, &id), &refreshed, &h.key, unix_now())
          .unwrap();
      fake.expire_access();
      let response = h.post("linear", &token, &list(2)).await;
      assert_eq!(response.status(), 502);
      let body: serde_json::Value = response.json().await.unwrap();
      assert_eq!(body["code"], "upstream_auth");
      assert!(fake.with(|r| r.reuse_detected));
      assert_eq!(h.status(&id), "needs_auth");
  }

  /// Gateway spec §4.5: a token endpoint that does not answer in time is no
  /// reason to sign in again: 502 `upstream_unreachable`, status untouched.
  #[tokio::test]
  async fn an_unreachable_token_endpoint_is_not_needs_auth() {
      let (h, fake, id, token) = setup_with(
          Config {
              gate_token: true,
              ..Config::default()
          },
          None,
          |r| r.with_refresh_timeout(Duration::from_millis(300)),
      )
      .await;
      fake.expire_access();
      let started = std::time::Instant::now();
      let response = h.post("linear", &token, &list(1)).await;
      // The refresh's own bound ended it, not a request's 15 s timeout.
      assert!(started.elapsed() < Duration::from_secs(5), "{:?}", started.elapsed());
      assert_eq!(response.status(), 502);
      let body: serde_json::Value = response.json().await.unwrap();
      assert_eq!(body["code"], "upstream_unreachable");
      assert_ne!(h.status(&id), "needs_auth");
  }

  /// Gateway spec §4.4, §4.5: concurrent requests with a token about to
  /// expire refresh it once; the ones that waited for the lock find it fresh.
  #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
  async fn concurrent_requests_near_expiry_refresh_once() {
      let (h, fake, id, token) = setup(Config::default(), Some(unix_now() + 60)).await;
      let mut calls = Vec::new();
      for i in 0..8 {
          let h = &h;
          let token = token.clone();
          calls.push(async move { h.post("linear", &token, &list(i)).await.status() });
      }
      let statuses = futures::future::join_all(calls).await;
      assert!(statuses.iter().all(|s| *s == 200), "{statuses:?}");
      assert_eq!(fake.with(|r| r.refreshes), 1);
      assert!(!fake.with(|r| r.reuse_detected));
      assert!(fake.is_live(&grant(&h, &id).tokens.access_token));
  }

  /// Gateway spec §4.5: a refresh the vendor answered but that could not be
  /// stored is 502 `credential_unsaved`, without `needs_auth`.
  #[tokio::test]
  async fn an_unsaved_refresh_is_not_needs_auth() {
      let (h, fake, id, token) = setup(Config::default(), None).await;
      h.raw()
          .execute_batch(
              "CREATE TRIGGER no_refresh BEFORE UPDATE ON gw_credentials
               BEGIN SELECT RAISE(ABORT, 'disk full'); END;",
          )
          .unwrap();
      fake.expire_access();
      let response = h.post("linear", &token, &list(1)).await;
      assert_eq!(response.status(), 502);
      let body: serde_json::Value = response.json().await.unwrap();
      assert_eq!(body["code"], "credential_unsaved");
      assert_ne!(h.status(&id), "needs_auth");
  }

  /// Gateway spec §4.5 and §11 (G-11, G-12): a caller that goes away
  /// mid-refresh leaves the refresh running; it completes, persists the
  /// rotated grant, and sets no `needs_auth`.
  #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
  async fn a_caller_cancelled_mid_refresh_leaves_it_to_complete() {
      let (h, fake, id, token) = setup(
          Config {
              gate_token: true,
              ..Config::default()
          },
          None,
      )
      .await;
      let before = grant(&h, &id);
      fake.expire_access();
      let body = list(1);
      let request = h.post("linear", &token, &body);
      // The refresh has reached the token endpoint, and waits there.
      let waiting = async {
          until(|| token_requests(&fake) == 1).await;
      };
      tokio::select! {
          _ = request => panic!("the request answered while the refresh was held"),
          () = waiting => {}
      }
      // The caller went away (its future dropped); the vendor answers now.
      fake.open_gate();
      until(|| grant(&h, &id).tokens.refresh_token != before.tokens.refresh_token).await;
      assert!(fake.is_live(&grant(&h, &id).tokens.access_token));
      assert_ne!(h.status(&id), "needs_auth");
  }

  /// Gateway spec §4.4: an access token within 5 minutes of its expiry is
  /// refreshed before it is used, single-flight.
  #[tokio::test]
  async fn a_token_about_to_expire_is_refreshed_first() {
      let (h, fake, id, token) = setup(Config::default(), Some(unix_now() + 60)).await;
      let before = grant(&h, &id);
      assert_eq!(h.post("linear", &token, &list(1)).await.status(), 200);
      assert_eq!(fake.with(|r| r.refreshes), 1);
      let unauthorized = fake.paths().iter().filter(|p| *p == "/mcp").count();
      assert_eq!(unauthorized, 1, "one request, sent with the fresh token");
      assert_ne!(grant(&h, &id).tokens.access_token, before.tokens.access_token);
      // Not again: the new one is good for an hour.
      assert_eq!(h.post("linear", &token, &list(2)).await.status(), 200);
      assert_eq!(fake.with(|r| r.refreshes), 1);
  }

  /// Gateway spec §5.4: OAuth without a refresh token answers a 401 with
  /// `needs_auth` and 502, and sends no refresh.
  #[tokio::test]
  async fn a_grant_without_a_refresh_token_is_needs_auth_on_401() {
      let (h, fake, id, token) = setup(Config::default(), None).await;
      let (access, _) = fake.issue();
      seed_grant(&h, &id, &fake, &access, None, None);
      fake.expire_access();
      let response = h.post("linear", &token, &list(1)).await;
      assert_eq!(response.status(), 502);
      assert_eq!(fake.with(|r| r.refreshes), 0);
      assert_eq!(h.status(&id), "needs_auth");
  }

  /// Plan 8f decision 9 (G-13, G-14): a refresh that finishes after an
  /// edit deleted the grant never writes it back.
  #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
  async fn a_late_refresh_never_resurrects_a_deleted_grant() {
      let (h, fake, id, token) = setup(
          Config {
              gate_token: true,
              ..Config::default()
          },
          None,
      )
      .await;
      fake.expire_access();
      let request = tokio::spawn({
          let client = h.client.clone();
          let url = h.url("linear");
          let token = token.clone();
          async move {
              client
                  .post(url)
                  .bearer_auth(token)
                  .header("content-type", "application/json")
                  .body(list(1).to_string())
                  .send()
                  .await
          }
      });
      until(|| token_requests(&fake) == 1).await;
      // An edit to another origin deletes the grant, in its own transaction
      // (the API would wait for the lock; the store's compare-and-swap is
      // what stops a writer that cannot).
      h.store
          .update(
              &id,
              &hennery_gateway::model::ConnectionPatch {
                  url: Some("https://elsewhere.example/mcp".into()),
                  ..Default::default()
              },
              unix_now(),
          )
          .unwrap();
      fake.open_gate();
      let _ = request.await;
      assert!(h.store.oauth_credential(&id, &h.key).unwrap().is_none());
      assert!(!h.store.connection(&id).unwrap().unwrap().has_credential);
      assert_eq!(Status::parse(&h.status(&id)), Some(Status::NotConnected));
  }

  /// The 8d seam's every outcome, by what the proxy answered: retried (200),
  /// not refreshable and refused (502 `upstream_auth`, `needs_auth`),
  /// unavailable (502 `upstream_unreachable`) and unsaved (502
  /// `credential_unsaved`) are each pinned above; this pins that a static
  /// connection's 401 is still `needs_auth` without a refresh.
  #[tokio::test]
  async fn a_static_connection_s_401_is_not_refreshed() {
      let (h, fake, _, token) = setup(Config::default(), None).await;
      let id = h.connection("static", &fake.mcp_url(), CredKind::Static);
      h.mount(&id, &["host-a"]);
      h.set_token(&id, "not-a-live-token");
      let response = h.post("static", &token, &list(1)).await;
      assert_eq!(response.status(), 502);
      assert_eq!(fake.with(|r| r.refreshes), 0);
      assert_eq!(h.status(&id), "needs_auth");
  }

  /// Gateway spec §4.3, §4.4: a refresh the server refuses for `resource`
  /// is sent once more without it; that is recorded, and the next refresh
  /// omits it.
  #[tokio::test]
  async fn a_refresh_is_retried_once_without_resource() {
      let (h, fake, id, token) = setup(
          Config {
              refuse_resource_at_token: true,
              ..Config::default()
          },
          None,
      )
      .await;
      fake.expire_access();
      assert_eq!(h.post("linear", &token, &list(1)).await.status(), 200);
      assert!(!grant(&h, &id).resource_param_accepted);
      fake.expire_access();
      assert_eq!(h.post("linear", &token, &list(2)).await.status(), 200);
      assert_eq!(
          fake.with(|r| r.token_resources.clone()),
          [
              ("refresh_token".to_string(), Some(fake.mcp_url())),
              ("refresh_token".to_string(), None),
              ("refresh_token".to_string(), None),
          ]
      );
  }

  /// Plan 8f decision 9 (G-13): a refresh that finishes after a newer
  /// grant was stored leaves the newer one.
  #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
  async fn a_late_refresh_never_overwrites_a_newer_grant() {
      let (h, fake, id, token) = setup(
          Config {
              gate_token: true,
              ..Config::default()
          },
          None,
      )
      .await;
      fake.expire_access();
      let request = tokio::spawn({
          let client = h.client.clone();
          let url = h.url("linear");
          let token = token.clone();
          async move {
              client
                  .post(url)
                  .bearer_auth(token)
                  .header("content-type", "application/json")
                  .body(list(1).to_string())
                  .send()
                  .await
          }
      });
      until(|| token_requests(&fake) == 1).await;
      // A Connect completed meanwhile (without the lock: the store's
      // compare-and-swap is what stops the late write).
      seed_grant(&h, &id, &fake, "newer-access", Some("newer-refresh"), None);
      fake.open_gate();
      let _ = request.await;
      assert_eq!(grant(&h, &id).tokens.access_token.as_str(), "newer-access");
  }

  /// Gateway spec §4.6: a path-only edit keeps the grant, so a refresh that
  /// finishes after one keeps the rotated token (else the spent one would be
  /// all that is left).
  #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
  async fn a_refresh_across_a_path_edit_keeps_the_rotated_token() {
      let (h, fake, id, token) = setup(
          Config {
              gate_token: true,
              ..Config::default()
          },
          None,
      )
      .await;
      let before = grant(&h, &id);
      fake.expire_access();
      let request = tokio::spawn({
          let client = h.client.clone();
          let url = h.url("linear");
          let token = token.clone();
          async move {
              client
                  .post(url)
                  .bearer_auth(token)
                  .header("content-type", "application/json")
                  .body(list(1).to_string())
                  .send()
                  .await
          }
      });
      until(|| token_requests(&fake) == 1).await;
      h.store
          .update(
              &id,
              &hennery_gateway::model::ConnectionPatch {
                  url: Some(format!("{}/mcp/", fake.origin())),
                  ..Default::default()
              },
              unix_now(),
          )
          .unwrap();
      fake.open_gate();
      let _ = request.await;
      let after = grant(&h, &id);
      assert_ne!(after.tokens.refresh_token, before.tokens.refresh_token);
      assert!(fake.is_live(&after.tokens.access_token));
  }

  /// Gateway spec §4.5: a token endpoint answering 5xx is unavailable, not a
  /// refusal.
  #[tokio::test]
  async fn a_failing_token_endpoint_is_not_needs_auth() {
      // A 5xx, and a 429 (rate limited: not the vendor refusing the grant).
      for status in [503, 429] {
          let (h, fake, id, token) = setup(
              Config {
                  token_status: Some(status),
                  ..Config::default()
              },
              None,
          )
          .await;
          fake.expire_access();
          let response = h.post("linear", &token, &list(1)).await;
          let body: serde_json::Value = response.json().await.unwrap();
          assert_eq!(body["code"], "upstream_unreachable", "{status}");
          assert_ne!(h.status(&id), "needs_auth", "{status}");
      }
  }

  /// Move `id` to fake `b`'s origin behind the API (its grant is deleted:
  /// gateway spec §4.6), and give it a grant from `b`: what an origin edit
  /// and a completed Connect leave while a refresh runs. `b`'s access token.
  fn moved_to(h: &Harness, id: &str, b: &FakeAs) -> String {
      h.store
          .update(
              id,
              &hennery_gateway::model::ConnectionPatch {
                  url: Some(b.mcp_url()),
                  ..Default::default()
              },
              unix_now(),
          )
          .unwrap();
      let (access, refresh) = b.issue();
      seed_grant(h, id, b, &access, Some(&refresh), None);
      access
  }

  /// Gateway spec §4.5, §5.4: the retry after a 401 goes only where the
  /// token it carries was granted for. A refresh that loses its
  /// compare-and-swap reads the grant there is now; when that grant is for
  /// another URL (an origin edit and a new Connect meanwhile), its token is
  /// never sent to the old one: 502 `upstream_changed`, no `needs_auth`.
  #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
  async fn a_retry_never_sends_another_url_s_token() {
      let (h, a, id, token) = setup(
          Config {
              gate_token: true,
              ..Config::default()
          },
          None,
      )
      .await;
      // Its tokens are named apart from `a`'s.
      let b = FakeAs::start(Config {
          prefix: "b-".into(),
          ..Config::default()
      })
      .await;
      a.expire_access();
      let request = tokio::spawn({
          let client = h.client.clone();
          let url = h.url("linear");
          let token = token.clone();
          async move {
              client
                  .post(url)
                  .bearer_auth(token)
                  .header("content-type", "application/json")
                  .body(list(1).to_string())
                  .send()
                  .await
                  .unwrap()
          }
      });
      // The 401's refresh is at `a`'s token endpoint, held there.
      until(|| token_requests(&a) == 1).await;
      let b_access = moved_to(&h, &id, &b);
      a.open_gate();
      let response = request.await.unwrap();
      assert_eq!(response.status(), 502);
      let body: serde_json::Value = response.json().await.unwrap();
      assert_eq!(body["code"], "upstream_changed", "{body}");
      assert!(!a.with(|r| r.bearers.contains(&b_access)), "b's token went to a");
      assert_ne!(h.status(&id), "needs_auth");
  }

  /// The same for a refresh before use (gateway spec §4.4): the request goes
  /// with the URL and the token read together after the refresh, never the
  /// URL read before it with the token read after.
  #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
  async fn a_refresh_before_use_never_sends_another_url_s_token() {
      let (h, a, id, token) = setup(
          Config {
              gate_token: true,
              ..Config::default()
          },
          Some(unix_now() + 60),
      )
      .await;
      // Its tokens are named apart from `a`'s.
      let b = FakeAs::start(Config {
          prefix: "b-".into(),
          ..Config::default()
      })
      .await;
      let request = tokio::spawn({
          let client = h.client.clone();
          let url = h.url("linear");
          let token = token.clone();
          async move {
              client
                  .post(url)
                  .bearer_auth(token)
                  .header("content-type", "application/json")
                  .body(list(1).to_string())
                  .send()
                  .await
                  .unwrap()
          }
      });
      until(|| token_requests(&a) == 1).await;
      let b_access = moved_to(&h, &id, &b);
      a.open_gate();
      let response = request.await.unwrap();
      assert!(!a.with(|r| r.bearers.contains(&b_access)), "b's token went to a");
      // It went to `b`, with `b`'s token: what a request after the edit does.
      assert_eq!(response.status(), 200);
      assert_eq!(b.with(|r| r.bearers.clone()), [b_access]);
  }

  /// Start a request whose 401 refresh waits for the connection's lock,
  /// which the test holds; `change` runs once the upstream has answered 401.
  async fn while_a_401_waits(h: &Harness, a: &FakeAs, token: &str, change: impl FnOnce()) -> reqwest::Response {
      let id = h.store.list().unwrap()[0].id.clone();
      let held = h.runtime.lock(&id).await;
      a.expire_access();
      let request = tokio::spawn({
          let client = h.client.clone();
          let url = h.url("linear");
          let token = token.to_string();
          async move {
              client
                  .post(url)
                  .bearer_auth(token)
                  .header("content-type", "application/json")
                  .body(list(1).to_string())
                  .send()
                  .await
                  .unwrap()
          }
      });
      until(|| a.with(|r| !r.bearers.is_empty())).await;
      change();
      drop(held);
      request.await.unwrap()
  }

  /// A grant gone by the time the refresh holds the lock: nothing to
  /// refresh, so the 401 stands: `needs_auth`, 502 `upstream_auth`.
  #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
  async fn a_grant_gone_before_its_refresh_is_needs_auth() {
      let (h, a, id, token) = setup(Config::default(), None).await;
      let response = while_a_401_waits(&h, &a, &token, || {
          h.raw()
              .execute("DELETE FROM gw_credentials WHERE connection_id = ?1", [&id])
              .unwrap();
      })
      .await;
      assert_eq!(response.status(), 502);
      let body: serde_json::Value = response.json().await.unwrap();
      assert_eq!(body["code"], "upstream_auth");
      assert_eq!(a.with(|r| r.refreshes), 0);
      assert_eq!(h.status(&id), "needs_auth");
  }

  /// A grant that no longer opens when the refresh reads it: the gateway's
  /// failure, not the vendor's: 502 `credential_unsaved`, no `needs_auth`.
  #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
  async fn a_grant_that_does_not_open_at_its_refresh_is_not_needs_auth() {
      let (h, a, id, token) = setup(Config::default(), None).await;
      let response = while_a_401_waits(&h, &a, &token, || {
          h.raw()
              .execute(
                  "UPDATE gw_credentials SET ciphertext = x'00' WHERE connection_id = ?1",
                  [&id],
              )
              .unwrap();
      })
      .await;
      assert_eq!(response.status(), 502);
      let body: serde_json::Value = response.json().await.unwrap();
      assert_eq!(body["code"], "credential_unsaved");
      assert_eq!(a.with(|r| r.refreshes), 0);
      assert_ne!(h.status(&id), "needs_auth");
  }

  /// A grant due for refresh without a refresh token is used as it is, and
  /// its requests do not queue on the connection's lock for a refresh that
  /// cannot happen (gateway spec §4.4).
  #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
  async fn an_unrefreshable_grant_does_not_wait_for_the_lock() {
      let (h, a, id, token) = setup(Config::default(), None).await;
      let (access, _) = a.issue();
      seed_grant(&h, &id, &a, &access, None, Some(unix_now() + 60));
      let _held = h.runtime.lock(&id).await;
      let response = tokio::time::timeout(Duration::from_secs(5), h.post("linear", &token, &list(1)))
          .await
          .expect("the request waited for the lock");
      assert_eq!(response.status(), 200);
      assert_eq!(a.with(|r| r.refreshes), 0);
  }

  /// The same for the allowance (plan 8d decision 9): a connection unmarked
  /// "internal network" and connected again while its refresh ran is not
  /// retried with the internal network's client.
  #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
  async fn a_retry_keeps_the_allowance_it_was_read_with() {
      let (h, a, id, token) = setup(
          Config {
              gate_token: true,
              ..Config::default()
          },
          None,
      )
      .await;
      a.expire_access();
      let request = tokio::spawn({
          let client = h.client.clone();
          let url = h.url("linear");
          let token = token.clone();
          async move {
              client
                  .post(url)
                  .bearer_auth(token)
                  .header("content-type", "application/json")
                  .body(list(1).to_string())
                  .send()
                  .await
                  .unwrap()
          }
      });
      until(|| token_requests(&a) == 1).await;
      // The fake is on loopback, which the API keeps marked internal: the
      // test steps around that rule, as an edit to a public URL would not.
      let unmarked = h
          .raw()
          .execute("UPDATE gw_connections SET internal_network = 0 WHERE id = ?1", [&id])
          .unwrap();
      assert_eq!(unmarked, 1);
      let (access, refresh) = a.issue();
      seed_grant(&h, &id, &a, &access, Some(&refresh), None);
      a.open_gate();
      let response = request.await.unwrap();
      assert_eq!(response.status(), 502);
      let body: serde_json::Value = response.json().await.unwrap();
      assert_eq!(body["code"], "upstream_changed", "{body}");
      assert_eq!(a.with(|r| r.bearers.len()), 1, "no retry");
  }

  /// Decision 13 on the path production takes: an origin edit and a new
  /// Connect each take the connection's lock, so they land before the 401's
  /// refresh holds it, never during. The refresh then finds another token
  /// than the one that failed and sends nothing to the vendor; that token is
  /// for another URL, so it is not retried: 502 `upstream_changed`, no
  /// `needs_auth`, and the old upstream never sees it.
  #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
  async fn a_token_connected_elsewhere_before_the_refresh_is_not_retried() {
      let (h, a, id, token) = setup(Config::default(), None).await;
      // Its tokens are named apart from `a`'s.
      let b = FakeAs::start(Config {
          prefix: "b-".into(),
          ..Config::default()
      })
      .await;
      let mut b_access = String::new();
      let response = while_a_401_waits(&h, &a, &token, || b_access = moved_to(&h, &id, &b)).await;
      assert_eq!(response.status(), 502);
      let body: serde_json::Value = response.json().await.unwrap();
      assert_eq!(body["code"], "upstream_changed", "{body}");
      assert_eq!(
          token_requests(&a),
          0,
          "the refresh sent nothing: another token was there"
      );
      assert!(!a.with(|r| r.bearers.contains(&b_access)), "b's token went to a");
      assert!(b.with(|r| r.bearers.is_empty()), "nothing was retried at b either");
      assert_ne!(h.status(&id), "needs_auth");
  }
  ```

In `crates/hennery-gateway/tests/open.rs`, replace:

  ```rust
  use hennery_gateway::key::{KEY_FILE, KeySource};
  use hennery_gateway::model::{Change, CredKind, NewConnection};
  use hennery_gateway::{KeyUnavailable, open};
  ```

with:

  ```rust
  use hennery_gateway::api::GatewayState;
  use hennery_gateway::key::{KEY_FILE, KeySource};
  use hennery_gateway::model::{Change, CredKind, NewConnection};
  use hennery_gateway::notify::Silent;
  use hennery_gateway::{KeyUnavailable, open};
  use hennery_kernel::egress::{Egress, Timeouts};
  ```

In `crates/hennery-gateway/tests/open.rs`, replace:

  ```rust

  #[test]
  ```

with:

  ```rust

  /// `open` as the collector calls it, with an egress policy and nobody to
  /// tell.
  fn start(db: &Path, dir: &Path, operator: &Arc<Operator>) -> anyhow::Result<GatewayState> {
      open(
          db,
          &keys(dir),
          operator.clone(),
          Egress::new(Timeouts::DEFAULT).unwrap(),
          Arc::new(Silent),
      )
  }

  #[test]
  ```

In `crates/hennery-gateway/tests/open.rs`, replace:

  ```rust
      let gateway = open(&db, &keys(dir.path()), operator.clone()).unwrap();
  ```

with:

  ```rust
      let gateway = start(&db, dir.path(), &operator).unwrap();
  ```

In `crates/hennery-gateway/tests/open.rs`, replace:

  ```rust
      let Change::Done(record) = gateway.store.create(&new, 1).unwrap() else {
          panic!("not created");
      };
      gateway
          .store
          .set_static_credential(&record.id, "tok", &gateway.key, 1)
          .unwrap();
      drop(gateway);
      // Opened again: the same key opens the credential.
      open(&db, &keys(dir.path()), operator.clone()).unwrap();

      // Another key, then none.
      std::fs::write(dir.path().join(KEY_FILE), [9u8; 32]).unwrap();
      let err = open(&db, &keys(dir.path()), operator.clone()).err().unwrap();
      assert!(err.is::<KeyUnavailable>(), "{err:#}");
      std::fs::remove_file(dir.path().join(KEY_FILE)).unwrap();
      let err = open(&db, &keys(dir.path()), operator.clone()).err().unwrap();
  ```

with:

  ```rust
      let Change::Done(record) = gateway.runtime.store.create(&new, 1).unwrap() else {
          panic!("not created");
      };
      gateway
          .runtime
          .store
          .set_static_credential(&record.id, "tok", &gateway.runtime.key, 1)
          .unwrap();
      drop(gateway);
      // Opened again: the same key opens the credential.
      start(&db, dir.path(), &operator).unwrap();

      // Another key, then none.
      std::fs::write(dir.path().join(KEY_FILE), [9u8; 32]).unwrap();
      let err = start(&db, dir.path(), &operator).err().unwrap();
      assert!(err.is::<KeyUnavailable>(), "{err:#}");
      std::fs::remove_file(dir.path().join(KEY_FILE)).unwrap();
      let err = start(&db, dir.path(), &operator).err().unwrap();
  ```

In `crates/hennery-gateway/tests/open.rs`, replace:

  ```rust
      let err = open(
          &dir.path().join("no-such-dir").join("hennery.db"),
          &keys(dir.path()),
          operator,
  ```

with:

  ```rust
      let err = start(
          &dir.path().join("no-such-dir").join("hennery.db"),
          dir.path(),
          &operator,
  ```

Create `crates/hennery-gateway/tests/probe.rs`:

  ```rust
  //! The health probe and the `Notifier` (gateway spec §7; plan 8f): a real
  //! MCP handshake through the proxy's forwarding path, each verdict's
  //! status, the background loop's panic isolation and per-tick timeout, and
  //! alerts on transitions only, a problem at startup announced once.

  mod support;

  use hennery_gateway::model::{CredKind, Status, StatusChange};
  use hennery_gateway::notify::{self, Alert, ConnectionAlert, GENERIC_TITLE, Notifier};
  use hennery_gateway::probe::{self, Verdict};
  use hennery_gateway::proxy::Limits;
  use hennery_kernel::push::Urgency;
  use hennery_kernel::secret::unix_now;
  use std::sync::Arc;
  use std::sync::atomic::{AtomicUsize, Ordering};
  use std::time::Duration;
  use support::oauth::{Config, FakeAs, seed_grant};
  use support::upstream::Harness;

  async fn setup(config: Config) -> (Harness, FakeAs, String) {
      let h = Harness::with(Limits::default(), |r| r).await;
      let fake = FakeAs::start(config).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let (access, refresh) = fake.issue();
      seed_grant(&h, &id, &fake, &access, Some(&refresh), None);
      (h, fake, id)
  }

  async fn probe(h: &Harness, id: &str) -> Verdict {
      let connection = h.proxy_store.connection_by_id(id).unwrap().unwrap();
      probe::probe_now(&h.runtime, &connection).await
  }

  fn set_status(h: &Harness, id: &str, status: Status) {
      let url = h.store.connection(id).unwrap().unwrap().url;
      h.proxy_store
          .record_status(id, &url, status, Some("before"), 1)
          .unwrap();
  }

  /// Gateway spec §7 (G-21): `initialize`, `notifications/initialized` and
  /// `tools/list` on that session, then `DELETE`; all 2xx is `ok`.
  #[tokio::test]
  async fn a_healthy_connection_probes_ok_with_a_whole_handshake() {
      // A stateful server: `tools/list` without the session is 400 (G-21).
      let (h, fake, id) = setup(Config {
          stateful: true,
          ..Config::default()
      })
      .await;
      set_status(&h, &id, Status::Error);
      assert_eq!(probe(&h, &id).await, Verdict::Ok);
      let mcp: Vec<String> = fake
          .with(|r| r.requests.clone())
          .into_iter()
          .filter(|(_, path)| path == "/mcp")
          .map(|(method, _)| method)
          .collect();
      assert_eq!(mcp, ["POST", "POST", "POST", "DELETE"]);
      let record = h.store.connection(&id).unwrap().unwrap();
      assert_eq!(record.status, "ok");
      assert_eq!(record.status_note, None);
      assert!(record.checked_at.unwrap() >= unix_now() - 5);
      assert_eq!(h.alerts.alerts(), [(id, Alert::Recovered)]);
  }

  /// Gateway spec §7: a 401 after one single-flight refresh is `needs_auth`.
  #[tokio::test]
  async fn a_refused_credential_probes_needs_auth_after_one_refresh() {
      let (h, fake, id) = setup(Config {
          mcp_status: Some(401),
          ..Config::default()
      })
      .await;
      assert_eq!(probe(&h, &id).await, Verdict::NeedsAuth);
      assert_eq!(fake.with(|r| r.refreshes), 1);
      assert_eq!(h.status(&id), "needs_auth");
      assert!(h.store.connection(&id).unwrap().unwrap().checked_at.is_some());
      assert_eq!(h.alerts.alerts(), [(id, Alert::NeedsAuth)]);
  }

  /// Gateway spec §7: a 5xx is `error`, with a note, and its alert never asks
  /// to reconnect (G-22).
  #[tokio::test]
  async fn a_failing_upstream_probes_error() {
      let (h, _fake, id) = setup(Config {
          mcp_status: Some(503),
          ..Config::default()
      })
      .await;
      set_status(&h, &id, Status::Ok);
      assert_eq!(
          probe(&h, &id).await,
          Verdict::Error("the upstream answered HTTP 503".into())
      );
      let record = h.store.connection(&id).unwrap().unwrap();
      assert_eq!(record.status, "error");
      assert_eq!(record.status_note.as_deref(), Some("the upstream answered HTTP 503"));
      assert_eq!(h.alerts.alerts(), [(id, Alert::Failing)]);
  }

  /// Gateway spec §7: a transport failure is `error`.
  #[tokio::test]
  async fn an_unreachable_upstream_probes_error() {
      let (h, fake, id) = setup(Config::default()).await;
      let url = fake.mcp_url();
      drop(fake);
      // The grant's URL is the fake's; nothing listens there now.
      assert_eq!(h.store.connection(&id).unwrap().unwrap().url, url);
      assert_eq!(
          probe(&h, &id).await,
          Verdict::Error("the upstream could not be reached".into())
      );
      assert_eq!(h.status(&id), "error");
  }

  /// Gateway spec §7: any other 4xx changes nothing, but `checked_at` moves.
  #[tokio::test]
  async fn another_4xx_changes_nothing() {
      let (h, _fake, id) = setup(Config {
          mcp_status: Some(404),
          ..Config::default()
      })
      .await;
      set_status(&h, &id, Status::Ok);
      let before = h.store.connection(&id).unwrap().unwrap();
      assert_eq!(probe(&h, &id).await, Verdict::NoChange);
      let after = h.store.connection(&id).unwrap().unwrap();
      assert_eq!((after.status.as_str(), after.status_at), ("ok", before.status_at));
      assert!(after.checked_at > before.checked_at);
      assert!(h.alerts.alerts().is_empty());
  }

  /// Each remaining verdict: a redirect is `error` (the proxy would answer
  /// 502 too); a 401 whose refresh cannot reach the authorization server is
  /// `error`, not `needs_auth`; a probe past its bound is `error`.
  #[tokio::test]
  async fn a_redirect_an_unreachable_refresh_or_a_timeout_probes_error() {
      let (h, _fake, id) = setup(Config {
          mcp_status: Some(302),
          ..Config::default()
      })
      .await;
      assert_eq!(
          probe(&h, &id).await,
          Verdict::Error("the upstream answered with a redirect".into())
      );
      let (h, fake, id) = setup(Config {
          token_status: Some(503),
          ..Config::default()
      })
      .await;
      fake.expire_access();
      assert_eq!(
          probe(&h, &id).await,
          Verdict::Error("the authorization server could not be reached to refresh the grant".into())
      );
      assert_eq!(h.status(&id), "error");
      let h = Harness::with(Limits::default(), |r| r.with_probe_timeout(Duration::from_millis(200))).await;
      let fake = FakeAs::start(Config {
          mcp_hang: true,
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let (access, refresh) = fake.issue();
      seed_grant(&h, &id, &fake, &access, Some(&refresh), None);
      assert_eq!(probe(&h, &id).await, Verdict::Error("the probe timed out".into()));
      assert_eq!(h.status(&id), "error");
  }

  /// A connection without a credential sends nothing.
  #[tokio::test]
  async fn a_connection_without_a_credential_is_not_probed() {
      let h = Harness::with(Limits::default(), |r| r).await;
      let fake = FakeAs::start(Config::default()).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      assert_eq!(probe(&h, &id).await, Verdict::NoCredential);
      assert!(fake.paths().is_empty());
  }

  /// Gateway spec §7: the background probe takes OAuth connections with a
  /// grant only.
  #[tokio::test]
  async fn the_background_probe_takes_oauth_connections_with_a_grant_only() {
      let (h, fake, id) = setup(Config::default()).await;
      let bare = h.connection("bare", &fake.mcp_url(), CredKind::OauthClient);
      let fixed = h.connection("fixed", &fake.mcp_url(), CredKind::Static);
      h.set_token(&fixed, "tok");
      let public = h.connection("public", &fake.mcp_url(), CredKind::None);
      let targets: Vec<String> = h
          .proxy_store
          .probe_targets()
          .unwrap()
          .into_iter()
          .map(|c| c.id)
          .collect();
      assert_eq!(targets, std::slice::from_ref(&id));
      for other in [bare, fixed, public] {
          assert!(!targets.contains(&other));
      }
      probe::tick(&h.runtime).await;
      assert_eq!(h.status(&id), "ok");
  }

  /// api-8e-8f B6: single-flight, and within 10 s a completed probe's result
  /// stands without a new request.
  #[tokio::test]
  async fn a_probe_within_ten_seconds_reuses_the_last() {
      let (h, fake, id) = setup(Config::default()).await;
      assert_eq!(probe(&h, &id).await, Verdict::Ok);
      let sent = fake.paths().len();
      let (a, b) = tokio::join!(probe(&h, &id), probe(&h, &id));
      assert_eq!((a, b), (Verdict::Ok, Verdict::Ok));
      assert_eq!(fake.paths().len(), sent, "no new request");
  }

  /// Gateway spec §7: a tick that hangs past its timeout is abandoned, and
  /// the loop goes on to the next.
  #[tokio::test]
  async fn a_hung_tick_is_abandoned_and_the_loop_goes_on() {
      let (h, fake, _id) = setup(Config {
          mcp_hang: true,
          ..Config::default()
      })
      .await;
      let (stop, stopped) = tokio::sync::oneshot::channel::<()>();
      let loop_task = tokio::spawn(probe::run(
          h.runtime.clone(),
          Duration::from_millis(20),
          Duration::from_millis(200),
          async move {
              let _ = stopped.await;
          },
      ));
      let initializes = || fake.with(|r| r.requests.iter().filter(|(m, p)| m == "POST" && p == "/mcp").count());
      for _ in 0..500 {
          if initializes() >= 2 {
              break;
          }
          tokio::time::sleep(Duration::from_millis(10)).await;
      }
      assert!(initializes() >= 2, "a second tick ran");
      stop.send(()).unwrap();
      tokio::time::timeout(Duration::from_secs(5), loop_task)
          .await
          .unwrap()
          .unwrap();
  }

  /// A `Notifier` that panics: the tick that called it fails, not the loop.
  struct Panics(AtomicUsize);

  impl Notifier for Panics {
      fn notify(&self, _alert: &ConnectionAlert) {
          self.0.fetch_add(1, Ordering::SeqCst);
          panic!("a notifier that panics");
      }
  }

  /// Gateway spec §7: panic isolation: a tick that panics is logged, and the
  /// next tick runs.
  #[tokio::test]
  async fn a_tick_that_panics_does_not_end_the_loop() {
      let panics = Arc::new(Panics(AtomicUsize::new(0)));
      let notifier = panics.clone();
      let h = Harness::with(Limits::default(), move |r| {
          hennery_gateway::runtime::Runtime::new(
              r.store.clone(),
              r.statuses.clone(),
              r.key.clone(),
              r.egress.clone(),
              notifier,
          )
      })
      .await;
      let fake = FakeAs::start(Config {
          mcp_status: Some(503),
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let (access, refresh) = fake.issue();
      seed_grant(&h, &id, &fake, &access, Some(&refresh), None);
      let (stop, stopped) = tokio::sync::oneshot::channel::<()>();
      let loop_task = tokio::spawn(probe::run(
          h.runtime.clone(),
          Duration::from_millis(20),
          Duration::from_secs(5),
          async move {
              let _ = stopped.await;
          },
      ));
      // The first tick's `error` transition panics in the notifier; the
      // probes after it must still run (and find no transition to tell).
      let posts = || fake.with(|r| r.requests.iter().filter(|(m, p)| m == "POST" && p == "/mcp").count());
      for _ in 0..500 {
          if panics.0.load(Ordering::SeqCst) >= 1 && posts() >= 2 {
              break;
          }
          tokio::time::sleep(Duration::from_millis(10)).await;
      }
      assert!(panics.0.load(Ordering::SeqCst) >= 1);
      assert!(posts() >= 2, "a tick ran after the one that panicked");
      stop.send(()).unwrap();
      tokio::time::timeout(Duration::from_secs(5), loop_task)
          .await
          .unwrap()
          .unwrap();
  }

  fn change(from: Status, to: Status) -> StatusChange {
      StatusChange {
          connection_id: "conn-1".into(),
          hat_id: "hat-1".into(),
          label: "Linear".into(),
          from,
          to,
      }
  }

  /// Gateway spec §7 (G-22): alerts on transitions into or out of a problem
  /// only; every outcome of the mapping.
  #[test]
  fn alerts_are_for_transitions_into_or_out_of_a_problem_only() {
      use Status::*;
      for (from, to, expected) in [
          (Ok, NeedsAuth, Some(Alert::NeedsAuth)),
          (NotConnected, NeedsAuth, Some(Alert::NeedsAuth)),
          (Error, NeedsAuth, Some(Alert::NeedsAuth)),
          (Ok, Error, Some(Alert::Failing)),
          (NeedsAuth, Error, Some(Alert::Failing)),
          (NeedsAuth, Ok, Some(Alert::Recovered)),
          (Error, Ok, Some(Alert::Recovered)),
          (NotConnected, Ok, None),
          (Ok, Ok, None),
          (Error, Error, None),
          (NeedsAuth, NeedsAuth, None),
          (Ok, NotConnected, None),
      ] {
          assert_eq!(Alert::of(&change(from, to)), expected, "{from:?} -> {to:?}");
      }
  }

  /// Lane L9: the push notice, as agreed with the push lane; `error`'s text
  /// never asks to reconnect.
  #[test]
  fn the_push_notice_is_the_agreed_one() {
      for (alert, body) in [
          (Alert::NeedsAuth, "needs sign-in again"),
          (Alert::Failing, "is failing"),
          (Alert::Recovered, "is working again"),
      ] {
          let notice = notify::notice(&ConnectionAlert {
              connection_id: "conn-1".into(),
              hat_id: "hat-1".into(),
              label: "Linear".into(),
              alert,
          });
          assert_eq!(notice.hat_id, "hat-1");
          assert_eq!(notice.urgency, Urgency::Normal);
          assert_eq!(notice.title, "Linear");
          assert_eq!(notice.generic_title, GENERIC_TITLE);
          assert_eq!(notice.generic_title, "An MCP connection needs attention");
          assert_eq!(notice.body, body);
          assert_eq!(notice.detail, None);
          assert_eq!(notice.url, "/mcp");
          assert_eq!(notice.tag, "mcp-conn-1");
      }
      let failing = Alert::Failing.body().to_ascii_lowercase();
      assert!(!failing.contains("connect") && !failing.contains("sign"), "{failing}");
  }

  /// Gateway spec §7: a problem present at startup is announced once; a
  /// probe that finds it unchanged says nothing more.
  #[tokio::test]
  async fn a_problem_at_startup_is_announced_once() {
      let (h, _fake, id) = setup(Config {
          mcp_status: Some(503),
          ..Config::default()
      })
      .await;
      set_status(&h, &id, Status::Error);
      let ok = h.connection("fine", "http://127.0.0.1:9/mcp", CredKind::None);
      h.runtime.announce_startup().unwrap();
      assert_eq!(h.alerts.alerts(), [(id.clone(), Alert::Failing)]);
      assert!(!h.alerts.alerts().iter().any(|(c, _)| *c == ok));
      assert_eq!(
          probe(&h, &id).await,
          Verdict::Error("the upstream answered HTTP 503".into())
      );
      assert_eq!(h.alerts.alerts().len(), 1, "no re-post on an unchanged problem");
  }

  /// Gateway spec §7: what a startup announces is every connection in
  /// `needs_auth` or `error`, and only those; an `ok` or `not_connected` one
  /// is not a problem to hear of.
  #[tokio::test]
  async fn startup_problems_are_the_needs_auth_and_error_connections_only() {
      let (h, _fake, failing) = setup(Config::default()).await;
      set_status(&h, &failing, Status::Error);
      let refused = h.connection("refused", "http://127.0.0.1:9/a", CredKind::None);
      set_status(&h, &refused, Status::NeedsAuth);
      let ok = h.connection("fine", "http://127.0.0.1:9/b", CredKind::None);
      set_status(&h, &ok, Status::Ok);
      h.connection("fresh", "http://127.0.0.1:9/c", CredKind::None);
      // Created in the same second: their order is by id, which is random.
      let mut problems: Vec<(String, &str)> = h
          .proxy_store
          .problems()
          .unwrap()
          .into_iter()
          .map(|change| (change.connection_id, change.to.as_str()))
          .collect();
      problems.sort();
      let mut expected = vec![(failing, "error"), (refused, "needs_auth")];
      expected.sort();
      assert_eq!(problems, expected);
  }

  /// Gateway spec §7: a probe that fails in the gateway itself (a refreshed
  /// grant it could not store) concludes nothing about the upstream: no
  /// status change.
  #[tokio::test]
  async fn a_probe_the_gateway_fails_changes_nothing() {
      let (h, fake, id) = setup(Config::default()).await;
      set_status(&h, &id, Status::Ok);
      h.raw()
          .execute_batch(
              "CREATE TRIGGER no_refresh BEFORE UPDATE ON gw_credentials
               BEGIN SELECT RAISE(ABORT, 'disk full'); END;",
          )
          .unwrap();
      fake.expire_access();
      assert_eq!(probe(&h, &id).await, Verdict::NoChange);
      assert_eq!(h.status(&id), "ok");
      assert!(h.alerts.alerts().is_empty());
  }

  /// Decision 13 for the probe: a grant for another URL found by the 401's
  /// refresh is not sent, and concludes nothing about the upstream: no
  /// status change, no alert, and the old upstream never sees its token.
  #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
  async fn a_probe_whose_connection_moved_during_its_refresh_changes_nothing() {
      let (h, a, id) = setup(Config::default()).await;
      set_status(&h, &id, Status::Ok);
      let b = FakeAs::start(Config {
          prefix: "b-".into(),
          ..Config::default()
      })
      .await;
      let held = h.runtime.lock(&id).await;
      a.expire_access();
      let probing = tokio::spawn({
          let runtime = h.runtime.clone();
          let connection = h.proxy_store.connection_by_id(&id).unwrap().unwrap();
          async move { probe::probe_now(&runtime, &connection).await }
      });
      // The upstream answered 401: the refresh now waits for the lock.
      for _ in 0..1000 {
          if a.with(|r| !r.bearers.is_empty()) {
              break;
          }
          tokio::time::sleep(Duration::from_millis(10)).await;
      }
      assert!(a.with(|r| !r.bearers.is_empty()), "never sent");
      h.store
          .update(
              &id,
              &hennery_gateway::model::ConnectionPatch {
                  url: Some(b.mcp_url()),
                  ..Default::default()
              },
              unix_now(),
          )
          .unwrap();
      let (b_access, b_refresh) = b.issue();
      seed_grant(&h, &id, &b, &b_access, Some(&b_refresh), None);
      drop(held);
      assert_eq!(probing.await.unwrap(), Verdict::NoChange);
      assert!(!a.with(|r| r.bearers.contains(&b_access)), "b's token went to a");
      assert!(b.with(|r| r.bearers.is_empty()));
      assert!(h.alerts.alerts().is_empty());
  }
  ```

In `crates/hennery-gateway/tests/support/mod.rs`, replace:

  ```rust
  use hennery_gateway::revocation::Revocations;
  use hennery_gateway::scope::ProxyStore;
  use hennery_gateway::store::GatewayStore;
  use hennery_gateway::tokens;
  ```

with:

  ```rust
  use hennery_gateway::notify::{Alert, ConnectionAlert, Notifier};
  use hennery_gateway::revocation::Revocations;
  use hennery_gateway::runtime::Runtime;
  use hennery_gateway::scope::ProxyStore;
  use hennery_gateway::store::GatewayStore;
  use hennery_gateway::tokens;
  use hennery_kernel::egress::{Egress, Timeouts};
  ```

In `crates/hennery-gateway/tests/support/mod.rs`, replace:

  ```rust

      /// The gateway on this database, as the collector builds it: its
  ```

with:

  ```rust

      /// The runtime on this world's stores and key, sending through
      /// `egress`, telling `notifier` (plan 8f).
      pub fn runtime(&self, egress: Egress, notifier: Arc<dyn Notifier>) -> Arc<Runtime> {
          let mut runtime = Runtime::new(
              self.store.clone(),
              self.proxy_store.clone(),
              self.key.clone(),
              egress,
              notifier,
          );
          runtime.revocations = self.revocations.clone();
          Arc::new(runtime)
      }

      /// The gateway on this database, as the collector builds it: its
  ```

In `crates/hennery-gateway/tests/support/mod.rs`, replace:

  ```rust
              store: self.store.clone(),
              key: self.key.clone(),
              operator: Arc::new(Operator::open(&self.db).unwrap()),
              revocations: self.revocations.clone(),
  ```

with:

  ```rust
              runtime: self.runtime(test_egress(), Arc::new(hennery_gateway::notify::Silent)),
              operator: Arc::new(Operator::open(&self.db).unwrap()),
  ```

In `crates/hennery-gateway/tests/support/mod.rs`, replace:

  ```rust
          internal_network: true,
      }
  }
  ```

with:

  ```rust
          internal_network: true,
      }
  }

  /// An egress policy for loopback tests: short timeouts.
  pub fn test_egress() -> Egress {
      Egress::new(Timeouts {
          connect: std::time::Duration::from_secs(2),
          request: std::time::Duration::from_secs(10),
      })
      .unwrap()
  }

  /// A `Notifier` that keeps what it is told.
  #[derive(Default)]
  pub struct Recorder(pub std::sync::Mutex<Vec<ConnectionAlert>>);

  impl Notifier for Recorder {
      fn notify(&self, alert: &ConnectionAlert) {
          self.0.lock().unwrap().push(alert.clone());
      }
  }

  impl Recorder {
      pub fn alerts(&self) -> Vec<(String, Alert)> {
          self.0
              .lock()
              .unwrap()
              .iter()
              .map(|a| (a.connection_id.clone(), a.alert))
              .collect()
      }
  }
  ```

In `crates/hennery-gateway/tests/support/upstream.rs`, replace:

  ```rust
  use super::World;
  ```

with:

  ```rust
  use super::{Recorder, World, test_egress};
  ```

In `crates/hennery-gateway/tests/support/upstream.rs`, replace:

  ```rust
  use hennery_kernel::egress::{Egress, Timeouts};
  ```

with:

  ```rust
  use hennery_gateway::runtime::Runtime;
  ```

In `crates/hennery-gateway/tests/support/upstream.rs`, replace:

  ```rust
      pub client: reqwest::Client,
      task: tokio::task::JoinHandle<()>,
  ```

with:

  ```rust
      pub client: reqwest::Client,
      /// The proxy's runtime (plan 8f): its refresh locks and flows.
      pub runtime: Arc<Runtime>,
      /// What the `Notifier` was told.
      pub alerts: Arc<Recorder>,
      task: tokio::task::JoinHandle<()>,
  ```

In `crates/hennery-gateway/tests/support/upstream.rs`, replace:

  ```rust
      let mut state = ProxyState::full(world.proxy_store.clone(), &gateway, egress, limits);
  ```

with:

  ```rust
      let mut state = ProxyState::for_sessions(world.runtime(egress, Arc::new(Recorder::default())), limits);
  ```

In `crates/hennery-gateway/tests/support/upstream.rs`, replace:

  ```rust
          let world = World::new();
          let (addr, task) = serve(&world, limits.clone()).await;
  ```

with:

  ```rust
          Self::with(limits, |runtime| runtime).await
      }

      /// The proxy on a runtime `adjust` may change (a shorter refresh bound).
      pub async fn with(limits: Limits, adjust: impl FnOnce(Runtime) -> Runtime) -> Self {
          let world = World::new();
          let alerts = Arc::new(Recorder::default());
          let runtime = Arc::new(adjust(
              Arc::try_unwrap(world.runtime(test_egress(), alerts.clone()))
                  .ok()
                  .unwrap(),
          ));
          let app = router(ProxyState::for_sessions(runtime.clone(), limits.clone()));
          let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
          let addr = listener.local_addr().unwrap();
          let task = tokio::spawn(async move {
              axum::serve(listener, app).await.unwrap();
          });
  ```

In `crates/hennery-gateway/tests/support/upstream.rs`, replace:

  ```rust
              client,
              task,
  ```

with:

  ```rust
              client,
              runtime,
              alerts,
              task,
  ```

In `crates/hennery/src/main.rs`, replace:

  ```rust
      #[test]
      fn the_collector_gives_its_sessions_the_gateway() {
  ```

with:

  ```rust
      #[tokio::test]
      async fn the_collector_gives_its_sessions_the_gateway() {
  ```

In `crates/hennery/src/main.rs`, replace:

  ```rust
          assert!(state.store.has_session_mcp());
      }
  ```

with:

  ```rust
          assert!(state.store.has_session_mcp());
      }

      /// Plan 8f (lane L9, gateway spec §7): the gateway's `Notifier` is the
      /// collector's Web Push, a problem present at startup is announced once
      /// through it, and the background probe runs.
      #[tokio::test]
      async fn the_gateway_announces_through_push_and_probes() {
          use hennery_gateway::model::{AuthMethod, CredKind, GrantTokens, NewConnection, Status, TokenClient};
          use hennery_gateway::store::{ClientSource, GrantToStore};
          let dir = tempfile::tempdir().unwrap();
          let db = dir.path().join("hennery.db");
          let mut state = AppState::new(
              Store::open(&db).unwrap(),
              Hosts::open(&db).unwrap(),
              Operator::open(&db).unwrap(),
          );
          let (push, mut notices) = hennery_kernel::push::Push::new();
          state.push = push;
          let egress = hennery_kernel::egress::Egress::new(hennery_kernel::egress::Timeouts::DEFAULT).unwrap();
          let keys = hennery_gateway::key::KeySource::from_vars(dir.path(), None, None).unwrap();
          // A first start makes the key; an OAuth connection in `error`, with
          // a grant whose upstream is a listener here.
          let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
          let url = format!("http://{}/mcp", listener.local_addr().unwrap());
          let (first, _) = start_gateway(&db, &keys, &state, &egress, std::time::Duration::from_secs(3600)).unwrap();
          let runtime = first.runtime.clone();
          let hennery_gateway::model::Change::Done(record) = runtime
              .store
              .create(
                  &NewConnection {
                      slug: "linear".into(),
                      label: "Linear".into(),
                      url: url.clone(),
                      hat_id: state.hosts.default_hat_for_new_hosts().unwrap(),
                      cred_kind: CredKind::OauthDcr,
                      static_header: None,
                      static_prefix: None,
                      tool_allowlist: None,
                      internal_network: true,
                  },
                  1,
              )
              .unwrap()
          else {
              panic!("not created");
          };
          let client = TokenClient {
              client_id: "c".into(),
              secret: None,
              auth_method: AuthMethod::None,
              token_endpoint: format!("{url}/token"),
          };
          let tokens = GrantTokens::from_opened(br#"{"access_token":"a"}"#).unwrap();
          runtime
              .store
              .store_grant(
                  &GrantToStore {
                      connection_id: &record.id,
                      url: &url,
                      cred_kind: CredKind::OauthDcr,
                      internal_network: true,
                      source: ClientSource::Registered,
                      client: &client,
                      issuer: &url,
                      authorization_endpoint: &url,
                      redirect_uri: "https://hennery.example/api/mcp/oauth/callback",
                      scopes: &[],
                      resource: &url,
                      resource_param_accepted: true,
                      registered_at: 1,
                      tokens: &tokens,
                      expires_at: None,
                  },
                  &runtime.key,
                  1,
              )
              .unwrap();
          runtime
              .statuses
              .record_status(&record.id, &url, Status::Error, Some("down"), 1)
              .unwrap();
          while notices.try_recv().is_some() {}
          drop((first, runtime));
          // The start this test is about.
          let started = start_gateway(&db, &keys, &state, &egress, std::time::Duration::from_millis(20)).unwrap();
          // One runtime for the API and the proxy: one refresh lock per
          // connection (plan 8f decision 3).
          assert!(std::sync::Arc::ptr_eq(&started.0.runtime, &started.1.runtime));
          let notice = notices.try_recv().expect("the problem is announced at startup");
          assert_eq!(notice.tag, format!("mcp-{}", record.id));
          assert_eq!(notice.body, "is failing");
          assert_eq!(notice.url, "/mcp");
          assert!(notices.try_recv().is_none(), "once");
          // The probe reaches the upstream.
          let accepted = tokio::time::timeout(std::time::Duration::from_secs(10), listener.accept()).await;
          assert!(accepted.is_ok(), "the probe never ran");
          state.shutdown.cancel();
      }
  ```

- [ ] **Step 2: Run them and see them fail, then commit them**

   ```sh
   nix develop -c cargo test -p hennery-gateway --locked && nix develop -c cargo test -p hennery --locked --bin hennery the_gateway_announces
   ```

   It does not compile: `hennery_gateway::{notify, runtime, probe, refresh}` do not exist, `GatewayState` has no `runtime`, `open` takes three arguments, and the binary has no `start_gateway`.

   ```sh
   git add -A && git -c commit.gpgsign=false commit -m "test(gateway): single-flight refresh, OAuth through the proxy, the probe and the Notifier"
   ```

- [ ] **Step 3: Implement**

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
  use crate::key::MasterKey;
  use crate::model::{
      Change, ConnectionPatch, ConnectionRecord, CredKind, CredentialChange, NewConnection, url_for_logs,
  };
  use crate::stdio::{self, StdioChange, StdioInput};
  use crate::store::GatewayStore;
  use axum::extract::rejection::QueryRejection;
  use axum::extract::{DefaultBodyLimit, Extension, Path, Query, State};
  ```

with:

  ```rust
  use crate::model::{
      Change, ConnectionPatch, ConnectionRecord, CredKind, CredentialChange, NewConnection, url_for_logs,
  };
  use crate::runtime::Runtime;
  use crate::stdio::{self, StdioChange, StdioInput};
  use axum::extract::Query;
  use axum::extract::rejection::QueryRejection;
  use axum::extract::{DefaultBodyLimit, Extension, Path, State};
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
      pub store: Arc<GatewayStore>,
      /// What credentials are sealed with (gateway spec §6).
      pub key: Arc<MasterKey>,
      /// The owner and their sessions (kernel spec §3).
      pub operator: Arc<Operator>,
      /// What a revoke cuts (plan 8e decision 12): one per collector, shared
      /// by the proxy (`ProxyState::full`) and the sessions' side
      /// (`session::GatewayMcp`).
      pub revocations: crate::revocation::Revocations,
  ```

with:

  ```rust
      /// The stores, the key, the egress policy, the flows and the refresh
      /// locks, shared with the proxy (plan 8f decision 3).
      pub runtime: Arc<Runtime>,
      /// The owner and their sessions (kernel spec §3).
      pub operator: Arc<Operator>,
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
      match state.store.list() {
  ```

with:

  ```rust
      match state.runtime.store.list() {
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
      match state.store.create(&new, unix_now()) {
  ```

with:

  ```rust
      match state.runtime.store.create(&new, unix_now()) {
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
      if let Some(kind) = patch.cred_kind.filter(|kind| kind.is_oauth()) {
          return changed(Change::Unsupported(kind), StatusCode::OK);
      }
      match state.store.update(&id, &patch, unix_now()) {
  ```

with:

  ```rust
      // Every credential write takes the connection's refresh lock (gateway
      // spec §4.5): an origin or kind change deletes the grant, which a
      // refresh in flight must not write back (G-13).
      let _lock = state.runtime.lock(&id).await;
      if let Some(kind) = patch.cred_kind.filter(|kind| kind.is_oauth()) {
          return changed(Change::Unsupported(kind), StatusCode::OK);
      }
      match state.runtime.store.update(&id, &patch, unix_now()) {
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
      match state.store.delete(&id) {
  ```

with:

  ```rust
      let _lock = state.runtime.lock(&id).await;
      match state.runtime.store.delete(&id) {
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
      match state.store.replace_mounts(&id, &req.host_ids) {
  ```

with:

  ```rust
      match state.runtime.store.replace_mounts(&id, &req.host_ids) {
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
      match state
          .store
          .set_static_credential(&id, &req.token, &state.key, unix_now())
  ```

with:

  ```rust
      let _lock = state.runtime.lock(&id).await;
      match state
          .runtime
          .store
          .set_static_credential(&id, &req.token, &state.runtime.key, unix_now())
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
      match state.store.stdio_set(&host_id, &hat_id) {
  ```

with:

  ```rust
      match state.runtime.store.stdio_set(&host_id, &hat_id) {
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
          .store
          .replace_stdio_set(&host_id, &hat_id, &servers, &state.key, unix_now())
  ```

with:

  ```rust
          .runtime
          .store
          .replace_stdio_set(&host_id, &hat_id, &servers, &state.runtime.key, unix_now())
  ```

In `crates/hennery-gateway/src/lib.rs`, replace:

  ```rust
  pub mod oauth;
  pub mod proxy;
  pub mod revocation;
  ```

with:

  ```rust
  pub mod notify;
  pub mod oauth;
  pub mod probe;
  pub mod proxy;
  pub mod refresh;
  pub mod revocation;
  pub mod runtime;
  ```

In `crates/hennery-gateway/src/lib.rs`, replace:

  ```rust
  /// The gateway on the collector's `hennery.db`: its store, and the master
  /// key from `keys`, made at the first start. Before serving, and after the
  /// admin socket's bind (the one-collector guard).
  pub fn open(db: &Path, keys: &key::KeySource, operator: Arc<Operator>) -> Result<api::GatewayState> {
  ```

with:

  ```rust
  /// The gateway on the collector's `hennery.db`: its stores, and the master
  /// key from `keys`, made at the first start, sending through the
  /// collector's one `egress` and telling `notifier` of status transitions.
  /// Before serving, and after the admin socket's bind (the one-collector
  /// guard). The state's `runtime` is the one the proxy takes too
  /// (`proxy::ProxyState::for_sessions`).
  pub fn open(
      db: &Path,
      keys: &key::KeySource,
      operator: Arc<Operator>,
      egress: hennery_kernel::egress::Egress,
      notifier: Arc<dyn notify::Notifier>,
  ) -> Result<api::GatewayState> {
  ```

In `crates/hennery-gateway/src/lib.rs`, replace:

  ```rust
      Ok(api::GatewayState {
          store: Arc::new(store),
          key: Arc::new(key),
          operator,
          revocations: revocation::Revocations::new(),
  ```

with:

  ```rust
      let runtime = runtime::Runtime::new(
          Arc::new(store),
          Arc::new(scope::ProxyStore::open(db)?),
          Arc::new(key),
          egress,
          notifier,
      );
      Ok(api::GatewayState {
          runtime: Arc::new(runtime),
          operator,
  ```

Create `crates/hennery-gateway/src/notify.rs`:

  ```rust
  //! The `Notifier` (gateway spec §7, umbrella §10.2): told when a
  //! connection's status moves into or out of a problem, `needs_auth` or
  //! `error`, and only then. A problem already there when the collector
  //! starts is announced once (`announce_startup`); after that, only
  //! transitions. Re-posting on every probe tick trains people to ignore it
  //! (G-22).
  //!
  //! Full mode delivers through Web Push (`hennery_kernel::push::Push`, lane
  //! L9); standalone mode (plan 8g) will log and call a webhook. The wording
  //! is fixed here, and `error`'s never asks the operator to reconnect: an
  //! outage is not fixed by a click (G-22).

  use crate::model::{Status, StatusChange};
  use hennery_kernel::push::{Notice, Push, Urgency};

  /// What happened to a connection, for the operator.
  #[derive(Debug, Clone, Copy, PartialEq, Eq)]
  pub enum Alert {
      /// The vendor refused the credential: sign in again.
      NeedsAuth,
      /// An outage or a transport failure.
      Failing,
      /// Back to `ok` from a problem.
      Recovered,
  }

  impl Alert {
      /// What the notification says after the connection's label (lane L9).
      pub fn body(self) -> &'static str {
          match self {
              Self::NeedsAuth => "needs sign-in again",
              Self::Failing => "is failing",
              Self::Recovered => "is working again",
          }
      }

      /// The alert a status change makes, if any: into `needs_auth` or
      /// `error` from anything else, or out of either into `ok`. Nothing else
      /// is a transition the operator hears of (`not_connected` → `ok` is a
      /// first Connect, which the operator just did).
      pub fn of(change: &StatusChange) -> Option<Self> {
          if change.from == change.to {
              return None;
          }
          match change.to {
              Status::NeedsAuth => Some(Self::NeedsAuth),
              Status::Error => Some(Self::Failing),
              Status::Ok if change.from.is_problem() => Some(Self::Recovered),
              Status::Ok | Status::NotConnected => None,
          }
      }
  }

  /// One alert about one connection.
  #[derive(Debug, Clone, PartialEq, Eq)]
  pub struct ConnectionAlert {
      pub connection_id: String,
      pub hat_id: String,
      pub label: String,
      pub alert: Alert,
  }

  /// Where alerts go (umbrella §10.2). Called from request handlers and the
  /// probe's loop: it must not block.
  pub trait Notifier: Send + Sync + 'static {
      fn notify(&self, alert: &ConnectionAlert);
  }

  /// Tell `notifier` of `change`, if it is a transition the operator hears
  /// of.
  pub fn announce(notifier: &dyn Notifier, change: &StatusChange) {
      if let Some(alert) = Alert::of(change) {
          tracing::info!(connection_id = %change.connection_id, alert = ?alert, "gateway connection status changed");
          notifier.notify(&ConnectionAlert {
              connection_id: change.connection_id.clone(),
              hat_id: change.hat_id.clone(),
              label: change.label.clone(),
              alert,
          });
      }
  }

  /// The generic title (lane L9): the hat's push policy may show it instead
  /// of the label.
  pub const GENERIC_TITLE: &str = "An MCP connection needs attention";

  /// Full mode: Web Push, with the mapping agreed with the push lane (lane
  /// L9). The kernel applies the hat's push policy.
  impl Notifier for Push {
      fn notify(&self, alert: &ConnectionAlert) {
          Push::notify(self, notice(alert));
      }
  }

  /// The push notice for `alert` (lane L9).
  pub fn notice(alert: &ConnectionAlert) -> Notice {
      Notice {
          hat_id: alert.hat_id.clone(),
          urgency: Urgency::Normal,
          title: alert.label.clone(),
          generic_title: GENERIC_TITLE.into(),
          body: alert.alert.body().into(),
          detail: None,
          url: "/mcp".into(),
          tag: format!("mcp-{}", alert.connection_id),
      }
  }

  /// Nobody is told: what tests that do not look use.
  pub struct Silent;

  impl Notifier for Silent {
      fn notify(&self, _alert: &ConnectionAlert) {}
  }
  ```

Create `crates/hennery-gateway/src/probe.rs`:

  ```rust
  //! The health probe (gateway spec §7): a real MCP handshake through the
  //! proxy's own forwarding path (`proxy::send_through`): `initialize`, then
  //! `notifications/initialized` and `tools/list` on that session, then
  //! `DELETE` (G-21: a session-less `tools/list` gets 400 from stateful
  //! servers).
  //!
  //! - **What it concludes:** every step 2xx → `ok`; a 401 after one
  //!   single-flight refresh → `needs_auth`; a 5xx, a redirect or a transport
  //!   failure → `error`, with a note; any other 4xx → no change. Each moves
  //!   `checked_at`. The `DELETE`'s answer is not read: many servers take no
  //!   `DELETE`.
  //! - **Background:** every `EVERY`, for OAuth connections with a grant only
  //!   (`ProxyStore::probe_targets`); static and `none` connections are not
  //!   probed, nor any without a credential. Each tick is a task of its own,
  //!   bounded by `TICK_TIMEOUT`, so a panic or a hang ends that tick, not
  //!   the loop.
  //! - **Probe now** (`POST …/probe`, api-8e-8f B6, may change):
  //!   single-flight per connection; within `REUSE` of a completed probe the
  //!   result stands without a new request; each probe is bounded by
  //!   `PROBE_TIMEOUT`.

  use crate::model::Status;
  use crate::proxy::{Sent, send_through};
  use crate::runtime::Runtime;
  use crate::scope::ScopedConnection;
  use axum::body::Bytes;
  use axum::http::{HeaderMap, HeaderValue, Method};
  use hennery_kernel::secret::unix_now;
  use serde_json::{Value, json};
  use std::collections::HashMap;
  use std::future::Future;
  use std::sync::{Arc, Mutex};
  use std::time::Duration;

  /// How often the background probe runs (gateway spec §7).
  pub const EVERY: Duration = Duration::from_secs(15 * 60);

  /// The most one background tick takes, all its connections included.
  pub const TICK_TIMEOUT: Duration = Duration::from_secs(10 * 60);

  /// The most one probe takes (api-8e-8f B6).
  pub const PROBE_TIMEOUT: Duration = Duration::from_secs(30);

  /// Within this many seconds of a completed probe, its result stands.
  pub const REUSE: i64 = 10;

  /// The largest answer the probe reads.
  const MAX_ANSWER: usize = 1024 * 1024;

  /// What a probe concluded.
  #[derive(Debug, Clone, PartialEq, Eq)]
  pub enum Verdict {
      Ok,
      /// The upstream refused the credential, after one refresh.
      NeedsAuth,
      /// An outage, with what the operator is shown.
      Error(String),
      /// Nothing that changes the status (another 4xx).
      NoChange,
      /// The connection has no credential to send: nothing was sent.
      NoCredential,
  }

  /// A connection's latest completed probe (when, and what it concluded),
  /// behind the lock its next probe takes.
  type Slot = Arc<tokio::sync::Mutex<Option<(i64, Verdict)>>>;

  /// One slot per connection.
  #[derive(Default)]
  pub struct Probes {
      slots: Mutex<HashMap<String, Slot>>,
  }

  impl Probes {
      fn slot(&self, id: &str) -> Slot {
          self.slots
              .lock()
              .unwrap_or_else(std::sync::PoisonError::into_inner)
              .entry(id.to_string())
              .or_default()
              .clone()
      }
  }

  /// Probe `connection` now, single-flight: a concurrent caller waits for
  /// the probe in flight and gets its result, and so does one within `REUSE`
  /// seconds of it.
  pub async fn probe_now(runtime: &Arc<Runtime>, connection: &ScopedConnection) -> Verdict {
      let slot = runtime.probes.slot(&connection.id);
      let mut last = slot.lock().await;
      if let Some((at, verdict)) = &*last
          && unix_now() - *at < REUSE
      {
          return verdict.clone();
      }
      let verdict = match tokio::time::timeout(runtime.probe_timeout, handshake(runtime, connection)).await {
          Ok(verdict) => verdict,
          Err(_) => Verdict::Error("the probe timed out".into()),
      };
      record(runtime, connection, &verdict);
      *last = Some((unix_now(), verdict.clone()));
      verdict
  }

  /// Write what `verdict` says of `connection`'s status (gateway spec §7).
  fn record(runtime: &Runtime, connection: &ScopedConnection, verdict: &Verdict) {
      let now = unix_now();
      let url = &connection.url;
      match verdict {
          Verdict::Ok => runtime.announce(
              runtime
                  .statuses
                  .record_status(&connection.id, url, Status::Ok, None, now),
          ),
          Verdict::Error(note) => {
              runtime.announce(
                  runtime
                      .statuses
                      .record_status(&connection.id, url, Status::Error, Some(note), now),
              )
          }
          Verdict::NoChange => {
              if let Err(err) = runtime.statuses.record_checked(&connection.id, url, now) {
                  tracing::error!(connection_id = %connection.id, error = %err, "gateway probe: not recorded");
              }
          }
          // Recorded by the forwarding path itself (`send_through`).
          Verdict::NeedsAuth | Verdict::NoCredential => {}
      }
  }

  /// One JSON-RPC message, as the probe sends it.
  fn message(id: Option<i64>, method: &str, params: Option<Value>) -> Bytes {
      let mut out = json!({ "jsonrpc": "2.0", "method": method });
      if let Some(id) = id {
          out["id"] = json!(id);
      }
      if let Some(params) = params {
          out["params"] = params;
      }
      Bytes::from(out.to_string())
  }

  /// What one step came to: its answer's session and message, or the
  /// verdict that ends the handshake.
  enum Step {
      Done {
          session_id: Option<HeaderValue>,
          message: Option<Value>,
      },
      End(Verdict),
  }

  async fn step(
      runtime: &Arc<Runtime>,
      connection: &ScopedConnection,
      method: Method,
      headers: &HeaderMap,
      body: Option<Bytes>,
      id: Option<i64>,
  ) -> Step {
      // Each request's head as the whole probe's bound; the whole is
      // `runtime.probe_timeout`.
      let sent = send_through(
          runtime,
          connection,
          &method,
          headers,
          headers.get("mcp-session-id"),
          body,
          PROBE_TIMEOUT,
      )
      .await;
      let response = match sent {
          Sent::Answer { response, .. } => response,
          Sent::NoCredential => return Step::End(Verdict::NoCredential),
          Sent::AuthRefused => return Step::End(Verdict::NeedsAuth),
          Sent::Unreachable { .. } => return Step::End(Verdict::Error("the upstream could not be reached".into())),
          Sent::RefreshUnavailable => {
              return Step::End(Verdict::Error(
                  "the authorization server could not be reached to refresh the grant".into(),
              ));
          }
          Sent::RefreshUnsaved | Sent::Changed | Sent::Internal(_) => {
              tracing::error!(connection_id = %connection.id, "gateway probe: the gateway failed, not the upstream");
              return Step::End(Verdict::NoChange);
          }
      };
      let status = response.status();
      if status.is_server_error() {
          return Step::End(Verdict::Error(format!(
              "the upstream answered HTTP {}",
              status.as_u16()
          )));
      }
      if status.is_redirection() {
          return Step::End(Verdict::Error("the upstream answered with a redirect".into()));
      }
      if !status.is_success() {
          return Step::End(Verdict::NoChange);
      }
      let session_id = response.headers().get("mcp-session-id").cloned();
      let message = match id {
          Some(id) => answer(response, id).await,
          None => None,
      };
      Step::Done { session_id, message }
  }

  /// The JSON-RPC answer with `id` in `response`, JSON or an event stream,
  /// read up to `MAX_ANSWER` bytes; the stream is not read past it.
  async fn answer(mut response: reqwest::Response, id: i64) -> Option<Value> {
      let stream = response
          .headers()
          .get("content-type")
          .and_then(|v| v.to_str().ok())
          .is_some_and(|v| v.trim_start().to_ascii_lowercase().starts_with("text/event-stream"));
      let mut read = Vec::new();
      while let Ok(Some(chunk)) = response.chunk().await {
          if read.len() + chunk.len() > MAX_ANSWER {
              return None;
          }
          read.extend_from_slice(&chunk);
          if stream {
              let text = String::from_utf8_lossy(&read);
              for event in text.split("\n\n") {
                  let data: String = event
                      .lines()
                      .filter_map(|line| line.strip_prefix("data:"))
                      .map(str::trim_start)
                      .collect::<Vec<_>>()
                      .join("\n");
                  if let Ok(value) = serde_json::from_str::<Value>(&data)
                      && value.get("id").and_then(Value::as_i64) == Some(id)
                  {
                      return Some(value);
                  }
              }
          }
      }
      if stream {
          None
      } else {
          serde_json::from_slice(&read).ok()
      }
  }

  /// The handshake (gateway spec §7).
  async fn handshake(runtime: &Arc<Runtime>, connection: &ScopedConnection) -> Verdict {
      let mut headers = HeaderMap::new();
      let initialize = message(
          Some(1),
          "initialize",
          Some(json!({
              "protocolVersion": "2025-06-18",
              "capabilities": {},
              "clientInfo": { "name": "hennery-probe", "version": env!("CARGO_PKG_VERSION") },
          })),
      );
      let (session_id, initialized) =
          match step(runtime, connection, Method::POST, &headers, Some(initialize), Some(1)).await {
              Step::Done { session_id, message } => (session_id, message),
              Step::End(verdict) => return verdict,
          };
      if let Some(session_id) = &session_id {
          headers.insert("mcp-session-id", session_id.clone());
      }
      if let Some(version) = initialized
          .as_ref()
          .and_then(|m| m.pointer("/result/protocolVersion"))
          .and_then(Value::as_str)
          .and_then(|v| HeaderValue::from_str(v).ok())
      {
          headers.insert("mcp-protocol-version", version);
      }
      let notified = message(None, "notifications/initialized", None);
      if let Step::End(verdict) = step(runtime, connection, Method::POST, &headers, Some(notified), None).await {
          return verdict;
      }
      let verdict = match step(
          runtime,
          connection,
          Method::POST,
          &headers,
          Some(message(Some(2), "tools/list", None)),
          Some(2),
      )
      .await
      {
          Step::Done { .. } => Verdict::Ok,
          Step::End(verdict) => verdict,
      };
      if session_id.is_some() {
          // Ends the upstream session; its answer is not read.
          let _ = step(runtime, connection, Method::DELETE, &headers, None, None).await;
      }
      verdict
  }

  /// One background tick: every OAuth connection with a grant, one after
  /// another.
  pub async fn tick(runtime: &Arc<Runtime>) {
      let targets = match runtime.statuses.probe_targets() {
          Ok(targets) => targets,
          Err(err) => {
              tracing::error!(error = %err, "gateway probe: connections not read");
              return;
          }
      };
      for connection in targets {
          let verdict = probe_now(runtime, &connection).await;
          tracing::debug!(connection_id = %connection.id, verdict = ?verdict, "gateway probe: checked");
      }
  }

  /// The background probe (gateway spec §7): a tick every `every`, until
  /// `shutdown` resolves. A tick that panics or passes `tick_timeout` is
  /// logged and the loop goes on.
  pub async fn run(runtime: Arc<Runtime>, every: Duration, tick_timeout: Duration, shutdown: impl Future<Output = ()>) {
      tokio::pin!(shutdown);
      loop {
          tokio::select! {
              () = &mut shutdown => return,
              () = tokio::time::sleep(every) => {}
          }
          let rt = runtime.clone();
          let mut task = tokio::spawn(async move { tick(&rt).await });
          match tokio::time::timeout(tick_timeout, &mut task).await {
              Ok(Ok(())) => {}
              Ok(Err(err)) => tracing::error!(error = %err, "gateway probe: a tick failed"),
              Err(_) => {
                  task.abort();
                  tracing::warn!("gateway probe: a tick timed out");
              }
          }
      }
  }
  ```

In `crates/hennery-gateway/src/proxy.rs`, replace:

  ```rust
  //! - **401** (§5.4) is never passed on: `502 upstream_auth`. The one place
  //!   an OAuth refresh and retry goes is `refreshed` (plan 8f).
  ```

with:

  ```rust
  //! - **401** (§5.4) is never passed on. Static and `none`: `502
  //!   upstream_auth` and `needs_auth`. OAuth: one single-flight refresh and
  //!   one retry (`send_through`, plan 8f); a second 401, or nothing to
  //!   refresh, is `needs_auth` and `502 upstream_auth`; a refresh that did
  //!   not reach the vendor is `502 upstream_unreachable` and one not stored
  //!   `502 credential_unsaved`, neither `needs_auth` (gateway spec §4.5). A
  //!   retry goes only to the URL its token was granted for: a grant for
  //!   another one, stored meanwhile, is `502 upstream_changed` (plan 8f
  //!   decision 13).
  ```

In `crates/hennery-gateway/src/proxy.rs`, replace:

  ```rust
  use crate::api::GatewayState;
  use crate::jsonrpc::{self, Answered, BOM, EventOutcome, Inspected};
  use crate::key::MasterKey;
  use crate::model::{CredKind, url_for_logs};
  use crate::revocation::{Revocations, Watch};
  use crate::scope::{ClientIdentity, MountPolicy, Principal, ProxyStore, ScopedConnection};
  use crate::session_id::SessionIds;
  use crate::store::GatewayStore;
  ```

with:

  ```rust
  use crate::jsonrpc::{self, Answered, BOM, EventOutcome, Inspected};
  use crate::model::{CredKind, url_for_logs};
  use crate::refresh::{self, Refreshed};
  use crate::revocation::{Revocations, Watch};
  use crate::runtime::Runtime;
  use crate::scope::{ClientIdentity, MountPolicy, Principal, ScopedConnection};
  use crate::session_id::SessionIds;
  ```

In `crates/hennery-gateway/src/proxy.rs`, replace:

  ```rust
  use hennery_kernel::egress::{Allowance, Egress, EgressClient, Limiter, Permit};
  ```

with:

  ```rust
  use hennery_kernel::egress::{EgressError, Limiter, Permit};
  ```

In `crates/hennery-gateway/src/proxy.rs`, replace:

  ```rust
  use url::Url;

  ```

with:

  ```rust
  use url::Url;
  use zeroize::Zeroizing;

  ```

In `crates/hennery-gateway/src/proxy.rs`, replace:

  ```rust
      /// Static credentials, with where they go (`static_credential`).
      pub credentials: Arc<GatewayStore>,
      /// What live traffic says of a connection's status.
      pub statuses: Arc<ProxyStore>,
      pub key: Arc<MasterKey>,
      pub egress: Egress,
  ```

with:

  ```rust
      /// The stores, the key, the egress policy, the refresh locks and the
      /// `Notifier`, shared with the API (plan 8f decision 3).
      pub runtime: Arc<Runtime>,
  ```

In `crates/hennery-gateway/src/proxy.rs`, replace:

  ```rust
      /// Full mode (umbrella §10.2): session tokens and host mounts, both from
      /// `store`; requests watched in `gateway`'s `Revocations`, with its
      /// store and key.
      pub fn full(store: Arc<ProxyStore>, gateway: &GatewayState, egress: Egress, limits: Limits) -> Self {
          Self {
              identity: store.clone(),
              mounts: store.clone(),
              credentials: gateway.store.clone(),
              statuses: store,
              key: gateway.key.clone(),
              egress,
              limits,
              revocations: gateway.revocations.clone(),
  ```

with:

  ```rust
      /// Full mode (umbrella §10.2): session tokens and host mounts, both
      /// from the runtime's `ProxyStore`.
      pub fn for_sessions(runtime: Arc<Runtime>, limits: Limits) -> Self {
          Self {
              identity: runtime.statuses.clone(),
              mounts: runtime.statuses.clone(),
              revocations: runtime.revocations.clone(),
              runtime,
              limits,
  ```

In `crates/hennery-gateway/src/proxy.rs`, replace:

  ```rust
  enum UpstreamAuth {
  ```

with:

  ```rust
  pub(crate) enum UpstreamAuth {
  ```

In `crates/hennery-gateway/src/proxy.rs`, replace:

  ```rust
      Static { header: HeaderName, value: HeaderValue },
  }
  ```

with:

  ```rust
      Static { header: HeaderName, value: HeaderValue },
      /// An OAuth kind: `Authorization: Bearer <access token>`, and the token
      /// itself, to tell a refresh which one failed (gateway spec §4.5).
      Oauth {
          value: HeaderValue,
          access: Zeroizing<String>,
      },
  }
  ```

In `crates/hennery-gateway/src/proxy.rs`, replace:

  ```rust
              Self::Static { header, .. } => write!(f, "Static({header}: <redacted>)"),
          }
  ```

with:

  ```rust
              Self::Static { header, .. } => write!(f, "Static({header}: <redacted>)"),
              Self::Oauth { .. } => f.write_str("Oauth(<redacted>)"),
          }
      }
  }

  impl UpstreamAuth {
      /// An OAuth access token as the header it goes in.
      fn bearer(access: Zeroizing<String>) -> anyhow::Result<Self> {
          let mut value = HeaderValue::from_str(&format!("Bearer {}", access.as_str()))?;
          value.set_sensitive(true);
          Ok(Self::Oauth { value, access })
      }

      /// Put the credential into `headers`; `none` puts nothing.
      fn apply(&self, headers: &mut HeaderMap) {
          match self {
              Self::None => {}
              Self::Static { header, value } => {
                  headers.insert(header.clone(), value.clone());
              }
              Self::Oauth { value, .. } => {
                  headers.insert(header::AUTHORIZATION, value.clone());
              }
          }
  ```

In `crates/hennery-gateway/src/proxy.rs`, replace:

  ```rust
  struct Upstream {
      url: Url,
      /// The connection's stored flag, as read for this request.
      internal_network: bool,
      auth: UpstreamAuth,
  }

  /// The egress client a connection's requests go through: chosen at every
  /// request from the connection's stored `internal_network` flag, never from
  /// anything in the request (plan 8d decision 9). The one place the choice
  /// is made, so a later client for the internal network swaps in here.
  fn egress_client(egress: &Egress, internal_network: bool) -> EgressClient {
      egress.client(if internal_network {
          Allowance::InternalNetwork
      } else {
          Allowance::PublicOnly
      })
  }

  /// The connection's upstream and credential now. `None`: it has none it
  /// can use (a `static` connection without a token, or a kind the proxy
  /// does not take yet), so nothing is sent (plan 8d decision 3).
  fn upstream(state: &ProxyState, connection: &ScopedConnection) -> anyhow::Result<Option<Upstream>> {
  ```

with:

  ```rust
  pub(crate) struct Upstream {
      pub(crate) url: Url,
      /// The connection's stored flag, as read for this request.
      pub(crate) internal_network: bool,
      auth: UpstreamAuth,
  }

  /// The connection's upstream and credential as stored now, without a
  /// refresh. `None`: it has none it can use (a `static` or OAuth connection
  /// without one), so nothing is sent (plan 8d decision 3).
  fn current_upstream(runtime: &Runtime, connection: &ScopedConnection) -> anyhow::Result<Option<Upstream>> {
  ```

In `crates/hennery-gateway/src/proxy.rs`, replace:

  ```rust
              let Some(credential) = state.credentials.static_credential(&connection.id, &state.key)? else {
  ```

with:

  ```rust
              let Some(credential) = runtime.store.static_credential(&connection.id, &runtime.key)? else {
  ```

In `crates/hennery-gateway/src/proxy.rs`, replace:

  ```rust
          // Plan 8f.
          CredKind::OauthDcr | CredKind::OauthClient => Ok(None),
      }
  }

  /// The seam for plan 8f: after an upstream 401, a fresh credential to try
  /// once more, single-flight per connection. Static and `none` credentials
  /// have nothing to refresh.
  async fn refreshed(_state: &ProxyState, _connection: &ScopedConnection, auth: &UpstreamAuth) -> Option<UpstreamAuth> {
      match auth {
          UpstreamAuth::None | UpstreamAuth::Static { .. } => None,
      }
  ```

with:

  ```rust
          CredKind::OauthDcr | CredKind::OauthClient => {
              let Some(credential) = runtime.store.oauth_credential(&connection.id, &runtime.key)? else {
                  return Ok(None);
              };
              Ok(Some(Upstream {
                  url: Url::parse(&credential.url)?,
                  internal_network: credential.internal_network,
                  auth: UpstreamAuth::bearer(credential.tokens.access_token.clone())?,
              }))
          }
      }
  }

  /// The connection's upstream and credential for a request now: an OAuth
  /// access token within 5 minutes of its expiry is refreshed first,
  /// single-flight (gateway spec §4.4), and then the URL and the token are
  /// read again, together: the refresh may have found another grant than the
  /// one read here (plan 8f decision 13). A refresh that fails leaves the
  /// token there is: a 401 then has its own refresh and retry. A grant
  /// without a refresh token never waits for the connection's lock.
  async fn upstream_for_request(
      runtime: &Arc<Runtime>,
      connection: &ScopedConnection,
  ) -> anyhow::Result<Option<Upstream>> {
      if connection.cred_kind.is_oauth()
          && let Some(credential) = runtime.store.oauth_credential(&connection.id, &runtime.key)?
          && refresh::due(credential.expires_at, unix_now())
          && credential.tokens.refresh_token.is_some()
      {
          refresh::refresh(runtime.clone(), connection.id.clone(), None).await;
      }
      current_upstream(runtime, connection)
  ```

In `crates/hennery-gateway/src/proxy.rs`, replace:

  ```rust
      if let UpstreamAuth::Static { header, value } = auth {
          out.insert(header.clone(), value.clone());
      }
      out
  ```

with:

  ```rust
      auth.apply(&mut out);
      out
  }

  /// What sending a request through a connection came to (`send_through`).
  pub(crate) enum Sent {
      /// An answer other than 401, after one refresh and retry at most.
      Answer {
          response: reqwest::Response,
          upstream: Upstream,
      },
      /// The connection has no credential to send: nothing was sent.
      NoCredential,
      /// The upstream was not reached; the error carries no URL.
      Unreachable {
          error: EgressError,
          upstream: Url,
      },
      /// 401, and no refresh helped: the connection is `needs_auth`.
      AuthRefused,
      /// 401, and the refresh did not reach the vendor (no `needs_auth`).
      RefreshUnavailable,
      /// 401, and the refreshed grant could not be stored (no `needs_auth`).
      RefreshUnsaved,
      /// 401, and the grant there is now is for another upstream: nothing
      /// more was sent (no `needs_auth`).
      Changed,
      Internal(anyhow::Error),
  }

  /// Send one request through `connection` (gateway spec §5.2, §5.4): its
  /// credential now, its egress client, the forwarded headers, and on a 401
  /// one single-flight refresh and one retry. The one forwarding path, the
  /// proxy's and the probe's (gateway spec §7). A 401 that nothing fixes sets
  /// `needs_auth`; a 2xx sets nothing here (live traffic's `ok` is the
  /// proxy's, never the probe's).
  pub(crate) async fn send_through(
      runtime: &Arc<Runtime>,
      connection: &ScopedConnection,
      method: &Method,
      downstream: &HeaderMap,
      session: Option<&HeaderValue>,
      body: Option<Bytes>,
      head_timeout: Duration,
  ) -> Sent {
      let upstream = match upstream_for_request(runtime, connection).await {
          Ok(Some(upstream)) => upstream,
          Ok(None) => return Sent::NoCredential,
          Err(err) => return Sent::Internal(err),
      };
      let client = runtime.client(upstream.internal_network);
      let send = |auth: &UpstreamAuth| {
          let mut request = reqwest::Request::new(method.clone(), upstream.url.clone());
          *request.headers_mut() = upstream_headers(downstream, session, auth, body.is_some());
          *request.body_mut() = body.clone().map(reqwest::Body::from);
          *request.timeout_mut() = Some(head_timeout);
          client.send_streaming(request)
      };
      let refused = |note: &str| {
          tracing::warn!(connection_id = %connection.id, slug = %connection.slug, "gateway proxy: the upstream refused the credential");
          runtime.announce(
              runtime
                  .statuses
                  .mark_needs_auth(&connection.id, upstream.url.as_str(), note, unix_now()),
          );
          Sent::AuthRefused
      };
      let response = match send(&upstream.auth).await {
          Ok(response) => response,
          Err(error) => {
              return Sent::Unreachable {
                  error,
                  upstream: upstream.url.clone(),
              };
          }
      };
      if response.status() != StatusCode::UNAUTHORIZED {
          return Sent::Answer { response, upstream };
      }
      drop(response);
      let UpstreamAuth::Oauth { access, .. } = &upstream.auth else {
          return refused("the upstream refused the credential (401)");
      };
      match refresh::refresh(runtime.clone(), connection.id.clone(), Some(access.clone())).await {
          Refreshed::Retry(fresh) => {
              // Only where the token was granted for (plan 8f decision 13).
              if Url::parse(&fresh.url).ok().as_ref() != Some(&upstream.url)
                  || fresh.internal_network != upstream.internal_network
              {
                  tracing::warn!(connection_id = %connection.id, slug = %connection.slug, "gateway proxy: the connection changed during its refresh; not retried");
                  return Sent::Changed;
              }
              let auth = match UpstreamAuth::bearer(fresh.access_token) {
                  Ok(auth) => auth,
                  Err(err) => return Sent::Internal(err),
              };
              match send(&auth).await {
                  Ok(response) if response.status() == StatusCode::UNAUTHORIZED => {
                      drop(response);
                      refused("the upstream refused the refreshed credential (401)")
                  }
                  Ok(response) => Sent::Answer {
                      response,
                      upstream: Upstream {
                          url: upstream.url.clone(),
                          internal_network: upstream.internal_network,
                          auth,
                      },
                  },
                  Err(error) => Sent::Unreachable {
                      error,
                      upstream: upstream.url.clone(),
                  },
              }
          }
          Refreshed::NotRefreshable => refused("the upstream refused the credential (401), and it cannot be refreshed"),
          // The refresh set `needs_auth` itself.
          Refreshed::Refused => Sent::AuthRefused,
          Refreshed::Unavailable => Sent::RefreshUnavailable,
          Refreshed::Unsaved => Sent::RefreshUnsaved,
      }
  ```

In `crates/hennery-gateway/src/proxy.rs`, replace:

  ```rust
      let upstream = match upstream(&state, &connection) {
          Ok(Some(upstream)) => upstream,
          Ok(None) => {
              tracing::info!(connection_id = %connection.id, slug = %connection.slug, "gateway proxy: the connection has no credential to send");
              return upstream_auth(&connection);
          }
          Err(err) => return internal(err),
      };
      let client = egress_client(&state.egress, upstream.internal_network);
      let send = |auth: &UpstreamAuth| {
          let mut request = reqwest::Request::new(method.clone(), upstream.url.clone());
          *request.headers_mut() = upstream_headers(&headers, session.as_ref(), auth, body.is_some());
          *request.body_mut() = body.clone().map(reqwest::Body::from);
          *request.timeout_mut() = Some(state.limits.head_timeout);
          client.send_streaming(request)
      };
      let mut response = send(&upstream.auth).await;
      if matches!(&response, Ok(r) if r.status() == StatusCode::UNAUTHORIZED)
          && let Some(fresh) = refreshed(&state, &connection, &upstream.auth).await
      {
          response = send(&fresh).await;
      }
      let response = match response {
          Ok(response) => response,
          Err(err) => {
              tracing::warn!(
                  connection_id = %connection.id,
                  slug = %connection.slug,
                  upstream = %url_for_logs(upstream.url.as_str()),
                  error = %err,
  ```

with:

  ```rust
      let runtime = &state.runtime;
      let sent = send_through(
          runtime,
          &connection,
          &method,
          &headers,
          session.as_ref(),
          body.map(Bytes::from),
          state.limits.head_timeout,
      )
      .await;
      let (response, upstream) = match sent {
          Sent::Answer { response, upstream } => (response, upstream),
          Sent::NoCredential => {
              tracing::info!(connection_id = %connection.id, slug = %connection.slug, "gateway proxy: the connection has no credential to send");
              return upstream_auth(&connection);
          }
          Sent::Unreachable { error, upstream } => {
              tracing::warn!(
                  connection_id = %connection.id,
                  slug = %connection.slug,
                  upstream = %url_for_logs(upstream.as_str()),
                  error = %error,
  ```

In `crates/hennery-gateway/src/proxy.rs`, replace:

  ```rust
      };
      let status = response.status();
      tracing::debug!(connection_id = %connection.id, slug = %connection.slug, %method, status = status.as_u16(), "gateway proxy: upstream answered");
      if status == StatusCode::UNAUTHORIZED {
          drop(response);
          tracing::warn!(connection_id = %connection.id, slug = %connection.slug, "gateway proxy: the upstream refused the credential");
          if let Err(err) = state.statuses.mark_needs_auth(
              &connection.id,
              upstream.url.as_str(),
              "the upstream refused the credential (401)",
              now,
          ) {
              tracing::error!(connection_id = %connection.id, error = %err, "gateway proxy: status not recorded");
          }
          return upstream_auth(&connection);
      }
  ```

with:

  ```rust
          Sent::AuthRefused => return upstream_auth(&connection),
          // A refresh that did not reach the vendor, or was not stored, is
          // no reason to sign in again (gateway spec §4.5).
          Sent::RefreshUnavailable => {
              return refuse(
                  StatusCode::BAD_GATEWAY,
                  "upstream_unreachable",
                  format!(
                      "connection {}'s authorization server could not be reached to refresh its grant",
                      connection.label
                  ),
              );
          }
          Sent::RefreshUnsaved => {
              return refuse(
                  StatusCode::BAD_GATEWAY,
                  "credential_unsaved",
                  format!("connection {}'s refreshed grant could not be stored", connection.label),
              );
          }
          Sent::Changed => {
              return refuse(
                  StatusCode::BAD_GATEWAY,
                  "upstream_changed",
                  format!(
                      "connection {} changed while its grant was refreshed: send again",
                      connection.label
                  ),
              );
          }
          Sent::Internal(err) => return internal(err),
      };
      let status = response.status();
      tracing::debug!(connection_id = %connection.id, slug = %connection.slug, %method, status = status.as_u16(), "gateway proxy: upstream answered");
  ```

In `crates/hennery-gateway/src/proxy.rs`, replace:

  ```rust
      if status.is_success()
          && !matches!(kind, BodyKind::Empty)
          && response.content_length() != Some(0)
          && let Err(err) = state
              .statuses
              .record_traffic_ok(&connection.id, upstream.url.as_str(), now)
      {
          tracing::error!(connection_id = %connection.id, error = %err, "gateway proxy: status not recorded");
  ```

with:

  ```rust
      if status.is_success() && !matches!(kind, BodyKind::Empty) && response.content_length() != Some(0) {
          runtime.announce(
              runtime
                  .statuses
                  .record_traffic_ok(&connection.id, upstream.url.as_str(), now),
          );
  ```

In `crates/hennery-gateway/src/proxy.rs`, replace:

  ```rust
              Ok(Some(connection)) if connection.id == self.connection_id => upstream(&self.state, &connection),
  ```

with:

  ```rust
              Ok(Some(connection)) if connection.id == self.connection_id => {
                  current_upstream(&self.state.runtime, &connection)
              }
  ```

In `crates/hennery-gateway/src/proxy.rs`, replace:

  ```rust
          if let UpstreamAuth::Static { header, value } = &auth {
              headers.insert(header.clone(), value.clone());
          }
          let mut request = reqwest::Request::new(Method::POST, self.url.clone());
          *request.headers_mut() = headers;
          *request.body_mut() = Some(serde_json::to_vec(answer).expect("a JSON value serialises").into());
          let client = egress_client(&self.state.egress, self.internal_network);
  ```

with:

  ```rust
          auth.apply(&mut headers);
          let mut request = reqwest::Request::new(Method::POST, self.url.clone());
          *request.headers_mut() = headers;
          *request.body_mut() = Some(serde_json::to_vec(answer).expect("a JSON value serialises").into());
          let client = self.state.runtime.client(self.internal_network);
  ```

Create `crates/hennery-gateway/src/refresh.rs`:

  ```rust
  //! Single-flight refresh (gateway spec §4.4, §4.5).
  //!
  //! - **One lock per connection** (`Runtime::lock`). Under it the stored
  //!   grant is read again: if its access token already differs from the one
  //!   that failed, that one is used, and nothing is sent (G-13's other half).
  //!   So concurrent 401s share one refresh.
  //! - **A started refresh runs to completion and persists**, whatever the
  //!   caller does: it runs as a task of its own, which the caller awaits; a
  //!   caller that goes away drops the wait, not the task. It is bounded by
  //!   `Runtime::refresh_timeout` (20 s) at the vendor (G-11).
  //! - **The caller's cancellation never sets `needs_auth`** (G-12): only the
  //!   task does, and only on the vendor's refusal.
  //! - **Outcomes are distinct** (`Refreshed`): a token to retry with; nothing
  //!   to refresh; the vendor refused (`needs_auth`); the vendor could not be
  //!   reached; the result could not be stored (502, no `needs_auth`: a click
  //!   cannot fix a disk).
  //! - **The write is a compare-and-swap** on the blob read
  //!   (`GatewayStore::store_refreshed`), so an edit that deleted the grant
  //!   meanwhile is never undone.
  //! - **`resource`** is sent on refresh as the grant recorded it (G-10); a
  //!   server answering `invalid_target` is asked once more without it, and
  //!   that is recorded (`resource_param_accepted`).
  //! - **A token comes with where it goes** (`Fresh`): the URL and the
  //!   allowance read with it, in the same statement. The grant used may be
  //!   another than the one that failed (stored meanwhile by a Connect after
  //!   an origin edit), so a caller sends it only where it was granted for
  //!   (plan 8f decision 13).

  use crate::model::{GrantTokens, OauthCredential};
  use crate::oauth::{self, Grant, TokenError};
  use crate::runtime::Runtime;
  use crate::store::RefreshedGrant;
  use hennery_kernel::secret::unix_now;
  use std::sync::Arc;
  use zeroize::Zeroizing;

  /// How close to its expiry an access token is refreshed before use
  /// (gateway spec §4.4: 5 minutes).
  pub const PROACTIVE: i64 = 5 * 60;

  /// An access token with the upstream it was granted for, read together.
  /// Its `Debug` shows no token.
  #[derive(Clone, PartialEq, Eq)]
  pub struct Fresh {
      pub access_token: Zeroizing<String>,
      pub url: String,
      pub internal_network: bool,
  }

  impl Fresh {
      fn of(credential: &OauthCredential, access_token: Zeroizing<String>) -> Self {
          Self {
              access_token,
              url: credential.url.clone(),
              internal_network: credential.internal_network,
          }
      }
  }

  /// What a refresh came to.
  #[derive(Clone, PartialEq, Eq)]
  pub enum Refreshed {
      /// An access token to use: a fresh one, or one another refresh (or a
      /// Connect) stored meanwhile, with where it goes.
      Retry(Fresh),
      /// Nothing to refresh: no grant, or one without a refresh token.
      NotRefreshable,
      /// The vendor refused the refresh: the connection is `needs_auth`.
      Refused,
      /// The vendor could not be reached, or did not answer in time.
      Unavailable,
      /// The vendor answered, but the result could not be stored.
      Unsaved,
  }

  impl std::fmt::Debug for Refreshed {
      fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
          f.write_str(match self {
              Self::Retry(_) => "Retry(<redacted>)",
              Self::NotRefreshable => "NotRefreshable",
              Self::Refused => "Refused",
              Self::Unavailable => "Unavailable",
              Self::Unsaved => "Unsaved",
          })
      }
  }

  /// Whether an access token expiring at `expires_at` is to be refreshed
  /// before it is used, at `now`.
  pub fn due(expires_at: Option<i64>, now: i64) -> bool {
      expires_at.is_some_and(|at| at - now <= PROACTIVE)
  }

  /// Refresh `connection_id`'s grant, single-flight. `failed` is the access
  /// token the upstream refused (a 401), or `None` for a refresh before use
  /// (it is then done only if still due).
  pub async fn refresh(runtime: Arc<Runtime>, connection_id: String, failed: Option<Zeroizing<String>>) -> Refreshed {
      let id = connection_id.clone();
      let task =
          tokio::spawn(async move { locked(&runtime, &connection_id, failed.as_deref().map(String::as_str)).await });
      match task.await {
          Ok(outcome) => outcome,
          Err(err) => {
              tracing::error!(connection_id = %id, error = %err, "gateway: a refresh failed");
              Refreshed::Unavailable
          }
      }
  }

  async fn locked(runtime: &Runtime, id: &str, failed: Option<&str>) -> Refreshed {
      let _guard = runtime.lock(id).await;
      let now = unix_now();
      let current = match runtime.store.oauth_credential(id, &runtime.key) {
          Ok(Some(current)) => current,
          Ok(None) => return Refreshed::NotRefreshable,
          Err(err) => {
              tracing::error!(connection_id = %id, error = %err, "gateway: a grant could not be read");
              return Refreshed::Unsaved;
          }
      };
      match failed {
          Some(failed) if current.tokens.access_token.as_str() != failed => {
              return Refreshed::Retry(Fresh::of(&current, current.tokens.access_token.clone()));
          }
          None if !due(current.expires_at, now) => {
              return Refreshed::Retry(Fresh::of(&current, current.tokens.access_token.clone()));
          }
          _ => {}
      }
      let Some(refresh_token) = current.tokens.refresh_token.clone() else {
          return Refreshed::NotRefreshable;
      };
      let client = runtime.client(current.internal_network);
      let resource = if current.resource_param_accepted {
          current.resource.as_deref()
      } else {
          None
      };
      let grant = Grant::Refresh {
          refresh_token: &refresh_token,
          scopes: &current.scopes,
      };
      let sent = tokio::time::timeout(runtime.refresh_timeout, async {
          match oauth::token(&client, &current.client, &grant, resource).await {
              Err(TokenError::InvalidTarget) if resource.is_some() => {
                  (oauth::token(&client, &current.client, &grant, None).await, false)
              }
              other => (other, current.resource_param_accepted),
          }
      })
      .await;
      let (issued, accepted) = match sent {
          Ok(sent) => sent,
          Err(_) => {
              tracing::warn!(connection_id = %id, "gateway: a refresh timed out");
              return Refreshed::Unavailable;
          }
      };
      match issued {
          Ok(issued) => {
              let expires_at = oauth::expires_at(unix_now(), issued.expires_in);
              // A response without a refresh token keeps the old one (§4.4).
              let tokens = GrantTokens {
                  access_token: issued.access_token,
                  refresh_token: issued.refresh_token.or(Some(refresh_token)),
              };
              let refreshed = RefreshedGrant {
                  tokens: &tokens,
                  expires_at,
                  resource_param_accepted: accepted,
              };
              match runtime
                  .store
                  .store_refreshed(id, &current, &refreshed, &runtime.key, unix_now())
              {
                  Ok(true) => {
                      tracing::info!(connection_id = %id, "gateway: a grant was refreshed");
                      Refreshed::Retry(Fresh::of(&current, tokens.access_token.clone()))
                  }
                  // Changed meanwhile (an edit deleted it): use what is there.
                  Ok(false) => match runtime.store.oauth_credential(id, &runtime.key) {
                      Ok(Some(now)) => Refreshed::Retry(Fresh::of(&now, now.tokens.access_token.clone())),
                      _ => Refreshed::NotRefreshable,
                  },
                  Err(err) => {
                      tracing::error!(connection_id = %id, error = %err, "gateway: a refreshed grant could not be stored");
                      Refreshed::Unsaved
                  }
              }
          }
          Err(err @ (TokenError::Refused { .. } | TokenError::InvalidTarget)) => {
              tracing::warn!(connection_id = %id, why = %err.message(), "gateway: the vendor refused a refresh");
              runtime.announce(runtime.statuses.mark_needs_auth(
                  id,
                  &current.url,
                  "the authorization server refused to refresh the grant",
                  unix_now(),
              ));
              Refreshed::Refused
          }
          Err(err @ (TokenError::Unavailable | TokenError::EgressRefused(_) | TokenError::Invalid)) => {
              tracing::warn!(connection_id = %id, why = %err.message(), "gateway: a refresh did not reach the vendor");
              Refreshed::Unavailable
          }
      }
  }
  ```

Create `crates/hennery-gateway/src/runtime.rs`:

  ```rust
  //! What the gateway's routes, its proxy and its probe share, built once per
  //! collector (plan 8f decision 3): the stores, the master key, the
  //! collector's one egress policy, the `Notifier`, the OAuth flows in
  //! flight, and one refresh lock per connection. One `Arc<Runtime>` goes to
  //! both the API's state and the proxy's: two would be two locks, and no
  //! refresh would be single-flight.

  use crate::flows::Flows;
  use crate::key::MasterKey;
  use crate::model::StatusChange;
  use crate::notify::{self, Notifier};
  use crate::scope::ProxyStore;
  use crate::store::GatewayStore;
  use hennery_kernel::egress::{Allowance, Egress, EgressClient};
  use std::collections::HashMap;
  use std::sync::{Arc, Mutex};
  use std::time::Duration;
  use tokio::sync::OwnedMutexGuard;

  /// How long a started refresh may take at the vendor (gateway spec §4.5).
  pub const REFRESH_TIMEOUT: Duration = Duration::from_secs(20);

  pub struct Runtime {
      pub store: Arc<GatewayStore>,
      /// Session tokens, connections in scope, and status writes.
      pub statuses: Arc<ProxyStore>,
      pub key: Arc<MasterKey>,
      /// The collector's one egress policy, shared with Web Push.
      pub egress: Egress,
      pub notifier: Arc<dyn Notifier>,
      pub flows: Flows,
      /// One registry shared by session transitions and proxy requests.
      pub revocations: crate::revocation::Revocations,
      locks: Mutex<HashMap<String, Arc<tokio::sync::Mutex<()>>>>,
      pub(crate) probes: crate::probe::Probes,
      pub(crate) refresh_timeout: Duration,
      pub(crate) probe_timeout: Duration,
  }

  impl Runtime {
      pub fn new(
          store: Arc<GatewayStore>,
          statuses: Arc<ProxyStore>,
          key: Arc<MasterKey>,
          egress: Egress,
          notifier: Arc<dyn Notifier>,
      ) -> Self {
          Self {
              store,
              statuses,
              key,
              egress,
              notifier,
              flows: Flows::default(),
              revocations: crate::revocation::Revocations::new(),
              locks: Mutex::default(),
              probes: crate::probe::Probes::default(),
              refresh_timeout: REFRESH_TIMEOUT,
              probe_timeout: crate::probe::PROBE_TIMEOUT,
          }
      }

      /// The refresh's bound, shorter for a test.
      pub fn with_refresh_timeout(mut self, timeout: Duration) -> Self {
          self.refresh_timeout = timeout;
          self
      }

      /// The probe's bound, shorter for a test.
      pub fn with_probe_timeout(mut self, timeout: Duration) -> Self {
          self.probe_timeout = timeout;
          self
      }

      /// The connection's refresh lock (gateway spec §4.5): every refresh and
      /// every credential write of the connection holds it.
      pub async fn lock(&self, connection_id: &str) -> OwnedMutexGuard<()> {
          let lock = self
              .locks
              .lock()
              .unwrap_or_else(std::sync::PoisonError::into_inner)
              .entry(connection_id.to_string())
              .or_default()
              .clone();
          lock.lock_owned().await
      }

      /// The egress client for a connection's stored `internal_network` flag
      /// (plan 8d decision 9): the one place the choice is made.
      pub fn client(&self, internal_network: bool) -> EgressClient {
          self.egress.client(if internal_network {
              Allowance::InternalNetwork
          } else {
              Allowance::PublicOnly
          })
      }

      /// Tell the `Notifier` of a status write's transition, if it made one;
      /// a write that failed is logged (gateway spec §7).
      pub fn announce(&self, written: anyhow::Result<Option<StatusChange>>) {
          match written {
              Ok(Some(change)) => notify::announce(self.notifier.as_ref(), &change),
              Ok(None) => {}
              Err(err) => tracing::error!(error = %err, "gateway: a connection's status was not recorded"),
          }
      }

      /// A problem present at startup is announced once (gateway spec §7):
      /// every connection in `needs_auth` or `error` now.
      pub fn announce_startup(&self) -> anyhow::Result<()> {
          for change in self.statuses.problems()? {
              notify::announce(self.notifier.as_ref(), &change);
          }
          Ok(())
      }
  }
  ```

In `crates/hennery-gateway/src/session.rs`, replace:

  ```rust
              store: gateway.store.clone(),
              key: gateway.key.clone(),
              operator: gateway.operator.clone(),
              revocations: gateway.revocations.clone(),
  ```

with:

  ```rust
              store: gateway.runtime.store.clone(),
              key: gateway.runtime.key.clone(),
              operator: gateway.operator.clone(),
              revocations: gateway.runtime.revocations.clone(),
  ```

In `crates/hennery-gateway/tests/api_log.rs`, replace:

  ```rust
          runtime: runtime(&db, store.clone(), key.clone()),
          operator,
          revocations: Default::default(),
      });
      let send = |method: &str, path: &str, body: String| {
  ```

with:

  ```rust
          runtime: runtime(&db, store.clone(), key.clone()),
          operator,
      });
      let send = |method: &str, path: &str, body: String| {
  ```

In `crates/hennery-gateway/tests/api_log.rs`, replace:

  ```rust
          revocations: Default::default(),
  ```

with:

  ```rust
  ```

In `crates/hennery-gateway/tests/support/upstream.rs`, replace:

  ```rust
      let egress = Egress::new(Timeouts {
          connect: Duration::from_secs(2),
          request: Duration::from_secs(10),
      })
      .unwrap();
      let gateway = world.gateway();
  ```

with:

  ```rust
      let egress = test_egress();
  ```

In `crates/hennery-sessions/tests/session_mcp.rs`, replace:

  ```rust
          let gateway = GatewayState {
              store: gateway_store,
              key: Arc::new(MasterKey::from_bytes([7; 32])),
              operator: Arc::new(operator),
              revocations: revocations.clone(),
  ```

with:

  ```rust
          let mut runtime = hennery_gateway::runtime::Runtime::new(
              gateway_store,
              Arc::new(ProxyStore::open(&db).unwrap()),
              Arc::new(MasterKey::from_bytes([7; 32])),
              hennery_kernel::egress::Egress::new(hennery_kernel::egress::Timeouts::DEFAULT).unwrap(),
              Arc::new(hennery_gateway::notify::Silent),
          );
          runtime.revocations = revocations.clone();
          let gateway = GatewayState {
              runtime: Arc::new(runtime),
              operator: Arc::new(operator),
  ```

In `crates/hennery-testkit/tests/purge.rs`, replace:

  ```rust
      let gateway = hennery_gateway::open(&c.db, &keys, c.state.operator.clone()).unwrap();
  ```

with:

  ```rust
      let gateway = hennery_gateway::open(
          &c.db,
          &keys,
          c.state.operator.clone(),
          hennery_kernel::egress::Egress::new(hennery_kernel::egress::Timeouts::DEFAULT).unwrap(),
          std::sync::Arc::new(hennery_gateway::notify::Silent),
      )
      .unwrap();
  ```

In `crates/hennery-testkit/tests/purge.rs`, replace:

  ```rust
          gateway.store.create(&new, NOW).unwrap(),
  ```

with:

  ```rust
          gateway.runtime.store.create(&new, NOW).unwrap(),
  ```

In `crates/hennery-testkit/tests/purge.rs`, replace:

  ```rust
              .store
              .replace_stdio_set(HOST, hat, &[stdio], &gateway.key, NOW)
  ```

with:

  ```rust
              .runtime
              .store
              .replace_stdio_set(HOST, hat, &[stdio], &gateway.runtime.key, NOW)
  ```

In `crates/hennery-testkit/tests/purge.rs`, replace:

  ```rust
      hennery_gateway::tokens::mint_in(&tx, gateway.store.owner_id(), session, HOST, hat, NOW).unwrap();
  ```

with:

  ```rust
      hennery_gateway::tokens::mint_in(&tx, gateway.runtime.store.owner_id(), session, HOST, hat, NOW).unwrap();
  ```

In `crates/hennery-testkit/tests/session_gateway.rs`, replace:

  ```rust
  use hennery_gateway::scope::ProxyStore;
  ```

with:

  ```rust
  ```

In `crates/hennery-testkit/tests/session_gateway.rs`, replace:

  ```rust
          let gateway = hennery_gateway::open(&db, &keys, state.operator.clone()).unwrap();
          state.store.set_session_mcp(Arc::new(GatewayMcp::new(&gateway)));
          let egress = Egress::new(Timeouts {
              connect: Duration::from_secs(5),
              request: Duration::from_secs(60),
          })
          .unwrap();
          let proxy = ProxyState::full(
              Arc::new(ProxyStore::open(&db).unwrap()),
              &gateway,
              egress,
              Limits::default(),
          );
  ```

with:

  ```rust
          let gateway = hennery_gateway::open(
              &db,
              &keys,
              state.operator.clone(),
              Egress::new(Timeouts::DEFAULT).unwrap(),
              Arc::new(hennery_gateway::notify::Silent),
          )
          .unwrap();
          state.store.set_session_mcp(Arc::new(GatewayMcp::new(&gateway)));
          let proxy = ProxyState::for_sessions(gateway.runtime.clone(), Limits::default());
  ```

In `crates/hennery-testkit/tests/session_gateway.rs`, replace:

  ```rust
          let Change::Done(record) = self.gateway.store.create(&new, 0).unwrap() else {
  ```

with:

  ```rust
          let Change::Done(record) = self.gateway.runtime.store.create(&new, 0).unwrap() else {
  ```

In `crates/hennery-testkit/tests/session_gateway.rs`, replace:

  ```rust
              self.gateway
                  .store
  ```

with:

  ```rust
              self.gateway
                  .runtime
                  .store
  ```

In `crates/hennery-testkit/tests/session_gateway.rs`, replace:

  ```rust
              c.gateway.store.owner_id(),
  ```

with:

  ```rust
              c.gateway.runtime.store.owner_id(),
  ```

In `crates/hennery/src/main.rs`, replace:

  ```rust
      let gateway_routes = gateway(&state, &db, &keys, &egress)?;
  ```

with:

  ```rust
      let (gateway, proxy) = start_gateway(&db, &keys, &state, &egress, hennery_gateway::probe::EVERY)?;
  ```

In `crates/hennery/src/main.rs`, replace:

  ```rust
          hennery_sessions::router(state.clone()).merge(gateway_routes),
  ```

with:

  ```rust
          hennery_sessions::router(state.clone())
              .merge(hennery_gateway::api::router(gateway))
              .merge(hennery_gateway::proxy::router(proxy)),
  ```

In `crates/hennery/src/main.rs`, replace:

  ```rust
  /// The gateway on the collector's `hennery.db` (plan 8a), wired into the
  /// sessions `state` serves, and its routes. Sessions mint and revoke their
  /// tokens through it, inside their own transactions (plan 8e, lane L1);
  /// its proxy (plan 8d), `/mcp/<slug>`, watches the same revocations, so a
  /// revoke cuts what is open on the token. The proxy takes bearer tokens,
  /// beside the operator's routes and outside them (lane L8), and sends only
  /// through `egress`, the collector's one, shared with Web Push.
  fn gateway(
      state: &AppState,
      db: &std::path::Path,
      keys: &hennery_gateway::key::KeySource,
      egress: &hennery_kernel::egress::Egress,
  ) -> Result<axum::Router> {
      let gateway = hennery_gateway::open(db, keys, state.operator.clone())?;
      state
          .store
          .set_session_mcp(std::sync::Arc::new(hennery_gateway::session::GatewayMcp::new(&gateway)));
      let proxy = hennery_gateway::proxy::ProxyState::full(
          std::sync::Arc::new(hennery_gateway::scope::ProxyStore::open(db)?),
          &gateway,
          egress.clone(),
          hennery_gateway::proxy::Limits::default(),
      );
      Ok(hennery_gateway::api::router(gateway).merge(hennery_gateway::proxy::router(proxy)))
  ```

with:

  ```rust
  /// The gateway on `db` (plans 8a, 8d, 8f), with the proxy on the same
  /// runtime, so a connection's refresh lock is one:
  /// - its `Notifier` is Web Push (lane L9): a connection moving into or out
  ///   of `needs_auth` or `error` is a notice under its hat's push policy;
  /// - its OAuth calls go through the collector's one `egress`, shared with
  ///   Web Push;
  /// - a problem already there is announced once (gateway spec §7); from
  ///   here on, only transitions;
  /// - the probe of OAuth connections runs every `every` until shutdown.
  fn start_gateway(
      db: &std::path::Path,
      keys: &hennery_gateway::key::KeySource,
      state: &AppState,
      egress: &hennery_kernel::egress::Egress,
      every: std::time::Duration,
  ) -> Result<(hennery_gateway::api::GatewayState, hennery_gateway::proxy::ProxyState)> {
      let gateway = hennery_gateway::open(
          db,
          keys,
          state.operator.clone(),
          egress.clone(),
          std::sync::Arc::new(state.push.clone()),
      )?;
      state
          .store
          .set_session_mcp(std::sync::Arc::new(hennery_gateway::session::GatewayMcp::new(&gateway)));
      gateway.runtime.announce_startup()?;
      let proxy = hennery_gateway::proxy::ProxyState::for_sessions(
          gateway.runtime.clone(),
          hennery_gateway::proxy::Limits::default(),
      );
      tokio::spawn(hennery_gateway::probe::run(
          gateway.runtime.clone(),
          every,
          hennery_gateway::probe::TICK_TIMEOUT,
          state.shutdown.clone().cancelled_owned(),
      ));
      Ok((gateway, proxy))
  ```

In `crates/hennery/src/main.rs`, replace:

  ```rust
          let _routes = gateway(&state, &db, &keys, &egress).unwrap();
  ```

with:

  ```rust
          let _routes = start_gateway(&db, &keys, &state, &egress, hennery_gateway::probe::EVERY).unwrap();
  ```

- [ ] **Step 4: Run the checks**

   Run the five checks:

   ```sh
   nix develop -c cargo fmt --all --check
   nix develop -c cargo clippy --workspace --all-targets --locked -- -D warnings
   nix develop -c cargo clippy -p hennery --locked -- -D warnings
   nix develop -c cargo test --workspace --locked
   nix develop -c cargo run -p hennery-proto --bin gen --locked -- --check
   ```

   Phase B targeted tests: exit 0, 248 passed. See Execution status for the final full gate and task-specific supplementary checks.

- [ ] **Step 5: Commit**

   ```sh
   git add -A && git -c commit.gpgsign=false commit -m "feat(gateway): single-flight refresh, OAuth through the proxy, the probe, and the Notifier on Web Push"
   ```

### Task 6: Connect from the web UI: the client, authorize, the callback, probe now

**Files:** Create `crates/hennery-gateway/src/oauth_api.rs`, `src/callback.rs`, `tests/oauth.rs`, `tests/oauth_differential.rs`, `tests/oauth_log.rs`; modify `src/api.rs`, `src/lib.rs`, `src/model.rs`, `tests/api.rs`, `tests/api_log.rs`, `tests/support/differential.rs`; `crates/hennery-kernel/src/capabilities.rs`; `crates/hennery-testkit/tests/capabilities.rs`; `crates/hennery/tests/cli.rs`.

- [ ] **Step 1: Write the failing tests**

In `crates/hennery-gateway/tests/api.rs`, replace:

  ```rust
      let mut oauth = api.new_body("oauth");
      oauth["cred_kind"] = json!("oauth_dcr");
  ```

with:

  ```rust
  ```

In `crates/hennery-gateway/tests/api.rs`, replace:

  ```rust
          (
              "POST",
              "/api/mcp/connections".to_string(),
              oauth,
              400,
              "unsupported_cred_kind",
          ),
          ("POST", "/api/mcp/connections".to_string(), bad_slug, 400, "invalid"),
          ("POST", "/api/mcp/connections".to_string(), http, 400, "invalid"),
          ("POST", "/api/mcp/connections".to_string(), extra, 422, "invalid_body"),
          (
              "PATCH",
              path.clone(),
              json!({ "cred_kind": "oauth_client" }),
              400,
              "unsupported_cred_kind",
          ),
  ```

with:

  ```rust
          ("POST", "/api/mcp/connections".to_string(), bad_slug, 400, "invalid"),
          ("POST", "/api/mcp/connections".to_string(), http, 400, "invalid"),
          ("POST", "/api/mcp/connections".to_string(), extra, 422, "invalid_body"),
  ```

In `crates/hennery-gateway/tests/api_log.rs`, replace:

  ```rust
          }
      }
  }
  ```

with:

  ```rust
          }
      }
  }

  /// Plan 8a's follow-up (8f's O6): a stored status the API does not know is
  /// shown as `not_connected` and logged, never silently taken for one. The
  /// schema's CHECK keeps any other out; the test steps around it.
  #[tokio::test]
  async fn an_unknown_stored_status_is_logged() {
      let captured = Captured::default();
      let writer = captured.clone();
      let subscriber = tracing_subscriber::fmt()
          .with_max_level(tracing::Level::TRACE)
          .with_ansi(false)
          .with_writer(move || writer.clone())
          .finish();
      let _guard = tracing::subscriber::set_default(subscriber);

      let dir = tempfile::tempdir().unwrap();
      let db = dir.path().join("hennery.db");
      let operator = Arc::new(Operator::open(&db).unwrap());
      let now = unix_now();
      let setup = operator.issue_setup_token(now).unwrap().unwrap();
      let SetupOutcome::Done { phc, .. } = operator.set_up(&setup, "correct horse battery", ORIGIN, now).unwrap() else {
          panic!("setup failed");
      };
      let session = operator.open_session("test", &phc, now).unwrap().unwrap();
      let hat = Hosts::open(&db).unwrap().default_hat_for_new_hosts().unwrap();
      let store = Arc::new(GatewayStore::open(&db).unwrap());
      let key = Arc::new(MasterKey::from_bytes([5; 32]));
      let hennery_gateway::model::Change::Done(record) = store
          .create(
              &hennery_gateway::model::NewConnection {
                  slug: "linear".into(),
                  label: "L".into(),
                  url: "https://mcp.example/".into(),
                  hat_id: hat,
                  cred_kind: hennery_gateway::model::CredKind::None,
                  static_header: None,
                  static_prefix: None,
                  tool_allowlist: None,
                  internal_network: false,
              },
              now,
          )
          .unwrap()
      else {
          panic!("not created");
      };
      let raw = rusqlite::Connection::open(&db).unwrap();
      raw.execute_batch("PRAGMA ignore_check_constraints = ON;").unwrap();
      raw.execute("UPDATE gw_connections SET status = 'weird' WHERE id = ?1", [&record.id])
          .unwrap();
      let app = router(GatewayState {
          runtime: runtime(&db, store, key),
          operator,
      });
      let resp = app
          .oneshot(
              Request::get("/api/mcp/connections")
                  .header("origin", ORIGIN)
                  .header("cookie", format!("hennery_session={session}"))
                  .body(Body::empty())
                  .unwrap(),
          )
          .await
          .unwrap();
      assert_eq!(resp.status(), StatusCode::OK);
      let list: serde_json::Value =
          serde_json::from_slice(&axum::body::to_bytes(resp.into_body(), 1 << 20).await.unwrap()).unwrap();
      assert_eq!(list[0]["status"], "not_connected");
      let log = captured.0.lock().unwrap().clone();
      assert!(
          contains(&log, "a stored status the API does not know") && contains(&log, &record.id),
          "{}",
          String::from_utf8_lossy(&log)
      );
  }
  ```

Create `crates/hennery-gateway/tests/oauth.rs`:

  ```rust
  //! OAuth Connect (gateway spec §4, §11; plan 8f): authorize, consent at a
  //! fake authorization server, and the callback, through the gateway's
  //! router in-process. The fake is on loopback; its connections are marked
  //! "internal network" (lane L7).

  mod support;

  use axum::Router;
  use axum::body::Body;
  use axum::http::{HeaderMap, Request, StatusCode, header};
  use hennery_gateway::api::{GatewayState, router};
  use hennery_gateway::model::{ConnectionPatch, CredKind, NewConnection, Status};
  use hennery_gateway::notify::Alert;
  use hennery_gateway::runtime::Runtime;
  use hennery_kernel::operator::{Operator, SetupOutcome};
  use hennery_kernel::secret::unix_now;
  use serde_json::{Value, json};
  use std::sync::Arc;
  use std::time::Duration;
  use support::oauth::{Config, FakeAs, MetaAt, PrAt};
  use support::{Recorder, World};
  use tower::ServiceExt;

  const ORIGIN: &str = "https://hennery.example";
  const PASSWORD: &str = "correct horse battery";
  const CALLBACK: &str = "https://hennery.example/api/mcp/oauth/callback";

  struct Harness {
      world: World,
      app: Router,
      operator: Arc<Operator>,
      runtime: Arc<Runtime>,
      alerts: Arc<Recorder>,
      phc: String,
  }

  /// What a callback answered.
  struct Page {
      status: StatusCode,
      headers: HeaderMap,
      html: String,
  }

  impl Page {
      fn result(&self) -> String {
          let at = self.html.find("data-result=\"").expect("a result") + "data-result=\"".len();
          self.html[at..].split('"').next().unwrap().to_string()
      }
  }

  impl Harness {
      fn new() -> Self {
          let world = World::new();
          let operator = Arc::new(Operator::open(&world.db).unwrap());
          let now = unix_now();
          let setup = operator.issue_setup_token(now).unwrap().unwrap();
          let SetupOutcome::Done { phc, .. } = operator.set_up(&setup, PASSWORD, ORIGIN, now).unwrap() else {
              panic!("setup failed");
          };
          let alerts = Arc::new(Recorder::default());
          let runtime = world.runtime(support::test_egress(), alerts.clone());
          let app = router(GatewayState {
              runtime: runtime.clone(),
              operator: operator.clone(),
          });
          Self {
              world,
              app,
              operator,
              runtime,
              alerts,
              phc,
          }
      }

      fn session(&self, age: i64) -> String {
          self.operator
              .open_session("test", &self.phc, unix_now() - age)
              .unwrap()
              .unwrap()
      }

      /// An OAuth connection of `kind` to `url`, on the internal network.
      fn connection(&self, slug: &str, url: &str, kind: CredKind) -> String {
          self.world.connection_with(NewConnection {
              slug: slug.into(),
              label: format!("Label {slug}"),
              url: url.into(),
              hat_id: self.world.hat(),
              cred_kind: kind,
              static_header: None,
              static_prefix: None,
              tool_allowlist: None,
              internal_network: true,
          })
      }

      async fn send(
          &self,
          session: &str,
          method: &str,
          path: &str,
          body: Option<Value>,
      ) -> (StatusCode, HeaderMap, Value) {
          let mut req = Request::builder()
              .method(method)
              .uri(path)
              .header("origin", ORIGIN)
              .header("cookie", format!("hennery_session={session}"));
          let body = match body {
              Some(body) => {
                  req = req.header("content-type", "application/json");
                  Body::from(body.to_string())
              }
              None => Body::empty(),
          };
          let resp = self.app.clone().oneshot(req.body(body).unwrap()).await.unwrap();
          let status = resp.status();
          let headers = resp.headers().clone();
          let bytes = axum::body::to_bytes(resp.into_body(), 1 << 20).await.unwrap();
          (status, headers, serde_json::from_slice(&bytes).unwrap_or(Value::Null))
      }

      async fn authorize(&self, id: &str, body: Value) -> (StatusCode, HeaderMap, Value) {
          self.send(
              &self.session(0),
              "POST",
              &format!("/api/mcp/connections/{id}/authorize"),
              Some(body),
          )
          .await
      }

      async fn item(&self, id: &str) -> Value {
          let (_, _, list) = self.send(&self.session(0), "GET", "/api/mcp/connections", None).await;
          list.as_array()
              .unwrap()
              .iter()
              .find(|item| item["id"] == id)
              .cloned()
              .unwrap()
      }

      /// The vendor's redirect back, with `cookie` (`name=value`) as the
      /// browser sends it, and any extra headers.
      async fn callback(&self, location: &str, cookie: Option<&str>, extra: &[(&str, &str)]) -> Page {
          let path = location.strip_prefix(ORIGIN).expect("back to hennery");
          let mut req = Request::builder().method("GET").uri(path);
          if let Some(cookie) = cookie {
              req = req.header("cookie", cookie);
          }
          for (name, value) in extra {
              req = req.header(*name, *value);
          }
          let resp = self
              .app
              .clone()
              .oneshot(req.body(Body::empty()).unwrap())
              .await
              .unwrap();
          let status = resp.status();
          let headers = resp.headers().clone();
          let bytes = axum::body::to_bytes(resp.into_body(), 1 << 20).await.unwrap();
          Page {
              status,
              headers,
              html: String::from_utf8(bytes.to_vec()).unwrap(),
          }
      }

      /// Authorize, consent and come back: the callback's page.
      async fn connect(&self, id: &str, fake: &FakeAs) -> Page {
          let (status, headers, answer) = self.authorize(id, json!({})).await;
          assert_eq!(status, StatusCode::OK, "{answer}");
          let location = fake.consent(answer["consent_url"].as_str().unwrap()).await;
          self.callback(&location, Some(&flow_cookie(&headers)), &[]).await
      }
  }

  /// The flow cookie an authorize set, as `name=value`.
  fn flow_cookie(headers: &HeaderMap) -> String {
      let set = headers[header::SET_COOKIE].to_str().unwrap();
      set.split(';').next().unwrap().to_string()
  }

  fn query_of(url: &str) -> std::collections::HashMap<String, String> {
      url::Url::parse(url).unwrap().query_pairs().into_owned().collect()
  }

  /// Gateway spec §4.1–§4.3, end to end with dynamic registration: the PR
  /// document at its path-inserted URL, RFC 8414 metadata, a public client,
  /// PKCE S256 (the fake checks the verifier), `resource` on consent and
  /// exchange, the grant stored sealed and the status `ok`.
  #[tokio::test]
  async fn a_dynamically_registered_connect_completes() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let (status, headers, answer) = h.authorize(&id, json!({})).await;
      assert_eq!(status, StatusCode::OK, "{answer}");
      let consent = answer["consent_url"].as_str().unwrap();
      let q = query_of(consent);
      assert_eq!(q["code_challenge_method"], "S256");
      assert_eq!(q["redirect_uri"], CALLBACK);
      assert_eq!(q["resource"], fake.mcp_url());
      assert_eq!(q["scope"], "read write", "scopes_supported is requested (G-5)");
      assert!(!q.contains_key("response_mode"), "never form_post");
      let location = fake.consent(consent).await;
      let page = h.callback(&location, Some(&flow_cookie(&headers)), &[]).await;
      assert_eq!(page.status, StatusCode::OK, "{}", page.html);
      assert_eq!(page.result(), "connected");
      assert!(page.html.contains(&format!("data-connection=\"{id}\"")));
      assert!(page.html.contains("Connected. You may close this window."));
      assert_eq!(fake.with(|r| r.registered.len()), 1);
      assert_eq!(
          fake.with(|r| r.token_resources.clone()),
          [("authorization_code".to_string(), Some(fake.mcp_url()))]
      );
      let item = h.item(&id).await;
      assert_eq!(item["status"], "ok");
      assert_eq!(item["has_credential"], true);
      assert_eq!(item["oauth"]["client_id"], fake.with(|r| r.registered[0].clone()));
      assert_eq!(item["oauth"]["redirect_uri"], CALLBACK);
      assert!(item.get("oauth_error").is_none());
      let grant = h.world.store.oauth_credential(&id, &h.world.key).unwrap().unwrap();
      assert!(fake.is_live(&grant.tokens.access_token));
      assert!(grant.expires_at.unwrap() <= unix_now() + 3600 - 60);
  }

  /// Gateway spec §4.1 step 1: the PR document named by a 401's
  /// `WWW-Authenticate` `resource_metadata`, from one unauthenticated
  /// `initialize`, before any well-known URL.
  #[tokio::test]
  async fn the_challenge_s_resource_metadata_is_tried_first() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          pr_at: PrAt::Challenge,
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      assert_eq!(h.connect(&id, &fake).await.result(), "connected");
      let paths = fake.paths();
      assert_eq!(paths[0], "/mcp", "the unauthenticated initialize");
      assert_eq!(paths[1], "/prm-from-challenge");
  }

  /// Gateway spec §4.1 steps 2 and 3, and G-3: path-inserted before the
  /// origin's.
  #[tokio::test]
  async fn the_path_inserted_document_is_tried_before_the_origin_s() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          pr_at: PrAt::Origin,
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      assert_eq!(h.connect(&id, &fake).await.result(), "connected");
      let paths = fake.paths();
      let inserted = paths
          .iter()
          .position(|p| p == "/.well-known/oauth-protected-resource/mcp")
          .unwrap();
      let origin = paths
          .iter()
          .position(|p| p == "/.well-known/oauth-protected-resource")
          .unwrap();
      assert!(inserted < origin, "{paths:?}");
  }

  /// Gateway spec §4.1: without a PR document, the resource's origin is the
  /// authorization server.
  #[tokio::test]
  async fn without_a_resource_document_the_origin_is_the_authorization_server() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          pr_at: PrAt::Nowhere,
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      assert_eq!(h.connect(&id, &fake).await.result(), "connected");
      // No resource was named: no scope either, and nothing to compare.
      assert!(h.item(&id).await["oauth"].get("resource_mismatch").is_none());
  }

  /// Gateway spec §4.1: RFC 8414 inserted before appended, then OpenID
  /// configuration; each form is found, in that order.
  #[tokio::test]
  async fn server_metadata_forms_are_tried_in_order() {
      for (form, expected_at) in [(MetaAt::Inserted, 0), (MetaAt::Appended, 1), (MetaAt::Openid, 2)] {
          let h = Harness::new();
          let fake = FakeAs::start(Config {
              meta_at: form,
              as_path: "/tenant".into(),
              ..Config::default()
          })
          .await;
          let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
          assert_eq!(h.connect(&id, &fake).await.result(), "connected", "{form:?}");
          let tried: Vec<String> = fake
              .paths()
              .into_iter()
              .filter(|p| p.contains("oauth-authorization-server") || p.contains("openid-configuration"))
              .collect();
          let order = [
              "/.well-known/oauth-authorization-server/tenant",
              "/tenant/.well-known/oauth-authorization-server",
              "/tenant/.well-known/openid-configuration",
          ];
          assert_eq!(tried, order[..=expected_at], "{form:?}");
      }
  }

  /// The egress plan's O16: a redirect is "not here", never followed, and the
  /// next candidate is tried.
  #[tokio::test]
  async fn a_redirecting_candidate_is_not_followed() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          pr_at: PrAt::Origin,
          pr_redirect: true,
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      assert_eq!(h.connect(&id, &fake).await.result(), "connected");
      assert!(!fake.paths().iter().any(|p| p == "/elsewhere"), "{:?}", fake.paths());
  }

  /// Plan 8f decision 5: a 5xx at a candidate moves on to the next.
  #[tokio::test]
  async fn a_failing_candidate_is_passed_over() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          pr_at: PrAt::Origin,
          pr_status: Some(503),
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      assert_eq!(h.connect(&id, &fake).await.result(), "connected");
  }

  /// Each refusal of authorize, its code, and its record in `oauth_error`.
  async fn refused(h: &Harness, id: &str, body: Value, status: StatusCode, code: &str) -> Value {
      let (got, _, answer) = h.authorize(id, body).await;
      assert_eq!(
          (got, answer["code"].as_str().unwrap_or_default()),
          (status, code),
          "{answer}"
      );
      let item = h.item(id).await;
      assert_eq!(item["oauth_error"]["code"], code, "{item}");
      assert_ne!(item["status"], "ok", "a failed Connect sets no status");
      answer
  }

  /// RFC 8414 §3.3: metadata whose `issuer` is not the identifier it was
  /// fetched for is not used.
  #[tokio::test]
  async fn metadata_naming_another_issuer_is_refused() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          issuer: Some("https://evil.example".into()),
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let answer = refused(&h, &id, json!({}), StatusCode::BAD_GATEWAY, "discovery_failed").await;
      assert!(answer["message"].as_str().unwrap().contains("issuer"));
  }

  #[tokio::test]
  async fn nothing_found_is_discovery_failed() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          pr_at: PrAt::Nowhere,
          serve_metadata: false,
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      refused(&h, &id, json!({}), StatusCode::BAD_GATEWAY, "discovery_failed").await;
  }

  /// Gateway spec §4.3: PKCE S256 only.
  #[tokio::test]
  async fn a_server_without_s256_is_refused() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          s256: false,
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      refused(&h, &id, json!({}), StatusCode::BAD_GATEWAY, "pkce_unsupported").await;
  }

  /// Gateway spec §4.2: no registration endpoint suggests a pre-registered
  /// client.
  #[tokio::test]
  async fn no_registration_endpoint_suggests_a_pre_registered_client() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          registration: false,
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      refused(&h, &id, json!({}), StatusCode::CONFLICT, "no_registration_endpoint").await;
  }

  /// G-6: the vendor's refusal of a registration is shown, its control and
  /// bidirectional characters stripped, cut to 300 characters.
  #[tokio::test]
  async fn a_registration_refusal_shows_the_vendor_s_text() {
      let h = Harness::new();
      let long = format!("redirect_uri must be https\u{202e}\u{0007} {}", "x".repeat(400));
      let fake = FakeAs::start(Config {
          dcr_refusal: Some((
              400,
              json!({ "error": "invalid_redirect_uri", "error_description": long }),
          )),
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let answer = refused(&h, &id, json!({}), StatusCode::BAD_GATEWAY, "registration_refused").await;
      let message = answer["message"].as_str().unwrap();
      let said = message.strip_prefix("The vendor said: ").expect(message);
      assert!(
          said.starts_with("invalid_redirect_uri: redirect_uri must be https"),
          "{said}"
      );
      assert!(said.chars().count() <= 300, "{}", said.chars().count());
      assert!(!said.contains('\u{202e}') && !said.contains('\u{0007}'));
  }

  /// G-1: a pre-registered confidential client, its secret sent as Basic
  /// auth to the token endpoint only.
  #[tokio::test]
  async fn a_pre_registered_confidential_client_connects() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          registration: false,
          confidential: Some(("pre-1".into(), "s3cret-value".into())),
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthClient);
      refused(&h, &id, json!({}), StatusCode::CONFLICT, "no_oauth_client").await;
      let (status, _, item) = h
          .send(
              &h.session(0),
              "PUT",
              &format!("/api/mcp/connections/{id}/oauth-client"),
              Some(json!({ "client_id": "pre-1", "client_secret": "s3cret-value" })),
          )
          .await;
      assert_eq!(status, StatusCode::OK, "{item}");
      assert_eq!(item["oauth"]["client_id"], "pre-1");
      assert_eq!(item["oauth"]["has_client_secret"], true);
      assert!(item.to_string().find("s3cret").is_none(), "no route answers the secret");
      assert_eq!(h.connect(&id, &fake).await.result(), "connected");
      assert_eq!(fake.with(|r| r.basic.clone()), ["pre-1:s3cret-value"]);
      assert_eq!(fake.with(|r| r.registered.len()), 0);
      assert!(!fake.paths().iter().any(|p| p.contains("s3cret")), "never in a URL");
  }

  /// The review's R2: a pre-registered client is pinned to the issuer its
  /// first authorize found; another one after is `issuer_changed` until the
  /// client is entered again.
  #[tokio::test]
  async fn a_pinned_client_refuses_another_issuer() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthClient);
      let put = json!({ "client_id": "pre-1", "client_secret": null });
      let path = format!("/api/mcp/connections/{id}/oauth-client");
      assert_eq!(
          h.send(&h.session(0), "PUT", &path, Some(put.clone())).await.0,
          StatusCode::OK
      );
      assert_eq!(h.authorize(&id, json!({})).await.0, StatusCode::OK);
      fake.configure(|c| c.as_path = "/other".into());
      refused(&h, &id, json!({}), StatusCode::CONFLICT, "issuer_changed").await;
      assert_eq!(h.send(&h.session(0), "PUT", &path, Some(put)).await.0, StatusCode::OK);
      assert_eq!(h.authorize(&id, json!({})).await.0, StatusCode::OK);
  }

  /// api-8e-8f B2: a secret is kept only for the same client id; a new id
  /// needs one, or `null`.
  #[tokio::test]
  async fn a_secret_never_moves_to_another_client() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthClient);
      let path = format!("/api/mcp/connections/{id}/oauth-client");
      let s = h.session(0);
      let (status, _, item) = h
          .send(
              &s,
              "PUT",
              &path,
              Some(json!({ "client_id": "a", "client_secret": "one" })),
          )
          .await;
      assert_eq!(status, StatusCode::OK, "{item}");
      let (status, _, item) = h.send(&s, "PUT", &path, Some(json!({ "client_id": "a" }))).await;
      assert_eq!(
          (status, item["oauth"]["has_client_secret"].clone()),
          (StatusCode::OK, json!(true))
      );
      let (status, _, answer) = h.send(&s, "PUT", &path, Some(json!({ "client_id": "b" }))).await;
      assert_eq!(
          (status, answer["code"].clone()),
          (StatusCode::BAD_REQUEST, json!("invalid"))
      );
      let (status, _, item) = h
          .send(
              &s,
              "PUT",
              &path,
              Some(json!({ "client_id": "b", "client_secret": null })),
          )
          .await;
      assert_eq!(
          (status, item["oauth"]["has_client_secret"].clone()),
          (StatusCode::OK, json!(false))
      );
      // Step-up, and only for `oauth_client`.
      let stale = h.session(10 * 60);
      assert_eq!(
          h.send(
              &stale,
              "PUT",
              &path,
              Some(json!({ "client_id": "c", "client_secret": null }))
          )
          .await
          .2["code"],
          "step_up_required"
      );
      let dcr = h.connection("other", &fake.mcp_url(), CredKind::OauthDcr);
      let (status, _, answer) = h
          .send(
              &s,
              "PUT",
              &format!("/api/mcp/connections/{dcr}/oauth-client"),
              Some(json!({ "client_id": "c", "client_secret": null })),
          )
          .await;
      assert_eq!(
          (status, answer["code"].clone()),
          (StatusCode::CONFLICT, json!("wrong_cred_kind"))
      );
  }

  /// G-7: a client saved while a grant is live waits, pending, and the grant
  /// keeps working until a Connect with the new client completes; an
  /// abandoned Connect leaves it so.
  #[tokio::test]
  async fn a_new_client_replaces_a_live_grant_s_only_when_its_connect_completes() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthClient);
      let path = format!("/api/mcp/connections/{id}/oauth-client");
      let s = h.session(0);
      h.send(
          &s,
          "PUT",
          &path,
          Some(json!({ "client_id": "pre-old", "client_secret": null })),
      )
      .await;
      assert_eq!(h.connect(&id, &fake).await.result(), "connected");
      let old = h.world.store.oauth_credential(&id, &h.world.key).unwrap().unwrap();
      let (_, _, item) = h
          .send(
              &s,
              "PUT",
              &path,
              Some(json!({ "client_id": "pre-new", "client_secret": null })),
          )
          .await;
      assert_eq!(item["oauth"]["client_id"], "pre-old");
      assert_eq!(item["oauth"]["pending_client"]["client_id"], "pre-new");
      // An abandoned Connect with the new one: the old grant stands.
      let (status, _, answer) = h.authorize(&id, json!({})).await;
      assert_eq!(status, StatusCode::OK);
      assert_eq!(
          query_of(answer["consent_url"].as_str().unwrap())["client_id"],
          "pre-new"
      );
      let still = h.world.store.oauth_credential(&id, &h.world.key).unwrap().unwrap();
      assert_eq!(still.client.client_id, "pre-old");
      assert_eq!(still.tokens.access_token, old.tokens.access_token);
      // Completed: the new one is the client.
      assert_eq!(h.connect(&id, &fake).await.result(), "connected");
      let item = h.item(&id).await;
      assert_eq!(item["oauth"]["client_id"], "pre-new");
      assert!(item["oauth"].get("pending_client").is_none());
  }

  /// api-8e-8f S3: repeated clicks reuse the registration the latest
  /// unconsumed flow holds, instead of registering again.
  #[tokio::test]
  async fn repeated_clicks_register_once() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      for _ in 0..3 {
          assert_eq!(h.authorize(&id, json!({})).await.0, StatusCode::OK);
      }
      assert_eq!(fake.with(|r| r.registered.len()), 1);
      assert_eq!(h.connect(&id, &fake).await.result(), "connected");
      // A grant made with it: the next Connect reuses the stored client.
      assert_eq!(h.connect(&id, &fake).await.result(), "connected");
      assert_eq!(fake.with(|r| r.registered.len()), 1);
  }

  /// Gateway spec §4.3: a server refusing `resource` at the token endpoint
  /// is asked once more without it, and that is recorded (and used on
  /// refresh).
  #[tokio::test]
  async fn the_exchange_is_retried_once_without_resource() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          refuse_resource_at_token: true,
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      assert_eq!(h.connect(&id, &fake).await.result(), "connected");
      assert_eq!(
          fake.with(|r| r.token_resources.clone()),
          [
              ("authorization_code".to_string(), Some(fake.mcp_url())),
              ("authorization_code".to_string(), None),
          ]
      );
      let grant = h.world.store.oauth_credential(&id, &h.world.key).unwrap().unwrap();
      assert!(!grant.resource_param_accepted);
  }

  /// Plan 8f decision 11: a consent refusing `resource` cannot be retried
  /// by the callback, which redirects nowhere; the next Connect omits it.
  #[tokio::test]
  async fn a_consent_refusing_resource_is_retried_without_it_by_the_next_connect() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          refuse_resource_at_consent: true,
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let page = h.connect(&id, &fake).await;
      assert_eq!(page.result(), "consent_denied");
      assert!(page.html.contains("Connect again"), "{}", page.html);
      assert_eq!(h.connect(&id, &fake).await.result(), "connected");
      assert_eq!(fake.with(|r| r.consent_resources.clone()), [Some(fake.mcp_url()), None]);
  }

  /// Gateway spec §4.3: a consent completed in another browser has no flow
  /// cookie, and is refused; the flow is consumed, so it cannot be retried
  /// with a guessed cookie; nothing is stored.
  #[tokio::test]
  async fn a_callback_without_the_flow_s_cookie_is_refused() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let (_, headers, answer) = h.authorize(&id, json!({})).await;
      let cookie = flow_cookie(&headers);
      let location = fake.consent(answer["consent_url"].as_str().unwrap()).await;
      let (name, _) = cookie.split_once('=').unwrap();
      let wrong = format!("{name}={}", "0".repeat(64));
      let page = h.callback(&location, Some(&wrong), &[]).await;
      assert_eq!(
          (page.status, page.result()),
          (StatusCode::BAD_REQUEST, "flow_mismatch".into())
      );
      assert!(page.headers[header::SET_COOKIE].to_str().unwrap().contains("Max-Age=0"));
      let page = h.callback(&location, None, &[]).await;
      assert_eq!(page.result(), "flow_unknown");
      let page = h.callback(&location, Some(&cookie), &[]).await;
      assert_eq!(page.result(), "flow_unknown", "consumed");
      assert_eq!(fake.with(|r| r.exchanges), 0);
      let item = h.item(&id).await;
      assert_eq!(item["has_credential"], false);
      assert!(item.get("oauth_error").is_none(), "steps 1 and 2 name no connection");
  }

  /// api-8e-8f R3: one of several same-name cookies may be the flow's (a
  /// sibling subdomain can set the name too).
  #[tokio::test]
  async fn the_flow_s_cookie_is_found_among_same_name_ones() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let (_, headers, answer) = h.authorize(&id, json!({})).await;
      let cookie = flow_cookie(&headers);
      let (name, _) = cookie.split_once('=').unwrap();
      let location = fake.consent(answer["consent_url"].as_str().unwrap()).await;
      let both = format!("{name}=shadow; {cookie}");
      assert_eq!(h.callback(&location, Some(&both), &[]).await.result(), "connected");
  }

  /// Lane L16: `state` (or `code`) twice, or with a control character, is
  /// read as neither, before any storage.
  #[tokio::test]
  async fn a_callback_s_parameters_are_read_only_once() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let (_, headers, answer) = h.authorize(&id, json!({})).await;
      let cookie = flow_cookie(&headers);
      let location = fake.consent(answer["consent_url"].as_str().unwrap()).await;
      let q = query_of(&location);
      for doubled in [
          format!("{CALLBACK}?state={}&state=other&code={}", q["state"], q["code"]),
          format!("{CALLBACK}?state={}&code={}&code=other", q["state"], q["code"]),
          format!("{CALLBACK}?state={}%00&code={}", q["state"], q["code"]),
          // The flow is known here: only the control character refuses it.
          format!("{CALLBACK}?state={}&code={}%00", q["state"], q["code"]),
          format!("{CALLBACK}?state={}&code={}&STATE=other", q["state"], q["code"]),
      ] {
          let page = h.callback(&doubled, Some(&cookie), &[]).await;
          assert_eq!(page.result(), "flow_unknown", "{doubled}");
      }
      // The flow was not touched: the real redirect still completes.
      assert_eq!(h.callback(&location, Some(&cookie), &[]).await.result(), "connected");
  }

  /// The review's R6 (RFC 9207): an `iss` other than the flow's issuer, or
  /// none when the server says it sends one, is a mix-up.
  #[tokio::test]
  async fn a_callback_from_another_issuer_is_refused() {
      for config in [
          Config {
              iss_sent: Some(Some("https://evil.example".into())),
              ..Config::default()
          },
          Config {
              iss_parameter: true,
              iss_sent: Some(None),
              ..Config::default()
          },
      ] {
          let h = Harness::new();
          let fake = FakeAs::start(config).await;
          let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
          let page = h.connect(&id, &fake).await;
          assert_eq!(page.result(), "issuer_mismatch");
          assert_eq!(h.item(&id).await["oauth_error"]["code"], "issuer_mismatch");
          assert_eq!(fake.with(|r| r.exchanges), 0);
      }
  }

  /// A consent the operator (or the vendor) refused: its text, as text.
  #[tokio::test]
  async fn a_denied_consent_shows_the_vendor_s_text_escaped() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          deny: Some("<b>no</b> thanks".into()),
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let page = h.connect(&id, &fake).await;
      assert_eq!(page.result(), "consent_denied");
      assert!(
          page.html
              .contains("The vendor said: access_denied: &lt;b&gt;no&lt;/b&gt; thanks"),
          "{}",
          page.html
      );
      assert!(!page.html.contains("<b>"));
  }

  /// api-8e-8f B5 step 4: the operator's session that started the flow must
  /// still be live.
  #[tokio::test]
  async fn a_callback_after_the_session_ended_is_refused() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let session = h.session(0);
      let (_, headers, answer) = h
          .send(
              &session,
              "POST",
              &format!("/api/mcp/connections/{id}/authorize"),
              Some(json!({})),
          )
          .await;
      let location = fake.consent(answer["consent_url"].as_str().unwrap()).await;
      let operator_session = h.operator.authenticate(&session, unix_now()).unwrap().unwrap();
      assert!(
          h.operator
              .revoke_session(&operator_session.session_id, unix_now())
              .unwrap()
      );
      let page = h.callback(&location, Some(&flow_cookie(&headers)), &[]).await;
      assert_eq!(page.result(), "session_ended");
  }

  /// The review's R1: a connection edited while its flow ran is not given
  /// the grant, even when nothing dropped the flow.
  #[tokio::test]
  async fn a_connection_changed_meanwhile_gets_no_grant() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let (_, headers, answer) = h.authorize(&id, json!({})).await;
      let location = fake.consent(answer["consent_url"].as_str().unwrap()).await;
      // Behind the API's back (which would drop the flow): a path edit.
      h.world
          .store
          .update(
              &id,
              &ConnectionPatch {
                  url: Some(format!("{}/moved", fake.mcp_url())),
                  ..ConnectionPatch::default()
              },
              unix_now(),
          )
          .unwrap();
      let page = h.callback(&location, Some(&flow_cookie(&headers)), &[]).await;
      assert_eq!(page.result(), "connection_changed");
      assert_eq!(h.item(&id).await["has_credential"], false);
  }

  /// The review's R1: an edit through the API drops the connection's flows.
  #[tokio::test]
  async fn an_edit_drops_the_connection_s_flows() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let (_, headers, answer) = h.authorize(&id, json!({})).await;
      let location = fake.consent(answer["consent_url"].as_str().unwrap()).await;
      let (status, _, _) = h
          .send(
              &h.session(0),
              "PATCH",
              &format!("/api/mcp/connections/{id}"),
              Some(json!({ "url": format!("{}/moved", fake.mcp_url()) })),
          )
          .await;
      assert_eq!(status, StatusCode::OK);
      assert_eq!(
          h.callback(&location, Some(&flow_cookie(&headers)), &[]).await.result(),
          "flow_unknown"
      );
  }

  /// Gateway spec §4.1 (G-4) and api-8e-8f F3, R4: another path on the same
  /// origin is shown and may be accepted, exactly; another origin may not.
  #[tokio::test]
  async fn a_mismatching_resource_is_accepted_only_exactly() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let other = format!("{}/v2/mcp", fake.origin());
      fake.configure(|c| c.resource = Some(other.clone()));
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let answer = refused(&h, &id, json!({}), StatusCode::CONFLICT, "resource_mismatch").await;
      assert!(
          !answer["message"].as_str().unwrap().contains("v2"),
          "only origins in an error (L11)"
      );
      assert_eq!(h.item(&id).await["oauth"]["resource_mismatch"], other);
      // A stale acceptance is a mismatch again, with the value found now
      // (api-8e-8f F3: the frontend refetches the item only on 409).
      let stale = other.clone();
      let other = format!("{}/v3/mcp", fake.origin());
      fake.configure(|c| c.resource = Some(other.clone()));
      let answer = refused(
          &h,
          &id,
          json!({ "accept_resource": stale }),
          StatusCode::CONFLICT,
          "resource_mismatch",
      )
      .await;
      assert!(
          !answer["message"].as_str().unwrap().contains("v3"),
          "only origins in an error (L11)"
      );
      let item = h.item(&id).await;
      assert_eq!(item["oauth"]["resource_mismatch"], other);
      assert!(item["oauth"].get("accepted_resource").is_none());
      let (status, _, _) = h.authorize(&id, json!({ "accept_resource": other })).await;
      assert_eq!(status, StatusCode::OK);
      let item = h.item(&id).await;
      assert_eq!(item["oauth"]["accepted_resource"], other);
      assert!(item["oauth"].get("resource_mismatch").is_none());
      // Kept for the next authorize; cleared by any URL change (F1).
      assert_eq!(h.authorize(&id, json!({})).await.0, StatusCode::OK);
      h.send(
          &h.session(0),
          "PATCH",
          &format!("/api/mcp/connections/{id}"),
          Some(json!({ "url": format!("{}/mcp/", fake.origin()) })),
      )
      .await;
      assert!(h.item(&id).await["oauth"].get("accepted_resource").is_none());
      // A resource on another origin cannot be accepted (R4).
      fake.configure(|c| c.resource = Some("https://other.example/mcp".into()));
      refused(
          &h,
          &id,
          json!({ "accept_resource": "https://other.example/mcp" }),
          StatusCode::BAD_GATEWAY,
          "resource_foreign",
      )
      .await;
  }

  /// O13 (plan 8b-ii's hand-off): OAuth URLs are `https` or loopback `http`,
  /// even on a connection marked internal network, whose egress client would
  /// send plain `http` to an internal address.
  #[tokio::test]
  async fn plain_http_endpoints_are_refused_even_on_the_internal_network() {
      for endpoint in ["http://auth.example/token", "http://10.0.0.1/token"] {
          let h = Harness::new();
          let fake = FakeAs::start(Config {
              token_endpoint: Some(endpoint.into()),
              ..Config::default()
          })
          .await;
          let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
          refused(&h, &id, json!({}), StatusCode::BAD_GATEWAY, "insecure_metadata").await;
      }
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          authorization_endpoint: Some("http://auth.example/authorize".into()),
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      refused(&h, &id, json!({}), StatusCode::BAD_GATEWAY, "insecure_metadata").await;
  }

  /// The egress policy covers discovery: a loopback upstream not marked
  /// internal is refused, and a closed port is unreachable.
  #[tokio::test]
  async fn egress_refusals_and_unreachable_servers_are_told_apart() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = h.world.connection_with(NewConnection {
          slug: "public".into(),
          label: "Public".into(),
          url: format!("https://127.0.0.1:{}/mcp", fake.addr.port()),
          hat_id: h.world.hat(),
          cred_kind: CredKind::OauthDcr,
          static_header: None,
          static_prefix: None,
          tool_allowlist: None,
          internal_network: false,
      });
      refused(&h, &id, json!({}), StatusCode::BAD_GATEWAY, "egress_refused").await;
      let closed = std::net::TcpListener::bind("127.0.0.1:0")
          .unwrap()
          .local_addr()
          .unwrap()
          .port();
      let id = h.connection("closed", &format!("http://127.0.0.1:{closed}/mcp"), CredKind::OauthDcr);
      refused(&h, &id, json!({}), StatusCode::BAD_GATEWAY, "upstream_unreachable").await;
  }

  /// api-8e-8f B3: authorize needs step-up (F2) and an OAuth kind.
  #[tokio::test]
  async fn authorize_needs_step_up_and_an_oauth_kind() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let (status, _, answer) = h
          .send(
              &h.session(10 * 60),
              "POST",
              &format!("/api/mcp/connections/{id}/authorize"),
              Some(json!({})),
          )
          .await;
      assert_eq!(
          (status, answer["code"].clone()),
          (StatusCode::FORBIDDEN, json!("step_up_required"))
      );
      let fixed = h.world.connection("static", &fake.mcp_url(), CredKind::Static);
      let (status, _, answer) = h.authorize(&fixed, json!({})).await;
      assert_eq!(
          (status, answer["code"].clone()),
          (StatusCode::CONFLICT, json!("wrong_cred_kind"))
      );
      let (status, _, answer) = h.authorize("conn-0000000000000000", json!({})).await;
      assert_eq!(
          (status, answer["code"].clone()),
          (StatusCode::NOT_FOUND, json!("not_found"))
      );
      assert_eq!(fake.paths().len(), 0, "nothing was sent");
  }

  /// api-8e-8f B3: the flow cookie's attributes, tied to the flow's TTL.
  #[tokio::test]
  async fn the_flow_cookie_is_http_only_lax_secure_and_scoped_to_the_callback() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let (_, headers, answer) = h.authorize(&id, json!({})).await;
      let set = headers[header::SET_COOKIE].to_str().unwrap();
      assert!(set.starts_with("hennery_mcp_flow_"), "{set}");
      for part in [
          "HttpOnly",
          "SameSite=Lax",
          "Path=/api/mcp/oauth/callback",
          "Max-Age=900",
          "Secure",
      ] {
          assert!(set.contains(part), "{set}");
      }
      let now = unix_now();
      let expected: Vec<String> = (now + 897..=now + 900).map(hennery_kernel::secret::rfc3339).collect();
      assert!(
          expected.contains(&answer["expires_at"].as_str().unwrap().to_string()),
          "{answer}"
      );
  }

  /// api-8e-8f F5: at most 16 Connects in flight.
  #[tokio::test]
  async fn at_most_sixteen_connects_are_in_flight() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      for i in 0..16 {
          let id = h.connection(&format!("c{i}"), &fake.mcp_url(), CredKind::OauthDcr);
          assert_eq!(h.authorize(&id, json!({})).await.0, StatusCode::OK);
      }
      let id = h.connection("one-more", &fake.mcp_url(), CredKind::OauthDcr);
      let sent = fake.paths().len();
      refused(&h, &id, json!({}), StatusCode::TOO_MANY_REQUESTS, "too_many_flows").await;
      assert_eq!(fake.paths().len(), sent, "refused before discovery or registration");
  }

  /// Gateway spec §4.2: a dynamically registered client stored with its
  /// grant is reused by the next Connect, also after a restart (no flow
  /// holds it then): re-registration is for a new redirect or token
  /// endpoint only.
  #[tokio::test]
  async fn a_stored_dynamic_client_is_reused_after_a_restart() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      assert_eq!(h.connect(&id, &fake).await.result(), "connected");
      assert_eq!(fake.with(|r| r.registered.len()), 1);
      // A restart: a new runtime on the same database.
      let restarted = router(GatewayState {
          runtime: h.world.runtime(support::test_egress(), Arc::new(Recorder::default())),
          operator: h.operator.clone(),
      });
      let h = Harness { app: restarted, ..h };
      assert_eq!(h.connect(&id, &fake).await.result(), "connected");
      assert_eq!(fake.with(|r| r.registered.len()), 1, "no registration again");
  }

  /// api-8e-8f B5: the page's contract. It is served cross-site (the vendor's
  /// redirect), outside the browser rules, with the kernel's CSP, no-store,
  /// no-referrer and nosniff, its one script `self`, and nothing secret in it.
  #[tokio::test]
  async fn the_callback_page_keeps_its_contract() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let (_, headers, answer) = h.authorize(&id, json!({})).await;
      let location = fake.consent(answer["consent_url"].as_str().unwrap()).await;
      let q = query_of(&location);
      let page = h
          .callback(
              &location,
              Some(&flow_cookie(&headers)),
              &[("sec-fetch-site", "cross-site")],
          )
          .await;
      assert_eq!(page.status, StatusCode::OK, "{}", page.html);
      assert_eq!(page.headers[header::CACHE_CONTROL], "no-store");
      assert_eq!(page.headers[header::REFERRER_POLICY], "no-referrer");
      assert_eq!(page.headers[header::X_CONTENT_TYPE_OPTIONS], "nosniff");
      assert_eq!(
          page.headers[header::CONTENT_SECURITY_POLICY],
          hennery_kernel::csp::POLICY
      );
      assert!(page.html.contains("data-outcome=\"connected\""));
      assert!(
          page.html
              .contains("<script src=\"/api/mcp/oauth/callback.js\"></script>")
      );
      assert!(!page.html.contains("<script>"), "no inline script");
      for secret in [&q["code"], &q["state"], &fake.origin(), &"Label linear".to_string()] {
          assert!(!page.html.contains(secret.as_str()), "{secret} is on the page");
      }
      let resp = h
          .app
          .clone()
          .oneshot(Request::get("/api/mcp/oauth/callback.js").body(Body::empty()).unwrap())
          .await
          .unwrap();
      assert_eq!(resp.status(), StatusCode::OK);
      assert!(
          resp.headers()[header::CONTENT_TYPE]
              .to_str()
              .unwrap()
              .starts_with("text/javascript")
      );
      let script = String::from_utf8(axum::body::to_bytes(resp.into_body(), 1 << 20).await.unwrap().to_vec()).unwrap();
      for part in [
          "history.replaceState(null, \"\", \"/api/mcp/oauth/callback\")",
          "new BroadcastChannel(\"hennery-mcp-oauth\")",
          "type: \"done\"",
          "window.close()",
      ] {
          assert!(script.contains(part), "{part}");
      }
  }

  /// The frontend's wait ends on `ok` with a newer `status_at`: a reconnect
  /// of a working grant moves it too.
  #[tokio::test]
  async fn a_completed_reconnect_moves_status_at_even_when_ok() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      assert_eq!(h.connect(&id, &fake).await.result(), "connected");
      let before = h.world.store.connection(&id).unwrap().unwrap().status_at;
      tokio::time::sleep(std::time::Duration::from_millis(1100)).await;
      assert_eq!(h.connect(&id, &fake).await.result(), "connected");
      let after = h.world.store.connection(&id).unwrap().unwrap().status_at;
      assert!(after > before, "{before} {after}");
  }

  /// api-8e-8f B1: the redirect URI to register, before any connection.
  #[tokio::test]
  async fn the_redirect_uri_is_the_public_url_s_callback() {
      let h = Harness::new();
      let (status, _, answer) = h.send(&h.session(0), "GET", "/api/mcp/oauth/redirect-uri", None).await;
      assert_eq!((status, answer), (StatusCode::OK, json!({ "redirect_uri": CALLBACK })));
  }

  /// Gateway spec §4.6 (O3): another origin or kind deletes the OAuth client
  /// with the grant; a delete takes both.
  #[tokio::test]
  async fn an_origin_change_or_a_delete_takes_the_client_and_the_grant() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      assert_eq!(h.connect(&id, &fake).await.result(), "connected");
      let count = |table: &str| -> i64 {
          h.world
              .raw()
              .query_row(&format!("SELECT count(*) FROM {table}"), [], |r| r.get(0))
              .unwrap()
      };
      assert_eq!((count("gw_credentials"), count("gw_oauth_clients")), (1, 1));
      let (status, _, item) = h
          .send(
              &h.session(0),
              "PATCH",
              &format!("/api/mcp/connections/{id}"),
              Some(json!({ "url": "https://elsewhere.example/mcp" })),
          )
          .await;
      assert_eq!(status, StatusCode::OK, "{item}");
      assert_eq!(item["status"], "not_connected");
      assert_eq!(item["oauth"]["client_id"], Value::Null);
      assert_eq!((count("gw_credentials"), count("gw_oauth_clients")), (0, 0));
      let other = h.connection("other", &fake.mcp_url(), CredKind::OauthDcr);
      assert_eq!(h.connect(&other, &fake).await.result(), "connected");
      let (status, _, _) = h
          .send(&h.session(0), "DELETE", &format!("/api/mcp/connections/{other}"), None)
          .await;
      assert_eq!(status, StatusCode::NO_CONTENT);
      assert_eq!((count("gw_credentials"), count("gw_oauth_clients")), (0, 0));
  }

  /// api-8e-8f B6 (may change): a probe the operator asks for, through the
  /// API; `none` and static connections too, and 409 without a credential.
  #[tokio::test]
  async fn a_probe_now_answers_the_item_after_it() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let s = h.session(10 * 60);
      let probe = |id: &str| format!("/api/mcp/connections/{id}/probe");
      let oauth = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let (status, _, answer) = h.send(&s, "POST", &probe(&oauth), Some(json!({}))).await;
      assert_eq!(
          (status, answer["code"].clone()),
          (StatusCode::CONFLICT, json!("no_credential"))
      );
      assert_eq!(h.connect(&oauth, &fake).await.result(), "connected");
      let (status, _, item) = h.send(&s, "POST", &probe(&oauth), Some(json!({}))).await;
      assert_eq!(status, StatusCode::OK, "no step-up: {item}");
      assert_eq!(item["status"], "ok");
      assert!(item["checked_at"].is_string());
      // A static token the upstream refuses: `needs_auth`, no refresh.
      let fixed = h.world.connection("fixed", &fake.mcp_url(), CredKind::Static);
      let (status, _, _) = h.send(&s, "POST", &probe(&fixed), Some(json!({}))).await;
      assert_eq!(status, StatusCode::CONFLICT);
      h.world.set_token(&fixed, "not-live");
      let (_, _, item) = h.send(&s, "POST", &probe(&fixed), Some(json!({}))).await;
      assert_eq!(item["status"], "needs_auth");
      // A body is required, and nothing may be in it.
      let (status, _, _) = h.send(&s, "POST", &probe(&fixed), None).await;
      assert_ne!(status, StatusCode::OK);
      let (status, _, _) = h.send(&s, "POST", &probe(&fixed), Some(json!({ "x": 1 }))).await;
      assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
      let (status, _, _) = h
          .send(&s, "POST", &probe("conn-0000000000000000"), Some(json!({})))
          .await;
      assert_eq!(status, StatusCode::NOT_FOUND);
  }

  /// Lane L16: a document the gateway trusts reads one way only. A key
  /// twice (first or last wins elsewhere), a `\u`-escaped spelling of one, a
  /// key spelt in another case or with `-`, a byte-order mark, a NUL or a
  /// tab inside a URL: each document is refused, never read some way.
  #[tokio::test]
  async fn an_authorization_server_document_reads_one_way_or_not_at_all() {
      let good = |origin: &str| {
          format!(
              r#""issuer":"{origin}","authorization_endpoint":"{origin}/authorize","token_endpoint":"{origin}/token","registration_endpoint":"{origin}/register","code_challenge_methods_supported":["S256"]"#
          )
      };
      type Document = Box<dyn Fn(&str) -> String>;
      let cases: Vec<(&str, Document)> = vec![
          ("the baseline", Box::new(move |o| format!("{{{}}}", good(o)))),
          (
              "a key twice",
              Box::new(move |o| format!(r#"{{{},"token_endpoint":"https://evil.example/token"}}"#, good(o))),
          ),
          (
              "an escaped key twice",
              Box::new(move |o| format!(r#"{{{},"token_endpoint":"https://evil.example/token"}}"#, good(o))),
          ),
          (
              "a key in another case",
              Box::new(move |o| format!(r#"{{{},"Token_Endpoint":"https://evil.example/token"}}"#, good(o))),
          ),
          (
              "a key with a dash",
              Box::new(move |o| format!(r#"{{{},"token-endpoint":"https://evil.example/token"}}"#, good(o))),
          ),
          (
              "a byte-order mark",
              Box::new(move |o| format!("\u{feff}{{{}}}", good(o))),
          ),
          (
              "a NUL in the issuer",
              Box::new(move |o| {
                  format!(
                      "{{{}}}",
                      good(o).replace(&format!("\"issuer\":\"{o}\""), &format!("\"issuer\":\"{o}\\u0000\""))
                  )
              }),
          ),
          (
              "a tab inside the token endpoint",
              Box::new(move |o| {
                  format!(
                      "{{{}}}",
                      good(o).replace(&format!("{o}/token"), &format!("{o}/to\\tken"))
                  )
              }),
          ),
      ];
      for (what, document) in cases {
          let h = Harness::new();
          let fake = FakeAs::start(Config::default()).await;
          fake.configure(|c| c.raw_meta = Some(document(&fake.origin())));
          let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
          let (status, _, answer) = h.authorize(&id, json!({})).await;
          if what == "the baseline" {
              assert_eq!(status, StatusCode::OK, "{what}: {answer}");
          } else {
              // Refused whole; a token endpoint with a tab in it is no
              // endpoint, so its document has no usable pair either.
              assert_eq!(answer["code"], "discovery_failed", "{what}: {answer}");
          }
          assert!(!answer.to_string().contains("evil"), "{what}");
      }
  }

  /// Lane L16: a protected-resource document with its `resource` twice, or
  /// an escaped twin, is no document; another candidate (none here) or
  /// none at all.
  #[tokio::test]
  async fn a_resource_document_reads_one_way_or_not_at_all() {
      for raw in [
          r#"{"resource":"RESOURCE","resource":"https://evil.example/mcp","authorization_servers":["ISSUER"]}"#,
          r#"{"resource":"RESOURCE","resource":"https://evil.example/mcp","authorization_servers":["ISSUER"]}"#,
          r#"{"resource":"RESOURCE","Authorization_Servers":["https://evil.example"],"authorization_servers":["ISSUER"]}"#,
      ] {
          let h = Harness::new();
          let fake = FakeAs::start(Config {
              pr_at: PrAt::Origin,
              serve_metadata: false,
              ..Config::default()
          })
          .await;
          let raw = raw
              .replace("RESOURCE", &fake.mcp_url())
              .replace("ISSUER", &fake.issuer());
          fake.configure(|c| c.raw_pr = Some(raw.clone()));
          let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
          let (_, _, answer) = h.authorize(&id, json!({})).await;
          assert_eq!(answer["code"], "discovery_failed", "{raw}: {answer}");
          assert!(!fake.paths().iter().any(|p| p.contains("evil")));
      }
  }

  /// Lane L16: a token response reads one way or not at all: an access
  /// token twice, or spelt otherwise, or a type that is not Bearer, is no
  /// token; `expires_in` as a number or a string of digits, anything else
  /// unknown.
  #[tokio::test]
  async fn a_token_response_reads_one_way_or_not_at_all() {
      for (raw, connected) in [
          (
              r#"{"access_token":"good-1","token_type":"Bearer","expires_in":"3600"}"#,
              true,
          ),
          (
              r#"{"access_token":"good-1","token_type":"bearer","expires_in":3600}"#,
              true,
          ),
          (
              r#"{"access_token":"good-1","access_token":"evil-1","token_type":"Bearer"}"#,
              false,
          ),
          (r#"{"access_token":"good-1","access_token":"evil-1"}"#, false),
          (r#"{"access_token":"good-1","Access_Token":"evil-1"}"#, false),
          (r#"{"access_token":"good-1","token_type":"mac"}"#, false),
          (r#"{"access_token":"good\u00001"}"#, false),
          ("\u{feff}{\"access_token\":\"good-1\"}", false),
          (
              r#"{"access_token":"good-1","refresh_token":"r","Refresh_Token":"evil"}"#,
              false,
          ),
      ] {
          let h = Harness::new();
          let fake = FakeAs::start(Config {
              raw_token: Some(raw.into()),
              ..Config::default()
          })
          .await;
          let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
          let page = h.connect(&id, &fake).await;
          if connected {
              assert_eq!(page.result(), "connected", "{raw}");
              let grant = h.world.store.oauth_credential(&id, &h.world.key).unwrap().unwrap();
              assert_eq!(grant.tokens.access_token.as_str(), "good-1");
              assert!(grant.expires_at.is_some(), "{raw}");
          } else {
              assert_eq!(page.result(), "exchange_failed", "{raw}");
              assert_eq!(h.item(&id).await["has_credential"], false, "{raw}");
          }
      }
      // `expires_in` that is not a whole number, or below zero: unknown,
      // not expired.
      for raw in [
          r#"{"access_token":"good-1","expires_in":"36e2"}"#,
          r#"{"access_token":"good-1","expires_in":-5}"#,
      ] {
          let h = Harness::new();
          let fake = FakeAs::start(Config {
              raw_token: Some(raw.into()),
              ..Config::default()
          })
          .await;
          let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
          assert_eq!(h.connect(&id, &fake).await.result(), "connected", "{raw}");
          assert_eq!(
              h.world
                  .store
                  .oauth_credential(&id, &h.world.key)
                  .unwrap()
                  .unwrap()
                  .expires_at,
              None,
              "{raw}"
          );
      }
  }

  /// api-8e-8f B5 step 7: a refusal names only a fixed RFC 6749 `error`,
  /// never the body.
  #[tokio::test]
  async fn an_exchange_refusal_names_only_a_known_error() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          raw_token: None,
          refusal_body: Some(json!({ "error": "invalid_grant", "error_description": "body-canary-7f3a" })),
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let (_, headers, answer) = h.authorize(&id, json!({})).await;
      let location = fake.consent(answer["consent_url"].as_str().unwrap()).await;
      // A code the fake does not know: refused with its canary body.
      let tampered = location.replace("code=code-", "code=codex-");
      let page = h.callback(&tampered, Some(&flow_cookie(&headers)), &[]).await;
      assert_eq!(page.result(), "exchange_failed");
      assert!(page.html.contains("invalid_grant"), "{}", page.html);
      assert!(!page.html.contains("body-canary"));
      assert!(!h.item(&id).await.to_string().contains("body-canary"));
  }

  /// api-8e-8f B1, B5: the next authorize clears the latest failure, and so
  /// does a completed Connect; a reconnect out of `needs_auth` is a
  /// recovery the `Notifier` hears of.
  #[tokio::test]
  async fn a_connect_clears_the_last_failure_and_recovers_the_status() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          s256: false,
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      refused(&h, &id, json!({}), StatusCode::BAD_GATEWAY, "pkce_unsupported").await;
      fake.configure(|c| c.s256 = true);
      let (_, headers, answer) = h.authorize(&id, json!({})).await;
      assert!(
          h.item(&id).await.get("oauth_error").is_none(),
          "the next authorize clears it"
      );
      let location = fake.consent(answer["consent_url"].as_str().unwrap()).await;
      // A failure recorded meanwhile: the completed Connect clears it too.
      h.world
          .store
          .set_oauth_error(&id, Some(("consent_denied", "x")), unix_now())
          .unwrap();
      let url = h.world.store.connection(&id).unwrap().unwrap().url;
      h.world
          .proxy_store
          .record_status(&id, &url, Status::NeedsAuth, Some("refused"), 1)
          .unwrap();
      let page = h.callback(&location, Some(&flow_cookie(&headers)), &[]).await;
      assert_eq!(page.result(), "connected");
      assert!(page.headers[header::SET_COOKIE].to_str().unwrap().contains("Max-Age=0"));
      let item = h.item(&id).await;
      assert!(item.get("oauth_error").is_none());
      assert_eq!(item["status"], "ok");
      assert_eq!(h.alerts.alerts(), [(id, Alert::Recovered)]);
  }

  /// The review's R1: a client `PUT`, a kind change and a delete drop the
  /// connection's flows too.
  #[tokio::test]
  async fn a_client_put_a_kind_change_or_a_delete_drops_the_flows() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let s = h.session(0);
      // A client `PUT`.
      let id = h.connection("pre", &fake.mcp_url(), CredKind::OauthClient);
      let path = format!("/api/mcp/connections/{id}/oauth-client");
      h.send(
          &s,
          "PUT",
          &path,
          Some(json!({ "client_id": "pre-1", "client_secret": null })),
      )
      .await;
      let (_, headers, answer) = h.authorize(&id, json!({})).await;
      let location = fake.consent(answer["consent_url"].as_str().unwrap()).await;
      h.send(
          &s,
          "PUT",
          &path,
          Some(json!({ "client_id": "pre-1", "client_secret": null })),
      )
      .await;
      assert_eq!(
          h.callback(&location, Some(&flow_cookie(&headers)), &[]).await.result(),
          "flow_unknown"
      );
      // A kind change.
      let id = h.connection("kind", &fake.mcp_url(), CredKind::OauthDcr);
      let (_, headers, answer) = h.authorize(&id, json!({})).await;
      let location = fake.consent(answer["consent_url"].as_str().unwrap()).await;
      let (status, _, _) = h
          .send(
              &s,
              "PATCH",
              &format!("/api/mcp/connections/{id}"),
              Some(json!({ "cred_kind": "oauth_client" })),
          )
          .await;
      assert_eq!(status, StatusCode::OK);
      assert_eq!(
          h.callback(&location, Some(&flow_cookie(&headers)), &[]).await.result(),
          "flow_unknown"
      );
      // A delete.
      let id = h.connection("gone", &fake.mcp_url(), CredKind::OauthDcr);
      let (_, headers, answer) = h.authorize(&id, json!({})).await;
      let location = fake.consent(answer["consent_url"].as_str().unwrap()).await;
      let (status, _, _) = h.send(&s, "DELETE", &format!("/api/mcp/connections/{id}"), None).await;
      assert_eq!(status, StatusCode::NO_CONTENT);
      assert_eq!(
          h.callback(&location, Some(&flow_cookie(&headers)), &[]).await.result(),
          "flow_unknown"
      );
  }

  /// Gateway spec §4.5 (G-13): every credential write takes the
  /// connection's refresh lock: a `PATCH`, a delete, a static token and a
  /// client `PUT` each wait while a refresh holds it.
  #[tokio::test]
  async fn every_credential_write_waits_for_the_refresh_lock() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let s = h.session(0);
      let oauth = h.connection("pre", &fake.mcp_url(), CredKind::OauthClient);
      let fixed = h.world.connection("fixed", &fake.mcp_url(), CredKind::Static);
      let writes = [
          (
              "PATCH",
              format!("/api/mcp/connections/{oauth}"),
              Some(json!({ "label": "x" })),
              &oauth,
          ),
          (
              "PUT",
              format!("/api/mcp/connections/{oauth}/oauth-client"),
              Some(json!({ "client_id": "pre-1", "client_secret": null })),
              &oauth,
          ),
          (
              "PUT",
              format!("/api/mcp/connections/{fixed}/credential"),
              Some(json!({ "token": "tok" })),
              &fixed,
          ),
          ("DELETE", format!("/api/mcp/connections/{oauth}"), None, &oauth),
      ];
      for (method, path, body, id) in writes {
          let held = h.runtime.lock(id).await;
          let write = h.send(&s, method, &path, body.clone());
          tokio::pin!(write);
          assert!(
              tokio::time::timeout(Duration::from_millis(150), &mut write)
                  .await
                  .is_err(),
              "{method} {path} did not wait"
          );
          drop(held);
          let (status, _, answer) = write.await;
          assert!(status.is_success(), "{method} {path}: {answer}");
      }
  }

  /// Gateway spec §4.1: a resource found to match again clears the mismatch
  /// an earlier authorize recorded.
  #[tokio::test]
  async fn a_resource_that_matches_again_clears_the_mismatch() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let other = format!("{}/v2/mcp", fake.origin());
      fake.configure(|c| c.resource = Some(other));
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      refused(&h, &id, json!({}), StatusCode::CONFLICT, "resource_mismatch").await;
      fake.configure(|c| c.resource = None);
      assert_eq!(h.authorize(&id, json!({})).await.0, StatusCode::OK);
      assert!(h.item(&id).await["oauth"].get("resource_mismatch").is_none());
  }

  /// Plan 8f decision 5: 5xx at every metadata URL is unreachable, not
  /// "nothing found".
  #[tokio::test]
  async fn failing_metadata_everywhere_is_unreachable() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          meta_status: Some(503),
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      refused(&h, &id, json!({}), StatusCode::BAD_GATEWAY, "upstream_unreachable").await;
  }

  /// Plan 8f decision 7 (RFC 9728 §3.2): a protected-resource document
  /// without `resource` is no document: the servers it names are never
  /// asked.
  #[tokio::test]
  async fn a_resource_document_without_resource_is_passed_over() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          pr_at: PrAt::Origin,
          ..Config::default()
      })
      .await;
      fake.configure(|c| {
          c.raw_pr = Some(format!(
              r#"{{"authorization_servers":["{}/elsewhere-as"]}}"#,
              fake.origin()
          ));
      });
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      // The resource's origin is asked instead, and serves the metadata.
      assert_eq!(h.authorize(&id, json!({})).await.0, StatusCode::OK);
      assert!(
          !fake.paths().iter().any(|p| p.contains("elsewhere-as")),
          "{:?}",
          fake.paths()
      );
  }

  /// Gateway spec §4: every metadata URL is `https` or loopback `http`: a
  /// challenge naming a plain `http` document, a document naming a plain
  /// `http` server, and a plain `http` registration endpoint are refused
  /// before anything is fetched there.
  #[tokio::test]
  async fn plain_http_documents_and_servers_are_refused() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          pr_at: PrAt::Origin,
          ..Config::default()
      })
      .await;
      fake.configure(|c| {
          c.raw_pr = Some(format!(
              r#"{{"resource":"{}","authorization_servers":["http://as.example"]}}"#,
              fake.mcp_url()
          ));
      });
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      refused(&h, &id, json!({}), StatusCode::BAD_GATEWAY, "insecure_metadata").await;
      // A registration endpoint at plain `http`.
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          raw_meta: Some("PLACEHOLDER".into()),
          ..Config::default()
      })
      .await;
      let o = fake.origin();
      fake.configure(|c| {
          c.raw_meta = Some(format!(
              r#"{{"issuer":"{o}","authorization_endpoint":"{o}/authorize","token_endpoint":"{o}/token","registration_endpoint":"http://as.example/register","code_challenge_methods_supported":["S256"]}}"#
          ));
      });
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      refused(&h, &id, json!({}), StatusCode::BAD_GATEWAY, "insecure_metadata").await;
      // A challenge naming a plain `http` document elsewhere.
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          pr_at: PrAt::Challenge,
          challenge_url: Some("http://as.example/prm".into()),
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      refused(&h, &id, json!({}), StatusCode::BAD_GATEWAY, "insecure_metadata").await;
  }

  /// RFC 7591: a vendor that issues a secret to a dynamically registered
  /// client gets it back as Basic auth; one that answers without a client
  /// id is a refusal.
  #[tokio::test]
  async fn a_registration_with_a_secret_uses_it_and_one_without_an_id_is_refused() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          dcr_secret: true,
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      assert_eq!(h.connect(&id, &fake).await.result(), "connected");
      assert_eq!(fake.with(|r| r.basic.len()), 1);
      assert_eq!(h.item(&id).await["oauth"]["has_client_secret"], true);
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          dcr_without_client_id: true,
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      refused(&h, &id, json!({}), StatusCode::BAD_GATEWAY, "registration_refused").await;
  }

  /// RFC 8414: a server that lists only `client_secret_post` gets the
  /// secret in the form.
  #[tokio::test]
  async fn a_server_taking_only_client_secret_post_gets_the_secret_in_the_form() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          registration: false,
          confidential: Some(("pre-1".into(), "posted".into())),
          auth_methods: vec!["client_secret_post".into()],
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthClient);
      h.send(
          &h.session(0),
          "PUT",
          &format!("/api/mcp/connections/{id}/oauth-client"),
          Some(json!({ "client_id": "pre-1", "client_secret": "posted" })),
      )
      .await;
      assert_eq!(h.connect(&id, &fake).await.result(), "connected");
      assert!(fake.with(|r| r.posted_secret && r.basic.is_empty()));
  }

  /// api-8e-8f B5 step 7: a token endpoint that is down is unreachable, not
  /// a refusal.
  #[tokio::test]
  async fn an_exchange_with_a_failing_token_endpoint_is_unreachable() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          token_status: Some(503),
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let page = h.connect(&id, &fake).await;
      assert_eq!(
          (page.status, page.result()),
          (StatusCode::BAD_GATEWAY, "upstream_unreachable".into())
      );
      assert_eq!(h.item(&id).await["oauth_error"]["code"], "upstream_unreachable");
  }

  #[tokio::test]
  async fn a_client_for_an_unknown_connection_is_not_found() {
      let h = Harness::new();
      let (status, _, answer) = h
          .send(
              &h.session(0),
              "PUT",
              "/api/mcp/connections/conn-0000000000000000/oauth-client",
              Some(json!({ "client_id": "pre-1", "client_secret": null })),
          )
          .await;
      assert_eq!(
          (status, answer["code"].clone()),
          (StatusCode::NOT_FOUND, json!("not_found"))
      );
  }

  /// The runtime is one: the API and the proxy share its locks (plan 8f
  /// decision 3).
  #[tokio::test]
  async fn the_api_s_runtime_is_the_one_it_was_given() {
      let h = Harness::new();
      let _guard = h.runtime.lock("conn-x").await;
      assert!(
          tokio::time::timeout(std::time::Duration::from_millis(100), h.runtime.lock("conn-x"))
              .await
              .is_err()
      );
  }

  /// api-8e-8f B4: `accept_resource` with no protected-resource document to
  /// name one is refused, not ignored.
  #[tokio::test]
  async fn accepting_a_resource_no_document_names_is_invalid() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          pr_at: PrAt::Nowhere,
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      refused(
          &h,
          &id,
          json!({ "accept_resource": fake.mcp_url() }),
          StatusCode::BAD_REQUEST,
          "invalid",
      )
      .await;
  }

  /// The review's R2: a pinned client's secret goes only to the token
  /// endpoint it was pinned with, even under the same issuer.
  #[tokio::test]
  async fn a_pinned_client_refuses_another_token_endpoint() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthClient);
      let path = format!("/api/mcp/connections/{id}/oauth-client");
      let put = json!({ "client_id": "pre-1", "client_secret": null });
      assert_eq!(h.send(&h.session(0), "PUT", &path, Some(put)).await.0, StatusCode::OK);
      assert_eq!(h.authorize(&id, json!({})).await.0, StatusCode::OK);
      let moved = format!("{}/token2", fake.origin());
      fake.configure(|c| c.token_endpoint = Some(moved));
      refused(&h, &id, json!({}), StatusCode::CONFLICT, "issuer_changed").await;
  }

  /// The egress policy's refusal of a document discovery fetches ends it
  /// as that (`egress_refused`), never as a server that was not there or did
  /// not answer: here an authorization server named with credentials in its
  /// URL, which egress refuses whatever the allowance.
  #[tokio::test]
  async fn a_metadata_fetch_the_egress_policy_refuses_ends_discovery() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let refused_at = format!("https://u:p@127.0.0.1:{}", fake.addr.port());
      let mcp = fake.mcp_url();
      fake.configure(|c| {
          c.raw_pr = Some(json!({ "resource": mcp, "authorization_servers": [refused_at] }).to_string());
      });
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      refused(&h, &id, json!({}), StatusCode::BAD_GATEWAY, "egress_refused").await;
  }

  /// Each `RegisterError` (gateway spec §4.2) has its code: the egress
  /// policy's refusal and an endpoint that fails (5xx) besides the vendor's
  /// refusal and an answer without a client, pinned above.
  #[tokio::test]
  async fn a_registration_refused_by_egress_or_failing_has_its_code() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let o = fake.origin();
      // Credentials in a URL are refused by the egress policy, whatever the
      // allowance.
      let refused_at = format!("https://u:p@127.0.0.1:{}/register", fake.addr.port());
      fake.configure(|c| {
          c.raw_meta = Some(format!(
              r#"{{"issuer":"{o}","authorization_endpoint":"{o}/authorize","token_endpoint":"{o}/token","registration_endpoint":"{refused_at}","code_challenge_methods_supported":["S256"]}}"#
          ));
      });
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      refused(&h, &id, json!({}), StatusCode::BAD_GATEWAY, "egress_refused").await;
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          dcr_refusal: Some((503, json!({ "error": "temporarily_unavailable" }))),
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      refused(&h, &id, json!({}), StatusCode::BAD_GATEWAY, "upstream_unreachable").await;
  }

  /// RFC 7591 answers are checked before use (lane L16): a client id that is
  /// not 1 to 512 visible characters is no client; a secret that is not a
  /// valid one is dropped (a public client); a `client_secret_post` client
  /// gets its secret in the form; a public client is stored as `none`.
  #[tokio::test]
  async fn a_registration_s_answer_is_checked_before_use() {
      let registered = |body: Value| Config {
          dcr_refusal: Some((201, body)),
          ..Config::default()
      };
      let h = Harness::new();
      let fake = FakeAs::start(registered(json!({ "client_id": "has space" }))).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      refused(&h, &id, json!({}), StatusCode::BAD_GATEWAY, "registration_refused").await;
      // A secret with a space: dropped; the client is public.
      let h = Harness::new();
      let fake = FakeAs::start(registered(
          json!({ "client_id": "pre-x", "client_secret": "two words" }),
      ))
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      assert_eq!(h.connect(&id, &fake).await.result(), "connected");
      assert_eq!(h.item(&id).await["oauth"]["has_client_secret"], false);
      assert!(fake.with(|r| r.basic.is_empty() && !r.posted_secret));
      let method: String = h
          .world
          .raw()
          .query_row(
              "SELECT token_endpoint_auth_method FROM gw_oauth_clients WHERE connection_id = ?1",
              [&id],
              |r| r.get(0),
          )
          .unwrap();
      assert_eq!(method, "none");
      // `client_secret_post`, as the registration said.
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          confidential: Some(("pre-y".into(), "posted-secret".into())),
          ..registered(json!({
              "client_id": "pre-y",
              "client_secret": "posted-secret",
              "token_endpoint_auth_method": "client_secret_post",
          }))
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      assert_eq!(h.connect(&id, &fake).await.result(), "connected");
      assert!(fake.with(|r| r.posted_secret && r.basic.is_empty()));
  }

  /// Each `TokenError` at the exchange has its code (api-8e-8f B5 step 7):
  /// the egress policy's refusal, and a transport failure (a closed port).
  #[tokio::test]
  async fn an_exchange_refused_by_egress_or_unreachable_has_its_code() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let port = fake.addr.port();
      fake.configure(|c| c.token_endpoint = Some(format!("https://u:p@127.0.0.1:{port}/token")));
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let page = h.connect(&id, &fake).await;
      assert_eq!(
          (page.status, page.result()),
          (StatusCode::BAD_GATEWAY, "egress_refused".into())
      );
      // api-8e-8f B5: the page names no address; the operator's item keeps
      // the egress policy's reason, by origin only (lane L11).
      assert!(!page.html.contains("127.0.0.1"), "{}", page.html);
      let error = &h.item(&id).await["oauth_error"];
      assert_eq!(error["code"], "egress_refused");
      assert!(
          error["message"]
              .as_str()
              .unwrap()
              .contains("refused by the egress policy"),
          "{error}"
      );
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let closed = std::net::TcpListener::bind("127.0.0.1:0")
          .unwrap()
          .local_addr()
          .unwrap()
          .port();
      fake.configure(|c| c.token_endpoint = Some(format!("http://127.0.0.1:{closed}/token")));
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let page = h.connect(&id, &fake).await;
      assert_eq!(
          (page.status, page.result()),
          (StatusCode::BAD_GATEWAY, "upstream_unreachable".into())
      );
  }

  /// api-8e-8f B5 step 7: an `error` that is not one of RFC 6749's fixed
  /// values is shown as the HTTP status only.
  #[tokio::test]
  async fn an_exchange_refusal_with_an_unknown_error_shows_only_its_status() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          refusal_body: Some(json!({ "error": "weird-canary-error" })),
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let (_, headers, answer) = h.authorize(&id, json!({})).await;
      let location = fake.consent(answer["consent_url"].as_str().unwrap()).await;
      let tampered = location.replace("code=code-", "code=codex-");
      let page = h.callback(&tampered, Some(&flow_cookie(&headers)), &[]).await;
      assert_eq!(page.result(), "exchange_failed");
      assert!(page.html.contains("(HTTP 400)"), "{}", page.html);
      assert!(!page.html.contains("weird-canary"));
  }

  /// Lane L16: a token response's tokens are checked: an access token that
  /// is not a valid token, or a refresh token that is not a string, is no
  /// token response.
  #[tokio::test]
  async fn a_token_response_s_tokens_are_checked() {
      for raw in [
          r#"{"access_token":"two words","token_type":"Bearer"}"#,
          r#"{"access_token":"good-1","refresh_token":5}"#,
      ] {
          let h = Harness::new();
          let fake = FakeAs::start(Config {
              raw_token: Some(raw.into()),
              ..Config::default()
          })
          .await;
          let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
          assert_eq!(h.connect(&id, &fake).await.result(), "exchange_failed", "{raw}");
          assert_eq!(h.item(&id).await["has_credential"], false, "{raw}");
      }
  }

  /// Gateway spec §4.1: an endpoint with a fragment is no endpoint.
  #[tokio::test]
  async fn a_token_endpoint_with_a_fragment_is_no_endpoint() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let o = fake.origin();
      fake.configure(|c| c.token_endpoint = Some(format!("{o}/token#x")));
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      refused(&h, &id, json!({}), StatusCode::BAD_GATEWAY, "discovery_failed").await;
  }

  /// Plan 8f decision 5: an oversized document is "not here", not an
  /// outage; one candidate that fails (5xx) makes nothing found an outage.
  #[tokio::test]
  async fn an_oversized_document_is_not_here_and_a_failing_one_is_an_outage() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          pr_at: PrAt::Origin,
          serve_metadata: false,
          ..Config::default()
      })
      .await;
      let huge = format!(
          r#"{{"resource":"{}","pad":"{}"}}"#,
          fake.mcp_url(),
          "x".repeat(1024 * 1024)
      );
      fake.configure(|c| c.raw_pr = Some(huge));
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      refused(&h, &id, json!({}), StatusCode::BAD_GATEWAY, "discovery_failed").await;
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          pr_at: PrAt::Nowhere,
          pr_status: Some(503),
          serve_metadata: false,
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      refused(&h, &id, json!({}), StatusCode::BAD_GATEWAY, "upstream_unreachable").await;
  }

  /// The review's R1, gateway spec §4.6: an edit that drops the flows also
  /// forgets that the server refused `resource`: the next Connect sends it
  /// again.
  #[tokio::test]
  async fn an_edit_forgets_a_refused_resource() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          refuse_resource_at_consent: true,
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      assert_eq!(h.connect(&id, &fake).await.result(), "consent_denied");
      let s = h.session(0);
      let path = format!("/api/mcp/connections/{id}");
      for kind in ["oauth_client", "oauth_dcr"] {
          let (status, _, _) = h.send(&s, "PATCH", &path, Some(json!({ "cred_kind": kind }))).await;
          assert_eq!(status, StatusCode::OK, "{kind}");
      }
      fake.configure(|c| c.refuse_resource_at_consent = false);
      assert_eq!(h.connect(&id, &fake).await.result(), "connected");
      assert_eq!(
          fake.with(|r| r.consent_resources.clone()),
          [Some(fake.mcp_url()), Some(fake.mcp_url())]
      );
  }

  /// Gateway spec §4.6: another origin clears the latest Connect's failure
  /// with the grant.
  #[tokio::test]
  async fn an_origin_change_clears_the_last_failure() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          s256: false,
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      refused(&h, &id, json!({}), StatusCode::BAD_GATEWAY, "pkce_unsupported").await;
      let (status, _, item) = h
          .send(
              &h.session(0),
              "PATCH",
              &format!("/api/mcp/connections/{id}"),
              Some(json!({ "url": "https://elsewhere.example/mcp" })),
          )
          .await;
      assert_eq!(status, StatusCode::OK, "{item}");
      assert!(item.get("oauth_error").is_none(), "{item}");
  }

  /// api-8e-8f B2: a client id and a secret are checked: 400 `invalid`.
  #[tokio::test]
  async fn a_pre_registered_client_s_id_and_secret_are_checked() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthClient);
      let path = format!("/api/mcp/connections/{id}/oauth-client");
      for body in [
          json!({ "client_id": "has space", "client_secret": null }),
          json!({ "client_id": "", "client_secret": null }),
          json!({ "client_id": "pre-1", "client_secret": "two words" }),
      ] {
          let (status, _, answer) = h.send(&h.session(0), "PUT", &path, Some(body.clone())).await;
          assert_eq!(
              (status, answer["code"].clone()),
              (StatusCode::BAD_REQUEST, json!("invalid")),
              "{body}"
          );
      }
      assert_eq!(h.item(&id).await["oauth"]["client_id"], Value::Null);
  }

  /// Gateway spec §4.5: the callback stores the grant under the
  /// connection's refresh lock.
  #[tokio::test]
  async fn the_callback_stores_the_grant_under_the_lock() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let (_, headers, answer) = h.authorize(&id, json!({})).await;
      let location = fake.consent(answer["consent_url"].as_str().unwrap()).await;
      let cookie = flow_cookie(&headers);
      let held = h.runtime.lock(&id).await;
      let callback = h.callback(&location, Some(&cookie), &[]);
      tokio::pin!(callback);
      assert!(
          tokio::time::timeout(Duration::from_millis(300), &mut callback)
              .await
              .is_err(),
          "the callback did not wait"
      );
      assert_eq!(h.item(&id).await["has_credential"], false);
      drop(held);
      assert_eq!(callback.await.result(), "connected");
  }
  ```

Create `crates/hennery-gateway/tests/oauth_differential.rs`:

  ```rust
  //! Differential tests for plan 8f's checks on parsed input (lane L16, the
  //! fleet rule of 2026-10-02): the authorization server's metadata, the
  //! protected-resource document, a registration's answer, a token response
  //! and the callback's query. Each vector goes through the real gateway,
  //! against the fake authorization server; what the gateway did with it is
  //! then held against what each modelled decoder reads in the same bytes:
  //! either the gateway refused the input, or every decoder reads in it
  //! exactly what the gateway used. Nothing a decoder could read otherwise is
  //! ever acted on.
  //!
  //! The JSON decoders are plan 2026-10-15's six, as #93's
  //! `tests/differential.rs` measured them (`Exact`, `First`, `GoV1`,
  //! `GoV2Fold`, `JsonC`, `CJson`), from the shared test-support module
  //! `support::differential`. The query decoders are the four ways a query
  //! string is read: the first or the last of a name, a name matched whatever
  //! its case, and a value cut at its first NUL.
  //!
  //! Each table is one line per vector; a failure names every vector that
  //! failed, not only the first.

  mod support;

  use axum::body::Body;
  use axum::http::{HeaderMap, Request, StatusCode, header};
  use hennery_gateway::api::{GatewayState, router};
  use hennery_gateway::model::{CredKind, NewConnection};
  use hennery_kernel::operator::{Operator, SetupOutcome};
  use hennery_kernel::secret::unix_now;
  use serde_json::Value;
  use std::sync::Arc;
  use support::differential::{DECODERS, Decoder, Node, cut_at_nul};
  use support::oauth::{Config, FakeAs, PrAt};
  use support::{Recorder, World};
  use tower::ServiceExt;

  const ORIGIN: &str = "https://hennery.example";

  /// A field as `decoder` hands it on: a string (cut at NUL where it cuts), a
  /// number, or a list of strings, as text.
  fn field(decoder: Decoder, node: &Node, name: &str) -> Option<String> {
      let found = decoder.get(node, name);
      match found? {
          Node::Str(_) => decoder.str(found),
          Node::Num(n) => Some(n.to_string()),
          Node::Arr(items) => Some(
              items
                  .iter()
                  .map(|item| match item {
                      Node::Str(s) => s.clone(),
                      _ => "?".into(),
                  })
                  .collect::<Vec<_>>()
                  .join(" "),
          ),
          _ => None,
      }
  }

  /// What every decoder reads of `fields` in `bytes`, if all read the same;
  /// `Err` names the first field two of them read apart. Bytes no strict
  /// decoder reads are `Err` too: a lenient one might.
  fn agreed(bytes: &[u8], fields: &[&str]) -> Result<Vec<Option<String>>, String> {
      let root: Node = serde_json::from_slice(bytes).map_err(|e| format!("no strict decoder reads it ({e})"))?;
      let exact: Vec<Option<String>> = fields.iter().map(|f| field(Decoder::Exact, &root, f)).collect();
      for &d in DECODERS {
          for (i, f) in fields.iter().enumerate() {
              let read = field(d, &root, f);
              if read != exact[i] {
                  return Err(format!("{d:?} reads {f} as {read:?}, Exact as {:?}", exact[i]));
              }
          }
      }
      Ok(exact)
  }

  // --- The gateway, in-process -----------------------------------------------

  struct Harness {
      world: World,
      app: axum::Router,
      operator: Arc<Operator>,
      phc: String,
  }

  impl Harness {
      fn new() -> Self {
          let world = World::new();
          let operator = Arc::new(Operator::open(&world.db).unwrap());
          let now = unix_now();
          let setup = operator.issue_setup_token(now).unwrap().unwrap();
          let SetupOutcome::Done { phc, .. } = operator.set_up(&setup, "correct horse battery", ORIGIN, now).unwrap()
          else {
              panic!("setup failed");
          };
          let runtime = world.runtime(support::test_egress(), Arc::new(Recorder::default()));
          let app = router(GatewayState {
              runtime,
              operator: operator.clone(),
          });
          Self {
              world,
              app,
              operator,
              phc,
          }
      }

      fn connection(&self, url: &str) -> String {
          self.world.connection_with(NewConnection {
              slug: "linear".into(),
              label: "Linear".into(),
              url: url.into(),
              hat_id: self.world.hat(),
              cred_kind: CredKind::OauthDcr,
              static_header: None,
              static_prefix: None,
              tool_allowlist: None,
              internal_network: true,
          })
      }

      async fn authorize(&self, id: &str) -> (StatusCode, HeaderMap, Value) {
          let session = self
              .operator
              .open_session("test", &self.phc, unix_now())
              .unwrap()
              .unwrap();
          let req = Request::builder()
              .method("POST")
              .uri(format!("/api/mcp/connections/{id}/authorize"))
              .header("origin", ORIGIN)
              .header("cookie", format!("hennery_session={session}"))
              .header("content-type", "application/json")
              .body(Body::from("{}"))
              .unwrap();
          let resp = self.app.clone().oneshot(req).await.unwrap();
          let status = resp.status();
          let headers = resp.headers().clone();
          let bytes = axum::body::to_bytes(resp.into_body(), 1 << 20).await.unwrap();
          (status, headers, serde_json::from_slice(&bytes).unwrap_or(Value::Null))
      }

      async fn callback(&self, path_and_query: &str, cookie: &str) -> String {
          let req = Request::builder()
              .uri(path_and_query)
              .header("cookie", cookie)
              .body(Body::empty())
              .unwrap();
          let resp = self.app.clone().oneshot(req).await.unwrap();
          let bytes = axum::body::to_bytes(resp.into_body(), 1 << 20).await.unwrap();
          let html = String::from_utf8(bytes.to_vec()).unwrap();
          let at = html.find("data-result=\"").unwrap() + "data-result=\"".len();
          html[at..].split('"').next().unwrap().to_string()
      }
  }

  fn flow_cookie(headers: &HeaderMap) -> String {
      headers[header::SET_COOKIE]
          .to_str()
          .unwrap()
          .split(';')
          .next()
          .unwrap()
          .to_string()
  }

  /// Whether a vector is to be taken (every decoder reads it alike) or
  /// refused (some decoder reads it otherwise, or it is not one document).
  #[derive(Debug, Clone, Copy, PartialEq, Eq)]
  enum Expect {
      Taken,
      Refused,
  }

  /// The authorization server's metadata the gateway trusts.
  const SERVER_FIELDS: &[&str] = &[
      "issuer",
      "authorization_endpoint",
      "token_endpoint",
      "registration_endpoint",
      "code_challenge_methods_supported",
  ];

  /// The metadata vectors: `{o}` is the fake's origin.
  fn server_vectors() -> Vec<(&'static str, Expect, String)> {
      let base = r#""issuer":"{o}","authorization_endpoint":"{o}/authorize","token_endpoint":"{o}/token","registration_endpoint":"{o}/register","code_challenge_methods_supported":["S256"]"#;
      let doc = |extra: &str| format!("{{{base}{extra}}}");
      vec![
          ("the baseline", Expect::Taken, doc("")),
          (
              "a key twice",
              Expect::Refused,
              doc(r#","token_endpoint":"https://evil.example/token""#),
          ),
          (
              "a key twice, first",
              Expect::Refused,
              format!(r#"{{"token_endpoint":"https://evil.example/token",{base}}}"#),
          ),
          (
              "an escaped key twice",
              Expect::Refused,
              doc(r#","token_endpoint":"https://evil.example/token""#),
          ),
          (
              "a key in another case",
              Expect::Refused,
              doc(r#","TOKEN_ENDPOINT":"https://evil.example/token""#),
          ),
          (
              "a key with ſ for s",
              Expect::Refused,
              doc(r#","iſſuer":"https://evil.example""#),
          ),
          (
              "a key with the Kelvin sign for k",
              Expect::Refused,
              doc(r#","toKen_endpoint":"https://evil.example/token""#),
          ),
          (
              "a key without its _",
              Expect::Refused,
              doc(r#","tokenendpoint":"https://evil.example/token""#),
          ),
          (
              "a key with - for _",
              Expect::Refused,
              doc(r#","token-endpoint":"https://evil.example/token""#),
          ),
          (
              "a key with a NUL",
              Expect::Refused,
              doc(r#","token_endpoint\u0000x":"https://evil.example/token""#),
          ),
          (
              "a NUL in a value",
              Expect::Refused,
              base.replace("{o}/token\"", "{o}/token\\u0000.evil\"")
                  .pipe(|b| format!("{{{b}}}")),
          ),
          (
              "a NUL in a list",
              Expect::Refused,
              base.replace("[\"S256\"]", "[\"S256\\u0000x\"]")
                  .pipe(|b| format!("{{{b}}}")),
          ),
          ("a byte-order mark", Expect::Refused, format!("\u{feff}{{{base}}}")),
          ("odd whitespace", Expect::Refused, format!("{{\u{a0}{base}}}")),
          (
              "a key with a trailing space",
              Expect::Taken,
              doc(r#","token_endpoint ":"https://evil.example/token""#),
          ),
          (
              "a key with a zero-width space",
              Expect::Taken,
              doc(r#","token_endpoint\u200b":"https://evil.example/token""#),
          ),
      ]
  }

  trait Pipe: Sized {
      fn pipe<T>(self, f: impl FnOnce(Self) -> T) -> T {
          f(self)
      }
  }

  impl Pipe for String {}

  /// Lane L16: the authorization server's metadata is taken only when every
  /// decoder reads in it the issuer, the endpoints and PKCE the gateway
  /// used.
  #[tokio::test]
  async fn server_metadata_is_taken_only_as_every_decoder_reads_it() {
      let mut failures = Vec::new();
      for (what, expect, template) in server_vectors() {
          let h = Harness::new();
          let fake = FakeAs::start(Config::default()).await;
          let document = template.replace("{o}", &fake.origin());
          fake.configure(|c| c.raw_meta = Some(document.clone()));
          let id = h.connection(&fake.mcp_url());
          let (status, _, answer) = h.authorize(&id).await;
          let taken = status == StatusCode::OK;
          let outcome = if taken { Expect::Taken } else { Expect::Refused };
          if outcome != expect {
              failures.push(format!("{what}: {outcome:?}, expected {expect:?} ({answer})"));
              continue;
          }
          if taken {
              match agreed(document.as_bytes(), SERVER_FIELDS) {
                  Err(why) => failures.push(format!("{what}: taken, but {why}")),
                  Ok(read) => {
                      let consent = answer["consent_url"].as_str().unwrap();
                      let authorize = read[1].as_deref().unwrap();
                      if !consent.starts_with(&format!("{authorize}?")) {
                          failures.push(format!("{what}: consent at {consent}, the decoders read {authorize}"));
                      }
                  }
              }
              if fake.paths().iter().any(|p| p.contains("evil")) {
                  failures.push(format!("{what}: something went to evil"));
              }
          }
      }
      assert!(failures.is_empty(), "{failures:#?}");
  }

  /// Lane L16: the protected-resource document is taken only when every
  /// decoder reads its `resource` and servers as the gateway did.
  #[tokio::test]
  async fn a_resource_document_is_taken_only_as_every_decoder_reads_it() {
      // The server named is the fake at `/tenant`, so a document passed over
      // (the resource's origin taken instead, which serves no metadata) is
      // told from one used.
      let base = r#""resource":"{r}","authorization_servers":["{o}/tenant"]"#;
      let doc = |extra: &str| format!("{{{base}{extra}}}");
      let vectors = vec![
          ("the baseline", Expect::Taken, doc("")),
          (
              "servers twice",
              Expect::Refused,
              doc(r#","authorization_servers":["https://evil.example"]"#),
          ),
          (
              "resource twice, escaped",
              Expect::Refused,
              doc(r#","resource":"https://evil.example/mcp""#),
          ),
          (
              "servers in another case",
              Expect::Refused,
              doc(r#","Authorization_Servers":["https://evil.example"]"#),
          ),
          (
              "servers with a NUL key",
              Expect::Refused,
              doc(r#","authorization_servers\u0000":["https://evil.example"]"#),
          ),
          (
              "a NUL in a server",
              Expect::Refused,
              base.replace("[\"{o}/tenant\"]", "[\"{o}/tenant\\u0000.evil\"]")
                  .pipe(|b| format!("{{{b}}}")),
          ),
      ];
      let mut failures = Vec::new();
      for (what, expect, template) in vectors {
          let h = Harness::new();
          let fake = FakeAs::start(Config {
              pr_at: PrAt::Origin,
              as_path: "/tenant".into(),
              ..Config::default()
          })
          .await;
          let document = template.replace("{r}", &fake.mcp_url()).replace("{o}", &fake.origin());
          fake.configure(|c| c.raw_pr = Some(document.clone()));
          let id = h.connection(&fake.mcp_url());
          let (status, _, answer) = h.authorize(&id).await;
          let outcome = match (status, answer["code"].as_str()) {
              (StatusCode::OK, _) => Expect::Taken,
              (_, Some("discovery_failed")) => Expect::Refused,
              _ => {
                  failures.push(format!("{what}: {status} {answer}"));
                  continue;
              }
          };
          if fake.paths().iter().any(|p| p.contains("evil")) {
              failures.push(format!("{what}: something went to evil"));
          }
          if outcome != expect {
              failures.push(format!("{what}: {outcome:?}, expected {expect:?}"));
          }
          if expect == Expect::Taken
              && let Err(why) = agreed(document.as_bytes(), &["resource", "authorization_servers"])
          {
              failures.push(format!("{what}: taken, but {why}"));
          }
      }
      assert!(failures.is_empty(), "{failures:#?}");
  }

  /// Lane L16: a token response is stored only when every decoder reads its
  /// tokens, type and lifetime as the gateway did.
  #[tokio::test]
  async fn a_token_response_is_taken_only_as_every_decoder_reads_it() {
      let vectors = vec![
          (
              "the baseline",
              Expect::Taken,
              r#"{"access_token":"good-1","token_type":"Bearer","expires_in":3600,"refresh_token":"r-1"}"#,
          ),
          (
              "a token twice",
              Expect::Refused,
              r#"{"access_token":"good-1","access_token":"evil-1"}"#,
          ),
          (
              "a token twice, escaped",
              Expect::Refused,
              r#"{"access_token":"good-1","access_token":"evil-1"}"#,
          ),
          (
              "a token in another case",
              Expect::Refused,
              r#"{"access_token":"good-1","ACCESS_TOKEN":"evil-1"}"#,
          ),
          (
              "a token without its _",
              Expect::Refused,
              r#"{"access_token":"good-1","accesstoken":"evil-1"}"#,
          ),
          (
              "a refresh token with the Kelvin sign",
              Expect::Refused,
              r#"{"access_token":"good-1","refresh_toKen":"evil-r"}"#,
          ),
          (
              "a NUL in a key",
              Expect::Refused,
              r#"{"access_token":"good-1","access_token\u0000":"evil-1"}"#,
          ),
          (
              "a NUL in a token",
              Expect::Refused,
              r#"{"access_token":"good\u0000evil"}"#,
          ),
          (
              "expires_in twice",
              Expect::Refused,
              r#"{"access_token":"good-1","expires_in":3600,"expires_in":1}"#,
          ),
          (
              "a type twice",
              Expect::Refused,
              r#"{"access_token":"good-1","token_type":"Bearer","token_type":"mac"}"#,
          ),
          (
              "a byte-order mark",
              Expect::Refused,
              "\u{feff}{\"access_token\":\"good-1\"}",
          ),
          (
              "a key with a trailing space",
              Expect::Taken,
              r#"{"access_token":"good-1","access_token ":"evil-1"}"#,
          ),
      ];
      let mut failures = Vec::new();
      for (what, expect, raw) in vectors {
          let h = Harness::new();
          let fake = FakeAs::start(Config {
              raw_token: Some(raw.into()),
              ..Config::default()
          })
          .await;
          let id = h.connection(&fake.mcp_url());
          let (_, headers, answer) = h.authorize(&id).await;
          let location = fake.consent(answer["consent_url"].as_str().unwrap()).await;
          let result = h
              .callback(location.strip_prefix(ORIGIN).unwrap(), &flow_cookie(&headers))
              .await;
          let outcome = if result == "connected" {
              Expect::Taken
          } else {
              Expect::Refused
          };
          if outcome != expect {
              failures.push(format!("{what}: {result}, expected {expect:?}"));
              continue;
          }
          if outcome == Expect::Taken {
              let fields = ["access_token", "refresh_token", "token_type", "expires_in"];
              match agreed(raw.as_bytes(), &fields) {
                  Err(why) => failures.push(format!("{what}: taken, but {why}")),
                  Ok(read) => {
                      let grant = h.world.store.oauth_credential(&id, &h.world.key).unwrap().unwrap();
                      if Some(grant.tokens.access_token.to_string()) != read[0] {
                          failures.push(format!("{what}: stored another access token than the decoders read"));
                      }
                      if grant.tokens.refresh_token.as_ref().map(|t| t.to_string()) != read[1] {
                          failures.push(format!("{what}: stored another refresh token than the decoders read"));
                      }
                  }
              }
          }
      }
      assert!(failures.is_empty(), "{failures:#?}");
  }

  /// Lane L16: a registration's answer is taken only when every decoder
  /// reads its client id as the gateway did.
  #[tokio::test]
  async fn a_registration_is_taken_only_as_every_decoder_reads_it() {
      // The fake's own registration, as raw answers it cannot build: through
      // the authorization server's metadata pointing at a raw document.
      let vectors = vec![
          ("the baseline", Expect::Taken, r#"{"client_id":"pre-good"}"#),
          (
              "an id twice",
              Expect::Refused,
              r#"{"client_id":"pre-good","client_id":"pre-evil"}"#,
          ),
          (
              "an id in another case",
              Expect::Refused,
              r#"{"client_id":"pre-good","Client_Id":"pre-evil"}"#,
          ),
          ("a NUL in an id", Expect::Refused, r#"{"client_id":"pre-good\u0000x"}"#),
          (
              "a secret twice",
              Expect::Refused,
              r#"{"client_id":"pre-good","client_secret":"a","client_secret":"b"}"#,
          ),
      ];
      let mut failures = Vec::new();
      for (what, expect, raw) in vectors {
          let h = Harness::new();
          let fake = FakeAs::start(Config::default()).await;
          let registration = support::upstream::FakeUpstream::start().await;
          let raw = raw.to_string();
          registration.reply(move |_, _| {
              axum::response::Response::builder()
                  .status(StatusCode::CREATED)
                  .header(header::CONTENT_TYPE, "application/json")
                  .body(Body::from(raw.clone()))
                  .unwrap()
          });
          let o = fake.origin();
          let meta = format!(
              r#"{{"issuer":"{o}","authorization_endpoint":"{o}/authorize","token_endpoint":"{o}/token","registration_endpoint":"{}","code_challenge_methods_supported":["S256"]}}"#,
              registration.url("/register")
          );
          fake.configure(|c| c.raw_meta = Some(meta));
          let id = h.connection(&fake.mcp_url());
          let (status, _, answer) = h.authorize(&id).await;
          let outcome = if status == StatusCode::OK {
              Expect::Taken
          } else {
              Expect::Refused
          };
          if outcome != expect {
              failures.push(format!("{what}: {status} {answer}, expected {expect:?}"));
          }
      }
      assert!(failures.is_empty(), "{failures:#?}");
  }

  /// The ways a query string is read: the first or the last of a name, the
  /// last of a name whatever its case, a value cut at its first NUL.
  #[derive(Debug, Clone, Copy)]
  enum Query {
      First,
      Last,
      AnyCase,
      NulCut,
  }

  fn query_reads(decoder: Query, query: &str, name: &str) -> Option<String> {
      let pairs: Vec<(String, String)> = url::form_urlencoded::parse(query.as_bytes()).into_owned().collect();
      let matching = pairs.iter().filter(|(k, _)| match decoder {
          Query::AnyCase => k.eq_ignore_ascii_case(name),
          _ => k == name,
      });
      let value = match decoder {
          Query::First | Query::NulCut => matching.clone().next(),
          // As Go's `url.Values` read by a case-insensitive lookup: the last.
          Query::Last | Query::AnyCase => matching.clone().next_back(),
      }
      .map(|(_, v)| v.clone());
      match decoder {
          Query::NulCut => value.map(|v| cut_at_nul(&v).to_owned()),
          _ => value,
      }
  }

  /// Lane L16: the callback acts on `state` and `code` only when every way
  /// of reading the query reads them alike; else it reads neither, and the
  /// flow is untouched.
  #[tokio::test]
  async fn the_callback_acts_only_on_a_query_every_reader_reads_alike() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = h.connection(&fake.mcp_url());
      let (_, headers, answer) = h.authorize(&id).await;
      let cookie = flow_cookie(&headers);
      let location = fake.consent(answer["consent_url"].as_str().unwrap()).await;
      let query = location.split_once('?').unwrap().1.to_string();
      let q: std::collections::HashMap<String, String> =
          url::form_urlencoded::parse(query.as_bytes()).into_owned().collect();
      let (state, code) = (&q["state"], &q["code"]);
      let vectors = [
          ("state twice", format!("state={state}&state=other&code={code}")),
          (
              "state twice, first other",
              format!("state=other&state={state}&code={code}"),
          ),
          ("code twice", format!("state={state}&code={code}&code=other")),
          (
              "state in another case",
              format!("state={state}&STATE=other&code={code}"),
          ),
          ("code in another case", format!("state={state}&code={code}&Code=other")),
          ("iss twice", format!("state={state}&code={code}&iss=a&iss=b")),
          ("a NUL in code", format!("state={state}&code={code}%00x")),
          ("a NUL in state", format!("state={state}%00x&code={code}")),
      ];
      let mut failures = Vec::new();
      for (what, vector) in &vectors {
          let readers_agree = ["state", "code", "iss"].iter().all(|name| {
              let first = query_reads(Query::First, vector, name);
              [Query::Last, Query::AnyCase, Query::NulCut]
                  .iter()
                  .all(|&d| query_reads(d, vector, name) == first)
          });
          assert!(!readers_agree, "{what} is no differential");
          let result = h.callback(&format!("/api/mcp/oauth/callback?{vector}"), &cookie).await;
          if result != "flow_unknown" {
              failures.push(format!("{what}: {result}"));
          }
      }
      // The flow was untouched by all of them: the vendor's own redirect
      // still completes.
      let result = h.callback(location.strip_prefix(ORIGIN).unwrap(), &cookie).await;
      if result != "connected" {
          failures.push(format!("the real redirect: {result}"));
      }
      assert!(failures.is_empty(), "{failures:#?}");
  }
  ```

Create `crates/hennery-gateway/tests/oauth_log.rs`:

  ```rust
  //! OAuth hygiene (gateway spec §4.3, §5.8; lane L11; plan 8f): through a
  //! whole Connect, a proxied request, a refresh, a refused refresh and
  //! refused authorizes, at `TRACE`, no log line and no answer holds an
  //! upstream or authorization-server URL's path or query, a code, a PKCE
  //! verifier, `state`, an access or refresh token, a client secret, or the
  //! token endpoint's refusal body. A binary of its own: the subscriber is
  //! the process's, so the servers' tasks on every worker thread log into it.

  mod support;

  use axum::body::Body;
  use axum::http::{Request, header};
  use hennery_gateway::api::{GatewayState, router};
  use hennery_gateway::model::{CredKind, NewConnection};
  use hennery_gateway::proxy::{self, Limits, ProxyState};
  use hennery_kernel::operator::{Operator, SetupOutcome};
  use hennery_kernel::secret::unix_now;
  use serde_json::{Value, json};
  use std::sync::{Arc, Mutex};
  use support::oauth::{Config, FakeAs, PrAt};
  use support::{Recorder, World};
  use tower::ServiceExt;

  const ORIGIN: &str = "https://hennery.example";
  const PATH_CANARY: &str = "pathcanary0a1b2c3d";
  const QUERY_CANARY: &str = "querycanary4e5f6a7b";
  const SECRET_CANARY: &str = "secretcanary8c9d0e1f";
  const BODY_CANARY: &str = "bodycanary2a3b4c5d";
  const TOKEN_PREFIX: &str = "tokcanary6e7f8a9b-";

  #[derive(Clone, Default)]
  struct Captured(Arc<Mutex<Vec<u8>>>);

  impl std::io::Write for Captured {
      fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
          self.0.lock().unwrap().extend_from_slice(buf);
          Ok(buf.len())
      }

      fn flush(&mut self) -> std::io::Result<()> {
          Ok(())
      }
  }

  #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
  async fn no_url_secret_code_verifier_token_or_client_secret_is_logged_or_answered() {
      let captured = Captured::default();
      let writer = captured.clone();
      tracing::subscriber::set_global_default(
          tracing_subscriber::fmt()
              .with_max_level(tracing::Level::TRACE)
              .with_ansi(false)
              .with_writer(move || writer.clone())
              .finish(),
      )
      .unwrap();

      let world = World::new();
      let operator = Arc::new(Operator::open(&world.db).unwrap());
      let now = unix_now();
      let setup = operator.issue_setup_token(now).unwrap().unwrap();
      let SetupOutcome::Done { phc, .. } = operator.set_up(&setup, "correct horse battery", ORIGIN, now).unwrap() else {
          panic!("setup failed");
      };
      let session = operator.open_session("test", &phc, now).unwrap().unwrap();
      let runtime = world.runtime(support::test_egress(), Arc::new(Recorder::default()));
      let api = router(GatewayState {
          runtime: runtime.clone(),
          operator: operator.clone(),
      });
      let mcp = proxy::router(ProxyState::for_sessions(runtime.clone(), Limits::default()));
      let fake = FakeAs::start(Config {
          pr_at: PrAt::Origin,
          registration: false,
          confidential: Some(("pre-1".into(), SECRET_CANARY.into())),
          refusal_body: Some(json!({ "error": "invalid_grant", "error_description": BODY_CANARY })),
          prefix: TOKEN_PREFIX.into(),
          ..Config::default()
      })
      .await;
      let url = format!("{}/s/{PATH_CANARY}/mcp?k={QUERY_CANARY}", fake.origin());
      fake.configure(|c| c.resource = Some(url.clone()));
      let id = world.connection_with(NewConnection {
          slug: "linear".into(),
          label: "Linear".into(),
          url: url.clone(),
          hat_id: world.hat(),
          cred_kind: CredKind::OauthClient,
          static_header: None,
          static_prefix: None,
          tool_allowlist: None,
          internal_network: true,
      });
      world.host("host-a", 1);
      world.mount(&id, &["host-a"]);
      let session_token = world.mint("sess-1", "host-a", &world.hat());

      let answers = std::cell::RefCell::new(String::new());
      let call = async |method: &str, path: &str, body: Option<Value>, cookie: Option<String>| {
          let mut req = Request::builder()
              .method(method)
              .uri(path)
              .header("origin", ORIGIN)
              .header("cookie", cookie.unwrap_or_else(|| format!("hennery_session={session}")));
          if body.is_some() {
              req = req.header("content-type", "application/json");
          }
          let body = body.map_or(Body::empty(), |b| Body::from(b.to_string()));
          let resp = api.clone().oneshot(req.body(body).unwrap()).await.unwrap();
          let headers = format!("{:?}", resp.headers());
          let bytes = axum::body::to_bytes(resp.into_body(), 1 << 20).await.unwrap();
          let text = String::from_utf8_lossy(&bytes).to_string();
          answers.borrow_mut().push_str(&text);
          (headers, text)
      };

      call(
          "PUT",
          &format!("/api/mcp/connections/{id}/oauth-client"),
          Some(json!({ "client_id": "pre-1", "client_secret": SECRET_CANARY })),
          None,
      )
      .await;
      let (headers, text) = call(
          "POST",
          &format!("/api/mcp/connections/{id}/authorize"),
          Some(json!({})),
          None,
      )
      .await;
      let answer: Value = serde_json::from_str(&text).unwrap();
      let consent = answer["consent_url"].as_str().unwrap().to_string();
      let state: String = url::Url::parse(&consent)
          .unwrap()
          .query_pairs()
          .find(|(k, _)| k == "state")
          .unwrap()
          .1
          .into_owned();
      let flow = headers
          .split("set-cookie\": \"")
          .nth(1)
          .unwrap()
          .split(';')
          .next()
          .unwrap()
          .to_string();
      let location = fake.consent(&consent).await;
      let (_, page) = call("GET", location.strip_prefix(ORIGIN).unwrap(), None, Some(flow)).await;
      assert!(page.contains("data-result=\"connected\""), "{page}");

      // A proxied request, a 401, a refresh and a retry.
      fake.expire_access();
      let request = Request::builder()
          .method("POST")
          .uri("/mcp/linear")
          .header(header::AUTHORIZATION, format!("Bearer {session_token}"))
          .header(header::CONTENT_TYPE, "application/json")
          .body(Body::from(
              json!({ "jsonrpc": "2.0", "id": 1, "method": "tools/list" }).to_string(),
          ))
          .unwrap();
      let resp = mcp.clone().oneshot(request).await.unwrap();
      assert_eq!(resp.status(), 200);
      let bytes = axum::body::to_bytes(resp.into_body(), 1 << 20).await.unwrap();
      answers.borrow_mut().push_str(&String::from_utf8_lossy(&bytes));
      // A refused refresh: the token endpoint answers with the canary body.
      let held = world.store.oauth_credential(&id, &world.key).unwrap().unwrap();
      let mut stale = held.tokens.clone();
      stale.refresh_token = Some(zeroize::Zeroizing::new(format!("{TOKEN_PREFIX}unknown")));
      let refreshed = hennery_gateway::store::RefreshedGrant {
          tokens: &stale,
          expires_at: None,
          resource_param_accepted: true,
      };
      world
          .store
          .store_refreshed(&id, &held, &refreshed, &world.key, unix_now())
          .unwrap();
      fake.expire_access();
      let request = Request::builder()
          .method("POST")
          .uri("/mcp/linear")
          .header(header::AUTHORIZATION, format!("Bearer {session_token}"))
          .header(header::CONTENT_TYPE, "application/json")
          .body(Body::from(
              json!({ "jsonrpc": "2.0", "id": 2, "method": "tools/list" }).to_string(),
          ))
          .unwrap();
      let resp = mcp.clone().oneshot(request).await.unwrap();
      assert_eq!(resp.status(), 502);
      let bytes = axum::body::to_bytes(resp.into_body(), 1 << 20).await.unwrap();
      answers.borrow_mut().push_str(&String::from_utf8_lossy(&bytes));
      // Refused authorizes, each naming the URL in its own way.
      fake.configure(|c| c.resource = Some(format!("{}/other/{PATH_CANARY}?q={QUERY_CANARY}", fake.origin())));
      call(
          "POST",
          &format!("/api/mcp/connections/{id}/authorize"),
          Some(json!({})),
          None,
      )
      .await;
      fake.configure(|c| c.resource = Some(format!("https://foreign.example/{PATH_CANARY}?q={QUERY_CANARY}")));
      call(
          "POST",
          &format!("/api/mcp/connections/{id}/authorize"),
          Some(json!({})),
          None,
      )
      .await;
      fake.configure(|c| c.token_endpoint = Some(format!("http://plain.example/{PATH_CANARY}?q={QUERY_CANARY}")));
      call(
          "POST",
          &format!("/api/mcp/connections/{id}/authorize"),
          Some(json!({})),
          None,
      )
      .await;
      // The item itself may show the URL whole (the owner's data): only the
      // log and the other answers are checked from here.
      let logs = String::from_utf8_lossy(&captured.0.lock().unwrap()).to_string();
      assert!(logs.contains(&id), "the log names the connection");
      assert!(!logs.is_empty());
      let mut canaries = vec![
          PATH_CANARY.to_string(),
          QUERY_CANARY.to_string(),
          SECRET_CANARY.to_string(),
          BODY_CANARY.to_string(),
          TOKEN_PREFIX.to_string(),
          state.clone(),
      ];
      canaries.extend(fake.with(|r| r.verifiers.clone()));
      canaries.extend(fake.with(|r| r.issued.clone()));
      assert!(fake.with(|r| r.verifiers.len()) == 1);
      for canary in &canaries {
          assert!(!logs.contains(canary.as_str()), "{canary} is in the log");
      }
      let answers = answers.into_inner();
      for canary in [
          SECRET_CANARY,
          BODY_CANARY,
          TOKEN_PREFIX,
          &fake.with(|r| r.verifiers[0].clone()),
      ] {
          assert!(!answers.contains(canary), "{canary} is in an answer");
      }
      // Error answers name origins only: no `{code, message}` holds the
      // URLs' canaries (the items, which show `url` whole, are not errors).
      for answer in answers.split("{\"code\":").skip(1) {
          let error = answer.split('}').next().unwrap();
          assert!(!error.contains(PATH_CANARY) && !error.contains(QUERY_CANARY), "{error}");
      }
  }
  ```

In `crates/hennery-gateway/tests/support/differential.rs`, replace:

  ```rust
  fn cut_at_nul(s: &str) -> &str {
  ```

with:

  ```rust
  /// A string cut at its first NUL, as a C reader hands it on.
  pub fn cut_at_nul(s: &str) -> &str {
  ```

In `crates/hennery-testkit/tests/capabilities.rs`, replace:

  ```rust
          serde_json::json!({"mode": "full", "features": ["mcp_connections", "mcp_stdio"]})
  ```

with:

  ```rust
          serde_json::json!({"mode": "full", "features": ["mcp_connections", "mcp_stdio", "mcp_oauth"]})
  ```

In `crates/hennery/tests/cli.rs`, replace:

  ```rust
          assert!(body.contains(r#""code":"not_found""#), "{method}: {body}");
      }
  ```

with:

  ```rust
          assert!(body.contains(r#""code":"not_found""#), "{method}: {body}");
      }
      stop(&mut collector);
  }

  /// Plan 8f (api-8e-8f B5, R7): the collector serves the OAuth callback
  /// outside the operator's routes and the browser rules: the vendor's
  /// redirect arrives cross-site without the session cookie, and gets the
  /// callback's own page (an unknown `state` here), with the kernel's CSP,
  /// `no-store` and `no-referrer`; its script is served too.
  #[test]
  fn the_collector_serves_the_oauth_callback_outside_the_operator_s_routes() {
      let dir = scratch_dir("mcp-callback");
      let _cleanup = RemoveDir(dir.clone());
      let data = dir.join("collector");
      let (mut collector, listen) = collector_on(&data, &dir.join("collector.log"));
      for (path, status, kind) in [
          ("/api/mcp/oauth/callback?code=c&state=unknown", "400", "text/html"),
          ("/api/mcp/oauth/callback.js", "200", "text/javascript"),
      ] {
          let mut stream = TcpStream::connect(&listen).unwrap();
          stream.set_read_timeout(Some(Duration::from_secs(15))).unwrap();
          write!(
              stream,
              "GET {path} HTTP/1.1\r\nHost: {listen}\r\nOrigin: https://vendor.example\r\nSec-Fetch-Site: cross-site\r\nConnection: close\r\n\r\n"
          )
          .unwrap();
          let mut response = String::new();
          stream.read_to_string(&mut response).unwrap();
          let (head, body) = response.split_once("\r\n\r\n").unwrap();
          let head = head.to_ascii_lowercase();
          assert!(head.starts_with(&format!("http/1.1 {status}")), "{path}: {response}");
          assert!(head.contains(&format!("content-type: {kind}")), "{path}: {head}");
          assert!(head.contains("cache-control: no-store"), "{path}: {head}");
          assert!(head.contains("referrer-policy: no-referrer"), "{path}: {head}");
          if kind == "text/html" {
              assert!(head.contains("content-security-policy: script-src 'self'"), "{head}");
              assert!(body.contains("data-result=\"flow_unknown\""), "{body}");
          }
      }
  ```

- [ ] **Step 2: Run them and see them fail, then commit them**

   ```sh
   nix develop -c cargo test --locked -p hennery-gateway --no-fail-fast && nix develop -c cargo test --locked -p hennery-testkit --test capabilities && nix develop -c cargo test --locked -p hennery --test cli the_collector_serves_the_oauth_callback
   ```

   83 tests fail: every test of `tests/oauth.rs` and `tests/oauth_differential.rs` and the canaries of `tests/oauth_log.rs` (the routes answer 404), `api_log.rs`'s `an_unknown_stored_status_is_logged`, the collector's `the_collector_serves_the_oauth_callback_outside_the_operator_s_routes`, and the testkit's capabilities test (no `mcp_oauth`).

   ```sh
   git add -A && git -c commit.gpgsign=false commit -m "test(gateway): Connect from the web UI: the redirect URI, the client, authorize, the callback, probe now"
   ```

- [ ] **Step 3: Implement**

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
  };
  use crate::runtime::Runtime;
  ```

with:

  ```rust
  };
  use crate::oauth_api;
  use crate::runtime::Runtime;
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
  use axum::routing::{get, patch, put};
  ```

with:

  ```rust
  use axum::routing::{get, patch, post, put};
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
      McpMountsRequest, McpStdioEnvItem, McpStdioServerItem, McpStdioServerSet, McpStdioServersRequest,
      UpdateMcpConnectionRequest,
  ```

with:

  ```rust
      McpMountsRequest, McpOauthError, McpOauthPendingClient, McpOauthState, McpStdioEnvItem, McpStdioServerItem,
      McpStdioServerSet, McpStdioServersRequest, UpdateMcpConnectionRequest,
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
  const BODY_LIMIT: usize = 256 * 1024;

  ```

with:

  ```rust
  const BODY_LIMIT: usize = 256 * 1024;

  /// The OAuth callback's path (gateway spec §4.2): what the redirect URI
  /// names.
  pub const CALLBACK_PATH: &str = "/api/mcp/oauth/callback";

  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
  /// The routes, behind the operator's session. Step-up is layered on each
  /// method that always needs it (`Handler::layer`), so a method added to a
  /// route later gets none unless it is layered too; `PATCH` checks it in
  /// its handler, for the fields that need it.
  ```

with:

  ```rust
  impl GatewayState {
      /// The redirect URI to register at a vendor (gateway spec §4.2):
      /// `<public_url>/api/mcp/oauth/callback`. `None` before setup.
      pub fn redirect_uri(&self) -> Option<String> {
          self.operator
              .public_url()
              .map(|url| format!("{}{CALLBACK_PATH}", url.origin()))
      }

      /// Whether cookies are `Secure`: as the kernel's session cookie (kernel
      /// spec §3.2), unless `public_url` is loopback `http`.
      pub fn secure_cookies(&self) -> bool {
          self.operator.public_url().is_none_or(|url| url.is_https())
      }
  }

  /// The routes, behind the operator's session. Step-up is layered on each
  /// method that always needs it (`Handler::layer`), so a method added to a
  /// route later gets none unless it is layered too; `PATCH` checks it in
  /// its handler, for the fields that need it. The OAuth callback is beside
  /// them, outside the operator's session and the browser rules: the vendor's
  /// redirect arrives cross-site, without the `SameSite=Strict` session
  /// cookie (`callback::router`).
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
          .layer(DefaultBodyLimit::max(BODY_LIMIT));
      operator_only(routes, state.operator.clone())
          .layer(middleware::map_response(no_store))
          .with_state(state)
  ```

with:

  ```rust
          .route(
              "/api/mcp/connections/{id}/oauth-client",
              put(oauth_api::oauth_client.layer(middleware::from_fn(require_step_up))),
          )
          .route(
              "/api/mcp/connections/{id}/authorize",
              post(oauth_api::authorize.layer(middleware::from_fn(require_step_up))),
          )
          .route("/api/mcp/connections/{id}/probe", post(oauth_api::probe))
          .route("/api/mcp/oauth/redirect-uri", get(oauth_api::redirect_uri))
          .layer(DefaultBodyLimit::max(BODY_LIMIT));
      operator_only(routes, state.operator.clone())
          .layer(middleware::map_response(no_store))
          .with_state(state.clone())
          .merge(crate::callback::router(state))
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
  fn error(status: StatusCode, code: &str, message: impl Into<String>) -> Response {
  ```

with:

  ```rust
  pub(crate) fn error(status: StatusCode, code: &str, message: impl Into<String>) -> Response {
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
  fn internal(err: anyhow::Error) -> Response {
  ```

with:

  ```rust
  pub(crate) fn internal(err: anyhow::Error) -> Response {
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
  fn not_found() -> Response {
  ```

with:

  ```rust
  pub(crate) fn not_found() -> Response {
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
  fn model_kind(kind: McpCredKind) -> CredKind {
  ```

with:

  ```rust
  pub(crate) fn model_kind(kind: McpCredKind) -> CredKind {
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
  fn item(record: ConnectionRecord) -> McpConnectionItem {
      McpConnectionItem {
          status: match record.status.as_str() {
              "ok" => McpConnectionStatus::Ok,
              "needs_auth" => McpConnectionStatus::NeedsAuth,
              "error" => McpConnectionStatus::Error,
              _ => McpConnectionStatus::NotConnected,
          },
          checked_at: None,
          oauth: None,
          oauth_error: None,
  ```

with:

  ```rust
  /// The wire item of `record`; `redirect_uri` is what OAuth connections
  /// show to register at the vendor.
  pub(crate) fn item(record: ConnectionRecord, redirect_uri: &str) -> McpConnectionItem {
      let oauth = record.oauth_client.map(|client| McpOauthState {
          redirect_uri: redirect_uri.to_string(),
          client_id: client.client_id,
          has_client_secret: client.has_client_secret,
          pending_client: client
              .pending
              .map(|(client_id, has_client_secret)| McpOauthPendingClient {
                  client_id,
                  has_client_secret,
              }),
          resource_mismatch: record.resource_mismatch,
          accepted_resource: record.accepted_resource,
      });
      McpConnectionItem {
          status: match crate::model::Status::parse(&record.status) {
              Some(crate::model::Status::Ok) => McpConnectionStatus::Ok,
              Some(crate::model::Status::NeedsAuth) => McpConnectionStatus::NeedsAuth,
              Some(crate::model::Status::Error) => McpConnectionStatus::Error,
              Some(crate::model::Status::NotConnected) => McpConnectionStatus::NotConnected,
              // The schema's CHECK keeps any other out; logged, not hidden
              // (plan 8a's follow-up).
              None => {
                  tracing::warn!(connection_id = %record.id, "gateway: a stored status the API does not know");
                  McpConnectionStatus::NotConnected
              }
          },
          checked_at: record.checked_at.map(rfc3339),
          oauth,
          oauth_error: record.oauth_error.map(|e| McpOauthError {
              code: e.code,
              message: e.message,
              at: rfc3339(e.at),
          }),
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
  fn changed(change: Change, status: StatusCode) -> Response {
      match change {
          Change::Done(record) => (status, Json(item(*record))).into_response(),
  ```

with:

  ```rust
  fn changed(state: &GatewayState, change: Change, status: StatusCode) -> Response {
      match change {
          Change::Done(record) => {
              (status, Json(item(*record, &state.redirect_uri().unwrap_or_default()))).into_response()
          }
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
          ),
          Change::Unsupported(kind) => error(
              StatusCode::BAD_REQUEST,
              "unsupported_cred_kind",
              format!("{} connections are not supported yet", kind.as_str()),
  ```

with:

  ```rust
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
      match state.runtime.store.list() {
          Ok(records) => Json(records.into_iter().map(item).collect::<Vec<_>>()).into_response(),
  ```

with:

  ```rust
      let redirect_uri = state.redirect_uri().unwrap_or_default();
      match state.runtime.store.list() {
          Ok(records) => Json(
              records
                  .into_iter()
                  .map(|record| item(record, &redirect_uri))
                  .collect::<Vec<_>>(),
          )
          .into_response(),
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
      if new.cred_kind.is_oauth() {
          return changed(Change::Unsupported(new.cred_kind), StatusCode::CREATED);
      }
  ```

with:

  ```rust
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
              changed(change, StatusCode::CREATED)
  ```

with:

  ```rust
              changed(&state, change, StatusCode::CREATED)
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
      if let Some(kind) = patch.cred_kind.filter(|kind| kind.is_oauth()) {
          return changed(Change::Unsupported(kind), StatusCode::OK);
      }
      match state.runtime.store.update(&id, &patch, unix_now()) {
          Ok(change) => {
              if let Change::Done(record) = &change {
  ```

with:

  ```rust
      let before = match state.runtime.store.connection(&id) {
          Ok(before) => before,
          Err(err) => return internal(err),
      };
      match state.runtime.store.update(&id, &patch, unix_now()) {
          Ok(change) => {
              if let (Change::Done(record), Some(before)) = (&change, &before) {
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
                  );
              }
              changed(change, StatusCode::OK)
          }
  ```

with:

  ```rust
                  );
                  // Its flows were for what it was (the review's R1).
                  if record.url != before.url
                      || record.cred_kind != before.cred_kind
                      || record.internal_network != before.internal_network
                  {
                      state.runtime.flows.drop_connection(&id);
                  }
              }
              changed(&state, change, StatusCode::OK)
          }
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
  /// `DELETE /api/mcp/connections/{id}` (step-up): 204, with its mounts and
  /// credential gone.
  ```

with:

  ```rust
  /// `DELETE /api/mcp/connections/{id}` (step-up): 204, with its mounts,
  /// credential and OAuth client gone, and its flows dropped.
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
          Ok(true) => {
              tracing::info!(connection_id = %id, "gateway connection deleted");
  ```

with:

  ```rust
          Ok(true) => {
              state.runtime.flows.drop_connection(&id);
              tracing::info!(connection_id = %id, "gateway connection deleted");
  ```

In `crates/hennery-gateway/src/api.rs`, replace:

  ```rust
              changed(change, StatusCode::OK)
  ```

with:

  ```rust
              changed(&state, change, StatusCode::OK)
  ```

Create `crates/hennery-gateway/src/callback.rs`:

  ```rust
  //! The OAuth callback (gateway spec §4.3; api-8e-8f B5, R1, R3, R6, R7):
  //! `GET /api/mcp/oauth/callback`, the vendor's redirect target, and
  //! `GET /api/mcp/oauth/callback.js`, its page's one script.
  //!
  //! - **Outside the operator's session and the browser rules.** The session
  //!   cookie is `SameSite=Strict`, so the browser does not send it on the
  //!   vendor's cross-site redirect, and `Sec-Fetch-Site: cross-site` would be
  //!   refused by the browser rules. `state` and the flow's own cookie
  //!   authenticate it instead. It is the one `GET` that changes state (kernel
  //!   spec §3.3's write-back).
  //! - **Its own headers:** `Cache-Control: no-store`, `Referrer-Policy:
  //!   no-referrer`, `X-Content-Type-Options: nosniff`, and the kernel's
  //!   `Content-Security-Policy` (`csp::on_html`), layered here: the kernel's
  //!   layer covers only the router it is put on, not one merged beside it.
  //! - **The order of checks** (api-8e-8f B5): `state` (before any storage);
  //!   the flow cookie, constant-time, the flow consumed either way; the
  //!   operator's session; `iss` (RFC 9207, mix-up); the vendor's `error`;
  //!   the exchange; under the refresh lock, the connection unchanged since the
  //!   flow started; then the grant is stored. Every outcome from the cookie
  //!   on clears it. Every failure from the flow on is kept in the
  //!   connection's `oauth_error`; the first two name no connection, so they
  //!   write nothing.
  //! - **The page** is static HTML, no inline script, no external resource,
  //!   no label, URL, account, client id, token or code: `<body
  //!   data-outcome data-result data-connection>`, a heading and the message
  //!   as escaped text. No redirect, no return URL: it navigates nowhere.

  use crate::api::{CALLBACK_PATH, GatewayState};
  use crate::flows::{MAX_FLOW_COOKIES, Taken, cookie_name};
  use crate::model::vendor_text;
  use crate::notify;
  use crate::oauth::{self, Grant, TokenError};
  use crate::store::{GrantStored, GrantToStore};
  use axum::Router;
  use axum::extract::{RawQuery, State};
  use axum::http::{HeaderMap, HeaderValue, StatusCode, header};
  use axum::middleware;
  use axum::response::{IntoResponse, Response};
  use axum::routing::get;
  use hennery_kernel::secret::unix_now;
  use std::collections::HashMap;

  /// The script's path: `script-src 'self'` allows it.
  pub const SCRIPT_PATH: &str = "/api/mcp/oauth/callback.js";

  /// The query parameters the callback reads; each at most once (lane L16).
  const PARAMETERS: &[&str] = &["code", "state", "error", "error_description", "iss"];

  /// The most bytes of one parameter read.
  const MAX_PARAMETER: usize = 4096;

  /// The callback's routes, merged beside the operator's, never under them.
  pub fn router(state: GatewayState) -> Router {
      Router::new()
          .route(CALLBACK_PATH, get(callback))
          .route(SCRIPT_PATH, get(script))
          .layer(middleware::map_response(private_headers))
          .layer(middleware::map_response(hennery_kernel::csp::on_html))
          .with_state(state)
  }

  async fn private_headers(mut response: Response) -> Response {
      let headers = response.headers_mut();
      headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
      headers.insert(header::REFERRER_POLICY, HeaderValue::from_static("no-referrer"));
      headers.insert(header::X_CONTENT_TYPE_OPTIONS, HeaderValue::from_static("nosniff"));
      response
  }

  /// The page's script: static, data-free, served like the kernel's
  /// `/setup.js`. It strips `code` and `state` from the URL and the history,
  /// tells the opener's window over `BroadcastChannel` (the popup has no
  /// opener), and closes the window on success after a second.
  pub const SCRIPT: &str = r#"// hennery: the OAuth callback page's script (plan 8f). Static; it holds no data.
  history.replaceState(null, "", "/api/mcp/oauth/callback");
  const page = document.body;
  const outcome = page.dataset.outcome;
  try {
    const channel = new BroadcastChannel("hennery-mcp-oauth");
    channel.postMessage({
      type: "done",
      connection_id: page.dataset.connection,
      outcome,
      result: page.dataset.result,
    });
    channel.close();
  } catch (e) {
    // No BroadcastChannel: the opener's window refetches on focus.
  }
  const close = document.getElementById("close");
  if (outcome === "connected") {
    setTimeout(() => window.close(), 1000);
  } else if (close) {
    close.hidden = false;
    close.addEventListener("click", () => window.close());
  }
  "#;

  async fn script() -> Response {
      ([(header::CONTENT_TYPE, "text/javascript; charset=utf-8")], SCRIPT).into_response()
  }

  /// Escaped for HTML text and attribute values.
  fn escape(text: &str) -> String {
      let mut out = String::with_capacity(text.len());
      for c in text.chars() {
          match c {
              '&' => out.push_str("&amp;"),
              '<' => out.push_str("&lt;"),
              '>' => out.push_str("&gt;"),
              '"' => out.push_str("&quot;"),
              '\'' => out.push_str("&#39;"),
              c => out.push(c),
          }
      }
      out
  }

  /// One answer of the callback.
  struct Outcome {
      status: StatusCode,
      /// `connected`, or the failure's code.
      result: &'static str,
      connection_id: Option<String>,
      message: String,
      /// What the operator's item records instead of `message`, when the
      /// page must not show it (api-8e-8f B5: the page names no address).
      detail: Option<String>,
  }

  impl Outcome {
      fn failed(status: StatusCode, result: &'static str, message: impl Into<String>) -> Self {
          Self {
              status,
              result,
              connection_id: None,
              message: message.into(),
              detail: None,
          }
      }

      fn recording(mut self, detail: impl Into<String>) -> Self {
          self.detail = Some(detail.into());
          self
      }

      fn of(mut self, connection_id: &str) -> Self {
          self.connection_id = Some(connection_id.to_string());
          self
      }
  }

  /// The page for `outcome`, clearing the flow's cookie if `clear` names it.
  fn page(outcome: &Outcome, clear: Option<(&str, bool)>) -> Response {
      let connected = outcome.result == "connected";
      let heading = if connected { "Connected" } else { "Not connected" };
      let body = format!(
          "<!doctype html>\n<html lang=\"en\">\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<title>hennery</title>\n<body data-outcome=\"{}\" data-result=\"{}\" data-connection=\"{}\">\n<h1>{heading}</h1>\n<p id=\"message\">{}</p>\n<p><button id=\"close\" type=\"button\" hidden>Close</button></p>\n<script src=\"{SCRIPT_PATH}\"></script>\n</body>\n</html>\n",
          if connected { "connected" } else { "failed" },
          escape(outcome.result),
          escape(outcome.connection_id.as_deref().unwrap_or("")),
          escape(&outcome.message),
      );
      let mut response = (
          outcome.status,
          [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
          body,
      )
          .into_response();
      if let Some((name, secure)) = clear {
          let secure = if secure { "; Secure" } else { "" };
          let cookie = format!("{name}=; HttpOnly; SameSite=Lax; Path={CALLBACK_PATH}; Max-Age=0{secure}");
          if let Ok(value) = HeaderValue::from_str(&cookie) {
              response.headers_mut().append(header::SET_COOKIE, value);
          }
      }
      response
  }

  /// The query's parameters the callback reads, or `None` if one is there
  /// twice, in another case too, too long, or holds a control character:
  /// whichever of two a vendor or another parser would read, the callback
  /// reads neither (lane L16).
  fn parameters(query: Option<&str>) -> Option<HashMap<&'static str, String>> {
      let mut out: HashMap<&'static str, String> = HashMap::new();
      for (name, value) in url::form_urlencoded::parse(query.unwrap_or_default().as_bytes()) {
          let Some(known) = PARAMETERS.iter().copied().find(|p| *p == name) else {
              // `STATE` or `Code` beside the real one: a reader matching
              // names whatever their case would take it.
              if PARAMETERS.iter().any(|p| p.eq_ignore_ascii_case(&name)) {
                  return None;
              }
              continue;
          };
          if value.len() > MAX_PARAMETER || value.chars().any(char::is_control) {
              return None;
          }
          if out.insert(known, value.into_owned()).is_some() {
              return None;
          }
      }
      Some(out)
  }

  /// The values of every cookie named `name`, at most `MAX_FLOW_COOKIES`: a
  /// sibling subdomain may set one of the same name first (as
  /// `operator::session_tokens`).
  fn cookies<'a>(headers: &'a HeaderMap, name: &str) -> Vec<&'a str> {
      headers
          .get_all(header::COOKIE)
          .iter()
          .filter_map(|v| v.to_str().ok())
          .flat_map(|v| v.split(';'))
          .filter_map(|pair| {
              let (key, value) = pair.trim().split_once('=')?;
              (key == name).then_some(value)
          })
          .take(MAX_FLOW_COOKIES)
          .collect()
  }

  /// `GET /api/mcp/oauth/callback`.
  async fn callback(State(state): State<GatewayState>, RawQuery(query): RawQuery, headers: HeaderMap) -> Response {
      let runtime = &state.runtime;
      let now = unix_now();
      let unknown = || {
          page(
              &Outcome::failed(
                  StatusCode::BAD_REQUEST,
                  "flow_unknown",
                  "This sign-in is unknown or has expired. Start it again from hennery.",
              ),
              None,
          )
      };
      // 1. `state`, before anything is stored or read from storage.
      let Some(params) = parameters(query.as_deref()) else {
          return unknown();
      };
      let Some(flow_state) = params.get("state") else {
          return unknown();
      };
      // 2. The flow's cookie: the flow is consumed either way.
      let name = cookie_name(flow_state);
      let clear = Some((name.as_str(), state.secure_cookies()));
      let snapshot = match runtime.flows.take(flow_state, &cookies(&headers, &name), now) {
          Taken::Unknown => return unknown(),
          Taken::Mismatch(_) => {
              tracing::warn!("gateway: an OAuth callback without its flow's cookie refused");
              return page(
                  &Outcome::failed(
                      StatusCode::BAD_REQUEST,
                      "flow_mismatch",
                      "This sign-in was not started in this browser. Start it again from hennery.",
                  ),
                  clear,
              );
          }
          Taken::Taken(snapshot) => snapshot,
      };
      // 3. From here on, only the snapshot (G-8).
      let id = snapshot.connection_id.clone();
      let outcome = finish(&state, &snapshot, &params, now).await.of(&id);
      let code = outcome.result;
      if code == "connected" {
          tracing::info!(connection_id = %id, "gateway: a Connect completed");
      } else {
          tracing::info!(connection_id = %id, code, "gateway: a Connect failed");
          if let Err(err) = runtime.store.set_oauth_error(
              &id,
              Some((code, outcome.detail.as_ref().unwrap_or(&outcome.message))),
              now,
          ) {
              tracing::error!(connection_id = %id, error = %err, "gateway: a Connect's failure not recorded");
          }
      }
      page(&outcome, clear)
  }

  /// Steps 4 to 9 (api-8e-8f B5).
  async fn finish(
      state: &GatewayState,
      snapshot: &crate::flows::Snapshot,
      params: &HashMap<&'static str, String>,
      now: i64,
  ) -> Outcome {
      let runtime = &state.runtime;
      // 4. The operator's session that started it is still live.
      match state.operator.session_expires_at(&snapshot.auth_session, now) {
          Ok(Some(_)) => {}
          Ok(None) => {
              return Outcome::failed(
                  StatusCode::BAD_REQUEST,
                  "session_ended",
                  "The hennery session that started this sign-in has ended. Sign in and start again.",
              );
          }
          Err(err) => {
              tracing::error!(error = %err, "gateway: a session not read");
              return Outcome::failed(
                  StatusCode::INTERNAL_SERVER_ERROR,
                  "internal",
                  "Something went wrong in hennery.",
              );
          }
      }
      // 5. `iss` (RFC 9207): mix-up protection, since any MCP URL may be
      // hostile (the review's R6).
      let issuer_ok = match params.get("iss") {
          Some(iss) => *iss == snapshot.issuer,
          None => !snapshot.iss_parameter,
      };
      if !issuer_ok {
          return Outcome::failed(
              StatusCode::BAD_REQUEST,
              "issuer_mismatch",
              "The answer did not come from the authorization server this sign-in started at.",
          );
      }
      // 6. The vendor's own refusal, reached only after state, cookie and
      // session passed, so an outsider cannot put text on this page.
      if let Some(said) = params.get("error") {
          let text = match params.get("error_description") {
              Some(description) => format!("{said}: {description}"),
              None => said.clone(),
          };
          let mut message = vendor_text(&text);
          if said == "invalid_target" && snapshot.resource_param {
              // RFC 8707: the server does not take `resource`; the next
              // Connect omits it (plan 8f decision 11).
              runtime.flows.refuse_resource(&snapshot.connection_id, &snapshot.url);
              message.push_str(" Connect again: hennery will not send the resource parameter this time.");
          }
          return Outcome::failed(StatusCode::BAD_REQUEST, "consent_denied", message);
      }
      let Some(code) = params.get("code") else {
          return Outcome::failed(
              StatusCode::BAD_REQUEST,
              "consent_denied",
              "The authorization server answered with no code.",
          );
      };
      // 7. The exchange: the verifier and `resource` as recorded; the token
      // endpoint's body is never logged or echoed.
      let client = runtime.client(snapshot.internal_network);
      let grant = Grant::Code {
          code,
          redirect_uri: &snapshot.redirect_uri,
          verifier: &snapshot.verifier,
      };
      let resource = snapshot.resource_param.then_some(snapshot.resource.as_str());
      let (issued, resource_param_accepted) = match oauth::token(&client, &snapshot.client, &grant, resource).await {
          Err(TokenError::InvalidTarget) if resource.is_some() => {
              (oauth::token(&client, &snapshot.client, &grant, None).await, false)
          }
          other => (other, snapshot.resource_param),
      };
      let issued = match issued {
          Ok(issued) => issued,
          Err(TokenError::Unavailable) => {
              return Outcome::failed(
                  StatusCode::BAD_GATEWAY,
                  "upstream_unreachable",
                  "The authorization server could not be reached.",
              );
          }
          Err(TokenError::EgressRefused(why)) => {
              return Outcome::failed(
                  StatusCode::BAD_GATEWAY,
                  "egress_refused",
                  "The authorization server's address is refused by hennery's egress policy.",
              )
              .recording(why);
          }
          Err(err) => {
              return Outcome::failed(StatusCode::BAD_GATEWAY, "exchange_failed", err.message());
          }
      };
      let tokens = crate::model::GrantTokens {
          access_token: issued.access_token,
          refresh_token: issued.refresh_token,
      };
      // 8. Under the refresh lock: the connection unchanged since the flow
      // started (the review's R1), then the grant.
      let _lock = runtime.lock(&snapshot.connection_id).await;
      let stored = runtime.store.store_grant(
          &GrantToStore {
              connection_id: &snapshot.connection_id,
              url: &snapshot.url,
              cred_kind: snapshot.cred_kind,
              internal_network: snapshot.internal_network,
              source: snapshot.source,
              client: &snapshot.client,
              issuer: &snapshot.issuer,
              authorization_endpoint: &snapshot.authorization_endpoint,
              redirect_uri: &snapshot.redirect_uri,
              scopes: &snapshot.scopes,
              resource: &snapshot.resource,
              resource_param_accepted,
              registered_at: snapshot.registered_at,
              tokens: &tokens,
              expires_at: oauth::expires_at(unix_now(), issued.expires_in),
          },
          &runtime.key,
          unix_now(),
      );
      match stored {
          Ok(GrantStored::Stored(change)) => {
              notify::announce(runtime.notifier.as_ref(), &change);
              // 9.
              Outcome {
                  status: StatusCode::OK,
                  result: "connected",
                  connection_id: None,
                  message: "Connected. You may close this window.".into(),
                  detail: None,
              }
          }
          Ok(GrantStored::ConnectionChanged) => Outcome::failed(
              StatusCode::BAD_REQUEST,
              "connection_changed",
              "The connection was changed while this sign-in ran. Start it again.",
          ),
          Err(err) => {
              tracing::error!(connection_id = %snapshot.connection_id, error = %err, "gateway: a grant not stored");
              Outcome::failed(
                  StatusCode::INTERNAL_SERVER_ERROR,
                  "internal",
                  "Something went wrong in hennery.",
              )
          }
      }
  }

  #[cfg(test)]
  mod tests {
      use super::*;

      /// Lane L16: a parameter twice, or with a control character, is read
      /// as neither.
      #[test]
      fn a_parameter_twice_or_with_a_control_character_is_refused() {
          assert_eq!(parameters(Some("state=a&code=b")).unwrap()["state"], "a");
          assert!(parameters(Some("state=a&state=b")).is_none());
          assert!(parameters(Some("state=a&code=b&code=c")).is_none());
          assert!(parameters(Some("state=a&iss=x&iss=y")).is_none());
          assert!(parameters(Some("state=a%00b")).is_none());
          assert!(parameters(Some("state=a&code=b%0A")).is_none());
          // Parameters the callback does not read may repeat.
          assert!(parameters(Some("state=a&x=1&x=2")).is_some());
      }

      #[test]
      fn the_page_escapes_what_it_shows() {
          assert_eq!(escape("<a href=\"x\">'&"), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
      }
  }
  ```

In `crates/hennery-gateway/src/lib.rs`, replace:

  ```rust
  pub mod api;
  pub mod crypto;
  ```

with:

  ```rust
  pub mod api;
  pub mod callback;
  pub mod crypto;
  ```

In `crates/hennery-gateway/src/lib.rs`, replace:

  ```rust
  pub mod oauth;
  pub mod probe;
  ```

with:

  ```rust
  pub mod oauth;
  mod oauth_api;
  pub mod probe;
  ```

In `crates/hennery-gateway/src/model.rs`, replace:

  ```rust
      /// A kind this plan does not take yet.
      Unsupported(CredKind),
  ```

with:

  ```rust
  ```

Create `crates/hennery-gateway/src/oauth_api.rs`:

  ```rust
  //! The OAuth routes behind the operator's session (gateway spec §4, §9;
  //! api-8e-8f B2, B3, B6): the redirect URI, a pre-registered client
  //! (step-up), authorize (step-up: kernel spec §3.4 lists gateway
  //! credentials and pre-registered clients; api-8e-8f F2), and a
  //! probe now. The callback is `callback.rs`, outside the session.
  //!
  //! Each authorize failure after the connection was found is also kept in
  //! the connection's `oauth_error`, and the next authorize clears it. A
  //! failed Connect never touches the status: a working grant stays `ok`
  //! (G-7: it is never touched until a new consent completes).

  use crate::api::{GatewayState, error, internal, item, not_found};
  use crate::flows::{FLOW_TTL, MAX_FLOWS, Registration, Snapshot, cookie_name};
  use crate::model::{CredKind, MAX_URL, TokenClient, url_for_logs};
  use crate::oauth::{self, Consent, DiscoveryError, RegisterError};
  use crate::probe;
  use crate::store::{ClientChange, ClientSource, SecretInput, Slot};
  use axum::Json;
  use axum::extract::{Extension, Path, State};
  use axum::http::{HeaderValue, StatusCode, header};
  use axum::response::{IntoResponse, Response};
  use hennery_kernel::egress::is_https_or_loopback;
  use hennery_kernel::json::ApiJson;
  use hennery_kernel::operator::Authenticated;
  use hennery_kernel::secret::{rfc3339, unix_now};
  use hennery_proto::rest::{McpAuthorizeRequest, McpAuthorizeResponse, McpOauthClientRequest, McpOauthRedirect};
  use url::Url;
  use zeroize::Zeroizing;

  /// `GET /api/mcp/oauth/redirect-uri`.
  pub(crate) async fn redirect_uri(State(state): State<GatewayState>) -> Response {
      match state.redirect_uri() {
          Some(redirect_uri) => Json(McpOauthRedirect { redirect_uri }).into_response(),
          None => internal(anyhow::anyhow!("no public_url")),
      }
  }

  /// `PUT /api/mcp/connections/{id}/oauth-client` (step-up).
  pub(crate) async fn oauth_client(
      State(state): State<GatewayState>,
      Path(id): Path<String>,
      ApiJson(req): ApiJson<McpOauthClientRequest>,
  ) -> Response {
      let runtime = &state.runtime;
      let secret = match req.client_secret {
          None => SecretInput::Keep,
          Some(None) => SecretInput::Clear,
          Some(Some(secret)) => SecretInput::Set(Zeroizing::new(secret)),
      };
      // A client secret is a credential: its write takes the refresh lock.
      let _lock = runtime.lock(&id).await;
      match runtime
          .store
          .set_oauth_client(&id, &req.client_id, secret, &runtime.key, unix_now())
      {
          Ok(ClientChange::Done(record)) => {
              // Its flows were for the client before (the review's R1).
              runtime.flows.drop_connection(&id);
              tracing::info!(connection_id = %id, "gateway connection's OAuth client set");
              Json(item(*record, &state.redirect_uri().unwrap_or_default())).into_response()
          }
          Ok(ClientChange::NotFound) => not_found(),
          Ok(ClientChange::WrongKind(kind)) => error(
              StatusCode::CONFLICT,
              "wrong_cred_kind",
              format!("a {} connection takes no pre-registered client", kind.as_str()),
          ),
          Ok(ClientChange::Invalid(why)) => error(StatusCode::BAD_REQUEST, "invalid", why),
          Err(err) => internal(err),
      }
  }

  /// How a protected-resource document's `resource` stands to the
  /// connection's URL (gateway spec §4.1; api-8e-8f R4).
  #[derive(Debug, Clone, Copy, PartialEq, Eq)]
  pub enum ResourceFit {
      /// Same origin, and the URL's path is the resource's or below it.
      Matches,
      /// Same origin, another path: shown to the operator, who may accept it.
      Mismatch,
      /// Another origin, not `https`, over 2048 bytes or not a URL: it cannot
      /// be accepted.
      Foreign,
  }

  /// Judge `resource` against `url`. The path is compared segment by
  /// segment: `/mcp` covers `/mcp` and `/mcp/x`, never `/mcpx`.
  pub fn resource_fit(resource: &str, url: &Url) -> ResourceFit {
      let Some(named) = (resource.len() <= MAX_URL)
          .then(|| Url::parse(resource).ok())
          .flatten()
          .filter(is_https_or_loopback)
      else {
          return ResourceFit::Foreign;
      };
      if named.origin() != url.origin() {
          return ResourceFit::Foreign;
      }
      let base = named.path().trim_end_matches('/');
      let path = url.path();
      if base.is_empty() || path == base || path.starts_with(&format!("{base}/")) {
          ResourceFit::Matches
      } else {
          ResourceFit::Mismatch
      }
  }

  /// `POST /api/mcp/connections/{id}/authorize` (step-up): discovery,
  /// registration if needed, the flow and its cookie, and the consent URL
  /// (gateway spec §4.1–§4.3).
  pub(crate) async fn authorize(
      State(state): State<GatewayState>,
      Extension(session): Extension<Authenticated>,
      Path(id): Path<String>,
      ApiJson(req): ApiJson<McpAuthorizeRequest>,
  ) -> Response {
      let runtime = &state.runtime;
      let now = unix_now();
      let connection = match runtime.store.connection(&id) {
          Ok(Some(connection)) => connection,
          Ok(None) => return not_found(),
          Err(err) => return internal(err),
      };
      if !connection.cred_kind.is_oauth() {
          return error(
              StatusCode::CONFLICT,
              "wrong_cred_kind",
              format!(
                  "a {} connection does not connect with OAuth",
                  connection.cred_kind.as_str()
              ),
          );
      }
      let Some(redirect_uri) = state.redirect_uri() else {
          return internal(anyhow::anyhow!("no public_url"));
      };
      // The latest Connect's failure is cleared by the next authorize, and
      // each failure from here on is kept.
      if let Err(err) = runtime.store.set_oauth_error(&id, None, now) {
          return internal(err);
      }
      let fail = |status: StatusCode, code: &str, message: String| {
          if let Err(err) = runtime.store.set_oauth_error(&id, Some((code, &message)), now) {
              tracing::error!(connection_id = %id, error = %err, "gateway: a Connect's failure not recorded");
          }
          tracing::info!(connection_id = %id, code, "gateway: a Connect did not start");
          error(status, code, message)
      };
      let slots = match runtime.store.oauth_clients(&id, &runtime.key) {
          Ok(Some(slots)) => slots,
          Ok(None) => return not_found(),
          Err(err) => return internal(err),
      };
      if connection.cred_kind == CredKind::OauthClient && slots.active.is_none() {
          return fail(
              StatusCode::CONFLICT,
              "no_oauth_client",
              "enter the client registered at the vendor first (PUT …/oauth-client)".into(),
          );
      }
      if runtime.flows.live(&id, now) >= MAX_FLOWS {
          return fail(
              StatusCode::TOO_MANY_REQUESTS,
              "too_many_flows",
              format!("at most {MAX_FLOWS} Connects can be in flight"),
          );
      }
      let url = match Url::parse(&connection.url) {
          Ok(url) => url,
          Err(err) => return internal(err.into()),
      };
      let client = runtime.client(connection.internal_network);
      let discovered = match oauth::discover(&client, &url).await {
          Ok(discovered) => discovered,
          Err(DiscoveryError::Failed(why)) => return fail(StatusCode::BAD_GATEWAY, "discovery_failed", why),
          Err(DiscoveryError::Insecure(why)) => return fail(StatusCode::BAD_GATEWAY, "insecure_metadata", why),
          Err(DiscoveryError::Refused(why)) => return fail(StatusCode::BAD_GATEWAY, "egress_refused", why),
          Err(DiscoveryError::Unreachable(why)) => return fail(StatusCode::BAD_GATEWAY, "upstream_unreachable", why),
      };
      // The resource (gateway spec §4.1, G-4; api-8e-8f F3, R4).
      match &discovered.resource {
          Some(resource) => match resource_fit(resource, &url) {
              ResourceFit::Matches => {
                  if let Err(err) = runtime.store.set_resource_mismatch(&id, &connection.url, None) {
                      return internal(err);
                  }
              }
              ResourceFit::Foreign => {
                  return fail(
                      StatusCode::BAD_GATEWAY,
                      "resource_foreign",
                      format!(
                          "the protected-resource document of {} names a resource on another origin, or not https: it cannot be accepted",
                          url_for_logs(&connection.url)
                      ),
                  );
              }
              ResourceFit::Mismatch => {
                  let accepted = connection.accepted_resource.as_deref() == Some(resource.as_str());
                  if !accepted && req.accept_resource.as_deref() == Some(resource.as_str()) {
                      match runtime.store.accept_resource(&id, &connection.url, resource) {
                          Ok(true) => {}
                          Ok(false) => return not_found(),
                          Err(err) => return internal(err),
                      }
                  } else if !accepted {
                      if let Err(err) = runtime
                          .store
                          .set_resource_mismatch(&id, &connection.url, Some(resource))
                      {
                          return internal(err);
                      }
                      // A stale acceptance is a mismatch again, with the value
                      // found now (api-8e-8f F3): the frontend refetches on 409.
                      let message = if req.accept_resource.is_some() {
                          "the accepted resource is not the one found now: compare them again"
                      } else {
                          "the protected-resource document names another resource than the URL: accept it, or fix the URL"
                      };
                      return fail(StatusCode::CONFLICT, "resource_mismatch", message.into());
                  }
              }
          },
          None if req.accept_resource.is_some() => {
              return fail(
                  StatusCode::BAD_REQUEST,
                  "invalid",
                  "no protected-resource document names a resource to accept".into(),
              );
          }
          None => {}
      }
      if !discovered.s256 {
          return fail(
              StatusCode::BAD_GATEWAY,
              "pkce_unsupported",
              format!(
                  "the authorization server at {} does not advertise PKCE S256",
                  url_for_logs(&discovered.issuer)
              ),
          );
      }
      let token_endpoint = discovered.token_endpoint.as_str().to_string();
      let (source, token_client, registered_at) = match connection.cred_kind {
          CredKind::OauthClient => {
              let (slot, held) = match (&slots.pending, &slots.active) {
                  (Some(pending), _) => (Slot::Pending, pending),
                  (None, Some(active)) => (Slot::Active, active),
                  (None, None) => unreachable!("checked above"),
              };
              match &held.issuer {
                  Some(pinned) => {
                      if *pinned != discovered.issuer || held.token_endpoint.as_deref() != Some(token_endpoint.as_str()) {
                          return fail(
                              StatusCode::CONFLICT,
                              "issuer_changed",
                              format!(
                                  "the authorization server is now {}, not the one the client was first used with: enter the client again",
                                  url_for_logs(&discovered.issuer)
                              ),
                          );
                      }
                  }
                  // The first authorize with this client pins it (the
                  // review's R2).
                  None => {
                      if let Err(err) =
                          runtime
                              .store
                              .pin_client(&id, slot, &held.client_id, &discovered.issuer, &token_endpoint)
                      {
                          return internal(err);
                      }
                  }
              }
              let source = match slot {
                  Slot::Active => ClientSource::Active,
                  Slot::Pending => ClientSource::Pending,
              };
              (
                  source,
                  TokenClient {
                      client_id: held.client_id.clone(),
                      secret: held.secret.clone(),
                      auth_method: oauth::auth_method_for(held.secret.is_some(), &discovered.auth_methods),
                      token_endpoint: token_endpoint.clone(),
                  },
                  now,
              )
          }
          CredKind::OauthDcr => {
              let reusable = slots.active.as_ref().filter(|active| {
                  active.redirect_uri.as_deref() == Some(redirect_uri.as_str())
                      && active.token_endpoint.as_deref() == Some(token_endpoint.as_str())
                      && active.issuer.as_deref() == Some(discovered.issuer.as_str())
              });
              if let (Some(active), Some(method)) = (reusable, reusable.and_then(|a| a.auth_method)) {
                  (
                      ClientSource::Active,
                      TokenClient {
                          client_id: active.client_id.clone(),
                          secret: active.secret.clone(),
                          auth_method: method,
                          token_endpoint: token_endpoint.clone(),
                      },
                      now,
                  )
              } else if let Some(held) = runtime.flows.registration(&id, &token_endpoint, &redirect_uri) {
                  (ClientSource::Registered, held.client, held.registered_at)
              } else {
                  let Some(endpoint) = &discovered.registration_endpoint else {
                      return fail(
                          StatusCode::CONFLICT,
                          "no_registration_endpoint",
                          "the authorization server offers no dynamic registration: switch to a pre-registered client"
                              .into(),
                      );
                  };
                  match oauth::register(&client, endpoint, &redirect_uri, &discovered.scopes).await {
                      Ok(registered) => {
                          let token_client = TokenClient {
                              client_id: registered.client_id,
                              secret: registered.secret,
                              auth_method: registered.auth_method,
                              token_endpoint: token_endpoint.clone(),
                          };
                          runtime.flows.hold_registration(
                              &id,
                              Registration {
                                  client: token_client.clone(),
                                  redirect_uri: redirect_uri.clone(),
                                  registered_at: now,
                              },
                          );
                          (ClientSource::Registered, token_client, now)
                      }
                      Err(RegisterError::Refused(said)) => {
                          return fail(StatusCode::BAD_GATEWAY, "registration_refused", said);
                      }
                      Err(RegisterError::Invalid) => {
                          return fail(
                              StatusCode::BAD_GATEWAY,
                              "registration_refused",
                              "the registration's answer named no usable client".into(),
                          );
                      }
                      Err(RegisterError::EgressRefused(why)) => {
                          return fail(StatusCode::BAD_GATEWAY, "egress_refused", why);
                      }
                      Err(RegisterError::Unreachable) => {
                          return fail(
                              StatusCode::BAD_GATEWAY,
                              "upstream_unreachable",
                              format!(
                                  "the registration endpoint at {} could not be reached",
                                  url_for_logs(endpoint.as_str())
                              ),
                          );
                      }
                  }
              }
          }
          CredKind::None | CredKind::Static => unreachable!("checked above"),
      };
      let resource_param = !runtime.flows.resource_refused(&id, &connection.url);
      let verifier = oauth::verifier();
      let challenge = oauth::challenge_for(&verifier);
      let client_id = token_client.client_id.clone();
      let snapshot = Snapshot {
          connection_id: id.clone(),
          url: connection.url.clone(),
          cred_kind: connection.cred_kind,
          internal_network: connection.internal_network,
          source,
          client: token_client,
          issuer: discovered.issuer.clone(),
          authorization_endpoint: discovered.authorization_endpoint.as_str().to_string(),
          iss_parameter: discovered.iss_parameter,
          redirect_uri: redirect_uri.clone(),
          scopes: discovered.scopes.clone(),
          resource: connection.url.clone(),
          resource_param,
          verifier,
          registered_at,
          auth_session: session.session_id.clone(),
      };
      let Some(started) = runtime.flows.start(snapshot, now) else {
          return fail(
              StatusCode::TOO_MANY_REQUESTS,
              "too_many_flows",
              format!("at most {MAX_FLOWS} Connects can be in flight"),
          );
      };
      let consent = oauth::consent_url(
          &discovered.authorization_endpoint,
          &Consent {
              client_id: &client_id,
              redirect_uri: &redirect_uri,
              state: &started.state,
              challenge: &challenge,
              scopes: &discovered.scopes,
              resource: resource_param.then_some(connection.url.as_str()),
          },
      );
      // `consent` is `https` (or loopback `http`): it is the authorization
      // endpoint with a query added, whose scheme discovery checked.
      let secure = if state.secure_cookies() { "; Secure" } else { "" };
      let cookie = format!(
          "{}={}; HttpOnly; SameSite=Lax; Path={}; Max-Age={FLOW_TTL}{secure}",
          cookie_name(&started.state),
          started.cookie.as_str(),
          crate::api::CALLBACK_PATH,
      );
      tracing::info!(connection_id = %id, issuer = %url_for_logs(&discovered.issuer), "gateway: a Connect started");
      let mut response = Json(McpAuthorizeResponse {
          consent_url: consent.to_string(),
          expires_at: rfc3339(started.expires_at),
      })
      .into_response();
      match HeaderValue::from_str(&cookie) {
          Ok(value) => {
              response.headers_mut().append(header::SET_COOKIE, value);
              response
          }
          Err(err) => internal(err.into()),
      }
  }

  /// `{}`: a body is required, and nothing may be in it.
  #[derive(Debug, serde::Deserialize)]
  #[serde(deny_unknown_fields)]
  pub(crate) struct Empty {}

  /// `POST /api/mcp/connections/{id}/probe` (api-8e-8f B6, may change).
  pub(crate) async fn probe(
      State(state): State<GatewayState>,
      Path(id): Path<String>,
      ApiJson(Empty {}): ApiJson<Empty>,
  ) -> Response {
      let runtime = &state.runtime;
      let connection = match runtime.statuses.connection_by_id(&id) {
          Ok(Some(connection)) => connection,
          Ok(None) => return not_found(),
          Err(err) => return internal(err),
      };
      if connection.cred_kind != CredKind::None && !connection.has_credential {
          return error(
              StatusCode::CONFLICT,
              "no_credential",
              "the connection has no credential yet: set the token or Connect first",
          );
      }
      let verdict = probe::probe_now(runtime, &connection).await;
      tracing::info!(connection_id = %id, verdict = ?verdict, "gateway: a probe the operator asked for");
      match runtime.store.connection(&id) {
          Ok(Some(record)) => Json(item(record, &state.redirect_uri().unwrap_or_default())).into_response(),
          Ok(None) => not_found(),
          Err(err) => internal(err),
      }
  }

  #[cfg(test)]
  mod tests {
      use super::*;

      /// Gateway spec §4.1 (G-4) and api-8e-8f R4: every outcome of the fit.
      #[test]
      fn resource_fit_compares_origins_and_path_segments() {
          let url = Url::parse("https://mcp.vendor.example/v1/mcp?k=1").unwrap();
          for (resource, expected) in [
              ("https://mcp.vendor.example/v1/mcp", ResourceFit::Matches),
              ("https://mcp.vendor.example/v1/mcp/", ResourceFit::Matches),
              ("https://mcp.vendor.example/v1", ResourceFit::Matches),
              ("https://mcp.vendor.example", ResourceFit::Matches),
              ("https://mcp.vendor.example/v1/mc", ResourceFit::Mismatch),
              ("https://mcp.vendor.example/v2/mcp", ResourceFit::Mismatch),
              ("https://mcp.vendor.example/v1/mcp/deeper", ResourceFit::Mismatch),
              ("https://other.example/v1/mcp", ResourceFit::Foreign),
              ("https://mcp.vendor.example:8443/v1/mcp", ResourceFit::Foreign),
              ("http://mcp.vendor.example/v1/mcp", ResourceFit::Foreign),
              ("not a url", ResourceFit::Foreign),
          ] {
              assert_eq!(resource_fit(resource, &url), expected, "{resource}");
          }
          let long = format!("https://mcp.vendor.example/{}", "a".repeat(MAX_URL));
          assert_eq!(resource_fit(&long, &url), ResourceFit::Foreign);
          // Loopback `http` is the one plain `http` taken (the fakes).
          let local = Url::parse("http://127.0.0.1:8080/mcp").unwrap();
          assert_eq!(resource_fit("http://127.0.0.1:8080/mcp", &local), ResourceFit::Matches);
      }
  }
  ```

In `crates/hennery-gateway/tests/oauth_store.rs`, replace:

  ```rust
      }
      w.store.purge_hat(&work).unwrap();
      let count: i64 = w
  ```

with:

  ```rust
      }
      w.revocations.cut(w.store.purge_hat(&work).unwrap());
      let count: i64 = w
  ```

In `crates/hennery-gateway/tests/oauth_store.rs`, replace:

  ```rust
      w.store.purge_hat(&work).unwrap();
  ```

with:

  ```rust
      w.revocations.cut(w.store.purge_hat(&work).unwrap());
  ```

In `crates/hennery-kernel/src/capabilities.rs`, replace:

  ```rust
  /// served, and plan 8e's stdio servers (`/api/mcp/stdio-servers`).
  pub fn features() -> Vec<String> {
      vec!["mcp_connections".to_owned(), "mcp_stdio".to_owned()]
  ```

with:

  ```rust
  /// served, alongside stdio servers and plan 8f's OAuth (`…/authorize`, the callback, the
  /// pre-registered client, the probe).
  pub fn features() -> Vec<String> {
      vec!["mcp_connections".to_owned(), "mcp_stdio".to_owned(), "mcp_oauth".to_owned()]
  ```

In `crates/hennery-kernel/src/capabilities.rs`, replace:

  ```rust
              serde_json::json!({"mode": "full", "features": ["mcp_connections", "mcp_stdio"]})
  ```

with:

  ```rust
              serde_json::json!({"mode": "full", "features": ["mcp_connections", "mcp_stdio", "mcp_oauth"]})
  ```

- [ ] **Step 4: Run the checks**

   Run the five checks:

   ```sh
   nix develop -c cargo fmt --all --check
   nix develop -c cargo clippy --workspace --all-targets --locked -- -D warnings
   nix develop -c cargo clippy -p hennery --locked -- -D warnings
   nix develop -c cargo test --workspace --locked
   nix develop -c cargo run -p hennery-proto --bin gen --locked -- --check
   ```

   Phase B targeted tests: exit 0, 327 passed. See Execution status for the final full gate and task-specific supplementary checks.

- [ ] **Step 5: Commit**

   ```sh
   git add -A && git -c commit.gpgsign=false commit -m "feat(gateway): Connect an OAuth connection from the web UI: the client, authorize, the callback, probe now"
   ```

### Task 7: Apply the security review amendments

**Files:** Modify OAuth discovery, callback, authorize, refresh, schema and store; strengthen OAuth, differential, log and owner-audit tests; create `tests/oauth_expiry.rs` and `tests/oauth_challenge.rs`. Modify `src/session.rs` and add the merged hat-purge flow test.

- [ ] **Step 1: Write the failing tests**

In `crates/hennery-gateway/src/oauth.rs`, replace:

  ```rust
          assert!(!same_issuer("", "https://as.example"));
      }
  }
  ```

with:

  ```rust
          assert!(!same_issuer("", "https://as.example"));
      }
  }

  #[cfg(test)]
  mod deadline_tests {
      use super::*;
      /// Review note: one deadline covers the entire candidate sequence,
      /// rather than allowing each candidate another fifteen seconds.
      #[tokio::test]
      async fn discovery_has_one_deadline() {
          let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
          let resource = Url::parse(&format!("http://{}/mcp", listener.local_addr().unwrap())).unwrap();
          let server = tokio::spawn(async move {
              let (_socket, _) = listener.accept().await.unwrap();
              std::future::pending::<()>().await;
          });
          let egress = egress::Egress::new(egress::Timeouts {
              connect: Duration::from_secs(2),
              request: Duration::from_secs(10),
          })
          .unwrap();
          let client = egress.client(egress::Allowance::InternalNetwork);
          let result = tokio::time::timeout(
              Duration::from_secs(5),
              discover_with_deadline(&client, &resource, Duration::from_millis(30)),
          )
          .await;
          server.abort();
          assert!(matches!(result.unwrap(), Err(DiscoveryError::Unreachable(_))));
      }
  }
  ```

In `crates/hennery-gateway/tests/oauth.rs`, replace:

  ```rust
  use axum::http::{HeaderMap, Request, StatusCode, header};
  use hennery_gateway::api::{GatewayState, router};
  ```

with:

  ```rust
  use axum::http::{HeaderMap, Request, StatusCode, header};
  use axum::response::IntoResponse;
  use hennery_gateway::api::{GatewayState, router};
  ```

In `crates/hennery-gateway/tests/oauth.rs`, replace:

  ```rust
      assert_eq!(page.result(), "connection_changed");
      assert_eq!(h.item(&id).await["has_credential"], false);
  ```

with:

  ```rust
      assert_eq!(page.result(), "connection_changed");
      assert_eq!(fake.with(|r| r.exchanges), 0, "no code sent after an edit");
      assert_eq!(h.item(&id).await["has_credential"], false);
  ```

In `crates/hennery-gateway/tests/oauth.rs`, replace:

  ```rust
              r#"{{"issuer":"{o}","authorization_endpoint":"{o}/authorize","token_endpoint":"{o}/token","registration_endpoint":"{refused_at}","code_challenge_methods_supported":["S256"]}}"#
  ```

with:

  ```rust
              r#"{{"issuer":"{o}","authorization_endpoint":"{o}/authorize","token_endpoint":"{o}/token","registration_endpoint":"{refused_at}","code_challenge_methods_supported":["S256"],"authorization_response_iss_parameter_supported":true}}"#
  ```

In `crates/hennery-gateway/tests/oauth.rs`, replace:

  ```rust
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let port = fake.addr.port();
  ```

with:

  ```rust
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          iss_parameter: true,
          ..Config::default()
      })
      .await;
      let port = fake.addr.port();
  ```

In `crates/hennery-gateway/tests/oauth.rs`, replace:

  ```rust
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let closed = std::net::TcpListener::bind("127.0.0.1:0")
  ```

with:

  ```rust
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          iss_parameter: true,
          ..Config::default()
      })
      .await;
      let closed = std::net::TcpListener::bind("127.0.0.1:0")
  ```

In `crates/hennery-gateway/tests/oauth.rs`, replace:

  ```rust
      assert_eq!(callback.await.result(), "connected");
  }
  ```

with:

  ```rust
      assert_eq!(callback.await.result(), "connected");
  }

  /// F1: without RFC 9207, the three endpoints must have one origin.
  #[tokio::test]
  async fn endpoints_without_iss_share_one_origin() {
      for endpoint in ["authorization_endpoint", "token_endpoint", "registration_endpoint"] {
          for iss in [false, true] {
              let h = Harness::new();
              let fake = FakeAs::start(Config::default()).await;
              let o = fake.origin();
              let mut meta = json!({ "issuer": o, "authorization_endpoint": format!("{o}/authorize"),
                  "token_endpoint": format!("{o}/token"), "registration_endpoint": format!("{o}/register"),
                  "code_challenge_methods_supported": ["S256"],
                  "authorization_response_iss_parameter_supported": iss });
              meta[endpoint] = json!(format!("https://other.example/{endpoint}"));
              fake.configure(|c| c.raw_meta = Some(meta.to_string()));
              // A pre-registered client avoids actually calling a foreign registration endpoint.
              let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthClient);
              h.world
                  .store
                  .set_oauth_client(
                      &id,
                      "pre-1",
                      hennery_gateway::store::SecretInput::Clear,
                      &h.world.key,
                      unix_now(),
                  )
                  .unwrap();
              let (status, _, answer) = h.authorize(&id, json!({})).await;
              assert_eq!(
                  status,
                  if iss { StatusCode::OK } else { StatusCode::BAD_GATEWAY },
                  "{endpoint}, iss={iss}: {answer}"
              );
              if !iss {
                  assert_eq!(answer["code"], "discovery_failed");
              }
          }
      }
  }

  /// F2: check every part of the generation before sending the code, even if
  /// the edit bypassed flow invalidation (the purge hook cannot hold this lock).
  #[tokio::test]
  async fn a_changed_connection_never_exchanges_its_code() {
      for change in ["deleted", "kind", "allowance", "client", "pending", "secret"] {
          let h = Harness::new();
          let fake = FakeAs::start(Config {
              registration: false,
              ..Config::default()
          })
          .await;
          let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthClient);
          h.world
              .store
              .set_oauth_client(
                  &id,
                  "pre-1",
                  hennery_gateway::store::SecretInput::Clear,
                  &h.world.key,
                  unix_now(),
              )
              .unwrap();
          let (_, headers, answer) = h.authorize(&id, json!({})).await;
          let location = fake.consent(answer["consent_url"].as_str().unwrap()).await;
          match change {
              "deleted" => {
                  h.world.store.delete(&id).unwrap();
              }
              "kind" => {
                  h.world
                      .raw()
                      .execute("UPDATE gw_connections SET cred_kind = 'static' WHERE id = ?1", [&id])
                      .unwrap();
              }
              "allowance" => {
                  h.world
                      .raw()
                      .execute("UPDATE gw_connections SET internal_network = 0 WHERE id = ?1", [&id])
                      .unwrap();
              }
              "client" => {
                  h.world
                      .raw()
                      .execute(
                          "UPDATE gw_oauth_clients SET client_id = 'pre-other' WHERE connection_id = ?1",
                          [&id],
                      )
                      .unwrap();
              }
              "pending" => {
                  h.world
                      .raw()
                      .execute(
                          "UPDATE gw_oauth_clients SET pending_client_id = 'pre-other' WHERE connection_id = ?1",
                          [&id],
                      )
                      .unwrap();
              }
              "secret" => {
                  h.world
                      .store
                      .set_oauth_client(
                          &id,
                          "pre-1",
                          hennery_gateway::store::SecretInput::Set(zeroize::Zeroizing::new("replacement-secret".into())),
                          &h.world.key,
                          unix_now(),
                      )
                      .unwrap();
              }
              _ => unreachable!(),
          }
          let page = h.callback(&location, Some(&flow_cookie(&headers)), &[]).await;
          assert_eq!(page.result(), "connection_changed", "{change}");
          assert_eq!(fake.with(|r| r.exchanges), 0, "{change}: no exchange");
      }
  }

  /// F3: discovery may race another authorize's successful issuer pin.
  #[tokio::test]
  async fn a_lost_client_pin_is_reread_before_consent() {
      use hennery_gateway::store::{SecretInput, Slot};
      for slot in [Slot::Active, Slot::Pending] {
          for winner in ["same", "issuer", "endpoint", "client", "secret", "missing"] {
              let h = Harness::new();
              let server = support::upstream::FakeUpstream::start().await;
              let o = server.url("");
              let id = h.connection("linear", &server.url("/mcp"), CredKind::OauthClient);
              h.world
                  .store
                  .set_oauth_client(&id, "pre-1", SecretInput::Clear, &h.world.key, unix_now())
                  .unwrap();
              if matches!(slot, Slot::Pending) {
                  let fake = FakeAs::start(Config::default()).await;
                  let (a, r) = fake.issue();
                  support::oauth::seed_grant(&h.world, &id, &fake, &a, Some(&r), None);
                  h.world
                      .store
                      .set_oauth_client(&id, "pre-1", SecretInput::Clear, &h.world.key, unix_now())
                      .unwrap();
              }
              let store = h.world.store.clone();
              let pin_id = id.clone();
              let key = h.world.key.clone();
              let db = h.world.db.clone();
              server.reply(move |seen, _| {
                  if seen.uri.contains("oauth-authorization-server") {
                      let pinned = if winner == "issuer" {
                          "https://other.example".to_string()
                      } else {
                          o.clone()
                      };
                      let endpoint = if winner == "endpoint" {
                          format!("{o}/other-token")
                      } else {
                          format!("{o}/token")
                      };
                      assert!(store.pin_client(&pin_id, slot, "pre-1", &pinned, &endpoint).unwrap());
                      let conn = rusqlite::Connection::open(&db).unwrap();
                      match winner {
                          "client" => {
                              let column = if slot == Slot::Active {
                                  "client_id"
                              } else {
                                  "pending_client_id"
                              };
                              conn.execute(
                                  &format!("UPDATE gw_oauth_clients SET {column} = 'pre-other' WHERE connection_id = ?1"),
                                  [&pin_id],
                              )
                              .unwrap();
                          }
                          "secret" => {
                              let (column, field) = if slot == Slot::Active {
                                  ("client_secret_ciphertext", hennery_gateway::crypto::CLIENT_SECRET)
                              } else {
                                  (
                                      "pending_secret_ciphertext",
                                      hennery_gateway::crypto::PENDING_CLIENT_SECRET,
                                  )
                              };
                              let sealed = hennery_gateway::crypto::seal(&key, &pin_id, field, b"new-secret");
                              conn.execute(
                                  &format!("UPDATE gw_oauth_clients SET {column} = ?2 WHERE connection_id = ?1"),
                                  rusqlite::params![pin_id, sealed],
                              )
                              .unwrap();
                          }
                          "missing" => {
                              conn.execute("DELETE FROM gw_oauth_clients WHERE connection_id = ?1", [&pin_id])
                                  .unwrap();
                          }
                          _ => {}
                      }
                      support::upstream::json(
                          StatusCode::OK,
                          &json!({ "issuer": o,
                          "authorization_endpoint": format!("{o}/authorize"), "token_endpoint": format!("{o}/token"),
                          "code_challenge_methods_supported": ["S256"] }),
                      )
                  } else {
                      StatusCode::NOT_FOUND.into_response()
                  }
              });
              let (status, _, answer) = h.authorize(&id, json!({})).await;
              assert_eq!(
                  status,
                  if winner == "same" {
                      StatusCode::OK
                  } else {
                      StatusCode::CONFLICT
                  },
                  "{answer}"
              );
              if winner != "same" {
                  assert_eq!(answer["code"], "issuer_changed");
              }
          }
      }
  }

  /// Cheap review note: after the pre-exchange check, a same-ID secret edit
  /// still must not be overwritten when the exchange finally finishes.
  #[tokio::test]
  async fn a_secret_changed_during_exchange_is_not_overwritten() {
      let h = Harness::new();
      let fake = FakeAs::start(Config {
          gate_token: true,
          ..Config::default()
      })
      .await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthClient);
      h.world
          .store
          .set_oauth_client(
              &id,
              "pre-1",
              hennery_gateway::store::SecretInput::Clear,
              &h.world.key,
              unix_now(),
          )
          .unwrap();
      let (_, headers, answer) = h.authorize(&id, json!({})).await;
      let location = fake.consent(answer["consent_url"].as_str().unwrap()).await;
      let cookie = flow_cookie(&headers);
      let change = async {
          tokio::time::timeout(Duration::from_secs(10), async {
              while !fake.paths().iter().any(|p| p == "/token") {
                  tokio::task::yield_now().await;
              }
          })
          .await
          .unwrap();
          h.world
              .store
              .set_oauth_client(
                  &id,
                  "pre-1",
                  hennery_gateway::store::SecretInput::Set(zeroize::Zeroizing::new("replacement-secret".into())),
                  &h.world.key,
                  unix_now(),
              )
              .unwrap();
          fake.open_gate();
      };
      let (page, _) = tokio::join!(h.callback(&location, Some(&cookie), &[]), change);
      assert_eq!(page.result(), "connection_changed");
      assert_eq!(
          h.world
              .store
              .oauth_clients(&id, &h.world.key)
              .unwrap()
              .unwrap()
              .active
              .unwrap()
              .secret
              .as_deref()
              .map(String::as_str),
          Some("replacement-secret")
      );
  }

  #[tokio::test]
  async fn an_unreadable_connection_before_exchange_sends_nothing() {
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthClient);
      h.world
          .store
          .set_oauth_client(
              &id,
              "pre-1",
              hennery_gateway::store::SecretInput::Clear,
              &h.world.key,
              unix_now(),
          )
          .unwrap();
      let (_, headers, answer) = h.authorize(&id, json!({})).await;
      let location = fake.consent(answer["consent_url"].as_str().unwrap()).await;
      h.world.raw().execute("DROP TABLE gw_oauth_clients", []).unwrap();
      let page = h.callback(&location, Some(&flow_cookie(&headers)), &[]).await;
      assert_eq!(
          (page.status, page.result()),
          (StatusCode::INTERNAL_SERVER_ERROR, "internal".into())
      );
      assert_eq!(fake.with(|r| r.exchanges), 0);
  }

  /// F2 on the merged 8e hook: purge drops only that hat's pending flows.
  #[tokio::test]
  async fn a_hat_purge_drops_its_oauth_flows() {
      use hennery_gateway::session::{GatewayMcp, SessionMcp};
      let h = Harness::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = h.connection("linear", &fake.mcp_url(), CredKind::OauthDcr);
      let other_hat = h.world.other_hat();
      let mut new = h.world.new_connection("other", &other_hat);
      new.url = fake.mcp_url();
      new.cred_kind = CredKind::OauthDcr;
      new.internal_network = true;
      new.hat_id = other_hat;
      let other = h.world.connection_with(new);
      assert_eq!(h.authorize(&id, json!({})).await.0, StatusCode::OK);
      assert_eq!(h.authorize(&other, json!({})).await.0, StatusCode::OK);
      assert_eq!(h.runtime.flows.live("", unix_now()), 2);
      let gateway = GatewayState {
          runtime: h.runtime.clone(),
          operator: h.operator.clone(),
      };
      GatewayMcp::new(&gateway).purge_hat(&h.world.hat()).unwrap();
      assert_eq!(h.runtime.flows.live("", unix_now()), 1);
      assert!(h.world.store.connection(&id).unwrap().is_none());
      assert!(h.world.store.connection(&other).unwrap().is_some());
  }
  ```

Create `crates/hennery-gateway/tests/oauth_challenge.rs`:

  ```rust
  //! L16: quoted auth-param text cannot name a discovery URL. Compare raw,
  //! quoted and escaped spellings; duplicate first/last readers get neither.
  use hennery_gateway::oauth::challenge_metadata;
  use hennery_kernel::egress::header::{HeaderMap, HeaderValue, WWW_AUTHENTICATE};
  #[test]
  fn challenge_parameters_respect_quotes_and_have_one_reading() {
      for (raw, expected) in [
          (
              r#"Bearer resource_metadata="https://as.example/pr""#,
              Some("https://as.example/pr"),
          ),
          (
              r#"Bearer RESOURCE_METADATA=https://as.example/pr"#,
              Some("https://as.example/pr"),
          ),
          (r#"Bearer realm="x resource_metadata=https://evil.example/pr""#, None),
          (
              r#"Bearer realm="x, resource_metadata=https://evil.example/pr", resource_metadata="https://as.example/pr""#,
              Some("https://as.example/pr"),
          ),
          (
              r#"Bearer realm="x \" resource_metadata=https://evil.example/pr", resource_metadata="https://as.example/pr""#,
              Some("https://as.example/pr"),
          ),
          (
              r#"Bearer resource_metadata="https://as.example/a,b""#,
              Some("https://as.example/a,b"),
          ),
          (
              r#"Bearer resource_metadata="https://as.example/pr", resource_metadata="https://evil.example/pr""#,
              None,
          ),
          (
              r#"Bearer resource_metadata="https://evil.example/pr", RESOURCE_METADATA="https://as.example/pr""#,
              None,
          ),
          ("Bearer resource_metadata=\"https://as.exa\tmple/pr\"", None),
          (r#"Bearer resource_metadata="https://as.example/pr"junk"#, None),
      ] {
          let mut headers = HeaderMap::new();
          headers.insert(WWW_AUTHENTICATE, HeaderValue::from_str(raw).unwrap());
          assert_eq!(challenge_metadata(&headers).as_deref(), expected, "{raw}");
      }
      let mut headers = HeaderMap::new();
      headers.append(
          WWW_AUTHENTICATE,
          HeaderValue::from_static("Bearer resource_metadata=https://first.example/pr"),
      );
      headers.append(
          WWW_AUTHENTICATE,
          HeaderValue::from_static("Bearer resource_metadata=https://last.example/pr"),
      );
      assert_eq!(
          challenge_metadata(&headers),
          None,
          "first and last header readers disagree"
      );
  }
  ```

In `crates/hennery-gateway/tests/oauth_differential.rs`, replace:

  ```rust
      "code_challenge_methods_supported",
  ];
  ```

with:

  ```rust
      "code_challenge_methods_supported",
      "authorization_response_iss_parameter_supported",
  ];
  ```

In `crates/hennery-gateway/tests/oauth_differential.rs`, replace:

  ```rust
              base.replace("[\"S256\"]", "[\"S256\\u0000x\"]")
                  .pipe(|b| format!("{{{b}}}")),
          ),
          ("a byte-order mark", Expect::Refused, format!("\u{feff}{{{base}}}")),
  ```

with:

  ```rust
              base.replace("[\"S256\"]", "[\"S256\\u0000x\"]")
                  .pipe(|b| format!("{{{b}}}")),
          ),
          (
              "iss twice",
              Expect::Refused,
              doc(
                  r#", "authorization_response_iss_parameter_supported":true, "authorization_response_iss_parameter_supported":false"#,
              ),
          ),
          (
              "iss escaped twice",
              Expect::Refused,
              doc(
                  r#", "authorization_response_iss_parameter_supported":true, "\u0061uthorization_response_iss_parameter_supported":false"#,
              ),
          ),
          (
              "iss case",
              Expect::Refused,
              doc(r#", "Authorization_Response_Iss_Parameter_Supported":true"#),
          ),
          (
              "iss folded",
              Expect::Refused,
              doc(r#", "authorizationresponseissparametersupported":true"#),
          ),
          (
              "url tab",
              Expect::Refused,
              format!("{{{}}}", base.replace("{o}/token", "https://as.exa\\tmple/token")),
          ),
          ("a byte-order mark", Expect::Refused, format!("\u{feff}{{{base}}}")),
  ```

In `crates/hennery-gateway/tests/oauth_differential.rs`, replace:

  ```rust
              r#"{{"issuer":"{o}","authorization_endpoint":"{o}/authorize","token_endpoint":"{o}/token","registration_endpoint":"{}","code_challenge_methods_supported":["S256"]}}"#,
  ```

with:

  ```rust
              r#"{{"issuer":"{o}","authorization_endpoint":"{o}/authorize","token_endpoint":"{o}/token","registration_endpoint":"{}","code_challenge_methods_supported":["S256"],"authorization_response_iss_parameter_supported":true}}"#,
  ```

In `crates/hennery-gateway/tests/oauth_differential.rs`, replace:

  ```rust
          failures.push(format!("the real redirect: {result}"));
      }
      assert!(failures.is_empty(), "{failures:#?}");
  }
  ```

with:

  ```rust
          failures.push(format!("the real redirect: {result}"));
      }
      assert!(failures.is_empty(), "{failures:#?}");
  }

  #[tokio::test]
  async fn vendor_lifetimes_have_one_bounded_interpretation() {
      const YEAR: i64 = 365 * 24 * 60 * 60;
      for lifetime in [
          "9223372036854775807",
          "18446744073709551615",
          r#""99999999999999999999999999999999999""#,
          r#""000000000000000000003600""#,
      ] {
          let h = Harness::new();
          let raw = format!(r#"{{"access_token":"good-1","expires_in":{lifetime}}}"#);
          let fake = FakeAs::start(Config {
              raw_token: Some(raw),
              ..Config::default()
          })
          .await;
          let id = h.connection(&fake.mcp_url());
          let (_, headers, answer) = h.authorize(&id).await;
          let location = fake.consent(answer["consent_url"].as_str().unwrap()).await;
          let before = unix_now();
          assert_eq!(
              h.callback(location.strip_prefix(ORIGIN).unwrap(), &flow_cookie(&headers))
                  .await,
              "connected"
          );
          let expiry = h
              .world
              .store
              .oauth_credential(&id, &h.world.key)
              .unwrap()
              .unwrap()
              .expires_at
              .expect("known lifetime");
          let seconds = if lifetime.contains("3600") { 3600 } else { YEAR };
          assert!((before + seconds - 60..=unix_now() + seconds - 60).contains(&expiry));
      }
  }
  ```

Create `crates/hennery-gateway/tests/oauth_expiry.rs`:

  ```rust
  //! F5: vendor lifetimes cannot overflow persistence or the refresh deadline.
  use hennery_gateway::{oauth, refresh};
  #[test]
  fn expiry_is_capped_and_saturates() {
      const YEAR: i64 = 365 * 24 * 60 * 60;
      assert_eq!(oauth::expires_at(1000, Some(i64::MAX)), Some(1000 + YEAR - 60));
      assert_eq!(oauth::expires_at(i64::MAX - 1, Some(3600)), Some(i64::MAX));
      assert_eq!(oauth::expires_at(i64::MIN, Some(i64::MIN)), Some(i64::MIN));
      assert_eq!(oauth::expires_at(1000, Some(0)), Some(1000));
      assert_eq!(oauth::expires_at(1000, None), None);
  }
  #[test]
  fn refresh_due_handles_extreme_stamps() {
      assert!(!refresh::due(Some(i64::MAX), i64::MIN));
      assert!(refresh::due(Some(i64::MIN), i64::MAX));
      assert!(refresh::due(Some(i64::MAX), i64::MAX - 300));
      assert!(!refresh::due(Some(i64::MAX), i64::MAX - 301));
      assert!(!refresh::due(None, i64::MAX));
  }
  ```

In `crates/hennery-gateway/tests/oauth_log.rs`, replace:

  ```rust
  const BODY_CANARY: &str = "bodycanary2a3b4c5d";
  const TOKEN_PREFIX: &str = "tokcanary6e7f8a9b-";
  ```

with:

  ```rust
  const BODY_CANARY: &str = "bodycanary2a3b4c5d";
  const VENDOR_CANARY: &str = "vendorcanary-failure";
  const TOKEN_PREFIX: &str = "tokcanary6e7f8a9b-";
  ```

In `crates/hennery-gateway/tests/oauth_log.rs`, replace:

  ```rust
      answers.borrow_mut().push_str(&String::from_utf8_lossy(&bytes));
      // Refused authorizes, each naming the URL in its own way.
  ```

with:

  ```rust
      answers.borrow_mut().push_str(&String::from_utf8_lossy(&bytes));

      // F6: exercise each callback failure, asserting its verdict so a dead
      // branch cannot make the hygiene assertion pass.
      let start = async || {
          let (headers, text) = call(
              "POST",
              &format!("/api/mcp/connections/{id}/authorize"),
              Some(json!({})),
              None,
          )
          .await;
          let answer: Value = serde_json::from_str(&text).unwrap();
          let consent = answer["consent_url"].as_str().expect("authorize succeeded").to_string();
          let flow = headers
              .split("set-cookie\": \"")
              .nth(1)
              .unwrap()
              .split(';')
              .next()
              .unwrap()
              .to_string();
          (fake.consent(&consent).await, flow)
      };
      fake.configure(|c| c.deny = Some(VENDOR_CANARY.into()));
      let (location, flow) = start().await;
      let (_, page) = call("GET", location.strip_prefix(ORIGIN).unwrap(), None, Some(flow)).await;
      assert!(page.contains("data-result=\"consent_denied\""));
      assert!(
          page.contains(VENDOR_CANARY),
          "vendor provenance is shown as escaped text"
      );
      fake.configure(|c| c.deny = None);
      let (location, flow) = start().await;
      let mut location = url::Url::parse(&location).unwrap();
      let pairs: Vec<_> = location
          .query_pairs()
          .map(|(k, v)| {
              let value = if k == "code" {
                  format!("{TOKEN_PREFIX}unknown")
              } else {
                  v.into_owned()
              };
              (k.into_owned(), value)
          })
          .collect();
      location.set_query(None);
      location.query_pairs_mut().extend_pairs(pairs);
      let (_, page) = call("GET", location.as_str().strip_prefix(ORIGIN).unwrap(), None, Some(flow)).await;
      assert!(page.contains("data-result=\"exchange_failed\""));
      assert!(!page.contains(BODY_CANARY));
      // With iss advertised, split endpoints are allowed, but the exchange
      // still uses egress. Userinfo is refused under every allowance.
      fake.configure(|c| {
          c.iss_parameter = true;
          c.token_endpoint = Some(format!(
              "https://u:p@127.0.0.1:{}/{PATH_CANARY}?q={QUERY_CANARY}",
              fake.addr.port()
          ));
      });
      world
          .store
          .set_oauth_client(
              &id,
              "pre-1",
              hennery_gateway::store::SecretInput::Set(zeroize::Zeroizing::new(SECRET_CANARY.into())),
              &world.key,
              unix_now(),
          )
          .unwrap();
      let (location, flow) = start().await;
      let (_, page) = call("GET", location.strip_prefix(ORIGIN).unwrap(), None, Some(flow)).await;
      assert!(page.contains("data-result=\"egress_refused\""));
      fake.configure(|c| {
          c.iss_parameter = false;
          c.token_endpoint = None;
      });
      // A DCR refusal's cleaned vendor message is intentionally displayed,
      // while its raw body and secrets stay out of traces.
      let dcr = world.connection("dcr", &url, CredKind::OauthDcr);
      fake.configure(|c| { c.registration = true; c.dcr_refusal = Some((400, json!({ "error": "invalid_client_metadata", "error_description": VENDOR_CANARY, "client_secret": SECRET_CANARY }))); });
      let (_, text) = call(
          "POST",
          &format!("/api/mcp/connections/{dcr}/authorize"),
          Some(json!({})),
          None,
      )
      .await;
      let failure: Value = serde_json::from_str(&text).unwrap();
      assert_eq!(failure["code"], "registration_refused");
      fake.configure(|c| {
          c.registration = false;
          c.dcr_refusal = None;
          c.mcp_status = Some(503);
      });
      let (fresh_access, fresh_refresh) = fake.issue();
      support::oauth::seed_grant(&world, &id, &fake, &fresh_access, Some(&fresh_refresh), None);
      let (_, text) = call(
          "POST",
          &format!("/api/mcp/connections/{id}/probe"),
          Some(json!({})),
          None,
      )
      .await;
      assert_eq!(serde_json::from_str::<Value>(&text).unwrap()["status"], "error");

      // Refused authorizes, each naming the URL in its own way.
  ```

In `crates/hennery-gateway/tests/oauth_log.rs`, replace:

  ```rust
      let mut canaries = vec![
          PATH_CANARY.to_string(),
  ```

with:

  ```rust
      let mut canaries = vec![
          VENDOR_CANARY.to_string(),
          PATH_CANARY.to_string(),
  ```

In `crates/hennery-gateway/tests/oauth_log.rs`, replace:

  ```rust
      assert!(fake.with(|r| r.verifiers.len()) == 1);
  ```

with:

  ```rust
      assert!(!fake.with(|r| r.verifiers.is_empty()));
  ```

In `crates/hennery-gateway/tests/oauth_store.rs`, replace:

  ```rust
          "SELECT key_version, pending_secret_ciphertext FROM gw_oauth_clients WHERE connection_id = ?1",
  ```

with:

  ```rust
          "SELECT pending_key_version, pending_secret_ciphertext FROM gw_oauth_clients WHERE connection_id = ?1",
  ```

In `crates/hennery-gateway/tests/oauth_store.rs`, replace:

  ```rust
      let columns = || -> (Option<i64>, Option<String>, Option<String>) {
          w.raw()
              .query_row(
                  "SELECT c.oauth_error_at, o.pending_issuer, o.pending_token_endpoint
                   FROM gw_connections c JOIN gw_oauth_clients o ON o.connection_id = c.id WHERE c.id = ?1",
                  [&id],
                  |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
  ```

with:

  ```rust
      type Columns = (Option<i64>, Option<String>, Option<String>, Option<u32>, Option<i64>);
      let columns = || -> Columns {
          w.raw()
              .query_row(
                  "SELECT c.oauth_error_at, o.pending_issuer, o.pending_token_endpoint, o.pending_key_version, o.pending_updated_at
                   FROM gw_connections c JOIN gw_oauth_clients o ON o.connection_id = c.id WHERE c.id = ?1",
                  [&id],
                  |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
  ```

In `crates/hennery-gateway/tests/oauth_store.rs`, replace:

  ```rust
      assert!(columns().0.is_some());
      // The pending client's Connect completes.
  ```

with:

  ```rust
      assert!(columns().0.is_some());
      assert!(columns().3.is_some());
      assert!(columns().4.is_some());
      // The pending client's Connect completes.
  ```

In `crates/hennery-gateway/tests/oauth_store.rs`, replace:

  ```rust
      assert_eq!(columns(), (None, None, None));
  ```

with:

  ```rust
      assert_eq!(columns(), (None, None, None, None, None));
  ```

In `crates/hennery-gateway/tests/oauth_store.rs`, replace:

  ```rust
                   pending_secret_ciphertext = x'0102', key_version = 1 WHERE connection_id = ?1",
  ```

with:

  ```rust
                   pending_secret_ciphertext = x'0102', pending_key_version = 1 WHERE connection_id = ?1",
  ```

In `crates/hennery-gateway/tests/oauth_store.rs`, replace:

  ```rust
      assert_eq!(checked(), Some(460));
  }
  ```

with:

  ```rust
      assert_eq!(checked(), Some(460));
  }

  /// F4: a pending PUT has its own key version; it never relabels the active blob.
  #[tokio::test]
  async fn a_pending_secret_has_its_own_key_version() {
      let w = World::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = w.connection("linear", &fake.mcp_url(), CredKind::OauthClient);
      let (a, r) = fake.issue();
      seed_grant(&w, &id, &fake, &a, Some(&r), None);
      w.raw()
          .execute(
              "UPDATE gw_oauth_clients SET key_version = 73 WHERE connection_id = ?1",
              [&id],
          )
          .unwrap();
      w.store
          .set_oauth_client(
              &id,
              "pre-new",
              SecretInput::Set(Zeroizing::new("pending-secret".into())),
              &w.key,
              500,
          )
          .unwrap();
      let active: u32 = w
          .raw()
          .query_row(
              "SELECT key_version FROM gw_oauth_clients WHERE connection_id = ?1",
              [&id],
              |r| r.get(0),
          )
          .unwrap();
      assert_eq!(active, 73);
      let (version, sealed) = blob(
          &w,
          "SELECT pending_key_version, pending_secret_ciphertext FROM gw_oauth_clients WHERE connection_id = ?1",
          &id,
      );
      assert_eq!(version, w.key.version());
      assert_eq!(
          &*crypto::open(&w.key, &id, PENDING_CLIENT_SECRET, version, &sealed).unwrap(),
          b"pending-secret"
      );
      let slots = w.store.oauth_clients(&id, &w.key).unwrap().unwrap();
      assert_eq!(
          slots.pending.unwrap().secret.as_deref().map(String::as_str),
          Some("pending-secret")
      );
      w.store
          .set_oauth_client(&id, "pre-new", SecretInput::Keep, &w.key, 600)
          .unwrap();
  }

  /// F4: a public active client + a live grant can still hold a damaged pending
  /// secret; checking the grant alone must not let the collector start.
  #[tokio::test]
  async fn the_key_check_opens_the_newest_pending_secret() {
      let w = World::new();
      let fake = FakeAs::start(Config::default()).await;
      for (slug, at) in [("first", 500), ("newest", 600)] {
          let id = w.connection(slug, &fake.mcp_url(), CredKind::OauthClient);
          let (a, r) = fake.issue();
          seed_grant(&w, &id, &fake, &a, Some(&r), None);
          w.store
              .set_oauth_client(
                  &id,
                  "pre-new",
                  SecretInput::Set(Zeroizing::new("pending-secret".into())),
                  &w.key,
                  at,
              )
              .unwrap();
          w.store.check_key(&w.key).unwrap();
          w.raw()
              .execute(
                  "UPDATE gw_oauth_clients SET pending_secret_ciphertext = x'00' WHERE connection_id = ?1",
                  [&id],
              )
              .unwrap();
          if slug == "newest" {
              assert!(w.store.check_key(&w.key).is_err());
          }
      }
  }

  /// Removing a grant does not make a pending client's old version/timestamp
  /// survive the next client PUT (the no-grant upsert).
  #[tokio::test]
  async fn a_client_put_without_a_grant_clears_pending_key_columns() {
      let w = World::new();
      let fake = FakeAs::start(Config::default()).await;
      let id = w.connection("linear", &fake.mcp_url(), CredKind::OauthClient);
      let (a, r) = fake.issue();
      seed_grant(&w, &id, &fake, &a, Some(&r), None);
      w.store
          .set_oauth_client(&id, "pre-new", SecretInput::Clear, &w.key, 500)
          .unwrap();
      let columns = || -> (Option<u32>, Option<i64>) {
          w.raw()
              .query_row(
                  "SELECT pending_key_version, pending_updated_at FROM gw_oauth_clients WHERE connection_id = ?1",
                  [&id],
                  |r| Ok((r.get(0)?, r.get(1)?)),
              )
              .unwrap()
      };
      assert_eq!(columns(), (Some(w.key.version()), Some(500)));
      w.raw()
          .execute("DELETE FROM gw_credentials WHERE connection_id = ?1", [&id])
          .unwrap();
      w.store
          .set_oauth_client(&id, "pre-new", SecretInput::Clear, &w.key, 600)
          .unwrap();
      assert_eq!(columns(), (None, None));
  }
  ```

In `crates/hennery-kernel/src/capabilities.rs`, replace:

  ```rust
      vec!["mcp_connections".to_owned(), "mcp_stdio".to_owned(), "mcp_oauth".to_owned()]
  ```

with:

  ```rust
      vec![
          "mcp_connections".to_owned(),
          "mcp_stdio".to_owned(),
          "mcp_oauth".to_owned(),
      ]
  ```

In `crates/hennery-testkit/tests/owner_filter.rs`, replace:

  ```rust
  const GATEWAY_STATEMENTS: usize = 46;
  ```

with:

  ```rust
  const GATEWAY_STATEMENTS: usize = 48;
  ```

- [ ] **Step 2: Run them and see them fail, then commit them**

   ```sh
   nix develop -c cargo test -p hennery-gateway --locked --test oauth --test oauth_store --test oauth_expiry --test oauth_challenge --test oauth_differential --no-fail-fast
   nix develop -c cargo test -p hennery-gateway --locked --lib discovery_has_one_deadline
   ```

   Targeted tests exit 101 for the amendments and the merged purge-flow hook. The deadline unit test separately fails to compile before its helper exists; exact counts are in Execution status.

   ```sh
   git add -A && git -c commit.gpgsign=false commit -m "test(gateway): pin OAuth security review amendments and failure canaries"
   ```

- [ ] **Step 3: Implement**

In `crates/hennery-gateway/src/callback.rs`, replace:

  ```rust
      };
      // 7. The exchange: the verifier and `resource` as recorded; the token
  ```

with:

  ```rust
      };
      // Security review F2: refuse a stale snapshot before disclosing its
      // code or secret. A purge cannot take the refresh lock; persistence
      // still re-checks in its transaction after the exchange.
      match runtime.store.flow_matches(snapshot, &runtime.key) {
          Ok(true) => {}
          Ok(false) => {
              return Outcome::failed(
                  StatusCode::BAD_REQUEST,
                  "connection_changed",
                  "The connection was changed while this sign-in ran. Start it again.",
              );
          }
          Err(err) => {
              tracing::error!(connection_id = %snapshot.connection_id, error = %err, "gateway: the flow's connection not read");
              return Outcome::failed(
                  StatusCode::INTERNAL_SERVER_ERROR,
                  "internal",
                  "Something went wrong in hennery.",
              );
          }
      }
      // 7. The exchange: the verifier and `resource` as recorded; the token
  ```

In `crates/hennery-gateway/src/oauth.rs`, replace:

  ```rust

  /// The most authorization servers of one PR document tried.
  ```

with:

  ```rust

  /// One bound for the complete discovery sequence, including its bodies.
  pub const DISCOVERY_TIMEOUT: Duration = Duration::from_secs(60);

  /// The most authorization servers of one PR document tried.
  ```

In `crates/hennery-gateway/src/oauth.rs`, replace:

  ```rust
  pub const EXPIRY_MARGIN: i64 = 60;

  ```

with:

  ```rust
  pub const EXPIRY_MARGIN: i64 = 60;

  /// Vendor lifetimes are bounded to one year (security review F5).
  pub const MAX_EXPIRES_IN: i64 = 365 * 24 * 60 * 60;

  ```

In `crates/hennery-gateway/src/oauth.rs`, replace:

  ```rust
      headers
          .get_all(header::WWW_AUTHENTICATE)
          .iter()
          .filter_map(|value| value.to_str().ok())
          .find_map(param_resource_metadata)
  }

  fn param_resource_metadata(challenge: &str) -> Option<String> {
      let lower = challenge.to_ascii_lowercase();
      let mut from = 0;
      while let Some(found) = lower[from..].find("resource_metadata") {
          let start = from + found;
          from = start + "resource_metadata".len();
          // A parameter's name starts the challenge's parameters or follows a
          // space or comma.
          let boundary = start == 0 || matches!(lower.as_bytes()[start - 1], b' ' | b',' | b'\t');
          let rest = challenge[from..].trim_start();
          let Some(rest) = rest.strip_prefix('=') else {
              continue;
          };
          if !boundary {
              continue;
          }
          let rest = rest.trim_start();
          if let Some(quoted) = rest.strip_prefix('"') {
              let mut value = String::new();
              let mut chars = quoted.chars();
              while let Some(c) = chars.next() {
                  match c {
                      '\\' => value.push(chars.next()?),
                      '"' => return Some(value),
                      c => value.push(c),
                  }
              }
              return None;
          }
          let value: String = rest.chars().take_while(|c| !matches!(c, ',' | ' ' | '\t')).collect();
          return (!value.is_empty()).then_some(value);
      }
      None
  ```

with:

  ```rust
      let challenges: Vec<_> = headers
          .get_all(header::WWW_AUTHENTICATE)
          .iter()
          .map(|value| value.to_str())
          .collect::<Result<_, _>>()
          .ok()?;
      param_resource_metadata(&challenges.join(","))
  }

  fn param_resource_metadata(challenge: &str) -> Option<String> {
      // Read auth-params, including quoted-pair escapes; never scan a realm
      // or error_description for a parameter-looking substring.
      let mut chars = challenge.chars().peekable();
      let mut found = None;
      while chars.peek().is_some() {
          while chars.peek().is_some_and(|c| matches!(c, ' ' | '\t' | ',')) {
              chars.next();
          }
          let mut name = String::new();
          while chars.peek().is_some_and(|c| !matches!(c, '=' | ' ' | '\t' | ',')) {
              name.push(chars.next()?);
          }
          while chars.peek().is_some_and(|c| matches!(c, ' ' | '\t')) {
              chars.next();
          }
          if chars.peek() != Some(&'=') {
              continue;
          }
          chars.next();
          while chars.peek().is_some_and(|c| matches!(c, ' ' | '\t')) {
              chars.next();
          }
          let mut value = String::new();
          if chars.peek() == Some(&'"') {
              chars.next();
              loop {
                  match chars.next()? {
                      '\\' => value.push(chars.next()?),
                      '"' => break,
                      c => value.push(c),
                  }
              }
              if chars.peek().is_some_and(|c| !matches!(c, ',' | ' ' | '\t')) {
                  return None;
              }
          } else {
              while chars.peek().is_some_and(|c| !matches!(c, ',' | ' ' | '\t')) {
                  value.push(chars.next()?);
              }
          }
          if name.eq_ignore_ascii_case("resource_metadata")
              && (value.is_empty() || !clean(&value) || found.replace(value).is_some())
          {
              return None;
          }
      }
      found
  ```

In `crates/hennery-gateway/src/oauth.rs`, replace:

  ```rust
  pub async fn discover(client: &EgressClient, resource: &Url) -> Result<Discovered, DiscoveryError> {
      let origin = url_for_logs(resource.as_str());
  ```

with:

  ```rust
  pub async fn discover(client: &EgressClient, resource: &Url) -> Result<Discovered, DiscoveryError> {
      discover_with_deadline(client, resource, DISCOVERY_TIMEOUT).await
  }

  async fn discover_with_deadline(
      client: &EgressClient,
      resource: &Url,
      deadline: Duration,
  ) -> Result<Discovered, DiscoveryError> {
      tokio::time::timeout(deadline, discover_candidates(client, resource))
          .await
          .unwrap_or_else(|_| Err(DiscoveryError::Unreachable("OAuth discovery timed out".into())))
  }

  async fn discover_candidates(client: &EgressClient, resource: &Url) -> Result<Discovered, DiscoveryError> {
      let origin = url_for_logs(resource.as_str());
  ```

In `crates/hennery-gateway/src/oauth.rs`, replace:

  ```rust
              }
              return Ok(Discovered {
  ```

with:

  ```rust
              }
              let iss_parameter = document
                  .get("authorization_response_iss_parameter_supported")
                  .and_then(Value::as_bool)
                  .unwrap_or(false);
              // Security review F1: without RFC 9207, a code must never go
              // to an origin other than the one that authorized it.
              if !iss_parameter
                  && (authorization_endpoint.origin() != token_endpoint.origin()
                      || registration_endpoint
                          .as_ref()
                          .is_some_and(|endpoint| endpoint.origin() != authorization_endpoint.origin()))
              {
                  return Err(DiscoveryError::Failed(
                      "authorization, token and registration endpoints must share one origin without iss support".into(),
                  ));
              }
              return Ok(Discovered {
  ```

In `crates/hennery-gateway/src/oauth.rs`, replace:

  ```rust
                  iss_parameter: document
                      .get("authorization_response_iss_parameter_supported")
                      .and_then(Value::as_bool)
                      .unwrap_or(false),
  ```

with:

  ```rust
                  iss_parameter,
  ```

In `crates/hennery-gateway/src/oauth.rs`, replace:

  ```rust
      expires_in.map(|secs| now + (secs - EXPIRY_MARGIN).max(0))
  ```

with:

  ```rust
      expires_in.map(|secs| now.saturating_add((secs.clamp(0, MAX_EXPIRES_IN) - EXPIRY_MARGIN).max(0)))
  ```

In `crates/hennery-gateway/src/oauth.rs`, replace:

  ```rust
              Some(Value::Number(n)) => n.as_i64(),
              Some(Value::String(s)) if s.bytes().all(|b| b.is_ascii_digit()) && !s.is_empty() => s.parse().ok(),
  ```

with:

  ```rust
              Some(Value::Number(n)) => n.as_u64().map(|secs| secs.min(MAX_EXPIRES_IN as u64) as i64),
              Some(Value::String(s)) if s.bytes().all(|b| b.is_ascii_digit()) && !s.is_empty() => {
                  Some(s.parse::<u64>().unwrap_or(u64::MAX).min(MAX_EXPIRES_IN as u64) as i64)
              }
  ```

In `crates/hennery-gateway/src/oauth_api.rs`, replace:

  ```rust
                      if let Err(err) =
                          runtime
                              .store
                              .pin_client(&id, slot, &held.client_id, &discovered.issuer, &token_endpoint)
                      {
                          return internal(err);
  ```

with:

  ```rust
                      match runtime
                          .store
                          .pin_client(&id, slot, &held.client_id, &discovered.issuer, &token_endpoint)
                      {
                          Ok(true) => {}
                          Ok(false) => {
                              // Security review F3: another authorize may have
                              // pinned this slot while discovery was in flight.
                              let current = match runtime.store.oauth_clients(&id, &runtime.key) {
                                  Ok(Some(slots)) => match slot {
                                      Slot::Active if slots.pending.is_none() => slots.active,
                                      Slot::Pending => slots.pending,
                                      _ => None,
                                  },
                                  Ok(None) => None,
                                  Err(err) => return internal(err),
                              };
                              if !current.is_some_and(|current| {
                                  current.client_id == held.client_id
                                      && current.secret == held.secret
                                      && current.issuer.as_deref() == Some(discovered.issuer.as_str())
                                      && current.token_endpoint.as_deref() == Some(token_endpoint.as_str())
                              }) {
                                  return fail(StatusCode::CONFLICT, "issuer_changed",
                                      "the client's authorization server changed during discovery: enter the client again".into());
                              }
                          }
                          Err(err) => return internal(err),
  ```

In `crates/hennery-gateway/src/refresh.rs`, replace:

  ```rust
      expires_at.is_some_and(|at| at - now <= PROACTIVE)
  ```

with:

  ```rust
      expires_at.is_some_and(|at| at <= now.saturating_add(PROACTIVE))
  ```

In `crates/hennery-gateway/src/schema.rs`, replace:

  ```rust
          pending_secret_ciphertext BLOB,
          pending_issuer TEXT,
  ```

with:

  ```rust
          pending_secret_ciphertext BLOB,
          pending_key_version INTEGER,
          pending_updated_at INTEGER,
          pending_issuer TEXT,
  ```

In `crates/hennery-gateway/src/session.rs`, replace:

  ```rust
  pub struct GatewayMcp {
      store: Arc<GatewayStore>,
  ```

with:

  ```rust
  pub struct GatewayMcp {
      runtime: Arc<crate::runtime::Runtime>,
      store: Arc<GatewayStore>,
  ```

In `crates/hennery-gateway/src/session.rs`, replace:

  ```rust
          Self {
              store: gateway.runtime.store.clone(),
  ```

with:

  ```rust
          Self {
              runtime: gateway.runtime.clone(),
              store: gateway.runtime.store.clone(),
  ```

In `crates/hennery-gateway/src/session.rs`, replace:

  ```rust
          let cut = self.store.purge_hat(hat_id)?;
  ```

with:

  ```rust
          // The kernel has frozen the hat before this hook (kernel §5.5).
          // Do not take asynchronous refresh locks in this synchronous purge.
          let ids: Vec<_> = self
              .store
              .list()?
              .into_iter()
              .filter(|connection| connection.hat_id == hat_id)
              .map(|connection| connection.id)
              .collect();
          let cut = self.store.purge_hat(hat_id)?;
          for id in ids {
              self.runtime.flows.drop_connection(&id);
          }
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
          type Row = (String, Option<u32>, Option<Vec<u8>>, Option<String>, Option<Vec<u8>>);
          let stored: Option<Row> = tx
              .query_row(
                  "SELECT client_id, key_version, client_secret_ciphertext, pending_client_id, pending_secret_ciphertext
                   FROM gw_oauth_clients WHERE connection_id = ?1 AND owner_id = ?2",
                  [id, &self.owner],
                  |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
  ```

with:

  ```rust
          type Row = (
              String,
              Option<u32>,
              Option<Vec<u8>>,
              Option<String>,
              Option<Vec<u8>>,
              Option<u32>,
          );
          let stored: Option<Row> = tx
              .query_row(
                  "SELECT client_id, key_version, client_secret_ciphertext, pending_client_id, pending_secret_ciphertext, pending_key_version
                   FROM gw_oauth_clients WHERE connection_id = ?1 AND owner_id = ?2",
                  [id, &self.owner],
                  |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?)),
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
              Some((_, version, _, Some(pending), pending_blob)) => Some((
                  pending.clone(),
                  open_secret(key, id, PENDING_CLIENT_SECRET, *version, pending_blob)?,
              )),
              Some((active, version, blob, None, _)) => {
  ```

with:

  ```rust
              Some((_, _, _, Some(pending), pending_blob, version)) => Some((
                  pending.clone(),
                  open_secret(key, id, PENDING_CLIENT_SECRET, *version, pending_blob)?,
              )),
              Some((active, version, blob, None, _, _)) => {
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
                       key_version = ?6
                   WHERE connection_id = ?1 AND owner_id = ?2",
                  params![id, self.owner, client_id, has_secret, sealed, key.version()],
  ```

with:

  ```rust
                       pending_key_version = ?6, pending_updated_at = ?7
                   WHERE connection_id = ?1 AND owner_id = ?2",
                  params![id, self.owner, client_id, has_secret, sealed, key.version(), now],
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
                       pending_issuer = NULL, pending_token_endpoint = NULL
  ```

with:

  ```rust
                       pending_issuer = NULL, pending_token_endpoint = NULL, pending_key_version = NULL, pending_updated_at = NULL
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
              Option<String>,
          );
  ```

with:

  ```rust
              Option<String>,
              Option<u32>,
          );
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
                          pending_token_endpoint
  ```

with:

  ```rust
                          pending_token_endpoint, pending_key_version
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
                          r.get(10)?,
                      ))
  ```

with:

  ```rust
                          r.get(10)?,
                          r.get(11)?,
                      ))
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
              pending_token_endpoint,
          )) = row
  ```

with:

  ```rust
              pending_token_endpoint,
              pending_version,
          )) = row
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
                  secret: open_secret(key, id, PENDING_CLIENT_SECRET, version, &pending_blob)?,
  ```

with:

  ```rust
                  secret: open_secret(key, id, PENDING_CLIENT_SECRET, pending_version, &pending_blob)?,
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
              == 1)
      }
  ```

with:

  ```rust
              == 1)
      }

      /// Security review F2: an unlocked pre-exchange check. This is only
      /// an early refusal; store_grant repeats the check under the lock.
      pub fn flow_matches(&self, snapshot: &crate::flows::Snapshot, key: &MasterKey) -> Result<bool> {
          let conn = self.conn();
          let current: Option<(String, String, bool)> = conn
              .query_row(
                  "SELECT url, cred_kind, internal_network FROM gw_connections WHERE id = ?1 AND owner_id = ?2",
                  [&snapshot.connection_id, &self.owner],
                  |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
              )
              .optional()?;
          let Some((url, kind, internal)) = current else {
              return Ok(false);
          };
          if url != snapshot.url || kind != snapshot.cred_kind.as_str() || internal != snapshot.internal_network {
              return Ok(false);
          }
          client_matches(
              &conn,
              &self.owner,
              &snapshot.connection_id,
              snapshot.source,
              &snapshot.client,
              key,
          )
      }
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
          let clients: Option<(String, Option<String>)> = tx
              .query_row(
                  "SELECT client_id, pending_client_id FROM gw_oauth_clients WHERE connection_id = ?1 AND owner_id = ?2",
                  [id, &self.owner],
                  |r| Ok((r.get(0)?, r.get(1)?)),
              )
              .optional()?;
          let same_client = match grant.source {
              ClientSource::Registered => true,
              ClientSource::Active => {
                  matches!(&clients, Some((active, None)) if *active == grant.client.client_id)
              }
              ClientSource::Pending => {
                  matches!(&clients, Some((_, Some(pending))) if *pending == grant.client.client_id)
              }
          };
          if !same_client {
  ```

with:

  ```rust
          if !client_matches(&tx, &self.owner, id, grant.source, grant.client, key)? {
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
                   pending_issuer = NULL, pending_token_endpoint = NULL
  ```

with:

  ```rust
                   pending_issuer = NULL, pending_token_endpoint = NULL, pending_key_version = NULL, pending_updated_at = NULL
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
              )
              .optional()?;
          drop(conn);
          let refused = |id: &str| {
  ```

with:

  ```rust
              )
              .optional()?;
          let pending: Option<(String, u32, Vec<u8>)> = conn
              .query_row(
                  "SELECT connection_id, pending_key_version, pending_secret_ciphertext FROM gw_oauth_clients
                   WHERE owner_id = ?1 AND pending_secret_ciphertext IS NOT NULL
                   ORDER BY pending_updated_at DESC, connection_id LIMIT 1",
                  [&self.owner],
                  |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
              )
              .optional()?;
          drop(conn);
          let refused = |id: &str| {
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust
              crypto::open(key, &id, CLIENT_SECRET, version, &blob)
                  .map(drop)
  ```

with:

  ```rust
              crypto::open(key, &id, CLIENT_SECRET, version, &blob)
                  .map(drop)
                  .with_context(|| refused(&id))?;
          }
          if let Some((id, version, blob)) = pending {
              crypto::open(key, &id, PENDING_CLIENT_SECRET, version, &blob)
                  .map(drop)
  ```

In `crates/hennery-gateway/src/store.rs`, replace:

  ```rust

  /// A secret column opened under `field`; `None` when there is none.
  ```

with:

  ```rust

  // The ID alone is not a generation: a same-ID secret edit also invalidates
  // a consumed flow. Called on the same transaction that writes the grant.
  fn client_matches(
      conn: &Connection,
      owner: &str,
      id: &str,
      source: ClientSource,
      client: &TokenClient,
      key: &MasterKey,
  ) -> Result<bool> {
      if source == ClientSource::Registered {
          return Ok(true);
      }
      type Row = (
          String,
          Option<String>,
          Option<u32>,
          Option<Vec<u8>>,
          Option<u32>,
          Option<Vec<u8>>,
      );
      let row: Option<Row> = conn
          .query_row(
              "SELECT client_id, pending_client_id, key_version, client_secret_ciphertext, pending_key_version,
                  pending_secret_ciphertext FROM gw_oauth_clients WHERE connection_id = ?1 AND owner_id = ?2",
              [id, owner],
              |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?)),
          )
          .optional()?;
      let Some((active, pending, version, blob, pending_version, pending_blob)) = row else {
          return Ok(false);
      };
      let secret = match source {
          ClientSource::Active if pending.is_none() && active == client.client_id => {
              open_secret(key, id, CLIENT_SECRET, version, &blob)?
          }
          ClientSource::Pending if pending.as_deref() == Some(client.client_id.as_str()) => {
              open_secret(key, id, PENDING_CLIENT_SECRET, pending_version, &pending_blob)?
          }
          _ => return Ok(false),
      };
      Ok(secret == client.secret)
  }

  /// A secret column opened under `field`; `None` when there is none.
  ```

- [ ] **Step 4: Run the checks**

   Run the five checks:

   ```sh
   nix develop -c cargo fmt --all --check
   nix develop -c cargo clippy --workspace --all-targets --locked -- -D warnings
   nix develop -c cargo clippy -p hennery --locked -- -D warnings
   nix develop -c cargo test --workspace --locked
   nix develop -c cargo run -p hennery-proto --bin gen --locked -- --check
   ```

   Phase B targeted tests: exit 0, 102 passed. See Execution status for the final full gate and task-specific supplementary checks.

- [ ] **Step 5: Commit**

   ```sh
   git add -A && git -c commit.gpgsign=false commit -m "fix(gateway): bind OAuth endpoints, flows, pins and pending keys"
   ```

### Task 8: The spec write-back

**Files:** Modify `docs/specs/2026-09-26-mcp-gateway-design.md` (§4, §4.1–§4.5, §5.4, §6, §7, §9), `docs/specs/2026-09-26-kernel-design.md` (§3.3, §7.2), `docs/specs/2026-09-25-hennery-architecture-design.md` (§9.1).

- [ ] **Step 1: Write back the specs**

In `docs/specs/2026-09-25-hennery-architecture-design.md`, replace:

  ```markdown
    `chacha20poly1305`, `web-push-native`, `rmcp` (OAuth and the gateway's
    liveness probe; the proxy itself is hand-written) and `rust-embed`.
  ```

with:

  ```markdown
    `chacha20poly1305`, `web-push-native`, `rmcp` (planned for OAuth and the
    gateway's liveness probe; as built, plan 8f hand-writes both on the
    kernel's egress clients, gateway §4, as the proxy is) and `rust-embed`.
  ```

In `docs/specs/2026-09-26-kernel-design.md`, replace:

  ```markdown
  | `GET /api/mcp/oauth/callback` | `state` plus the flow cookie (gateway §4.3) | Exempt |
  ```

with:

  ```markdown
  | `GET /api/mcp/oauth/callback`, `GET /api/mcp/oauth/callback.js` | `state` plus the flow cookie (gateway §4.3); the script is static, no data | Exempt |
  ```

In `docs/specs/2026-09-26-kernel-design.md`, replace:

  ```markdown
    value but `same-origin`/`none` answers 403 `cross_site`.
  - These rules run before the cookie check, so a cross-origin request gets 403
  ```

with:

  ```markdown
    value but `same-origin`/`none` answers 403 `cross_site`.
    - **The one exception** (plan 8f): `GET /api/mcp/oauth/callback` changes
      state (it stores an OAuth grant), authenticated by `state` plus the flow
      cookie (gateway §4.3), never by the session cookie. Its router sits
      outside the browser-`GET` `Sec-Fetch-Site` layer, since the vendor's
      redirect arrives `cross-site` and would otherwise get 403; it is
      Origin-exempt, as is its static script `GET /api/mcp/oauth/callback.js`.
      No other `GET` may change state.
  - These rules run before the cookie check, so a cross-origin request gets 403
  ```

In `docs/specs/2026-09-26-kernel-design.md`, replace:

  ```markdown

  ## 8. API
  ```

with:

  ```markdown

  *As built (plan 8f):* the layer (`csp::on_html`) is put on the sessions
  module's router, and a router merged beside it is not covered. The gateway's
  OAuth callback, the one HTML page outside it, layers it itself. One layer over
  the whole merged router is a follow-up.

  **Referrer-Policy.** Every file and page of the web app answers
  `Referrer-Policy: no-referrer` (`web.rs`), and so do the setup routes (§3.1)
  and the OAuth callback page: a vendor's consent page, opened from the app,
  learns no hennery path (the API design of plans 8e and 8f, S6).

  ## 8. API
  ```

In `docs/specs/2026-09-26-mcp-gateway-design.md`, replace:

  ```markdown
  Built on `rmcp`'s `auth` module (discovery, registration, PKCE, refresh), with
  hennery supplying the credential store, the flow state, the HTTP client and the
  policies below. Every discovery, registration and token request goes through
  ```

with:

  ```markdown
  Hand-written on the kernel's egress clients (plan 8f decision 1), not on
  `rmcp`'s `auth` module: that one tries the authorization server's metadata in
  another order than §4.1, follows redirects during discovery itself, and brings
  a second `reqwest` into the tree. hennery owns the credential store, the flow
  state, the HTTP client and the policies below. Every discovery, registration and token request goes through
  ```

In `docs/specs/2026-09-26-mcp-gateway-design.md`, replace:

  ```markdown

  ### 4.2 Registration
  ```

with:

  ```markdown

  **As built (plan 8f).**

  - **The order:** the PR document from the challenge, then path-inserted, then
    origin-level; for each authorization server it names (at most 4, else the
    resource's origin), RFC 8414 inserted, RFC 8414 appended, OpenID
    configuration appended, then inserted. The first metadata with both
    endpoints and the `issuer` it was fetched for (RFC 8414 §3.3; equal but for
    one final `/`, plan 8f decision 6) wins; another `issuer` is 502
    `discovery_failed`.
  - **What counts as "not here", so the next candidate is tried** (plan 8f
    decisions 5, 7, 8): any status but 200 (a 3xx included: redirects are
    never followed), a body over 1 MiB, a body that is not one JSON object, a PR document without
    `resource` (RFC 9728 §3.2), and a document that names one of its keys twice
    or spells one otherwise (a duplicate's value depends on the parser, lane
    L16). A 5xx at every candidate is 502 `upstream_unreachable`, not
    `discovery_failed`; an address the egress policy refuses ends discovery at
    once (502 `egress_refused`).
  - **Discovery has one 60-second deadline**, including the complete candidate
    sequence and document bodies; expiry is 502 `upstream_unreachable`.
    The challenge parser respects quoted auth-params, refuses duplicate
    `resource_metadata` parameters (including across headers), and rejects
    control characters before URL parsing.
  - **Without advertised RFC 9207 `iss` support**, authorization, token and
    registration endpoints must share one origin. Split origins are 502
    `discovery_failed`; with `iss` advertised, the callback requires it.
  - **Every metadata URL, endpoint and the consent URL** is `https`, or plain
    `http` to loopback, even on a connection marked "internal network" (502
    `insecure_metadata`; `hennery_kernel::egress::is_https_or_loopback`).
  - **The `resource` check:** same origin and the connection path starts with
    the resource path. A mismatch is 409 `resource_mismatch` on authorize, the
    value kept on the connection (`oauth.resource_mismatch`, shown whole only
    in the list item; an error names origins only, §5.8). The operator accepts
    it by sending it back exactly (`accept_resource`); it is accepted only if
    it equals what discovery finds at that moment, and a stale one is 409
    `resource_mismatch` again with the new value (plan 8f decision 14). An
    acceptance is kept (`oauth.accepted_resource`) for every later authorize
    and refresh, and any URL change, a path's too, clears it. A `resource` on
    another origin, or not `https`, or over 2048 bytes, is 502
    `resource_foreign` and cannot be accepted.

  ### 4.2 Registration
  ```

In `docs/specs/2026-09-26-mcp-gateway-design.md`, replace:

  ```markdown
    the umbrella §7.5 guarantees this for supported topologies.

  ```

with:

  ```markdown
    the umbrella §7.5 guarantees this for supported topologies.

  **As built (plan 8f).**

  - **One client row per connection** (`gw_oauth_clients`): the client the
    grant was made with (or, with no grant yet, the one the next Connect
    uses). A client registered at authorize is held by the flow until its
    callback stores it with the grant, and the latest unconsumed registration
    is reused by the next authorize of the same connection, so repeated clicks
    do not register again.
  - **A pre-registered client is pinned** to the issuer and token endpoint its
    first Connect found; its secret only ever goes to that token endpoint. A
    later discovery that finds another is 409 `issuer_changed`: `PUT
    …/oauth-client` again (the API design's R2). When the initial pin loses
    its compare-and-swap, authorize re-reads that slot: another client, secret,
    issuer or token endpoint is also 409 `issuer_changed`, before consent.
    A client `PUT` while a grant
    is live is stored as pending, under a field of its own, and replaces the
    client only when a Connect with it completes (G-7).
  - A refusal is 502 `registration_refused`, its `error` and
    `error_description` with control and bidi characters stripped, cut to 300
    characters and prefixed "The vendor said: ".

  ```

In `docs/specs/2026-09-26-mcp-gateway-design.md`, replace:

  ```markdown
  ### 4.4 Tokens

  - `expires_at = now + expires_in − 60 s`; absent `expires_in` means unknown,
    not expired.
  ```

with:

  ```markdown
  **As built (plan 8f).**

  - **`resource` is the connection URL or nothing**, never another value: an
    accepted mismatching `resource` (§4.1) lets the Connect go on, and the
    `resource` sent stays the connection URL. The API design's B4 says so too;
    where it also reads "accepted or not", this section's retry without the
    parameter wins (plan 8f decision 15).
  - **Where `invalid_target` is answered** (plan 8f decision 11): at consent,
    the authorization server's redirect carries the error, and the flow is
    over; the callback records it in memory for that (connection, URL), and
    the next Connect omits `resource`. At the token endpoint (exchange and
    refresh) the request is sent once more without it, server-side. Either way
    `resource_param_accepted = false` is stored with the grant.
  - **The flow:** one live flow per connection (a new authorize supersedes the
    previous one, whose callback then answers `flow_unknown`), at most 16 per
    owner (429 `too_many_flows`), 15 minutes. A URL or kind edit, a client
    `PUT` or a delete drops the connection's flows (the API design's R1), and
    the callback checks the URL, kind, internal-network allowance and selected
    client (its secret too) before exchange, then repeats the check under the
    refresh lock in the grant's transaction before storing anything
    (400 `connection_changed`). A same-ID secret PUT also invalidates a
    consumed flow; its replacement is never overwritten by that callback.
  - **The flow cookie** is `hennery_mcp_flow_<16 hex of sha256(state)>`, 256
    random bits, `HttpOnly`, `SameSite=Lax`, `Secure` as the kernel's
    `secure_cookies`, `Path=/api/mcp/oauth/callback`, `Max-Age=900`; every
    outcome from the cookie check on clears it. The flow is consumed by the
    cookie check whatever its result.
  - **The callback's order** (`callback.rs`): `state` (before any storage,
    400 `flow_unknown`); the cookie, constant-time (400 `flow_mismatch`); the
    operator's session that started the flow still live (400
    `session_ended`); `iss` (RFC 9207: present and not the flow's issuer, or
    absent where the metadata advertises it, 400 `issuer_mismatch`); the
    vendor's `error` (400 `consent_denied`); an unlocked connection-generation
    check (400 `connection_changed`, 500 `internal` if unreadable); the exchange (502
    `exchange_failed`, naming only a fixed RFC 6749 `error`;
    `upstream_unreachable`; `egress_refused`); under the lock, the connection
    unchanged; then the grant, status `ok` (`status_at` moves even if it was
    `ok`). Every failure from the flow on is kept in the connection's
    `oauth_error`; the first two name no connection, so they write nothing.
  - **The page** is static HTML with no inline script and no external resource,
    naming no label, URL, account, client id, token or code; its one script
    (`/api/mcp/oauth/callback.js`) strips the query from the URL and history,
    tells the opener's origin on `BroadcastChannel("hennery-mcp-oauth")`, and
    closes the window on success. It answers `Cache-Control: no-store`,
    `Referrer-Policy: no-referrer`, `nosniff` and the kernel's CSP, layered on
    its own router.
  - **`account_label`:** v1 learns none (no standard place reports one); the
    column stays `NULL`.

  ### 4.4 Tokens

  - `expires_in` is a nonnegative whole number of seconds, or its decimal
    string, capped at one year. `expires_at = now + max(expires_in − 60 s, 0)`
    uses saturating arithmetic, as does the proactive due check. Absent or
    unusable `expires_in` means unknown, not expired; a huge positive lifetime
    remains known at the cap.
  ```

In `docs/specs/2026-09-26-mcp-gateway-design.md`, replace:

  ```markdown
    omitted both on refresh.)*

  ```

with:

  ```markdown
    omitted both on refresh.)*
  - As built (plan 8f): a proactive refresh is done only for a grant with a
    refresh token, so a request never waits for the lock of a grant that
    cannot be refreshed; after it, the URL and the token are read again, in one
    statement (plan 8f decision 13). A refresh that fails leaves the token
    there is: a 401 then has its own refresh and retry.

  ```

In `docs/specs/2026-09-26-mcp-gateway-design.md`, replace:

  ```markdown
    *(G-13: a late refresh of an old grant overwrote a freshly stored new one.)*

  ```

with:

  ```markdown
    *(G-13: a late refresh of an old grant overwrote a freshly stored new one.)*

  **As built (plan 8f).** One `Runtime` per collector holds the locks, shared
  by the API, the proxy and the probe (plan 8f decision 3). A refresh runs as a
  task of its own that the caller awaits. Its outcomes (`Refreshed`):

  | Outcome | When | The proxy answers | Status |
  |---|---|---|---|
  | `Retry` | a token to send: refreshed, or one another refresh or a Connect stored meanwhile (then nothing is sent to the vendor) | the retry's answer; a second 401 is 502 `upstream_auth` | `needs_auth` on the second 401 |
  | `NotRefreshable` | no grant, or one without a refresh token | 502 `upstream_auth` | `needs_auth` |
  | `Refused` | the vendor refused the refresh (`invalid_grant` and the like, `invalid_target` without `resource` too) | 502 `upstream_auth` | `needs_auth` |
  | `Unavailable` | timeout, transport failure, an egress refusal or an unreadable answer | 502 `upstream_unreachable` | unchanged |
  | `Unsaved` | the grant could not be read, or the result could not be stored | 502 `credential_unsaved` | unchanged |

  - **The write is a compare-and-swap** on the sealed blob (fresh nonce per write)
    it read (plan 8f decision 9). API PATCH, DELETE and credential/client PUTs
    hold the refresh lock. The CAS also protects against writers outside that
    lock, such as a hat purge: a deleted or replaced grant never matches, and a
    lost swap uses what is stored. Tests that force these races deliberately
    bypass the API's lock.
  - **A token comes with where it goes** (plan 8f decision 13): `Retry`
    carries the URL and the internal-network allowance read with its token.
    The retry is sent only if both equal what the first attempt was sent to;
    otherwise nothing more is sent and the answer is 502 `upstream_changed`
    ("send again"), without `needs_auth`. (A URL edit and a new Connect while a
    401 waited for the lock would otherwise send the new upstream's token to
    the old one.)

  ```

In `docs/specs/2026-09-26-mcp-gateway-design.md`, replace:

  ```markdown
  - A 401 for a static or `none` connection sets it `needs_auth` (§7).

  ```

with:

  ```markdown
  - A 401 for a static or `none` connection sets it `needs_auth` (§7).
  - As built (plan 8f): an OAuth 401 goes through §4.5's single-flight refresh
    and its outcomes table: 502 `upstream_auth` (with `needs_auth`),
    `upstream_unreachable`, `credential_unsaved` or `upstream_changed` (neither
    of the last three sets `needs_auth`). The proxy and the probe share one
    forwarding path, `proxy::send_through`.

  ```

In `docs/specs/2026-09-26-mcp-gateway-design.md`, replace:

  ```markdown

  **Stated plainly in the docs:** the collector holding the gateway is a single
  ```

with:

  ```markdown

  **As built (plan 8f).**

  - **Fields:** an OAuth grant (its access and refresh tokens, one JSON object)
    is sealed in `gw_credentials` as `gw_credentials.oauth_tokens`, taken from
    the connection's kind as the static token's field is; a client secret in
    `gw_oauth_clients` as `gw_oauth_clients.client_secret`, and a pending
    client's (§4.2) as `gw_oauth_clients.pending_client_secret`, so neither
    opens as the other. The key check at start opens each kind with its own
    field, and counts a stored client secret as ciphertext.
  - **`gw_oauth_clients`** holds one row per connection: the client id, whether
    a secret is stored (a column apart, so a list never reads a ciphertext),
    the sealed secret, its `key_version`, the authentication method, the
    pinned issuer and endpoints, the redirect URI, scopes, `resource` and
    `resource_param_accepted`, and the pending client's id, secret, issuer and
    token endpoint. **The pending secret has its own `pending_key_version`**
    and `pending_updated_at`; a pending PUT leaves the active blob and version
    unchanged. Startup opens the newest pending secret as well as the newest
    grant and active client secret, each with its field and version. Promotion
    and a PUT without a grant clear the pending version and timestamp.
    `rotate-key` (plan 8g) must re-seal both secrets with their respective
    versions, and the OAuth grants beside the static tokens.
  - **What a grant counts as:** a grant is a credential (`has_credential`, and
    lane L20's hats with credentials when that lands); a client secret alone
    is not.
  - A §4.6 change of origin or kind deletes the OAuth client with the
    credential, in the same transaction; so do a delete and a hat purge.

  **Stated plainly in the docs:** the collector holding the gateway is a single
  ```

In `docs/specs/2026-09-26-mcp-gateway-design.md`, replace:

  ```markdown
  - Every background loop has panic isolation and a per-tick timeout.

  ```

with:

  ```markdown
  - Every background loop has panic isolation and a per-tick timeout.

  **As built (plan 8f).**

  - **The probe** (`probe.rs`) goes through `proxy::send_through` with the
    connection's own credential and allowance: every step 2xx → `ok`; a 401
    after one refresh → `needs_auth`; a 5xx, a 3xx or a transport failure →
    `error`, with a note; any other 4xx → no change. The `DELETE`'s answer is
    not read (many servers take none). Each probe moves `checked_at`, and each
    is bounded at 30 s. Only the probe sets `error`; live traffic never does.
  - **The loop** runs every 15 minutes over the OAuth connections with a grant;
    each tick is a task of its own bounded at 10 minutes, so a panic or a hang
    ends that tick, not the loop.
  - **Probe now** (`POST …/probe`, §9): single-flight per connection; within
    10 s of a completed probe its result stands without a new request; static
    and `none` connections can be probed this way too (409 `no_credential`
    for a `static` or OAuth connection without one).
  - **Live traffic's `ok`** moves `checked_at` too, at most once a minute when
    nothing else changes (the throttle of `last_used_at`).
  - **Every status write is guarded by the URL** the request or probe went to,
    so an answer about an old URL changes nothing.
  - **The Notifier** is told of a move into `needs_auth` or `error`, and out of
    either into `ok`, by the store that made it, in the statement that made
    it; a problem already there at start is announced once. Full mode: Web
    Push (`hennery_kernel::push::Push`), the title the connection's label, the
    generic title "An MCP connection needs attention", the body "needs sign-in
    again", "is failing" or "is working again", the URL `/mcp`, the tag
    `mcp-<connection id>`, urgency normal; the hat's push policy applies.

  ```

In `docs/specs/2026-09-26-mcp-gateway-design.md`, replace:

  ```markdown
  | `POST /api/mcp/connections` | Create (**step-up**): `CreateMcpConnectionRequest` → 201 `McpConnectionItem`, `not_connected`, no credential, no mounts. 400 `invalid` (a field refused, or a hat that is not the owner's); 400 `unsupported_cred_kind` (an OAuth kind, until plan 8f); 409 `slug_taken`; 409 `too_many_connections`. |
  | `PATCH /api/mcp/connections/{id}` | Update: `UpdateMcpConnectionRequest` → 200 `McpConnectionItem`. **Step-up** when the body names `url`, `cred_kind`, `internal_network`, `static_header` or `static_prefix`, even with the stored value (a `null` reads as absent); the label and the allowlist need none. Origin or kind change clears the credential (§4.6). The slug and hat cannot change (an unknown field, 422). 400 `invalid`; 400 `unsupported_cred_kind`. A refused change changes nothing. |
  | `DELETE /api/mcp/connections/{id}` | Delete (**step-up**: it destroys a grant that may need a consent to get back, as revoking a host does) with mounts and credential (and, from plan 8f, OAuth client): 204. |
  | `PUT /api/mcp/connections/{id}/mounts` | Replace the host set (full set, never a delta): `McpMountsRequest {host_ids}` → 200 `McpConnectionItem`. No step-up: a mount reaches only a host the owner paired, and pairing needs it. 400 `invalid` (a host not the owner's or revoked, more than 1024 hosts, an id over 64 bytes). |
  | `PUT /api/mcp/connections/{id}/credential` | Set a static token (write-only, **step-up**): `McpCredentialRequest {token}` → 204, sealed, replacing any before it. 409 `wrong_cred_kind` (not `static`); 400 `invalid` (the token is never quoted). No route reads a credential back or clears one: changing the origin or kind, or deleting the connection, does. |
  | `PUT /api/mcp/connections/{id}/oauth-client` | Set a pre-registered client (**step-up**). *Later: plan 8f.* |
  | `POST /api/mcp/connections/{id}/authorize` | Start OAuth; sets the flow cookie, returns the consent URL. *Later: plan 8f.* |
  | `GET /api/mcp/oauth/callback` | OAuth redirect target (`state` plus flow cookie). *Later: plan 8f.* |
  ```

with:

  ```markdown
  | `POST /api/mcp/connections` | Create (**step-up**): `CreateMcpConnectionRequest` → 201 `McpConnectionItem`, `not_connected`, no credential, no mounts. 400 `invalid` (a field refused, or a hat that is not the owner's); 409 `slug_taken`; 409 `too_many_connections`. |
  | `PATCH /api/mcp/connections/{id}` | Update: `UpdateMcpConnectionRequest` → 200 `McpConnectionItem`. **Step-up** when the body names `url`, `cred_kind`, `internal_network`, `static_header` or `static_prefix`, even with the stored value (a `null` reads as absent); the label and the allowlist need none. Origin or kind change clears the credential (§4.6). The slug and hat cannot change (an unknown field, 422). 400 `invalid`; 400 `unsupported_cred_kind`. A refused change changes nothing. |
  | `DELETE /api/mcp/connections/{id}` | Delete (**step-up**: it destroys a grant that may need a consent to get back, as revoking a host does) with mounts, credential and OAuth client, and its OAuth flows dropped: 204. |
  | `PUT /api/mcp/connections/{id}/mounts` | Replace the host set (full set, never a delta): `McpMountsRequest {host_ids}` → 200 `McpConnectionItem`. No step-up: a mount reaches only a host the owner paired, and pairing needs it. 400 `invalid` (a host not the owner's or revoked, more than 1024 hosts, an id over 64 bytes). |
  | `PUT /api/mcp/connections/{id}/credential` | Set a static token (write-only, **step-up**): `McpCredentialRequest {token}` → 204, sealed, replacing any before it. 409 `wrong_cred_kind` (not `static`); 400 `invalid` (the token is never quoted). No route reads a credential back or clears one: changing the origin or kind, or deleting the connection, does. |
  | `GET /api/mcp/oauth/redirect-uri` | The redirect URI to register at a vendor for `oauth_client` (plan 8f). |
  | `PUT /api/mcp/connections/{id}/oauth-client` | Set a pre-registered client (**step-up**): `McpOauthClientRequest` → 200 `McpConnectionItem`; a secret left out keeps the stored one only for the same client id; pending while a grant is live (§4.2). 409 `wrong_cred_kind`; 400 `invalid`. Drops the connection's flows. |
  | `POST /api/mcp/connections/{id}/authorize` | Start OAuth (**step-up**: kernel §3.4 lists gateway credentials and pre-registered clients, the broader rule over this table's first draft; the API design's F2): `McpAuthorizeRequest` (`{}` or `{accept_resource}`) → 200 `McpAuthorizeResponse` `{consent_url, expires_at}`, setting the flow cookie (§4.3). Its codes are on `McpAuthorizeRequest` in `hennery-proto`; among them 409 `resource_mismatch` (also for a stale `accept_resource`), 400 `invalid` (an `accept_resource` where no PR document names one), 409 `no_oauth_client`, `no_registration_endpoint`, `issuer_changed`, `wrong_cred_kind`, 429 `too_many_flows`, 502 `discovery_failed`, `insecure_metadata`, `pkce_unsupported`, `registration_refused`, `resource_foreign`, `egress_refused`, `upstream_unreachable`. Each failure after the connection was found is kept in `oauth_error`, and a failed Connect never changes the status. |
  | `GET /api/mcp/oauth/callback` | OAuth redirect target (`state` plus flow cookie, §4.3), outside the operator's session and the browser rules; renders the page. Its script is `GET /api/mcp/oauth/callback.js`. |
  | `POST /api/mcp/connections/{id}/probe` | Probe now (§7): `{}` → 200 `McpConnectionItem` after the probe. 409 `no_credential`. No step-up: it changes no credential and no destination. |
  ```

In `docs/specs/2026-09-26-mcp-gateway-design.md`, replace:

  ```markdown
  The collector merges the gateway's router beside the sessions module's; the
  kernel's CSP layer does not cover these routes, which answer only JSON.
  ```

with:

  ```markdown
  A hat's gateway purge also drops its pending OAuth flows and held registrations,
  after the database transaction commits. It keeps other hats' flows and takes no
  asynchronous refresh lock. The pre-exchange and persistence checks still apply
  when a purge races an exchange already in flight.

  The collector merges the gateway's router beside the sessions module's; the
  kernel's CSP layer does not cover a router merged beside it. The JSON routes
  need none; the callback, the one gateway route that answers HTML, layers the
  kernel's `csp::on_html` itself (plan 8f).
  ```

- [ ] **Step 2: Commit**

   ```sh
   git add -A && git -c commit.gpgsign=false commit -m "docs(spec): write back plan 8f: OAuth, single-flight refresh, the probe and the Notifier"
   ```

### Task 9: Take the scoped re-confirmation notes

**Files:** Modify `src/oauth_api.rs`, `tests/oauth.rs`, `tests/oauth_log.rs`, `tests/support/oauth.rs`.

- [ ] **Step 1: Write the failing tests**

In `crates/hennery-gateway/tests/oauth.rs`, replace:

  ```rust
          for winner in ["same", "issuer", "endpoint", "client", "secret", "missing"] {
  ```

with:

  ```rust
          for winner in ["same", "issuer", "endpoint", "client", "secret", "missing", "deleted"] {
  ```

In `crates/hennery-gateway/tests/oauth.rs`, replace:

  ```rust
                          }
                          "missing" => {
  ```

with:

  ```rust
                          }
                          "deleted" => {
                              assert!(store.delete(&pin_id).unwrap());
                          }
                          "missing" => {
  ```

In `crates/hennery-gateway/tests/oauth.rs`, replace:

  ```rust
              });
              let (status, _, answer) = h.authorize(&id, json!({})).await;
              assert_eq!(
  ```

with:

  ```rust
              });
              let (status, headers, answer) = h.authorize(&id, json!({})).await;
              assert_eq!(
  ```

In `crates/hennery-gateway/tests/oauth.rs`, replace:

  ```rust
                      StatusCode::OK
                  } else {
  ```

with:

  ```rust
                      StatusCode::OK
                  } else if winner == "deleted" {
                      StatusCode::NOT_FOUND
                  } else {
  ```

In `crates/hennery-gateway/tests/oauth.rs`, replace:

  ```rust
                  assert_eq!(answer["code"], "issuer_changed");
  ```

with:

  ```rust
                  assert_eq!(
                      answer["code"],
                      if winner == "deleted" {
                          "not_found"
                      } else {
                          "issuer_changed"
                      }
                  );
                  assert!(answer.get("consent_url").is_none());
                  assert!(!headers.contains_key(header::SET_COOKIE));
                  assert_eq!(h.runtime.flows.live("", unix_now()), 0);
  ```

In `crates/hennery-gateway/tests/oauth_log.rs`, replace:

  ```rust
  const SECRET_CANARY: &str = "secretcanary8c9d0e1f";
  const BODY_CANARY: &str = "bodycanary2a3b4c5d";
  ```

with:

  ```rust
  const SECRET_CANARY: &str = "secretcanary8c9d0e1f";
  const PROBE_BODY_CANARY: &str = "probe503bodycanary9f2d6b";
  const BODY_CANARY: &str = "bodycanary2a3b4c5d";
  ```

In `crates/hennery-gateway/tests/oauth_log.rs`, replace:

  ```rust
          c.mcp_status = Some(503);
      });
  ```

with:

  ```rust
          c.mcp_status = Some(503);
          c.mcp_status_body = Some(json!({"error": PROBE_BODY_CANARY}));
      });
  ```

In `crates/hennery-gateway/tests/oauth_log.rs`, replace:

  ```rust
      assert_eq!(serde_json::from_str::<Value>(&text).unwrap()["status"], "error");
  ```

with:

  ```rust
      let probed: Value = serde_json::from_str(&text).unwrap();
      assert_eq!(probed["status"], "error");
      assert_eq!(probed["status_note"], "the upstream answered HTTP 503");
  ```

In `crates/hennery-gateway/tests/oauth_log.rs`, replace:

  ```rust
          BODY_CANARY.to_string(),
          TOKEN_PREFIX.to_string(),
  ```

with:

  ```rust
          BODY_CANARY.to_string(),
          PROBE_BODY_CANARY.to_string(),
          TOKEN_PREFIX.to_string(),
  ```

In `crates/hennery-gateway/tests/oauth_log.rs`, replace:

  ```rust
          BODY_CANARY,
          TOKEN_PREFIX,
  ```

with:

  ```rust
          BODY_CANARY,
          PROBE_BODY_CANARY,
          TOKEN_PREFIX,
  ```

- [ ] **Step 2: Run them and see them fail, then commit them**

   ```sh
   nix develop -c cargo test -p hennery-gateway --locked --test oauth a_lost_client_pin
   nix develop -c cargo test -p hennery-gateway --locked --test oauth_log
   ```

   The lost-pin deletion row fails with 409 instead of 404; the probe-body canary test does not compile before its fake-body field exists. Both failures exit 101.

   ```sh
   git add -A && git -c commit.gpgsign=false commit -m "test(gateway): pin deleted connections and probe failure body canaries"
   ```

- [ ] **Step 3: Implement**

In `crates/hennery-gateway/src/oauth_api.rs`, replace:

  ```rust
                                  Ok(None) => None,
  ```

with:

  ```rust
                                  Ok(None) => return not_found(),
  ```

In `crates/hennery-gateway/tests/support/oauth.rs`, replace:

  ```rust
      pub mcp_status: Option<u16>,
      /// The MCP endpoint never answers an authenticated request.
  ```

with:

  ```rust
      pub mcp_status: Option<u16>,
      /// Body returned alongside an overridden MCP status, for log canaries.
      pub mcp_status_body: Option<Value>,
      /// The MCP endpoint never answers an authenticated request.
  ```

In `crates/hennery-gateway/tests/support/oauth.rs`, replace:

  ```rust
              mcp_status: None,
              mcp_hang: false,
  ```

with:

  ```rust
              mcp_status: None,
              mcp_status_body: None,
              mcp_hang: false,
  ```

In `crates/hennery-gateway/tests/support/oauth.rs`, replace:

  ```rust
      if let Some(status) = config.mcp_status {
          return StatusCode::from_u16(status).unwrap().into_response();
  ```

with:

  ```rust
      if let Some(status) = config.mcp_status {
          if let Some(body) = &config.mcp_status_body {
              return json_response(status, body);
          }
          return StatusCode::from_u16(status).unwrap().into_response();
  ```

- [ ] **Step 4: Run the checks**

   Run the five checks:

   ```sh
   nix develop -c cargo fmt --all --check
   nix develop -c cargo clippy --workspace --all-targets --locked -- -D warnings
   nix develop -c cargo clippy -p hennery --locked -- -D warnings
   nix develop -c cargo test --workspace --locked
   nix develop -c cargo run -p hennery-proto --bin gen --locked -- --check
   ```

   76 targeted tests pass, exit 0; M2 and SF6body revert-probes bite.

- [ ] **Step 5: Commit**

   ```sh
   git add -A && git -c commit.gpgsign=false commit -m "fix(gateway): report deleted connections and serve probe body canaries"
   ```

## After this plan

- **8e integration completed:** OAuth is delivered as another mounted connection. Migration 4 follows unchanged stdio migration 3; protocol generation, shared runtime/revocations, session-ID binding, answer deadlines and purge tests were retained and reverified.
- **Kernel (O23):** the CSP layer covers only the sessions router; a router merged beside it (the gateway's callback, any later one) must layer `csp::on_html` itself. One layer over the whole merged router, with a test that every `text/html` answer carries it, is the follow-up (kernel §7.2's as-built note).
- **m1 / Plan 8g (`rotate-key`):** startup currently selects the newest active secret by `registered_at`, which a grant write preserves; after rotation this can verify an older row. Track last seal when implementing rotation. This predates F4 and is deferred as approved. Active `key_version` and `pending_key_version` belong to separate secrets; re-seal both under their own fields and versions, and `gw_credentials.oauth_tokens` beside the static tokens. A timeout after the vendor rotated a refresh token can lose that rotation: include it in the real-vendor matrix (the current outcome remains unavailable, eventually reconnect if the old refresh token is refused).
- **Plan 8g:** standalone mode's `Notifier` (a log line and an optional webhook, gateway §7); `mode()` `gateway`.
- **Lane L20:** when `GatewayStore::hats_with_credentials()` lands (frontend 4d), an OAuth grant counts (it is in `gw_credentials`); a client secret alone does not.
- **Frontend (4e-ii):** 4e-ii must land before the consent popup ships; retain and verify `w.opener = null` before popup navigation; this backend plan does not implement that UI.
- **Frontend:** the `mcp_oauth` capability is on; the routes, the click sequence (B3), the callback's `BroadcastChannel("hennery-mcp-oauth")` (B5), probe now (B6) and the badge (B7) are as the API design has them, with decision 14 (a stale acceptance is 409, refetch on 409) and decision 15 (no change for the frontend: `resource` is never shown as sent).
- **Open for the maintainer** (the API design's product questions, unchanged): operator-set OAuth scopes for `oauth_client`; whether static and `none` connections should be probed by hand at all (Q4: built, may change); `account_label` (v1 learns none).
- **m4 (noted):** challenge parsing joins all `WWW-Authenticate` headers; non-ASCII text or duplicate parameters returns no challenge and falls back to well-known discovery. This fails safe.
- **Deferred review notes:** probe starvation under sequential ticks needs fair scheduling/bounded concurrency tests; repeated SSE parsing (O(n²)) needs an incremental parser with chunk-boundary tests and a work-count assertion; lock-map growth needs coordinated lifetime/pruning across the API, refresh and probe. Those are follow-ups, with no weaker security defaults here.
- **PQ1 (maintainer):** if the no-iss same-origin rule breaks a required vendor, would you accept the residual mix-up risk, and should the UI show the consent origin before navigation? The built rule stays strict.
- **PQ2 (maintainer):** should the item show `resource_param_accepted = false`, since dropping `resource` removes its audience restriction?
- **PQ3 (maintainer):** is requesting every advertised `scopes_supported` acceptable when that includes admin scopes? Should operators choose scopes?
- **PQ4 (maintainer):** keep cleaned vendor `error_description` as text on our callback origin, despite its phishing potential, or show only the error code?
- **Operator items** (lane L10, live calls):
  - one real vendor of each kind (`oauth_dcr`, `oauth_client` with and without a secret) through Connect, a refresh after expiry, a revoked grant (`needs_auth` and the push), an outage (`error`, "is failing", no reconnect);
  - the vendor matrix of gateway §13 (token lifetimes, rotation, reuse detection, the `GET` SSE channel);
  - the consent popup in the browsers testers use (the blank-then-navigate rule, `Cross-Origin-Opener-Policy` severing the handle).

Generated with Claude AI — please review before distribution.
