// Copies the hand-written declarations into dist/ under both names the exports map
// points at. `.d.cts` is a byte-identical copy: the public API is the same either way,
// and attw wants a declaration file beside each entry point.
import { copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const here = resolve(import.meta.dirname, '..')
const src = resolve(here, 'src/ToomstackScheduler/index.d.ts')

await copyFile(src, resolve(here, 'dist/index.d.ts'))
await copyFile(src, resolve(here, 'dist/index.d.cts'))

console.log('copy-types: dist/index.d.ts, dist/index.d.cts')
