# hennery — phone, Web Push and PWA

- **Date:** 2026-10-14
- **Status:** Design proposal; recommendations need the parent's independent
  review. No implementation or live acceptance is claimed.
- **Review:** Codex gpt-6-astra, on the maintainer's behalf, reviewed
  `0fe663b8..798168ed`: APPROVE AFTER AMENDMENTS, no Critical findings.
  This revision addresses build consistency, input-preserving navigation
  and coherent question snapshots; scoped re-confirmation remains pending.
- **Refines:** [Architecture](2026-09-25-hennery-architecture-design.md)
  §§6.8, 7, 8.3 and 13; [Kernel](2026-09-26-kernel-design.md) §§3, 6 and 7;
  [Frontend](2026-09-26-frontend-design.md) §§3, 6.3, 8–12;
  [Client view](2026-10-02-client-view-design.md) §§3–4.
- **Implementation baseline:** `0fe663b8`. Plans 10a and 10b already own
  subscriptions, VAPID, policy, encryption, delivery and session triggers;
  8f owns gateway notifications. This proposal completes their browser side.
- **Handoff:** [4e-ii-b](../plans/2026-10-24-web-mcp-oauth.md), After this
  plan: service-worker push relay into the connection reader's invalidation
  seam. Its prohibition on subscription UI before the early-tester milestone
  remains a release gate; this design does not authorize an early deployment.

The phone loop is: an agent asks, the installed app notifies, the operator
opens the correct question and answers it, and the card distinguishes an
accepted answer from one delivered to the agent. The existing collector is
canonical throughout. The worker displays notifications and supplies an
offline app shell; it does not become another session store or answer queue.

---

## 1. Goals and boundaries

Deliver an installable mobile app, subscription and device controls, per-hat
lock-screen policy, reliable notification navigation, and the existing cards
usable with a phone keyboard. Include gateway attention notifications and
their invalidation relay. Keep one component tree at desktop and mobile
widths, with touch targets, safe areas and a visible sign-out control.

Reuse kernel §6 rather than rebuilding Web Push. There is no native app,
APNs account, background SSE, offline transcript database, offline answer
outbox, new permission protocol, or new trigger policy. Full Settings
(passkey management, public-URL editing, attachment usage and host-removal
reports) remains the 4d management follow-up; this lane supplies its minimum
push/device section. A passkey can already perform login and step-up without
adding its management screen here. Native lock-screen approval or text reply
is a product question in §11, not an assumed browser capability.

## 2. Existing contracts and predecessor evidence

These are implemented facts, not proposed API changes:

| Contract | Source and implication |
|---|---|
| `PushPayload {title, body, url, tag}` | `hennery-proto/src/rest.rs`, `kernel/src/delivery.rs`; encrypted, padded JSON. The browser receives neither owner nor hat credentials. |
| Session notices | `sessions/src/notify.rs`: blocked or outside-turn question, completed and failed turn; tag is session id, URL currently `/sessions/<id>`. Cancelled/interrupted turns are quiet. |
| Gateway notices | `gateway/src/notify.rs`: needs-auth, failure and recovery transitions; tag `mcp-<connection_id>`, URL `/mcp`. Their wording and status semantics remain 8f's. |
| Subscription ownership | `kernel/src/push.rs`, `sessions/src/push.rs`: owner-filtered and bound to the subscribing auth session. Explicit sign-out/revocation removes its rows transactionally. Expiry alone retains push rows, listed as `signed_out`. |
| Rotation | Keeps subscription id and original auth-session binding, without step-up; it requires an authenticated owner and their old endpoint. It never creates a missing row. |
| Policy | Owner's hats: `muted`, `details`, `generic_title`. Defaults are unmuted, details off, generic title off. Settings cannot reinterpret these as per-device preferences. |
| Answer | Existing `POST /api/sessions/{id}/pending/{pending_id}/answer`; authenticated, Origin checked, no step-up. 202 is queued; the view stream supplies the delivery verdict. |
| Mobile frame | `web/src/components/Shell.tsx`: Settings is a placeholder and SignOut is in the desktop rail. Existing cards and `AnswerBook` already model queued/delivered/cancelled answers. |
| Static serving and CSP | `kernel/src/web.rs`, `build.rs`, `csp.rs`: build assets embedded; JS and webmanifest MIME types supported; non-hashed assets revalidate. The actual policy allows only same-origin scripts; `/theme.js` is external. |

The predecessor's `frontend/src/lib/push.ts` has useful VAPID conversion,
`userVisibleOnly` and browser-subscription inspection. Its localStorage flag
does not prove collector registration; its boolean errors obscure half-done
operations. Its `frontend/public/sw.js` focuses a root window without
navigating it, and `internal/push/push.go` sends `/` in every payload. Its
worker has no offline shell. Keep neither those navigation rules nor endpoint
logging, silent VAPID replacement, unauthenticated subscription routes or
hand-built notification JSON. Hennery's existing backend fixes those issues.

## 3. User-visible behavior

### 3.1 Install and enable

Settings opens on every supported viewport. It includes **Notifications on
this browser**, **Push devices**, **Signed-in devices**, **Notification
privacy by hat**, the optional push contact, and **Sign out**. Gateway mode
omits session-only controls when those APIs are absent.

Check secure context, service workers, PushManager and Notifications before
offering Enable. Worker registration and VAPID loading happen in advance;
their loading/error state is visible. Registration waits have a bounded UI
timeout and Retry, rather than an indefinitely pending
`navigator.serviceWorker.ready` in an unsupported environment.

The first-run hint is dismissible and never requests permission on mount.
An iOS browser tab shows install instructions: use the browser's share/menu
control, Add to Home Screen, launch that app, sign in there if necessary,
then enable notifications. Do not promise shared Safari/app cookies or a
script-driven install prompt. Use capability checks and standalone display
mode (including the iOS standalone flag); device detection supplies guidance,
never authorization.

Enable has two explicit stages when needed. Prepare by completing fresh
step-up with the existing passkey-first dialog (password fallback). Then show
an **Enable notifications** button whose fresh tap invokes the browser
permission request directly, before another asynchronous wait can consume
the gesture. On permission grant, obtain/create a subscription with the
already loaded VAPID key and register it with the collector (§5). If the
server subsequently requires step-up again, preserve the subscription and
retry the POST once through the normal client. Denial leaves notifications
off and explains how to change browser/OS settings; never prompt repeatedly.

### 3.2 Honest states

