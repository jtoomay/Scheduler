import { useEffect, useMemo, useState } from 'react'
// Imported by package name, exactly as a consumer does — a missing export shows up here.
import { DEFAULT_FIELDS, ToomstackScheduler } from 'toomstack-scheduler'
import 'toomstack-scheduler/styles.css'

// Demo host app. The scheduler itself is stateless about data: the host owns `events`.
const STORAGE_KEY = 'toomstack-scheduler-demo-events'
const THEME_KEY = 'toomstack-scheduler-demo-theme'

// The colour picker is opt-in, so the demo adds it to show what that looks like.
const FIELDS = [
  ...DEFAULT_FIELDS.slice(0, 4),
  { name: 'color', label: 'Colour', type: 'color' },
  ...DEFAULT_FIELDS.slice(4),
]

function sampleEvents() {
  const at = (dayOffset, h, m = 0) => {
    const d = new Date()
    d.setDate(d.getDate() + dayOffset)
    d.setHours(h, m, 0, 0)
    return d
  }
  // A spread of palette colours, one arbitrary hex, and one with no colour at all —
  // between them they cover every path through the colour resolver and the filter.
  return [
    { id: 'sample-1', name: 'Jane Doe', email: 'jane@example.com', phone: '555-0100', address: '1 Main St', color: 'azure', start: at(0, 9), end: at(0, 10) },
    { id: 'sample-2', name: 'John Smith', email: 'john@example.com', phone: '555-0101', address: '22 Oak Ave', color: 'crimson', start: at(0, 9, 30), end: at(0, 11) },
    { id: 'sample-3', name: 'Acme Consult', email: 'hello@acme.test', phone: '555-0102', address: '9 Elm Rd', color: 'moss', start: at(1, 13), end: at(1, 14, 30) },
    { id: 'sample-4', name: 'Site survey', email: 'ops@acme.test', phone: '555-0103', address: '40 Birch Ln', color: 'gold', start: at(1, 10), end: at(1, 11) },
    { id: 'sample-5', name: 'Quarterly review', email: 'finance@acme.test', phone: '555-0104', address: 'Head office', color: 'orchid', start: at(2, 14), end: at(2, 16) },
    { id: 'sample-6', name: 'Boiler service', email: 'dispatch@acme.test', phone: '555-0105', address: '7 Cedar Way', color: 'indigo', start: at(2, 9), end: at(2, 10, 30) },
    { id: 'sample-7', name: 'Overflow slot', email: '', phone: '', address: '', color: '#00808a', start: at(3, 11), end: at(3, 12) },
    { id: 'sample-8', name: 'Unassigned call', email: '', phone: '', address: '', start: at(3, 15), end: at(3, 16) },
  ]
}

function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // storage unavailable or corrupt: fall back to samples
  }
  return sampleEvents()
}

function loadTheme() {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    if (raw) return raw === 'dark'
  } catch {
    // ignore
  }
  // The scheduler's own default is light; the demo starts from the OS instead so both
  // themes are easy to see.
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export default function App() {
  const [events, setEvents] = useState(loadEvents)
  const [dark, setDark] = useState(loadTheme)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
    } catch {
      // ignore (private mode, quota, etc.)
    }
  }, [events])

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
    } catch {
      // ignore
    }
  }, [dark])

  const fields = useMemo(() => FIELDS, [])

  return (
    <div className="demo">
      <header className="demo-bar">
        <h1 className="demo-title">ToomstackScheduler</h1>
        <button type="button" className="demo-toggle" onClick={() => setDark((d) => !d)}>
          {dark ? 'Light mode' : 'Dark mode'}
        </button>
      </header>
      <div className="demo-stage">
        <ToomstackScheduler
          events={events}
          fields={fields}
          darkMode={dark}
          onEventCreate={(ev) => setEvents((list) => [...list, ev])}
          onEventUpdate={(ev) => setEvents((list) => list.map((e) => (e.id === ev.id ? ev : e)))}
          onEventDelete={(ev) => setEvents((list) => list.filter((e) => e.id !== ev.id))}
        />
      </div>
    </div>
  )
}
