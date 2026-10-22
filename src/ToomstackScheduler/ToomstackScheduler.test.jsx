import { useState } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import ToomstackScheduler from './ToomstackScheduler'
import { DEFAULT_FIELDS } from './fields'
import { makeFieldFilter } from './filters'

// A fixed Monday, so "this week" is the same week on every run.
const MONDAY = new Date(2026, 0, 5)
const at = (day, h, m = 0) => new Date(2026, 0, day, h, m)

const EVENTS = [
  { id: 'a', name: 'Azure appointment', color: 'azure', start: at(5, 9), end: at(5, 10) },
  { id: 'b', name: 'Crimson appointment', color: 'crimson', start: at(6, 11), end: at(6, 12) },
  { id: 'c', name: 'Colourless appointment', start: at(7, 13), end: at(7, 14) },
]

const COLOR_FIELDS = [...DEFAULT_FIELDS, { name: 'color', label: 'Colour', type: 'color' }]

function setup(props = {}) {
  return render(<ToomstackScheduler events={EVENTS} defaultDate={MONDAY} {...props} />)
}

beforeAll(() => {
  // jsdom implements <dialog> but not the modal layer; the editor only needs these two.
  HTMLDialogElement.prototype.showModal ??= function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function close() {
    this.open = false
  }
})

