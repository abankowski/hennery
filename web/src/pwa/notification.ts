import type { PushPayload } from '../generated/protocol'
const neutral: PushPayload = { title: 'hennery needs your attention', body: 'Open hennery to check the current state.', url: '/sessions', tag: 'hennery-attention' }

// Canonical literal paths only. P2 owns card targeting and window navigation.
export function notificationTarget(value: unknown): string {
  if (typeof value !== 'string' || value.length > 512 || /[\\#\s]/.test(value)) return '/sessions'
  try {
    const parsed = new URL(value, 'https://hennery.invalid')
    if (parsed.origin !== 'https://hennery.invalid' || parsed.pathname + parsed.search !== value) return '/sessions'
  } catch { return '/sessions' }
  if (value === '/mcp' || value === '/sessions') return value
  return /^\/sessions\/[A-Za-z0-9_-]{1,128}(\?pending=[A-Za-z0-9_-]{1,128})?$/.test(value) ? value : '/sessions'
}
export function decodePush(text: string | null): PushPayload {
  if (!text || text.length > 8192) return { ...neutral }
  try {
    const p: unknown = JSON.parse(text)
    if (!p || typeof p !== 'object') return { ...neutral }
    const fields = p as Record<string, unknown>
    const bounded = (v: unknown, max: number) => typeof v === 'string' && v.length <= max
    if (!bounded(fields.title, 256) || !bounded(fields.body, 2048) || !bounded(fields.tag, 256)) return { ...neutral }
    return { title: fields.title as string, body: fields.body as string, tag: fields.tag as string, url: notificationTarget(fields.url) }
  } catch { return { ...neutral } }
}
