# hennery — parent/child sessions and the built-in session MCP

- **Date:** 2026-10-14.
- **Status:** proposed design; needs parent review and the operator decisions
  in §12. No implementation or live acceptance is claimed.
- **Scope:** sessions delegate work to independently configured children,
  receive their reports and questions, and expose their families in the UI.
  This document owns **session-bound MCP delivery**, shared with optional
  plug-ins, and its built-in session-control endpoint.
- **Authority:** the [umbrella](2026-09-25-hennery-architecture-design.md)
  wins. The parent's brief explicitly requests delegation, including any
  runtime/model offered by the host. §11 identifies the narrow spec amendments
  that must be ratified before implementation; this draft does not silently
  change the umbrella's operator-only controls.
- **Evidence:** source inspected at `0fe663b86f7d61d3ff358eac7d7e8ea57dff64bf`;
  [ACP core](2026-09-26-acp-core-design.md),
  [gateway](2026-09-26-mcp-gateway-design.md),
  [kernel](2026-09-26-kernel-design.md),
  [client view](2026-10-02-client-view-design.md), and
  [plan 8e](../plans/2026-10-16-gateway-session-delivery.md).
  The private predecessor's parent/child design and
  `internal/server/session_tools.go` were read; no private deployment details
  or dependency on that service are introduced here.

---

## 1. Goals and boundaries

A parent starts a child in a selected directory, supplies a brief, chooses its
runtime and configuration, sends follow-ups, inspects progress, answers ordinary
questions, and closes finished work. The child gets its own ACP session and
adapter process. A child can use a different runtime or model from its parent.
Its turn ending is a report to the parent, never a declaration that the task
is verified or that the operator approved anything.

Reports, questions and failures survive collector restarts. A parent busy with
another turn receives them when it can take a prompt. A parked parent can be
resumed. If the parent cannot take responsibility, the operator sees the
unresolved work and receives the existing hat-scoped notification. The operator
can always open a child and answer directly.

The first increment does not create or remove Git worktrees, adopt unrelated
sessions, move sessions between hosts, import predecessor conversations, expose
an arbitrary-session transcript reader to agents, or add a board or chat-app
orchestrator. **Core** owns session identity, scoped MCP delivery, lifecycle and
the small generic plug-in contract. Delegation's lifecycle tools are built in
but **off by default, opt-in per hat**. **Optional plug-ins**, including memory,
run as MCP services connected through existing gateway connections and mounts;
they are not compiled-in memory handlers or forced background jobs. Memory's
indexing, storage and tools belong to that plug-in's design. This distinction
implements the operator's steer of 2026-10-14.

Recommendation: launches stay on the caller's host and in its hat initially.
Any configured runtime that host actually offers remains selectable. Cross-host
placement is a later extension with an explicit host grant; no new host-wide
or installation-wide session-list capability is implicit in delegation.

## 2. Decisions

“Designer’s recommendation” means pending review, not an operator ruling.
The two OPERATOR QUESTIONS are reproduced verbatim in §12.

| # | Chosen option | Alternatives rejected and reason | Classification |
|---|---|---|---|
| D1 | Collector is canonical; existing lifecycle, pending set, answer queue and host outbox remain authoritative. | A second child-session engine or in-memory delivery goroutines lose reconciliation and restart guarantees. | **settled by spec** — umbrella §§5.2, 5.5–5.7, 6.1, 6.8. |
| D2 | One session-bound delivery/identity mechanism; opt-in built-in delegation at `/mcp/builtin/hennery`, optional plug-ins through existing mounts. | Embedded memory forces a feature on all users; a second session-token scheme duplicates identity. External plug-in endpoints are intentional, not a second session identity. | **designer's recommendation** for the mechanism; opt-in/plug-in boundary mandated by the operator, 2026-10-14. |
| D3 | Reuse rotating `hnry_session_…` bearer tokens and revocation watches; identity never comes from tool arguments. | Predecessor token-in-URL and reusable plaintext token storage conflict with current delivery and revocation. | **settled by spec** — umbrella §8.3; gateway §§3.1–3.2. |
| D4 | Built-in tools obey the same delivery/isolation decision as external mounts. | Offering memory or delegation to a non-default-hat unisolated adapter bypasses the existing boundary. | **settled by spec** — umbrella §8.5; plan 8e. |
| D5 | Child runtime/model/config are independent; explicit unavailable values fail without running the brief on a substitute. | Cloning the parent's runtime or falling back silently violates the operator's instruction. | **designer's recommendation**, implementing the explicit brief; selection is already in umbrella §1.2 and ACP core §4.3. |
| D6 | Same host and hat, direct-child authority only; canonical workspace-root check before spawn. | Arbitrary placement and transitive family control enlarge authority before there is a host grant model. | **designer's recommendation**; hat separation itself is **settled by spec**, umbrella §8. |
| D7 | Persist command acceptance and child-event delivery; reuse one-turn scheduling and reconciliation. | Blind retry after a timeout can duplicate work; polling-only parents miss the promised reporting loop. | **designer's recommendation**, constrained by umbrella §5.7 and ACP core §4.4. |
| D8 | Parent answers elicitation; ACP permissions remain operator-only by default. | Treating every pending callback as parent-answerable silently delegates execution approval. | **OPERATOR QUESTION Q1** — default in §12. |
| D9 | One generation of children initially; preserve a schema that can represent deeper trees. | Unlimited recursive spawning makes resource and escalation bounds unclear. A permanent flat schema makes future nesting unnecessarily hard. | **OPERATOR QUESTION Q2** — default in §12. |
| D10 | Explicit parent `session_close` closes only its direct child; never cascade close or delete. Closed parents are never auto-resumed. | Closing a family destroys independent progress; auto-resuming a closed parent contradicts “I am done”. | **designer's recommendation**, requiring the narrow umbrella §6.3 amendment in §11. |
| D11 | Parent/child inputs carry typed provenance and links; assistant reports stay untrusted. | Calling them operator turns poisons memory, notification budgets and authorization reasoning. | **designer's recommendation**; supports umbrella §§5.2, 8.3. |
| D12 | Fall back after a bounded delivery/handling delay, without expiring the question. | Suppressing attention just because a parent row exists can leave a child blocked forever. | **designer's recommendation**; no pending timeout is **settled by spec**, umbrella §6.5. |
| D13 | Reject a present foreign Origin at the built-in endpoint; allow missing Origin with bearer auth. | Requiring browser Origin breaks agents; inheriting the gateway proxy's complete Origin exemption misses the MCP server transport requirement. | **designer's recommendation**; explicit kernel clarification in §11. |
| D14 | Stateless HTTP MCP responses; no server-to-agent notification stream for child events. | MCP notifications alone do not reliably start an ACP parent turn or survive a restart. | **designer's recommendation**. |
| D15 | Close/delete/reassign terminate routing authority explicitly; no family ownership can be acquired by changing an id. | Cascading deletion and automatic adoption either lose independent work or create a confused deputy. | **designer's recommendation**; delete/step-up remains **settled by spec**, umbrella §6.10 and kernel §3.4. |

