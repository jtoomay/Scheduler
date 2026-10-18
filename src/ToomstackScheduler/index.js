// Public entry for ToomstackScheduler. Host apps import only from here.
import ToomstackScheduler from './ToomstackScheduler'

export { ToomstackScheduler }
export default ToomstackScheduler
export { DEFAULT_FIELDS } from './fields'
export { PALETTE, PALETTE_NAMES, resolveEventColor } from './palette'
export { colorFilter, DEFAULT_FILTERS, makeFieldFilter, NO_COLOR } from './filters'
export * as dateUtils from './dateUtils'

// Keep in sync with package.json "version".
export const VERSION = '0.2.1'
