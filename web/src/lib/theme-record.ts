import { ACCENT_ROLES, DEFAULT_ACCENT, HEX, deriveAccent, type Accent, type Appearance, type Palette } from './accent'
export const THEME_KEY = 'hennery.theme'
export type Preference = 'system' | Appearance
export interface ThemeRecord extends Accent { version: 1; preference: Preference }
export const isPreference = (p: unknown): p is Preference => p === 'system' || p === 'light' || p === 'dark'
function isPalette(value: unknown): value is Palette {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const p = value as Record<string, unknown>
  return Object.keys(p).length === ACCENT_ROLES.length && ACCENT_ROLES.every((key) => typeof p[key] === 'string' && HEX.test(p[key]))
}
export function makeTheme(preference: Preference = 'system', source = DEFAULT_ACCENT): ThemeRecord {
  return { version: 1, preference, ...deriveAccent(source) }
}
export function readTheme(raw: string | null): ThemeRecord {
  try {
    const v: unknown = JSON.parse(raw ?? 'null')
    if (!v || typeof v !== 'object' || Array.isArray(v)) return makeTheme()
    const o = v as Record<string, unknown>
    if (Object.keys(o).length === 2 && typeof o['--accent'] === 'string' && HEX.test(o['--accent']) && typeof o['--accent-2'] === 'string' && HEX.test(o['--accent-2'])) return makeTheme('system', o['--accent'])
    if (Object.keys(o).length !== 5 || o.version !== 1 || !isPreference(o.preference) || typeof o.source !== 'string' || !HEX.test(o.source) || !isPalette(o.light) || !isPalette(o.dark)) return makeTheme()
    // Also reject well-shaped but tampered/unreadable palettes.
    const expected = deriveAccent(o.source)
    if (!ACCENT_ROLES.every((key) => o.light && o.dark && (o.light as Palette)[key] === expected.light[key] && (o.dark as Palette)[key] === expected.dark[key])) return makeTheme()
    return { version: 1, preference: o.preference, ...expected }
  } catch { return makeTheme() }
}
export function applyTheme(record: ThemeRecord, systemDark: boolean): Appearance {
  const theme = record.preference === 'system' ? (systemDark ? 'dark' : 'light') : record.preference
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme
  for (const key of ACCENT_ROLES) root.style.setProperty(`--hn-${key}`, record[theme][key])
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#141517' : '#f8f9fb')
  return theme
}
