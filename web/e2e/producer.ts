import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnHennery } from './spawn'
import type { PushPayload } from '../src/generated/protocol'
/** Public Rust producer -> complete JSON; does not replace URL encoding in JS. */
export async function producerNotice(session: string, pending: string): Promise<PushPayload> {
  const dir = await mkdtemp(join(tmpdir(), 'hennery-push-producer-'))
  try {
    const child = spawnHennery([session, pending], dir, {}, ['ignore', 'pipe', 'pipe'], resolve('../target/hennery-push-notice'))
    let stdout = '', stderr = ''
    child.stdout!.on('data', chunk => { stdout += String(chunk) })
    child.stderr!.on('data', chunk => { stderr += String(chunk) })
    const code = await new Promise<number | null>((resolve, reject) => { child.once('error', reject); child.once('exit', resolve) })
    if (code !== 0) throw Error(`Notification producer failed (${code}): ${stderr}`)
    return JSON.parse(stdout) as PushPayload
  } finally { await rm(dir, { recursive: true, force: true }) }
}
