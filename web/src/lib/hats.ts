// The selected hat is independent of appearance and session-local accents.
import { deriveAccent, type Accent } from './accent'
export const HAT_KEY = 'hennery.hat'
export function readHat(): string {
  try { return localStorage.getItem(HAT_KEY) ?? '' } catch { return '' }
}
export function writeHat(hat: string): void {
  try { localStorage.setItem(HAT_KEY, hat) } catch { /* current document only */ }
}
export function themeOf(colour: string | undefined): Accent { return deriveAccent(colour) }
