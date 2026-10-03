# The README quickstart (plan 4f) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ] `) syntax for tracking.

**Goal:** an early tester can go from the README to a working hennery, and every shell example on the way is run by a test or by CI (fleet rule):
- **Status** says what works now and what does not, instead of "Pre-alpha. Nothing is usable yet".
- **Quickstart:** build from source (the web UI, then the binary that embeds it) or with Nix; `hennery up`; the setup link; pairing another machine; starting a session; connecting static-token, OAuth and local stdio MCP servers.
- **Recovery:** `hennery admin reset-password` and `hennery admin reset-public-url`, replacing the raw SQL against the database (the lane's ruling, 2026-10-03).
- The operator's bar, and nothing beyond it: testers build from source, the README has a quickstart, the embedded web UI drives sessions, the MCP gateway is usable.

**Architecture:**
- `packaging/readme-blocks.sh` (new, POSIX `sh` and `awk`): prints a README block by name. It fails closed: every fenced block is a named ```` ```sh ```` block or in a language that is not shell, and every way found to hide a block is refused.
- `crates/hennery/tests/readme.rs` (new):
  - the script's every outcome, on fixture files;
  - every block name has a runner, here or in a workflow;
  - the blocks `up`, `up-public`, `join`, `host-run`, `reset-password` and `reset-public-url`, run as written through `sh -c` with this build's binary on `PATH`, each machine a scratch home of its own.
- `.github/workflows/ci.yml`: a `readme` job (ubuntu, macOS) runs the `clone` and `build` blocks.
- `.github/workflows/nix.yml`: the `flake` job runs the `nix` block.
- `README.md`: introduction, Status, Quickstart and Recovery checked against the current code.

**Tech Stack:** Rust (edition 2024), POSIX `sh` and `awk` (BSD awk on macOS, mawk on ubuntu). No new crates; `libc::openpty` from the existing `libc` dependency.

**Spec:** client view §8, the row for 4f: "A README quickstart: build from source, `hennery up`, setup, pair", after 4c. Kernel §3.1 (setup link), §4.1 (pairing codes), §4.2 (admin commands); distribution §8 (data directories). The current code blocks are anchored on `main` at `82d41c0f`; the original execution below used `1e09a0c`. Commands and flags were checked against the built binary's help; claims, defaults and UI labels against the current source.

**Status:** written 2026-10-03; executed 2026-10-03 (see "Execution status"). Amended after its review of 2026-10-03 (opus, binding on the maintainer's behalf): "approve with amendments". A1 to A4 are taken, with O1 to O4 and N1 to N5, and the scoped re-confirmation (opus) "confirmed" them (see "What the review changed"). The 2026-10-13 accuracy review required B1/S1/S2 and the minors; they are implemented in the consolidated execution record. Current review and CI remain the parent's checks.

**How the code blocks were made and checked:**
- The code was built first on `scratch/4f`, and its CI ran on draft PR #122.
- The initial blocks were generated from that branch. The current blocks were refreshed from the actual files on `plan/frontend-4f` after its 2026-10-13 rebase.
- The plan was replayed from its own text onto `1e09a0c`, and the tree matched the scratch branch byte for byte.
- Every local probe in Step 6 was run and failed as written; the CI probes are recorded with their runs.

## Execution status (2026-10-13, consolidated)

Executed on `plan/frontend-4f`. The initial refresh rebased onto `4684d1d9`; after #133 merged, the final OAuth documentation rebased without conflicts onto `82d41c0f`. Both 4e-ii-b and 4f index entries were preserved.
The original 2026-10-03 plan and whole-branch opus reviews approved after
amendments; their historical CI/probe evidence is recorded below. The
2026-10-13 accuracy review of `4684d1d9..b30c11d6` returned **Needs fixes**.
Its B1, S1, S2 and all minors are now implemented. The opus re-check of
`f4519f2c` confirmed the changes and guardrail, apart from the HTTP URL
wording and unverified expired-link issuance. Both are addressed below;
current PR #125 checks remain the parent's responsibility. This is the
single execution record for plan 4f.

Review amendments, per the parent's wave-1 ruling:

- **B1:** `join` rejects HTTPS before enrollment. Remote hosts use an SSH
  tunnel and pair with `http://127.0.0.1:<port>`. The SSH command stays in
  prose, since CI has no remote SSH destination. The README explains that
  Add host's printed public-URL command must be adapted; the tunnel must
  stay open while the host runs, including reconnects. `host run` reads
  the stored `ws://127.0.0.1:<port>/api/hosts/ws` URL.
- **Guardrail:** only the `7117` port and `ABCD-EFGH` code explicitly marked
  as placeholders may be replaced. `pairing_script` validates the
  documented scheme/host and checks they remain unchanged. No complete
  URL substitution remains. `every_readme_block_is_run` invokes this
  validation before considering the README covered. Positive/unmarked,
  scheme-change and host-change tests were added. The integration test
  stops the joined host, waits until it is disconnected, and restarts it
  without a URL override, proving it reads the saved address again.
- **S1:** the Codex limitation now says default hat only, no hennery MCP
  servers in other hats, no per-hat isolation, and own `~/.codex` servers.
  The same default-hat restriction for Claude with `--use-cli` is stated.
- **S2:** bundled CLIs are not put on PATH. After runtime installation,
  run `hennery doctor` on each agent machine; check 4, `logged in`, reports
  each supported agent's login and prints a fix when not logged in.
- **Minors:** an expired link is refreshed with `admin setup-url`;
  same-machine proxies share the loopback password rate-limit budget;
  Add host may require password step-up; HTTP MCP URLs require the
  Internal network checkbox, including loopback; an empty project list is addressed with
  Browse under home or the repeatable `--workspace-root` flag on up/run.

The earlier refresh also corrected published-artifact wording, connected
host requirements, hats' role, passkey UI, supported architectures, download
contents, setup labels/origin, static-token and local stdio instructions,
delivery timing/restrictions and browser-session recovery wording.
The source audits and logs are in `.superpowers/sdd/4f/refresh-2026-10-13/`
and `.superpowers/sdd/4f/review-fixes-2026-10-13/`.

Verification before the final two re-check amendments (inside plain `nix develop`, scratch tool home,
worktree-local target):

- fmt and both required Clippy commands: exit 0.
- README suite before guardrail probes: exit 0, 23 passed.
- **G1–G6 probes:** removing the scheme, host, port-marker and code-marker
  guards each fails its intended existing test; changing the README join
  block's scheme or host fails `every_readme_block_is_run`. Each probe
  returned exit 101; Rust and README bytes were restored after each.
- Final README suite: exit 0, 23 passed. Guardrail suite alone: exit 0,
  3 passed. Script/guard suite excluding the two process tests: exit 0,
  21 passed. Four concurrent README copies: exit 0 each, 92 passes total.
- Workspace: exit 0, 1,971 passed, zero failures or ignored tests, 131
  result groups. Both generator `--check` commands: exit 0.
- Fresh replay from `4684d1d9` in the review-fixes ledger's `replay-1`:
  five extracted operations, five identical implementation files;
  complete tracked tree matched across 593 files after copying the
  plan/index records separately.
- `readme-blocks.sh --list` still covers nine named blocks; only `join`
  changes. The other eight blocks and their CI runners are unchanged.
- The earlier six exit-status probes covered success 0, refusal 1, bad
  arguments/unreadable file 2 and awk failure 3, all biting; those tests
  remain in the current suite.

Original CI evidence (2026-10-03, historical): C01 clone failed in run
37105283992, C02 nix failed in 37105283979, C03 omitted web build failed in
37106839944 on both OSes. Green runs 37106159259 (ci) and 37106159239 (nix)
on `eaf3aa7` met the original A4 condition; the current PR still needs its
own checks. Historical probes Q01–Q22 and R01–R11 also bit. Process cleanup
guards, such as kill/drop and timeout waits, remain guards rather than
independently reachable verdicts.

No web source changes; typecheck is not needed. The SSH route is checked
at its loopback endpoint without running SSH in the harness. Clone,
release build and Nix build stay with their existing CI runners.
No `.rulesync/` exists in this worktree. Plans 8g and 8h are deferred;
maintainer open questions stay out of the README.

Final re-check amendments:

- **N1:** the gateway's `model::parse_url` rejects every HTTP URL unless
  `internal_network` is true, for both create and update. The egress
  loopback exception does not bypass this API validation. The README now
  requires Internal network for plain HTTP, loopback included.
- **Expired setup link:** the admin handler calls `Operator::setup_link`;
  when `expires_at > now` is false, it calls `announce_setup`, which calls
  `issue_setup_token` and writes a new setup-url file. The README claim
  stays. A time-controlled readme test checks reuse just before expiry,
  a new link/file at the exact expiry, refusal of the old token and success
  of the fresh token. The process test also invokes the CLI and checks it
  prints the live link. No hour-long sleep or production time seam was added.
- Final README suite: exit 0, 24 passed; fmt and both Clippy commands:
  exit 0. Replacing expiry reissuance with cached-link reuse makes the
  new test fail at "the expired link was reused" (exit 101); the kernel
  source was restored byte for byte. The fresh re-check `replay-1` matched
  all five implementation files and all 593 tracked files after copying
  plan/index records. No production code change remains.

OAuth completion after #133 (2026-10-13):

- Both README TODOs are removed. Status now includes OAuth and the new
  prose subsection follows `ConnectionForm`, `OauthClientForm`,
  `OauthConnect`, `useMcpOauth`, `McpStatus`, `mcpOauth` and the merged
  4e-ii-b plan. No web or Rust code changed in this completion step.
- Exact choices: OAuth: automatic registration / OAuth: pre-registered
  client. Pre-registered Client ID, Client secret action, Public client
  (no secret), Set a new secret, Client secret and Save client match the UI.
  Saved client secrets are write-only. OAuth addresses require HTTPS or
  HTTP to this machine, matching the form and authorize URL checks.
- `GatewayState::redirect_uri` appends `CALLBACK_PATH` to the stored
  public_url origin: `<public_url>/api/mcp/oauth/callback`. The README
  says the vendor must allow it and names its location in pre-registered
  add/edit and client settings: Register this redirect URI at the vendor:.
- Connect/Reconnect opens vendor consent; blocked popups expose Open vendor
  sign-in. Password/passkey step-up is in the main window after closing
  the blank popup; a fresh offered action click is required, never an
  automatic authorize retry.
- Cards show the gateway's last report, Status recorded and Last checked.
  Probe now and Working do not establish live health. May need sign-in
  (needs_auth) calls for Reconnect, with the gateway note and outage caveat.
  No completed-sign-in promise, vendor wording parser or service-worker
  subscription claim is introduced.
- All nine README shell blocks are unchanged from `bb8922c8`; OAuth is
  prose. Final README tests: exit 0, 24 passed. Script-only suite: exit 0,
  18 passed; `readme-blocks.sh --list`: exit 0, nine names. Fresh replay
  from `82d41c0f`: five extracted operations, five identical implementation
  files, complete tracked tree matched across 611 files after copying
  plan/index records separately. Fmt/clippy are not repeated because no
  Rust source changed; no web typecheck is needed.
- Parent owns the final accuracy review, PR #125 checks/reviewDecision/
  mergeStateStatus/unresolved threads and merge. No current CI or new
  review approval is inferred.

## What the review changed

The review of 2026-10-03 (opus, binding on the maintainer's behalf): "approve with amendments".
- **A1, taken:** step 3 says that `--public-url` is ignored once set up, and how to move it with `reset-public-url`, after which the old address is refused.
- **A2, taken:** decision 10 lists every Status claim another lane delivers, and the PR stays a draft until each is checked.
- **A3, taken:** the scan fails closed (decision 1). Every new refusal has its own test and probe; the indented code block is a recorded gap.
- **A4, taken:** the `nix` block's green run and C01 to C03's failing runs are recorded in "Execution status".
- **O1 to O4, taken:** each `Here` name must be run by a test in the file. A prompt that fails kills the command's process group. Step 3 says the proxy runs on the collector's machine. The `is_shell` list is gone: anything not `sh` or a listed language is refused, and Q02 to Q04 probe that.
- **N1 to N5, taken:** "and are then removed" in Recovery. The Linux data directory as `$XDG_DATA_HOME/hennery`. Names cannot start with `-`. awk's own failure exits 3, with its test. The join's download is mentioned.

Its scoped re-confirmation (opus, 2026-10-03): "confirmed", A1 to A3 and every O and N resolved; A4 a merge condition (the green `nix` run and C03 recorded first). Its new nits are taken: N6, the terminal test's group kill only while the command runs; N7, the awk override is `README_BLOCKS_AWK`, not `AWK`, which a tester's environment may set. N8 is accepted as is.

## Scope

**1 task** (the README, its script, its tests and its CI), then the write-back.

**Out:**
- releases, installers, Homebrew and images (plan 7's publishing is the operator's);
- implementing MCP gateway screens (4e): this plan documents the merged **MCP** screen;
- new passkey screens: the README describes the existing setup offer and sign-in;
- configuring a tester's SSH server/tunnel or reverse proxy: the README names the working host route and optional browser HTTPS route, but implements neither.

## Decisions

1. **What counts as a shell example: a fenced block, and the scan fails closed** (the review's A3).
   - A fenced block is either ```` ```sh ````, tagged `<!-- check: <name> -->` on the line just before it, or in a language that is not shell: `toml`, `json`, `jsonc`, `yaml`, `yml`, `rust`, `ts`, `tsx`, `js`, `html`, `css`, `diff` or `mermaid`, in any case. Anything else is refused, tagged or not: no info string, `SH`, `bash`, `console`, `fish`, `text`, `{.sh}` and so on.
   - Refused too, each with a message of its own: a `~~~` fence, a fence in a block quote, a fence indented with a tab, a fence of four or more backticks, a carriage return anywhere, and a malformed tag (a name must match `[a-z0-9][a-z0-9-]*`, so `--list` cannot be one; the review's N3).
   - **Known gap:** an indented code block (four spaces, no fence) is not detected. Telling one from a list item's continuation needs a Markdown parser. The README has none, and a reviewer reading the README diff is the check.
   - Inline code spans name commands and flags; they are not examples. The old README's inline commands were the Development line (`nix develop`, then `cargo test --workspace`) and the Recovery section's `sqlite3` and SQL. The lane's ruling: Recovery is rewritten as tagged blocks, and anything nothing runs is dropped. The Development line goes too.
2. **One parser, in `sh`/`awk`.** CI must extract a block before anything is built, so the parser cannot be Rust. The Rust test calls the same script, so it cannot drift from what CI runs. Rejected:
   - a Rust-only parser, which CI could not call without a build;
   - a Markdown test runner, which is a new dependency;
   - a Playwright walk-through, which needs a browser to prove shell commands.
3. **Every name has one runner.** `BLOCKS` in `readme.rs` lists every name, in order, with its runner:
   - `Here` for a test in the file;
   - `Workflow(file)` when that workflow names it as `readme-blocks.sh README.md <name> `.
   `every_readme_block_is_run` fails on a new, renamed or removed block, and on a workflow that stops running its block.
4. **What runs where.**
   - **CI, `readme` job (ubuntu, macOS).**
     - `clone`: in a scratch directory. It clones `main`, not the change under test, so it checks the address and the directory name only.
     - `build`: in the checkout, as written: `pnpm install` and `pnpm build` in `web/`, then a release build with `HENNERY_WEB_REQUIRE=1`, then the `PATH` line. The job then runs `check-web-ui.sh "$(command -v hennery)"`, which proves both the `PATH` line and the embedded UI.
     - The job sets no `HENNERY_WEB_REQUIRE` itself, so the README's own prefix is what is tested.
   - **CI, `nix.yml`'s `flake` job:** `nix` (`nix build`, then `./result/bin/hennery --version`), after `nix flake check` has already built the package.
   - **`readme.rs`:** the rest, in two tests:
     - `up_and_the_recovery_commands_work_as_the_readme_says`;
     - `pairing_another_machine_works_as_the_readme_says`.
5. **How the tests differ from a tester's machine** (and only these):
   - `HENNERY_LISTEN=127.0.0.1:0`: `up` takes a free port, not 7117, so parallel tests and a developer's own hennery never clash.
   - **The adapter mirrors point at `127.0.0.1:1`,** so nothing is downloaded (no test reaches the network, #54). `up`'s host only warns. `host join` pairs, prints `paired as host-…`, then exits 1 with "but the adapter runtime was not installed". The test asserts exactly that, so a join that failed to pair fails the test.
   - **Each machine is a home of its own under `/tmp`** (`HOME` and `XDG_*`), so the default data directory is used as a tester's would be. `/tmp`, not the platform's temp dir, keeps the admin socket's path under the 104-byte limit on macOS. Every `HENNERY_*` variable of the runner's environment is removed, and so are `CLAUDE_CONFIG_DIR`, `CODEX_HOME` and `CODEX_SQLITE_HOME`.
   - **Only the explicitly marked join port and code** (`7117`, `ABCD-EFGH`) are replaced. The scheme and host remain `http://127.0.0.1`; `pairing_script` refuses anything else. The local listener stands in for the SSH tunnel's forwarded endpoint; SSH is prose, not a shell block. Three guardrail tests and G1–G6 prove this boundary.
6. **Remote hosts use an SSH tunnel, not HTTPS pairing.** `join` rejects any `https` URL because `wss` is not supported yet. The tunnel exposes the collector on the other machine's `http://127.0.0.1:<port>`. `join` stores `ws://127.0.0.1:<port>/api/hosts/ws`; `host run` uses that saved URL on later runs and reconnects. The Hosts panel prints the browser's stored public URL, so the README explains how to adapt it. A reverse proxy and `up --public-url` are for browser HTTPS only; their shared loopback password budget is stated. The `up-public` block is still run as written and its setup link must start with `https://hennery.example/setup#`.
7. **The setup link's origin is `localhost`.** `up` on `127.0.0.1:<port>` writes `http://localhost:<port>/setup#…`. The test signs in from that origin, as a browser opening the link would.
8. **The admin commands need a terminal** (kernel §4.2). The test runs them on a pseudo-terminal (`openpty`) and answers each prompt only once it shows. It then checks the effects:
   - `reset-password`: the old session is refused (401), the old password is refused, and the new one signs in (204). The password is never echoed.
   - `reset-public-url https://hennery.example`: sign-in from the new origin works (204), and from the old origin it is refused (403).
9. **Process cleanup.** `up` starts its children in process groups of their own. So a block's processes are found by walking `pgrep -P` from the shell:
   - `stop` sends SIGTERM to the shell's group and waits until every one of them is gone;
   - `Drop` kills each with SIGKILL and waits, so nothing writes into a home after it is removed. A first version killed only the group, and left a host child recreating its data directory after the test removed it.
10. **Status claims that other lanes deliver** (the review's A2). On `1e09a0c` the MCP and Settings views are placeholders. Each such claim is checked against `main` before the PR leaves draft, and dropped if its lane has not landed:
    - sessions from the browser, and step 4's labels ("New session", "Start session"): **4c**;
    - "The MCP gateway" bullet and step 4's MCP line: **4e**, the gateway screens;
    - Push: the Settings screen, where the browser subscribes, is not on the testers' path. The lane's ruling (2026-10-03): Push moves to the limitations ("built on the collector, no subscribe button in the web UI yet"), and the hats bullet no longer mentions notification settings.
    The lane decides, at the rebase, between waiting and dropping a bullet. Its ruling of 2026-10-03: 4f merges after 4e-i and 4e-ii and keeps the MCP lines, which are checked against `main` then; the sessions claims are checked once 4c-ii merges.
    The parent's 2026-10-13 brief narrows the remaining wait to OAuth Connect (4e-ii-b). All other claims are checked against `4684d1d9`, with static-token and local stdio quickstarts added. That merge is now main `82d41c0f` (#133); both OAuth TODOs are replaced with source-checked prose. Plans 8g and 8h remain deferred.
11. **The Codex limitation stays one line** (parent ruling, 2026-10-13): "Codex sessions get hennery MCP servers only in the host's default hat, without per-hat isolation, and also load the user's own `~/.codex` MCP servers; other hats get none, until per-hat isolation lands." Claude with `--use-cli` has the same default-hat-only restriction.
12. **Cost:** the `readme` job does a release build on each OS (about 15 minutes cold), with its own cache key. `-p hennery` builds the shipped binary only, as the existing `web` job does in debug.

## Global Constraints

- The five checks pass. No new crates; no wire change; no migration.
- No test reaches the network: every spawned process gets the offline mirrors.
- No test writes outside `/tmp/hennery-readme-<pid>-*` and the test's temp files.
- **Hotspots:** `.github/workflows/**` (`ci.yml`, `nix.yml`). Rebase last; the README is a conflict hotspot between lanes.
- Commits: Conventional Commits, the gmail identity.

## Review Focus

1. **Is every shell example run?** Expected: the script fails closed, and every name has a runner. Tests: `any_other_block_is_refused`, `a_shell_block_without_a_tag_is_refused`, the five fence tests, `a_malformed_tag_is_refused`, and `every_readme_block_is_run`. The last one also checks that each `Here` name is run by a test in the file (`block("<name>")`; the review's O1; a commented-out call would pass, N8, accepted).
2. **Do the runs prove what the README claims?** Expected: each block's effect is asserted, not just its exit status. Tests: the two run tests.
3. **Is the real home safe?** Expected: every spawn goes through `Machine::sh`, with a scratch home.
4. **Is the README honest for a tester?** Expected:
   - no command or flag that `--help` on `main` does not show;
   - the SSH tunnel and loopback-only host route stated up front, with no scheme/host repair hidden in the tests;
   - the first start's download and `master.key`'s backup said.

**Reading the steps.** Each block is one of:
- "Create `path`:" (a new file);
- "In `path`, replace:" with the exact text it replaces, which occurs once, then "with:".

Apply them in order.

## File structure

| File | Change |
|---|---|
| `packaging/readme-blocks.sh` | new: a README block by name, and the rules every shell block follows |
| `crates/hennery/tests/readme.rs` | new: the script's outcomes, the runner of every block, and the blocks run |
| `README.md` | Status, Quickstart and Recovery rewritten |
| `.github/workflows/ci.yml` | the `readme` job |
| `.github/workflows/nix.yml` | the `nix` block, after the package runs |

---

### Task 1: The README's quickstart, and every shell block run

- [ ] **Step 1: The script**

Create `packaging/readme-blocks.sh`:

`````sh
#!/bin/sh
# The README's shell examples (plan 4f). Every shell example in the README
# is a ```sh block, named on the line just before it:
#
#   <!-- check: up -->
#   ```sh
#   hennery up
#   ```
#
# and something runs each one: `crates/hennery/tests/readme.rs`, or a
# workflow (`ci.yml`, `nix.yml`) that runs this script's output.
#
# It fails closed: a fenced block is either a named ```sh block, or in a
# language that is not shell (the list in `BEGIN` below, in any case).
# Anything else is refused, so no shell example can hide from it.
#
# Usage: readme-blocks.sh <file> <name>    the block's lines, unindented
#        readme-blocks.sh <file> --list    every name, in order
#
# Exit status:
#   0  done;
#   1  the file breaks the rules, or it has no block of that name (the
#      message says which);
#   2  wrong arguments, or the file cannot be read;
#   3  awk itself failed.
#
# `README_BLOCKS_AWK` names the awk to run, for the tests; else `awk`.
set -eu

if [ $# -ne 2 ]; then
    echo "usage: readme-blocks.sh <file> <name> | readme-blocks.sh <file> --list" >&2
    exit 2
fi
file=$1
want=$2
if [ ! -f "$file" ] || [ ! -r "$file" ]; then
    echo "readme-blocks.sh: cannot read $file" >&2
    exit 2
fi

status=0
LC_ALL=C "${README_BLOCKS_AWK:-awk}" -v want="$want" '
function fail(msg) { print "readme-blocks.sh: " FILENAME ":" NR ": " msg > "/dev/stderr"; failed = 1; exit 1 }
BEGIN {
    split("toml json jsonc yaml yml rust ts tsx js html css diff mermaid", list, " ")
    for (k in list) not_shell[list[k]] = 1
    tag = ""; inblock = 0; found = 0; failed = 0
}
{
    line = $0
    if (line ~ /\r/) fail("a carriage return: use LF line endings")
    if (inblock) {
        if (line ~ /^ *```[ \t]*$/) { inblock = 0; next }
        if (keep) {
            body = line
            n = indent
            while (n > 0 && substr(body, 1, 1) == " ") { body = substr(body, 2); n-- }
            out = out body "\n"
        }
        next
    }
    if (line ~ /^[ \t>]*~~~/) fail("a ~~~ fence: use ``` for every block")
    if (line ~ /^[ \t]*>/ && line ~ /```/) fail("a fence in a block quote")
    if (line ~ /^[ \t]*```/ && line ~ /^ *\t/) fail("a fence indented with a tab")
    if (line ~ /^ *````/) fail("a fence of more than three backticks")
    if (line ~ /^ *```/) {
        match(line, /^ */)
        indent = RLENGTH
        info = substr(line, indent + 4)
        sub(/^[ \t]+/, "", info)
        sub(/[ \t].*$/, "", info)
        lower = tolower(info)
        if (lower in not_shell) {
            if (tag != "") fail("the tag " tag " is on a block in " info ", not a shell block")
            keep = 0
        } else if (info == "sh") {
            if (tag == "") fail("a shell block without a <!-- check: <name> --> line just before it")
            if (tag in seen) fail("the name " tag " is used twice")
            seen[tag] = 1
            names = names tag "\n"
            keep = (tag == want)
            if (keep) { found = 1; out = "" }
        } else {
            fail("a block in \"" info "\": a shell example is a named ```sh block; anything else names a language that is not shell")
        }
        inblock = 1
        openline = NR
        tag = ""
        next
    }
    if (tag != "") fail("the tag " tag " is not followed by a shell block")
    if (line ~ /<!-- *check/) {
        if (line !~ /^ *<!-- check: [a-z0-9][a-z0-9-]* -->[ \t]*$/) fail("a malformed tag: <!-- check: <name> -->, the name in a-z, 0-9 and -")
        tag = line
        sub(/^ *<!-- check: /, "", tag)
        sub(/ -->.*$/, "", tag)
    }
}
END {
    if (failed) exit 1
    if (inblock) { print "readme-blocks.sh: " FILENAME ":" openline ": a block never closed" > "/dev/stderr"; exit 1 }
    if (tag != "") { print "readme-blocks.sh: " FILENAME ": the tag " tag " is not followed by a shell block" > "/dev/stderr"; exit 1 }
    if (want == "--list") { printf "%s", names; exit 0 }
    if (!found) { print "readme-blocks.sh: " FILENAME ": no block named " want > "/dev/stderr"; exit 1 }
    printf "%s", out
}
' "$file" || status=$?
case $status in
    0 | 1) exit "$status" ;;
    *)
        echo "readme-blocks.sh: awk failed (exit status $status)" >&2
        exit 3
        ;;
esac
`````

- [ ] **Step 2: The tests**

Create `crates/hennery/tests/readme.rs`:

`````rust
//! The README's shell examples (plan 4f). Every one is a fenced block with
//! a name (`packaging/readme-blocks.sh`), and every name is run: here, or by
//! a workflow, which these tests check names it.
//!
//! The blocks run here run as written, through `sh -c`, with this build's
//! binary first on `PATH` as `hennery`, each in a scratch home of its own
//! (a machine of its own), never the real one. Only these differ from a
//! tester's machine, and the plan records why:
//! - `HENNERY_LISTEN=127.0.0.1:0`: `up` listens on a free port, not 7117;
//! - the adapter mirrors point at a port nothing listens on, so nothing is
//!   downloaded: `host join` pairs and then fails on the download;
//! - only the join block's explicitly marked port and code placeholders
//!   are replaced; its documented scheme and host must remain unchanged.
//!   The local listener stands in for the SSH tunnel's forwarded endpoint.

use std::io::{Read, Write};
use std::net::TcpStream;
use std::os::fd::{FromRawFd, OwnedFd};
use std::os::unix::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::{Command, ExitStatus, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

/// Where the managed runtime would be fetched from: nothing listens there.
const OFFLINE: &str = "http://127.0.0.1:1/";
/// The owner's password at setup.
const PASSWORD: &str = "correct horse battery";
/// The password `reset-password` sets.
const NEW_PASSWORD: &str = "a new password, typed twice";
/// The README's example public address.
const EXAMPLE_URL: &str = "https://hennery.example";
/// The README's example pairing code.
const EXAMPLE_CODE: &str = "ABCD-EFGH";
/// The README's explicitly marked tunnel-port placeholder.
const EXAMPLE_PORT: u16 = 7117;

/// Every block name in the README, in order, with what runs it.
const BLOCKS: [(&str, Runner); 9] = [
    ("clone", Runner::Workflow("ci.yml")),
    ("build", Runner::Workflow("ci.yml")),
    ("nix", Runner::Workflow("nix.yml")),
    ("up", Runner::Here),
    ("up-public", Runner::Here),
    ("join", Runner::Here),
    ("host-run", Runner::Here),
    ("reset-password", Runner::Here),
    ("reset-public-url", Runner::Here),
];

#[derive(Clone, Copy, Debug)]
enum Runner {
    /// A test in this file.
    Here,
    /// This workflow, through `readme-blocks.sh README.md <name>`.
    Workflow(&'static str),
}

fn repo() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../..")
}

/// `readme-blocks.sh <file> <arg>`: its exit status, output and errors.
fn blocks(file: &Path, arg: &str) -> (Option<i32>, String, String) {
    let out = Command::new("sh")
        .arg(repo().join("packaging/readme-blocks.sh"))
        .arg(file)
        .arg(arg)
        .env_remove("README_BLOCKS_AWK")
        .output()
        .unwrap();
    (
        out.status.code(),
        String::from_utf8(out.stdout).unwrap(),
        String::from_utf8(out.stderr).unwrap(),
    )
}

/// The README's block `name`.
fn block(name: &str) -> String {
    let (status, out, err) = blocks(&repo().join("README.md"), name);
    assert_eq!(status, Some(0), "{err}");
    out
}

/// Replace only the port and code the README explicitly marks as
/// placeholders. Never repair an unsupported URL by changing its origin.
fn pairing_script(script: &str, readme: &str, port: u16, code: &str) -> String {
    assert!(readme.contains(&format!("`{EXAMPLE_PORT}` is a placeholder")));
    assert!(readme.contains(&format!("`{EXAMPLE_CODE}` is a placeholder")));
    let address = |command: &str| {
        reqwest::Url::parse(command.split_whitespace().nth(3).expect("join URL")).expect("join URL parses")
    };
    let before = address(script);
    assert_eq!(
        before.scheme(),
        "http",
        "pairing substitution must not hide a scheme change"
    );
    assert_eq!(
        before.host_str(),
        Some("127.0.0.1"),
        "pairing substitution must not hide a host change"
    );
    assert_eq!(before.port(), Some(EXAMPLE_PORT));
    let port_placeholder = format!(":{EXAMPLE_PORT}");
    assert_eq!(script.matches(&port_placeholder).count(), 1, "{script}");
    assert_eq!(script.matches(EXAMPLE_CODE).count(), 1, "{script}");
    let substituted = script
        .replace(&port_placeholder, &format!(":{port}"))
        .replace(EXAMPLE_CODE, code);
    let after = address(&substituted);
    assert_eq!(after.scheme(), before.scheme(), "substitution changed the scheme");
    assert_eq!(after.host_str(), before.host_str(), "substitution changed the host");
    substituted
}

#[test]
fn pairing_substitution_only_changes_marked_port_and_code() {
    let readme = std::fs::read_to_string(repo().join("README.md")).unwrap();
    assert_eq!(
        pairing_script(&block("join"), &readme, 12345, "EFGH-IJKL"),
        "hennery host join http://127.0.0.1:12345 EFGH-IJKL\n"
    );
    for unmarked in ["`7117` is an example", "`ABCD-EFGH` is an example"] {
        let original = unmarked.replace("is an example", "is a placeholder");
        let changed = readme.replace(&original, unmarked);
        assert!(std::panic::catch_unwind(|| pairing_script(&block("join"), &changed, 12345, "EFGH-IJKL")).is_err());
    }
}

#[test]
fn pairing_substitution_cannot_hide_a_scheme_change() {
    let readme = std::fs::read_to_string(repo().join("README.md")).unwrap();
    let changed = block("join").replace("http://", "https://");
    assert!(std::panic::catch_unwind(|| pairing_script(&changed, &readme, 12345, "EFGH-IJKL")).is_err());
}

#[test]
fn pairing_substitution_cannot_hide_a_host_change() {
    let readme = std::fs::read_to_string(repo().join("README.md")).unwrap();
    let changed = block("join").replace("127.0.0.1", "localhost");
    assert!(std::panic::catch_unwind(|| pairing_script(&changed, &readme, 12345, "EFGH-IJKL")).is_err());
}

/// A scratch file holding `text`, removed on drop.
struct Fixture(PathBuf);

impl Fixture {
    fn new(text: &str) -> Self {
        let file = tempfile::Builder::new().suffix(".md").tempfile().unwrap();
        let (_, path) = file.keep().unwrap();
        std::fs::write(&path, text).unwrap();
        Self(path)
    }
}

impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.0);
    }
}

/// `readme-blocks.sh` on a file holding `text`.
fn blocks_of(text: &str, arg: &str) -> (Option<i32>, String, String) {
    let fixture = Fixture::new(text);
    blocks(&fixture.0, arg)
}

/// The script's refusal of `text`: exit 1, and `message` said.
fn refused(text: &str, message: &str) {
    let (status, out, err) = blocks_of(text, "--list");
    assert_eq!(status, Some(1), "out: {out}\nerr: {err}");
    assert!(err.contains(message), "{err}");
}

#[test]
fn a_named_block_is_printed_without_its_indent() {
    let text = "# t\n\n- a step:\n\n  <!-- check: one -->\n  ```sh\n  echo one\n    echo nested\n  ```\n\n<!-- check: two -->\n```sh title=x\necho two\n```\n";
    assert_eq!(
        blocks_of(text, "one"),
        (Some(0), "echo one\n  echo nested\n".into(), String::new())
    );
    assert_eq!(blocks_of(text, "two"), (Some(0), "echo two\n".into(), String::new()));
    assert_eq!(blocks_of(text, "--list"), (Some(0), "one\ntwo\n".into(), String::new()));
}

/// The languages that are not shell, in any case, need no tag.
#[test]
fn a_block_in_a_language_that_is_not_shell_needs_no_tag() {
    for info in [
        "toml", "json", "jsonc", "yaml", "yml", "rust", "ts", "tsx", "js", "html", "css", "diff", "mermaid", "TOML",
    ] {
        let text = format!("```{info}\nkey = 1\n```\n\n<!-- check: one -->\n```sh\necho one\n```\n");
        assert_eq!(
            blocks_of(&text, "--list"),
            (Some(0), "one\n".into(), String::new()),
            "{info}"
        );
    }
}

#[test]
fn a_shell_block_without_a_tag_is_refused() {
    refused(
        "text\n\n```sh\necho hi\n```\n",
        "a shell block without a <!-- check: <name> --> line",
    );
}

/// Fail closed: a block neither `sh` nor a language that is not shell is
/// refused, tagged or not.
#[test]
fn any_other_block_is_refused() {
    for info in [
        "",
        "SH",
        "bash",
        "shell",
        "console",
        "zsh",
        "fish",
        "text",
        "shell-session",
        "{.sh}",
    ] {
        refused(&format!("```{info}\necho hi\n```\n"), &format!("a block in \"{info}\""));
        refused(
            &format!("<!-- check: one -->\n```{info}\necho hi\n```\n"),
            &format!("a block in \"{info}\""),
        );
    }
}

#[test]
fn a_tag_must_be_just_before_a_shell_block() {
    refused(
        "<!-- check: one -->\n\n```sh\necho one\n```\n",
        "the tag one is not followed by a shell block",
    );
    refused("<!-- check: one -->\n", "the tag one is not followed by a shell block");
    refused(
        "<!-- check: one -->\n```toml\nk = 1\n```\n",
        "the tag one is on a block in toml",
    );
}

#[test]
fn a_malformed_tag_is_refused() {
    for tag in [
        "<!-- check: --list -->",
        "<!-- check: Up -->",
        "<!--check: up-->",
        "<!-- check:up -->",
    ] {
        refused(&format!("{tag}\n```sh\necho a\n```\n"), "a malformed tag");
    }
}

#[test]
fn a_name_used_twice_is_refused() {
    refused(
        "<!-- check: one -->\n```sh\necho a\n```\n<!-- check: one -->\n```sh\necho b\n```\n",
        "the name one is used twice",
    );
}

#[test]
fn a_block_never_closed_is_refused() {
    refused("<!-- check: one -->\n```sh\necho a\n", "a block never closed");
}

#[test]
fn a_tilde_fence_is_refused() {
    refused("~~~sh\necho a\n~~~\n", "a ~~~ fence");
    refused("> ~~~sh\n> echo a\n> ~~~\n", "a ~~~ fence");
}

#[test]
fn a_fence_in_a_block_quote_is_refused() {
    refused("> ```sh\n> echo a\n> ```\n", "a fence in a block quote");
}

#[test]
fn a_fence_indented_with_a_tab_is_refused() {
    refused("-\n\t```sh\n\techo a\n\t```\n", "a fence indented with a tab");
    refused("-\n  \t```sh\n  \techo a\n  \t```\n", "a fence indented with a tab");
}

#[test]
fn a_fence_of_more_backticks_is_refused() {
    refused("````sh\necho a\n````\n", "a fence of more than three backticks");
}

#[test]
fn a_carriage_return_is_refused() {
    refused("<!-- check: one -->\r\n```sh\r\necho a\r\n```\r\n", "a carriage return");
}

#[test]
fn a_missing_name_is_refused() {
    let (status, out, err) = blocks_of("<!-- check: one -->\n```sh\necho a\n```\n", "two");
    assert_eq!((status, out.as_str()), (Some(1), ""));
    assert!(err.contains("no block named two"), "{err}");
}

#[test]
fn wrong_arguments_exit_2() {
    let out = Command::new("sh")
        .arg(repo().join("packaging/readme-blocks.sh"))
        .arg(repo().join("README.md"))
        .output()
        .unwrap();
    assert_eq!(out.status.code(), Some(2));
    assert!(String::from_utf8_lossy(&out.stderr).contains("usage:"));
}

#[test]
fn an_unreadable_file_exits_2() {
    let (status, _, err) = blocks(Path::new("/nonexistent-hennery-test/README.md"), "--list");
    assert_eq!(status, Some(2));
    assert!(err.contains("cannot read"), "{err}");
}

/// awk failing is not mistaken for a broken file (1) or bad arguments (2).
#[test]
fn a_failing_awk_exits_3() {
    let awk = Fixture::new("#!/bin/sh\nexit 2\n");
    std::fs::set_permissions(&awk.0, std::os::unix::fs::PermissionsExt::from_mode(0o700)).unwrap();
    let readme = Fixture::new("<!-- check: one -->\n```sh\necho a\n```\n");
    let out = Command::new("sh")
        .arg(repo().join("packaging/readme-blocks.sh"))
        .arg(&readme.0)
        .arg("--list")
        .env("README_BLOCKS_AWK", &awk.0)
        .output()
        .unwrap();
    assert_eq!(out.status.code(), Some(3));
    assert!(
        String::from_utf8_lossy(&out.stderr).contains("awk failed (exit status 2)"),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
}

/// Every block of the README has a runner: these tests, or a workflow
/// that runs the script on it.
#[test]
fn every_readme_block_is_run() {
    let (status, names, err) = blocks(&repo().join("README.md"), "--list");
    assert_eq!(status, Some(0), "{err}");
    let expected: Vec<&str> = BLOCKS.iter().map(|(name, _)| *name).collect();
    assert_eq!(names.lines().collect::<Vec<_>>(), expected);
    let readme = std::fs::read_to_string(repo().join("README.md")).unwrap();
    pairing_script(&block("join"), &readme, 12345, "EFGH-IJKL");
    let here = std::fs::read_to_string(Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/readme.rs")).unwrap();
    for (name, runner) in BLOCKS {
        if let Runner::Here = runner {
            assert!(
                here.contains(&format!("block(\"{name}\")")),
                "no test here runs the block {name}"
            );
        }
        if let Runner::Workflow(file) = runner {
            let workflow = std::fs::read_to_string(repo().join(".github/workflows").join(file)).unwrap();
            assert!(
                workflow.contains(&format!("readme-blocks.sh README.md {name} ")),
                "{file} does not run the block {name}"
            );
        }
    }
}

// ---------------------------------------------------------------------
// The blocks run here.

/// A scratch machine: a home under `/tmp` (short, for the admin socket's
/// path), removed on drop.
struct Machine {
    home: PathBuf,
}

impl Machine {
    fn new(name: &str) -> Self {
        let home = PathBuf::from(format!("/tmp/hennery-readme-{}-{name}", std::process::id()));
        let _ = std::fs::remove_dir_all(&home);
        std::fs::create_dir_all(&home).unwrap();
        Self { home }
    }

    /// The platform's data directory under this home (distribution §8).
    fn data(&self) -> PathBuf {
        if cfg!(target_os = "macos") {
            self.home.join("Library/Application Support/hennery")
        } else {
            self.home.join(".local/share/hennery")
        }
    }

    /// `sh -c script` on this machine, with `hennery` on `PATH`.
    fn sh(&self, script: &str) -> Command {
        let bin = Path::new(env!("CARGO_BIN_EXE_hennery")).parent().unwrap();
        let path = std::env::var_os("PATH").unwrap_or_default();
        let mut paths = vec![bin.to_path_buf()];
        paths.extend(std::env::split_paths(&path));
        let mut cmd = Command::new("sh");
        cmd.arg("-c").arg(script).current_dir(&self.home);
        for (var, _) in std::env::vars_os() {
            if var.to_string_lossy().starts_with("HENNERY_") {
                cmd.env_remove(var);
            }
        }
        cmd.env("PATH", std::env::join_paths(paths).unwrap())
            .env("HOME", &self.home)
            .env("XDG_DATA_HOME", self.home.join(".local/share"))
            .env("XDG_CONFIG_HOME", self.home.join(".config"))
            .env("XDG_STATE_HOME", self.home.join(".local/state"))
            .env("XDG_CACHE_HOME", self.home.join(".cache"))
            .env_remove("CLAUDE_CONFIG_DIR")
            .env_remove("CODEX_HOME")
            .env_remove("CODEX_SQLITE_HOME")
            .env("HENNERY_NPM_REGISTRY", OFFLINE)
            .env("HENNERY_NODE_MIRROR", OFFLINE)
            .env("HENNERY_LISTEN", "127.0.0.1:0");
        cmd
    }

    /// `script` started in a process group of its own, its output in
    /// `<home>/<log>`.
    fn start(&self, script: &str, log: &str) -> Group {
        let log = self.home.join(log);
        let child = self
            .sh(script)
            .process_group(0)
            .stdin(Stdio::null())
            .stdout(std::fs::File::create(&log).unwrap())
            .stderr(std::fs::File::create(log.with_extension("err")).unwrap())
            .spawn()
            .unwrap();
        Group { child, log }
    }
}

impl Drop for Machine {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.home);
    }
}

/// A long-running block's process group: killed on drop.
struct Group {
    child: std::process::Child,
    log: PathBuf,
}

impl Group {
    fn pgid(&self) -> i32 {
        self.child.id() as i32
    }

    fn output(&self) -> String {
        let out = std::fs::read_to_string(&self.log).unwrap_or_default();
        let err = std::fs::read_to_string(self.log.with_extension("err")).unwrap_or_default();
        format!("{out}{err}")
    }

    /// Wait for `what` to hold, failing with the group's output after 60 s.
    fn wait_until(&mut self, what: &str, mut done: impl FnMut() -> bool) {
        let deadline = Instant::now() + Duration::from_secs(60);
        while !done() {
            if let Ok(Some(status)) = self.child.try_wait() {
                panic!("it exited ({status}) before {what}:\n{}", self.output());
            }
            assert!(Instant::now() < deadline, "no {what} within 60 s:\n{}", self.output());
            std::thread::sleep(Duration::from_millis(100));
        }
    }

    /// The collector's address, from its "collector listening" line.
    fn listening(&mut self) -> String {
        let mut address = String::new();
        let log = self.log.clone();
        self.wait_until("collector listening", || {
            let text = strip_ansi(&complete_lines(&log));
            match text
                .lines()
                .filter(|line| line.contains("collector listening"))
                .find_map(|line| line.split_whitespace().find_map(|f| f.strip_prefix("address=")))
            {
                Some(found) => {
                    address = found.to_string();
                    true
                }
                None => false,
            }
        });
        address
    }

    /// Every process started under this group's shell, as far down as they
    /// go: `up` starts its children in process groups of their own.
    fn processes(&self) -> Vec<i32> {
        let mut all = vec![self.pgid()];
        let mut next = 0;
        while next < all.len() {
            // pgrep: 0 found, 1 none; anything else, or no pgrep at all,
            // must not pass as "none" (the children would be left behind).
            let out = Command::new("pgrep")
                .args(["-P", &all[next].to_string()])
                .output()
                .expect("run pgrep");
            assert!(matches!(out.status.code(), Some(0 | 1)), "pgrep failed: {out:?}");
            all.extend(
                String::from_utf8_lossy(&out.stdout)
                    .lines()
                    .filter_map(|line| line.trim().parse::<i32>().ok()),
            );
            next += 1;
        }
        all
    }

    /// Whether any of `pids` is still running.
    fn any_alive(pids: &[i32]) -> bool {
        // SAFETY: kill(2) with signal 0 only checks the process exists.
        pids.iter().any(|&pid| unsafe { libc::kill(pid, 0) } == 0)
    }

    /// SIGTERM to the group, as Ctrl-C's SIGINT would be: it and every
    /// process under it must be gone within 20 s.
    fn stop(&mut self) {
        let mut pids = self.processes();
        // SAFETY: kill(2) on this test's own process group.
        unsafe { libc::kill(-self.pgid(), libc::SIGTERM) };
        let deadline = Instant::now() + Duration::from_secs(20);
        loop {
            // Once the shell is reaped its id may be another's: stop asking.
            if let Ok(Some(_)) = self.child.try_wait() {
                pids.retain(|&pid| pid != self.pgid());
            }
            if !Self::any_alive(&pids) {
                return;
            }
            assert!(
                Instant::now() < deadline,
                "still running 20 s after SIGTERM:\n{}",
                self.output()
            );
            std::thread::sleep(Duration::from_millis(100));
        }
    }
}

impl Drop for Group {
    /// Kill everything under the shell while it runs, and wait until it is
    /// gone, so that nothing writes into the machine's home after it is
    /// removed. A shell already reaped (after `stop`, or one that exited)
    /// is left alone: its id may be another's.
    fn drop(&mut self) {
        if !matches!(self.child.try_wait(), Ok(None)) {
            return;
        }
        let pids = self.processes();
        for &pid in &pids {
            // SAFETY: kill(2) on processes this test started.
            unsafe { libc::kill(pid, libc::SIGKILL) };
        }
        let _ = self.child.wait();
        let deadline = Instant::now() + Duration::from_secs(10);
        while Self::any_alive(&pids[1..]) && Instant::now() < deadline {
            std::thread::sleep(Duration::from_millis(50));
        }
    }
}

/// The complete lines of `log`: a line still being written could end
/// mid-port.
fn complete_lines(log: &Path) -> String {
    let text = std::fs::read_to_string(log).unwrap_or_default();
    match text.rfind('\n') {
        Some(end) => text[..=end].to_string(),
        None => String::new(),
    }
}

/// `line` without terminal colour codes (`ESC [ … m`).
fn strip_ansi(line: &str) -> String {
    let mut out = String::with_capacity(line.len());
    let mut chars = line.chars();
    while let Some(c) = chars.next() {
        if c == '\u{1b}' {
            for c in chars.by_ref() {
                if c == 'm' {
                    break;
                }
            }
        } else {
            out.push(c);
        }
    }
    out
}

/// One HTTP/1.1 request to `listen`: the status and the whole response.
fn request(listen: &str, method: &str, path: &str, headers: &[(&str, &str)], body: &str) -> (u16, String) {
    let mut stream = TcpStream::connect(listen).unwrap();
    stream.set_read_timeout(Some(Duration::from_secs(15))).unwrap();
    let mut head = format!("{method} {path} HTTP/1.1\r\nHost: {listen}\r\nConnection: close\r\n");
    for (name, value) in headers {
        head.push_str(&format!("{name}: {value}\r\n"));
    }
    if !body.is_empty() {
        head.push_str("Content-Type: application/json\r\n");
    }
    head.push_str(&format!("Content-Length: {}\r\n\r\n{body}", body.len()));
    stream.write_all(head.as_bytes()).unwrap();
    let mut response = String::new();
    stream.read_to_string(&mut response).unwrap();
    let status = response.split(' ').nth(1).and_then(|s| s.parse().ok()).unwrap_or(0);
    (status, response)
}

/// The `hennery_session` cookie a response sets.
fn session_of(response: &str) -> String {
    response
        .lines()
        .find_map(|line| {
            let (name, value) = line.split_once(':')?;
            let value = value.trim().strip_prefix("hennery_session=")?;
            name.eq_ignore_ascii_case("set-cookie")
                .then(|| value.split(';').next().unwrap().to_string())
        })
        .unwrap_or_else(|| panic!("no session cookie: {response}"))
}

/// What the setup page does: the link's token, a password and the origin
/// the browser is at. The owner's session.
fn set_up(listen: &str, setup_url: &str, origin: &str) -> String {
    let token = setup_url.trim_end().rsplit_once('#').unwrap().1;
    let body = serde_json::json!({ "token": token, "password": PASSWORD, "public_url": origin }).to_string();
    let (status, response) = request(listen, "POST", "/api/setup", &[("Origin", origin)], &body);
    assert_eq!(status, 201, "{response}");
    session_of(&response)
}

/// Sign in with `password` from `origin`: the status.
fn log_in(listen: &str, origin: &str, password: &str) -> u16 {
    let body = serde_json::json!({ "password": password }).to_string();
    request(listen, "POST", "/api/auth/login", &[("Origin", origin)], &body).0
}

/// `GET /api/hosts` with `session`: the status and the hosts.
fn hosts(listen: &str, session: &str) -> (u16, Vec<serde_json::Value>) {
    let cookie = format!("hennery_session={session}");
    let (status, response) = request(listen, "GET", "/api/hosts", &[("Cookie", &cookie)], "");
    let body = response.split_once("\r\n\r\n").map(|(_, b)| b).unwrap_or("");
    let hosts = serde_json::from_str::<Vec<serde_json::Value>>(body).unwrap_or_default();
    (status, hosts)
}

/// The setup link `up` wrote, once it has.
fn setup_url(group: &mut Group, machine: &Machine) -> String {
    let file = machine.data().join("collector/setup-url");
    let mut url = String::new();
    group.wait_until("the setup link", || {
        url = std::fs::read_to_string(&file).unwrap_or_default();
        url.contains('#')
    });
    url.trim_end().to_string()
}

/// `cmd`'s output, failing the test if it runs longer than `limit`.
fn output_within(cmd: &mut Command, limit: Duration) -> std::process::Output {
    let child = cmd
        .process_group(0)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let pid = child.id() as i32;
    let (done, waited) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let _ = done.send(child.wait_with_output());
    });
    match waited.recv_timeout(limit) {
        Ok(out) => out.unwrap(),
        Err(_) => {
            // SAFETY: kill(2) on this test's own process group, still running.
            unsafe { libc::kill(-pid, libc::SIGKILL) };
            panic!("still running after {limit:?}");
        }
    }
}

/// A command on a terminal, its process group killed on drop: a test that
/// fails mid-prompt leaves nothing waiting on the terminal.
struct KillOnDrop(std::process::Child);

impl Drop for KillOnDrop {
    fn drop(&mut self) {
        // Only while it runs: once reaped, its id may be another's.
        if let Ok(None) = self.0.try_wait() {
            // SAFETY: kill(2) on this test's own process group.
            unsafe { libc::kill(-(self.0.id() as i32), libc::SIGKILL) };
            let _ = self.0.wait();
        }
    }
}

/// Run `script` with a terminal on its standard input and error, as a
/// person would: each `(prompt, answer)` answered once `prompt` shows. Its
/// exit status, its standard output, and what the terminal showed.
fn on_a_terminal(machine: &Machine, script: &str, answers: &[(&str, &str)]) -> (ExitStatus, String, String) {
    let (mut master, mut slave) = (0, 0);
    // SAFETY: openpty(3) into two descriptors, with no name, settings or size.
    let made = unsafe {
        libc::openpty(
            &mut master,
            &mut slave,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
        )
    };
    assert_eq!(made, 0, "openpty: {}", std::io::Error::last_os_error());
    // SAFETY: both descriptors were just opened, and are owned here alone.
    let (master, slave) = unsafe { (std::fs::File::from_raw_fd(master), OwnedFd::from_raw_fd(slave)) };
    let mut child = KillOnDrop(
        machine
            .sh(script)
            .process_group(0)
            .stdin(Stdio::from(slave.try_clone().unwrap()))
            .stderr(Stdio::from(slave))
            .stdout(Stdio::piped())
            .spawn()
            .unwrap(),
    );
    let child = &mut child.0;
    let shown = Arc::new(Mutex::new(String::new()));
    let reader = {
        let shown = shown.clone();
        let mut master = master.try_clone().unwrap();
        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            while let Ok(n) = master.read(&mut buf) {
                if n == 0 {
                    break;
                }
                shown.lock().unwrap().push_str(&String::from_utf8_lossy(&buf[..n]));
            }
        })
    };
    let mut writer = master;
    let mut seen = 0;
    for (prompt, answer) in answers {
        let deadline = Instant::now() + Duration::from_secs(30);
        loop {
            let text = shown.lock().unwrap().clone();
            if let Some(at) = text[seen..].find(prompt) {
                seen += at + prompt.len();
                break;
            }
            if let Ok(Some(status)) = child.try_wait() {
                panic!("it exited ({status}) before asking {prompt:?}:\n{text}");
            }
            assert!(Instant::now() < deadline, "no {prompt:?} within 30 s:\n{text}");
            std::thread::sleep(Duration::from_millis(50));
        }
        writer.write_all(format!("{answer}\n").as_bytes()).unwrap();
    }
    let deadline = Instant::now() + Duration::from_secs(30);
    let status = loop {
        if let Some(status) = child.try_wait().unwrap() {
            break status;
        }
        if Instant::now() > deadline {
            panic!("still running after 30 s:\n{}", shown.lock().unwrap());
        }
        std::thread::sleep(Duration::from_millis(50));
    };
    let mut stdout = String::new();
    child.stdout.take().unwrap().read_to_string(&mut stdout).unwrap();
    drop(writer);
    // The reader ends at the terminal's end, once no process holds it;
    // not joined, so a descriptor some grandchild kept cannot hang the test.
    drop(reader);
    let shown = shown.lock().unwrap().clone();
    (status, stdout, shown)
}

