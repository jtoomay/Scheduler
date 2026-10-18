import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILTERS,
  NO_COLOR,
  applyFilters,
  colorFilter,
  hasActiveFilters,
  makeFieldFilter,
} from './filters'

const ctx = { colorField: 'color' }
const events = [
  { id: 1, color: 'azure', status: 'booked' },
  { id: 2, color: 'crimson', status: 'booked' },
  { id: 3, color: '#00808a', status: 'held' },
  { id: 4, status: 'held' },
  { id: 5, color: '', status: undefined },
]

describe('applyFilters', () => {
  it('ships the colour filter by default', () => {
    expect(DEFAULT_FILTERS).toEqual([colorFilter])
  })

  // Not just a shortcut: returning the same array keeps useDayBuckets' identity cache,
  // so the common unfiltered case allocates nothing downstream.
  it('returns the input array untouched when nothing is selected', () => {
    expect(applyFilters(events, DEFAULT_FILTERS, {}, ctx)).toBe(events)
    expect(applyFilters(events, DEFAULT_FILTERS, { color: [] }, ctx)).toBe(events)
    expect(applyFilters(events, DEFAULT_FILTERS, undefined, ctx)).toBe(events)
    expect(applyFilters(events, [], { color: ['azure'] }, ctx)).toBe(events)
  })

  it('keeps only the selected colours', () => {
    const kept = applyFilters(events, DEFAULT_FILTERS, { color: ['azure', 'crimson'] }, ctx)
    expect(kept.map((e) => e.id)).toEqual([1, 2])
  })

  it('treats null and empty string as one "no colour" group', () => {
    const kept = applyFilters(events, DEFAULT_FILTERS, { color: [NO_COLOR] }, ctx)
    expect(kept.map((e) => e.id)).toEqual([4, 5])
  })

  it('filters on an arbitrary hex as readily as a palette name', () => {
    const kept = applyFilters(events, DEFAULT_FILTERS, { color: ['#00808a'] }, ctx)
    expect(kept.map((e) => e.id)).toEqual([3])
  })

  it('can hide everything, which is what the empty state is for', () => {
    expect(applyFilters(events, DEFAULT_FILTERS, { color: ['gold'] }, ctx)).toEqual([])
  })

  it('ANDs across filters and ORs within one', () => {
    const status = makeFieldFilter({ id: 'status', label: 'Status', field: 'status' })
    const filters = [colorFilter, status]
    const kept = applyFilters(
      events,
      filters,
      { color: ['azure', 'crimson', '#00808a'], status: ['held'] },
      ctx,
    )
    expect(kept.map((e) => e.id)).toEqual([3])
  })

  it('respects colorField, so the colour can live on another property', () => {
    const custom = [{ id: 9, hue: 'gold' }]
    const kept = applyFilters(custom, DEFAULT_FILTERS, { color: ['gold'] }, { colorField: 'hue' })
    expect(kept.map((e) => e.id)).toEqual([9])
  })
})

describe('colorFilter.options', () => {
  it('lists palette colours in palette order, then custom values, then "no colour"', () => {
    expect(colorFilter.options({ events, colorField: 'color' })).toEqual([
      { value: 'azure', label: 'Azure' },
      { value: 'crimson', label: 'Crimson' },
      { value: '#00808a', label: '#00808a' },
      { value: NO_COLOR, label: 'No colour' },
    ])
  })

  it('offers only the colours actually in use', () => {
    const options = colorFilter.options({ events: [{ id: 1, color: 'gold' }], colorField: 'color' })
    expect(options).toEqual([{ value: 'gold', label: 'Gold' }])
  })
})

describe('makeFieldFilter', () => {
  const status = makeFieldFilter({ id: 'status', label: 'Status', field: 'status' })

  it('produces a filter with the documented shape', () => {
    expect(status.id).toBe('status')
    expect(status.label).toBe('Status')
    expect(typeof status.options).toBe('function')
    expect(typeof status.test).toBe('function')
    expect(Object.isFrozen(status)).toBe(true)
  })

  it('derives its options from the events, with a labelled bare group', () => {
    expect(status.options({ events })).toEqual([
      { value: 'booked', label: 'booked' },
      { value: 'held', label: 'held' },
      { value: NO_COLOR, label: 'No status' },
    ])
  })

  it('formats labels without changing what is stored', () => {
    const pretty = makeFieldFilter({
      id: 'status',
      label: 'Status',
      field: 'status',
      format: (v) => v.toUpperCase(),
    })
    expect(pretty.options({ events })[0]).toEqual({ value: 'booked', label: 'BOOKED' })
  })
})

describe('hasActiveFilters', () => {
  it('is false unless something is selected', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS, {})).toBe(false)
    expect(hasActiveFilters(DEFAULT_FILTERS, { color: [] })).toBe(false)
    expect(hasActiveFilters([], { color: ['azure'] })).toBe(false)
    expect(hasActiveFilters(DEFAULT_FILTERS, undefined)).toBe(false)
    expect(hasActiveFilters(DEFAULT_FILTERS, { color: ['azure'] })).toBe(true)
  })
})
