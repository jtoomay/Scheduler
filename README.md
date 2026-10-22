# ToomstackScheduler

**Version 0.3.0** · A fast, lightweight React scheduler modeled on the Telerik (KendoReact) Scheduler.

ToomstackScheduler gives you the Telerik-style workflow: double-click to create, double-click to edit, drag to move, drag to resize, and Day / Work Week / Week / Month views. It stays fast with thousands of events and has **no runtime dependencies beyond React**.

Published on npm as **[`toomstack-scheduler`](https://www.npmjs.com/package/toomstack-scheduler)**. This repository holds the library in `src/ToomstackScheduler/` and a dev harness in `playground/`.

```bash
npm i toomstack-scheduler
```

```jsx
import { ToomstackScheduler } from 'toomstack-scheduler'
import 'toomstack-scheduler/styles.css'
```

> Adding this to an app with an AI assistant? Point it at **[AGENTS.md](AGENTS.md)**, which
> ships inside the package at `node_modules/toomstack-scheduler/AGENTS.md`.

---

## Table of contents

1. [Quick start](#quick-start)
2. [Features](#features)
3. [Using the scheduler (end-user guide)](#using-the-scheduler-end-user-guide)
4. [Adding it to an app (developer guide)](#adding-it-to-an-app-developer-guide)
5. [Props reference](#props-reference)
6. [The event object](#the-event-object)
7. [Callbacks](#callbacks)
8. [Editor fields (adding your own)](#editor-fields-adding-your-own)
9. [Event colours](#event-colours)
10. [Filtering](#filtering)
11. [Theming and styling](#theming-and-styling)
12. [Dark mode](#dark-mode)
13. [Other exports](#other-exports)
14. [Performance: why it's fast](#performance-why-its-fast)
15. [Project structure](#project-structure)
16. [Working on the package itself](#working-on-the-package-itself)
17. [Releasing](#releasing)
18. [Versioning and changelog](#versioning-and-changelog)
19. [Roadmap](#roadmap)

---

## Quick start

**Using it in an app:** install it, import the component and the stylesheet, and give the
parent a height. See [Adding it to an app](#adding-it-to-an-app-developer-guide).

**Working on it:** requirements are Node 18+ (developed on Node 24) and npm.

```bash
npm install        # install dependencies
npm run dev        # dev harness at http://localhost:5181
npm run build      # build the library into dist/
npm run test       # Vitest suite
npm run lint       # oxlint
npm run check      # lint + version gate + tests
```

The harness in `playground/` imports the library **by its package name**, exactly as a
consumer does, so a missing export fails there instead of after a publish. It saves events
to `localStorage`; reset with `localStorage.removeItem('toomstack-scheduler-demo-events')`
in the browser console, then reload.

---

## Features

| Feature | Details |
|---|---|
| Views | **Day**, **Work Week** (Mon–Fri by default), **Week**, **Month** |
| Toolbar | **Today**, **‹ Prev**, **Next ›**, the current date range, and a view switcher |
| Create | **Double-click an empty time slot.** The editor opens prefilled with that slot's start and end |
| Edit | **Double-click an event.** The editor opens with all of its fields |
| Editor window | Name, Email, Phone Number, Address, Start, End. Includes Save, Cancel and Delete, plus validation |
| Delete | Hover an event and click **×**, press **Delete** on a focused event, or use **Delete** in the editor. A confirmation always appears first |
| Move | Drag an event to another time or another day (snaps to 15 minutes) |
| Resize | Drag an event's bottom edge (snaps to 15 minutes) |
| Overlaps | Overlapping events sit side by side |
| Business hours | 8 AM–5 PM by default. **Show full day** in the footer switches to all 24 hours, with off-hours shaded |
| Now indicator | A red line marks the current time in today's column |
| Month view | Up to 3 events per day, then "+N more". Click a day number or "+N more" to open that day |
| Keyboard | Tab to an event, then **Enter** to edit or **Delete/Backspace** to delete. In the editor, **Enter** saves and **Esc** closes |
| Custom fields | Add any fields to the editor through the `fields` prop |
| Custom editor body | `renderFields` replaces the non-datetime field rows with your own component. See [Replacing the editor body](#replacing-the-editor-body-renderfields) |
| Event colours | `event.color` takes one of seven palette names or any hex, with the label contrast handled for you. See [Event colours](#event-colours) |
| Filtering | A **Colour** filter in the toolbar, plus your own filters through the `filters` prop. See [Filtering](#filtering) |
| Dark mode | `darkMode` switches every `--tss-*` token to a dark value and fades the change. See [Dark mode](#dark-mode) |
| Read-only mode | `editable={false}` turns off create, drag, resize and delete (events still open, read-only) |
| Theming | CSS variables (`--tss-*`). Every class is prefixed `tss-` so it can't clash with your app |

---

## Using the scheduler (end-user guide)

### Navigating
- **Today** jumps to the current date.
- **‹ / ›** move back and forward by one day (Day view), one week (Week and Work Week), or one month (Month).
- The **view buttons** on the right switch between Day, Work Week, Week and Month.
- The date range for the current view is shown next to the arrows (for example, *Sep 20 – 26, 2026*).

### Creating an appointment
1. In Day, Work Week or Week view, **double-click an empty time slot**. The editor opens with Start and End set to that slot (30 minutes by default).
   In Month view, **double-click a day**. The editor opens with the start of business hours (8:00 AM) to one hour later.
2. Fill in **Name** (required), plus Email, Phone Number and Address.
3. Change **Start** and **End** if needed.
4. Click **Save** or press **Enter**. Click **Cancel**, **×** or press **Esc** to discard.

Validation: Name, Start and End are required, and End must be after Start.

### Editing an appointment
- **Double-click the event**, or tab to it and press **Enter**. Change any field and click **Save**.

### Moving and resizing
- **Move:** press and drag an event. You can move it up or down to change the time, or sideways to change the day. While you drag, the event shows its new time range. Release to save.
- **Resize:** drag the **bottom edge** of an event (the cursor changes to ↕).
- Both snap to 15-minute steps. Dragging and resizing work in Day, Work Week and Week views.

### Deleting an appointment
- Hover over the event and click the **×** in its top-right corner, **or**
- Tab to the event and press **Delete** / **Backspace**, **or**
- Open the event and click **Delete** in the editor.

A confirmation window always asks before anything is deleted.

### Business hours vs. full day
The time views show business hours (8 AM–5 PM) by default, stretched so those hours fill the panel down to the footer. `slotHeight` (28px) is the minimum row size: a shorter panel keeps that size and scrolls, and a row is never drawn shorter than that. A full day is 24 hours, so it scrolls on a normal screen and stretches only when the panel is tall enough to hold it. Click **Show full day** in the footer to see all 24 hours. The view scrolls to the start of business hours, and hours outside business hours are shaded. Click **Show business hours** to switch back.

### Month view
- Each day shows up to 3 events (start time + name). If there are more, the cell shows **+N more**. Click it to open that day in Day view.
- Click the **day number** to open that day in Day view.
- Days from the previous and next month are greyed out.

---

## Adding it to an app (developer guide)

The scheduler is **controlled**: your app owns the list of events and updates it in response to three callbacks. The component never stores or fetches data itself, so you can keep events in React state, a database, an API, and so on.

```jsx
import { useState } from 'react'
import { ToomstackScheduler } from 'toomstack-scheduler'
import 'toomstack-scheduler/styles.css'

export default function App() {
  const [events, setEvents] = useState([
    {
      id: 1,
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '555-0100',
      address: '1 Main St',
      start: new Date(2026, 8, 23, 9, 0),
      end: new Date(2026, 8, 23, 10, 0),
    },
  ])

  return (
    <div style={{ height: '100vh' }}>
      <ToomstackScheduler
        events={events}
        onEventCreate={(ev) => setEvents((list) => [...list, ev])}
        onEventUpdate={(ev) => setEvents((list) => list.map((e) => (e.id === ev.id ? ev : e)))}
        onEventDelete={(ev) => setEvents((list) => list.filter((e) => e.id !== ev.id))}
      />
    </div>
  )
}
```

**Height:** the scheduler fills its parent (`height="100%"` by default), so give the parent a height, or pass `height={700}`.

**Saving to a backend:** do the API call inside the callbacks, then update state:

```jsx
onEventCreate={async (ev) => {
  const saved = await api.createAppointment(ev) // your API
  setEvents((list) => [...list, saved])
}}
```

**The stylesheet is a separate import.** The library build keeps CSS out of the JS bundle, so it can be themed and so bundlers never inject it twice:

```jsx
import 'toomstack-scheduler/styles.css'   // once, at your app entry
```

Leave it out and the scheduler renders as a column of unstyled divs with no grid.

**Peer dependencies:** `react` and `react-dom` (>=18) come from your app. Installing a second copy produces *Invalid hook call* at runtime.

---

## Props reference

| Prop | Type | Default | Description |
|---|---|---|---|
| `events` | `Event[]` | `[]` | The events to display. See [The event object](#the-event-object). |
| `onEventCreate` | `(event) => void` | none | Called when an event is saved from the "New Event" editor. The event already has an `id`. |
| `onEventUpdate` | `(event) => void` | none | Called after an edit is saved, or after a drag or resize. |
| `onEventDelete` | `(event) => void` | none | Called after the user confirms a delete. |
| `defaultView` | `'day' \| 'workWeek' \| 'week' \| 'month'` | `'week'` | The view shown on first render. |
| `defaultDate` | `Date \| string \| number` | today | The date shown on first render. |
| `views` | `string[]` | `['day','workWeek','week','month']` | Which views appear in the switcher, in order. |
| `fields` | `Field[]` | `DEFAULT_FIELDS` | The editor window's fields. See [Editor fields](#editor-fields-adding-your-own). |
| `editable` | `boolean` | `true` | `false` turns off create, drag, resize and delete. Double-click still opens a read-only editor. |
| `businessHours` | `{ start: number, end: number }` | `{ start: 8, end: 17 }` | Business hours as hours of the day (0–24). Used for the default range, off-hours shading, and the default start time when creating from Month view. |
| `defaultShowFullDay` | `boolean` | `false` | Start in full-day (24h) mode. |
| `slotMinutes` | `number` | `30` | Length of one time slot, which is also the length of an event created by double-clicking a slot. |
| `slotHeight` | `number` (px) | `28` | Minimum height of one slot. Rows grow to fill a taller panel and never shrink below this; the grid scrolls instead. |
| `snapMinutes` | `number` | `15` | Step size for dragging and resizing. |
| `weekStartsOn` | `0–6` | `0` (Sunday) | First day of the week. |
| `workWeekDays` | `number[]` | `[1,2,3,4,5]` | Days shown in Work Week (0 = Sunday). |
| `monthMaxEvents` | `number` | `3` | Most events shown in a month cell before "+N more". |
| `titleField` | `string` | `'name'` | Event property used as the event's display title. |
| `colorField` | `string` | `'color'` | Event property holding the event's colour: a palette name or a hex. See [Event colours](#event-colours). |
| `darkMode` | `boolean` | `false` | Use the dark theme. See [Dark mode](#dark-mode). |
| `renderFields` | `(props) => ReactNode` | none | Component that replaces the editor's non-datetime field rows. Must be a stable reference. See [Replacing the editor body](#replacing-the-editor-body-renderfields). |
| `filters` | `Filter[]` | `[colorFilter]` | The filters offered in the toolbar. `[]` hides the control. See [Filtering](#filtering). |
| `filterState` | `{ [filterId]: string[] }` | none | Controlled filter selection. Pair it with `onFilterStateChange`. |
| `onFilterStateChange` | `(state) => void` | none | Called with the next filter state whenever the selection changes. |
| `defaultFilterState` | `{ [filterId]: string[] }` | `{}` | Initial selection when `filterState` is not passed (uncontrolled). |
| `locale` | `string` | browser locale | BCP 47 locale for dates and times, e.g. `'en-GB'`. |
| `height` | `number \| string` | `'100%'` | Height of the scheduler. |
| `className` | `string` | `''` | Extra class on the root element. |
| `style` | `object` | none | Extra inline styles on the root element (for example CSS variable overrides). |

> **Tip:** for best performance, pass arrays and objects (`views`, `fields`, `filters`, `workWeekDays`, `businessHours`) as constants defined outside your component, or wrap them in `useMemo`. That way they don't change identity on every render.

---

## The event object

```js
{
  id: 'abc123',          // required, unique. Strings or numbers both work.
  name: 'Jane Doe',      // shown as the title (see `titleField`)
  email: 'jane@example.com',
  phone: '555-0100',
  address: '1 Main St',
  start: Date,           // required. Date, ISO string or timestamp.
  end: Date,             // required. Must be after `start`.
  color: 'azure',        // optional. A palette name or a hex (see `colorField`).
  // ...any other properties you like. They're passed through untouched.
}
```

- `start`/`end` can be `Date` objects, ISO strings, or millisecond timestamps. That means JSON from an API or `localStorage` works as-is.
- **Callbacks always send `start`/`end` back as `Date` objects.**
- Unknown properties are kept and passed back in callbacks, so you can store things like `customerId` or `status` on events.
- When the user creates an event, the scheduler assigns an `id` (`crypto.randomUUID()`) before calling `onEventCreate`. Your backend can replace it.

---

## Callbacks

| Callback | When it fires | Argument |
|---|---|---|
| `onEventCreate(event)` | User clicks **Save** in the "New Event" window | The new event, including a generated `id` |
| `onEventUpdate(event)` | User saves in the "Edit Event" window, **or** finishes a drag or resize | The full updated event (same `id`) |
| `onEventDelete(event)` | User confirms deletion | The event being deleted |

Callbacks match events by `id`, so always compare by `id`, not by object identity.

---

## Editor fields (adding your own)

The editor window is generated from the `fields` array. The default is:

```js
import { DEFAULT_FIELDS } from './ToomstackScheduler'
// [
//   { name: 'name',    label: 'Name',         type: 'text',     required: true },
//   { name: 'email',   label: 'Email',        type: 'email' },
//   { name: 'phone',   label: 'Phone Number', type: 'tel' },
//   { name: 'address', label: 'Address',      type: 'textarea', rows: 2 },
//   { name: 'start',   label: 'Start',        type: 'datetime', required: true },
//   { name: 'end',     label: 'End',          type: 'datetime', required: true },
// ]
```

To add fields, extend the list. Define it **outside** your component so it doesn't change on every render:

```jsx
const FIELDS = [
  ...DEFAULT_FIELDS,
  { name: 'service', label: 'Service', type: 'select', options: ['Consultation', 'Follow-up', 'Repair'] },
  { name: 'notes', label: 'Notes', type: 'textarea', rows: 4 },
  { name: 'confirmed', label: 'Confirmed', type: 'checkbox' },
]

<ToomstackScheduler fields={FIELDS} ... />
```

Each field's value is saved on the event under `name` (for example `event.service`).

### Field options

| Key | Type | Description |
|---|---|---|
| `name` | `string` | Property name on the event object. Required. |
| `label` | `string` | Label shown in the editor (defaults to `name`). |
| `type` | see below | Input type (defaults to `text`). |
| `required` | `boolean` | Marks the field as required (shows a red *). |
| `placeholder` | `string` | Placeholder text. |
| `options` | `string[]` or `{ value, label }[]` | Choices for `select`. |
| `rows` | `number` | Height of a `textarea`. |

**Supported types:** `text`, `email`, `tel`, `url`, `number`, `textarea`, `select`, `checkbox`, `datetime`, `color`.

`color` shows a row of swatches (one per palette colour, plus a **×** for no colour) and stores the palette name, for example `'azure'`. It is opt-in, so add it yourself:

```jsx
const FIELDS = [
  ...DEFAULT_FIELDS,
  { name: 'color', label: 'Colour', type: 'color' },
]
```

> The `start` and `end` fields (type `datetime`) must stay in the list, because the calendar needs them to place the event. You can reorder or relabel them.

### Replacing the editor body (`renderFields`)

When a list of inputs isn't enough, pass `renderFields` and the editor renders your component instead of the non-datetime field rows. It is called as a component with these props:

```js
renderFields({ value, onChange, event, mode, editable, error })
```

| Prop | Description |
|---|---|
| `value` | The current draft, in event shape. `start` and `end` are real `Date` objects, not form strings. |
| `onChange` | Update the draft. Takes a patch object (`onChange({ notes: 'hi' })`) or an updater function (`onChange((d) => ({ count: d.count + 1 }))`). |
| `event` | The event the editor was opened with, as it was before any edits. |
| `mode` | `'create'` or `'edit'`. |
| `editable` | `false` in read-only mode. |
| `error` | The current validation message, or `''`. |

`renderFields` replaces **only the non-datetime field rows**. The modal keeps its header, the **Start** and **End** inputs, validation, the error line, and **Cancel** / **Save** / **Delete**.

On save, the draft is merged over the values from `fields`, so custom data wins for any key both define. `start` and `end` always come from the built-in inputs, whatever your component does to them.

> **Tip:** `renderFields` must be a **stable reference**. A new inline arrow on every render makes React remount the editor body, and the input loses focus in the middle of typing. Define the component outside your own component, or wrap it in `useMemo`.

```jsx
// Defined at module level, so its identity never changes.
function NotesBody({ value, onChange, editable }) {
  return (
    <>
      <div className="tss-form-row">
        <label htmlFor="n-name">Name</label>
        <input id="n-name" value={value.name ?? ''} disabled={!editable} onChange={(e) => onChange({ name: e.target.value })} />
      </div>
      <div className="tss-form-row">
        <label htmlFor="n-ticket">Ticket number</label>
        {/* `ticket` is not in `fields`; the library knows nothing about it */}
        <input id="n-ticket" value={value.ticket ?? ''} disabled={!editable} onChange={(e) => onChange({ ticket: e.target.value })} />
      </div>
    </>
  )
}

<ToomstackScheduler renderFields={NotesBody} ... />
```

The saved event carries `ticket` and comes back in `onEventCreate` / `onEventUpdate` like any other property.

---

## Event colours

Give an event a `color` and its block is drawn in that colour. The property name is set by `colorField` (default `'color'`). The value is either a palette name or any hex colour (`'#00808a'`, `'#0a8'`).

| Name | Light fill |
|---|---|
| `indigo` | `#543eae` |
| `azure` | `#1c73b6` |
| `moss` | `#217300` |
| `gold` | `#e7b935` |
| `crimson` | `#c43029` |
| `orchid` | `#964182` |
| `graphite` | `#4b4f5d` |

Every palette colour was measured against two rules:

1. The label clears **4.5:1** against its fill, so the text is readable. `gold` takes dark ink; the other six take white.
2. The dark-theme fill clears **3:1** against the dark grid, so a block still reads as a block instead of dissolving into the background. Three colours (`azure`, `gold`, `crimson`) need no change in dark mode; the others use a slightly lighter fill.

Any other hex goes through the same path. In dark mode it is lifted toward white in OKLab (keeping its hue) until it separates from the dark grid, and its label ink (white or dark) is chosen by luminance. Colours that aren't hex, such as keywords or `rgb()`, render exactly as given with white ink and get **no** contrast handling. Pass a hex if you want it.

An event with no colour uses the global `--tss-event-bg` / `--tss-event-text` tokens, exactly as in 0.1.0.

To let users pick a colour, add a `color` field to the editor (see [Editor fields](#editor-fields-adding-your-own)). The palette is also exported: `PALETTE`, `PALETTE_NAMES` and `resolveEventColor(value)` (see [Other exports](#other-exports)).

---

## Filtering

The toolbar has a filter control. By default it offers one filter, **Colour**, listing the colours in use by the loaded events. Filtering happens **before** layout, so hiding one of two overlapping events widens the other back to full width.

| Prop | Type | Default | Description |
|---|---|---|---|
| `filters` | `Filter[]` | `[colorFilter]` | The filters offered. `filters={[]}` hides the control. |
| `filterState` | `{ [filterId]: string[] }` | none | Controlled selection. |
| `onFilterStateChange` | `(state) => void` | none | Called with the next state on every change. |
| `defaultFilterState` | `{ [filterId]: string[] }` | `{}` | Initial selection when uncontrolled. |

State is `{ [filterId]: string[] }`, for example `{ color: ['azure', 'moss'] }`. An empty or missing selection means that filter is **off**, so selecting nothing shows everything.

```jsx
// Uncontrolled, starting with only azure events showing
<ToomstackScheduler defaultFilterState={{ color: ['azure'] }} ... />

// Controlled
const [filterState, setFilterState] = useState({})
<ToomstackScheduler filterState={filterState} onFilterStateChange={setFilterState} ... />
```

### Custom filters

A filter is a plain object:

```js
{
  id,                          // key into the filter state
  label,                       // what the toolbar button says
  options(ctx),                // the values on offer: [{ value, label }]
  test(event, selected, ctx)   // true to keep the event
}
```

`ctx` is `{ colorField }` for `test`, and `options` also receives `events`. Events that pass **every** filter with a selection are shown.

`makeFieldFilter({ id, label, field, format })` builds one for any event property. `format` (optional) renames values for display without changing what is stored:

```jsx
import { colorFilter, makeFieldFilter } from './ToomstackScheduler'

// Defined outside your component so the array keeps its identity.
const FILTERS = [
  colorFilter,
  makeFieldFilter({ id: 'service', label: 'Service', field: 'service' }),
]

<ToomstackScheduler filters={FILTERS} ... />
```

Adding a new kind of filter needs **no change to the scheduler**: write the object (or call `makeFieldFilter`) and pass it in `filters`.

`NO_COLOR` (`'__none'`) is the value for events that have no value for the filtered property. It appears as a **No colour** option (or **No service** for a field filter) and is what you put in the state to select those events.

> **Tip:** if the filters hide every event, the view shows a message with a way to clear them, so the calendar never looks silently broken.

---

## Theming and styling

Every class starts with `tss-`, and colors and sizes are CSS variables on `.tss-root`. You can override them with a class, or with the `style` prop:

```css
.my-scheduler {
  --tss-primary: #7c3aed;      /* buttons, active view, links */
  --tss-event-bg: #0ea5e9;     /* event blocks */
  --tss-event-text: #fff;
}
```

```jsx
<ToomstackScheduler className="my-scheduler" ... />
// or
<ToomstackScheduler style={{ '--tss-primary': '#7c3aed' }} ... />
```

| Variable | Default | Used for |
|---|---|---|
| `--tss-primary` / `--tss-primary-hover` | `#2f6fdd` / `#245bb8` | Primary buttons, active view, links |
| `--tss-primary-text` | `#fff` | Text on primary buttons |
| `--tss-danger` | `#d64545` | Delete buttons, required markers, errors |
| `--tss-danger-text` | `#fff` | Text on a hovered danger button |
| `--tss-text` / `--tss-muted` | `#212529` / `#6c757d` | Text / secondary text |
| `--tss-bg` | `#fff` | Background |
| `--tss-toolbar-bg` | `#f5f6f8` | Toolbar, headers, footer, dialog header |
| `--tss-btn-hover-bg` | `#eef0f3` | Hovered buttons and filter options |
| `--tss-border` | `#dee2e6` | Outer borders |
| `--tss-line` / `--tss-line-light` | `#e3e6ea` / `#f0f2f4` | Hour lines / slot lines |
| `--tss-offhours` | `#f7f8fa` | Shading outside business hours, other-month days |
| `--tss-today` | `#f3f8ff` | Today's column / cell |
| `--tss-event-bg` / `--tss-event-text` | primary / `#fff` | Event blocks with no colour |
| `--tss-event-border` | `rgb(0 0 0 / 0.08)` | Edge of an event block |
| `--tss-event-shadow` | `0 1px 2px rgb(0 0 0 / 0.12)` | Shadow under an event block |
| `--tss-drag-shadow` | `0 4px 12px rgb(0 0 0 / 0.25)` | Shadow on an event while it is dragged |
| `--tss-dialog-shadow` | `0 10px 30px rgb(0 0 0 / 0.2)` | Shadow under dialogs |
| `--tss-backdrop` | `rgb(0 0 0 / 0.35)` | Page dimming behind a dialog |
| `--tss-now` | `#e5484d` | Current-time line |
| `--tss-gutter` | `64px` | Width of the time labels column |
| `--tss-min-col` | `90px` | Minimum day-column width (narrower screens scroll sideways) |
| `--tss-radius` | `4px` | Corner radius |
| `--tss-font` | `inherit` | Font family |

The defaults above are the light theme. Events that have a `color` set their own fill and label colour, so `--tss-event-bg` and `--tss-event-text` only affect events without one.

Useful classes if you need to target something specific: `.tss-toolbar`, `.tss-event`, `.tss-chip` (month event), `.tss-dialog`, `.tss-editor`, `.tss-form-row`, `.tss-now`, `.tss-dragging` (event while being dragged), `.tss-viewport` (the area under the toolbar that holds the view), `.tss-filter` (a filter button and its popover), `.tss-popover` (the filter options panel), `.tss-swatch` (a colour dot, in the editor and the filter), `.tss-empty` (the "filters hide everything" message).

---

## Dark mode

```jsx
<ToomstackScheduler darkMode={true} ... />
```

`darkMode` (boolean, default `false`) sets `data-theme="dark"` on the root element (`data-theme="light"` otherwise). Every `--tss-*` token takes a dark value, and `color-scheme: dark` is set so the native datetime pickers and scrollbars follow.

The default is `false`, so upgrading from 0.1.0 changes nothing until you opt in.

To follow the operating system instead, read the media query when you create the state (this is what `src/App.jsx` does):

```jsx
const [dark, setDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)

<ToomstackScheduler darkMode={dark} ... />
```

That reads the preference once. To track changes while the page is open, listen for the media query's `change` event and call `setDark`.

**Transition.** When `darkMode` changes, the component adds a `tss-theme-anim` class to the root for about 240 ms and then removes it, so colours fade. The class is only there around the switch, so hover, drag and view switching never carry a transition. `prefers-reduced-motion: reduce` turns the fade off.

**Overriding the dark theme.** The dark values are set on `.tss-root[data-theme='dark']`, which is more specific than a bare `.tss-root` or your own class. Target the same selector to change them:

```css
.my-scheduler[data-theme='dark'] {
  --tss-bg: #0f1115;
  --tss-primary: #7aa7ff;
}
```

With the `style` prop, inline variables win in both themes, so only use it for values that should not change with the theme.

> **Tip:** `--tss-primary` takes a lighter value in the dark theme (`#4d8ee8`) because the light one only reaches 3.75:1 on a dark surface. If you override `--tss-bg`, keep it close to `#16181d`: the dark event fills were measured against that surface.

---

## Other exports

```js
import ToomstackScheduler, {
  ToomstackScheduler,   // the component (also the default export)
  DEFAULT_FIELDS,       // the default editor fields
  dateUtils,            // helper functions: startOfDay, addDays, startOfWeek, format, toInputValue, ...
  PALETTE,              // the seven named colours: { name: { bg, ink, bgDark, inkDark } }
  PALETTE_NAMES,        // ['indigo', 'azure', 'moss', 'gold', 'crimson', 'orchid', 'graphite']
  resolveEventColor,    // palette name or CSS colour -> { bg, ink, bgDark, inkDark }, or null for no colour
  colorFilter,          // the default Colour filter
  DEFAULT_FILTERS,      // [colorFilter]
  makeFieldFilter,      // makeFieldFilter({ id, label, field, format }) builds a filter for any property
  NO_COLOR,             // '__none', the filter value for events with no value
  VERSION,              // e.g. '0.3.0'
} from 'toomstack-scheduler'
```

TypeScript declarations ship with the package (`dist/index.d.ts`), covering every prop,
the event shape, `Field`, `Filter` and the palette names.

---

## Performance: why it's fast

The Telerik Scheduler can feel laggy because it renders a DOM element for every time slot and re-renders a lot while you interact with it. ToomstackScheduler avoids both:

- **No DOM per slot.** Slot and hour lines are drawn by one CSS gradient per day column. The scheduler works out which slot you double-clicked from the mouse position, so a full-day week view is only a few hundred elements.
- **Dragging doesn't re-render React.** While you drag or resize, only the dragged element's CSS `transform`/`height` changes, inside `requestAnimationFrame`. React state updates once, when you let go.
- **Memoized day columns.** Events are sorted into days, and each day's list keeps the same identity when it hasn't changed. So editing one event re-renders only the columns it touches.
- **One set of listeners.** Clicks, double-clicks, keys and pointer events are handled once on the view container, not attached to every event.
- **Cached `Intl` formatters, native `<dialog>`, no date library, no UI kit.** Zero runtime dependencies beyond React.

**Bundle size (v0.3.0, measured from the library build):** 36.3 KB of JS and 13.0 KB of CSS, which is **11.2 KB and 3.1 KB gzipped**. React is external and not included.

**Measured (v0.1.0, production build, 2,000 events loaded, 280 visible in Week view):** switching week, switching view, or toggling full day takes **2–21 ms** from click to committed DOM plus layout.

---

## Project structure

```
Scheduler/
├── package.json                # name: toomstack-scheduler, exports, files, peerDeps
├── vite.config.js              # library build (lib mode, dual ESM/CJS) + Vitest config
├── vite.playground.config.js   # dev harness, aliases the package name to source
├── AGENTS.md                   # instructions for an AI adding this to an app
├── README.md  CHANGELOG.md  LICENSE
├── PACKAGING.md                # release runbook
├── scripts/
│   ├── copy-types.mjs          # .d.ts -> dist, as .d.ts and .d.cts
│   ├── check-version.mjs       # package.json version must equal the VERSION export
│   └── test-pack.mjs           # pack, install, render — the tarball smoke test
├── playground/                 # dev harness; NOT published
│   ├── index.html  main.jsx  index.css
│   └── App.jsx                 # demo host app, imports by package name
└── src/
    └── ToomstackScheduler/     # the published library
        ├── index.js            # public entry
        ├── index.d.ts          # hand-written public types
        ├── ToomstackScheduler.jsx  # root: toolbar, view state, editor/confirm orchestration
        ├── TimeGridView.jsx    # Day / Work Week / Week: grid, events, drag & resize, now marker
        ├── MonthView.jsx       # Month grid
        ├── Dialogs.jsx         # Modal (<dialog>), EventEditor, ConfirmDelete
        ├── fields.js           # DEFAULT_FIELDS
        ├── palette.js          # event colours: PALETTE, resolveEventColor
        ├── filters.js          # filter helpers: colorFilter, makeFieldFilter
        ├── FilterBar.jsx       # toolbar filter control
        ├── layout.js           # overlap layout + per-day event bucketing
        ├── dateUtils.js        # native Date helpers + cached Intl formatting
        ├── scheduler.css       # all styles, tss- prefixed
        └── *.test.{js,jsx}     # Vitest suite
```

Rule: nothing in `src/ToomstackScheduler/` imports from outside that folder. Only `dist/`
and the four docs are published — `files` in `package.json` is what decides, and it must
stay set, because `.gitignore` lists `dist` and npm falls back to it otherwise.

---

## Working on the package itself

| Script | What it does |
|---|---|
| `npm run dev` | Dev harness on :5181, importing by package name, with HMR |
| `npm run build` | Library build into `dist/` + copies the declarations |
| `npm test` | Vitest suite (jsdom) |
| `npm run lint` | oxlint, warnings fail |
| `npm run check` | lint + version gate + tests |
| `npm run verify:package` | build + `publint` + `attw` |
| `npm run test:pack` | pack the real tarball, install it clean, render it |

Adding a feature:

1. `npm run dev`, write it in `src/ToomstackScheduler/`, exercise it in `playground/App.jsx`.
2. Add tests next to the code (`*.test.js` / `*.test.jsx`).
3. Update `index.d.ts` if the public API moved, and `AGENTS.md` if the guidance did.
4. Update this README and `CHANGELOG.md`, and bump the version in **both** `package.json`
   and the `VERSION` export — `npm run check` fails if they disagree.
5. `npm run check`.

---

## Releasing

Four gates run automatically on `npm publish` via `prepublishOnly`; run them by hand first
so nothing surprises you. Full runbook in **[PACKAGING.md](PACKAGING.md)**.

```bash
npm run check && npm run verify:package && npm run test:pack
npm pack --dry-run        # read the file list
npm publish
git tag v0.2.1
```

To try a release in a real app before it becomes what everyone installs:

```bash
npm publish --tag next
cd ../some-app && npm i toomstack-scheduler@next
npm dist-tag add toomstack-scheduler@0.2.1 latest   # once happy
```

For a purely local check, install the **tarball** (`npm pack`, then
`npm i ../Scheduler/toomstack-scheduler-0.2.1.tgz`) — not `npm link` or a `file:` path.
Both of those resolve React from this repo's `node_modules`, giving the consumer two
copies of React and an *Invalid hook call* that looks like a library bug and isn't.

---

## Versioning and changelog

This project uses [Semantic Versioning](https://semver.org/):

- **Minor** bump (`0.1.0 → 0.2.0`) for every new feature.
- **Patch** bump (`0.1.0 → 0.1.1`) for bug fixes.
- **Major** bump for breaking API changes (after 1.0.0).

Every change updates **this README** and **[CHANGELOG.md](CHANGELOG.md)**. The version lives in `package.json` and in the `VERSION` export in `src/ToomstackScheduler/index.js`, and the two must match — `scripts/check-version.mjs` fails the build if they drift, and it runs in `npm run check` and again on publish.

---

## Roadmap

Telerik Scheduler features not built yet:

- All-day events row
- Recurring events (daily/weekly/monthly rules and exceptions)
- Grouping events by resource (staff or room) in side-by-side lanes
- Timeline and Agenda views
- Time zones
- Drag and drop in Month view, and auto-scroll while dragging near the edge
- Localized UI text (i18n for button and label strings)
- Controlled `view`/`date` props with `onViewChange`/`onDateChange`
