import { createElement, useEffect, useRef, useState } from 'react'
import { fromInputValue, toInputValue } from './dateUtils'
import { PALETTE_NAMES, resolveEventColor } from './palette'

/** Native <dialog> modal: focus trapping, Esc-to-close and backdrop for free. */
export function Modal({ title, onClose, className = '', children }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog.open) dialog.showModal()
    // showModal() focuses the first focusable element (the close button); prefer the marked field.
    dialog.querySelector('[data-autofocus]')?.focus()
    return () => dialog.open && dialog.close()
  }, [])
  return (
    <dialog
      ref={ref}
      className={'tss-dialog ' + className}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <div className="tss-dialog-head">
        <span className="tss-dialog-title">{title}</span>
        <button type="button" className="tss-icon-btn" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  )
}

function initialValues(fields, event) {
  const values = {}
  for (const f of fields) {
    const v = event[f.name]
    if (f.type === 'datetime') values[f.name] = toInputValue(v)
    else if (f.type === 'checkbox') values[f.name] = !!v
    else values[f.name] = v ?? ''
  }
  return values
}

function readValues(fields, values, event) {
  const out = { ...event }
  for (const f of fields) {
    const v = values[f.name]
    if (f.type === 'datetime') out[f.name] = fromInputValue(v)
    else if (f.type === 'number') out[f.name] = v === '' ? null : Number(v)
    else out[f.name] = v
  }
  return out
}

/** The appointment editor window. Fields are driven entirely by the `fields` config. */
export function EventEditor({ mode, event, fields, editable, renderFields, onSave, onCancel, onDelete }) {
  const [values, setValues] = useState(() => initialValues(fields, event))
  // Event-shaped draft for a custom `renderFields` body; `values` stays raw strings for the built-in inputs.
  const [customDraft, setCustomDraft] = useState(() => ({ ...event }))
  const [error, setError] = useState('')
  const set = (name, value) => setValues((v) => ({ ...v, [name]: value }))
  const patchDraft = (patch) =>
    setCustomDraft((d) => ({ ...d, ...(typeof patch === 'function' ? patch(d) : patch) }))

  function submit(e) {
    e.preventDefault()
    const built = readValues(fields, values, event)
    let next = built
    if (renderFields) {
      next = { ...built, ...customDraft }
      next.start = built.start
      next.end = built.end
    }
    if (!(next.start instanceof Date) || Number.isNaN(next.start.getTime())) return setError('Start time is required.')
    if (!(next.end instanceof Date) || Number.isNaN(next.end.getTime())) return setError('End time is required.')
    if (next.end <= next.start) return setError('End time must be after the start time.')
    onSave(next)
  }

  const built = renderFields ? readValues(fields, values, event) : null

  return (
    <Modal title={mode === 'create' ? 'New Event' : 'Edit Event'} onClose={onCancel} className="tss-editor">
      <form onSubmit={submit}>
        <fieldset className="tss-form" disabled={!editable}>
          {renderFields &&
            // An element, not a call, so hook-using components work and plain functions still do.
            createElement(renderFields, {
              value: { ...customDraft, start: built.start, end: built.end },
              onChange: patchDraft,
              event,
              mode,
              editable,
              error,
            })}
          {fields.map((f, i) => {
            if (renderFields && f.type !== 'datetime') return null
            const id = `tss-f-${f.name}`
            const common = {
              id,
              name: f.name,
              required: f.required,
              placeholder: f.placeholder,
              'data-autofocus': i === 0 ? '' : undefined,
            }
            let input
            if (f.type === 'textarea') {
              input = <textarea {...common} rows={f.rows ?? 3} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)} />
            } else if (f.type === 'select') {
              input = (
                <select {...common} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)}>
                  <option value="" />
                  {(f.options ?? []).map((o) => {
                    const opt = typeof o === 'object' ? o : { value: o, label: o }
                    return (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    )
                  })}
                </select>
              )
            } else if (f.type === 'color') {
              input = (
                <div className="tss-swatch-row" role="group" aria-label={f.label ?? f.name}>
                  {PALETTE_NAMES.map((name) => {
                    const c = resolveEventColor(name)
                    return (
                      <button
                        key={name}
                        type="button"
                        className="tss-swatch"
                        style={{ '--tss-sw': c.bg, '--tss-sw-d': c.bgDark }}
                        aria-label={name}
                        aria-pressed={values[f.name] === name}
                        onClick={() => set(f.name, name)}
                      />
                    )
                  })}
                  <button type="button" className="tss-swatch-none" aria-label="No colour" aria-pressed={!values[f.name]} onClick={() => set(f.name, '')}>
                    ×
                  </button>
                </div>
              )
            } else if (f.type === 'checkbox') {
              input = <input {...common} type="checkbox" checked={values[f.name]} onChange={(e) => set(f.name, e.target.checked)} />
            } else {
              input = (
                <input
                  {...common}
                  type={f.type === 'datetime' ? 'datetime-local' : (f.type ?? 'text')}
                  value={values[f.name]}
                  onChange={(e) => set(f.name, e.target.value)}
                />
              )
            }
            return (
              <div className="tss-form-row" key={f.name}>
                <label htmlFor={id}>
                  {f.label ?? f.name}
                  {f.required && <span className="tss-req"> *</span>}
                </label>
                {input}
              </div>
            )
          })}
        </fieldset>
        {error && <div className="tss-form-error" role="alert">{error}</div>}
        <div className="tss-dialog-actions">
          {mode === 'edit' && editable && (
            <button type="button" className="tss-btn tss-btn-danger tss-left" onClick={onDelete}>
              Delete
            </button>
          )}
          <button type="button" className="tss-btn" onClick={onCancel}>
            Cancel
          </button>
          {editable && (
            <button type="submit" className="tss-btn tss-btn-primary">
              Save
            </button>
          )}
        </div>
      </form>
    </Modal>
  )
}

export function ConfirmDelete({ event, titleField, onConfirm, onCancel }) {
  return (
    <Modal title="Delete Event" onClose={onCancel} className="tss-confirm">
      <p className="tss-confirm-text">
        Are you sure you want to delete <strong>{event[titleField] || 'this event'}</strong>?
      </p>
      <div className="tss-dialog-actions">
        <button type="button" className="tss-btn" onClick={onCancel} data-autofocus="">
          Cancel
        </button>
        <button type="button" className="tss-btn tss-btn-danger" onClick={onConfirm}>
          Delete
        </button>
      </div>
    </Modal>
  )
}
