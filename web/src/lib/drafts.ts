// A draft per session (frontend spec §6.5, F-17), in `sessionStorage`: it
// survives a reload and a switch to another session, and is never shown,
// or sent, in any session but its own.

const PREFIX = 'hennery.draft.'
const unstored = new Set<string>()
export const hasUnstoredDrafts = () => unstored.size > 0

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
    unstored.delete(sessionId)
  } catch {
    // As above: the draft stays in the page only.
    if (text) unstored.add(sessionId)
    else unstored.delete(sessionId)
  }
}

/** Drop every session's draft, and nothing else held in `sessionStorage`
 *  (a sign-out: the text is the half most likely to hold a pasted secret). */
export function forgetAllDrafts(): void {
  unstored.clear()
  try {
    // Keys first: removing while walking the indices would skip some.
    const keys: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key?.startsWith(PREFIX)) keys.push(key)
    }
    for (const key of keys) sessionStorage.removeItem(key)
  } catch {
    // Storage refused: no draft was kept there either.
  }
}
