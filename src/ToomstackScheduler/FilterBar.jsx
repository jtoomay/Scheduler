import { useEffect, useRef, useState } from 'react'
import { resolveEventColor } from './palette'
import { NO_COLOR } from './filters'

/**
 * Toolbar filter controls, one button and popover per filter definition.
 *
 * The popover is hand-rolled rather than using the native `popover` attribute: where
 * that attribute isn't supported the element renders inline and visible, which is a bad
 * way to fail for a library. A ref plus two document listeners is the same idiom the
 * time grid already uses for its pointer handling, and it behaves the same everywhere.
 */
export default function FilterBar({ filters, state, onChange, events, colorField }) {
  const [openId, setOpenId] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    if (!openId) return
    const onPointerDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpenId(null)
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpenId(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [openId])

  function toggle(filterId, value) {
    const current = state[filterId] ?? []
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    onChange({ ...state, [filterId]: next })
  }

  return (
    <div className="tss-filter-group" ref={ref}>
      {filters.map((f) => {
        const selected = state[f.id] ?? []
        const options = f.options({ events, colorField })
        if (!options.length) return null
        const open = openId === f.id
        return (
          <div key={f.id} className="tss-filter">
            <button
              type="button"
              className={'tss-btn' + (selected.length ? ' tss-active' : '')}
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : f.id)}
            >
              {f.label}
              {selected.length > 0 && <span className="tss-filter-count">{selected.length}</span>}
            </button>

            {open && (
              <div className="tss-popover">
                <div className="tss-popover-title">Showing</div>
                {options.map((o) => {
                  const on = selected.length === 0 || selected.includes(o.value)
                  const c = o.value === NO_COLOR ? null : resolveEventColor(o.value)
                  return (
                    <button
                      key={o.value}
                      type="button"
                      className="tss-filter-opt"
                      aria-pressed={on}
                      onClick={() => toggle(f.id, o.value)}
                    >
                      <span
                        className="tss-swatch"
                        aria-hidden="true"
                        style={c ? { '--tss-sw': c.bg, '--tss-sw-d': c.bgDark } : undefined}
                      />
                      {o.label}
                      <span className="tss-filter-opt-check" aria-hidden="true">
                        ✓
                      </span>
                    </button>
                  )
                })}
                {selected.length > 0 && (
                  <div className="tss-popover-actions">
                    <button
                      type="button"
                      className="tss-btn tss-btn-flat"
                      onClick={() => onChange({ ...state, [f.id]: [] })}
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
