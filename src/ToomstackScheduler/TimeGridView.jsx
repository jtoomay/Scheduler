import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { addDays, addMinutes, atMinutes, dayKey, format, formatTime, formatTimeRange, sameDay } from './dateUtils'
import { layoutOverlaps, useDayBuckets } from './layout'
import { eventColorVars } from './palette'

const DAY_HEADER = { weekday: 'short', month: 'numeric', day: 'numeric' }
const DRAG_THRESHOLD_PX = 4
const MIN_EVENT_PX = 18

/**
 * Pixel height the time rows can occupy. The scrollport (`.tss-timegrid`) fills
 * `.tss-viewport`, the band between the toolbar and the footer — that is what gets
 * measured, not the page. 0 before the panel has a layout.
 */
function readGridSpace(scroll) {
  const viewport = scroll.closest('.tss-viewport') ?? scroll
  const headerH = scroll.querySelector('.tss-tg-head')?.offsetHeight ?? 0
  // clientHeight already excludes a horizontal scrollbar. It is 0 before layout,
  // in which case the viewport (same box, once flexed) is the fallback.
  const basis = scroll.clientHeight > 0 ? scroll.clientHeight : viewport.clientHeight
  if (!Number.isFinite(basis)) return 0
  return Math.max(0, basis - headerH)
}

/** `slotHeight` is the floor. A taller panel stretches; a shorter one keeps the floor. */
function timeGridMetrics(rangeMinutes, slotMinutes, slotHeight, availablePx) {
  const minPxPerMin = slotHeight / slotMinutes
  const minBody = (rangeMinutes / slotMinutes) * slotHeight
  const stretched = rangeMinutes > 0 && availablePx > minBody
  const bodyHeight = stretched ? availablePx : minBody
  const pxPerMin = rangeMinutes > 0 ? bodyHeight / rangeMinutes : minPxPerMin
  return { bodyHeight, pxPerMin, slotPx: pxPerMin * slotMinutes }
}

/**
 * Day / Week / Work Week view.
 *
 * Performance notes:
 * - Slot lines are CSS gradients, not DOM cells; the clicked slot is computed from the pointer position.
 * - All interaction is delegated to the body element, so day columns take no handler props and stay memoized.
 * - Drag/resize mutate the dragged element's style inside requestAnimationFrame; React state is only
 *   touched once, on pointer-up.
 */
