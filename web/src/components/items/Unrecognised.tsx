// Updates outside the structured item union retain their collapsed raw JSON.
// Session rename metadata has a known label even on this view protocol version.
import { CutNote } from './parts'
import type { ItemEnv, ItemOf } from './types'

export default function Unrecognised({ item, env }: { item: ItemOf<'unrecognised'>; env: ItemEnv }) {
  return (
    <details className="unrec fade-in">
      <summary>
        {item.update_kind === 'session_renamed' ? 'Session name changed' : <>Unsupported update (<bdi>{item.update_kind}</bdi>)</>}
      </summary>
      <pre className="tool-io">{item.raw}</pre>
      {item.truncated && <CutNote sessionId={env.sessionId}>This update was cut.</CutNote>}
    </details>
  )
}
