import { describe, expect, it } from 'vitest'
import { PALETTE, PALETTE_NAMES, eventColorVars, resolveEventColor } from './palette'

/** Must track DARK_SURFACE in palette.js and --tss-bg in the dark theme block. */
const DARK_SURFACE = '#16181d'

const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

function rgb(hex) {
  const n = Number.parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function luminance(hex) {
  const [r, g, b] = rgb(hex)
  return 0.2126 * toLinear(r / 255) + 0.7152 * toLinear(g / 255) + 0.0722 * toLinear(b / 255)
}

// Recomputed here rather than imported, so the test is an independent check of the
// numbers in palette.js instead of a restatement of its own maths.
function contrast(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

describe('palette', () => {
  it('has seven colours, frozen', () => {
    expect(PALETTE_NAMES).toHaveLength(7)
    expect(Object.isFrozen(PALETTE)).toBe(true)
    expect(PALETTE_NAMES).toEqual(['indigo', 'azure', 'moss', 'gold', 'crimson', 'orchid', 'graphite'])
  })

  it.each(PALETTE_NAMES)('%s label clears 4.5:1 on its light fill', (name) => {
    const { bg, ink } = PALETTE[name]
    expect(contrast(bg, ink)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(PALETTE_NAMES)('%s label clears 4.5:1 on its dark fill', (name) => {
    const { bgDark, inkDark } = PALETTE[name]
    expect(contrast(bgDark, inkDark)).toBeGreaterThanOrEqual(4.5)
  })

  // The bug this catches is real: four of seven fills fail at the light value, so a
  // filled block would dissolve into the dark grid.
  it.each(PALETTE_NAMES)('%s dark fill clears 3:1 against the dark grid', (name) => {
    expect(contrast(PALETTE[name].bgDark, DARK_SURFACE)).toBeGreaterThanOrEqual(3)
  })

  it('leaves the light fills alone where they already separate on dark', () => {
    for (const name of ['azure', 'gold', 'crimson']) {
      expect(PALETTE[name].bgDark).toBe(PALETTE[name].bg)
    }
  })
})

describe('resolveEventColor', () => {
  it('returns null for no colour, so the caller falls back to the global tokens', () => {
    expect(resolveEventColor(null)).toBeNull()
    expect(resolveEventColor(undefined)).toBeNull()
    expect(resolveEventColor('')).toBeNull()
  })

  it('returns the palette entry itself for a name', () => {
    expect(resolveEventColor('azure')).toBe(PALETTE.azure)
  })

  it('handles an arbitrary hex in both themes', () => {
    const c = resolveEventColor('#00808a')
    expect(c.bg).toBe('#00808a')
    expect(contrast(c.bg, c.ink)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(c.bgDark, DARK_SURFACE)).toBeGreaterThanOrEqual(3)
    expect(contrast(c.bgDark, c.inkDark)).toBeGreaterThanOrEqual(4.5)
  })

  it('expands three-digit hex', () => {
    expect(resolveEventColor('#08a').bg).toBe('#0088aa')
  })

  it('lifts a very dark hex so it separates from the dark grid', () => {
    const c = resolveEventColor('#101216')
    expect(contrast(c.bg, DARK_SURFACE)).toBeLessThan(3)
    expect(contrast(c.bgDark, DARK_SURFACE)).toBeGreaterThanOrEqual(3)
  })

  it('picks dark ink for a pale fill and white for a deep one', () => {
    expect(resolveEventColor('#ffe9a8').ink).toBe('#231a07')
    expect(resolveEventColor('#2b1b55').ink).toBe('#ffffff')
  })

  it('passes a non-hex CSS colour through as given', () => {
    const c = resolveEventColor('rebeccapurple')
    expect(c.bg).toBe('rebeccapurple')
    expect(c.bgDark).toBe('rebeccapurple')
  })

  it('caches, so the same value resolves to the same object', () => {
    expect(resolveEventColor('#123456')).toBe(resolveEventColor('#123456'))
  })
})

describe('eventColorVars', () => {
  it('returns null with no colour, because style={null} is what React wants', () => {
    expect(eventColorVars(undefined)).toBeNull()
  })

  it('emits all four custom properties, so CSS can switch theme without a re-render', () => {
    expect(eventColorVars('moss')).toEqual({
      '--tss-ev-bg': PALETTE.moss.bg,
      '--tss-ev-ink': PALETTE.moss.ink,
      '--tss-ev-bg-d': PALETTE.moss.bgDark,
      '--tss-ev-ink-d': PALETTE.moss.inkDark,
    })
  })
})
