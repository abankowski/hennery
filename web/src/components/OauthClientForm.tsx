import type { McpConnectionItem } from '../generated/protocol'
export interface OauthClientProps { connection: McpConnectionItem; onChanged: (item: McpConnectionItem) => void }
export default function OauthClientForm(_props: OauthClientProps) { return null }