| State | UI |
|---|---|
| Unsupported or insecure context | Explain the missing capability/HTTPS requirement; install guidance where applicable. |
| Permission default | Enable button; no unsolicited prompt. |
| Permission denied | Blocked by browser/OS; instructions, not another permission loop. |
| No browser subscription | Off, even if another device has push rows. |
| Browser subscription, collector registration unconfirmed | Registration needs attention; Retry/Enable, never claim Enabled from browser permission alone. |
| Matching remembered row confirmed by server | Enabled; label, last service acceptance and scrubbed delivery error if present. |
| Remembered row removed, expired subscription, or VAPID mismatch | Enable again with step-up; do not silently restore a remotely removed device. |
| Collector unreachable | Unable to check; retain the last confirmed state with its age, no success claim. |

`last_success_at` proves the push service accepted a send, not that the OS
displayed it or the operator read it. `this_device` means the row belongs to
this login, not a hardware identity: tabs can share a subscription, and
several rows can share a login. A remembered subscription id is needed to
identify the actual row; do not select an arbitrary `this_device` row.

### 3.3 Privacy and device controls

Each hat has three independent controls matching the backend fields: Mute,
Use a generic title, and Include question details. Explain that details are
agent text and can contain secrets, and that generic title plus details still
reveals that text. A preview uses fixed example text, never a real transcript.
These are global for that hat across the owner's push devices. Saving reads
back the stored policy; 404 after a hat purge removes the row from the UI.
Concurrent saves are last-write-wins, as today; no revision contract is added.

Push-device rows show label, endpoint host only, creation, last success,
error and signed-out state. Remove disables push delivery for that row; it
does not sign the browser out. Signed-in-device rows show escaped,
bidi-isolated User-Agent and timestamps, mark the current login and offer
Revoke with step-up. Revoke also removes that login's push subscriptions.
Neither list claims a unique physical phone. No bulk revoke, remote browser
storage wipe or new device-label PATCH is introduced. A label is supplied
when enabling (1–64 printable characters); omitted uses the existing
endpoint-host fallback.

The contact editor uses existing `GET/PATCH /api/settings`, changes only
`contact`, and explains its VAPID purpose. It never sends an unchanged
`public_url`: that would sign out every device. Full public-URL editing stays
in the follow-up, with kernel §3.2's warnings and step-up.

## 4. Manifest, worker and embedded build

### 4.1 Installation assets

Serve `/manifest.webmanifest` with a stable `id: "/"`, scope `/`, start URL
`/sessions`, display `standalone`, name/short name, language, theme/background
colors, 192/512 PNG icons, a separate maskable PNG with safe artwork, and an
apple-touch-icon. Do not encode hats, owner identity or session ids in app
identity or icons. A gateway-only start route falls back through capabilities
to `/mcp`. Installation does not register a server device or imply login.

All registration is external code in the Vite entry. Produce stable `/sw.js`
at the origin root, with scope `/`, and a generated precache list/build id
from the actual Vite output, including lazily imported chunks. Generate an
expected SHA-256 content digest for every allowlisted file together with
that list, including fixed-name `index.html`, `/theme.js`, manifest and icons.
Derive the build id from those URL/digest entries. Emit that worker after
enumerating app assets and exclude the worker itself from its precache hash.
No runtime CDN, inline bootstrap, eval, blob worker or remote
import is allowed. The build output, worker, manifest and icons all go through
the existing embedding pipeline, including release/Nix builds. A dev-server
check cannot prove the shipped binary contains them.

Keep the current strict script policy and external theme bootstrap. Add
explicit `worker-src 'self'` and `manifest-src 'self'`; no `unsafe-inline` or
`unsafe-eval`. The worker script response also gets a restrictive same-origin
CSP for its own fetch/import execution, since the current HTML-only layer
does not attach one to JavaScript. `/sw.js`, manifest and index revalidate
with ETags; hashed assets remain immutable. Missing worker/manifest paths
must answer 404 with no HTML fallback, not `index.html` with status 200.
The precached shell retains its CSP and other security headers offline.

### 4.2 Offline behavior

Cache only a generated allowlist of static app files in a build-versioned
CacheStorage cache. Fetch the static shell without credentials for precache;
accept successful same-origin, expected-MIME, non-redirected responses only.
Hash each fetched response's decoded body bytes and compare against the
worker's build-time digest before caching it. Per-file ETags or a successful
fetch do not prove that all responses came from the intended build: a deploy
can change fixed-name files between requests. Verify every file, even one
with a hashed URL, against this worker's expected bytes.

Install into a cache isolated from the active worker, and make the new shell
eligible for activation only after the entire allowlist verifies. A missing
file, digest mismatch or incomplete install rejects that install and
discards only its partial cache; the active worker/cache remains untouched.
Retry must not overwrite an active cache with the same build id. The
implementation plan must define cache completion/selection so a worker
restart cannot serve a partial staging cache; CacheStorage writes alone
are not an atomic multi-file commit. A deploy mid-install is therefore a
failed update rather than an accepted mixture of index, theme and chunks.
Do not discover cacheable URLs from arbitrary responses or query strings.

For controlled app-route navigations, use the installed version's static
shell, so it and its fixed-name theme file/chunks remain one build. The page
checks for worker updates on launch. Unknown navigations remain network
requests. Setup, login, OAuth callbacks, `/api/**`, `/mcp/**`, attachments,
logos and non-GET requests bypass the worker cache entirely. `/mcp` is an
app route; `/mcp/<mount>` is a gateway proxy and never a shell route. No
auth response, transcript, question, form answer or notification body is
written into CacheStorage. HTTP revalidation behavior on the server is
unchanged; the worker's shell cache is a separate, explicit policy.

Opening a controlled app route offline shows the shell and **Offline —
reconnect to load sessions and answer**. It does not manufacture an
authenticated state from a local flag. APIs use the network with no worker
fallback. Existing in-memory data may remain visibly stale while a live
page reconnects, but answer controls cannot claim a collector accepted
anything while it is unreachable. Host offline with collector reachable
is different: the collector's durable answer queue still accepts answers.
Do not queue writes in Background Sync. An offline first visit has no shell
until one successful installation; Settings explains failed storage/install.

### 4.3 Updates

A new worker installs into its own cache and waits while old clients exist.
Show Update available; do not call `skipWaiting` or reload a page while the
operator edits or a mutation is in flight. Natural activation after all old
clients close supplies next-launch updates. An explicit Update now requires
all app windows to acknowledge readiness, preserving sessionStorage drafts
and warning about unsent in-memory images/question input. A busy or
unresponsive window defers it. Only then activate and reload consenting
clients; do not use unconditional `clients.claim` to mix builds. Versioned
cache cleanup touches only superseded hennery shell caches during activation;
coordinated clients immediately reload.

