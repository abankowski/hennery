import { ApiFailure, messageOf } from '../api/errors'
import type { McpStdioServerItem, McpStdioServersRequest } from '../generated/protocol'

// Only whether a value was supplied is state; the value lives in the DOM.
export interface StdioEnvDraft { id: number; name: string; keep: boolean; entered?: boolean; empty?: boolean }
export interface StdioDraft { id: number; name: string; command: string; args: string[]; env: StdioEnvDraft[] }

/** Keep is scoped to the server's original identity and command. */
export function canKeepEnv(before: McpStdioServerItem | undefined, name: string, command: string, env: string): boolean {
  return before !== undefined && before.name === name && before.command === command &&
    before.env.some((entry) => entry.name === env && entry.has_value)
}

/** Values are read once from uncontrolled DOM fields, not React state.
 *  The caller clears them before retaining this request for step-up/retry. */
export function stdioRequest(drafts: StdioDraft[], read: (server: number, env: number) => string): McpStdioServersRequest {
  return {
    servers: drafts.map((server) => ({
      name: server.name, command: server.command, args: server.args,
      env: server.env.map((entry) => entry.keep ? { name: entry.name } : { name: entry.name, value: read(server.id, entry.id) }),
    })),
  }
}

export function stdioRefusal(err: unknown): string {
  if (err instanceof ApiFailure && err.code === 'not_found') return 'This host or hat no longer exists.'
  if (err instanceof ApiFailure && err.code === 'host_revoked') return 'This host is revoked: its local MCP servers can be read, not changed.'
  return messageOf(err)
}