/// The admin command calls this time-aware method: a live link is reused,
/// but at its expiry it mints and writes a fresh one without a restart.
#[test]
fn an_expired_setup_link_is_reissued_as_the_readme_says() {
    use hennery_kernel::operator::{Operator, SETUP_TOKEN_TTL_SECS, SetupOutcome};

    let dir = tempfile::tempdir().unwrap();
    let operator = Operator::open(&dir.path().join("hennery.db")).unwrap();
    let origin = "http://localhost:7117";
    let now = 1000;
    let old = operator.announce_setup(dir.path(), origin, now).unwrap().unwrap();
    let expiry = now + SETUP_TOKEN_TTL_SECS;
    let live = operator.setup_link(dir.path(), origin, expiry - 1).unwrap().unwrap();
    assert!(live.url == old.url, "a live link was replaced");
    let fresh = operator.setup_link(dir.path(), origin, expiry).unwrap().unwrap();
    assert!(fresh.url != old.url, "the expired link was reused");
    assert!(
        std::fs::read_to_string(&fresh.file).unwrap().trim_end() == fresh.url,
        "the setup-url file does not hold the fresh link"
    );
    let old_token = old.url.rsplit_once('#').unwrap().1;
    let fresh_token = fresh.url.rsplit_once('#').unwrap().1;
    assert_eq!(
        operator.set_up(old_token, PASSWORD, origin, expiry).unwrap(),
        SetupOutcome::InvalidToken
    );
    assert!(matches!(
        operator.set_up(fresh_token, PASSWORD, origin, expiry).unwrap(),
        SetupOutcome::Done { .. }
    ));
}

