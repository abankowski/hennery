# UI backend gaps

The rendered design is the visual reference. These gaps are deliberately shown
with available server data rather than inferred agent activity.

| Screen | Design element | Missing API data / operation | Proposed contract | Current UI |
|---|---|---|---|---|
| All sessions | Per-row Doing text and progress | Session summaries expose activity, but no current tool description or plan counts | Add bounded current activity text and plan counts to `GET /api/view/sessions` and its stream | Shows the actual lifecycle/activity status; no fabricated progress |
| Needs you | Your-turn cards, reply and Mark as seen | No canonical ended-with-question / read-state projection | Add operator-turn attention with message id, reply target and acknowledgement endpoint | Displays only pending questions and canonical delegation attention; replies remain in the session |
| Needs you / Session | Command / file edit preview | Permission question has a title and options, but no structured command, working directory or file diff | Add bounded permission tool preview to the view question | Shows the server question title and real options |
| Shell / overview | Global per-hat counts and aggregates | List counts cover loaded summaries, subject to paging and current filters | Add owner-scoped aggregate counts by hat, status and host | Labels partial counts as shown and uses available summaries |
| Session / Family | Child Doing text and plan progress | Family summaries have activity but no current tool text or child plan counts | Add bounded activity text and plan counts to each family child summary | Shows the child's actual activity and question routing; local session plans use real view items |

Generated with Claude AI — please review before distribution.
