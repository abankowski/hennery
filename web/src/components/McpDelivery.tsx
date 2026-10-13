import type { McpSessionDelivery } from '../generated/protocol'
import { CODEX_MCP_NOTE, deliveryWords } from '../lib/mcpDelivery'

export default function McpDelivery({ agent, delivery }: { agent?: string; delivery?: McpSessionDelivery }) {
  return (
    <section className="mcp-delivery" aria-label="MCP delivery">
      <p>At the last start/resume: {deliveryWords(delivery?.mode)}</p>
      {delivery && <p>{delivery.servers} MCP servers.</p>}
      {agent === 'codex' && <p>{CODEX_MCP_NOTE}</p>}
    </section>
  )
}
