/** Opaque, contrast-checked hat roles. OKLab matrices: CSS Color 4 §9. */
export const DEFAULT_ACCENT = '#64748b'
export const HEX = /^#[0-9a-f]{6}$/i
export type Appearance = 'light' | 'dark'
export const ACCENT_ROLES = ['accent', 'accent-hover', 'accent-fg', 'on-accent', 'accent-wash', 'accent-soft', 'selected', 'focus-ring', 'focus-halo'] as const
export type AccentRole = typeof ACCENT_ROLES[number]
export type Palette = Record<AccentRole, string>
export interface Accent { source: string; light: Palette; dark: Palette }
export const SURFACES = {
  light: ['#f8f9fb', '#ffffff', '#f1f2f5', '#f1f3f7'],
  dark: ['#141517', '#1a1c1e', '#202223', '#17191b', '#26292b'],
} as const

const linear = (v: number) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4
const gamma = (v: number) => v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
const hex = (values: number[]) => '#' + values.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')
export function contrast(a: string, b: string): number {
  const lum = (c: string) => rgb(c).map(linear).reduce((n, v, i) => n + v * [.2126, .7152, .0722][i], 0)
  const x = lum(a), y = lum(b)
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05)
}
export function toOKLCH(colour: string): [number, number, number] {
  const [r, g, b] = rgb(colour).map(linear)
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b)
  const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b)
  const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b)
  const a = 1.9779984951 * l - 2.428592205 * m + .4505937099 * s
  const bb = .0259040371 * l + .7827717662 * m - .808675766 * s
  return [.2104542553 * l + .793617785 * m - .0040720468 * s, Math.hypot(a, bb), Math.atan2(bb, a)]
}
/** Reduce chroma until in gamut; never clip RGB channels. */
function inGamut(L: number, C: number, h: number): string {
  for (let step = 0; step <= 40; step++) {
    const c = step === 40 ? 0 : C * (1 - step / 40)
    const a = c * Math.cos(h), b = c * Math.sin(h)
    const l = (L + .3963377774 * a + .2158037573 * b) ** 3
    const m = (L - .1055613458 * a - .0638541728 * b) ** 3
    const s = (L - .0894841775 * a - 1.291485548 * b) ** 3
    const channels = [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.707614701 * s]
    if (channels.every((v) => v >= 0 && v <= 1)) return hex(channels.map(gamma))
  }
  return L < .5 ? '#000000' : '#ffffff'
}
function palette(source: string, theme: Appearance): Palette {
  const [, chroma, hue] = toOKLCH(source)
  const dark = theme === 'dark'
  const C = chroma < .02 ? 0 : Math.max(dark ? .06 : .08, Math.min(chroma, dark ? .16 : .18))
  const wash = inGamut(dark ? .28 : .96, Math.min(C, dark ? .05 : .03), hue)
  const soft = inGamut(dark ? .31 : .93, Math.min(C, dark ? .05 : .03), hue)
  const selected = inGamut(dark ? .30 : .94, Math.min(C, dark ? .05 : .03), hue)
  const surfaces = [...SURFACES[theme], wash, soft, selected]
  const search = (start: number, backgrounds: readonly string[], target: number) => {
    for (let step = 0; step <= 100; step++) {
      const L = dark ? start + (1 - start) * step / 100 : start * (1 - step / 100)
      const result = inGamut(L, C, hue)
      if (backgrounds.every((bg) => contrast(result, bg) >= target)) return result
    }
    return dark ? '#ffffff' : '#000000'
  }
  const accent = search(dark ? .72 : .52, surfaces, 4.5)
  const hover = search(dark ? .80 : .46, surfaces, 4.5)
  const onAccent = ['#ffffff', '#141517'].sort((a, b) => Math.min(contrast(b, accent), contrast(b, hover)) - Math.min(contrast(a, accent), contrast(a, hover)))[0]
  return {
    accent, 'accent-hover': hover, 'accent-fg': search(dark ? .76 : .48, surfaces, 4.5),
    'on-accent': onAccent, 'accent-wash': wash, 'accent-soft': soft, selected,
    'focus-ring': search(dark ? .76 : .48, surfaces, 3),
    // Opaque composited halo: avoids context-dependent alpha contrast.
    'focus-halo': inGamut(dark ? .38 : .87, Math.min(C, .035), hue),
  }
}
export function deriveAccent(input?: string): Accent {
  const source = input && HEX.test(input) ? input.toLowerCase() : DEFAULT_ACCENT
  return { source, light: palette(source, 'light'), dark: palette(source, 'dark') }
}
export function paletteProperties(palette: Palette): Record<string, string> {
  return Object.fromEntries(ACCENT_ROLES.map((role) => [`--hn-${role}`, palette[role]]))
}
