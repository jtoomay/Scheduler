// Tiny native-Date helpers. No date library on purpose: keeps the bundle small.

export const MINUTE = 60_000
export const DAY = 24 * 60 * MINUTE

export const toDate = (v) => (v instanceof Date ? v : new Date(v))

export function startOfDay(d) {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

export function addDays(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function addMonths(d, n) {
  const r = new Date(d)
  const day = r.getDate()
  r.setDate(1)
  r.setMonth(r.getMonth() + n)
  // Clamp (e.g. Jan 31 + 1 month -> Feb 28/29).
  const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate()
  r.setDate(Math.min(day, last))
  return r
}

export const addMinutes = (d, n) => new Date(toDate(d).getTime() + n * MINUTE)

export function startOfWeek(d, weekStartsOn = 0) {
  const r = startOfDay(d)
  const diff = (r.getDay() - weekStartsOn + 7) % 7
  return addDays(r, -diff)
}

export const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1)

export const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** Local calendar key, e.g. "2026-09-23". */
export function dayKey(d) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/** A date at `minutes` past local midnight of `day` (DST-safe via setHours overflow). */
export function atMinutes(day, minutes) {
  const r = new Date(day)
  r.setHours(0, minutes, 0, 0)
  return r
}

const pad = (n) => String(n).padStart(2, '0')

/** Date -> value for <input type="datetime-local">. */
export function toInputValue(d) {
  if (!d) return ''
  d = toDate(d)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Value from <input type="datetime-local"> -> Date (parsed as local time). */
export const fromInputValue = (s) => (s ? new Date(s) : null)

// Intl formatters are expensive to construct; cache them.
const fmtCache = new Map()
function formatter(options, locale) {
  const key = `${locale ?? ''}|${JSON.stringify(options)}`
  let f = fmtCache.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options)
    fmtCache.set(key, f)
  }
  return f
}

export const format = (date, options, locale) => formatter(options, locale).format(date)

export function formatDateRange(a, b, options, locale) {
  const f = formatter(options, locale)
  return f.formatRange ? f.formatRange(a, b) : `${f.format(a)} – ${f.format(b)}`
}

const TIME = { hour: 'numeric', minute: '2-digit' }
export const formatTime = (d, locale) => format(d, TIME, locale)
export const formatTimeRange = (a, b, locale) => `${formatTime(a, locale)} – ${formatTime(b, locale)}`