**Built 2026-10-21:** the banner's **Reload to update** action implements
Update now. The waiting worker asks every same-origin **app-route** window
to prepare, then arm one reload on controllerchange or that worker's activation
(including uncontrolled first-install windows). Bounded replies and window-set
rechecks defer busy or silent app windows with distinct explanations; attachment,
auth and MCP proxy documents do not participate. Stored composer text survives;
initiating windows confirm loss of images, question input and other volatile
edits. Durable composer/search focus is ready. Successful saves clear only
unchanged fields in the submitted form; answered questions and saved or explicitly
discarded renames stop blocking. Unsent drafts remain protected across control
unmounts (including pending confirmation dialogs and question cards). A redundant
worker or a five-second post-commit deadline releases the page with a retry
notice, even if the worker's release message is lost. Previously controlled
documents missed by coordination show a persistent older-version banner with
an explicit Reload action. Activation deletes superseded shell caches; consenting
windows immediately reload. No unconditional skipWaiting or clients.claim is used.

Browser eviction may remove shell/state at any time. Re-register on launch
and reconcile push state; no claim that an installed icon guarantees offline
assets or a permanent subscription.

## 5. Subscription protocol and renewal

### 5.1 Rust-owned API shapes

Use existing DTOs from `hennery-proto::rest`, generated into TypeScript. The
worker's runtime decoder validates received bytes; a TS type alone is not
validation. No handwritten duplicate wire schema is introduced.

| Method and route | Request and result | Authentication |
|---|---|---|
| `GET /api/push/vapid` | `VapidKeyResponse {public_key}`: base64url uncompressed P-256 key. | Operator cookie. |
| `GET /api/push/subscriptions` | `Vec<PushSubscriptionItem>`: id, endpoint_host, device_label, created_at, optional last_success_at/last_error, this_device, signed_out. Never endpoint or keys. | Operator cookie. |
| `POST /api/push/subscriptions` | `PushSubscribeRequest {endpoint, expirationTime?: i64, keys: PushKeys {p256dh, auth}, device_label?: String}`. 201 new / 200 replacement, with item. Milliseconds on the wire, rounded down to seconds in storage. | Cookie, Origin, fresh step-up. |
| `POST /api/push/subscriptions/rotate` | `PushRotateRequest {old_endpoint, subscription: PushSubscribeRequest}`. 200 keeps id and original auth-session association. | Cookie, Origin; no step-up. Old owned endpoint required. |
| `DELETE /api/push/subscriptions` | `PushUnsubscribeRequest {endpoint}`. 204 or 404. | Cookie, Origin; no step-up. |
| `DELETE /api/push/subscriptions/{id}` | No request fields; 204 or 404. | Cookie, Origin; no step-up. |
| `GET /api/push/policies` | `Vec<PushPolicyItem {hat_id, muted, details, generic_title}>`. | Operator cookie. |
| `PUT /api/push/policies/{hat_id}` | `PushPolicyRequest {muted, details, generic_title}`, stored item. | Cookie, Origin; no step-up. |
| `GET/PATCH /api/settings` | Existing `SettingsResponse` / `SettingsUpdateRequest`; minimum editor sends contact only. | Cookie, Origin on PATCH; contact alone needs no step-up. |
| `GET /api/auth/sessions` | Existing `Vec<AuthSessionItem>`, current login marked. | Operator cookie. |
| `DELETE /api/auth/sessions/{id}` | 204 or 404, current cookie cleared when current revoked. | Cookie, Origin, fresh step-up. |
| `POST /api/auth/logout` | 204 and cleared cookie; idempotent for an already absent login. | Origin; no step-up. |

POST errors retain their current meaning: 400 `invalid`, 401
`unauthenticated`, 403 `step_up_required`, 409 `too_many_subscriptions` or
`endpoint_taken`. A limit error offers device removal. An endpoint conflict
requires explicit repair; it never auto-deletes another owner's row. Reuse
the client retry/step-up rules; do not weaken Origin or body limits (16 KiB)
to accommodate a worker.

### 5.2 Registration and reconciliation

After permission grant, inspect `getSubscription()` first. Decode and check
the loaded VAPID public key against `subscription.options.applicationServerKey`.
Reuse a matching browser subscription, then POST it only as part of an
explicit Enable/Repair operation; 200 is an intentional rebind to the current
login. Record the returned id and confirmed endpoint after success, with a
new enabled generation for an explicit re-enable. Do not periodically POST every
launch: that would re-enable a remotely removed subscription and bypass the
intent of device controls. If an existing subscription has another VAPID
key, explain that collector keys changed and require explicit re-enable;
unsubscribe it before creating its replacement. Never regenerate the
collector's VAPID key as a browser repair.

Settings compares browser permission/subscription, locally remembered id,
and the server's row list. Lost local id is unconfirmed, even if a row marked
`this_device` exists: explicit Enable can safely POST the same endpoint and
recover the id. On successful subscribe followed by a lost response, Retry
uses that same endpoint with step-up and obtains the same id; it does not
create multiple rows. A new browser subscription whose server POST fails
is shown as unregistered, retained for explicit retry or Disable. No success
flag is persisted merely because the permission prompt succeeded.

### 5.3 Rotation with and without a page

Handle `pushsubscriptionchange` inside `event.waitUntil` only for a locally
confirmed, enabled registration generation. Missing identity means explicit
repair; a disabled tombstone means no renewal. When supplied,
use its old subscription and new subscription; if the browser needs a
replacement and permission is still granted, reuse the old application
server options. Without old options or permission, stop at Needs re-enable.
Never prompt for permission or step-up from the worker. A null replacement
or failed browser subscribe is a visible repair state on next launch.

Serialize page/worker operations through one origin-local IndexedDB
transaction protocol. For each registration, keep at most one bounded
rotation record with the collector's id, a local generation, first old
endpoint, latest replacement subscription, attempt count and timestamp.
The first old endpoint stays the server anchor until rotation is confirmed;
a second browser rotation updates the latest replacement. Acquire a short
attempt lease/fencing generation in IndexedDB, release the transaction
before fetching, then reconcile the result in another transaction. A stale
lease can expire after the fetch deadline; never hold an IndexedDB
transaction across a network await. Send ordinary
same-origin JSON fetches with credentials included; allow the browser to
provide Origin. No readable bearer, cookie copy or artificial Origin header.

A worker attempt has a 10-second timeout. Network/5xx/429 failures keep the
record and honor Retry-After on a later opportunity; there is no permanent
worker timer. Retry on a later rotation event or authenticated launch/focus,
with bounded backoff while a page lives. 401 retains Needs sign-in without
opening a window; 404 means the row is gone, clears automatic repair and
requires Enable with step-up. Before foreground repair, confirm the
remembered id still exists. A lost 200 may yield 404 on retry of the old
endpoint: treat that ambiguous result as explicit repair, never recreate a
row automatically. After a successful response, advance the server anchor
to the endpoint actually sent. If the local generation acquired a newer
replacement meanwhile, keep that replacement and rotate from the advanced
anchor; if it became disabled, never continue repair. Update confirmed
identity only when it matches the enabled generation. This transition and
the HTTP-attempt ownership are transactionally serialized; a worker dying
after server success remains the lost-response case above.

