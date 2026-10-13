import type { HostItem } from '../generated/protocol'
import { predictDelivery, predictionWords } from '../lib/mcpDelivery'
import { agentLabel } from '../lib/agent'
import { Text } from '../lib/text'

export default function McpPrediction({ host, agent, hatId }: { host?: HostItem; agent: string; hatId?: string }) {
  const mode = predictDelivery(host, agent, hatId)
  return (
    <section className="mcp-prediction" aria-label="MCP prediction">
      <p><Text>{agentLabel(agent)}</Text>: {predictionWords(mode)}</p>
      {agent === 'codex' && <p>Codex MCP servers are not isolated per hat. Codex also loads your own ~/.codex MCP servers.</p>}
    </section>
  )
}
