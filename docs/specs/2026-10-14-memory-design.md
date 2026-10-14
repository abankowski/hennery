# hennery — optional memory plug-in and activity contract

- **Date:** 2026-10-14
- **Status:** Amended after the 2026-10-14 Codex gpt-6-astra review of
  `0fe663b..8c3601ad` (approve after amendments); scoped re-confirmation pending.
  Incorporates the parent's shared-contract ruling and the operator's Q1
  decision. No code or live-adapter verification is claimed.
- **Authority:** the operator's 2026-10-14 brief, **as corrected by the later
  steer: memory is an opt-in plug-in, not an embedded core feature**.
- **Amends:** [umbrella §1.2.1](2026-09-25-hennery-architecture-design.md#121-optional-memory-amendment-2026-10-14)
  records the scope change from §15's original “Memory / cross-session context
  | v2” row (line 1072 at base `0fe663b`). Only a generic optional plug-in
  contract enters core. Reference memory ships separately and is off by default.
- **Consumes:** kernel auth/hats/egress/purge; gateway connections, mounts and
  session tokens (8a/8e); the client view fold; ACP prompt delivery.
- **Delegation boundary:** delegation owns its **built-in hennery MCP**.
  Memory does not define, register tools on, or require that internal server.
  The later plug-in steer supersedes the earlier shared-server assumption.
  Both lanes reuse the existing session MCP delivery and isolation gates.
  The memory lane owns **C1: generic feed/lifecycle**, including owner/hat
  namespace identity, typed provenance and the startup data contract;
  delegation depends on it. C2 implements startup delivery. Signed per-session
  attestation is a separately reviewed future **generic signed-principal
  extension**, not a C1 prerequisite (delegation design `adf56fb9`, §3.2).

## 1. Product and non-goals

A user who wants no memory installs and configures nothing. There are no
memory tables in `hennery.db`, no note worker, model requests, extra agent
tools, automatic startup text or Memory navigation item. The reference
`hennery-memory` is a separate optional executable/crate in this repository,
with its own data directory, migrations and credentials. The main hennery
binary does not start it or link its store into the collector.

A user who opts in runs that service, creates a hat-specific MCP connection,
and mounts it on selected hosts using the existing gateway. Any compatible
external memory MCP server can be mounted the same way. Separately, the owner
can grant a plug-in read access to completed session activity in one hat;
MCP mount permission alone never grants transcript ingestion. Optional startup
context is another explicit grant, not a side effect of mounting a server.

The reference plug-in provides session notes, deliberate memories, recent,
brief, search and remember, plus a small authenticated management screen and
one-time import of an existing vault. It supports every hennery user's hats,
not a built-in list of the maintainer's clients or paths.

This follows “Second brain: learning before memory”: a small curated body of
knowledge, with dated sources that can be studied, disputed and retained.
Automatic notes are observations. They never automatically become durable
assertions or a source of truth. Deliberate memories remain editable text
with provenance, not model-certified facts.

Out of scope: mandatory memory, knowledge graphs, embeddings, automatic fact
promotion, unattended vault sync, observed terminal-session collection,
adapter handoff, importing credentials, replacing global agent rules, a
general plug-in marketplace/process supervisor, and core-owned memory UI.

## 2. Decisions

| ID | Chosen option | Alternatives rejected and why | Authority |
|---|---|---|---|
| M1 | Off-by-default reference memory plug-in, separate executable/store; generic opt-in core contract | Embedded memory and automatic enabling contradict the later operator steer; a private-only service does not serve all users | **settled by spec** — umbrella §1.2.1 amendment, operator 2026-10-14 |
| M2 | Owner + exactly one hat per connection, activity grant and plug-in namespace; no shared/personal super-scope | Claimed cwd, inherited legacy scope unions and cross-hat fallbacks breach the boundary | **settled by spec** — umbrella §§1.1, 8.2–8.4; kernel §1 |
| M3 | Remote HTTP MCP for the reference service; existing local stdio remains supported for other plug-ins | A collector-spawned stdio worker would add process management and ambiguous multi-host storage | **designer's recommendation**; transports already exist in gateway §§3.2–3.4 |
| M4 | Pull-based completed-activity feed with opaque cursor, explicit registration, revocation and deletion lifecycle | Webhooks require callback/retry/SSRF machinery; SSE adds long-lived reconnect state without improving bounded note capture | **designer's recommendation** |
| M5 | Optional generic startup-context operation, invoked by collector through the registered connection | Global agent hooks/config leak across hats; mounting alone must not inject text | **designer's recommendation** |
| M6 | Plug-in SQLite canonical store with derived FTS5 and portable Markdown export | Vault plus index requires two-store consistency and makes purge through git history difficult; a curated knowledge policy does not require canonical files | **designer's recommendation** |
| M7 | One bounded note per source session/hat epoch; explicit memories separate | Per-turn extracted facts grow without curation; an LLM-only writer makes continuity depend on a provider | **designer's recommendation** |
| M8 | Explicit agent remember immediately readable, marked agent-authored; owner can disable writes | Automatic extraction is excluded; a compulsory approval inbox adds work before an entry has proved useful | **designer's recommendation** |
| M9 | No model required; optional per-hat credentials and budgets in plug-in | Reusing agent subscriptions, global provider fallback or hidden paid jobs violates isolation and opt-in | **designer's recommendation**; per-hat model endpoint settled by umbrella §8.3 |
| M10 | Manifest-mapped import, one file to one hat or exclude | Guessing from filenames/paths and inheriting legacy shared access risks leakage | **designer's recommendation**, M2 binding |
| M11 | C1 binds exposure before registered proxy requests, including already-running sessions, and serializes reassignment across both stores | Start/resume-only binding misses connections registered while a session runs; token revocation cannot erase delivered context | **designer's recommendation**, required security amendment from the 2026-10-14 review; umbrella §8.2/ACP core §4.9 refinement |
| M12 | Local purge may finish with external deletion explicitly unconfirmed; reference lease lasts at most 60 s | Unreachable services cannot prove erasure; no claim of immediate external deletion | **settled by spec** — operator Q1 ruling, 2026-10-14, recorded below |
| M13 | C1 namespace authentication, unmount cuts feed/access, typed source provenance and `PluginContext`; per-session attestation deferred | Unsigned session hints and parsed text cannot prove identity or operator authority; preserving feed on unmount contradicts the shared contract | **settled by spec** — parent shared-contract ruling, 2026-10-14; delegation `adf56fb9` §3.2 |
| M14 | Persist terminal state/deletion obligation before registered connection mutation; revoke/cut before remote waits | Forgetting after URL replacement can leak the lifecycle credential; hat freeze alone does not invalidate existing gateway tokens | **designer's recommendation**, required security amendment from the 2026-10-14 review |

**Q1 — Resolved by the operator, 2026-10-14:** yes, local hat purge may finish
while external deletion is **explicitly unconfirmed**. Revoke collector access
and cut registered work before any remote wait. The reference plug-in may
retain a previously issued lease for **at most 60 seconds**; after expiry it
refuses access until deletion is completed. There is **no claim of immediate
external erasure**, and the UI retains the unresolved external-copy status.

There are no remaining operator questions in this revision. Technical
amendments need the parent's scoped review re-confirmation before planning.

## 3. Generic core contract

Core knows plug-in connections, activity grants, cursors and lifecycle receipts.
It knows nothing about notes, memories, briefs, vault formats or model providers.

### 3.1 Mounts and identities

Use an ordinary gateway connection with a static credential or OAuth and an
explicit hat, plus existing host mounts. A plug-in may also be a local stdio
MCP server in the existing `(host, hat)` configuration, but that process owns
its own persistence; hennery does not replicate it between hosts. A remote
HTTP service is the reference deployment so all hosts in a hat see one store.
It works over the existing validated HTTP(S)/internal-network egress rules;
there is no new URL-policy exception for plug-ins.

Mount-only use can serve existing/imported content without an activity grant.
Full integration additionally registers deletion lifecycle; grant activity and
startup independently. Lease gating below applies to registered namespaces.
A standalone, unregistered namespace has no collector lease or automatic
plan 9 deletion guarantee: its owner deletes it directly in that service.
Show this distinction when configuring an external connection.

Plan 8e's session token remains only between agent and gateway. The gateway
derives session owner/hat at request time, then uses the connection's upstream
credential. Never forward `hnry_session_…` or a browser cookie to the plug-in.
The upstream credential identifies **one owner/hat namespace** in the reference
service. Each hat uses a separate connection and separate credential. No MCP
argument can choose owner/hat. An external service must provide equivalent
credential isolation; core cannot make a globally privileged upstream token
safe merely by labelling its connection with a hat.

The existing proxy does not attest the calling session id to an upstream
server. Do not invent authority from an agent's `cwd` or `session_id` argument.
Recent/search can use a caller-supplied project key only as a narrowing filter
within the already authenticated hat. Remember records “agent wrote”, without
a verified source-session claim. The reference implementation accepts optional
unverified source hints as labelled text, not authenticated provenance. A
future **generic signed-principal extension** (signed per-session attestation)
requires a separate reviewed contract shared with delegation/gateway. C1 owns
namespace identity; it exports neither `SessionToolContext` nor an unsigned
claimed identity. This extension is deferred and is not required for memory.

The existing isolation delivery gates apply to HTTP and stdio. Non-default
Codex hats on the mixed-host fallback get no mounted plug-in MCP until 8h's
live proof, or a dedicated hat host. Report that limitation; never inject
global MCP configuration to bypass it.

### 3.2 Registration and minimal optional state

Mounting an arbitrary MCP connection needs no new core state. To opt into the
activity/context contract, the authenticated owner registers a connection
using step-up. Registration binds its existing owner, hat and connection id;
it validates a versioned `hennery_plugin_capabilities` MCP operation and the
requested grants. Capabilities advertise `activity_v1`, `forget_v1` and
optionally `startup_context_v1`, with bounded schemas. This operation is
generic: an audit, reporting or task plug-in can implement it too.

`forget_v1` is required for every registration; activity and startup are
independent optional permissions. A registration without activity permission
can renew its lease through `POST /api/plugins/lease` using the same scoped
machine token, returning only epoch/expiry, never session data.

Contract-enabled registrations live in a separate optional
`<data>/plugin-control.db`, opened/created only on explicit registration or
when existing registrations need recovery. There are **no new tables or
memory migrations in `hennery.db`**. This control store holds only scoped
registrations, hashed activity tokens, grant start/epoch, exposure bindings,
terminal transitions and deletion receipts, never transcript bodies or plug-in
results. A pending deletion obligation temporarily holds its immutable old
endpoint and sealed lifecycle credential (§3.4); no new destination inherits
them. Every row has owner and hat. Migrations follow the existing immediate-transaction and
newer-version-refusal discipline. No registered plug-ins means no worker,
control database or recovery loop. A present but unreadable control store
must fail closed for its grants and affected lifecycle operations.

Backups of a configured collector include this control store and the existing
master key that seals lifecycle credentials. Restore reconciles epochs and
purge state before re-enabling a grant; a mismatched/incomplete restore denies
the grant until explicitly re-registered. The plug-in's data/key are a separate
backup, never implicitly included or restored by the collector.

The authoritative hat/session/connection state is still the core database.
There is no claimed atomic transaction across the two files. **C1 owns a
single lifecycle gate per owner**, shared by registration/mount changes,
registered proxy/feed/context admission, connection edit/delete, hat
reassignment and both purge entry points. C1 must prove process-lifetime
exclusive ownership before any collector/gateway writer opens the core DB,
using the collector's admin-socket ownership or a generic writer lock if that
is insufficient. Existing host/up locks alone are not that proof. This also
applies before the first registration: a second already-running unconfigured
writer must not escape coordination. An offline mutator acquires the same
ownership; a second writer refuses to open the DB. No code may mutate either
database outside this coordination. Fixed lock order: owner gate,
core `IMMEDIATE` transaction, then control-store transaction. Never acquire
them in reverse, and never hold a transaction or gate across network I/O.

For admission, hold the gate and core transaction, re-read token generation,
session hat, connection/grant revision, mount and freeze state; install the
cancellation watch and durably commit the exposure binding in the control
store. End the core transaction before releasing the gate and dispatching.
Reassignment takes the same gate/core transaction, checks control bindings,
and commits only if none prohibit it. If admission wins, reassignment sees
the binding and refuses; if reassignment wins, admission re-resolves scope
and refuses the old identity. A control commit followed by a crash or core
failure leaves a conservative binding, never an unrecorded exposure. Control
read/write failure denies admission and reassignment. Gate release is not
permission to ignore later revocation: the watch stays active through the
request/response and scope is checked again before delivery.

Grant creation writes pending control state first under this ordering, then
activates only after live core scope is verified. Purge must explicitly
revoke/cut session tokens as well as freeze the hat (§3.4): current gateway
token/mount resolution does not itself test `purged_hats`. Pending terminal
control state also denies registered proxy/feed/context access immediately.
Startup recovery runs under the same gate and completes revocation/cuts and
reconciles pending states before any registered traffic is admitted. The
connection-mutation crash protocol is specified in §3.4.1.

An activity token is `hnry_activity_` plus 64 random lowercase hexadecimal
digits, stored hashed, shown only once to the owner to configure the service,
and bound to `(owner, hat, registration, epoch, permissions)`. It is distinct
from session and upstream MCP credentials.
It grants no operator, session-control or gateway access. Rotation uses an
explicit handover within the same epoch; revocation is terminal for the epoch.
No credential is accepted in a URL, query string, browser storage or logs.
Reference-service lifecycle credentials use `hnry_lifecycle_` plus 64 random
hexadecimal digits, and its minted upstream namespace credentials use
`hnry_plugin_` with the same random suffix. These classes and `hnry_session_`
share the redaction contract in §8; it must land in C1 before any is issued.
Third-party credentials are opaque and must never be mistaken for a token
class this scanner can recognise.

### 3.3 Activity feed: pull, scope and replay

`GET /api/plugins/activity?after=<opaque>&limit=<n>` authenticates the activity
bearer. This is a separate machine route: no cookie authentication or CORS;
reject any present browser Origin. Missing Origin is normal for its server
client. Check registration, connection owner/hat, current hat freeze/deletion,
current mount eligibility, grant revision and token revocation on **every
page**, including after waits and before releasing results. Filter in SQL
before hydration/limiting. Rate/budget limits
are per registration; body, query and error logs contain no source content.

Default polling is every 15 seconds while enabled, with backoff on failure.
No SSE or webhook is required. A page contains typed Rust-owned envelopes:

| Shape | Fields / behavior |
|---|---|
| `PluginActivityPage` | `version`, `items`, `next_cursor`, `has_more`, `lease_until`; cursor is opaque and bound to grant/epoch |
| `CompletedTurn` | event key, session/turn ids, scope epoch, canonical project key, completion time, typed input provenance, role-labelled text excerpts and source refs, coverage/truncation flags |
| `SessionRemoved` | event key, source session id and typed causal provenance; no old title/body |
| `SourceReset` | session id, epoch boundary and typed causal provenance; discard previous observation rather than replay pre-boundary content |

Every feed item has a required typed `provenance` field. C1 consumes the
server-written input-origin contract `Operator | Parent {session_id,
operation_id} | ChildReport {child_id, source_event_id, delivery_id}` produced
by delegation using C1-owned types, preserving source refs and roles. A
system-generated reset has explicit empty causal provenance, not an invented
`Operator` author. Assistant
output remains assistant output even when its initiating prompt was Operator;
that provenance never certifies its assertions as operator decisions.
Never infer origin from prose, delimiters or the view's current `UserTurn`
shape (`hennery-view/src/fold.rs`). C1 must join the stored typed origin and
fail closed on missing/unsupported origin for new delegated inputs. Only
historical records proven to precede delegated-input support may use the
existing operator-only migration rule. The feed cannot ship delegated input
support before that typed contract exists.

The grant starts at registration's committed-event high-water mark; no
historical backfill by default. New completed turns only, not failed/cancelled
turns. Data comes from committed typed turn facts and `hennery-view`, not a
new ACP parser. Include at most 8 KiB of user/assistant text per turn, 20
items/128 KiB per page; omit thinking, tool arguments/results, images,
permission forms and injected context. Assemble, redact, then truncate; report
gaps/truncation honestly. Session ids/project keys are authenticated source
metadata here, unlike hints passed through an agent's MCP arguments.

Use the existing event log as the durable source, not a copied transcript
queue. Derive eligible events under the grant's owner/hat/epoch. A plug-in
commits its projection and cursor atomically; pages may repeat, and an event
key is idempotent. If a source is deleted before reading, deliver its deletion
tombstone, never the removed body. Core session deletion currently retains
owner/hat/id and a `session_deleted` event (`store.rs`); plans must preserve
the scoped tombstone until registered consumers can observe it or reset.
An invalid/expired cursor returns `reset_required`, never an unscoped replay.
The reset protocol supplies a bounded paginated source-id inventory at a
consistent watermark, then resumes from that watermark; consumers remove
observations absent from the inventory. No transcript backfill is implied.

Hat reassignment is an exposure boundary. A registered feed may read only
turns after the session's latest assignment into that hat and from currently
eligible mounted hosts. **Bind before the first registered proxy request**,
including a session already running when its mounted connection is registered
or changed; start/resume binding alone is insufficient. Conservatively bind
every eligible attached session at registration activation too, before any
registered request can leave. Registration uses the owner gate to cut
pre-registration in-flight requests for that connection before activation,
so a response cannot slip across the transition unbound. New mount eligibility
uses the same gate and binds eligible attached sessions before release.

Feed read, contract-mounted start/resume and startup delivery use the same
admission/binding path. Bound sessions cannot be reassigned across hats;
start a clean session. This entire guard ships in **C1**, not C2. Ordinary
unregistered MCP retains today's semantics. Remove bindings on session
deletion; grant revocation/unmount alone does not erase delivered context and
therefore does not clear bindings.

**An unmount cuts the feed and revokes access.** On any host removal from a
registered connection, terminate the registration's current activity/context
grant and lease, cancel pending delivery and cut its registered proxy work
before the mount change completes. This conservatively ends the whole
registration epoch; other hosts do not keep the old feed alive. Remaining
hosts need a fresh explicitly granted epoch. Stored copies follow the
revocation/deletion contract below, with the same maximum-60-second external
lease window; unmount does not imply immediate external erasure.

### 3.4 Generic deletion lifecycle, revocation and plan 9

Activity export requires `forget_v1` as well as read capability. During live
operation the feed's `SessionRemoved` tells a plug-in to drop automatic
projections and detach source references. The reference policy retains an
explicitly remembered assertion until it is deleted or the whole scope goes;
core does not interpret that policy as memory logic.

For grant revoke/hat purge, the generic MCP operation
`hennery_plugin_forget {request_id, namespace_epoch, target: Scope | Session}`
is idempotent and authenticated with the existing hat-specific upstream
credential. It returns `ForgetReceipt {request_id, status, remaining_kinds}`.
No agent may call this operation: configure the ordinary connection tool
allowlist to expose only user-facing tools, and use a distinct admin credential
at the reference service for management/lifecycle operations. The collector's
optional registration stores that separate lifecycle credential encrypted,
never in a session mount or plaintext control row.

Plan 9 preview lists registered destinations and deletion status. Both the
HTTP purge route (`hennery-sessions/src/hats.rs`) and lifecycle hook
(`hennery-sessions/src/lib.rs::on_hat_purged`) call the **same C1 coordinator**:

1. Under the owner gate, freeze the hat; persist terminal registrations and
   their deletion obligations, pinned to the old endpoint/epoch/credential.
   Revoke all affected session tokens in the core transaction and commit;
   then invoke their revocation cuts. Revoke activity/lease grants and cancel
   all registered proxy/feed/context work. Complete these cuts before
   releasing the gate for any remote operation. Freezing alone is insufficient
   (`gateway/src/scope.rs` currently checks tokens/mounts, not hat freeze).
2. With no gate/database transaction held, make bounded forget attempts using
   only the snapshotted old destination and separate lifecycle credential.
   Normal gateway access is already cut. Retain the minimum destination
   metadata/secret only while needed for the bounded attempt and recovery;
   never re-resolve through a changed connection or follow a redirect.
3. Persist confirmed/unconfirmed receipts, erase retained endpoint/secret
   snapshots, finish gateway/session/hat cleanup and checkpoint. Local purge
   can finish with explicitly unconfirmed external deletion under resolved
   Q1; it cannot restore grants to compensate for a remote failure.

If obligation persistence fails after freeze, **still revoke and cut session
tokens before returning the error**; leave the hat frozen and local cleanup
unfinished so the obligation can be retried. Never begin a remote wait on that
failure path. A crash after freeze or token commit is recovered before serving
traffic: the coordinator re-runs idempotent token revocation/cuts, then resolves
obligations. In-memory cuts cannot survive restart, so nothing is reopened
until durable core/control state has been reconciled. Preserve today's
gateway-before-session purge ordering; only the minimum old destination
snapshot may outlive gateway revocation.

Remove activity token hashes, lifecycle secrets, grants and scoped control
state at completion; retain only owner/hat/request-id/result tombstones like
existing purge evidence, never content or credentials. Do not retain a hidden
remote access credential for indefinite retries after completed hat purge.

The reference service additionally validates its grant lease before serving
MCP reads, writes or startup context: acquire/refresh a maximum-60-second
lease via the feed, fail closed once it expires. Revocation or loss of access
stops serving it; a verified lifecycle forget request deletes it. A generic
404 is not proof of purge: it could also mean a rotated credential or wrong
route. Network failures, redirects and HTML must not trigger deletion. Token
rotation uses explicit same-epoch handover so a retired token cannot
accidentally erase a live namespace.
Lease/check races may leave data already delivered before revocation;
external copies cannot be recalled. Remote acknowledgement is a service's
claim, not a proof against a malicious plug-in.

An offline reference service cannot renew its lease after purge. The owner
finishes deletion in its management UI when reachable and records its receipt
against the unconfirmed purge; no revoked token regains access to activity.
Re-registration must not reactivate that old epoch: erase it first, then use
a new empty namespace. An arbitrary server may not obey. The UI must never
report “all external data erased” in that case. Snapshots, exports and provider
retention remain outside local purge's reach. Removing a registration, including
the unmount transition in §3.3, revokes access immediately and starts this
bounded deletion protocol, with notice that its namespace will be erased.
An unresolved remote copy is explicitly unconfirmed after the lease window;
it never keeps the feed or the old grant usable.

### 3.4.1 Connection edit/delete and crash recovery

C1 wraps **every registered connection edit/delete** and mount removal with
one lifecycle transition, including the store entry points currently in
`hennery-gateway/src/store.rs::update`, `delete` and `replace_mounts`.
Calling only an HTTP handler hook is insufficient: internal/admin paths must
not bypass it. Label-only edits may conservatively use the same transition;
no URL, credential or policy change inherits the old active registration.

Under the owner gate and lock order of §3.2, validate the request and expected
core connection revision/fingerprint, then **commit** a control transition:
`Active → TerminalPendingForget`. It contains owner/hat, old registration and
namespace epoch, idempotent forget request id, an immutable snapshot of the
old endpoint and encrypted lifecycle credential, the old connection fingerprint,
the intended mutation kind/result fingerprint and a bounded attempt deadline.
The old registration denies access from this commit onward. Cut its registered
proxy/feed/context work and revoke its activity/lease tokens before releasing
the gate. Do not change the core connection yet.

The terminal routing fence remains attached to the connection id even after
grant/secret erasure: an absent active grant must not fall through to ordinary
unregistered proxy access. Only a fresh explicit registration or completed
connection deletion resolves that fence.

Attempt forget against that snapshot only, bounded to five seconds total for
this transition, including recovery (an expired deadline means unconfirmed).
No redirect or lookup of a replacement endpoint. Persist the receipt
(`Confirmed` or `Unconfirmed`, including timeout/unknown outcome) and remove
the snapshot/secret in the **same control transaction**. Only after that
durable disposition may the core edit/delete/mount change commit, under the
gate and expected-old-fingerprint check. The replacement has no active grant:
register it explicitly with fresh credentials/epoch. The lifecycle credential
must never follow a changed destination, even when the hostname is unchanged.

There is no cross-database atomic-commit assumption. Recovery is explicit:

| Crash point | Recovery before registered traffic resumes |
|---|---|
| Before terminal control commit | Core mutation has not happened; old state remains. Nothing remote was sent. |
| After terminal commit, before cuts or forget | Deny old registration, complete idempotent revocations/cuts, then attempt only the old pinned destination within the persisted deadline. |
| During forget or after response but before receipt commit | Outcome unknown; retry the same request id only within the original deadline, otherwise record unconfirmed. Never send to the replacement. |
| After receipt/secret erasure, before core mutation | Old connection remains disabled. A matching owner retry may apply the intended mutation after checking old fingerprint; no secret or remote retry remains. Recovery does not invent a new edit. |
| After core mutation, before control completion marker | Compare current core fingerprint/deletion with intended result; mark complete if it matches. A mismatch remains disabled/conflicted for owner resolution; never revive the old grant. |
| After completion | Receipt remains; no old credential/endpoint snapshot or active grant. New registration is independent. |

Concurrent edits serialize through the gate and terminal-state/fingerprint
checks, not just the gateway refresh lock. An unexpected core mutation found
at restart is fail-closed with an explicit unconfirmed obligation; it is never
treated as successful erasure. Purge consumes these same pending transitions
and performs its earlier all-hat token revocation before any remote attempt.

### 3.5 Optional startup context

With the owner's separate opt-in, call the registered server's generic
`hennery_plugin_context {request_id, namespace_epoch, project_key}` over its
existing validated HTTP transport and lifecycle credential. The result is
`PluginContext {entries, generated_at, truncated}`, bounded to 8 KiB.
Each entry has typed `text`, `source_refs` and required `provenance`. C1 owns
these generated data types and the source-origin contract; C2 implements
delivery using the distinct `InputOrigin::PluginContext` variant. It must
never reuse `Operator` just because the ACP wire carries a prompt.

Preserve `Operator` / `Parent` / `ChildReport` as typed source provenance,
including their ids, through feed, notes, briefs and every startup entry.
An entry without authenticated source evidence (for example an imported
document or agent-written memory without an attested session id) explicitly
has `Unverified` evidence; never invent one of those three origins. A startup
entry's claimed verified origin must match its core source reference before
the UI labels it verified; otherwise refuse it or mark it unverified. This
source verification is not signed per-session MCP caller attestation.
Mixed-source summaries retain all source provenance rather than choosing the
highest-authority origin. The outer `PluginContext` remains untrusted reference
data even when it quotes a past Operator statement. It cannot approve a tool,
alter permission policy or satisfy step-up.

Core does not request a memory brief or choose its contents. One provider per
hat initially avoids combining conflicting context and unbounded latency.
The reference implementation never calls a model on this path.

Fetch once, just before committing the new session's first prompt. Two-second
total deadline; unavailable/disabled/unsupported context lets the user's
prompt proceed with a visible status. Recheck scope and record exposure before
delivery. Carry an optional typed `PluginContext` block in the existing host
prompt frame, gated by a host capability; prepend it as labelled untrusted
reference material in the same ACP prompt. User-authored input retains its
own separate typed origin. No synthetic turn or global hook. Display labels
and delimiter text cannot change either origin; parsers never reconstruct
authority by scanning rendered prompt text.
Store the bounded block and request id with that session's prompt event for
normal retry/reconciliation; no separate context table. Render provenance
separately from user-authored text and exclude it from the activity projection.

Never issue a second prompt on unknown delivery. Resume does not reinject;
agents can call the plug-in tools themselves. Deleted/frozen scope or revoked
registration cancels an undispatched context result. A changed provider/result
before dispatch may be discarded and the prompt sent without context, visibly.
Old hosts skip the optional block; they do not acquire it through shared
configuration. This capability is independent of whether their adapter can
receive MCP mounts. Already delivered context can remain in adapter history,
which is why the reassignment guard and plan 9d still matter.

### 3.6 Core management surface and module seams

Proposed Rust-owned routes, with generated JSON Schema/TypeScript:

- `GET/POST /api/plugins/registrations`: list/register existing connections;
  registration requests explicit activity/context permissions and separate
  lifecycle authentication. Step-up for creation/change/revoke/rotation.
- `DELETE /api/plugins/registrations/{id}` and
  `POST …/{id}/rotate`: scoped lifecycle and one-time credential handover.
- `GET /api/plugins/activity`: the machine feed above; no operator authority.
- `POST /api/plugins/lease`: machine-token lease renewal without activity;
  same scope/revocation checks and Origin rejection as the feed.

Browser mutations use kernel JSON/Origin rules and cookie auth; reads use its
Fetch-Metadata rules. Never return upstream/lifecycle credentials on GET.
Core UI only adds generic connection controls: grant activity access, enable
context, status/revoke, and deletion receipts. No core Memory page or CRUD.

The optional core contract module depends on kernel and narrow read/projection
interfaces from sessions/view; the binary wires it. Gateway does not import
memory or sessions. Authenticated collector-to-plug-in calls use a narrow
gateway/egress interface, not a loopback request impersonating an agent. Ask
the delegation designer to share existing principal/lifecycle interfaces if
needed, while preserving the gateway's standalone build. There is no second
internal hennery MCP endpoint owned by this lane.

## 4. Reference memory plug-in

### 4.1 Data and storage

`hennery-memory` has its own private directory and SQLite database, WAL,
`secure_delete`, component migrations and derived FTS5 index. An installation
may host several namespaces, but every entry, job, cursor, setting, token,
provider credential and import row carries owner + hat + namespace epoch.
Credential lookup fixes the namespace before data access. It never opens the
collector's database or reads host/global-agent files.

Three entry kinds:

- **Session note:** automatic, bounded, dated observation, one per source
  session/hat epoch. Includes covered-through event key, gap/stale state,
  source references, typed input provenance/roles and optional separate owner
  annotation.
- **Memory:** deliberately retained title and Markdown body, optional kind
  (`user`, `feedback`, `project`, `reference`, `decision`, `entity`), tags,
  author class (`owner`, `agent`, `import`), dates and revision. No automatic
  promotion or inference of owner approval.
- **Imported source:** original document for study, searchable when requested;
  never split into automatically accepted assertions.

Tables are entries, scoped source refs, ingest cursor/jobs, note suppression,
settings, credential hashes/encrypted provider secrets, import ledger and
request-id deduplication; FTS is derived. Canonical bodies stay Markdown.
Writes and FTS changes are one transaction. Explicit edit uses expected
revision; stale writes conflict. No stored revision history of deleted bodies.
Index repair is local and scope-safe; broken FTS never broadens search.

SQL filters owner/hat before counts, limits, ranking or hydration. Use plain
query terms quoted for MATCH, bounded term count, Unicode/diacritic tests and
deterministic scoped term coverage/recency ordering. Do not expose a global
FTS vocabulary, autocomplete or corpus-based ranking that changes when a
foreign hat adds data. FTS is lexical, not cross-language semantic search.

### 4.2 Notes, tools and startup selection

The plug-in atomically folds feed items and advances its cursor. Deduplicate
event keys; retries/restart can repeat pages. One note holds the last three
completed-turn pairs, at most 8 KiB total, with truncation/older-turn counts.
It is an excerpt digest, not a semantic summary: no invented decisions,
pending work or facts. Completed-turn-only capture is intentional. Disabling
or deleting a note records suppression so later turns cannot resurrect it.
Source deletion removes the automatic note and detaches references from
deliberate entries; scope deletion removes all kinds and pending work.

Keep each excerpt's source role and typed `Operator` / `Parent` / `ChildReport`
provenance beside the text, in storage and on every retrieval surface. A child
report saying “the operator approved” remains a child report. Summarisation,
explicit retention, pinning, editing and export must not silently relabel it
as Operator evidence. Owner annotation is a separate act with its own author;
it does not rewrite the original source. Imported or unattested agent content
retains explicit unverified evidence and cannot manufacture typed authority.

| Tool | Rust-shaped arguments | Result |
|---|---|---|
| `memory_recent` | `{project_key?, limit?, cursor?}`; default 5, max 20, within credential's hat | Dated notes, typed provenance/roles, coverage/staleness, next cursor |
| `memory_search` | `{query, kind?, project_key?, limit?, cursor?}`; default 10, max 20 | Bounded hits with typed provenance, source refs and revision |
| `memory_brief` | `{subject, project_key?, mode: Deterministic | Model}`; deterministic default | Text, cited source ids and their typed provenance, mode used, fallback reason, freshness |
| `memory_remember` | `{title, body, kind?, tags?, idempotency_key}` | Stored id, revision, redaction notice |

All request types reject unknown authority fields, including owner/hat.
Limit title to 160 characters, body to 16 KiB, tags to 16 of 64 bytes,
query/subject to 512 characters, response to 16 KiB. Cursor binds to namespace
and query; it is not authority. A reused remember key with different content
conflicts. Deduplication keys are namespace-scoped because the current gateway
does not attest session identity. Memory tools cannot delete, overwrite,
pin or move an existing entry. Owner management can. Agent writes can be
disabled per namespace while reads remain enabled.

Deterministic brief selects at most eight scoped sources, renders dated
quotations and preserves disagreements; empty input gives an empty result,
not invented background knowledge. Recent project matching is exact using
the feed's canonical host/cwd project key, not a directory basename. Imported
notes need explicit project mapping or remain available at hat scope.

For optional startup, choose up to three notes for the supplied project and
five owner-pinned hat memories, at most 8 KiB including labels/source ids.
No imported monoliths, cross-hat fallback or model call. Pin limit is five;
the management UI explains the cap. The core receives plain reference data,
never plug-in-provided system instructions or tool definitions.

### 4.3 Minimal plug-in UI, export and authentication

The reference service provides its own small management page: select a
namespace; Memories / Session notes / Imported sources; search, view, create,
edit, delete, pin, annotate/suppress a note, explicitly retain selected text,
import preview and export. No automatic review queue or graph. Show author,
date, source, stale state and conflicting revisions. Imported/model text is
untrusted Markdown: raw HTML disabled, safe links, no fetch-on-render.

Management uses a separate operator credential/session, never a mounted MCP
read/write token or feed token. Recommended first release: explicit local
bootstrap, operator password/passkey support by reuse of kernel auth, secure
cookies, configured public origin and step-up for import/export/deletion,
credential or policy changes. Share auth code where feasible, not the core's
database/session cookie. The UI can list all of this plug-in owner's hats;
every mutation/export selects one. No anonymous UI, CORS wildcard or bearer
in a link from the collector. A generic “Open plug-in” link is informational,
not an SSO bypass. This UI/auth work belongs to the plug-in plan, not core.

Export one namespace as a versioned manifest plus Markdown in notes/memories/
sources, opaque filenames, with provenance and dates after redaction. Exclude
credentials, jobs and other hats. Stream a consistent snapshot with no-store
headers; retain no archive on the server. Back up this database and its own
encryption key separately from the collector; export is portable content,
not a credential backup. Deleting a plug-in is not the same as deleting its
data directory or external backups.

## 5. LLM usage, ownership and costs

Capture, search, remember, import/export, deterministic brief and startup
work without any model. No background model request occurs by default even
after a plug-in is installed. Existing agent logins/subscriptions are not
borrowed; hennery never proxies agent licences (umbrella §1.1).

Optional plug-in settings, per owner/hat, name an endpoint, model, encrypted
credential and permitted operations. The owner supplies credentials for that
provider account and sees the destination before enabling egress. No global
or other-hat provider fallback. Secrets use the plug-in's private encryption
key with namespace-bound associated data; configuration/rotation requires
step-up. Use the kernel egress policy/library, origin-only logs and bounded
timeouts. Credentials never enter MCP results or imported/exported content.

Only these steps need a model, if selected:

- An asynchronous note summary from bounded completed-turn excerpts. Keep
  the deterministic observation and separate model summary; no memory creation.
- A requested model brief from at most eight already-scoped entries. One
  call, no model tools, no iterative query expansion/reranking initially.

Cap each call at 8,000 input and 1,000 output tokens; reserve budget before
dispatch, including concurrent jobs. Optional daily token budgets stop new
calls. Store provider/model, usage and generation time; display measured
tokens. If prices are owner-configured, estimated cost is input tokens times
input unit price plus output tokens times output unit price, with units/date
shown. Do not promise a fixed dollar amount or free model service.

Validate response bounds and source-id allowlist; refusal, unknown sources,
truncation, malformed output, budget exhaustion or timeout falls back to the
deterministic result with a reason. A failed summary never advances its
coverage or replaces good content. Coalesce updates, check revision/epoch and
lease again before commit, discard late output after purge. No automatic paid
retry on unknown delivery. A provider may retain data already sent; enabling
model work makes that limitation explicit. Startup always stays deterministic.
Attach provenance from validated source records after generation, never from
model-authored labels. A model claiming operator approval cannot upgrade a
Parent/ChildReport source or the outer PluginContext into operator authority.

## 6. Scoped predecessor vault import

### 6.1 Source evidence

Read-only inspection of claude-monitor at
`fbf6b843a2e0b6ebc276ccb8297edc9b3a5451e0` established:

| Source | Relevant format or behavior |
|---|---|
| `internal/memory/vault.go` | `notes/<scope>/<slug(session_id)>.md`, `memories/<scope>/<slug(name)>.md`, `sources/<scope>/<slug(name)>.md`; `.memory/index.db` derived; batched git history |
| `internal/memory/types.go`, `frontmatter.go` | Note top-level fields: session_id, scope, origin, machine, cwd, git_branch, times, entities, in_flight, last_event_id, stale/error; body summary and Facts/Decisions/Pending/Corrections sections |
| Same files, memory decoder/encoder | Name/description and nested metadata: type, scope, origin, source_session, entities, supersedes, checksum, updated_at; legacy originSessionId alias; unknown metadata retained |
| `internal/memory/import.go` | Earlier import copied project memories and whole rules documents; legacy fields may be absent, source documents need no frontmatter |
| `internal/memory/scope.go` | Hard-coded context names, path-based guesses, privileged personal scope and shared-read union: none is a hennery authority rule |
| `internal/server/memory_writer.go`, `internal/memory/writer.go` | Turn-end rolling notes, model-dependent writer, prior content retained/stale on failure |
| `internal/memory/brief.go`, `index.go` | Source-backed retrieval with optional deterministic brief fallback; retain these properties |
| `internal/server/mcp.go`, `memory_api.go` | Existing memory tools and management surfaces; cwd-based tool scoping is not an authenticated hennery session principal |
| `cmd/collector/main.go`, `cmd/hook/main.go` | Explicit vault configuration; SessionStart orientation-card fetch with 2.5-second timeout and caller machine/cwd |
| `docs/specs/2026-09-15-session-memory-design.md` | Observations/assertions separated, original documents preserved, no automatic compilation into accepted knowledge |

No private vault, real credentials or running predecessor service was read or
changed. Real scope mapping is input supplied during the operator's cutover.
Public examples/fixtures use invented scopes and content only.

### 6.2 Import workflow

The reference plug-in owns a one-shot local importer. Read a user-supplied
vault snapshot, never the live legacy database or its git history/hooks.
Produce a manifest/dry-run before applying to the plug-in store. A remote UI
upload uses a bounded bundle; no HTTP API accepts a server filesystem path.
Never modify the original vault, agent rules or hooks.

Map every scope or per-file override to **exactly one target namespace/hat**,
or `exclude`. Unscoped/shared material and directory/frontmatter disagreements
remain unresolved until explicit per-file mapping. No fallback to personal,
current or all hats. Mixed-context documents remain excluded until the owner
supplies an edited copy for one hat. No automatic duplication of shared rules.
An imported reference whose target maps to another hat stays an opaque legacy
reference; it cannot link to or retrieve the other namespace's entry.

Accept the three known subtrees only. Skip `.git`, `.memory` and pointer-only
`MEMORY.md`. Reject traversal, absolute paths, duplicate entries, symlinks,
hard links, non-regular files and excessive depth; cap 2 MiB/file, 10,000 files
and 100 MiB expanded input. Parse a documented constrained frontmatter grammar;
reject duplicate authoritative keys, aliases/tags and unsupported structures
instead of guessing. Preserve unknown bounded scalar metadata inertly and
source documents whole. Report oversized/unparseable files, not silent loss.

Dry-run displays per-hat/kind counts, exclusions, conflicts and redactions.
Apply requires the same content/mapping digest. Commit each hat atomically;
report committed versus untouched hats if another fails. A ledger keyed by
owner/hat/source-vault/path and sanitised-content-plus-metadata digest makes
retry idempotent. Changed content conflicts rather than overwriting edits.
Namespace legacy session ids by source vault, never attach them to a coincident
native session. Legacy event ids/checksums are provenance, not feed cursors.
Imported notes are labelled legacy observations and do not regenerate.

Preserve notes, memories and source documents as distinct kinds. Redact before
storage/indexing; show changed fields. No broad extraction or model calls.
The operator backs up the old vault, confirms mapping, imports, then checks
representative recent/search results in each isolated hat before cutover.
Existing ACP sessions finish separately; no adapter transfer or global-rules
cutover. New feed capture starts only when its explicit grant is enabled.

## 7. Existing claude-monitor MCP as the alternative plug-in

| Deployment | What works | Additional work / limit |
|---|---|---|
| Mount existing service unchanged | Ordinary gateway transport can expose its existing recent/brief/search/remember tools | It knows legacy sessions only; caller cwd and legacy shared/personal rules do not satisfy hennery's hat isolation. Suitable only after proving a single isolated namespace/credential, not general cross-hat continuity |
| Adapt legacy service to the generic contract | Preserve its vault and UI without import; consume new completed activity and contribute startup context | Implement credential-bound owner/hat namespaces, activity cursor/lease, source-id namespaces, forget receipts, context capability, redaction and revocation; disable legacy cross-scope unions. Add deterministic writer if no-model operation is required |
| Separate bridge in front of legacy service | Contract compatibility can live outside core | Bridge must enforce scope for every tool, feed write, startup and delete; never pass an unrestricted token/caller cwd through. A global legacy API that cannot select an isolated namespace is insufficient; use separate legacy instances/vaults or change the service |
| Reference hennery-memory | Independent native integration, deterministic operation, scoped import and no legacy runtime dependency | Separate installation/store/UI and importer required |

The contract is identical for adapted legacy and reference services. No
legacy-specific endpoint, callback, model dependency or client mapping enters
core. The old writer must distinguish legacy and hennery session ids and avoid
processing the same session twice. A mount by itself neither feeds hennery
turns nor arranges startup context nor proves purge. Unchanged deployment
cannot honestly be called a complete retirement path for claude-monitor.

## 8. Security and failure handling

Hats constrain hennery-controlled channels; they do not sandbox a malicious
agent or plug-in running as the same OS user (umbrella §8.4). Separate users/
containers/hosts are needed for that. An arbitrary service can lie about
erasure or leak its own data; core limits what it sends and reports evidence
truthfully. A reference namespace cannot read another namespace by choosing
a path, source id, cursor, project filter or requested hat.

The current `hennery-sessions/src/redact.rs` recognises only `hnry_session_`.
**C1 extends the shared first-party redactor before issuing new tokens** to
include `hnry_activity_`, `hnry_lifecycle_` and `hnry_plugin_`. All use 64
random hex digits; preserve the existing conservative case-insensitive,
partial-token behavior (prefix plus at least eight hex digits masks the
whole token-shaped run). Share the matcher with the plug-in; do not maintain
drifting scanner definitions. Structured credentials/cookies/Authorization
never enter the projection.

The ordering is **assemble logical text → redact → truncate → persist/index/
export/render/send to model**. Bounded streaming assembly must keep enough
lookbehind to catch prefix and suffix split across chunks; on an assembly cap,
discard an incomplete sensitive run rather than storing or exporting its
unredacted prefix. Cover tool-visible/feed/startup text, imported bodies and
metadata, owner/agent writes, error text and model output. Extend existing
ingest redaction for the new classes too; do not log raw chunks before the
scanner. Return visible redaction notices, never token values.

**Arbitrary provider secrets in plaintext are not covered by this shape-based
redactor**, nor are arbitrary encodings/obfuscations of tokens. Do not claim
that secret-field exclusion or these prefixes solve plan 8e's broader
env-value redaction question. No bodies, queries or private paths in logs;
no memory in Web Push, service-worker caches or anonymous HTTP responses.

Reference purge removes every entry kind, source ref, FTS posting/shadow data,
cursor/job, import/idempotency record, suppression, settings and namespace
provider credential. Cancel work, block readers, discard late outputs, use
secure deletion and checkpoint after readers drain. Deleting an FTS row is
not by itself an erasure claim: prove the bundled FTS deletion facility or
rebuild the derived index without that scope, then scan DB/WAL fixture markers.
No claim covers exports, remote-provider retention, backups or flash remanence.

| Failure | Required behavior |
|---|---|
| No plug-in configured | Existing core behavior; no plug-in files/workers or hidden model activity |
| Plug-in down | Agent tools fail visibly; core sessions continue; optional startup times out without an extra prompt |
| Activity disconnect/duplicate page | Cursor retry and idempotent fold; last note visibly stale, no false freshness |
| Revoked/expired lease | Reference stops serving namespace; authenticated forget or owner deletion erases it; 404/network failure does not erase |
| Core restart between databases | Reconcile pending state against authoritative core before grants; conservative denial/binding beats leakage |
| Delete/purge racing feed/context/model | Freeze/recheck/cancel; no new authorised source data, no resurrected derived content |
| Invalid import mapping or changed bundle | No guessed scope; explicit conflict and no write for failed hat transaction |
| Provider failure or budget exhausted | Deterministic output and reason, no invisible paid retry |
| Unsupported host/MCP isolation mode | Explicit missing capability; no shared-config workaround |

## 9. Testing and acceptance

Core contract tests:

1. Opt-out: old core DB schema unchanged; no control DB, registrations,
   workers, prompt blocks or mounted tools when unconfigured. Gateway-only
   mode remains independent of memory.
2. Two owners/multiple hats, same ids/paths, hostile queries/cursors: no
   foreign content/count/title/timing metadata in feed/context. Extend SQL
   owner auditing to optional control and projection queries. Differential
   parsing tests for duplicate, escaped and case-varied authority keys.
3. Token scope/rotation/revoke, browser Origin/CSRF, gateway credential stripping,
   per-hat upstream credentials, management-tool allowlist, egress failures,
   frozen hats and connection deletion/edit. Registered connection mutation
   invalidates the old grant before new destination traffic is allowed.
4. Feed replay, deletion-before-read, source reset, cursor gaps, inventory
   watermark races, old readers, reassign refusal, two-database crash points
   and every plan 9 phase. Revert-probe each scope/cancellation/binding guard.
   Specifically: register an already-mounted connection while a session runs,
   let it issue a proxy read, park it, and prove reassignment refuses; race the
   read/registration/mount change against reassignment in both orders. Assert
   control-binding failure sends no upstream request. Crash after each of the
   two stores commits and verify conservative binding/denial on restart.
   Prove a second collector/gateway writer cannot bypass the optional-store
   process lock, including the first-registration transition.
   In both purge entry points, stall remote forget and prove session tokens
   are already revoked and all streams/feed/context work cut. Repeat through
   restart and failed obligation persistence. Exercise every §3.4.1 crash
   row for URL/path changes, deletion and unmount; old lifecycle credentials
   never reach a replacement endpoint or redirect, even on recovery. Assert
   unmount immediately cuts the feed/lease and cannot fall through to ordinary
   proxy access, while the external lease expires within at most 60 seconds.
5. Startup: same prompt once, generated context excluded from the feed,
   provenance visible, timeout/unsupported path, no reinjection on resume,
   unknown-delivery reconciliation and revocation before dispatch.
6. Typed provenance round-trips `Operator`, `Parent`, `ChildReport` and outer
   `PluginContext` through storage, feed, notes, brief and prompt serialization.
   Supply hostile instructions, spoofed context delimiters and “operator
   approved” labels in parent/child reports, imports and model output: they
   must never change typed origin, satisfy an approval/step-up check or acquire
   operator authority. Revert-probe the origin guard and reject unsupported
   new input provenance rather than folding it into `UserTurn`/Operator.
7. Redact every first-party token class, including uppercase/partial tokens,
   tokens split at every chunk boundary and tokens crossing a truncation cap,
   before feed/context persistence, FTS, export and model dispatch. Include
   metadata keys/values and errors; negative fixtures document that an
   arbitrary plaintext provider secret is not promised to be detected.

Reference plug-in tests:

1. Atomic cursor/projection updates, duplicate pages, suppression, failed/
   cancelled-turn exclusion, imported/native id collisions, concurrent edits,
   purge/lease/model races. Body/FTS deletions, marker scans and other-hat
   survival. Global corpus additions cannot affect scoped ordering/counts.
2. Golden scrubbed legacy fixtures for all formats, unknown metadata, legacy
   aliases, absent/conflicting scope, shared/mixed document exclusion, bounds,
   archive/path attacks, retry/conflict behavior and content/provenance export.
3. Claude/Codex transcript goldens through the existing fold, chunk-spanning
   tokens, UTF-8/truncation, thinking/tool/context exclusion and unknown gaps.
4. Management UI: authentication/Origin/step-up, exact/role locators, scoped
   edits, source provenance, note suppression, import preview, safe Markdown
   and mobile layout. No core memory navigation without an external plug-in.
5. Optional provider: budgets under concurrency, citation allowlist, refusal/
   truncation, no cross-hat egress, deterministic fallback; one live call with
   explicitly configured test credentials before claiming provider support.

Live acceptance uses scratch data and pinned Claude/Codex adapters: mount a
reference namespace, complete a turn, observe its feed record/note, start a
second session and inspect actual prompt context/tool results, remember a
marker, and prove a different hat cannot retrieve it. Repeat park/resume/token
rotation and purge with the plug-in online/offline. Include zero upstream
memory mounts, dedicated non-default-hat hosts and the mixed-host Codex
fallback; full mixed-host delivery remains gated on 8h. Verify recorded
protocol/store output, not an agent saying it succeeded. Do not deploy or
restart the running predecessor to conduct these checks.

## 10. Plan split and review hand-off

Sizes are implementation/verification scope, not elapsed time. Core work is
explicitly separated from plug-in work; the core contract does not implement
memory. “Small core” means a narrow generic API, not waived security work.

| Order | Plan | Size | Completion boundary |
|---|---|---|---|
| C1 | Generic feed/lifecycle: namespace identity, optional registration, activity and deletion | M–L, 3–4 tasks | Existing mounts reused; optional control store, running-session exposure/reassignment gate, typed provenance/PluginContext contract, unmount cuts, terminal connection transitions, revoke-before-wait purge, new-token redaction and crash/isolation tests; no memory code |
| C2 | Optional generic startup context delivery | S–M, 2 tasks | Uses C1's typed PluginContext and exposure guard; capability-gated prompt block, timeout/reconciliation and both live adapters; may follow R1 |
| R1 | Reference memory service, store, four MCP tools and deterministic note consumer | L, about 4 tasks | Separate binary/data/auth, FTS, no-model operation, lease/revoke/purge, live tool proof; consumes C1 |
| R2 | Reference management UI, scoped vault import and export | L, about 4 tasks | Separate authenticated screen, curated CRUD, manifest preview/apply, provenance and deletion/export proof; consumes R1 |
| R3 | Optional model summaries/briefs | M, about 3 tasks, later | Per-hat credentials/egress/budgets, usage visibility, live provider test and deterministic fallback |

Recommended execution: C1 → R1 → C2 → R2; R3 is optional. C1 must not expose
activity until deletion/revocation is implemented. R1/R2 can be split into
smaller PRs within their plans. Independent minimum continuity is C1, C2,
R1, R2, with no model account. Existing legacy adaptation is an alternative
implementation of R1/R2, not extra core scope or automatic parity.

C1 owns the generic namespace identity/feed/lifecycle contract and its
provenance wire shapes; delegation depends on that contract. Delegation D1
owns its internal `SessionToolContext` seam, and D3 supplies parent/child
turn-origin production. C1 can be implemented against the typed contract
before D3 execution, but must reject unsupported delegated origins until the
producer is available. C2 owns actual startup injection and adds the typed
PluginContext origin before writing any prompt. The **generic signed-principal
extension** (signed per-session attestation) is deferred to a separate reviewed
plan, named identically in delegation; it is not hidden inside C1 or R1.

Each plan uses plan 3c's structure, built/replayed code and repository checks.
Targeted tests plus the full required suite run per implemented task; this
document-only change runs consistency/hygiene checks, not builds. Record real
Linux/macOS and live-adapter results before calling the feature ready.

Review record: Codex gpt-6-astra reviewed `0fe663b..8c3601ad` on the maintainer's
behalf, 2026-10-14: **approve after amendments**, no Critical findings. This
revision addresses running-session exposure, revoke-before-wait purge,
durable connection transitions, new-token redaction and the parent's later
shared-contract ruling; Q1 is resolved above. Request scoped re-confirmation
of those changes, especially the two-store crash ordering and provenance
boundaries. It is not yet an unconditional approval or implementation claim.

Generated with Claude AI — please review before distribution.
