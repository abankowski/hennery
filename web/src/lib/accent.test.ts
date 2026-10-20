import { describe, expect, it } from 'vitest'
import { ACCENT_ROLES, HEX, SURFACES, contrast, deriveAccent, toOKLCH } from './accent'

const hostile = ['#ffffff', '#000000', '#fffffe', '#000001', '#ffff00', '#0000ff', '#ff0000', '#00ff00', '#00ffff', '#ff00ff']
const grid = [0, 51, 102, 153, 204, 255]
for (const r of grid) for (const g of grid) for (const b of grid) hostile.push('#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join(''))
describe('hat palettes', () => {
  it.each(hostile)('%s meets rounded text, button, boundary and focus contrast in both themes', (source) => {
    const derived = deriveAccent(source)
    expect(derived).toEqual(deriveAccent(source))
    for (const theme of ['light', 'dark'] as const) {
      const p = derived[theme]
      for (const key of ACCENT_ROLES) expect(p[key]).toMatch(HEX)
      for (const bg of [...SURFACES[theme], p['accent-wash'], p['accent-soft'], p.selected]) {
        for (const fg of [p.accent, p['accent-hover'], p['accent-fg']]) expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5)
        expect(contrast(p['focus-ring'], bg)).toBeGreaterThanOrEqual(3)
      }
      for (const button of [p.accent, p['accent-hover']]) expect(contrast(p['on-accent'], button)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(p['focus-ring'], p['focus-halo'])).toBeGreaterThanOrEqual(3)
    }
  })
  it('validates source bytes and keeps near-achromatic inputs neutral', () => {
    for (const bad of [undefined, '', 'red', '#abc', '#12345g', '#1234567', 'url(x)', '#112233;color:red']) expect(deriveAccent(bad)).toEqual(deriveAccent('#64748b'))
    expect(deriveAccent('#FF00FF')).toEqual(deriveAccent('#ff00ff'))
    for (const source of ['#ffffff', '#000000', '#808080', '#fefefd']) for (const p of [deriveAccent(source).light, deriveAccent(source).dark]) expect(toOKLCH(p.accent)[1]).toBeLessThan(.02)
  })
})