The browser event is best-effort, not the sole renewal mechanism. On launch,
compare the current browser subscription to the locally confirmed identity;
when a known endpoint changed and the recorded row still exists, rotate.
If a non-null expiration is within 24 hours, show Renew; a user gesture
replaces/subscribes and uses the same rotation contract when its old row
exists. A null expiration does not justify an invented renewal deadline.
If the row was
pruned or browser storage/permission was lost, re-enable with step-up. Rebind
an expired-login row to a new login only with explicit Enable; rotation
alone preserves the old binding. Until then, `signed_out` remains honest.

### 5.4 Disable, sign-out and revocation

Disable first marks the local generation disabled and cancels automatic
repair, so a delayed rotation cannot resurrect local intent. Delete the
collector row by remembered id, or the known endpoint when id is missing;
204/404 both mean absent. Then call browser `unsubscribe()`, clear capability
metadata/rotation work and this registration's notifications, and retain
the non-secret disabled-generation tombstone until an explicit Enable. If server
removal fails, still try local unsubscribe to protect this phone, but show
that collector removal is unconfirmed and keep the scrubbed id for retry.
If server removal succeeds but browser unsubscribe fails, report that
distinction and retry local cleanup; do not label the browser fully disabled.
Removal of a remote push row cannot invoke that remote browser's API.

Explicit Sign out reuses the existing component: POST logout first. Only
confirmed logout performs the existing draft/image/send cleanup, clears
question drafts and cached in-memory session/settings data, broadcasts
logout to same-origin windows and requests worker disable/unsubscribe and
notification closure. Failure stays signed in with input intact. Local
worker cleanup failure cannot undo a completed server sign-out and is
reported separately; successful cleanup retains the disabled tombstone.
Revoking the current login follows the same local
cleanup after 204. Remote revocation is observed on 401 or stream closure;
no remote-storage-wipe guarantee is made.

Expiry is not explicit sign-out: kernel §6 keeps push rows, and existing
frontend behavior keeps drafts for reauthentication. An expired phone may
receive a notification, then sign in before loading or answering. A 401
closes streams/hides authenticated view data and preserves the safe return
target, not an offline authenticated session. In-flight pushes accepted
before removal may still arrive; best-effort notification closure and local
unsubscribe cannot retract another device's already displayed lock screen.

## 6. Notifications, links and mobile answers

### 6.1 Display

Every valid push displays through `registration.showNotification` within
`event.waitUntil`, even with a foreground window. Do not produce a second
native notification from SSE; waiting badges remain available when permission
is off. Display title/body as bounded plain text; keep the backend's
per-session or gateway tag so replacement coalesces. Use bundled generic
icon/badge, not hat logos or remote images. Notification data retains only
the validated navigation target/tag needed for clicking, not answer options,
bearer tokens, raw question content or an authorization verdict.

Decode the bounded payload with a try/catch and strict field checks, accepting
older payloads and ignoring unknown future fields. Missing/malformed input
produces a neutral attention notification and safe sessions landing target
(capabilities can redirect gateway mode), with no raw-byte logging. No
network fetch gates display: push must work when the collector is offline.
OS grouping/Focus/delivery timing can differ; a notification is a hint to
read current state, not proof a question remains open.

### 6.2 Deep-link additions

Keep `PushPayload` unchanged. Recommend that session question notices encode
their known pending id in the existing URL:

- question: `/sessions/<encoded-session-id>?pending=<encoded-pending-id>`;
- turn completed/failed and old payloads: `/sessions/<encoded-session-id>`;
- gateway: existing `/mcp`.

`PushEdge::Blocked` and `QuestionOutsideTurn` already carry `pending_id`, so
this is a trigger URL change, not another notification type or migration.
Use the server's existing id bounds and percent-encoding, never agent-provided
URLs. An old worker can navigate the query unchanged; an old app still opens
the session. Do not add pending ids or hat names to plaintext HTTP headers
such as Topic.

Validate targets twice, on push receipt and notificationclick. Accept one
same-origin rooted path, session routes with an optional bounded `pending`
query, or `/mcp`; reject absolute URLs, network-path URLs, backslashes,
credentials, fragments, ambiguous/doubled query fields and encoded separators
that turn an id into a route. Use URL parsing and normalization plus a route
allowlist, with differential tests, not a string prefix alone. Invalid
targets land at Sessions without attempting the supplied destination.

On click, close the notification and find a same-origin app WindowClient.
If one is already at the exact validated target (path and query), focus it
without `navigate` or a reload, including while it has dirty input or an
answer in flight. Merely focusing a window at another session repeats F-19;
reloading a correct window would needlessly lose its in-memory state.

Before navigating any other app window, require a bounded readiness
handshake with that specific client and target. Question text/selection,
unsent composer input, images/attachments and any in-flight answer or other
mutation all make it busy or dirty. Keep such windows untouched and open a
separate target window. A missing, timed-out or untrusted acknowledgement
also means unavailable; prefer a visible/focused ready window, not a dirty
one. Do not seize setup, login or OAuth callback windows.

The handshake uses a per-attempt id and dedicated response channel, checks
the worker/client source, and binds readiness to the target and a short
lease. A ready page must prevent a new edit/mutation from racing the
acknowledgement and document navigation until that lease is released or
expires; an acknowledgement followed by unchecked new input is insufficient.
The implementation must release readiness on navigation failure/timeout.
Only a ready client receives `WindowClient.navigate`; then focus the
resulting client. If navigation fails or no ready client exists, open a
separate target window where that behavior preserves existing clients.
Do not assume `openWindow` always creates another document: installed-app
platforms can reuse a browsing context. Where separate-window behavior
cannot be established, keep a dirty client untouched, deliver the validated
target as a non-destructive in-app hint, and defer navigation until it is
ready; acceptance must prove that the fallback preserves its input.
A null/failed open is not reported as successful; leave the
failure bounded and the app usable on manual launch. No notification
submits, clears or replaces draft content. Existing sessionStorage composer
drafts do not protect question drafts or images held only in memory, so
they cannot substitute for this readiness gate.

Login return targets already retain path/query via `safeNext`; use that
path for `pending`, not a fragment lost during login. Explicit deep-linked
sessions open regardless of current hat/filter (frontend F-11). Show the
actual server hat; do not use the hat filter to infer ownership.

### 6.3 Reaching a card outside the newest page

