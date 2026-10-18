/**
 * The gate the unit tests and publint structurally cannot replace: build the real
 * tarball, install it somewhere clean, and use it the way a consumer does.
 *
 * It catches three failures that are invisible everywhere else:
 *   - a missing `files` entry, so dist never ships (.gitignore lists dist, so this is
 *     one deleted line away at all times);
 *   - a stylesheet that was never emitted, or emitted under another name;
 *   - two copies of React, which in a real app shows up only as "Invalid hook call".
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const run = (cmd, args, cwd = root) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })

const failures = []
const check = (ok, label) => {
  console.log(`  ${ok ? '✓' : '✗'} ${label}`)
  if (!ok) failures.push(label)
}

console.log('\ntest-pack: building')
run('npm', ['run', 'build'])

console.log('\ntest-pack: build output')
const dist = (f) => join(root, 'dist', f)
for (const f of ['index.js', 'index.cjs', 'index.d.ts', 'index.d.cts', 'styles.css']) {
  check(existsSync(dist(f)), `dist/${f} exists`)
}

const esm = existsSync(dist('index.js')) ? readFileSync(dist('index.js'), 'utf8') : ''
check(esm.startsWith('"use client";'), 'dist/index.js opens with the "use client" banner')
check(/from\s*["']react["']/.test(esm), 'react is imported (externalized), not inlined')
// React inlined would add hundreds of KB. The whole library is a few tens.
check(esm.length < 150_000, `dist/index.js stays small (${esm.length} bytes), so no React is bundled`)

const css = existsSync(dist('styles.css')) ? readFileSync(dist('styles.css'), 'utf8') : ''
check(css.length > 1000, `dist/styles.css is non-trivial (${css.length} bytes)`)
check(css.includes('.tss-root'), 'dist/styles.css contains .tss-root')
// The minifier strips the quotes from attribute selectors, so match either form.
check(/\[data-theme=['"]?dark['"]?\]/.test(css), 'dist/styles.css contains the dark theme')
check(css.includes('tss-theme-anim'), 'dist/styles.css contains the theme fade')
check(css.includes('prefers-reduced-motion'), 'dist/styles.css keeps the reduced-motion guard')

console.log('\ntest-pack: packing')
const work = mkdtempSync(join(tmpdir(), 'tss-pack-'))
try {
  const packed = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', work]))
  const tgz = join(work, packed[0].filename)
  const shipped = packed[0].files.map((f) => f.path)

  check(shipped.some((p) => p === 'dist/index.js'), 'tarball ships dist/index.js')
  check(shipped.some((p) => p === 'dist/styles.css'), 'tarball ships dist/styles.css')
  check(shipped.includes('AGENTS.md'), 'tarball ships AGENTS.md')
  check(shipped.includes('LICENSE'), 'tarball ships LICENSE')
  check(!shipped.some((p) => p.startsWith('src/')), 'tarball ships no src/')
  check(!shipped.some((p) => p.startsWith('playground/')), 'tarball ships no playground/')
  check(!shipped.some((p) => p.endsWith('vite.config.js')), 'tarball ships no config files')

  console.log('\ntest-pack: installing into a clean project')
  const app = join(work, 'app')
  run('mkdir', ['-p', app])
  writeFileSync(
    join(app, 'package.json'),
    JSON.stringify({ name: 'pack-smoke-test', private: true, version: '0.0.0', type: 'module' }, null, 2),
  )
  run('npm', ['install', '--no-audit', '--no-fund', '--silent', tgz, 'react', 'react-dom'], app)

  // Use it exactly as a consumer would: named import, server-render, look at the markup.
  writeFileSync(
    join(app, 'smoke.mjs'),
    `import { createRequire } from 'node:module'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ToomstackScheduler, {
  DEFAULT_FIELDS, DEFAULT_FILTERS, NO_COLOR, PALETTE, PALETTE_NAMES,
  ToomstackScheduler as Named, VERSION, colorFilter, dateUtils,
  makeFieldFilter, resolveEventColor,
} from 'toomstack-scheduler'

const out = {}
out.exports = [
  typeof ToomstackScheduler === 'function', typeof Named === 'function',
  Array.isArray(DEFAULT_FIELDS), Array.isArray(DEFAULT_FILTERS),
  NO_COLOR === '__none', typeof PALETTE === 'object', PALETTE_NAMES.length === 7,
  typeof colorFilter === 'object', typeof makeFieldFilter === 'function',
  typeof resolveEventColor === 'function', typeof dateUtils.toDate === 'function',
  typeof VERSION === 'string',
].every(Boolean)
out.version = VERSION

const start = new Date(2026, 0, 5, 9)
const end = new Date(2026, 0, 5, 10)
const html = renderToStaticMarkup(
  createElement(ToomstackScheduler, {
    events: [{ id: 'a', name: 'Pack smoke test', color: 'azure', start, end }],
    defaultDate: start,
    darkMode: true,
  }),
)
out.renders = html.includes('tss-root')
out.title = html.includes('Pack smoke test')
out.theme = html.includes('data-theme="dark"')
out.colorVar = html.includes('--tss-ev-bg')

const require = createRequire(import.meta.url)
const cjs = require('toomstack-scheduler')
out.cjs = typeof cjs.ToomstackScheduler === 'function' && cjs.VERSION === VERSION

const reactPaths = new Set([
  require.resolve('react', { paths: [process.cwd()] }),
  require.resolve('react', { paths: [require.resolve('toomstack-scheduler')] }),
])
out.oneReact = reactPaths.size === 1

out.css = require('node:fs').readFileSync(
  require.resolve('toomstack-scheduler/styles.css'), 'utf8',
).includes('.tss-root')

console.log(JSON.stringify(out))
`,
  )

  const raw = run('node', ['smoke.mjs'], app)
  const out = JSON.parse(raw.trim().split('\n').at(-1))

  console.log('\ntest-pack: using the installed package')
  check(out.exports, 'every public export is present and the right type')
  check(out.renders, 'renders .tss-root through react-dom/server')
  check(out.title, 'renders the event title')
  check(out.theme, 'darkMode sets data-theme="dark"')
  check(out.colorVar, 'per-event colour variables reach the markup')
  check(out.cjs, 'require() resolves the CJS build with a matching VERSION')
  check(out.oneReact, 'react resolves to exactly one copy')
  check(out.css, 'toomstack-scheduler/styles.css resolves and contains .tss-root')

  const pkgVersion = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
  check(out.version === pkgVersion, `installed VERSION matches package.json (${pkgVersion})`)
} finally {
  rmSync(work, { recursive: true, force: true })
}

if (failures.length) {
  console.error(`\ntest-pack: ${failures.length} failed\n` + failures.map((f) => `  - ${f}`).join('\n'))
  process.exit(1)
}
console.log('\ntest-pack: all checks passed')
