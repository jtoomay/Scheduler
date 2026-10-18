# Using `toomstack-scheduler`

Instructions for an AI assistant adding this package to a React app. Written as rules to
follow, not as documentation to summarise. Target: React 18+ with Vite. Full reference is
in `README.md`.

## Install

```bash
npm i toomstack-scheduler
```

`react` and `react-dom` (>=18) are peer dependencies — the app already has them. Do not
install them again inside the package, and do not add the scheduler as a dependency of a
library that also bundles React.

## The two mistakes that break it

**1. Import the stylesheet.** It ships separately so it can be themed and so bundlers
don't inject it twice. Import it once, at the app entry:

```jsx
import 'toomstack-scheduler/styles.css'
```

Without it the scheduler renders as a column of unstyled divs with no grid. This looks
like a broken package and is not.

**2. Give the parent a height.** `height` defaults to `'100%'`, so a parent with no
resolved height collapses the grid to nothing. Either set `height` explicitly
(`height={700}`, `height="80vh"`) or put it in a container that has a real height — and
remember `min-height: 0` on a flex child, or it will overflow instead of scrolling.

## The data model

The scheduler holds **no event state**. It never mutates the array it is given. The app
owns the events and updates them from three callbacks:

| Callback | Fires when | Gives you |
|---|---|---|
| `onEventCreate(event)` | Save in the New Event window | The new event, `id` already generated |
| `onEventUpdate(event)` | Save in the Edit window, **or** after a drag or resize | The full updated event |
| `onEventDelete(event)` | The user confirms the delete | The event being removed |

Match by `id`, never by object identity.

An event:

```js
{
  id: 'abc123',        // required, unique — string or number
  name: 'Jane Doe',    // the title (rename with titleField)
  start: Date,         // required — Date, ISO string, or ms timestamp
  end: Date,           // required, after start
  color: 'azure',      // optional (rename with colorField)
  // anything else is kept and handed back untouched
}
```

`start`/`end` accept a `Date`, an ISO string or a timestamp, so JSON straight from an API
or `localStorage` works with no conversion. **Callbacks always hand them back as `Date`
objects** — serialise them yourself before storing.

## Minimal working component

```jsx
import { useCallback, useState } from 'react'
import { ToomstackScheduler } from 'toomstack-scheduler'
import 'toomstack-scheduler/styles.css'

export default function Calendar() {
  const [events, setEvents] = useState([
    { id: '1', name: 'Jane Doe', color: 'azure', start: new Date(2026, 0, 5, 9), end: new Date(2026, 0, 5, 10) },
  ])

  const create = useCallback((ev) => setEvents((list) => [...list, ev]), [])
  const update = useCallback(
    (ev) => setEvents((list) => list.map((e) => (e.id === ev.id ? ev : e))),
    [],
  )
  const remove = useCallback((ev) => setEvents((list) => list.filter((e) => e.id !== ev.id)), [])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ToomstackScheduler
          events={events}
          onEventCreate={create}
          onEventUpdate={update}
          onEventDelete={remove}
        />
      </div>
    </div>
  )
}
```

## Colours

Set `color` on the event to a palette name or any hex:

```
indigo  azure  moss  gold  crimson  orchid  graphite
```

A hex gets contrast handling automatically: readable label ink, and lightened in the dark
theme so the block doesn't dissolve into the grid. Use `colorField="hue"` if the colour
lives on another property. Events with no colour fall back to the default event styling.

To let the user pick a colour, add the opt-in field:

```jsx
import { DEFAULT_FIELDS } from 'toomstack-scheduler'

// Module scope, not inside the component — see "Stable references" below.
const FIELDS = [...DEFAULT_FIELDS, { name: 'color', label: 'Colour', type: 'color' }]
```

## Dark mode

`darkMode` is a boolean the **app** owns. The scheduler does not read the OS preference
itself — that is the app's decision, and the prop exists so it can follow whatever the
rest of the UI does. The colours fade when it changes, and `color-scheme` is set so native
date pickers and scrollbars follow.

```jsx
const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
<ToomstackScheduler darkMode={dark} ... />
```

## Changing the editor

Two levels, in order of preference.

**`fields`** — a different set of inputs, still using the built-in rows and validation:

