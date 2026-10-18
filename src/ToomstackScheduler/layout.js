import { useMemo } from 'react'
import { addDays, dayKey, startOfDay } from './dateUtils'

const EMPTY = Object.freeze([])

/**
 * Side-by-side layout for overlapping items (like Telerik / Outlook).
 * `items` must be sorted by `top`. Each gets `col` (0-based) and `cols` (columns in its cluster).
 */
export function layoutOverlaps(items) {
  let cluster = []
  let columns = [] // bottom edge of the last item in each column
  let clusterBottom = -Infinity

  const flush = () => {
    for (const it of cluster) it.cols = columns.length
    cluster = []
    columns = []
  }

  for (const it of items) {
    if (it.top >= clusterBottom) {
      flush()
      clusterBottom = -Infinity
    }
    let col = columns.findIndex((bottom) => bottom <= it.top)
    if (col === -1) {
      col = columns.length
      columns.push(it.bottom)
    } else {
      columns[col] = it.bottom
    }
    it.col = col
    cluster.push(it)
    clusterBottom = Math.max(clusterBottom, it.bottom)
  }
  flush()
  return items
}

const byStart = (a, b) => a.start - b.start || b.end - a.end

/**
 * Buckets events into the visible days. Returns Map<dayKey, event[]>.
 * Arrays whose contents did not change keep their identity between renders,
 * so memoized day columns/cells skip re-rendering when other days change.
 */
export function useDayBuckets(days, events) {
  // Mutable memo cache (not render state): previous buckets, for identity reuse.
  const cache = useMemo(() => ({ prev: new Map() }), [])

  return useMemo(() => {
    const next = new Map()
    for (const d of days) next.set(dayKey(d), [])
    if (days.length) {
      const first = days[0]
      const afterLast = addDays(days[days.length - 1], 1)
      for (const ev of events) {
        if (ev.end <= first || ev.start >= afterLast) continue
        let d = startOfDay(ev.start < first ? first : ev.start)
        do {
          next.get(dayKey(d))?.push(ev)
          d = addDays(d, 1)
        } while (d < ev.end && d < afterLast)
      }
    }

    const prev = cache.prev
    for (const [key, list] of next) {
      list.sort(byStart)
      const old = prev.get(key)
      if (list.length === 0) next.set(key, EMPTY)
      else if (old && old.length === list.length && old.every((e, i) => e === list[i])) next.set(key, old)
    }
    // Intentional: a render-independent cache used only for array identity reuse.
    // oxlint-disable-next-line react/immutability
    cache.prev = next
    return next
  }, [cache, days, events])
}
