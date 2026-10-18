/**
 * Default editor fields. Extend with: fields={[...DEFAULT_FIELDS, { name: 'notes', label: 'Notes', type: 'textarea' }]}
 *
 * Field shape: { name, label, type, required?, placeholder?, options?, rows? }
 * Types: text | email | tel | url | number | textarea | select | checkbox | datetime | color
 * `color` stores a palette name (e.g. 'azure') and is opt-in:
 * fields={[...DEFAULT_FIELDS, { name: 'color', label: 'Colour', type: 'color' }]}
 * `start` and `end` (type "datetime") are required for an event to be placed on the calendar.
 */
export const DEFAULT_FIELDS = Object.freeze([
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Phone Number', type: 'tel' },
  { name: 'address', label: 'Address', type: 'textarea', rows: 2 },
  { name: 'start', label: 'Start', type: 'datetime', required: true },
  { name: 'end', label: 'End', type: 'datetime', required: true },
])