## 3. Shared foundation: session-bound MCP delivery

### 3.1 Identity and delivery

The built-in session-control server name is **`hennery`**, its endpoint is
**`<public_url>/mcp/builtin/hennery`**, and the credential is the session's
existing **`Authorization: Bearer hnry_session_…`**. Optional memory and other
plug-ins are ordinary mounted MCP entries, reached at `/mcp/<slug>` with that
same session bearer. Both use `SessionMcp::servers_in`, ACP delivery, principal
resolution and revocation; there is no second agent token, guessed session
identity from cwd, or user-provided caller id. Memory tools are served by the
plug-in, not registered on the built-in endpoint.

Add `hat_session_tools { owner_id, hat_id, delegation_enabled, revision }`,
defaulting to disabled for every existing and new hat. The operator enables it
through `PATCH /api/hats/{id}/session-tools { delegation_enabled: bool }`,
behind the existing browser Origin/cookie checks and step-up; authenticated
`GET` returns the flag and revision. Enabling takes effect at the next start or
resume; show this in the UI. Disabling immediately denies built-in calls,
cancels undispatched delegation work and routes outstanding attention to the
operator. Already delivered work continues as an ordinary session. Do not
revoke unrelated external mounts: cut built-in in-flight calls with a separate
hat-grant watch in addition to the existing token watch. Recheck this grant at
acceptance and dispatch. Re-enabling does not replay cancelled work.

This is a collector-local server, not a `gw_connections` row or a proxy
upstream. External `/mcp/<slug>` routes stay external. The binary wires the
exact built-in route before the proxy's deeper-path rejection; tests must prove
that a connection whose slug is `builtin` still works at `/mcp/builtin` and
that other deeper paths remain rejected. The built-in entry's name is reserved
against delivered local stdio names; configuration must reject a collision.

Extend `SessionMcp::servers_in` with a typed optional built-in descriptor,
provided by trusted full-mode wiring only when the hat opted in. Its fixed
path/name cannot come from an agent or connection URL. Mint exactly one token
if either a built-in entry
or external HTTP mounts are to be delivered; reuse it in all their headers.
Today `session.rs` mints none when there are no external mounts: this condition
must change. The session row, family edge, token and delivery decision commit
before sending the start/resume frame. A failed transaction sends nothing.

The same `mcp_session_delivery` decision gates both kinds of entry. A host with
no MCP delivery capability, or an adapter in the fallback's non-default hat,
gets neither. The launcher/status explains `session_tools_unavailable`; an
agent launch cannot waive isolation. Until plan 8h proves Codex isolation,
this is a real deployment constraint, including for memory. The design never
restricts model selection merely to make isolation appear to work.
Built-in authorization also rechecks the current delivery eligibility. In
particular, a host default-hat change cannot leave an old unisolated token
authorized for delegation after its hat becomes non-default. Plan 8e's wider
open question about external streams remains separate; do not inherit that
gap for these more powerful built-in tools.

Mint on start and resume; revoke/cut through existing `commit_then_cut`
paths on real park, close, loss, failure, reassign, delete and host revoke.
Presumed parking does not revoke (gateway §3.1). On the built-in endpoint,
register the token watch before resolution, keep it through the response, and
recheck scope inside each state-changing transaction. Revocation stops new
acceptances; it cannot undo an operation committed before it. Such an operation
has a durable receipt and is subject to the family-lifecycle rules in §7.

Initialization and tool discovery must work while the session is `starting`:
adapters contact MCP during `session/new` and `session/load`. Do not recreate
the predecessor's pending-token/bound-token lookup race. The session id and
token are already committed together. Mutating tools return `session_starting`
until the caller is attached and reconciled; tool discovery is stable during
this interval. A plug-in startup call may use the same committed identity in
`starting`; it does not gain delegation mutation rights.

### 3.2 Module seam and contract for memory