/// Quickstart step 2 and the recovery commands: `hennery up` writes a setup
/// link that sets the collector up; `reset-password` sets a password that
/// signs in where the old one no longer does; `reset-public-url` moves the
/// origin sign-ins are accepted from.
#[test]
fn up_and_the_recovery_commands_work_as_the_readme_says() {
    let machine = Machine::new("up");
    let mut up = machine.start(&block("up"), "up.log");
    let listen = up.listening();
    let link = setup_url(&mut up, &machine);
    // The link's origin is the browser's, and the one sign-ins come from.
    let port = listen.rsplit_once(':').unwrap().1;
    let origin = format!("http://localhost:{port}");
    assert!(link.starts_with(&format!("{origin}/setup#")), "{link}");
    let setup_command = output_within(&mut machine.sh("hennery admin setup-url"), Duration::from_secs(60));
    assert!(setup_command.status.success(), "setup-url command failed");
    assert!(
        String::from_utf8(setup_command.stdout).unwrap().trim_end() == link,
        "setup-url did not print the live link"
    );
    let session = set_up(&listen, &link, &origin);
    assert_eq!(hosts(&listen, &session).0, 200);

    let (status, stdout, shown) = on_a_terminal(
        &machine,
        &block("reset-password"),
        &[
            ("New password: ", NEW_PASSWORD),
            ("The same again: ", NEW_PASSWORD),
            ("Type yes to go on: ", "yes"),
        ],
    );
    assert!(status.success(), "{status}: {stdout}\n{shown}");
    assert!(
        stdout.starts_with("The password is reset; 1 session(s) signed out"),
        "{stdout}"
    );
    assert!(!shown.contains(NEW_PASSWORD), "the password was echoed: {shown}");
    assert_eq!(hosts(&listen, &session).0, 401, "the old session still works");
    assert_eq!(log_in(&listen, &origin, PASSWORD), 401);
    assert_eq!(log_in(&listen, &origin, NEW_PASSWORD), 204);

    let script = block("reset-public-url");
    assert!(script.contains(EXAMPLE_URL), "{script}");
    let (status, stdout, shown) = on_a_terminal(&machine, &script, &[("Type yes to go on: ", "yes")]);
    assert!(status.success(), "{status}: {stdout}\n{shown}");
    assert!(
        stdout.starts_with(&format!("public_url is now {EXAMPLE_URL};")),
        "{stdout}"
    );
    assert_eq!(log_in(&listen, EXAMPLE_URL, NEW_PASSWORD), 204);
    assert_eq!(
        log_in(&listen, &origin, NEW_PASSWORD),
        403,
        "the old origin is still accepted"
    );

    up.stop();
}

