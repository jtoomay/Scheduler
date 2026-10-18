import { memo, useLayoutEffect, useRef } from 'react'
import { addMinutes, atMinutes, dayKey, format, formatTime, sameDay } from './dateUtils'
import { useDayBuckets } from './layout'
import { eventColorVars } from './palette'

const WEEKDAY = { weekday: 'short' }

/** Month view: 6 x 7 grid. Interaction is delegated so cells stay memoized. */
export default function MonthView({ days, month, events, maxPerCell, businessStartMin, titleField, colorField, locale, actions }) {
  const buckets = useDayBuckets(days, events)
  const live = useRef(null)
  useLayoutEffect(() => {
    live.current = { actions, businessStartMin }
  })
  const today = new Date()

  function onDoubleClick(e) {
    const { actions, businessStartMin } = live.current
    if (e.target.closest('.tss-event-delete, .tss-more, .tss-month-daynum')) return
    const chip = e.target.closest('.tss-chip')
    if (chip) return actions.edit(chip.dataset.id)
    const cell = e.target.closest('.tss-month-cell')
    if (!cell) return
    const start = atMinutes(Number(cell.dataset.dayMs), businessStartMin)
    actions.create(start, addMinutes(start, 60))
  }

  function onClick(e) {
    const { actions } = live.current
    const del = e.target.closest('.tss-event-delete')
    if (del) return actions.remove(del.closest('.tss-chip').dataset.id)
    const goto = e.target.closest('.tss-more, .tss-month-daynum')
    if (goto) actions.showDay(new Date(Number(goto.closest('.tss-month-cell').dataset.dayMs)))
  }

  function onKeyDown(e) {
    const chip = e.target.closest?.('.tss-chip')
    if (!chip || e.target !== chip) return
    if (e.key === 'Enter') live.current.actions.edit(chip.dataset.id)
    else if (e.key === 'Delete' || e.key === 'Backspace') live.current.actions.remove(chip.dataset.id)
  }

  return (
    <div className="tss-month">
      <div className="tss-month-head">
        {days.slice(0, 7).map((d) => (
          <div key={d.getDay()}>{format(d, WEEKDAY, locale)}</div>
        ))}
      </div>
      <div className="tss-month-body" onDoubleClick={onDoubleClick} onClick={onClick} onKeyDown={onKeyDown}>
        {days.map((d) => (
          <MonthCell
            key={d.getTime()}
            dayMs={d.getTime()}
            items={buckets.get(dayKey(d))}
            outside={d.getMonth() !== month}
            isToday={sameDay(d, today)}
            maxPerCell={maxPerCell}
            titleField={titleField}
            colorField={colorField}
            locale={locale}
          />
        ))}
      </div>
    </div>
  )
}

const MonthCell = memo(function MonthCell({ dayMs, items, outside, isToday, maxPerCell, titleField, colorField, locale }) {
  const shown = items.length > maxPerCell ? items.slice(0, maxPerCell - 1) : items
  const hidden = items.length - shown.length
  return (
    <div
      className={'tss-month-cell' + (outside ? ' tss-outside' : '') + (isToday ? ' tss-is-today' : '')}
      data-day-ms={dayMs}
    >
      <button type="button" className="tss-month-daynum">
        {new Date(dayMs).getDate()}
      </button>
      {shown.map((ev) => {
        const title = ev[titleField] || '(No title)'
        return (
          <div key={ev.id} className="tss-chip" data-id={ev.id} tabIndex={0} title={title} style={eventColorVars(ev[colorField]) || undefined}>
            <span className="tss-chip-time">{formatTime(ev.start, locale)}</span> {title}
            <button type="button" className="tss-event-delete" aria-label="Delete event" tabIndex={-1}>
              ×
            </button>
          </div>
        )
      })}
      {hidden > 0 && (
        <button type="button" className="tss-more">
          +{hidden} more
        </button>
      )}
    </div>
  )
})
