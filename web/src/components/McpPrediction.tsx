import type { HostItem } from '../generated/protocol'
import { ownConfigNote, predictDelivery, predictionWords } from '../lib/mcpDelivery'
import { agentLabel } from '../lib/agent'
import { Text } from '../lib/text'

export default function McpPrediction({ host, agent, hatId }: { host?: HostItem; agent: string; hatId?: string }) {
  const mode = predictDelivery(host, agent, hatId)
  const note = ownConfigNote(mode, agent)
  return (
    <section className="mcp-prediction" aria-label="MCP prediction">
      <p><Text>{agentLabel(agent)}</Text>: {predictionWords(mode)}</p>
      {note && <p>{note}</p>}
    </section>
  )
}