describe('rendering', () => {
  it('renders the toolbar, the grid and every event', () => {
    const { container } = setup()
    expect(container.querySelector('.tss-root')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument()
    expect(screen.getByText('Azure appointment')).toBeInTheDocument()
    expect(screen.getByText('Crimson appointment')).toBeInTheDocument()
    expect(screen.getByText('Colourless appointment')).toBeInTheDocument()
  })

  it('honours titleField', () => {
    render(
      <ToomstackScheduler
        events={[{ id: 'x', label: 'By label', start: at(5, 9), end: at(5, 10) }]}
        defaultDate={MONDAY}
        titleField="label"
      />,
    )
    expect(screen.getByText('By label')).toBeInTheDocument()
  })

  it('accepts ISO strings and timestamps as readily as Dates', () => {
    render(
      <ToomstackScheduler
        events={[
          { id: 'iso', name: 'From ISO', start: at(5, 9).toISOString(), end: at(5, 10).toISOString() },
          { id: 'ms', name: 'From millis', start: at(5, 14).getTime(), end: at(5, 15).getTime() },
        ]}
        defaultDate={MONDAY}
      />,
    )
    expect(screen.getByText('From ISO')).toBeInTheDocument()
    expect(screen.getByText('From millis')).toBeInTheDocument()
  })
})

describe('dark mode', () => {
  it('sets data-theme during render, so there is no flash of the wrong theme', () => {
    const { container } = setup({ darkMode: true })
    expect(container.querySelector('.tss-root')).toHaveAttribute('data-theme', 'dark')
  })

  it('defaults to light', () => {
    const { container } = setup()
    expect(container.querySelector('.tss-root')).toHaveAttribute('data-theme', 'light')
  })

  it('arms the fade only on an actual change, never on mount', () => {
    const { container, rerender } = setup({ darkMode: false })
    const root = container.querySelector('.tss-root')
    expect(root).not.toHaveClass('tss-theme-anim')

    rerender(<ToomstackScheduler events={EVENTS} defaultDate={MONDAY} darkMode />)
    expect(root).toHaveClass('tss-theme-anim')
    expect(root).toHaveAttribute('data-theme', 'dark')

    // A re-render that does not change the theme must not re-arm the transition,
    // or hover and drag would start paying for it.
    root.classList.remove('tss-theme-anim')
    rerender(<ToomstackScheduler events={EVENTS} defaultDate={MONDAY} darkMode />)
    expect(root).not.toHaveClass('tss-theme-anim')
  })

  it('drops the class again once the fade is over', () => {
    vi.useFakeTimers()
    try {
      const { container, rerender } = setup({ darkMode: false })
      const root = container.querySelector('.tss-root')
      rerender(<ToomstackScheduler events={EVENTS} defaultDate={MONDAY} darkMode />)
      expect(root).toHaveClass('tss-theme-anim')
      vi.advanceTimersByTime(400)
      expect(root).not.toHaveClass('tss-theme-anim')
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('per-event colour', () => {
  it('puts both themes on the element, so a theme change repaints without re-rendering', () => {
    const { container } = setup()
    const el = container.querySelector('.tss-event[data-id="a"]')
    expect(el.style.getPropertyValue('--tss-ev-bg')).toBe('#1c73b6')
    expect(el.style.getPropertyValue('--tss-ev-bg-d')).toBe('#1c73b6')
    expect(el.style.getPropertyValue('--tss-ev-ink')).toBe('#ffffff')
  })

  it('leaves an uncoloured event on the global tokens', () => {
    const { container } = setup()
    const el = container.querySelector('.tss-event[data-id="c"]')
    expect(el.style.getPropertyValue('--tss-ev-bg')).toBe('')
  })

  it('reads the colour from colorField', () => {
    const { container } = render(
      <ToomstackScheduler
        events={[{ id: 'h', name: 'Hue', hue: 'gold', start: at(5, 9), end: at(5, 10) }]}
        defaultDate={MONDAY}
        colorField="hue"
      />,
    )
    expect(container.querySelector('.tss-event[data-id="h"]').style.getPropertyValue('--tss-ev-bg')).toBe('#e7b935')
  })
})

describe('views', () => {
  it('switches view and marks the active tab', async () => {
    const user = userEvent.setup()
    setup()
    const month = screen.getByRole('tab', { name: 'Month' })
    await user.click(month)
    expect(month).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('January 2026')).toBeInTheDocument()
  })

  it('shows only the views it is given', () => {
    setup({ views: ['day', 'week'] })
    expect(screen.getByRole('tab', { name: 'Day' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Month' })).not.toBeInTheDocument()
  })
})

describe('filtering', () => {
  const openColourFilter = async (user) => {
    await user.click(screen.getByRole('button', { name: /^Colour/ }))
    return screen.getByText('Showing').parentElement
  }

  it('offers a colour for each one in use, plus a group for the uncoloured', async () => {
    const user = userEvent.setup()
    setup()
    const popover = await openColourFilter(user)
    expect(within(popover).getByRole('button', { name: /Azure/ })).toBeInTheDocument()
    expect(within(popover).getByRole('button', { name: /Crimson/ })).toBeInTheDocument()
    expect(within(popover).getByRole('button', { name: /No colour/ })).toBeInTheDocument()
    // Not in use by any event, so not on offer.
    expect(within(popover).queryByRole('button', { name: /Gold/ })).not.toBeInTheDocument()
  })

  it('hides the events that do not match, and marks the button active', async () => {
    const user = userEvent.setup()
    setup()
    const popover = await openColourFilter(user)
    await user.click(within(popover).getByRole('button', { name: /Azure/ }))

    expect(screen.getByText('Azure appointment')).toBeInTheDocument()
    expect(screen.queryByText('Crimson appointment')).not.toBeInTheDocument()
    expect(screen.queryByText('Colourless appointment')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Colour/ })).toHaveClass('tss-active')
  })

  it('shows an empty state with a way out when the filters hide everything', async () => {
    const user = userEvent.setup()
    // A selection no event matches, which is what a restored filter state looks like
    // once the event carrying that colour is gone.
    setup({ defaultFilterState: { color: ['gold'] } })

    expect(screen.getByText('No events match the selected colours.')).toBeInTheDocument()
    expect(screen.queryByText('Azure appointment')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.queryByText('No events match the selected colours.')).not.toBeInTheDocument()
    expect(screen.getByText('Azure appointment')).toBeInTheDocument()
  })

  it('keeps the uncoloured events when "No colour" is the selection', async () => {
    const user = userEvent.setup()
    setup()
    const popover = await openColourFilter(user)
    await user.click(within(popover).getByRole('button', { name: /No colour/ }))

    expect(screen.getByText('Colourless appointment')).toBeInTheDocument()
    expect(screen.queryByText('Azure appointment')).not.toBeInTheDocument()
    expect(screen.queryByText('No events match the selected colours.')).not.toBeInTheDocument()
  })

  it('clears back to showing everything', async () => {
    const user = userEvent.setup()
    setup()
    const popover = await openColourFilter(user)
    await user.click(within(popover).getByRole('button', { name: /Azure/ }))
    expect(screen.queryByText('Crimson appointment')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByText('Crimson appointment')).toBeInTheDocument()
  })

  it('hides the control entirely when given no filters', () => {
    setup({ filters: [] })
    expect(screen.queryByRole('button', { name: /^Colour/ })).not.toBeInTheDocument()
  })

  it('accepts a custom filter over any field — the extensibility claim', async () => {
    const user = userEvent.setup()
    const filters = [makeFieldFilter({ id: 'status', label: 'Status', field: 'status' })]
    render(
      <ToomstackScheduler
        defaultDate={MONDAY}
        filters={filters}
        events={[
          { id: 's1', name: 'Booked job', status: 'booked', start: at(5, 9), end: at(5, 10) },
          { id: 's2', name: 'Held job', status: 'held', start: at(6, 9), end: at(6, 10) },
        ]}
      />,
    )
    await user.click(screen.getByRole('button', { name: /^Status/ }))
    await user.click(screen.getByRole('button', { name: /booked/ }))
    expect(screen.getByText('Booked job')).toBeInTheDocument()
    expect(screen.queryByText('Held job')).not.toBeInTheDocument()
  })

  it('supports a controlled filterState', async () => {
    const user = userEvent.setup()
    const onFilterStateChange = vi.fn()
    setup({ filterState: { color: ['crimson'] }, onFilterStateChange })

    expect(screen.getByText('Crimson appointment')).toBeInTheDocument()
    expect(screen.queryByText('Azure appointment')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Colour/ }))
    await user.click(screen.getByRole('button', { name: /Azure/ }))
    expect(onFilterStateChange).toHaveBeenCalledWith({ color: ['crimson', 'azure'] })
  })

  it('starts from defaultFilterState when uncontrolled', () => {
    setup({ defaultFilterState: { color: ['azure'] } })
    expect(screen.getByText('Azure appointment')).toBeInTheDocument()
    expect(screen.queryByText('Crimson appointment')).not.toBeInTheDocument()
  })
})

describe('the default editor', () => {
  it('opens on double-click with every default field', async () => {
    setup()
    fireEvent.doubleClick(screen.getByText('Azure appointment'))

    expect(screen.getByText('Edit Event')).toBeInTheDocument()
    expect(screen.getByLabelText(/Name/)).toHaveValue('Azure appointment')
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Phone Number/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Address/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Start/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^End/)).toBeInTheDocument()
  })

  it('saves an edit through onEventUpdate, with Dates for start and end', async () => {
    const user = userEvent.setup()
    const onEventUpdate = vi.fn()
    setup({ onEventUpdate })

    fireEvent.doubleClick(screen.getByText('Azure appointment'))
    const name = screen.getByLabelText(/Name/)
    await user.clear(name)
    await user.type(name, 'Renamed')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onEventUpdate).toHaveBeenCalledTimes(1)
    const saved = onEventUpdate.mock.calls[0][0]
    expect(saved).toMatchObject({ id: 'a', name: 'Renamed', color: 'azure' })
    expect(saved.start).toBeInstanceOf(Date)
    expect(saved.end).toBeInstanceOf(Date)
  })

  it('refuses an end at or before the start', async () => {
    const user = userEvent.setup()
    const onEventUpdate = vi.fn()
    setup({ onEventUpdate })

    fireEvent.doubleClick(screen.getByText('Azure appointment'))
    fireEvent.change(screen.getByLabelText(/^End/), { target: { value: '2026-01-05T08:00' } })
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByRole('alert')).toHaveTextContent('End time must be after the start time.')
    expect(onEventUpdate).not.toHaveBeenCalled()
  })

  it('shows the colour picker only when a color field is configured', async () => {
    setup({ fields: COLOR_FIELDS })
    fireEvent.doubleClick(screen.getByText('Azure appointment'))
    const group = screen.getByRole('group', { name: 'Colour' })
    expect(within(group).getByRole('button', { name: 'azure' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(group).getAllByRole('button')).toHaveLength(8) // seven colours + none
  })

  it('stores the palette name the swatch stands for', async () => {
    const user = userEvent.setup()
    const onEventUpdate = vi.fn()
    setup({ fields: COLOR_FIELDS, onEventUpdate })

    fireEvent.doubleClick(screen.getByText('Azure appointment'))
    await user.click(within(screen.getByRole('group', { name: 'Colour' })).getByRole('button', { name: 'gold' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onEventUpdate.mock.calls[0][0].color).toBe('gold')
  })

  it('deletes only after the confirmation', async () => {
    const user = userEvent.setup()
    const onEventDelete = vi.fn()
    setup({ onEventDelete })

    fireEvent.doubleClick(screen.getByText('Azure appointment'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByText('Delete Event')).toBeInTheDocument()
    expect(onEventDelete).not.toHaveBeenCalled()

    await user.click(screen.getAllByRole('button', { name: 'Delete' }).at(-1))
    expect(onEventDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }))
  })

  it('is read-only with editable={false}', async () => {
    setup({ editable: false })
    fireEvent.doubleClick(screen.getByText('Azure appointment'))
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Name/)).toBeDisabled()
  })
})

describe('renderFields', () => {
  // Module-scope-equivalent: defined once, outside render. An inline arrow would
  // remount the body on every keystroke.
  function CustomBody({ value, onChange, mode, editable }) {
    const [touched, setTouched] = useState(false)
    return (
      <div>
        <span data-testid="mode">{mode}</span>
        <span data-testid="editable">{String(editable)}</span>
        <span data-testid="touched">{String(touched)}</span>
        <label htmlFor="ref">Reference</label>
        <input
          id="ref"
          value={value.reference ?? ''}
          onChange={(e) => {
            setTouched(true)
            onChange({ reference: e.target.value })
          }}
        />
        <span data-testid="start">{value.start?.toISOString() ?? ''}</span>
      </div>
    )
  }

  it('replaces the non-datetime rows but keeps start and end', async () => {
    setup({ renderFields: CustomBody })
    fireEvent.doubleClick(screen.getByText('Azure appointment'))

    expect(screen.getByLabelText('Reference')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Email/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Phone Number/)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/^Start/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^End/)).toBeInTheDocument()
  })

  it('receives mode and editable', () => {
    setup({ renderFields: CustomBody, editable: false })
    fireEvent.doubleClick(screen.getByText('Azure appointment'))
    expect(screen.getByTestId('mode')).toHaveTextContent('edit')
    expect(screen.getByTestId('editable')).toHaveTextContent('false')
  })

  it('can use hooks, because it is rendered as an element and not called', async () => {
    const user = userEvent.setup()
    setup({ renderFields: CustomBody })
    fireEvent.doubleClick(screen.getByText('Azure appointment'))
    expect(screen.getByTestId('touched')).toHaveTextContent('false')
    await user.type(screen.getByLabelText('Reference'), 'X')
    expect(screen.getByTestId('touched')).toHaveTextContent('true')
  })

  it('merges the custom draft on save, with the built-in start and end winning', async () => {
    const user = userEvent.setup()
    const onEventUpdate = vi.fn()
    setup({ renderFields: CustomBody, onEventUpdate })

    fireEvent.doubleClick(screen.getByText('Azure appointment'))
    await user.type(screen.getByLabelText('Reference'), 'INV-900')
    fireEvent.change(screen.getByLabelText(/^End/), { target: { value: '2026-01-05T16:30' } })
    await user.click(screen.getByRole('button', { name: 'Save' }))

    const saved = onEventUpdate.mock.calls[0][0]
    expect(saved.reference).toBe('INV-900')
    // Untouched properties survive, and the datetime rows own start/end.
    expect(saved.name).toBe('Azure appointment')
    expect(saved.end.getHours()).toBe(16)
    expect(saved.end.getMinutes()).toBe(30)
  })

  it('still validates start and end', async () => {
    const user = userEvent.setup()
    const onEventUpdate = vi.fn()
    setup({ renderFields: CustomBody, onEventUpdate })

    fireEvent.doubleClick(screen.getByText('Azure appointment'))
    fireEvent.change(screen.getByLabelText(/^End/), { target: { value: '2026-01-05T08:00' } })
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(onEventUpdate).not.toHaveBeenCalled()
  })
})