Add one owner-authenticated read route:
`GET /api/view/sessions/{id}/questions/{pending_id}` → 200 with the existing
Rust-owned `hennery-view::Item`, constrained to its Question body, or 404.
No migration. It validates ids, checks the owned session before reading,
requires the question to belong to that session, and retains the existing
question parsing/overlay semantics and view caps. Its owned session
existence, question state/answerability, last-event version and grouping
metadata must come from one coherent SQLite read snapshot under one
connection guard and read transaction. Finish that read before serialization
or network delivery; do not hold a database guard across an asynchronous send.

Do not compose the existing `stored_question` helper's individually guarded
reads unchanged: today it can read an open pending record, then read a newer
version after another transaction queues an answer. That would stamp stale
answerability with a newer version and defeat the client's version fence.
Provide a coherent store accessor and use it wherever the shared helper
constructs that Question Item, including HTTP and SSE paths. Ownership and
question/session association must be checked inside that same snapshot.
An answer or delete committing concurrently yields either the complete
before state or complete after state, never a mixed record/version pair.
Foreign, deleted, unknown session/question combinations all look like 404.
It reads the question and
its grouping metadata, not the full transcript. Add its owner-filtered
statement/access path to the existing owner audit. Reuse the generated view
type rather than duplicating raw ACP parsing in React.

For a `pending` link, fetch the current bounded card through this route,
merge by stable item id/version or place it in the session's pinned question
area when its turn is not paged in. Paging that turn later deduplicates it.
The existing item stream supplies later changes for older questions; verify
that behavior with this route rather than opening a third SSE connection.
Merge both HTTP and SSE items using the same stable-id/version fence: a
late older HTTP response cannot overwrite a newer SSE item, nor can an older
SSE item overwrite a newer HTTP result. Equal-version items must represent
the same question state. Session removal also fences an in-flight question
read, so it cannot resurrect a removed session's card.
Focus/scroll to the card once it exists; an explicit navigation may focus it
but must never activate an option. On 404, show Question no longer available
and the remaining session/current questions, not a fabricated card. A
withdrawn/delivered card still present in storage shows its true verdict.

For a session-only legacy link, the existing `SessionDetail.pending` list
can identify the oldest still-answerable pending id; use the same view route
to show it if outside the newest page. Do not render its raw ACP payload in
the browser. If none waits, show the current session tail. Multiple pending
cards remain independently keyed; one session tag does not imply only one
answerable question.

### 6.4 Answering

The default notification tap, and an optional **Open question** action on
browsers that expose actions, open the same card. The default tap must work
without actions. The recommendation in §11 is no lock-screen approval/text
submission: the operator sees the current question and chooses an answer
inside the authenticated app.

Reuse Rust `AnswerRequest`: permission `{option_id}` or elicitation
`{action, content?}`; the existing `AnswerResponse {pending_id, request_id}`
means 202 queued. Options/schema come from the current server card, never
the stale push. No extra step-up for an answer; this is already settled.
Disable duplicate taps while in flight. An HTTP/network failure retains
input; after an ambiguous send, refresh the current question before allowing
an explicit retry. Do not replay it automatically on reconnect. A 409
`already_answered` shows another device answered; `not_open`/cancelled shows
why it cannot be answered. A delivered verdict sticks across subsequent
negative/cancelled events. The existing “Answer as a new message” remains a
separate explicit action after withdrawal, with normal resume/prompt rules.

At mobile widths, permission options stack with at least 44 px targets;
single/multi-select and text use the existing schema rules, including custom
text exclusivity and unsupported-shape decline/cancel. Keyboard shortcuts
remain desktop/card-focus only. Test with the onscreen keyboard, `dvh`, safe
area padding and nested scroll areas so the card's Send and composer's Send
remain reachable. Focus stays with typing; a late stream event cannot
auto-approve or replace another question's input.

## 7. Gateway relay and capabilities

After displaying a valid gateway push, the worker sends a small versioned
invalidation message to same-origin app windows: `{version: 1, kind:
"mcp_invalidated"}`. No connection label, credential, status claim or OAuth
completion proof is copied from push into the connection store. The app
checks message source against its own registration's active worker and
validates the envelope. Visible clients call the existing shared reader's
refresh, coalescing hints with its in-flight read; hidden clients retain a
dirty flag and read on visibility/focus. Timer reads still pause during
consent; event reads do not. Avoid global dispatch that starts a second
connection poller. A lost message is covered by current focus/periodic reads.

Derive gateway routing from the validated `/mcp` target, not title/body
wording or tag prefix alone. Session hints do not trigger full-list refetches;
their existing SSE/reconnect contract remains intact. Worker messages never
call authorize, probe, answer, subscribe or change hats.

Recommend an additive `web_push` capability string when its subscription
and delivery routes are served. The minimum Settings screen hides push
controls in deployments without it; it does not infer availability from
full mode or a notification's URL. Generated capability type already uses
strings; implementation tests the advertisement matches installed routes.
Standalone gateway push/webhook delivery remains 8g's responsibility; do
not advertise push there merely because the manifest exists. `/mcp` in a
notification always uses the gateway's current cards and hedged last-report
copy; a recovery push is not a live health certificate or OAuth completion.

## 8. Storage, migrations and threat model

No new collector tables or numbered migrations. Reuse `push_subscriptions`,
`hat_push_policies`, `auth_sessions`, owner filters and existing session
pending/answer storage. The proposed view route stores nothing. Stable
VAPID key handling and delivery/egress limits remain unchanged.

Browser persistence consists of versioned static shell caches and a small
IndexedDB push-registration record (§5). The latter stores registration id,
VAPID public key identity, local generation/state and the last confirmed
endpoint, needed to recover rotation when the browser omits the change event.
Store replacement keys only for a pending rotation; on success retain the
new confirmed endpoint and erase obsolete endpoints/keys. Clear capability
material on disable/logout. Never persist the auth cookie, a step-up credential,
transcripts, question schema or answer values there. Existing per-session
composer drafts in sessionStorage remain the frontend's contract. Loss of
the push database is repairable by explicit subscription; version upgrades
must preserve a disabled generation or fail closed to Needs re-enable.

