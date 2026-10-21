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
    if (!text || sessionStorage.getItem(SENDING_PREFIX + sessionId) !== text) sessionStorage.removeItem(SENDING_PREFIX + sessionId)
  } catch {
    // As above: the draft stays in the page only.
  }
}

/** Persist before POSTing: losing the response on a reload leaves the send's
 * outcome unknown. A 202 or a changed/emptied draft clears this marker. */
export function markDraftSending(sessionId: string, text: string): void {
  try {
    // Image preparation may finish after sign-out or a draft replacement.
    // Never recreate text that the operator already cleared.
    if (text && sessionStorage.getItem(draftKey(sessionId)) === text) sessionStorage.setItem(SENDING_PREFIX + sessionId, text)
  } catch { /* Page-only draft. */ }
}

export function draftMayHaveBeenSent(sessionId: string): boolean {
  try {
    const text = loadDraft(sessionId)
    return !!text && sessionStorage.getItem(SENDING_PREFIX + sessionId) === text
  } catch { return false }
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