The gateway continues to import nothing from sessions or memory (umbrella §9).
Reuse its identity resolver, token type and revocation watcher behind a small
public authentication seam. Full-mode wiring supplies the owner from the
owner-scoped store: `Principal` currently includes session/host/hat but not
owner, so the endpoint must never accept a client-provided owner to complete it.

The session-side built-in router constructs a private
`SessionToolContext { owner_id, session_id, host_id, hat_id, canonical_cwd,
token_generation }` after verifying the session row against that principal.
`token_generation` is an internal revocation fence, never returned to a tool.
Handlers receive this context, bounded typed arguments, and a cancellation
watch. They do not receive the plaintext bearer. Rechecks use the same
transaction as reads/writes where authorization could race a reassign/purge.

Only session-lifecycle tools are registered in the built-in router. An external
plug-in uses the existing gateway mount and upstream service authentication;
never forward the raw hennery session bearer to it. The shared generic contract
must make the gateway-resolved `SessionToolContext` available to explicitly
registered plug-ins without trusting tool arguments. Recommended shape: a
collector-signed, short-lived request context, audience-bound to the connection
and grant revision, forwarded in a reserved header stripped from agent input.
Only disclosed fields are included; cwd disclosure is separately scoped.
The plug-in validates the collector key pinned at registration, signature,
audience and expiry. This attests caller identity; it is not a bearer capable
of calling the collector or other plug-ins. Ordinary vendor connections get
no context header. Final encoding/key rotation belongs to the generic plug-in
contract plan, coordinated with memory; do not ship an unsigned claimed identity.

The generic core contract additionally offers an **opt-in scoped event feed**
for completed turns, with owner/hat authorization derived from a connection's
explicit grant. A service feed credential is distinct from a live agent token;
it does not impersonate a session or gain session-control tools. Feed cursors
cannot widen scope. Revocation/unmount/purge cuts the feed and pending delivery;
stored plug-in copies follow its documented retention/deletion contract. Optional
startup context uses the same scoped plug-in grant and is marked plug-in data,
never operator instruction. Its plan adds a distinct `PluginContext` provenance
variant before it can write a prompt; it cannot reuse `Operator`. No feed or
startup callback runs without opt-in.
The memory lane owns that generic feed/startup API proposal; delegation supplies
turn provenance and the identity seam, without implementing memory logic.

Memory may read only its verified context's owner/hat and approved subscopes.
An optional cwd can narrow a lookup after canonical validation; it cannot
choose an owner, hat or caller. Plug-ins must honor revocation, purge and
provenance (`Operator`, `Parent`, `ChildReport`) and must not promote a child's
claim of approval into an operator decision. Generic gateway-only mode still
builds without sessions or memory; session activity feed/context capabilities
are unavailable there. This design defines no automatic memory capture,
cross-hat sharing, import policy or LLM endpoint.

### 3.3 HTTP and MCP behavior

Use Streamable HTTP with JSON responses: `initialize`,
`notifications/initialized`, `ping`, `tools/list` and `tools/call`. Accepted
notifications return 202 with an empty body. Authenticated GET/DELETE return
405; there is no SSE channel or MCP session id. No sampling, resources,
prompts, server elicitation or legacy HTTP+SSE is advertised. Child questions
are ACP pending requests, not MCP server elicitation.

