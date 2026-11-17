# Steering from the prompt queue

## Intent

Let an operator deliver a selected queued message to the running Claude Code
or Codex turn without cancelling it. The operator approved an explicit
“Send as steering” action on each queued message.

## Approach

Use the existing ACP adapters and their `_session/steering` extension, available
in the pinned Claude adapter 0.100.0 and Codex adapter 2.5.0. Discover support
from the top-level initialize response `_meta.steering.supported`.

The alternatives are sending every queued message automatically (which changes
the queue's existing meaning), or cancelling and restarting the turn (which
interrupts work). Neither matches the selected explicit action.

## Behavior

- Add “Send as steering” to queued messages when the attached adapter supports
  steering and a turn is running. Preserve Edit and Remove. Disable the action
  during mutations and while a local edit is open.
- Deliver the selected stored message, including its stored image blocks;
  earlier queued messages remain queued. The explicit selection authorizes
  bypassing their FIFO order for this delivery only.
- Atomically claim the item before dispatch. Ordinary queue delivery, editing,
  removal, and a second steering request cannot claim the same item.
- Send `_session/steering` with
  `_meta.steering.idleBehavior = "promptRequired"`.
- On `injected`, mark delivery confirmed and remove the item from the visible
  queue. Keep the running turn's identity and normal completion lifecycle.
- On `promptRequired`, restore ordinary queue delivery. The adapter must not
  start a new turn itself. The item may be sent normally after the original
  turn completes.
- On a definite rejection, retain the content and report the reason. Do not
  represent acceptance by the collector or host as delivery to the agent.
- If a connection is lost after dispatch, delivery is uncertain. Do not
  automatically retry or restore ordinary delivery, which could duplicate the
  instruction. Expose the uncertainty and preserve the content for recovery.
- Publish queue changes through the existing refresh/SSE path so other browser
  windows converge on the same state.

Steering acknowledges admission to the agent's active work, not proof that the
model has already followed the instruction. Pending permission and question
cards remain controlled by their existing answer flow.

## Implementation boundaries

Extend the queue REST API, durable operation tracking, collector/host protocol,
session actor, adapter capability publication, generated browser types, and
PromptQueue UI. Reuse attachment handling, session ownership, host revocation,
and lifecycle checks. Do not loosen the ordinary prompt guard that rejects
another prompt while a turn is running.

No adapter version bump, automatic steering, new composer mode, cancellation,
or changes to delegated-agent prompt delivery are included.

## Acceptance checks

1. A queued message is injected before the original prompt completes, using
   the extension rather than another `session/prompt`.
2. The selected item is delivered once; other queued items keep their order.
3. A turn ending during dispatch leaves one ordinary queued delivery.
4. Unsupported adapters refuse steering without losing content.
5. Concurrent edit/remove/steer/ordinary delivery cannot consume an item twice.
6. Disconnect after dispatch does not trigger an automatic duplicate send.
7. Text and image content, permission cards, and active turn completion retain
   their existing behavior.
8. UI tests cover the action, busy/error states, and refresh across mutation
   outcomes; protocol and integration tests exercise actual host routing.

These decisions are proposed implementation details, not additional user
requirements. Live verification against both pinned adapters supplements the
automated fake-adapter tests when authenticated runtimes are available.