describe('time grid fills the viewport', () => {
  const BUSINESS = 9 * 60
  const FULL_DAY = 24 * 60
  const SLOT_MINUTES = 30
  const box = { viewport: 900, header: 48 }
  let observers = []
  let restore = []

  function metricHeight(el) {
    if (!el?.classList) return null
    if (el.classList.contains('tss-viewport') || el.classList.contains('tss-timegrid')) return box.viewport
    if (el.classList.contains('tss-tg-head')) return box.header
    return null
  }

  function patchMetric(proto, name) {
    const previous = Object.getOwnPropertyDescriptor(proto, name)
    Object.defineProperty(proto, name, {
      configurable: true,
      get() {
        const height = metricHeight(this)
        if (height != null) return height
        if (previous?.get) return previous.get.call(this)
        return 0
      },
    })
    return () => {
      if (previous) Object.defineProperty(proto, name, previous)
      else delete proto[name]
    }
  }

  beforeEach(() => {
    box.viewport = 900
    box.header = 48
    observers = []
    const previousCapture = HTMLElement.prototype.setPointerCapture
    HTMLElement.prototype.setPointerCapture = () => {}
    // jsdom has no PointerEvent, so fireEvent would build a plain Event and drop
    // clientX/clientY/button. A MouseEvent subclass keeps those, which drag needs.
    const previousPointerEvent = window.PointerEvent
    window.PointerEvent = class PointerEvent extends MouseEvent {
      constructor(type, init = {}) {
        super(type, init)
        this.pointerId = init.pointerId ?? 1
        this.pointerType = init.pointerType ?? 'mouse'
      }
    }
    const previousRO = globalThis.ResizeObserver
    globalThis.ResizeObserver = class {
      constructor(callback) {
        this.callback = callback
        observers.push(this)
      }
      observe() {}
      unobserve() {}
      disconnect() {
        observers = observers.filter((observer) => observer !== this)
      }
    }
    window.ResizeObserver = globalThis.ResizeObserver
    restore = [
      patchMetric(Element.prototype, 'clientHeight'),
      patchMetric(HTMLElement.prototype, 'offsetHeight'),
      () => {
        if (previousCapture) HTMLElement.prototype.setPointerCapture = previousCapture
        else delete HTMLElement.prototype.setPointerCapture
        window.PointerEvent = previousPointerEvent
        globalThis.ResizeObserver = previousRO
        window.ResizeObserver = previousRO
      },
    ]
  })

  afterEach(() => {
    for (const undo of restore) undo()
    restore = []
  })

  function resizeTo(viewport, header = box.header) {
    box.viewport = viewport
    box.header = header
    act(() => {
      for (const observer of observers) observer.callback()
    })
  }

  function bodyOf(container) {
    return container.querySelector('.tss-tg-body')
  }

  /** The grid either fills the measured viewport or stays at the slotHeight floor. */
  function expectGrid(container, minutes, slotHeight = 28) {
    const body = bodyOf(container)
    const room = box.viewport - box.header
    const floor = (minutes / SLOT_MINUTES) * slotHeight
    const height = parseFloat(body.style.height)
    const slot = parseFloat(body.style.getPropertyValue('--tss-slot-h'))
    if (room > floor) {
      expect(height).toBeCloseTo(room, 5)
      expect(height + box.header).toBeCloseTo(box.viewport, 5)
      expect(slot).toBeCloseTo((room / minutes) * SLOT_MINUTES, 5)
      expect(slot).toBeGreaterThan(slotHeight)
    } else {
      expect(height).toBeCloseTo(floor, 5)
      expect(height).toBeGreaterThan(room)
      expect(slot).toBeCloseTo(slotHeight, 5)
    }
    expect(parseFloat(body.style.getPropertyValue('--tss-hour-h'))).toBeCloseTo((height / minutes) * 60, 5)
    return { height, slot, pxPerMin: height / minutes }
  }

  it('stretches business hours to the footer and uses that scale for events, drag, and create', () => {
    const onEventUpdate = vi.fn()
    const { container } = render(
      <ToomstackScheduler events={EVENTS} defaultDate={MONDAY} height={700} onEventUpdate={onEventUpdate} />,
    )

    const { pxPerMin, slot } = expectGrid(container, BUSINESS)
    const event = container.querySelector('.tss-event[data-id="a"]')
    // 9:00 is one hour into the 8:00 business range.
    expect(parseFloat(event.style.top)).toBeCloseTo(pxPerMin * 60, 4)
    expect(parseFloat(event.style.height)).toBeCloseTo(pxPerMin * 60, 4)
    expect(container.querySelector('.tss-root').style.height).toBe('700px')

    const footer = container.querySelector('.tss-footer')
    const viewport = container.querySelector('.tss-viewport')
    expect(viewport.contains(footer)).toBe(false)
    expect(viewport.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    // Dragging one drawn slot must move the event by slotMinutes, not by the minimum scale.
    const dy = slot
    fireEvent.pointerDown(event.querySelector('.tss-resize'), { button: 0, pointerId: 1, clientX: 20, clientY: 20 })
    fireEvent.pointerMove(event, { button: 0, pointerId: 1, clientX: 20, clientY: 20 + dy })
    fireEvent.pointerUp(event, { button: 0, pointerId: 1, clientX: 20, clientY: 20 + dy })
    expect(onEventUpdate).toHaveBeenCalledTimes(1)
    const resized = onEventUpdate.mock.calls[0][0]
    expect(resized.start.getHours()).toBe(9)
    expect(resized.start.getMinutes()).toBe(0)
    expect(resized.end.getHours()).toBe(10)
    expect(resized.end.getMinutes()).toBe(30)

    const monday = container.querySelector(`.tss-tg-col[data-day-ms="${MONDAY.getTime()}"]`)
    fireEvent.doubleClick(monday, { clientY: slot * 2 + 2 })
    expect(screen.getByLabelText(/^Start/)).toHaveValue('2026-01-05T09:00')
    expect(screen.getByLabelText(/^End/)).toHaveValue('2026-01-05T09:30')
  })

  it('scrolls a short viewport and does not shrink rows below slotHeight', () => {
    box.viewport = 360
    const { container, rerender } = render(
      <ToomstackScheduler events={EVENTS} defaultDate={MONDAY} height={700} />,
    )

    const { pxPerMin } = expectGrid(container, BUSINESS)
    const event = container.querySelector('.tss-event[data-id="a"]')
    expect(parseFloat(event.style.top)).toBeCloseTo(pxPerMin * 60, 4)
    expect(pxPerMin).toBeCloseTo(28 / SLOT_MINUTES, 5)

    const viewport = container.querySelector('.tss-viewport')
    const timegrid = container.querySelector('.tss-timegrid')
    expect(viewport.contains(timegrid)).toBe(true)
    expect(timegrid.contains(bodyOf(container))).toBe(true)
    // The rows stay at the floor, so the scrollport inside .tss-viewport scrolls.
    expect(getComputedStyle(timegrid).overflow).toBe('auto')
    expect(container.querySelector('.tss-root').style.height).toBe('700px')

    rerender(<ToomstackScheduler events={EVENTS} defaultDate={MONDAY} height={700} slotHeight={40} />)
    const raised = expectGrid(container, BUSINESS, 40)
    expect(raised.slot).toBeCloseTo(40, 5)
    expect(parseFloat(container.querySelector('.tss-event[data-id="a"]').style.top)).toBeCloseTo(raised.pxPerMin * 60, 4)
  })

  it('updates the grid when the full day is toggled, the view changes, and the panel is resized', async () => {
    const user = userEvent.setup()
    const { container } = render(<ToomstackScheduler events={EVENTS} defaultDate={MONDAY} height={700} />)

    expectGrid(container, BUSINESS)

    await user.click(screen.getByRole('button', { name: 'Show full day' }))
    expectGrid(container, FULL_DAY)
    expect(bodyOf(container).style.getPropertyValue('--tss-slot-h')).toBe('28px')

    resizeTo(1800)
    expectGrid(container, FULL_DAY)

    await user.click(screen.getByRole('button', { name: 'Show business hours' }))
    expectGrid(container, BUSINESS)

    // A view change remeasures even without a resize notification.
    box.viewport = 1200
    expect(parseFloat(bodyOf(container).style.height)).toBeCloseTo(1800 - 48, 5)
    await user.click(screen.getByRole('tab', { name: 'Day' }))
    expectGrid(container, BUSINESS)

    box.header = 80
    await user.click(screen.getByRole('tab', { name: 'Work Week' }))
    expectGrid(container, BUSINESS)

    await user.click(screen.getByRole('tab', { name: 'Month' }))
    expect(container.querySelector('.tss-month')).toBeInTheDocument()
    expect(container.querySelector('.tss-tg-body')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Week' }))
    expectGrid(container, BUSINESS)
  })
})
