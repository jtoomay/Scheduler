/**
 * Event colours. Seven named colours, each carrying a fill and a label ink for both
 * themes, plus a resolver that makes an arbitrary host colour safe in either theme.
 *
 * Every value here was measured, not estimated. Two rules hold for all of them:
 *   - the fill clears 4.5:1 against its own ink, so the label is readable;
 *   - the dark fill clears 3:1 against the dark grid surface, so a filled block still
 *     reads as a block instead of dissolving into the grid.
 *
 * Those two rules pull against each other, which is why the dark fills are listed
 * per colour rather than derived by one formula: lightening a fill enough to separate
 * it from a dark surface drops its label contrast through 4.5 first. Three of the seven
 * need no change at all; the rest are lifted as little as possible to keep their hue.
 *
 * `gold` is the one ink exception. No gold dark enough for white text still reads as
 * gold — it turns to bronze — so it keeps its brightness and takes dark ink.
 */

const WHITE = '#ffffff'

/** Label ink for fills too light for white text. */
const DARK_INK = '#231a07'

/** Must track `--tss-bg` in the dark theme block of scheduler.css. */
const DARK_SURFACE = '#16181d'

/** A filled block needs this much against the surface behind it to read as a block. */
const FILL_VS_SURFACE = 3

/** WCAG AA for the ~13px label text on an event. */
const INK_VS_FILL = 4.5

export const PALETTE = Object.freeze({
  indigo: { bg: '#543eae', ink: WHITE, bgDark: '#685bbb', inkDark: WHITE },
  azure: { bg: '#1c73b6', ink: WHITE, bgDark: '#1c73b6', inkDark: WHITE },
  moss: { bg: '#217300', ink: WHITE, bgDark: '#2c7916', inkDark: WHITE },
  gold: { bg: '#e7b935', ink: DARK_INK, bgDark: '#e7b935', inkDark: DARK_INK },
  crimson: { bg: '#c43029', ink: WHITE, bgDark: '#c43029', inkDark: WHITE },
  orchid: { bg: '#964182', ink: WHITE, bgDark: '#9d4d89', inkDark: WHITE },
  graphite: { bg: '#4b4f5d', ink: WHITE, bgDark: '#656975', inkDark: WHITE },
})

export const PALETTE_NAMES = Object.freeze(Object.keys(PALETTE))

/* ---------- colour maths (no dependencies, on purpose) ---------- */

const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

/** `#abc` or `#aabbcc` to [r, g, b]. Returns null for anything else. */
function parseHex(value) {
  let h = String(value).trim().replace(/^#/, '')
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  if (h.length !== 6 || /[^\da-f]/i.test(h)) return null
  const n = Number.parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const toHex = (rgb) => '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('')

const luminance = ([r, g, b]) =>
  0.2126 * toLinear(r / 255) + 0.7152 * toLinear(g / 255) + 0.0722 * toLinear(b / 255)

function contrast(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

// OKLab, so lightening a colour keeps its hue instead of drifting.
function toOklab([r, g, b]) {
  const R = toLinear(r / 255)
  const G = toLinear(g / 255)
  const B = toLinear(b / 255)
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

function fromOklab([L, A, B]) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => Math.round(Math.min(1, Math.max(0, toGamma(c))) * 255))
}

const WHITE_RGB = [255, 255, 255]
const DARK_INK_RGB = parseHex(DARK_INK)
const DARK_SURFACE_RGB = parseHex(DARK_SURFACE)

/** Whichever ink reads better on this fill. */
const bestInk = (rgb) =>
  contrast(rgb, WHITE_RGB) >= contrast(rgb, DARK_INK_RGB) ? WHITE : DARK_INK

/**
 * Lift a fill toward white in OKLab until it separates from the dark surface, taking
 * the smallest step that works so the colour keeps its identity. Gives up rather than
 * washing a colour out past the point where any ink would be readable on it.
 */
function liftForDark(rgb) {
  if (contrast(rgb, DARK_SURFACE_RGB) >= FILL_VS_SURFACE) return rgb
  const from = toOklab(rgb)
  const white = toOklab(WHITE_RGB)
  for (let keep = 0.98; keep >= 0.4; keep -= 0.02) {
    const next = fromOklab(from.map((v, i) => v * keep + white[i] * (1 - keep)))
    if (
      contrast(next, DARK_SURFACE_RGB) >= FILL_VS_SURFACE &&
      Math.max(contrast(next, WHITE_RGB), contrast(next, DARK_INK_RGB)) >= INK_VS_FILL
    ) {
      return next
    }
  }
  return rgb
}

// Arbitrary colours are resolved once and remembered; named ones never hit the maths.
const cache = new Map()

/**
 * A palette name or any CSS colour to `{ bg, ink, bgDark, inkDark }`, or null when the
 * event has no colour (the caller then falls back to the global --tss-event-* tokens).
 *
 * Hex values get the full treatment. Other CSS colours (keywords, `rgb()`, `var()`)
 * can't be measured here, so they render as given with white ink and are left alone in
 * dark mode — pass a hex if you want the contrast handling.
 */
export function resolveEventColor(value) {
  if (value == null || value === '') return null

  const named = PALETTE[value]
  if (named) return named

  const key = String(value)
  const hit = cache.get(key)
  if (hit) return hit

  const rgb = parseHex(key)
  let resolved
  if (rgb) {
    const lifted = liftForDark(rgb)
    resolved = {
      bg: toHex(rgb),
      ink: bestInk(rgb),
      bgDark: toHex(lifted),
      inkDark: bestInk(lifted),
    }
  } else {
    resolved = { bg: key, ink: WHITE, bgDark: key, inkDark: WHITE }
  }

  cache.set(key, resolved)
  return resolved
}

/**
 * The four inline custom properties an event element needs. CSS picks between the light
 * and dark pair, so a theme change repaints without React re-rendering the grid.
 */
export function eventColorVars(value) {
  const c = resolveEventColor(value)
  if (!c) return null
  return {
    '--tss-ev-bg': c.bg,
    '--tss-ev-ink': c.ink,
    '--tss-ev-bg-d': c.bgDark,
    '--tss-ev-ink-d': c.inkDark,
  }
}