export default function TimeGridView({
  days,
  events,
  rangeStartMin,
  rangeEndMin,
  businessStartMin,
  businessEndMin,
  showFullDay,
  slotMinutes,
  slotHeight,
  snapMinutes,
  titleField,
  colorField,
  locale,
  actions,
}) {
  const scrollRef = useRef(null)
  const bodyRef = useRef(null)
  // Space the rows can fill. 0 until measured, which keeps the minimum slot height.
  const [availablePx, setAvailablePx] = useState(0)
  const rangeMinutes = rangeEndMin - rangeStartMin
  const { bodyHeight, pxPerMin, slotPx } = timeGridMetrics(rangeMinutes, slotMinutes, slotHeight, availablePx)
  const buckets = useDayBuckets(days, events)
  const today = useToday()

  // Latest values for the delegated handlers (avoids re-binding and keeps columns memoized).
  const live = useRef(null)
  useLayoutEffect(() => {
    live.current = { rangeStartMin, pxPerMin, slotMinutes, snapMinutes, locale, actions }
  })

  // Stretch or shrink back to the floor when the panel, the view, or the visible
  // hours change. ResizeObserver covers the container between those.
  useLayoutEffect(() => {
    const scroll = scrollRef.current
    if (!scroll) return undefined
    const viewport = scroll.closest('.tss-viewport') ?? scroll

    const measure = () => {
      const next = readGridSpace(scroll)
      setAvailablePx((prev) => (Math.abs(prev - next) < 0.5 ? prev : next))
    }

    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    // content-box, so a scrollbar appearing or disappearing is a resize too.
    observer.observe(scroll, { box: 'content-box' })
    const header = scroll.querySelector('.tss-tg-head')
    if (header) observer.observe(header)
    return () => observer.disconnect()
  }, [days, showFullDay, rangeStartMin, rangeEndMin])

  // In full-day mode, open scrolled to the start of business hours.
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, (businessStartMin - rangeStartMin) * pxPerMin - 8)
  }, [showFullDay, businessStartMin, rangeStartMin, pxPerMin])

  const hours = useMemo(() => {
    const out = []
    for (let m = Math.ceil(rangeStartMin / 60) * 60; m < rangeEndMin; m += 60) out.push(m)
    return out
  }, [rangeStartMin, rangeEndMin])

  const bodyStyle = {
    height: bodyHeight,
    '--tss-slot-h': `${slotPx}px`,
    '--tss-hour-h': `${60 * pxPerMin}px`,
    '--tss-biz-top': showFullDay ? `${(businessStartMin - rangeStartMin) * pxPerMin}px` : '0px',
    '--tss-biz-bottom': showFullDay ? `${(businessEndMin - rangeStartMin) * pxPerMin}px` : '100%',
  }

  function onDoubleClick(e) {
    const { actions, rangeStartMin, pxPerMin, slotMinutes } = live.current
    if (e.target.closest('.tss-event-delete')) return
    const evEl = e.target.closest('.tss-event')
    if (evEl) return actions.edit(evEl.dataset.id)
    const col = e.target.closest('.tss-tg-col')
    if (!col) return
    const y = e.clientY - col.getBoundingClientRect().top
    const slot = Math.floor(y / (slotMinutes * pxPerMin))
    const start = atMinutes(Number(col.dataset.dayMs), rangeStartMin + slot * slotMinutes)
    actions.create(start, addMinutes(start, slotMinutes))
  }

  function onClick(e) {
    const del = e.target.closest('.tss-event-delete')
    if (del) live.current.actions.remove(del.closest('.tss-event').dataset.id)
  }

  function onKeyDown(e) {
    const evEl = e.target.closest?.('.tss-event')
    if (!evEl || e.target !== evEl) return
    if (e.key === 'Enter') live.current.actions.edit(evEl.dataset.id)
    else if (e.key === 'Delete' || e.key === 'Backspace') live.current.actions.remove(evEl.dataset.id)
  }

  function onPointerDown(e) {
    if (e.button !== 0 || e.target.closest('.tss-event-delete')) return
    const el = e.target.closest('.tss-event')
    if (!el || !live.current.actions.editable) return
    beginDrag(e, el, !!e.target.closest('.tss-resize'), bodyRef.current, live.current)
  }

  return (
    <div className="tss-timegrid" ref={scrollRef} style={{ '--tss-cols': days.length }}>
      <div className="tss-tg-head">
        <div className="tss-tg-corner" />
        {days.map((d) => (
          <div key={d.getTime()} className={'tss-tg-dayhead' + (sameDay(d, today) ? ' tss-is-today' : '')}>
            {format(d, DAY_HEADER, locale)}
          </div>
        ))}
      </div>
      <div
        className="tss-tg-body"
        ref={bodyRef}
        style={bodyStyle}
        onDoubleClick={onDoubleClick}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
      >
        <div className="tss-tg-gutter">
          {hours.map((m) => (
            <div key={m} className="tss-tg-hour" style={{ top: (m - rangeStartMin) * pxPerMin }}>
              {formatTime(atMinutes(days[0] ?? new Date(), m), locale).replace(':00', '')}
            </div>
          ))}
        </div>
        {days.map((d, i) => (
          <DayColumn
            key={d.getTime()}
            dayMs={d.getTime()}
            dayIndex={i}
            items={buckets.get(dayKey(d))}
            isToday={sameDay(d, today)}
            rangeStartMin={rangeStartMin}
            rangeEndMin={rangeEndMin}
            pxPerMin={pxPerMin}
            titleField={titleField}
            colorField={colorField}
            locale={locale}
          />
        ))}
      </div>
    </div>
  )
}

const DayColumn = memo(function DayColumn({
  dayMs,
  dayIndex,
  items,
  isToday,
  rangeStartMin,
  rangeEndMin,
  pxPerMin,
  titleField,
  colorField,
  locale,
}) {
  const segments = useMemo(() => {
    const visStart = atMinutes(dayMs, rangeStartMin)
    const visEnd = atMinutes(dayMs, rangeEndMin)
    const segs = []
    for (const ev of items) {
      const s = ev.start > visStart ? ev.start : visStart
      const e = ev.end < visEnd ? ev.end : visEnd
      if (e < s || (e.getTime() === s.getTime() && ev.end > ev.start)) continue // outside visible hours
      const top = ((s - visStart) / 60_000) * pxPerMin
      const bottom = Math.max(((e - visStart) / 60_000) * pxPerMin, top + MIN_EVENT_PX)
      segs.push({ ev, top, bottom, clippedEnd: ev.end > visEnd })
    }
    return layoutOverlaps(segs)
  }, [items, dayMs, rangeStartMin, rangeEndMin, pxPerMin])

  return (
    <div className={'tss-tg-col' + (isToday ? ' tss-is-today' : '')} data-day-ms={dayMs} data-day-index={dayIndex}>
      {segments.map(({ ev, top, bottom, col, cols, clippedEnd }) => {
        const title = ev[titleField] || '(No title)'
        const time = formatTimeRange(ev.start, ev.end, locale)
        return (
          <div
            key={ev.id}
            className="tss-event"
            data-id={ev.id}
            tabIndex={0}
            title={`${title}\n${time}`}
            style={{
              top,
              height: bottom - top,
              left: `calc(${(col / cols) * 100}% + 1px)`,
              width: `calc(${100 / cols}% - 4px)`,
              ...eventColorVars(ev[colorField]),
            }}
          >
            <div className="tss-event-title">{title}</div>
            <div className="tss-event-time">{time}</div>
            <div className="tss-event-drag-time" />
            <button type="button" className="tss-event-delete" aria-label="Delete event" tabIndex={-1}>
              ×
            </button>
            {!clippedEnd && <div className="tss-resize" />}
          </div>
        )
      })}
      {isToday && <NowMarker dayMs={dayMs} rangeStartMin={rangeStartMin} rangeEndMin={rangeEndMin} pxPerMin={pxPerMin} />}
    </div>
  )
})

