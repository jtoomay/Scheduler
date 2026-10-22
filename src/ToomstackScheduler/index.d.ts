// Hand-written declarations for ToomstackScheduler. There is no TypeScript in the
// source, so this file is the contract: update it whenever a public prop or export
// changes. `npm run check` catches a version drift, not a type drift.

import type { CSSProperties, ComponentType, ReactNode } from 'react'

/* ---------- colours ---------- */

export type PaletteName =
  | 'indigo'
  | 'azure'
  | 'moss'
  | 'gold'
  | 'crimson'
  | 'orchid'
  | 'graphite'

export interface PaletteEntry {
  /** Fill in the light theme. */
  bg: string
  /** Label colour on `bg`, at least 4.5:1 against it. */
  ink: string
  /** Fill in the dark theme, at least 3:1 against the dark grid. */
  bgDark: string
  /** Label colour on `bgDark`. */
  inkDark: string
}

export declare const PALETTE: Readonly<Record<PaletteName, Readonly<PaletteEntry>>>
export declare const PALETTE_NAMES: readonly PaletteName[]

/**
 * Resolve a palette name or any CSS colour into the four values an event needs.
 * Returns `null` when there is no colour, so the caller falls back to the
 * `--tss-event-*` tokens. Hex values get contrast handling; other CSS colours are
 * passed through as given.
 */
export declare function resolveEventColor(
  value: PaletteName | string | null | undefined,
): PaletteEntry | null

/* ---------- events ---------- */

/** `Date`, an ISO string, or a millisecond timestamp. */
export type DateInput = Date | string | number

export interface SchedulerEvent {
  /** Required and unique. Callbacks match events by this, never by identity. */
  id: string | number
  /** Accepts a `Date`, ISO string or timestamp. Callbacks always return a `Date`. */
  start: DateInput
  /** Must be after `start`. */
  end: DateInput
  /** Shown as the title unless `titleField` names another property. */
  name?: string
  /** A palette name or any hex, unless `colorField` names another property. */
  color?: PaletteName | string
  /** Anything else is kept and handed back untouched in callbacks. */
  [key: string]: unknown
}

/** An event as the scheduler hands it back: `start`/`end` are always real Dates. */
export type ResolvedEvent = Omit<SchedulerEvent, 'start' | 'end'> & {
  start: Date
  end: Date
}

/* ---------- editor fields ---------- */

export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'datetime'
  | 'color'

export interface Field {
  /** Property on the event this field reads and writes. */
  name: string
  label: string
  type: FieldType
  required?: boolean
  placeholder?: string
  /** For `type: 'select'`. */
  options?: ReadonlyArray<string | { value: string; label: string }>
  /** For `type: 'textarea'`. */
  rows?: number
}

export declare const DEFAULT_FIELDS: readonly Field[]

/** Props handed to a `renderFields` component. */
export interface RenderFieldsProps {
  /** The event-shaped draft, including the built-in `start`/`end`. */
  value: ResolvedEvent
  /** Merge a patch object, or pass an updater function. */
  onChange: (patch: Partial<SchedulerEvent> | ((draft: ResolvedEvent) => Partial<SchedulerEvent>)) => void
  /** The event being edited, or `{ start, end }` when creating. */
  event: Partial<ResolvedEvent>
  mode: 'create' | 'edit'
  editable: boolean
  /** The current validation message, if any. */
  error?: string
}

/* ---------- filtering ---------- */

export type FilterState = Record<string, string[]>

export interface FilterOption {
  value: string
  label: string
}

export interface FilterContext {
  /** Every event, before filtering. */
  events: readonly ResolvedEvent[]
  /** The scheduler's `colorField`. */
  colorField: string
}

export interface Filter {
  /** Key into the filter state. */
  id: string
  /** What the toolbar button says. */
  label: string
  /** The values on offer, derived from the events currently loaded. */
  options: (ctx: FilterContext) => FilterOption[]
  /** Return true to keep the event. `selected` is never empty. */
  test: (event: ResolvedEvent, selected: string[], ctx: FilterContext) => boolean
}

/** The value events with no colour group under, so they stay selectable. */
export declare const NO_COLOR: '__none'

export declare const colorFilter: Readonly<Filter>
export declare const DEFAULT_FILTERS: readonly Filter[]

/** A filter over any event property. `format` renames values for display only. */
export declare function makeFieldFilter(config: {
  id: string
  label: string
  field: string
  format?: (value: string) => string
}): Readonly<Filter>