Negotiate supported protocol versions with pinned-adapter fixtures; reject
unsupported version headers. Tool results provide typed `structuredContent`
and a matching JSON text block for clients that use text. Tool execution
failures use `isError`; malformed protocol messages use JSON-RPC errors.
These choices follow the official [transport specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
and [tool result contract](https://modelcontextprotocol.io/specification/2025-11-25/server/tools).

Bearer authentication never falls back to cookies. Missing, repeated,
malformed, revoked, superseded or foreign tokens get the gateway's uniform
404. A present Origin must equal `public_url`'s origin; invalid Origin gets
403 before reading the body. Missing Origin is accepted. No CORS; no tokens
in URLs, logs, tool results or timeline events; `no-store` and `nosniff` on
responses. Use bounded early-reject draining so a large refused body does not
turn a useful refusal into a reset (plan 8e's deferred item).

Parse a single JSON-RPC message once with strict typed dispatch. Reject batches,
duplicate keys, invalid encodings and ambiguous argument shapes. Never validate
one representation and execute another. Share safe primitives with the proxy,
not its upstream forwarding path. Retain the gateway's body/deadline ceilings;
tool-specific limits below are smaller. A disconnected HTTP caller does not
cancel an already committed spawn or send.

## 4. Agent-facing tools and launch configuration

All new public shapes live in Rust in `hennery-proto` (view types in
`hennery-view`), derive JSON Schema and TypeScript as appropriate, and join
the existing generator checks. The descriptions below specify types; they are
not a second hand-written TS contract. `agent` means the configured runtime
identifier already used by `StartSessionRequest`.

| Tool | Typed arguments | Result and behavior |
|---|---|---|
| `session_capabilities` | `CapabilitiesArgs { agent: Option<String>, cwd: Option<String> }` | Caller-host runtimes, availability, config catalogs, catalog freshness, delivery modes, delegation policy and limits. Omitted cwd means caller cwd; supplied cwd is validated in the same hat. No other hats' paths, sessions or catalogs. |
| `session_spawn` | `SpawnArgs { operation_key: String, cwd: String, brief: String, name: Option<String>, agent: Option<String>, config: SessionConfig }` | `OperationReceipt` with a durable child id once allocated, launch/config state, and initial-brief delivery state. No caller/parent/host/hat argument. |
| `session_send` | `SendArgs { operation_key: String, child_id: String, text: String }` | Accept a follow-up into the child's bounded durable queue. Resume a genuinely parked child first; never reopen a closed one. |
| `session_answer` | `AnswerArgs { operation_key: String, child_id: String, pending_id: String, action: ElicitationAction, content: Option<Value> }` | Existing answer acceptance receipt plus delivery state, for direct-child elicitation only under Q1's default. `accept` content is an object; validate through the same answer service as the operator. |
| `session_status` | `StatusArgs { child_id: String, operation_key: Option<String> }` | Lifecycle/activity, selected and requested config, open questions, last turn outcome, bounded last assistant report, queue/receipt states and fallback reason. |
| `session_list` | `ListArgs { cursor: Option<String>, limit: Option<u16> }` | Paginated direct children and brief state summaries; no recursive or owner-wide enumeration. |
| `session_close` | `CloseArgs { operation_key: String, child_id: String }` | Explicit close of that child, cancellation of unstarted follow-ups, and existing confirmed/unconfirmed close outcome. No delete or filesystem cleanup. |

`OperationReceipt` carries `operation_id`, optional `child_id`, `turn_id` or
`pending_id`, and a tagged state: `accepted`, `waiting_config`, `queued`,
`awaiting_reconciliation`, `delivered`, `completed`, `not_delivered`, `cancelled`
or `failed { code }`. Delivery is not completion. Spawn's idempotency key can
also be queried by retrying the same spawn; it must not require knowing the
child id from a lost response. `session_status` presents per-operation records
alongside session state rather than overloading lifecycle with these values.

Every mutation requires a bounded opaque `operation_key`. Uniqueness is
`(owner_id, caller_session_id, operation_key)` across tool names. Same key and
same canonical typed request returns the existing receipt; same key with a
different request returns `operation_conflict`. Persist the digest and receipt
before side effects; token rotation does not invalidate this session-scoped
deduplication. Explain this retry contract in tool descriptions.

### 4.1 Catalogs and first prompt

Use one runtime/config catalog service for this tool and the dashboard launcher.
The current host `hello` runtime list and `session_catalog` are building blocks;
a complete pre-start catalog service is additional work, not something plan
8e already implemented. Cache by owner, host, hat, canonical cwd, runtime and
adapter/config revision; never use another hat's last-started session as a
catalog. Return `unknown`/`stale` honestly instead of inventing supported models.

For a cold catalog, a new capability-gated host probe obtains the adapter's
catalog in the validated cwd without a user prompt. If discovery requires
`session/new`, use a bounded disposable probe adapter with no MCP entries,
publish no user session, and release it on success, error or timeout. Agent
hooks can still run: this is a trusted-host operation, not a side-effect-free
filesystem read. Limit concurrent probes and deduplicate identical requests.
If the adapter cannot safely supply a pre-start catalog, report it unavailable;
an explicitly requested model can still be validated against the actual newly
created child's catalog before the brief is sent. No silent defaulting.

An omitted agent inherits the parent's agent. An omitted model inherits the
parent's current model only for the same agent; otherwise use that agent's
reported default. Other axes and permission mode use the chosen runtime's
defaults unless explicitly supplied: a privileged parent mode is not silently
inherited. Explicit values are checked against the target catalog and then
against the newly started child's reported configuration. Apply model, axes,
then mode, as ACP core §4.3 requires.

Model/effort selection must not become a permission-policy bypass. Parent
launches cannot select a sandbox/approval mode more permissive than the
operator's granted execution policy for that hat. Adapter profiles must identify
security-relevant axes rather than trusting model-provided labels; an unknown
security mode requires operator configuration. Enabling delegation alone does
not authorize disabling permission prompts. This leaves every offered runtime
and model selectable within the operator's execution policy.

Start the child **without its brief**, wait for `session_started` and config
read-back, then submit the brief through the normal turn path. A rejected or
clamped explicit setting leaves an attached, visible child in `waiting_config`
with no brief delivered. This preserves ACP core's rule that a config failure
does not fail an otherwise successful start. The operator can fix configuration
in the existing UI; the saved brief is released only when its required values
are confirmed, or cancelled explicitly. A fresh spawn with another operation
key is a distinct child, not an implicit retry.

The canonical cwd must exist, be a directory under the host's canonical workspace
roots, and resolve to the parent's stored hat. Check before allocating the
child, and again at the host spawn boundary; a symlink/root/rule change cannot
start work in a different directory/hat using a stale grant. Use bounded opaque
refusals, not another hat's name or matched path rule. Starting in a worktree
is supported, but creating one remains the parent/operator's responsibility.

### 4.2 Questions and authority

Use the existing `pending_id`, never the ACP request id. The tool does not parse
raw ACP itself: question display/schema comes from `hennery-view`; pending kind,
option ids and answerability come from canonical typed extracts. Match existing
answer validation; the adapter remains responsible for its elicitation schema
semantics (ACP core §4.6). Parent and operator submissions share the transaction
and unique pending-id answer slot; first accepted submission wins, and the UI
only marks answered after `answer_result { delivered: true }`.

Under Q1's default a parent may accept/decline/cancel ordinary elicitation,
including answering from its brief. Permission requests always remain operator
attention and are rejected by `session_answer` with `operator_required`.
The parent sees a status notification that intervention is needed, without an
answer-capable permission schema. A parent must escalate new product decisions,
missing facts and unauthorized outward actions through its own question tool.
This semantic boundary is guidance to a model; it cannot reliably classify an
arbitrary elicitation as “actually a product decision”. Enforce privileged API
restrictions independently of that guidance.

## 5. Durable commands and reporting

### 5.1 One prompt at a time

Both accepted parent follow-ups and child-to-parent reports use a collector
queue. A worker reserves the destination's existing turn slot atomically and
sends the normal `prompt` control frame. Host actor serialization remains the
final guard; `blocked` counts as busy. Do not add the predecessor's separate
unsequenced `inject` frame or overlap an operator prompt with a report.

Queue acceptance and the destination turn reservation are distinct. When
dispatching, persist the operation-to-turn mapping and its reserved slot in
one transaction. `turn_started` acknowledges delivery; `turn_ended` records the
outcome. Never mark delivered from a socket write, MCP success or model prose.
Operator prompts retain their current `turn_in_progress` response; whichever
submission reserves the slot first wins. Queued work never interrupts a turn.

An idle destination drains FIFO. A parked destination is resumed once through
the normal resume path, only after any reconnect reconciliation. A presumed
park with an unreconciled host is not permission to launch another adapter.
Closed, deleted, failed-to-resume or hat-mismatched destinations stop dispatch
and cause the visible fallback below. Pending questions in the destination
prevent report prompts, even when asked outside a turn.

### 5.2 Source events and delivery identities

On an applied child `turn_ended` (including synthesized interrupted outcomes),
an applied `pending_opened`, or an applied start/resume failure, record a
`DelegationNotice` in the same transaction as that fact. Its kind is
`TurnEnded { turn_id, outcome }`, `Question { pending_id, kind }` or
`SessionFailed { code }`. Unique key:
`(owner_id, child_id, source_event_id, notice_kind)`.
Use applied outcomes only; replayed/non-applied facts create nothing. One
failed/interrupted turn produces one report with its failure detail, not a
second redundant generic-error report. Failures outside a turn get their own
notice.

Persist references to source events, not a second full transcript. At dispatch,
read the bounded assistant report through `hennery-view`, preserve its ending
on a UTF-8 boundary, and include `truncated`, turn id and a dashboard link.
Never parse raw ACP a second time in sessions to find “the final answer”.
A completed turn without assistant text still yields an outcome and link.
Unrecognized adapter output is visible, not silently treated as success.

Each delivery receives a stable `delivery_id`; allocation of its destination
turn and association to its notice are atomic. Workers claim rows with a lease,
retry pending claims after restart, and recheck family/hat/pending state before
dispatch. A resolving question is marked obsolete before dispatch; a report
already delivered cannot be taken out of the model's context, so a later
answer still checks the live pending set.

### 5.3 Reconnect and honest retry semantics

No new exactly-once claim is made about an LLM or ACP side effect. The durable
queue guarantees that every accepted item has a recorded disposition and that
the collector does not knowingly dispatch the same delivered turn twice.

If a connection drops after sending, mark `awaiting_reconciliation`, retaining
the same request/turn association. Do not resend a prompt or spawn while it
may have executed. After the host's outbox resend and reconciliation:

- An ingested start/turn fact settles the existing receipt.
- A proven undispatched queue item can be sent normally.
- A dispatched turn that becomes `not_delivered` stays visible and requires an
  explicit retry, as ACP core §4.4 does; notify the parent or operator. Late
  `turn_started` can still win. Do not create a replacement turn automatically.
- A started interrupted turn is a report of partial work; it is never replayed
  automatically. An answer, unlike a prompt, follows the existing durable
  pending-id resend/deduplication path.

Retries after an uncertain spawn reuse the operation key and child id; they
do not create a second worker. A parent token superseded on resume can query
its prior operations through its new token. Revalidation still denies a
detached family or another hat.

### 5.4 Fallback and limits

Routing state is separate from lifecycle: `parent_queued`, `parent_delivered`,
`operator_required`, `resolved` or `obsolete`, with a reason. Default
recommendations: 8 non-closed children per parent, 32 queued prompts/1 MiB per
destination, 64 KiB per brief/follow-up, 8 KiB per injected report and a page
of at most 100 child summaries. Also bound child creation to 32 starts per
root operator-prompt epoch, so closing/replacing children cannot bypass the
concurrent-child limit. Enforce caps transactionally. Do not silently
drop an accepted message. Queue overflow produces a receipt/refusal and an
operator attention record, never an unbounded payload backlog.

Persist a budget of 20 automatic parent wake-ups per family between actual
operator prompts to the root. Reserve budget in the same transaction as the
dispatch; retries of that delivery spend none again. Parent/child prompts and
memory jobs do not reset it. Closing and replacing children cannot reset it.
If Q2 permits nesting, apply the root budget and a maximum depth before enabling
it; do not ship recursion with a budget per edge alone.

Immediate fallback: parent closed/deleted, routing detached, permanent resume
failure, unsupported delivery, budget exhausted, or permission question under
Q1's default. A disconnected/busy parent gets a **five-minute handling grace**
from the notice's creation, persisted across restarts. An unresolved question
falls back even if its notification was delivered but its parent never answered.
This is an attention deadline, not a pending-request timeout: the question
stays open indefinitely. A report delivered to the parent needs no answer;
only undelivered reports use this deadline.

Fallback commits an operator attention record before asking the existing push
service to notify. The kernel push queue is bounded and in memory today; do not
claim guaranteed push delivery. Reconcile durable attention on startup and
re-enqueue with a stable tag, subject to hat policy and current question state.
The dashboard is the durable source even with push muted, no subscription or
an exhausted delivery retry. Recovered parents do not automatically inject
items already escalated; an explicit operator prompt can re-arm unresolved
items. An operator answer always obsoletes a queued question delivery.

## 6. Storage, migrations and provenance

Add forward-only sessions-component migrations; choose actual migration numbers
when the plans are based on current main. Do not edit a merged migration.
Existing sessions have no family edge and their existing turns default to
`Operator`, matching the present operator-only prompt API.

| Store addition | Required data and invariants |
|---|---|
| `hat_session_tools` (kernel component) | Owner/hat, delegation enabled flag and grant revision. Disabled by default, changed only through stepped-up operator settings; feeds/plug-ins have separate explicit grants defined by the plug-in contract. |
| `session_families` | `owner_id`, unique `child_id`, `parent_id`, `root_id`, `hat_id`, `created_event_id`, routing state/reason. Both sessions have the same owner/hat; no self-edge or cycle. Parent is assigned once at child creation; disabling an edge grants no new parent. |
| `session_operations` | Owner, caller, operation key/digest, tool kind, target child, receipt state, linked request/turn/pending ids, timestamps. Unique owner/caller/key; no plaintext credentials. |
| `session_dispatch_queue` | Owner, source/target sessions, origin, operation or delivery id, bounded content or source reference, queue order, claim lease, dispatch generation and receipt. One dispatch association per delivery; cancellation is explicit. |
| `delegation_notices` | Owner/hat/family ids, source event and kind, attention routing, destination turn, deadline and resolution. Unique source identity; indexed by pending work/deadline and target. |
| `delegation_budgets` | Owner/root id, operator-prompt epoch and reserved wake-ups. Durable across collector restarts and child replacement. |
| Turn/answer provenance | Tagged `InputOrigin = Operator | Parent { session_id, operation_id } | ChildReport { child_id, source_event_id, delivery_id }`; submitted answer origin is operator or parent. Server-written, never supplied in public prompt JSON. |

Use composite owner foreign keys where possible, owner predicates in every
query, and transaction checks/triggers for same-hat and lifecycle invariants.
Indices cover `(owner_id, parent_id)`, queue readiness, source deduplication
and pending question lookup. Add all new SQL sources to the owner-filter audit.
There is no second database or token table. Completed queue payloads are
cleared after transcript/provenance persistence; receipts/deduplication survive
for the life of the sessions so a delayed retry cannot restart old work.

`hennery-view` renders `Parent` prompts as “From parent” and reports as “Child
report”, with server provenance. On the ACP wire these may still be prompt
content blocks, because adapters need not support a distinct author role.
Wrap child content as untrusted data with escaped metadata; restate that it is
not operator input or approval. The wrapper is defense in depth, not an
authorization mechanism. Consumers of user turns, including memory, automatic
naming, push suppression and budget resets, must use provenance explicitly.

## 7. Close, delete, reassign and family ownership

- A parent may operate only on an active routing edge to its direct child,
  within the same current owner/hat. It cannot control a sibling, ancestor,
  unrelated session or grandchild. Children receive no parent transcript
  capability. Family UI visibility for the operator does not grant agent access.
- Closing a child is explicit and non-cascading. Use existing teardown order,
  pending cancellation and token revocation; cancel queued follow-ups. A close
  while busy ends the turn according to ACP core, and its report remains visible.
  No auto-close on a “done” message; no worktree deletion.
- Closing a parent stops automatic wake-ups and cancels its undispatched
  outbound commands, retaining receipts. Already delivered child work continues;
  children fall back to the operator. Resuming the parent explicitly may restore
  routing after revalidation, but never replay a cancelled command implicitly.
- Deleting either endpoint, or purging the hat, cancels dispatch before scrubbing
  content, removes relevant queues/notices/budgets/edges, and honors
  existing tombstones and host-forget behavior. Surviving children are detached
  and operator-controlled; deletion never implicitly deletes the family.
- Scrub deleted-target operation receipts to an opaque `gone` disposition,
  retaining only caller/key/digest deduplication while that caller exists.
  Remove these when the caller is deleted. Retrying an old spawn after its
  child was deleted must not create another child; keep no deleted title, path,
  brief or report in the deduplication tombstone.
- Generated report prompts already delivered into another session are copies
  in that session's transcript and possibly its adapter's conversation. Deleting
  the original child cannot promise to erase them. The delete preview says this
  and links surviving related sessions; purge of the hat includes all of them.
  Do not leak deleted titles/paths through surviving chips or orphaned metadata.
- Reassignment remains parked-only and stepped-up. It atomically disables every
  incident routing edge, revokes the session token and cancels queued transfers.
  Show a warning that historical copies in the old family's transcripts remain
  and the moved session retains its history. Agents in either hat cannot traverse
  the disabled edge or fetch its other endpoint. Returning to the old hat does
  not adopt the old family automatically. No bulk family move is added here.

Every worker rereads deletion/purge/reassignment/close state at its commit
boundary; a lease acquired before a transition is insufficient authority.
A dispatch already sent is reconciled, not erased from the history as though
it never occurred.

## 8. Operator experience and API

Keep the current day/project/session list arrangement. Add parent links on
child rows and bounded child summaries on parent rows; a family panel pages the
rest. Preserve runtime/model, host, cwd, lifecycle and activity for each child.
“Waiting on children” is a derived subtitle for an idle parent with outstanding
child work, not a new lifecycle. An open parent permission/question still takes
precedence as “Waiting on you”.

The parent timeline contains a spawn card with actual launch/config/delivery
state, report cards with source links and truncation labels, and question/answer
exchanges. Child questions stay visible and answerable to the operator while
“Parent is handling” is shown; the tag changes to an explicit fallback reason
when the operator must act. No optimistic “answered” or “completed successfully”
from an accepted MCP request.

Extend `SessionSummary` with optional `FamilySummary { parent, child_counts,
attention }`, and add an operator-only paginated
`GET /api/view/sessions/{id}/family` for actual children and delivery states.
Each summary link is owner-authorized; agents use the tools instead of this
operator route. Existing view/list SSE upserts carry family changes; reading a
child update invalidates the corresponding parent summary. Reconnect resumes
or requests resync under the existing view contract, not a full-tree refresh
on every token.

Keep `question_waits` as the factual pending count. Add explicit
`operator_attention` and `parent_handled_questions` so the waiting badge does
not silently count parent-handled questions as operator work. Show all pending
questions inside the family view. Fallback changes the operator attention
count and push eligibility together. Permission questions always count under
Q1's default. The phone lane uses this same routing result and opens the child
that needs intervention; it does not independently guess whether the parent
is alive. Push payloads retain the hat's generic-title/detail/muting policy.

## 9. Security and failures

The threat model remains umbrella §8.4: hats protect hennery-mediated flows,
not the filesystem or a shared OS user. Agents can expose live MCP tokens
through process arguments or output; the built-in token now also authorizes
bounded delegation and permitted memory access. Reuse redaction and document
this increased authority. No shell sandbox claim is made. Strong isolation
still requires separate OS users/hosts and a separated collector.

No session tool mints credentials, authorizes OAuth, changes mounts/path rules,
pairs/revokes hosts, changes hats, deletes sessions or purges data. These remain
operator routes with their existing Origin/cookie/step-up checks. MCP cannot
submit an “operator approved” string to bypass them. The same-hat checks apply
to reads and errors as well as mutations, including status cursors and receipts.

| Failure/race | Required result |
|---|---|
| Lost MCP response after accepted spawn/send | Same operation key returns the existing receipt; no duplicate child/turn. |
| Parent busy, blocked, asleep or host offline | Durable queue; no overlapping prompt; attention deadline/fallback survives restart. |
| Collector restarts with active adapters | Existing host resend/reconcile first, then queue recovery; no gratuitous parent resume. |
| Child adapter crashes or cannot start | One factual failure notice; partial transcript stays readable; no invented success report. |
| Requested model vanished or config read-back differs | Brief held; child visible with requested/actual config and a repair path. |
| Parent closes during spawn | Recheck before start dispatch; undispatched child start is cancelled. A start already sent reconciles and its child becomes operator-controlled. |
| Parent and operator answer together | One accepted answer, existing pending-id dedupe; delivered verdict is monotonic. |
| Question withdrawn before delivery | Mark obsolete; stale answer gets the existing refusal. |
| Parent token revoked during a tool call | Cut the response; no commit after revocation wins. Earlier accepted operation retains its receipt and lifecycle handling. |
| Family reassigned/deleted/purged during delivery | Transaction denies stale scope, cancels queued transfer, and scrubs references; no worker resurrects deleted content. |
| Runaway exchanges or queue full | Persisted caps, explicit paused/fallback state; no lost question or silent eviction. |
| Adapter emits activity without a normal prompt/turn-end pair | Show unsupported/unrecognized behavior; verify a host-side typed activity/turn-end solution before claiming unattended delegation works for that adapter. Never infer completion from idle text. |

## 10. Verification strategy

This is a documentation task. Implementation plans must make these tests
concrete, execute their commands, and report actual results; fake tests do not
replace live adapter checks.

1. **Identity and HTTP:** opted-in hat with no external mounts still yields the
   built-in entry; opted-out hats get none and cannot invoke it using a token
   obtained for an external mount. Disable during a call/dispatch, rollback a
   grant change, re-enable without replay, and prove external mounts still work.
   `starting` can initialize/list; invalid and standalone credentials cannot
   invoke tools; foreign Origin, cookie-only, header duplication, duplicate or
   Unicode-escaped JSON keys, BOM, invalid UTF-8 and batches have deterministic
   refusals. Check exact routing against the proxy's wildcard. Revoke before
   resolve, during a call and after acceptance; rollback must not cut a token.
   Assert no secrets in events, errors, SSE, logs or generated snapshots.
2. **Authorization:** two owners, two hats, sibling/unrelated/ancestor ids,
   forged caller fields, scope-changing cursors, guessed operation keys,
   symlink escape/root changes, reassign/purge races and runtime isolation
   fallback. Differential decode tests share the exact bytes the handler uses.
   Add positive authorized cases so a blanket deny cannot pass.
3. **Configuration:** every offered runtime, same/cross-runtime defaults,
   arbitrary catalog model ids, stale/cold catalogs, config clamp, probe timeout,
   adapter override, unavailable model, and no brief before successful read-back.
   Test the same catalog service through tools and launcher-facing API.
4. **Durability:** fault injection after every acceptance/source-event/claim/
   dispatch/ack transaction boundary; collector and host restart separately;
   two workers; operator prompt versus delivery; late `turn_started`; interrupted
   work; lost spawn response; resend of the same pending answer. Prove queue
   depth and budget caps under concurrency. A restart never resets the budget.
5. **Attention and deletion:** busy and unanswered-parent deadline, immediate
   permission fallback, notification failure/muting, question withdrawal,
   duplicate notices, close in flight, child delete with retained report copies,
   parent delete with surviving child, reassign and complete hat purge. Test
   source filters so non-applied facts cannot wake a parent.
6. **UI:** golden view fixtures for provenance, partial reports, all receipt
   states and unknown ACP; Playwright family navigation, operator takeover,
   waiting badge, SSE resync and mobile layout. Exact text or role locators.
7. **Live acceptance:** on pinned Claude and Codex adapters run Claude→Claude,
   Claude→Codex, Codex→Claude and Codex→Codex. Prove the discovered tool list,
   independent model/effort choice with actual read-back before prompt, a real
   elicitation/schema answer, operator permission fallback, parent busy delivery,
   parked-parent resume, token rotation, collector reconnect, child failure and
   closed-parent fallback. Check native background/self-woken activity if the
   adapter supports it. Capture scrubbed ACP as new golden fixtures. Inspect
   process-token exposure per pin. Non-default-hat Codex remains a refusal test
   until 8h passes its own live isolation gate.

Each plan runs targeted tests during work, then the repository's full Rust,
protocol/view codegen and affected web/e2e checks at completion. New processes
and filesystem behavior run in Linux CI as well as macOS. Race/timing tests
run under load and alone for diagnosis; every security/notification/revocation
side effect has its own executed revert-probe. Live work uses scratch data and
projects; never restart the service hosting the implementation fleet.

## 11. Plans, amendments and other lanes

Sizes describe implementation plus verification, not elapsed time. Each plan
uses plan 3c's structure, builds its code, embeds it, replays it, and is reviewed
through the parent. This design does not attempt to supply executable plans.

| Order | Plan | Size | Exit condition |
|---|---|---|---|
| 1 | **D1: session-bound MCP and family identity** | M | Token/descriptor/auth seam, per-hat opt-in, shared session context, family storage, owner/hat checks, scope lifecycle hooks and generated types; actual Claude/Codex tool discovery. Optional plug-ins reuse this identity seam. No externally enabled spawn yet. |
| 2 | **D2: child control and launch configuration** | L | Shared catalog service/probe, all seven tools, operation receipts, bounded follow-up queue, validated first prompt, answer/close policy and permission enforcement. Can split catalog and tools into separate small PRs. Delegation stays preview-gated pending D3. |
| 3 | **D3: durable parent delivery and operator fallback** | L | Transactional notices, scheduler, provenance, wake-up budget, restart reconciliation, attention deadlines, push routing, delete/reassign races. End-to-end parent/child loop; no polling-only release. |
| 4 | **D4: families and live acceptance** | M | Family API/view fold/UI, correct attention counts and operator takeover, cross-runtime live matrix and mobile/phone integration. Enables delegation for ordinary use. |

Review the following spec changes before D1/D2, and land their text with the
appropriate plan rather than letting conflicting rules persist:

- Umbrella §1.2 names parent/child delegation in the approved migration scope;
  §6.3 allows explicit close by an authorized direct parent in addition to
  the operator, with parent provenance and no cascading close.
- ACP core §§4.6, 9 distinguish the operator answer path from scoped parent
  elicitation answers; §§4.4, 8 add queued acceptance and input provenance
  without changing direct operator prompt semantics or delivery acknowledgement.
- Gateway §§3.1–3.2 describe minting for an opted-in built-in entry even with no
  external mount, and the shared descriptor/auth seam. Its module independence
  remains. Kernel hat settings document opt-in and immediate disable semantics.
- Kernel §3.3 distinguishes the built-in MCP server's present-Origin check
  from the external proxy's exemption. This follows the MCP transport's
  explicit Origin validation rule; it does not retrofit unrelated browser
  or proxy routes as an unreviewed side effect.
- Client view §§3–4 and session push rules add family/provenance/attention
  types and server routing. Memory remains an optional external plug-in; its
  generic feed/startup contract requires its own reviewed spec amendments.

**Memory:** reference §3 under the exact name **session-bound MCP delivery**:
existing `SessionMcp`, rotating session token and gateway principal. Serve
memory tools externally through existing connection mounts, not on built-in
`hennery`. Coordinate the authenticated plug-in context and opt-in event
feed/startup contract; consume provenance and purge hooks. No competing agent
token scheme, cwd-derived identity, embedded memory module or forced capture.

**Phone:** consume canonical operator-attention routing and stable child links.
Do not suppress a notification merely because `parent_id` exists, and do not
put question bodies in push outside the hat's configured policy.

**WSS:** this design is independent of host transport. The host must still be
able to reach `public_url` for its MCP HTTP requests; fixing host WebSocket TLS
alone does not prove that reachability. Reconnect preserves existing fencing
and `resend_complete` rules. No tunneling of MCP over host frames is proposed.

**8h / launch UI:** reuse the delivery-mode mapping and the D2 catalog service.
Mixed-hat Codex availability is conditional on isolation, not a reason to
silently substitute Claude or the host's default model.

## 12. Operator questions

- **Q1:** May a parent answer a child's ACP permission requests, or only its
  ordinary elicitation questions? **Recommended default:** ordinary elicitation
  only; permissions go directly to the operator, while the parent sees that
  intervention is needed. If permission delegation is wanted, define an
  explicit operator-granted policy before implementation; child prose cannot
  grant it.
- **Q2:** Should the first release allow children to spawn grandchildren?
  **Recommended default:** one generation, as in the predecessor; keep the
  schema extensible, then add nesting with a root-wide budget, depth limit and
  explicit escalation rules after the direct-parent flow is proven.

Generated with Claude AI — please review before distribution.
