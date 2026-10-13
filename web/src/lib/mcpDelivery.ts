// Delivery is a last-start/resume decision, never a live health check.
import type { HostItem } from '../generated/protocol'

export type DeliveryMode = 'unknown' | 'isolated' | 'unisolated' | 'fallback' | 'unsupported'

export function deliveryWords(mode: unknown): string {
  switch (mode) {
    case 'isolated':
      return 'Hennery keeps this agent to the MCP servers of this hat.'
    case 'unisolated':
      return 'The MCP servers are not isolated per hat; the agent also loads your own MCP configuration.'
    case 'fallback':
      return 'No hennery MCP servers: this hat is not the host’s default for this agent.'
    case 'unsupported':
      return 'No hennery MCP servers: the host does not support their delivery.'
    default:
      return 'MCP delivery is unknown.'
  }
}

/** Unknown/missing reports never imply isolation. An accepted capability-
 *  negative hello is distinct from a host that has never reported. */
export function predictDelivery(host: HostItem | undefined, agent: string, hat: string | undefined): DeliveryMode {
  if (!host || !agent || !hat) return 'unknown'
  if (!host.capabilities.includes('mcp_servers')) {
    if (host.last_seen_at === undefined) return 'unknown'
    return 'unsupported'
  }
  const map = host.mcp_delivery
  if (!map || !Object.hasOwn(map, agent)) return 'unknown'
  if (map[agent] === 'isolated') return 'isolated'
  // An unknown future agent-delivery value is read as default_hat_only.
  if (hat === host.default_hat_id) return 'unisolated'
  return 'fallback'
}

export function predictionWords(mode: DeliveryMode): string {
  return 'Prediction from the host’s last report: ' + deliveryWords(mode)
}

export const CODEX_MCP_NOTE =
  'This session’s MCP servers are not isolated per hat. Codex also loads your own ~/.codex MCP servers.'

/** Only a non-running → running transition invalidates delivery metadata. */
export function runningLifecycle(lifecycle: string | undefined): boolean {
  return lifecycle === 'starting' || lifecycle === 'active'
}