| Threat | Boundary |
|---|---|
| Stolen operator cookie subscribes an attacker | Existing fresh step-up on POST; worker rotation replaces only an owned endpoint and creates no row. |
| CSRF from another site or proxy header identity | Existing exact public-origin mutations and Sec-Fetch-Site GET rules; HttpOnly Secure SameSite Strict cookie; no CORS widening, proxy identity or worker bearer. |
| Hat secrets on a lock screen | Delivery applies the owning hat's policy before encryption; default details off; generic title explicit; fixed icons and no browser policy bypass. Single operator can see all hats, as umbrella §8.3 decides. |
| Malicious agent text or navigation | Text-only display, strict external script CSP, bounded runtime payload validation and normalized route allowlist; agent output cannot supply a worker or destination. |
| Endpoint SSRF/exposure | Existing public HTTPS endpoint parsing and per-send public-address egress; endpoint/key material not returned in lists/logs/worker diagnostics. Local IndexedDB is sensitive origin storage, not a secret vault. |
| Revocation races with old worker/rotation | Server logout removes rows transactionally; rotate cannot create them; local disabled generations stop deferred repair. Never auto-subscribe to repair a missing row. |
| Notification fabricates current authorization | Push holds only a hint/link. Live owner/session/question checks and the existing answer endpoint decide all mutations. |
| Offline cached owner data leaks after logout | Static allowlist only; API/auth/attachments/proxy never cached; local view stores cleaned on logout; in-flight OS notifications have explicit limits (§5.4). |
| Cross-window spoofed invalidation | Source/envelope checked, hint triggers an authenticated read only; no trusted push verdict or action. |

Explicit server revocation cannot erase already received notification text
from remote OS history. Hat-policy changes affect future delivery, not
retroactively displayed notifications. The system's existing per-owner
delivery sends to all that owner's rows; no per-hat device allowlist or
stronger OS-user isolation is implied by this proposal.

## 9. HTTPS and the WSS lane

The phone must open the collector's canonical `public_url` origin over trusted
HTTPS, with its certificate trusted by the phone and hostname matching.
Loopback HTTP is a desktop development exception, not a phone deployment.
Extra listeners, raw LAN HTTP, mixed-content access or a desktop localhost
origin cannot substitute for it. RP id, cookies, worker scope and browser
storage all belong to that origin. TLS is terminated by an existing supported
reverse proxy or overlay Serve topology; no built-in ACME in this lane.

The browser talks same-origin HTTPS APIs and SSE; it never connects to a host
WebSocket. WSS is host→collector transport, with host authentication, not a
browser notification mechanism. A local host or existing SSH tunnel can
already supply sessions behind the phone's HTTPS collector. WSS is required
for direct remote host URLs to work without that tunnel; it is not a
prerequisite for manifest/worker or browser push delivery. The WSS lane must
retain the same canonical-origin/passkey/Origin contract and document proxy
WebSocket upgrade and unbuffered SSE. A proxy must also serve root worker
and manifest paths, and not cache auth/API responses.

The phone needs network access to the collector to answer, potentially via
its VPN/overlay; receiving a push through the browser's vendor service does
not grant such access. The collector needs outbound HTTPS to those public
push services. Browser-origin reachability and endpoint egress are separate
checks. Do not “fix” a private collector origin by allowing private push
endpoint addresses or weakening TLS verification.

Changing `public_url` already requires step-up, ends logins/subscriptions and
may remove passkeys on hostname change. Explain origin migration: open the
new origin, sign in, install again if needed and explicitly enable push.
Workers on the old origin cannot navigate their registration to a new origin
or transfer subscriptions. Remove the obsolete installation manually;
no invisible redirect or token-bearing cross-origin return link.

## 10. Failures and verification

### 10.1 Expected failures

Permission denial, app not installed on iOS, missing capabilities, storage
eviction, failed worker install/update, collector unreachable, invalid
certificate and the subscription limit all have explicit UI states (§3).
Malformed push still yields a neutral notification; an invalid target never
opens the supplied URL. A removed session/card results in a bounded 404
view, never an alternate owner's item. A desktop answer racing the phone
is Already answered, not a second ACP response.

Push may be delayed, coalesced or missed. OS Focus modes can silence it;
backend delivery has a one-hour TTL and bounded retries, not guaranteed
arrival. Completion can replace an older question notification with the
same tag. Current waiting counts and question state remain discoverable
inside the app. Worker rotation cannot run indefinitely or reauthenticate
an expired login. A failed logout remains visibly signed in; a completed
logout with failed local cleanup is visibly signed out with cleanup pending.

### 10.2 Automated gates in the implementation plans

- Rust contract tests for percent-encoded pending URLs, unchanged payload
  fields/default hat policy, and the new bounded view read: owner/foreign
  session, mismatched question, deleted session, old turn, outside-turn,
  delivered/cancelled state, caps and concurrent answer. Add a deterministic
  interleaving test using an independent writer connection to commit an
  answer between the helper's record and version reads. The reader's
  transaction must retain the coherent before state/version; a fresh read
  must return the complete after state. A stale answerable record with the
  post-answer version must fail. Probe removal of the coherent-snapshot
  boundary. Add HTTP/SSE response-order tests in both directions, including equal versions,
  outside-tail question upserts and session removal while HTTP is pending.
  Add owner audit coverage and run both real generators with `--check`. Revert-probe the
  owner/session fence, URL selection and capability advertisement.
- Vitest/Testing Library for permission and registration classifiers,
  both step-up stages, expiry/key mismatch, POST partial success, row-id
  recovery, rotation chains/lost responses/404/401/backoff, disabled
  generation, unsubscribe partial failures and SignOut at mobile width.
  Fake IndexedDB and worker clients must model persistence across worker
  termination, not assume a durable JS global. Revert-probe every mutation
  and security side effect rather than only checking helper outputs.
- A dedicated Playwright project permits real service workers and uses the
  embedded binary plus fake ACP host, at 1280 px and 390 px. Other suites
  can retain their existing isolation. Wait for the actual registration/
  controller, assert production worker/manifest MIME, headers, CSP and
  installation, and inspect CacheStorage for the exact static allowlist.
  Check offline launch/reconnect, lazy chunks, forbidden API/auth/proxy/
  attachment caching, denied permission, update waiting with input in two
  windows, and failed new-version install preserving the old shell. Deploy
  a second embedded build between precache requests, changing fixed-name
  index/theme bytes as well as chunks; assert digest rejection, no activation
  of mixed files and the old offline shell still working. The digest-specific
  case returns 200 and expected MIME for all requested files, so a missing
  chunk or status check cannot accidentally prove the digest fence. Cover
  each digest check with mismatched bytes, and revert-probe that fence.
- Mock push at two explicit boundaries. For deterministic UI tests, fake
  PushManager's subscription service and feed encrypted-delivery plaintext
  fixtures as PushEvent data into the actual worker handler; observe
  `showNotification` and invoke the actual click handler with fake OS event
  objects. This proves display/routing logic, not browser vendor transport.
  Keep that injection in the test harness/worker evaluation only: no
  production message endpoint that fabricates push or click events.
- Separately, the existing Rust delivery fixture/mock service decrypts real
  aes128gcm delivery and validates VAPID, policy, padding and retries. A
  test-only Egress injection may reach a loopback mock without changing the
  production public-address fence. Pass its decoded current payload into
  the browser fixture to detect producer/consumer drift. If a real browser
  subscription cannot be redirected to the mock, say so; do not label this
  composition a real vendor end-to-end push test.
