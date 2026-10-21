# UI backend gaps

The rendered design is the visual reference. These gaps are deliberately shown
with available server data rather than inferred agent activity.

| Screen | Design element | Missing API data / operation | Proposed contract | Current UI |
|---|---|---|---|---|
| All sessions | Per-row Doing text and progress | Session summaries expose activity, but no current tool description or plan counts | Add bounded current activity text and plan counts to `GET /api/view/sessions` and its stream | Shows the actual lifecycle/activity status; no fabricated progress |
| Needs you | Your-turn cards, reply and Dismiss / Mark as read on every card | No canonical ended-with-question / read-state projection or universal acknowledgement endpoint; the operator wants dismiss/mark-as-read on every card | Add operator-turn attention with message id, reply target and an acknowledgement endpoint for every attention kind | Questions open their canonical session card. Pending-card dismiss is stored in this browser by session and pending/attention key, excluded from local counts, reset by new attention and cleared on sign-out; Show dismissed reveals it again. Status-only delegation uses its real acknowledge API. Closed attention is shown with its lifecycle |
| Needs you / Session | Command / file edit preview | Permission question has a title and options, but no structured command, working directory or file diff | Add bounded permission tool preview to the view question | Shows the server question title and real options |
| Shell / overview | Global per-hat counts and aggregates | List counts cover loaded summaries, subject to paging and current filters | Add owner-scoped aggregate counts by hat, status and host | Labels partial counts as shown and uses available summaries |
| Session / Family | Child Doing text and plan progress | Family summaries have activity but no current tool text or child plan counts | Add bounded activity text and plan counts to each family child summary | Shows the child's actual activity and question routing; local session plans use real view items |
| New session | Recent projects across hosts and hats | Project discovery is per host and recents belong to one resolved hat; no global recent-project list includes host and hat identity | Add an owner-scoped recent-project list with host id, hat id, canonical path and last-used time | Shows the chosen host's projects with recents first in autocomplete; the Host and Agent rows change that context |
| Hosts | Agent versions, sign-in state and update availability | Host list reports platform and hennery version, but no per-agent version/auth report or available-update verdict | Extend host inventory with per-agent reports and an update comparison | Shows actual host version; agent column says Not reported. Session counts are qualified as shown |
| Settings / Delegation | Binary ON/OFF, including future models and modes | Covered by operator decision, 2026-10-21; execution policy removed | PATCH only `delegation_enabled`, with one confirmation; enabling never probes hosts. ON permits every value offered by the live fresh catalog at spawn; OFF denies delegation | No stored grant or allowlist. A runtime signed in later is usable without re-toggling. Catalog/spawn failures identify host, runtime and reason; authentication returns `auth_required` (“not signed in”) and fails only the selected spawn |
| Settings / Sign-in | Change password and last-changed date | No browser password-change endpoint or password metadata exists; collector admin reset is available | Add an authenticated step-up password-change route and metadata | Shows Password management with the actual collector command and its effects |
| Settings / Notifications | Separate permission, question, failure, turn-finished and hidden-tab switches | Push policy exposes only per-hat mute, generic title and question details | Extend per-hat push policy with event and visibility preferences | Retains the real per-hat privacy controls and browser registration state (O2); no inert event switches |
| Every session title | A name when the agent sends none | Covered: server-side provisional names and operator title overrides | `PATCH /api/sessions/{id}` with `{title: string \| null}`; `title_source` (`agent`, `operator`, `prompt`) on session items, summaries and family links | Uses server titles and provenance everywhere; header, menu and palette open Rename, with Reset to agent title for operator overrides. Without a server title, project/id metadata remains |

Session naming is covered. Operator titles persist across agent updates; null
restores the latest agent title or the first delivered prompt's first line.
Prompt titles are provisional.

Generated with Claude AI — please review before distribution.
