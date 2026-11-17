# Queued prompt steering verification

Implementation design: [queued prompt steering](../superpowers/specs/2026-11-17-queued-prompt-steering-design.md).

## Frontend

- `npm --prefix web test`: 172 files and 2,889 tests passed.
- `npm --prefix web run typecheck`: passed with generated protocol types.
- `npm --prefix web run build`: passed, including script tests and emitted CSS origin checks.
- Focused queue, composer and stream tests: 185 passed before the final two rejected-image cases; the final queue component suite passed 30 tests. New behavior was tested
  failing before implementation, including selected-message routing, mutation
  guards, unsupported sessions, uncertain delivery and retained images.
- Independent UI review approved the implementation after adding recovery links
  for uncertain image input. Two nonblocking observations remain: the busy-state test
  delays the HTTP response without independently delaying its refresh, and the
  composer repeats its running/blocked predicate at the queue boundary.

## Backend

The initial integration tests failed because the steering endpoint did not
exist. The implementation uses the actual collector and host with a fake ACP
adapter; these tests do not establish acceptance against authenticated providers.
Review added coverage for internal errors, adapter loss, selected FIFO bypass,
images, pending permissions, late acknowledgements and original-turn attribution.
Final checks:

- Four production crates (host, protocol, sessions and view): 1,133 tests
  passed in the broader regression run.
- After the final projection correction: sessions library 186 passed; view
  crate 63 passed, including 29 folding rules.
- Ten steering integration tests passed, including raw full/incremental
  reads and resumed SSE receiving the identical canonical input exactly once.
  The root independently reran all ten final cases against commit
  `09320f33`: 10 passed in 2.87 seconds.
- Owner SQL audit: 3 passed; host capability advertisement: 1 passed.
- Final API view suite: 68 passed, including reattached capability convergence.
- Final review added uncertain dismissal followed by admission or idle, duplicate
  acknowledgements, session deletion cleanup and rejected-image recovery.
  All three final findings were fixed and verified. A dispatched attempt now
  remains in immutable session history even after its recovery notice is
  dismissed; dismissal releases queue capacity and never requests a resend.
- Protocol and view generator checks and formatting checks passed.
- Independent backend review approved both fix rounds, including the final
  raw cursor and folded historical projection behavior.

The complete pre-review workspace run reported 3,188 passed, 20 failed and
14 ignored. Three project failures (host capability expectations and two SQL
owner audit checks) were fixed and passed in the final focused runs. The
remaining seventeen failures need unavailable proxy binaries, listed below.

## Environment limits

The available Rust compiler and Clippy are 1.93.1, while the repository requests
1.98.1. The Nix development shell is unavailable within the sandbox. Tests that
open localhost sockets require sandbox escalation. No adapter pins changed.

A complete Rust workspace run was attempted. Seventeen proxy scenarios could
not run because `nginx` and `caddy` are absent:

- deployment: `real_proxy_plaintext_redirect_and_overrides_send_zero_hello`,
  `nginx_lost_committed_replies_survive_all_process_restarts`,
  `deployment_recovery_reads_visible_settings_and_retries_after_post_rename_fsync_failure`,
  `caddy_lost_committed_replies_survive_all_process_restarts`;
- readme: `public_join_shell_block_pairs_runs_and_reconnects_over_wss`;
- testkit library: `reverse_proxy::tests::paused_nginx_tls_port_is_not_reissued`,
  `reverse_proxy::tests::paused_caddy_tls_port_is_not_reissued`,
  `reverse_proxy::tests::paused_caddy_admin_port_is_not_reissued`;
- e2e: `caddy_outage_keeps_one_adapter_and_exactly_one_answer`,
  `nginx_outage_keeps_one_adapter_and_exactly_one_answer`;
- external OAuth: `direct_remote_oauth_round_trip_over_real_tls_and_shipped_proxies`;
- reverse proxy: `nginx_nonce_large_frames_idle_streams_renewal_and_reload`,
  `caddy_nonce_large_frames_idle_streams_renewal_and_reload`,
  `nginx_request_cap_rejects_before_the_collector`,
  `nginx_caps_unauthenticated_upgrades_before_the_collector`,
  `recipes_overwrite_all_spoofs_and_preserve_host_origin_and_nonce`,
  `real_proxy_two_client_budgets_and_backend_origin_rules`.

Unmodified `hennery-kernel/src/operator.rs:735` triggers
`clippy::nonminimal_bool` under the available Clippy. The strict workspace
Clippy command therefore fails on that existing code. A scoped run permits
only that lint to inspect the changed components; that scoped check passed. Existing ts-rs attribute-parsing warnings also appear
in Rust build output.

No real-agent runtime acceptance, merge, push, deployment or release was
performed as part of this change.

## Review and commits

The final scoped whole-feature review approved all three corrections: refreshed
capability after reattachment, accurate late admission after dismissal, and
rejected image recovery. Source commits use Conventional Commits:

- `f89cc19d` — `feat(web): add explicit steering for queued messages`
- `d9b57dc8` — `feat(sessions): steer queued prompts into active turns`
- `09320f33` — `fix(sessions): preserve steering history after dismissal`

Work remains on the pre-existing feature branch
`fix/external-mcp-hat-defaults`. The implementation is committed locally.