- Browser navigation cases: an existing wrong-session window, no window
  (using a clients harness for OS click), pending query through cold
  navigation/login, cross-hat link, old question outside tail, invalid URL
  normalization, withdrawn/deleted question and desktop/phone answer race.
  With unsent question text, unsent images and an in-flight answer, assert
  an exact-target click focuses without document navigation and a different
  target opens separately, preserving the old window's input/operation.
  Test missing/dirty readiness, an edit racing acknowledgement, lease expiry,
  and a clean ready window navigating to the target. Revert-probe the
  exact-target no-reload branch and the navigation readiness gate.
  Actual cold launch is repeated on iOS (§10.3); harness `openWindow`
  assertions alone are not proof of an OS launch. Card buttons remain
  reachable under a mobile viewport; real keyboard/safe areas stay manual.
- Relay proof: inject a gateway push with focus/periodic reads suppressed,
  assert exactly one shared authenticated connection read and no trusted
  status patch. Test malformed/untrusted source hints, hidden dirty state,
  and coalescing during consent. Success caused only by focus is not relay
  evidence (4e-ii-b N3).
- Use roles or exact text locators. Never disable workers to make the worker
  test pass, relax CSP, widen egress, weaken a type, or silently skip iOS
  acceptance. Playwright routing does not intercept all worker/cache-owned
  requests: observe the collector/mock's actual requests and worker cache
  directly instead of treating an empty page-route spy as proof.

Implementation runs the project's targeted checks, full Rust/web gates,
embedded binary/testkit build and full Playwright as required by AGENTS.md.
This design-only change runs documentation/diff checks, not those runtime
tests, and records the latter as future acceptance rather than green.

### 10.3 Manual installed-iOS acceptance and live adapters

Record date, device/OS/browser versions, origin topology, binary/build SHA,
worker build id and outcomes in the implementation plan's acceptance record,
without retaining actual endpoints, credentials or question secrets. Test
the supported minimum iOS/iPadOS 16.4+ where a device is available and the
current release on actual hardware; a Playwright WebKit viewport is not
installed-iOS push. An unavailable minimum device is a recorded coverage
gap, not a pass. Every release repeats the installed-app smoke checklist:

1. Reach canonical HTTPS with a trusted certificate, sign in, install to
   Home Screen, launch standalone and verify icon/safe areas. In a regular
   iOS tab, verify useful installation guidance without a permission prompt.
2. In the installed app, step up, tap Enable, grant permission, and confirm
   the specific server row. Repeat denial and OS permission re-enable.
3. Background and lock the phone. Cause a fake ACP permission and an
   outside-turn question; receive actual vendor-delivered push with default,
   generic/details and muted hat policies. Repeat completion/failure and a
   gateway attention transition. Verify lock-screen privacy against policy.
4. Tap while another session is already open, then with the app closed.
   Reach the correct hat/session/card. Repeat after auth expiry/login,
   with an older question outside the tail and with a withdrawn/deleted
   question. An action button may be absent; the default tap still works.
   Repeat with unsent question text/images and an answer in flight: an exact
   target tap never reloads; a different target preserves the busy view via
   a separate window or deferred in-app hint when the OS reuses windows.
5. Answer a permission, single/multi-select and text elicitation with the
   real keyboard. Check custom-text exclusivity, no numeric shortcut
   approval, visible Send and queued→delivered state. Answer concurrently
   from desktop; repeat with host offline, then reconnect it. With collector
   unreachable, preserve input and never claim queued/delivered.
6. Disable/re-enable, remove the phone's push row from desktop, and reopen
   the app: no silent re-subscribe. Sign out on mobile and revoke its login
   from desktop; verify server rows/streams end and tap old notifications
   requires login. Check local notification cleanup without promising
   deletion from remote OS history.
7. Relaunch offline after one successful install: shell/reconnect state,
   no cached transcript or API response. Reconnect, retain session choice,
   then update the embedded binary while a question/composer is being
   edited in two windows: no silent reload. Verify explicit/next-launch
   update and behavior after app storage is cleared or installation removed.
8. Verify delivery with Focus enabled/disabled and describe delay rather
   than “fixing” backend triggers. Exercise renewal where the browser offers
   it; synthetic rotation tests cover unforceable service rotations. No
   vendor-rotation guarantee comes from a synthetic event.

Before calling the phone loop accepted, use the pinned real Claude and
Codex ACP adapters with temporary test credentials/homes/data: one genuine
question or elicitation from each, real vendor push to the installed phone,
answer, and observe the adapter's actual delivery/continuation. Include
completed/failed notification coverage using deterministic fake adapters
where a live failure is impractical. This catches adapter request shapes and
title/answer behavior a mock cannot prove. Capture scrubbed structured
results; credentials unavailable or a missing adapter behavior is reported
as an open live gate. No collector restart/deployment hosted by an active
fleet session is authorized by this design.

## 11. Decisions and operator question

