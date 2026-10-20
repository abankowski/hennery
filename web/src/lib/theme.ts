import { useSyncExternalStore } from 'react'
import { deriveAccent, paletteProperties, type Accent, type Appearance } from './accent'
import { THEME_KEY, applyTheme, isPreference, makeTheme, readTheme, type Preference, type ThemeRecord } from './theme-record'
export { THEME_KEY, type Preference }
export type Theme = Accent
let current: ThemeRecord | undefined
let resolved: Appearance = 'light'
const listeners = new Set<() => void>()
let watching = false
function media() { return window.matchMedia?.('(prefers-color-scheme: dark)') }
function read(): ThemeRecord {
  try { return readTheme(localStorage.getItem(THEME_KEY)) } catch { return makeTheme() }
}
function apply() {
  resolved = applyTheme(current ??= read(), media()?.matches ?? false)
  for (const notify of listeners) notify()
}
function watch() {
  if (watching) return
  watching = true
  media()?.addEventListener('change', () => { if (getTheme().preference === 'system') apply() })
  window.addEventListener('storage', (e) => {
    if (e.key === THEME_KEY || e.key === null) { current = read(); apply() }
  })
  apply()
}
export function getTheme(): ThemeRecord { return current ??= read() }
function save(record: ThemeRecord) {
  current = record
  watch()
  apply()
  try { localStorage.setItem(THEME_KEY, JSON.stringify(record)) } catch { /* current document only */ }
}
/** Compatibility seam for SessionScope; null means All's neutral accent. */
export function saveTheme(theme: Theme | null): void { save({ version: 1, preference: getTheme().preference, ...(theme ?? deriveAccent()) }) }
export function setAppearance(preference: Preference): void {
  if (!isPreference(preference)) throw new Error('Unknown appearance.')
  save({ ...getTheme(), preference })
}
export function cycleAppearance(): void {
  const order: Preference[] = ['system', 'light', 'dark']
  setAppearance(order[(order.indexOf(getTheme().preference) + 1) % order.length])
}
export function subscribeTheme(notify: () => void): () => void {
  watch(); listeners.add(notify)
  return () => { listeners.delete(notify) }
}
export function useAppearance(): { preference: Preference; resolved: Appearance } {
  const preference = useSyncExternalStore(subscribeTheme, () => getTheme().preference)
  const theme = useSyncExternalStore(subscribeTheme, () => resolved)
  return { preference, resolved: theme }
}
/** Session/launcher owners scope this style without changing overview hat choice. */
export function useAccentStyle(source: string | undefined): Record<string, string> {
  const { resolved: appearance } = useAppearance()
  return paletteProperties(deriveAccent(source)[appearance])
}

// Document-lifetime listeners also cover gateway screens and failed hat reads.
watch()
