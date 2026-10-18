/**
 * Filtering.
 *
 * A filter is a plain object with four members:
 *
 *   {
 *     id,                        // key into the filter state
 *     label,                     // what the toolbar button says
 *     options(ctx),              // the values on offer, as [{ value, label }]
 *     test(event, selected, ctx) // true to keep the event
 *   }
 *
 * `applyFilters` runs every filter that has a selection and keeps the events passing
 * all of them. Adding a kind of filter means adding one of these objects and passing it
 * in `filters` — nothing in ToomstackScheduler changes. `makeFieldFilter` is both a
 * useful helper and the demonstration that the shape generalises past colour.
 *
 * State shape: { [filterId]: string[] }. An empty or missing selection means that
 * filter is off, so no selection shows everything rather than nothing.
 */
import { PALETTE, PALETTE_NAMES } from './palette'

/** Events with no colour group under this value, so they stay selectable. */
export const NO_COLOR = '__none'

const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1)

/** Palette order first for the colours actually in use, then custom values, then bare. */
function colorOptions({ events, colorField }) {
  const used = new Set()
  let hasBare = false
  for (const ev of events) {
    const v = ev[colorField]
    if (v == null || v === '') hasBare = true
    else used.add(String(v))
  }

  const options = []
  for (const name of PALETTE_NAMES) {
    if (used.has(name)) options.push({ value: name, label: titleCase(name) })
  }
  for (const v of [...used].sort()) {
    if (!PALETTE[v]) options.push({ value: v, label: v })
  }
  if (hasBare) options.push({ value: NO_COLOR, label: 'No colour' })
  return options
}

export const colorFilter = Object.freeze({
  id: 'color',
  label: 'Colour',
  options: colorOptions,
  test(event, selected, { colorField }) {
    const v = event[colorField]
    return selected.includes(v == null || v === '' ? NO_COLOR : String(v))
  },
})

export const DEFAULT_FILTERS = Object.freeze([colorFilter])

/**
 * A filter over any event property. `format` renames values for display without
 * changing what is stored.
 *
 *   makeFieldFilter({ id: 'status', label: 'Status', field: 'status' })
 */
export function makeFieldFilter({ id, label, field, format }) {
  return Object.freeze({
    id,
    label,
    options({ events }) {
      const used = new Set()
      let hasBare = false
      for (const ev of events) {
        const v = ev[field]
        if (v == null || v === '') hasBare = true
        else used.add(String(v))
      }
      const options = [...used]
        .sort()
        .map((v) => ({ value: v, label: format ? format(v) : v }))
      if (hasBare) options.push({ value: NO_COLOR, label: `No ${String(label).toLowerCase()}` })
      return options
    },
    test(event, selected) {
      const v = event[field]
      return selected.includes(v == null || v === '' ? NO_COLOR : String(v))
    },
  })
}

/** True when any filter has something selected. */
export function hasActiveFilters(filters, state) {
  if (!filters?.length || !state) return false
  return filters.some((f) => state[f.id]?.length > 0)
}

/**
 * Keep the events passing every filter that has a selection. Returns the input array
 * untouched when nothing is selected, so the common case allocates nothing and the
 * downstream day-bucket cache keeps its identities.
 */
export function applyFilters(events, filters, state, ctx) {
  if (!filters?.length || !state) return events
  const active = filters.filter((f) => state[f.id]?.length > 0)
  if (!active.length) return events
  return events.filter((ev) => active.every((f) => f.test(ev, state[f.id], ctx)))
}