/** Re-renders only itself once a minute. */
function NowMarker({ dayMs, rangeStartMin, rangeEndMin, pxPerMin }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  const minutes = (now - atMinutes(dayMs, 0)) / 60_000
  if (minutes < rangeStartMin || minutes > rangeEndMin) return null
  return <div className="tss-now" style={{ top: (minutes - rangeStartMin) * pxPerMin }} />
}

/** Today's date, refreshed when the day rolls over. */
function useToday() {
  const [today, setToday] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date()
      setToday((t) => (sameDay(t, d) ? t : d))
    }, 60_000)
    return () => clearInterval(id)
  }, [])
  return today
}

/** Imperative drag (move) / resize of one event element. Commits once on pointer-up. */
function beginDrag(e, el, resize, body, { pxPerMin, snapMinutes, locale, actions }) {
  const ev = actions.get(el.dataset.id)
  if (!ev) return
  const cols = [...body.querySelectorAll('.tss-tg-col')]
  const colIndex = cols.indexOf(el.parentElement)
  const colWidth = el.parentElement.getBoundingClientRect().width
  const x0 = e.clientX
  const y0 = e.clientY
  const origHeight = el.style.height
  const dragTime = el.querySelector('.tss-event-drag-time')
  let moved = false
  let frame = 0
  let dMin = 0
  let dCol = 0

  const result = () => {
    if (resize) {
      const end = addMinutes(ev.end, dMin)
      return { start: ev.start, end: end - ev.start < snapMinutes * 60_000 ? addMinutes(ev.start, snapMinutes) : end }
    }
    const dayDelta = Math.round((Number(cols[colIndex + dCol].dataset.dayMs) - Number(cols[colIndex].dataset.dayMs)) / 86_400_000)
    return { start: addMinutes(addDays(ev.start, dayDelta), dMin), end: addMinutes(addDays(ev.end, dayDelta), dMin) }
  }

  const paint = () => {
    frame = 0
    if (resize) el.style.height = `${Math.max(parseFloat(origHeight) + dMin * pxPerMin, snapMinutes * pxPerMin)}px`
    else el.style.transform = `translate(${dCol * colWidth}px, ${dMin * pxPerMin}px)`
    const r = result()
    dragTime.textContent = formatTimeRange(r.start, r.end, locale)
  }

  const onMove = (me) => {
    const dx = me.clientX - x0
    const dy = me.clientY - y0
    if (!moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
      moved = true
      el.classList.add('tss-dragging')
    }
    dMin = Math.round(dy / pxPerMin / snapMinutes) * snapMinutes
    if (!resize) dCol = Math.min(Math.max(Math.round(dx / colWidth), -colIndex), cols.length - 1 - colIndex)
    if (!frame) frame = requestAnimationFrame(paint)
  }

  const onEnd = (ue) => {
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerup', onEnd)
    el.removeEventListener('pointercancel', onEnd)
    cancelAnimationFrame(frame)
    if (!el.isConnected) return // unmounted mid-drag (e.g. filtered out)
    // Restore exactly what React rendered; the commit below re-renders with the new position.
    el.style.transform = ''
    el.style.height = origHeight
    el.classList.remove('tss-dragging')
    dragTime.textContent = ''
    if (!moved || ue.type === 'pointercancel') return
    const { start, end } = result()
    if (start.getTime() !== ev.start.getTime() || end.getTime() !== ev.end.getTime()) {
      actions.update({ ...ev, start, end })
    }
  }

  el.setPointerCapture(e.pointerId)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onEnd)
  el.addEventListener('pointercancel', onEnd)
}
