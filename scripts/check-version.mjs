// The VERSION export is hand-synced with package.json. This turns that comment into
// a gate, because a version that disagrees with the registry is a silent problem.
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const here = resolve(import.meta.dirname, '..')

const { version } = JSON.parse(await readFile(resolve(here, 'package.json'), 'utf8'))
const entry = await readFile(resolve(here, 'src/ToomstackScheduler/index.js'), 'utf8')

const match = entry.match(/export const VERSION = '([^']+)'/)
if (!match) {
  console.error('check-version: no VERSION export found in src/ToomstackScheduler/index.js')
  process.exit(1)
}

if (match[1] !== version) {
  console.error(
    `check-version: package.json is ${version} but the VERSION export is ${match[1]}.\n` +
      '  Bump both, or the published package reports the wrong version at runtime.',
  )
  process.exit(1)
}

console.log(`check-version: ${version} ✓`)
