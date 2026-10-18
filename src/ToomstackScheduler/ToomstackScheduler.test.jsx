import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
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