/* ---------- the component ---------- */

export type SchedulerView = 'day' | 'workWeek' | 'week' | 'month'

export interface ToomstackSchedulerProps {
  /** The events to display. The host owns this array; the scheduler never mutates it. */
  events?: readonly SchedulerEvent[]
  /** Fired when a new event is saved. It already carries a generated `id`. */
  onEventCreate?: (event: ResolvedEvent) => void
  /** Fired on save from the editor, and after a drag or a resize. */
  onEventUpdate?: (event: ResolvedEvent) => void
  /** Fired once the user confirms a delete. */
  onEventDelete?: (event: ResolvedEvent) => void
  /** View shown on first render. */
  defaultView?: SchedulerView
  /** Date shown on first render. Defaults to today. */
  defaultDate?: DateInput
  /** Which views appear in the switcher, in order. */
  views?: readonly SchedulerView[]
  /** The editor's fields. Defaults to `DEFAULT_FIELDS`. */
  fields?: readonly Field[]
  /** `false` turns off create, drag, resize and delete. */
  editable?: boolean
  /** Business hours as hours of the day, 0–24. */
  businessHours?: { start: number; end: number }
  /** Start in full-day (24h) mode instead of business hours. */
  defaultShowFullDay?: boolean
  /** Length of one slot in minutes, and of an event created by double-clicking one. */
  slotMinutes?: number
  /**
   * Minimum height of one slot, in pixels. Rows grow to fill a taller panel and
   * never draw shorter than this; the grid scrolls instead.
   */
  slotHeight?: number
  /** Step size for dragging and resizing, in minutes. */
  snapMinutes?: number
  /** First day of the week. 0 is Sunday. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /** Days shown in Work Week. 0 is Sunday. */
  workWeekDays?: readonly number[]
  /** Most events shown in a month cell before "+N more". */
  monthMaxEvents?: number
  /** Event property used as the display title. */
  titleField?: string
  /** Event property holding the colour. */
  colorField?: string
  /** Use the dark theme. The host owns this; the scheduler fades between the two. */
  darkMode?: boolean
  /**
   * Replaces the editor's non-datetime rows with your own component. `start` and `end`
   * stay owned by the built-in datetime rows.
   *
   * Must be a stable reference — defined at module scope or wrapped in `useMemo`.
   * An inline arrow function remounts the body on every keystroke and drops focus.
   */
  renderFields?: ComponentType<RenderFieldsProps>
  /** The filters offered in the toolbar. `[]` hides the control entirely. */
  filters?: readonly Filter[]
  /** Controlled filter selection. Pair with `onFilterStateChange`. */
  filterState?: FilterState
  /** Called with the next filter state whenever the selection changes. */
  onFilterStateChange?: (state: FilterState) => void
  /** Initial selection when `filterState` is not passed. */
  defaultFilterState?: FilterState
  /** BCP 47 locale for dates and times, e.g. `'en-GB'`. Defaults to the browser's. */
  locale?: string
  /** Height of the scheduler. Defaults to `'100%'`, so give the parent a height. */
  height?: number | string
  /** Extra class on the root element. */
  className?: string
  /** Extra inline styles on the root, handy for overriding `--tss-*` variables. */
  style?: CSSProperties
}

export declare function ToomstackScheduler(props: ToomstackSchedulerProps): ReactNode

export default ToomstackScheduler

/* ---------- date helpers ---------- */

export declare namespace dateUtils {
  const MINUTE: number
  const DAY: number
  function toDate(value: DateInput): Date
  function startOfDay(date: Date): Date
  function addDays(date: Date, n: number): Date
  function addMonths(date: Date, n: number): Date
  function addMinutes(date: DateInput, n: number): Date
  function startOfWeek(date: Date, weekStartsOn?: number): Date
  function startOfMonth(date: Date): Date
  function sameDay(a: Date, b: Date): boolean
  function dayKey(date: Date): string
  function atMinutes(day: Date, minutes: number): Date
  function toInputValue(date: Date): string
  function fromInputValue(value: string): Date | null
  function format(date: Date, options?: Intl.DateTimeFormatOptions, locale?: string): string
  function formatDateRange(
    a: Date,
    b: Date,
    options?: Intl.DateTimeFormatOptions,
    locale?: string,
  ): string
  function formatTime(date: Date, locale?: string): string
  function formatTimeRange(a: Date, b: Date, locale?: string): string
}

/** Matches `package.json` "version". */
export declare const VERSION: string
