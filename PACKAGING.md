# Release runbook

> **Status: implemented as of 2026-10-18, v0.2.1.** The package is public on npm as
> `toomstack-scheduler`. This file is now the runbook for shipping changes to it, not a
> proposal. The day-to-day scripts table lives in [README.md](README.md#working-on-the-package-itself).

## Shape of the package

| Piece | Where | Why it matters |
|---|---|---|
| Entry | `src/ToomstackScheduler/index.js` | The only thing bundled. Nothing in that folder imports outside it. |
| Build | `vite.config.js`, lib mode | ESM + CJS, `react`/`react-dom`/`react/jsx-runtime` external, `"use client"` banner, one `styles.css`. |
| Types | `src/ToomstackScheduler/index.d.ts` | Hand-written. `scripts/copy-types.mjs` puts it in `dist/` as both `.d.ts` and `.d.cts`. |
| Harness | `playground/`, `vite.playground.config.js` | Imports **by package name** via an alias, so a missing export fails in dev. Never published. |
| Published set | `files` in `package.json` | `dist`, README, CHANGELOG, AGENTS.md, LICENSE. |

Three things are load-bearing. If a release ever goes wrong, check these first:

1. **`files` must stay in `package.json`.** Without it npm falls back to `.gitignore`,
   which lists `dist`, and the tarball ships with no build in it. `npm run test:pack`
   catches this; nothing else does.
2. **`react` must stay in `peerDependencies`.** As a regular dependency the consumer gets
   a second React and every hook throws *Invalid hook call*.
3. **`sideEffects: ["**/*.css"]`** keeps bundlers from tree-shaking the stylesheet away.

## Adding a feature

1. `npm run dev` — harness on :5181.
2. Write it in `src/ToomstackScheduler/`, exercise it in `playground/App.jsx`.
3. Tests next to the code (`*.test.js` / `*.test.jsx`).
4. Update `index.d.ts` if the public API moved, and `AGENTS.md` if the guidance did.
5. Update `README.md` + `CHANGELOG.md`, bump the version in **both** `package.json` and
   the `VERSION` export.
6. `npm run check`.

Semver: minor for a feature, patch for a fix, major for a breaking change after 1.0.

## The four gates

`prepublishOnly` runs all of them, so a broken package cannot be published by accident.
Run them by hand first anyway, so nothing surprises you mid-publish.

```bash
npm run check           # oxlint (warnings fail) + version gate + Vitest
npm run verify:package  # build + publint + attw
npm run test:pack       # pack the real tarball, install it clean, render it
npm run build && npm run preview   # look at it
```

Each catches a different class of failure:

- **`npm test`** — behaviour. 89 assertions: colour contrast against both surfaces,
  filtering before layout, the theme fade arming only on a real change, the `renderFields`
  merge precedence, the default editor.
- **`publint` + `attw`** — the package contract. A wrong `exports` map, a missing `main`,
  types that don't resolve under `node16` or `bundler`, CJS/ESM mismatches.
- **`test:pack`** — the tarball itself. The only gate that sees a missing `files` entry, a
  stylesheet that never got emitted, or two copies of React.
- **Your eyes** — everything no assertion covers.

## Trying a release before it is the default

```bash
npm publish --tag next                              # live, but not what `npm i` gives
cd ../some-app && npm i toomstack-scheduler@next
npm dist-tag add toomstack-scheduler@0.3.0 latest   # once happy
```

`npm i toomstack-scheduler` keeps resolving to the previous version until that last line.

For a purely local check:

```bash
npm run build && npm pack          # -> toomstack-scheduler-0.3.0.tgz
cd ../some-app && npm i ../Scheduler/toomstack-scheduler-0.3.0.tgz
```

Use the tarball, **not `npm link` or a `file:` path**. Both resolve React from this repo's
`node_modules`, giving the consumer two Reacts and *Invalid hook call* — a failure that
looks like a bug in the library and isn't. A tarball install has no such trap.

## Publishing

```bash
npm whoami                                   # jtoomay
npm run check && npm run verify:package && npm run test:pack
npm pack --dry-run                           # read the file list
npm publish
git tag v0.3.0 && git push --tags            # once a remote exists
```

A publish is effectively permanent: unpublishing only works within 72 hours, and the
version number can never be reused.

## Known issues

- **In the dark theme, an event with no colour renders `#1c73b6`, the same value as
  `azure`.** The two are indistinguishable in the grid, and the colour filter's "No colour"
  option shows a blue swatch. It only bites when an app mixes coloured and uncoloured
  events. Fixing it properly means a different *treatment* for uncoloured events, not just
  a different hue — every neutral collides with `graphite` and every blue with `azure`.
- **No CI.** Everything here is manual. A release workflow would be a reasonable addition
  and nothing in this setup blocks one.