| Decision | Chosen / recommended | Alternatives and reason | Authority |
|---|---|---|---|
| Push backend and wire source | Reuse 10a/10b, 8f and Rust-generated DTOs. | Predecessor server/routes duplicate weaker auth and delivery rules. | **settled by spec:** kernel §6, umbrella §§5.4, 9. |
| Per-hat privacy defaults | Unmuted, details off, title shown; three independent global hat controls. | Generic-by-default or per-device policy would change settled behavior. | **settled by spec:** kernel §6. |
| Auth lifecycle | Step-up on subscribe; none on rotate/unsubscribe/policy/answer; revoke requires step-up; expired login retains push. | Silent new subscriptions or expiry-based deletion change security/lifecycle decisions. | **settled by spec:** kernel §§3.2, 3.4, 6; ACP core §4.6. |
| Offline contents | Static shell only; no offline answer queue. | Cached API/transcript and background answers add sensitive storage and conflicting delivery semantics. | **settled by spec:** frontend §9, umbrella §6.8. |
| Existing-window click | Focus an exact target without reload; navigate another window only with readiness; otherwise open a separate target. | Focus-only at the wrong target repeats F-19; unconditional document navigation discards in-memory input/answers. | Target behavior **settled by spec:** frontend §9; readiness amendment required by maintainer's review. |
| Pending deep links | Encode pending id in existing URL, plus bounded Question Item read route. | New payload schema is unnecessary; unbounded history paging is slow; browser raw ACP parsing violates client-view design. | **designer's recommendation**; needs API/security review. |
| Manifest identity and capability | Stable app id/scope, start Sessions with gateway redirect; additive `web_push` advertisement. | Hat-specific install identities and mode inference do not match one operator app/API availability. | **designer's recommendation**. |
| Worker build/cache | Generated URL/content-digest allowlist, verify every file before accepting one pinned shell build; external root worker, no new PWA library by default. | ETags lack a cross-request build fence; a hand-maintained list loses lazy imports; blanket runtime caching risks owner data. | **designer's recommendation**; digest amendment required by maintainer's review; shell/no-inline settled by frontend §9/current CSP. |
| Question snapshot and merge | One coherent owner/session/question/state/version/grouping snapshot for shared HTTP/SSE item construction; version-fenced client merges. | Individually guarded reads can stamp stale answerability with a newer version; response order alone cannot establish freshness. | **designer's recommendation** under the client-view contract; coherent-snapshot amendment required by maintainer's review. |
| Update lifecycle | Waiting worker, next-launch activation; explicit coordinated update only when clients ready. | Unconditional skipWaiting/reload loses edits and mixes builds. | **built 2026-10-21:** Reload to update implements §4.3; next-launch activation retained. |
| Renewal recovery | Bounded IndexedDB record, existing cookie/rotate, explicit re-enable for missing rows. | In-memory-only loses worker retries; bearer renewal credentials expand scope; automatic POST resurrects revoked push. | **designer's recommendation** under kernel §6's rotation contract. |
| Foreground attention | Always display valid push once; SSE supplies badges, no duplicate native notification. | Suppression based on an open tab conflicts with visible-push expectations; a second notification path adds duplication. | **designer's recommendation**. |
| Gateway relay | Typed untrusted invalidation hint into the existing shared reader. | Copying push state into cards or adding another poller misstates current gateway status. | **designer's recommendation**; 4e-ii-b's seam and hedged copy retained. |
| Phone HTTPS / host WSS | Same-origin HTTPS browser API/SSE; WSS separately authenticates hosts. | LAN HTTP, certificate bypasses or trusted-proxy identity violate the umbrella contract. | **settled by spec:** umbrella §7.5, kernel §§3.3, 7. |
| Lock-screen answering | Recommend tap/Open question, then review and answer inside the app. | Direct Approve/Deny can act on stale content; native free-text/actions are not portable and would require new auth/replay semantics. | **OPERATOR QUESTION:** “Should v1 phone notifications only open the live question card, or also submit approval/text replies directly from the lock screen? Recommended default: open the card; answer inside the authenticated app.” |
| Declarative Web Push | Keep current imperative payload/worker for this minimum; revisit separately if eviction proves a release blocker. | Newer declarative transport is useful, but changes the implemented delivery shape and compatibility matrix beyond this handoff. | **designer's recommendation**; requires review against current WebKit evidence (§13). |

The operator question blocks only a decision to implement direct lock-screen
mutations. The card-based design is reviewable now; it is a recommendation,
not an operator ruling. No other unresolved product choice is needed for
the minimum package.

## 12. Implementation split and other lanes

Two ordered plans; identifiers are assigned by the parent after review.
Each copies plan 3c's build/embed/replay structure, includes red/revert
evidence and ends with full verification. Sizes describe implementation
scope, not a calendar promise.

| Order | Plan | Size | Deliverables and acceptance |
|---|---|---|---|
| 1 | PWA foundation and minimum push/device Settings | **M**, about 5–6 tasks | Generated root worker/manifest/icons and embedding/CSP/static serving; offline/update lifecycle; typed push/device/contact client; gesture-safe step-up subscribe, disable and renewal persistence; per-hat controls and mobile sign-out; worker-enabled Playwright and backend-contract tests. This branch enables receiving and inspecting pushes, but the phone-loop acceptance waits for plan 2. |
| 2 | Question deep links, mobile answers and gateway relay | **M**, about 4–5 tasks | Pending URL generation and bounded owner-filtered view route; card targeting/deduplication/auth return; navigate-existing-window handler; shared MCP invalidation relay; mobile concurrency/failure tests, mock service composition, actual installed-iOS and pinned-adapter/vendor-push acceptance. |

No additional push-delivery plan is counted. The gap report's minimum is
one to two plans; two gives a review boundary between browser/device
lifecycle and the question-answer loop. Full Settings remains separate.
Plan 2 depends on plan 1; an independently reviewed bounded question read
can be built first within plan 2. No deployment precedes the early-tester
gate or the parent's deployment authorization.

**WSS assumptions:** it preserves `public_url`, owner/auth/Origin rules,
adds trusted-TLS host transport and documents proxy upgrades/SSE. Phone
plan 1 can proceed without WSS; a direct remote-host live acceptance depends
on it. Shared proxy/browser HTTPS documentation must use one topology.

**Delegation assumptions:** child-session questions use the existing
pending/answer/view contract. Parent/child metadata does not change push
ownership or hat policy. This design adds no new delegation notification
policy; any aggregation/suppression is separately designed by that lane.

**Memory assumptions:** no transcript, memory note or memory token enters
push/cache/notification payloads. Agent question titles remain potentially
sensitive agent text under the existing details policy. Memory's MCP
mechanism has no browser-worker authority.

**Frontend/management assumptions:** preserve the existing AnswerBook,
draft cleanup, capability routing and MCP shared reader; extend Settings
with this minimum, leaving its broader account/diagnostics sections for
4d. Independent review must check overlap with any concurrently written
Settings plan and the new route's owner audit. Parent owns review, PR/CI,
operator ruling and release acceptance; this document claims none of them.

## 13. Browser references

Checked 2026-10-14. Browser details must be rechecked when writing plans:

- [WebKit: Web Push for Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/): installed Home Screen apps from iOS/iPadOS 16.4, permission from direct interaction, app identity and OS notification integration. These establish the installed-device and fresh-tap gates, not a promise of universal notification action support.
- [W3C Push API](https://www.w3.org/TR/push-api/): subscription refresh/change events and visible-push semantics. Foreground reconciliation is the design's recovery path when no change event is observed; it is not a claim that every browser reliably sends that event.
- [W3C Service Workers](https://www.w3.org/TR/service-workers/): waiting/activation, WindowClient navigation and worker lifetime; these motivate explicit readiness and persistent bounded repair.
- [W3C CSP Level 3](https://www.w3.org/TR/CSP/): worker source restrictions/fallbacks. The explicit same-origin worker directive does not require loosening script execution.
- [Playwright service workers](https://playwright.dev/docs/service-workers): service-worker requests and routing limitations. Mock-only cases and real-worker cases have different evidence boundaries.
- [WebKit: Meet Declarative Web Push](https://webkit.org/blog/16535/meet-declarative-web-push/): newer declarative delivery can display without retained worker JavaScript, including eviction cases. It is a follow-up transport decision; the current `PushPayload` is imperative and does not gain that fallback merely by adding a manifest.

Generated with Claude AI — please review before distribution.
