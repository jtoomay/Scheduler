import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { addDays, addMonths, formatDateRange, format, startOfDay, startOfMonth, startOfWeek, toDate } from './dateUtils'
import { DEFAULT_FIELDS } from './fields'
import TimeGridView from './TimeGridView'
import MonthView from './MonthView'
import FilterBar from './FilterBar'
import { applyFilters, DEFAULT_FILTERS, hasActiveFilters } from './filters'
import { ConfirmDelete, EventEditor } from './Dialogs'
import './scheduler.css'

const VIEW_LABELS = { day: 'Day', workWeek: 'Work Week', week: 'Week', month: 'Month' }
const DEFAULT_VIEWS = ['day', 'workWeek', 'week', 'month']
const DEFAULT_BUSINESS_HOURS = { start: 8, end: 17 }
const DEFAULT_WORK_WEEK = [1, 2, 3, 4, 5]
const EMPTY_FILTER_STATE = Object.freeze({})

/** Long enough to read as a fade, short enough that the grid-line snap goes unnoticed. */
const THEME_FADE_MS = 200

// Normalized copy per host event object; identities stay stable so memoized columns can skip work.
const normCache = new WeakMap()
function normalize(ev) {
  let n = normCache.get(ev)
  if (!n) {
    n = { ...ev, start: toDate(ev.start), end: toDate(ev.end) }
    normCache.set(ev, n)
  }
  return n
}

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`

function visibleDays(view, date, weekStartsOn, workWeekDays) {
  if (view === 'day') return [startOfDay(date)]
  if (view === 'month') {
    const first = startOfWeek(startOfMonth(date), weekStartsOn)
    return Array.from({ length: 42 }, (_, i) => addDays(first, i))
  }
  const first = startOfWeek(date, weekStartsOn)
  const week = Array.from({ length: 7 }, (_, i) => addDays(first, i))
  return view === 'workWeek' ? week.filter((d) => workWeekDays.includes(d.getDay())) : week
}

function rangeLabel(view, date, days, locale) {
  if (view === 'day') return format(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }, locale)
  if (view === 'month') return format(date, { month: 'long', year: 'numeric' }, locale)
  return formatDateRange(days[0], days[days.length - 1], { month: 'short', day: 'numeric', year: 'numeric' }, locale)
}

export default function ToomstackScheduler({
  events = [],
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  defaultView = 'week',
  defaultDate,
  views = DEFAULT_VIEWS,
  fields = DEFAULT_FIELDS,
  editable = true,
  businessHours = DEFAULT_BUSINESS_HOURS,
  defaultShowFullDay = false,
  slotMinutes = 30,
  slotHeight = 28,
  snapMinutes = 15,
  weekStartsOn = 0,
  workWeekDays = DEFAULT_WORK_WEEK,
  monthMaxEvents = 3,
  titleField = 'name',
  colorField = 'color',
  darkMode = false,
  renderFields,
  filters = DEFAULT_FILTERS,
  filterState,
  onFilterStateChange,
  defaultFilterState = EMPTY_FILTER_STATE,
  locale,
  height = '100%',
  className = '',
  style,
}) {
  const [view, setView] = useState(views.includes(defaultView) ? defaultView : views[0])
  const [date, setDate] = useState(() => startOfDay(defaultDate ? toDate(defaultDate) : new Date()))
  const [showFullDay, setShowFullDay] = useState(defaultShowFullDay)
  const [editing, setEditing] = useState(null) // { mode: 'create' | 'edit', event }
  const [confirming, setConfirming] = useState(null) // event pending deletion

  const normalized = useMemo(() => events.map(normalize), [events])

  // Keyed on every event, not just the visible ones: this backs actions.get/edit/remove,
  // and an event hidden by a filter mid-drag must still resolve.
  const byId = useMemo(() => new Map(normalized.map((ev) => [String(ev.id), ev])), [normalized])

  const [ownFilterState, setOwnFilterState] = useState(defaultFilterState)
  const filtersControlled = filterState !== undefined
  const activeFilterState = filtersControlled ? filterState : ownFilterState
  const setFilterState = (next) => {
    if (!filtersControlled) setOwnFilterState(next)
    onFilterStateChange?.(next)
  }

  // Filtering happens before the views bucket by day and lay out overlaps, so a hidden
  // event doesn't widen its neighbours' columns. Memoized, or useDayBuckets' own memo
  // would be invalidated on every render.
  const filterCtx = useMemo(() => ({ colorField }), [colorField])
  const visible = useMemo(
    () => applyFilters(normalized, filters, activeFilterState, filterCtx),
    [normalized, filters, activeFilterState, filterCtx],
  )
  const filtered = hasActiveFilters(filters, activeFilterState)

  // Arm the colour transition only around an actual theme change — never on mount, and
  // never while anything else is happening — so hover, drag and view switching carry no
  // transition cost at all.
  const rootRef = useRef(null)
  const lastTheme = useRef(darkMode)
  useEffect(() => {
    if (lastTheme.current === darkMode) return
    lastTheme.current = darkMode
    const root = rootRef.current
    if (!root) return
    root.classList.add('tss-theme-anim')
    const id = setTimeout(() => root.classList.remove('tss-theme-anim'), THEME_FADE_MS + 40)
    return () => {
      clearTimeout(id)
      root.classList.remove('tss-theme-anim')
    }
  }, [darkMode])

  const days = useMemo(
    () => visibleDays(view, date, weekStartsOn, workWeekDays),
    [view, date, weekStartsOn, workWeekDays],
  )

  // Stable action object for the views; reads the latest props through a ref.
  const latest = useRef(null)
  useLayoutEffect(() => {
    latest.current = { byId, editable, onEventUpdate, views }
  })
  const actions = useMemo(
    () => ({
      get editable() {
        return latest.current.editable
      },
      get: (id) => latest.current.byId.get(String(id)),
      create: (start, end) => {
        if (latest.current.editable) setEditing({ mode: 'create', event: { start, end } })
      },
      edit: (id) => {
        const ev = latest.current.byId.get(String(id))
        if (ev) setEditing({ mode: 'edit', event: ev })
      },
      remove: (id) => {
        const ev = latest.current.byId.get(String(id))
        if (ev && latest.current.editable) setConfirming(ev)
      },
      update: (ev) => latest.current.onEventUpdate?.(ev),
      showDay: (d) => {
        if (!latest.current.views.includes('day')) return
        setDate(startOfDay(d))
        setView('day')
      },
    }),
    [],
  )

  function navigate(dir) {
    setDate((d) => {
      if (view === 'day') return addDays(d, dir)
      if (view === 'month') return addMonths(d, dir)
      return addDays(d, 7 * dir)
    })
  }

  function save(ev) {
    if (editing.mode === 'create') onEventCreate?.({ ...ev, id: ev.id ?? makeId() })
    else onEventUpdate?.(ev)
    setEditing(null)
  }

  function confirmDelete() {
    onEventDelete?.(confirming)
    setConfirming(null)
    setEditing(null)
  }

  const isTimeView = view !== 'month'
  const bizStart = businessHours.start * 60
  const bizEnd = businessHours.end * 60

  return (
    <div
      ref={rootRef}
      /* Set during render, not in an effect, so there is no flash of the wrong theme. */
      data-theme={darkMode ? 'dark' : 'light'}
      className={`tss-root ${editable ? '' : 'tss-readonly'} ${className}`}
      style={{ height, ...style }}
    >
      <div className="tss-toolbar">
        <div className="tss-btn-group">
          <button type="button" className="tss-btn" onClick={() => setDate(startOfDay(new Date()))}>
            Today
          </button>
          <button type="button" className="tss-btn tss-btn-icon" aria-label="Previous" onClick={() => navigate(-1)}>
            ‹
          </button>
          <button type="button" className="tss-btn tss-btn-icon" aria-label="Next" onClick={() => navigate(1)}>
            ›
          </button>
        </div>
        <div className="tss-range">{rangeLabel(view, date, days, locale)}</div>
        {filters.length > 0 && (
          <FilterBar
            filters={filters}
            state={activeFilterState}
            onChange={setFilterState}
            events={normalized}
            colorField={colorField}
          />
        )}
        <div className="tss-btn-group tss-views" role="tablist">
          {views.map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={v === view}
              className={'tss-btn' + (v === view ? ' tss-active' : '')}
              onClick={() => setView(v)}
            >
              {VIEW_LABELS[v] ?? v}
            </button>
          ))}
        </div>
      </div>

      <div className="tss-viewport">
        {isTimeView ? (
          <TimeGridView
            days={days}
            events={visible}
            rangeStartMin={showFullDay ? 0 : bizStart}
            rangeEndMin={showFullDay ? 1440 : bizEnd}
            businessStartMin={bizStart}
            businessEndMin={bizEnd}
            showFullDay={showFullDay}
            slotMinutes={slotMinutes}
            slotHeight={slotHeight}
            snapMinutes={snapMinutes}
            titleField={titleField}
            colorField={colorField}
            locale={locale}
            actions={actions}
          />
        ) : (
          <MonthView
            days={days}
            month={date.getMonth()}
            events={visible}
            maxPerCell={monthMaxEvents}
            businessStartMin={bizStart}
            titleField={titleField}
            colorField={colorField}
            locale={locale}
            actions={actions}
          />
        )}

        {filtered && visible.length === 0 && normalized.length > 0 && (
          <div className="tss-empty">
            <span>No events match the selected colours.</span>
            <button
              type="button"
              className="tss-btn"
              onClick={() => setFilterState(EMPTY_FILTER_STATE)}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {isTimeView && (
        <div className="tss-footer">
          <button type="button" className="tss-btn tss-btn-flat" onClick={() => setShowFullDay((s) => !s)}>
            {showFullDay ? 'Show business hours' : 'Show full day'}
          </button>
        </div>
      )}

      {editing && (
        <EventEditor
          key={editing.event.id ?? 'new'}
          mode={editing.mode}
          event={editing.event}
          fields={fields}
          renderFields={renderFields}
          editable={editable}
          onSave={save}
          onCancel={() => setEditing(null)}
          onDelete={() => setConfirming(editing.event)}
        />
      )}
      {confirming && (
        <ConfirmDelete
          event={confirming}
          titleField={titleField}
          onConfirm={confirmDelete}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  )
}
