import { describe, expect, it } from 'vitest'
import { layoutOverlaps } from './layout'
import { applyFilters, DEFAULT_FILTERS } from './filters'

/** `layoutOverlaps` wants items sorted by `top`, which is what the views hand it. */
const block = (top, bottom, extra = {}) => ({ top, bottom, ...extra })

describe('layoutOverlaps', () => {
  it('gives a lone event the full width', () => {
    const [a] = layoutOverlaps([block(0, 60)])
    expect(a).toMatchObject({ col: 0, cols: 1 })
  })

  it('splits two overlapping events into two columns', () => {
    const [a, b] = layoutOverlaps([block(0, 60), block(30, 90)])
    expect(a).toMatchObject({ col: 0, cols: 2 })
    expect(b).toMatchObject({ col: 1, cols: 2 })
  })

  it('keeps touching events full width — ending when the next starts is not an overlap', () => {
    const [a, b] = layoutOverlaps([block(0, 60), block(60, 120)])
    expect(a).toMatchObject({ col: 0, cols: 1 })
    expect(b).toMatchObject({ col: 0, cols: 1 })
  })

  it('reuses a column once it is free', () => {
    // C overlaps A but starts after B has finished, so it takes B's column back.
    const [a, b, c] = layoutOverlaps([block(0, 180), block(10, 40), block(50, 90)])
    expect(a.col).toBe(0)
    expect(b.col).toBe(1)
    expect(c.col).toBe(1)
    expect([a.cols, b.cols, c.cols]).toEqual([2, 2, 2])
  })

  it('sizes each cluster independently', () => {
    const items = layoutOverlaps([block(0, 60), block(10, 70), block(200, 260)])
    expect(items.map((i) => i.cols)).toEqual([2, 2, 1])
  })

  it('keeps a chain at two columns, because the ends of it do not overlap', () => {
    // A/B overlap and B/C overlap, but A finishes before C starts, so C takes A's
    // column rather than forcing a third. Same behaviour as Outlook.
    const items = layoutOverlaps([block(0, 50), block(40, 100), block(90, 150)])
    expect(items.map((i) => i.col)).toEqual([0, 1, 0])
    expect(items.map((i) => i.cols)).toEqual([2, 2, 2])
  })

  it('does add a third column when all three genuinely overlap', () => {
    const items = layoutOverlaps([block(0, 100), block(10, 100), block(20, 100)])
    expect(items.map((i) => i.col)).toEqual([0, 1, 2])
    expect(items.map((i) => i.cols)).toEqual([3, 3, 3])
  })
})

describe('filtering happens before layout', () => {
  // This is the architectural claim worth pinning down: filtering in the views instead
  // of before them would leave the survivor at half width with a gap beside it.
  const events = [
    { id: 'a', color: 'azure', top: 0, bottom: 60 },
    { id: 'b', color: 'crimson', top: 30, bottom: 90 },
  ]
  const ctx = { colorField: 'color' }

  it('lays both out side by side when nothing is filtered', () => {
    const laid = layoutOverlaps(applyFilters(events, DEFAULT_FILTERS, {}, ctx).map((e) => ({ ...e })))
    expect(laid.map((i) => i.cols)).toEqual([2, 2])
  })

  it('lets the survivor reclaim the full width when its neighbour is filtered out', () => {
    const visible = applyFilters(events, DEFAULT_FILTERS, { color: ['azure'] }, ctx)
    const laid = layoutOverlaps(visible.map((e) => ({ ...e })))
    expect(laid).toHaveLength(1)
    expect(laid[0]).toMatchObject({ id: 'a', col: 0, cols: 1 })
  })
})