```jsx
const FIELDS = [
  { name: 'name', label: 'Customer', type: 'text', required: true },
  { name: 'job', label: 'Job type', type: 'select', options: ['Install', 'Repair'] },
  { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
  { name: 'start', label: 'Start', type: 'datetime', required: true },
  { name: 'end', label: 'End', type: 'datetime', required: true },
]
```

Types: `text email tel url number textarea select checkbox datetime color`. The `start` and
`end` datetime fields are required for an event to be placed on the calendar.

**`renderFields`** — your own component in place of every non-datetime row, for data the
built-in field types cannot express:

```jsx
// MUST be defined at module scope (or memoized). See below.
function JobFields({ value, onChange, mode, editable, error }) {
  return (
    <>
      <label htmlFor="customer">Customer</label>
      <input
        id="customer"
        value={value.customer ?? ''}
        onChange={(e) => onChange({ customer: e.target.value })}
        disabled={!editable}
      />
      {error && <p role="alert">{error}</p>}
    </>
  )
}

<ToomstackScheduler renderFields={JobFields} ... />
```

It receives `{ value, onChange, event, mode, editable, error }`. `onChange` takes a patch
object or an updater function. It may use hooks. `start` and `end` stay owned by the
built-in datetime rows, so they keep their validation — read them from `value`, but let
those rows set them.

> **`renderFields` must be a stable reference.** An inline arrow function (`renderFields={(p) => <JobFields {...p} />}`)
> is a new component type on every render, which remounts the editor body on every
> keystroke and drops the caret. Define it at module scope, or wrap it in `useMemo`.

## Filtering

A colour filter appears in the toolbar by default. `filters={[]}` removes the control.

Add a filter over any event property:

```jsx
import { colorFilter, makeFieldFilter } from 'toomstack-scheduler'

const FILTERS = [
  colorFilter,
  makeFieldFilter({ id: 'status', label: 'Status', field: 'status' }),
]
```

Options are derived from the events actually loaded, so only values in use are offered. An
empty selection means that filter is off and everything shows. Within one filter the
selected values are ORed; across filters they are ANDed.

Control the selection if you need to persist it: pass `filterState` plus
`onFilterStateChange`. The shape is `{ [filterId]: string[] }`. `defaultFilterState` sets
the initial selection and leaves the component uncontrolled.

For something `makeFieldFilter` cannot express, pass a plain object:
`{ id, label, options(ctx), test(event, selected, ctx) }`.

## Stable references

Pass `views`, `fields`, `filters`, `workWeekDays`, `businessHours` and `renderFields` as
**module-level constants or `useMemo` values**. A fresh array or object literal on every
render invalidates the memoized day columns and makes the grid re-render for nothing. This
is the difference between a scheduler that stays smooth at a few thousand events and one
that does not.

## Theming

Every class is prefixed `tss-`. Colours, spacing and shadows are `--tss-*` custom
properties on `.tss-root`, overridable globally or per instance:

```jsx
<ToomstackScheduler style={{ '--tss-primary': '#7c3aed', '--tss-event-bg': '#334155' }} />
```

Do not write selectors against the internal DOM structure; it is not part of the API. Use
the variables, `className`, or the documented classes in `README.md`.

## Boundaries

- **Browser DOM only.** It uses pointer events and `<dialog>`. It is not React Native.
- **Client-side.** It renders on the server, but it is interactive only in the browser. In
  Next.js App Router put it in a component marked `'use client'` (the build already carries
  the directive, but the importing file needs it too if it has other client code).
- **Import only** `toomstack-scheduler` and `toomstack-scheduler/styles.css`. Anything
  under `dist/` beyond those is internal and will change without a major version.
- **Zero runtime dependencies.** If something seems to need another package, it probably
  belongs in the host app.

## Full prop list

29 props, all optional except that nothing shows without `events`. See the table in
`README.md` under **Props reference**, and `dist/index.d.ts` for exact types. The ones most
often needed: `events`, `onEventCreate`, `onEventUpdate`, `onEventDelete`, `defaultView`,
`views`, `fields`, `darkMode`, `businessHours`, `slotMinutes`, `snapMinutes`,
`weekStartsOn`, `editable`, `height`.
