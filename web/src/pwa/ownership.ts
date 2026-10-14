// Held across external effects, not an IndexedDB transaction or an expiring
// journal lease. Windows and workers share this origin-wide resource. Never
// steal it: a suspended DELETE/unsubscribe may still have effects on resume.
export function withPushOwnership<T>(work: () => Promise<T>): Promise<T> {
  if (!globalThis.navigator?.locks) return Promise.reject(new Error('Safe notification coordination is unavailable in this browser.'))
  return navigator.locks.request('hennery-push-effects', work)
}
