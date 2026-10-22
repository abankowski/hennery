// A draft per session (frontend spec §6.5, F-17), in `sessionStorage`: it
// survives a reload and a switch to another session, and is never shown,
// or sent, in any session but its own.

const PREFIX = 'hennery.draft.'
const SENDING_PREFIX = 'hennery.draft-send.'

export function draftKey(sessionId: string): string {
  return `${PREFIX}${sessionId}`
}

export function loadDraft(sessionId: string): string {
  try {
    return sessionStorage.getItem(draftKey(sessionId)) ?? ''
  } catch {
    // Storage refused (private mode, quota): a draft only lives in the page.
    return ''
  }
}

/** Keep `text` as the session's draft; an empty one is removed. */
export function saveDraft(sessionId: string, text: string): void {
  try {
    if (text === '') sessionStorage.removeItem(draftKey(sessionId))
    else sessionStorage.setItem(draftKey(sessionId), text)
    if (!draftMayHaveBeenSent(sessionId)) sessionStorage.removeItem(SENDING_PREFIX + sessionId)
  } catch {
    // As above: the draft stays in the page only.
  }
}

/** Persist before POSTing: losing the response on a reload leaves the send's
 * outcome unknown. A 202 or a changed/emptied draft clears this marker. */
export function markDraftSending(sessionId: string, text: string, requestKey: string): void {
  try {
    // Image preparation may finish after sign-out or a draft replacement.
    // Never recreate text that the operator already cleared.
    if (text && sessionStorage.getItem(draftKey(sessionId)) === text) sessionStorage.setItem(SENDING_PREFIX + sessionId, JSON.stringify({ text, requestKey }))
  } catch { /* Page-only draft. */ }
}

function sendingDraft(sessionId: string): { requestKey?: string } | undefined {
  try {
    const text = loadDraft(sessionId)
    const marker = sessionStorage.getItem(SENDING_PREFIX + sessionId)
    if (!text || !marker) return undefined
    // Older pages stored only text. Keep their warning after an update.
    if (marker === text) return {}
    const saved: unknown = JSON.parse(marker)
    if (typeof saved !== 'object' || saved === null || !('text' in saved) || saved.text !== text || !('requestKey' in saved) || typeof saved.requestKey !== 'string' || !/^[\x21-\x7e]{1,128}$/.test(saved.requestKey)) return undefined
    return { requestKey: saved.requestKey }
  } catch { return undefined }
}

export function draftMayHaveBeenSent(sessionId: string): boolean {
  return sendingDraft(sessionId) !== undefined
}

/** Reuse the uncertain submission's key, including after a document reload. */
export function draftSendingRequestKey(sessionId: string): string | undefined {
  return sendingDraft(sessionId)?.requestKey
}

/** A server refusal resolves the uncertainty without discarding the draft. */
export function clearDraftSending(sessionId: string): void {
  try { sessionStorage.removeItem(SENDING_PREFIX + sessionId) } catch { /* Page-only draft. */ }
}

/** Drop every session's draft, and nothing else held in `sessionStorage`
 *  (a sign-out: the text is the half most likely to hold a pasted secret). */
export function forgetAllDrafts(): void {
  try {
    // Keys first: removing while walking the indices would skip some.
    const keys: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key?.startsWith(PREFIX) || key?.startsWith(SENDING_PREFIX)) keys.push(key)
    }
    for (const key of keys) sessionStorage.removeItem(key)
  } catch {
    // Storage refused: no draft was kept there either.
  }
}