/// Quickstart step 3: `up --public-url` sets up at that address, and the
/// join block, given only a tunnel port and a code from "Add host", pairs
/// another machine whose `host run` reconnects through the saved URL.
#[test]
fn pairing_another_machine_works_as_the_readme_says() {
    let collector = Machine::new("collector");
    let script = block("up-public");
    assert!(script.contains(EXAMPLE_URL), "{script}");
    let mut up = collector.start(&script, "up.log");
    let listen = up.listening();
    let link = setup_url(&mut up, &collector);
    assert!(link.starts_with(&format!("{EXAMPLE_URL}/setup#")), "{link}");
    let session = set_up(&listen, &link, EXAMPLE_URL);
    up.wait_until("up's own host", || hosts(&listen, &session).1.len() == 1);

    // "Add host": what the Hosts screen mints, just after setup.
    let cookie = format!("hennery_session={session}");
    let (status, response) = request(
        &listen,
        "POST",
        "/api/hosts/pairing-codes",
        &[("Origin", EXAMPLE_URL), ("Cookie", &cookie)],
        "",
    );
    assert_eq!(status, 201, "{response}");
    let body = response.split_once("\r\n\r\n").unwrap().1;
    let code = serde_json::from_str::<serde_json::Value>(body).unwrap()["code"]
        .as_str()
        .unwrap()
        .to_string();

    let other = Machine::new("other");
    let readme = std::fs::read_to_string(repo().join("README.md")).unwrap();
    let port = listen.rsplit_once(':').unwrap().1.parse().unwrap();
    let join = pairing_script(&block("join"), &readme, port, &code);
    let out = output_within(other.sh(&join).stdin(Stdio::null()), Duration::from_secs(60));
    let (stdout, stderr) = (
        String::from_utf8_lossy(&out.stdout),
        String::from_utf8_lossy(&out.stderr),
    );
    // Paired; then, offline, the adapters' download fails, and only that.
    assert!(stdout.contains("paired as host-"), "{stdout}\n{stderr}");
    assert_eq!(out.status.code(), Some(1), "{stdout}\n{stderr}");
    assert!(stderr.contains("but the adapter runtime was not installed"), "{stderr}");

    let mut host = other.start(&block("host-run"), "host.log");
    host.wait_until("both hosts connected", || {
        let listed = hosts(&listen, &session).1;
        listed.len() == 2 && listed.iter().all(|h| h["connected"] == true)
    });
    host.stop();
    up.wait_until("the stopped host disconnected", || {
        let listed = hosts(&listen, &session).1;
        listed.len() == 2 && listed.iter().filter(|h| h["connected"] == true).count() == 1
    });
    // A later run reads the saved loopback URL, without a URL override.
    let mut host = other.start(&block("host-run"), "host-restarted.log");
    host.wait_until("the restarted host connected through its saved URL", || {
        let listed = hosts(&listen, &session).1;
        listed.len() == 2 && listed.iter().all(|h| h["connected"] == true)
    });
    host.stop();
    up.stop();
}
`````

Run: `nix develop -c cargo test -p hennery --test readme --locked`
Expected: FAIL. The script's seventeen parser tests and the expiry unit test pass. The runner/placeholder guard tests fail because the README has no tagged blocks yet; the two process tests fail with "no block named up" and "no block named up-public".

- [ ] **Step 3: The README**

In `README.md`, replace:

`````markdown
# hennery

hennery is a self-hosted cockpit for coding agents. It lets one developer drive
[Agent Client Protocol](https://agentclientprotocol.com) (ACP) sessions — Claude
Code, Codex, or any other ACP adapter — running on any of their machines, from a
single browser tab or a phone. It also includes an MCP gateway: authorize an
integration once, then choose which hosts and projects are allowed to use it.

hennery never proxies agent licences. You bring your own subscriptions and log in
to each agent CLI on your own machines; hennery only drives the sessions.

## Status

**Pre-alpha.** Nothing is usable yet. A walking skeleton exists: a Rust
workspace where a host runs an ACP adapter per session and relays it to a
collector over a WebSocket (see
[the plan](docs/plans/2026-09-26-walking-skeleton.md)). Hosts pair with the
collector once and prove their key on every connection. The REST/SSE API is
behind the operator's session: on its first start the collector writes a
one-time setup link (valid for an hour), and the operator sets a password there
and signs in with it afterwards (see
[the operator auth plan](docs/plans/2026-10-02-operator-auth.md)). Everything
else — passkeys, hats, the MCP gateway, the frontend, distribution — is still
design, in [`docs/specs/`](docs/specs/). Expect everything to change.

Development uses the Nix flake dev shell: `nix develop` (or `direnv allow`),
then `cargo test --workspace`.

## Recovery

There is no admin command for these yet; both are done by hand, with the
collector stopped. The database is `<data-dir>/hennery.db` for
`hennery collector`, and `<data-dir>/collector/hennery.db` for `hennery up`.
Open it with `nix shell nixpkgs#sqlite -c sqlite3 <path to hennery.db>`.

- **The collector moved** (another port, or behind a proxy on another origin):
  every state-changing request, login included, is refused with
  `origin_mismatch`, because it must come from the stored `public_url`. Store
  the origin the browser now uses, e.g.
  `UPDATE settings SET value = 'https://hennery.example' WHERE key = 'public_url';`
  It must be `https://`, or `http://` to a loopback address, with no path.
  `http://localhost:7117` and `http://127.0.0.1:7117` are different origins:
  use the one in the browser's address bar.
- **A forgotten password:** remove the owner, in this order (the other tables
  point at `owners`):
  `DELETE FROM auth_sessions; DELETE FROM password_credentials; DELETE FROM settings; DELETE FROM owners;`
  On its next start the collector has no owner and writes a fresh setup link.

## Licence

hennery is licensed under the [GNU Affero General Public License v3.0](LICENSE).

`````

with:

`````markdown
# hennery

hennery is a self-hosted cockpit for coding agents. It lets one developer drive
[Agent Client Protocol](https://agentclientprotocol.com) (ACP) sessions — Claude
Code, Codex, or any other ACP adapter — running on any of their machines, from a
single browser tab or a phone. It also includes an MCP gateway: connect a
server once, then choose its hat and the hosts whose sessions may use it.

hennery never proxies agent licences. You bring your own subscriptions and log in
to each agent CLI on your own machines; hennery only drives the sessions.

## Status

**Early testing.** hennery is ready for early testers who build it from
source. There are no published releases, installers or images yet, and stored
data may not survive an upgrade: expect things to change.

What works:

- **Sessions from the browser.** The collector serves its web UI from the
  binary. From it you start Claude Code and Codex sessions on a connected,
  paired machine, prompt them, answer their permission requests, and park
  and resume them.
- **Hats.** Path rules put each session in a hat by its project directory,
  for organising sessions and choosing their MCP servers.
- **MCP servers.** Connect a server with a static token or OAuth through the
  gateway, or configure local stdio servers for a host and hat, on the **MCP** screen.

Known limitations:

- One owner per collector. Setup requires a password; it also offers a
  passkey, which you can use to sign in afterwards.
- Web Push is built on the collector, but the web UI has no subscribe
  button yet.
- Codex sessions get hennery MCP servers only in the host's default hat, without per-hat isolation, and also load the user's own `~/.codex` MCP servers; other hats get none, until per-hat isolation lands.
- Hosts cannot connect over `wss://` yet; remote hosts reach the collector
  through an SSH tunnel.
- The designs are in [`docs/specs/`](docs/specs/) and the plans in
  [`docs/plans/`](docs/plans/); [`docs/README.md`](docs/README.md) lists
  them.

## Quickstart

You need [Nix](https://nixos.org/download/) with flakes enabled, and on
every machine that runs agents, the CLI for each agent you want to use
already logged in with your own subscription. The flake supports Apple
Silicon macOS, and x86_64 and aarch64 Linux.
The bundled CLIs are not added to your `PATH`. After `up` or `host join`
installs the runtime, run `hennery doctor` on each agent machine. Check 4,
**logged in**, reports whether each agent is logged in and prints a fix when
it is not; doctor does not log in for you.

### 1. Build

Get the source:

<!-- check: clone -->
```sh
git clone https://github.com/marcinwadon/hennery.git
cd hennery
```

Build the web UI, then the binary, which embeds it. The dev shell brings
Rust, Node and pnpm; with direnv, `direnv allow` once and leave out the
`nix develop -c` prefixes. `HENNERY_WEB_REQUIRE=1` makes the build fail if
the web UI was not built first, instead of embedding a placeholder page.

<!-- check: build -->
```sh
nix develop -c pnpm --dir web install --frozen-lockfile
nix develop -c pnpm --dir web build
HENNERY_WEB_REQUIRE=1 nix develop -c cargo build --release --locked -p hennery
export PATH="$PWD/target/release:$PATH"
```

Or let Nix build the whole package:

<!-- check: nix -->
```sh
nix build
./result/bin/hennery --version
```

The binary is then `result/bin/hennery`; put that directory on your `PATH`
instead.

### 2. Start

<!-- check: up -->
```sh
hennery up
```

`hennery up` runs the collector and a host for this machine, and pairs the
two. It listens on `http://127.0.0.1:7117` and keeps its data in
`~/Library/Application Support/hennery` (macOS) or `$XDG_DATA_HOME/hennery`,
by default `~/.local/share/hennery` (Linux). The first start downloads Node
and the managed adapter set, including its bundled agent CLIs.

On its first start it writes a one-time setup link, valid for an hour, to
`collector/setup-url` in the data directory until setup, and prints the link
when running in a terminal. Open that link: by default it uses
`http://localhost:7117`, which is the browser origin to keep using. Choose
and confirm a password of at least 12 characters, check **Public URL** and
**Default hat**, then press **Set up**. You are signed in; add a passkey or
press **Skip** (or **Continue** if passkeys are unavailable). Back up
`collector/master.key` together with `collector/hennery.db`: the gateway's
credentials cannot be read without it.
If the setup link has expired, `hennery admin setup-url` prints a fresh one.

### 3. Pair another machine

Hosts currently connect only over loopback HTTP. On the other machine,
open an SSH tunnel to the collector with
`ssh -N -L 7117:127.0.0.1:7117 <collector-machine>`; replace
`<collector-machine>` with your SSH destination. Keep this terminal open
while pairing and while `hennery host run` runs. If local port 7117 is
already in use, choose another local port in the tunnel and join command.

For browser access over HTTPS, a reverse proxy on the collector's machine
can serve `up` at an `https://` address. This does not enable secure
WebSockets for hosts; they still use the tunnel. If `up` is already running,
stop it with Ctrl-C and restart it with that address before setup:

<!-- check: up-public -->
```sh
hennery up --public-url https://hennery.example
```

Already set up at `localhost`? Then `--public-url` is ignored: move it
with `hennery admin reset-public-url` (see [Recovery](#recovery)), and from
then on open hennery at the new address, since the old one is refused.
With a same-machine reverse proxy, all remote clients share the loopback
rate-limit budget, so exposing the collector lets anyone lock out password
sign-in by submitting wrong passwords.

In the web UI, **Hosts → Add host** shows a pairing code, valid for ten
minutes, after asking for your password again if a fresh step-up is needed.
Its printed command uses the public URL; adapt it to the tunnel's
`http://127.0.0.1` address as below. Build hennery on the other machine and
run the join command in another terminal (it also downloads the runtime).
In this block, `7117` is a placeholder for the tunnel's local port, and
`ABCD-EFGH` is a placeholder for the code shown by **Add host**. Replace
them with your port and code; leave the code out to type it instead and
keep it out of shell history. Keep the `http://127.0.0.1` scheme and host:

<!-- check: join -->
```sh
hennery host join http://127.0.0.1:7117 ABCD-EFGH
```

<!-- check: host-run -->
```sh
hennery host run
```

`host run` uses the saved `ws://127.0.0.1:<port>/api/hosts/ws` URL, including
when it reconnects. Keep the same tunnel port available on future runs.

### 4. Start a session

**New session**: pick a connected host, an agent and a project directory, then
**Start session**, and type your first prompt.
Unless workspace roots are configured, the project list is empty: use
**Browse** under the host user's home, or pass `--workspace-root <directory>`
to `up` or `host run` to list repositories under that root. The flag is
repeatable.

### 5. Connect an MCP server

For a remote server with a static token, open **MCP → Add connection**.
Fill in **Name**, **Slug**, **Server URL** and **Hat**; choose **Token** under
**Authentication**, and set **Header** and **Prefix** as the server requires
(the prefix includes any trailing space). Press **Create**, then enter the
**Token** and press **Save token**. Under **Hosts whose sessions get it**,
tick the hosts to use it; each tick saves immediately. Where delivery is
supported, sessions in that hat on those hosts receive it as
`hennery-<slug>` at their next start or resume.
The status stays **Not used yet** until traffic goes through it.
Use an HTTPS server URL; **Internal network** permits plain HTTP only to
internal addresses (loopback included), for a server you run there.

For a local stdio server, use **MCP → Local MCP servers**. Choose **Host**
and **Hat**, then **Add local server**. Fill in **Server name** and
**Command** (on that host); use **Add argument** for each argument and
**Add environment variable** for secrets. Press **Review local servers**,
check the commands, then **Save local servers**. Saving replaces the whole
set for that host and hat, including removals, at the next start or resume.
Environment values cannot be read back from hennery.

Agents without per-hat isolation receive hennery MCP servers only in the
host's default hat. Check the delivery prediction beside the host or on
**New session** for the agent you chose; the session reports what it was
given at its last start or resume.
This default-hat restriction also applies to Claude with `--use-cli`.

These actions may ask you to confirm your password again.

#### OAuth

In **MCP → Add connection**, fill in the connection fields and choose
**OAuth: automatic registration** under **Authentication** if the vendor
supports dynamic registration, or **OAuth: pre-registered client** if you
register the client yourself. Press **Create**. OAuth addresses must use
HTTPS, or HTTP to this machine.

The vendor must allow hennery's redirect URI:
`<public_url>/api/mcp/oauth/callback`, using the collector's configured
browser origin as `public_url`. The exact URI is shown in the pre-registered
add/edit form and client settings beside **Register this redirect URI at the vendor:**
For a pre-registered client, enter **Client ID**, then choose
**Public client (no secret)** or **Set a new secret** under **Client secret action**.
Enter **Client secret** if you chose **Set a new secret**. Press **Save client**.
Saved secrets are write-only and cannot be read back from hennery.

Click **Connect** or **Reconnect** when offered to open the vendor consent
popup. If popups are blocked, use **Open vendor sign-in**. Return to hennery
after consent. If a fresh confirmation is required before authorization,
the popup closes and you confirm your password in the main window (or use
**Confirm with passkey** if offered). Then follow the card and click
**Connect** or **Reconnect** again if offered; authorization is not retried
automatically.

The card shows the gateway's last report, with **Status recorded** and
**Last checked**. **Probe now** requests a report;
it does not establish live health, and **Working** is a recorded status.
**May need sign-in** (`needs_auth`) calls for **Reconnect**; read the
gateway note, since an authorization-server outage can also cause this state.

## Recovery

Run these on the collector's machine while hennery runs, as the user that
runs it; each asks for confirmation on the terminal. For a collector not in
the default place, give `--data-dir <dir>` right after `admin`.

- **A forgotten password:** set a new one. It signs out every browser session and
  removes every passkey.

  <!-- check: reset-password -->
  ```sh
  hennery admin reset-password
  ```

- **The collector moved** (another address, or behind a proxy): every
  sign-in and change is refused with `origin_mismatch` until hennery knows
  the address the browser now uses. Give it that origin: `https://`, or
  `http://` to a loopback address, with no path. It signs out every browser
  session; passkeys stop working if the host name changes, and are then
  removed.

  <!-- check: reset-public-url -->
  ```sh
  hennery admin reset-public-url https://hennery.example
  ```

## Licence

hennery is licensed under the [GNU Affero General Public License v3.0](LICENSE).
`````

- [ ] **Step 4: The workflows**

In `.github/workflows/ci.yml`, replace:

`````yaml
  rust:
    strategy:
`````

with:

`````yaml
  # The README's quickstart (plan 4f): its clone and build blocks, run as
  # written, by name (`packaging/readme-blocks.sh`). The rest of its blocks
  # run in `crates/hennery/tests/readme.rs`, which checks every name has a
  # runner. No job-wide HENNERY_WEB_REQUIRE: the build block sets it itself.
  readme:
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
        with:
          github_access_token: ${{ github.token }}
      - uses: Swatinem/rust-cache@6323deb102c322ba6fcbdcafc7e3dddab59af2b6 # v2.9.2
        with:
          key: readme
      # The clone is of `main`, not of this change: it checks the address
      # and the directory, and the build below runs on this checkout.
      - name: The README's clone block
        run: |
          sh packaging/readme-blocks.sh README.md clone > "$RUNNER_TEMP/clone.sh"
          scratch=$(mktemp -d)
          (cd "$scratch" && sh -eux "$RUNNER_TEMP/clone.sh" && test -f hennery/Cargo.toml)
          rm -rf "$scratch"
      # Its last line puts the binary on PATH, for the checks after it.
      - name: The README's build block
        run: |
          sh packaging/readme-blocks.sh README.md build > "$RUNNER_TEMP/build.sh"
          echo 'sh packaging/check-web-ui.sh "$(command -v hennery)"' >> "$RUNNER_TEMP/build.sh"
          sh -eux "$RUNNER_TEMP/build.sh"

  rust:
    strategy:
`````

In `.github/workflows/nix.yml`, replace:

`````yaml
      - name: The package runs
        run: nix run . -- --version
`````

with:

`````yaml
      - name: The package runs
        run: nix run . -- --version
      # The README's nix block (plan 4f), run as written.
      - name: The README's nix block
        run: |
          sh packaging/readme-blocks.sh README.md nix > "$RUNNER_TEMP/nix.sh"
          sh -eux "$RUNNER_TEMP/nix.sh"
`````

- [ ] **Step 5: The checks**

Run: `nix develop -c cargo test -p hennery --test readme --locked`
Expected: PASS, 24 tests.

Then the five checks (fleet rules): `cargo fmt --all --check`, both clippy runs, `cargo test --workspace --locked`, and `cargo run -p hennery-proto --bin gen -- --check`.

The CI blocks run only in CI: the `readme` job on both OSes and the `flake` jobs, read with `gh pr checks`.

- [ ] **Step 6: The revert-probes**

Each probe changes one line, runs the named test, and must fail. Then it is undone.

| # | Change | Test that fails |
|---|---|---|
| Q01 | `readme-blocks.sh`: the untagged-block check off | `a_shell_block_without_a_tag_is_refused` |
| Q02 | the refusal of any other block off | `any_other_block_is_refused` |
| Q03 | the language matched without `tolower` | `a_block_in_a_language_that_is_not_shell_needs_no_tag` |
| Q04 | `toml` dropped from the list | `a_block_in_a_language_that_is_not_shell_needs_no_tag` |
| Q05 | the name-used-twice check off | `a_name_used_twice_is_refused` |
| Q06 | the "tag not followed by a shell block" check off, in the body | `a_tag_must_be_just_before_a_shell_block` |
| Q07 | the same, at the end of the file | `a_tag_must_be_just_before_a_shell_block` |
| Q08 | the "tag on a block in a language that is not shell" check off | `a_tag_must_be_just_before_a_shell_block` |
| Q09 | the malformed-tag check off | `a_malformed_tag_is_refused` |
| Q10 | the never-closed check off | `a_block_never_closed_is_refused` |
| Q11 | the `~~~` check off | `a_tilde_fence_is_refused` |
| Q12 | the block-quote check off | `a_fence_in_a_block_quote_is_refused` |
| Q13 | the tab check off | `a_fence_indented_with_a_tab_is_refused` |
| Q14 | the four-backtick check off | `a_fence_of_more_backticks_is_refused` |
| Q15 | the carriage-return check off | `a_carriage_return_is_refused` |
| Q16 | the missing-name check off | `a_missing_name_is_refused` |
| Q17 | the argument count check off | `wrong_arguments_exit_2` |
| Q18 | the readable-file check off | `an_unreadable_file_exits_2` |
| Q19 | every awk status passed through (no exit 3) | `a_failing_awk_exits_3` |
| Q20 | the indent stripping off | `a_named_block_is_printed_without_its_indent` |
| Q21 | `readme.rs`: the up test runs `"hennery up"`, not `block("up")` | `every_readme_block_is_run` |
| R01 | README: `hennery up --bogus` | `up_and_the_recovery_commands_work_as_the_readme_says` |
| R02 | README: the reset-password block runs `hennery admin setup-url` | `up_and_the_recovery_commands_work_as_the_readme_says` |
| R03 | README: `reset-public-url https://hennery.example/x` | `up_and_the_recovery_commands_work_as_the_readme_says` |
| R04 | README: `up-public` without `--public-url` | `pairing_another_machine_works_as_the_readme_says` |
| R05 | README: the join block without its code | `pairing_another_machine_works_as_the_readme_says` |
| R06 | README: `hennery host run --data-dir /tmp/elsewhere-4f` | `pairing_another_machine_works_as_the_readme_says` |
| R07 | README: an untagged `sh` block added | `every_readme_block_is_run` |
| R08 | `ci.yml`: the build step names `bulid` | `every_readme_block_is_run` |
| R09 | `nix.yml`: the nix step names `xin` | `every_readme_block_is_run` |
| R10 | README: a tagged block `extra` added | `every_readme_block_is_run` |
| R11 | `ci.yml`: the clone step names `enolc` | `every_readme_block_is_run` |
| G1 | remove the documented scheme guard | `pairing_substitution_cannot_hide_a_scheme_change` |
| G2 | remove the documented host guard | `pairing_substitution_cannot_hide_a_host_change` |
| G3 | remove the explicit port-marker guard | `pairing_substitution_only_changes_marked_port_and_code` |
| G4 | remove the explicit code-marker guard | `pairing_substitution_only_changes_marked_port_and_code` |
| G5 | README join URL changed to HTTPS | `every_readme_block_is_run` |
| G6 | README join host changed to localhost | `every_readme_block_is_run` |
| C01 (CI) | README: the clone address of a repository that does not exist | the `readme` job's clone step, on both OSes (run 37105283992) |
| C02 (CI) | README: `./result/bin/hennery --bogus` | the `flake` job's nix step, on both OSes (run 37105283979) |
| C03 (CI) | README: the `pnpm --dir web build` line removed | the `readme` job's build step: the release build fails on `HENNERY_WEB_REQUIRE=1` |

`stop`'s wait for every process to end is a guard, not an outcome: with it off, nothing fails, because `up` does stop its children on SIGTERM. That is the behaviour the guard is there to wait for. It stays as a guard, so that `Machine`'s removal never races a live child; R01 and R04, run after the cleanup fix, leave no directory behind.

The test binary was also run as four copies in parallel (`--test-threads=4` each): all tests passed in each.

- [ ] **Step 7: Commit**

```bash
git add packaging/readme-blocks.sh crates/hennery/tests/readme.rs README.md .github/workflows/ci.yml .github/workflows/nix.yml
git diff --cached --stat
git commit -m "docs(readme): a quickstart for early testers, every shell block run"
```

---

### Task 2: Record the execution

- [ ] Write "Execution status" here and this plan's line in `docs/README.md`. Commit as `docs(plan): record the execution of plan 4f`.

## Deferred

- **Indented code blocks** (four spaces, no fence) are not detected by `readme-blocks.sh` (decision 1). Accepted by the lane, 2026-10-03: a reviewer reading the README diff is the check.

## After this plan

- **Future MCP changes:** update the README against the actual API and UI; static-token, local stdio and OAuth steps are verified on `82d41c0f`. Keep last-report and fresh-click semantics accurate.
- **Releases** (plan 7, the operator's): when there is one, the Quickstart's build step becomes the second route, after installing. The installer's and Homebrew's commands get tagged blocks and runners too.
- **The Push subscribe button:** when subscription UI lands, move Push back from the limitations to what works. It is outside the early-tester scope.
- **Codex isolation:** when per-hat isolation for Codex lands, revisit the limitation line. Plans 8g and 8h are deferred; no screens or maintainer open questions belong in the README.

_Generated with Claude AI — please review before distribution._
