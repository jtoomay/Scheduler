# Changelog

All notable changes to ToomstackScheduler are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/).

## [0.3.0] - 2026-10-22

### Changed
- Day, Work Week, and Week views fill the height they are given. `slotHeight` is the minimum row height: a taller panel stretches the visible hours to the footer, and a shorter one scrolls instead of shrinking the rows. Month view is unchanged.

## [0.2.1] - 2026-10-18

First release published to npm as `toomstack-scheduler`. No change to the component's API
or behaviour — everything here is packaging.

### Added
- Published to npm, public and unscoped. `npm i toomstack-scheduler`.
- Library build (Vite lib mode) emitting ESM (`dist/index.js`) and CJS (`dist/index.cjs`),
  with `react`, `react-dom` and `react/jsx-runtime` external.
- **The stylesheet is now a separate import:** `import 'toomstack-scheduler/styles.css'`.
  It used to be pulled in by the component; in a library build it is not.
- Hand-written TypeScript declarations (`dist/index.d.ts` / `.d.cts`) covering all 29
  props, the event shape, `Field`, `Filter`, `RenderFieldsProps` and the palette names.
- `"use client"` banner on the build, so the package imports cleanly in Next.js App Router.
- `AGENTS.md`, shipped inside the package: instructions for an AI assistant adding the
  scheduler to an app.
- Vitest suite (jsdom + Testing Library), 89 tests covering colour contrast, filtering,
  overlap layout, the theme fade, the editor and `renderFields`.
- `scripts/test-pack.mjs`: packs the real tarball, installs it into a clean project and
  renders it — catching a missing `files` entry, a stylesheet that never shipped, and
  duplicate React, none of which the other checks can see.
- `scripts/check-version.mjs`: fails when `package.json` and the `VERSION` export disagree.
- `publint` and `@arethetypeswrong/cli` on `npm run verify:package`, and all four gates on
  `prepublishOnly`.
- MIT `LICENSE`.

### Changed
- `react` and `react-dom` moved to `peerDependencies` (>=18). A second copy of React in a
  consumer causes *Invalid hook call*.
- The demo moved from `src/` to `playground/`, so `src/` is only the library. The harness
  imports by package name, so a missing export fails in development.
- `npm run dev` now serves the playground on port 5181.
- `npm run lint` fails on warnings.
- Upgraded Vitest to 4.x; 3.x pulls its own Vite 5 and does not transform JSX against this
  repo's Vite 8.

## [0.2.0] - 2026-10-13

### Added
- Dark mode through the `darkMode` prop (default `false`). It sets `data-theme="dark"` on the root, gives every `--tss-*` token a dark value, and sets `color-scheme: dark` so the native datetime pickers and scrollbars follow.
- Colour fade when `darkMode` changes: the root gets a `tss-theme-anim` class for about 240 ms, so hover, drag and view switching never carry a transition. Respects `prefers-reduced-motion`.
- Per-event colours through `event.color`, with the property name set by the `colorField` prop (default `'color'`). Accepts a palette name or any hex.
- A seven-colour palette (indigo, azure, moss, gold, crimson, orchid, graphite). Every label clears 4.5:1 on its fill, and every dark fill clears 3:1 against the dark grid.
- Contrast handling for arbitrary hex colours: lifted in OKLab until they separate on dark, with the label ink chosen by luminance. Non-hex CSS colours render as given.
- `color` editor field type, which shows palette swatches and stores the palette name.
- `renderFields` prop to replace the editor's non-datetime field rows with a custom component. It receives `{ value, onChange, event, mode, editable, error }`.
- Filtering through the `filters` prop (default `[colorFilter]`; `[]` hides the control), with controlled `filterState` and `onFilterStateChange` and uncontrolled `defaultFilterState`.
- Toolbar filter control with a **Colour** filter, and a message with a way to clear the filters when they hide every event.
- `makeFieldFilter` helper for filtering on any event property, and `NO_COLOR` for events with no value.
- New tokens `--tss-btn-hover-bg`, `--tss-danger-text`, `--tss-event-border`, `--tss-event-shadow`, `--tss-drag-shadow`, `--tss-dialog-shadow` and `--tss-backdrop`.
- New classes `.tss-viewport`, `.tss-filter`, `.tss-popover`, `.tss-swatch` and `.tss-empty`.
- Exports: `PALETTE`, `PALETTE_NAMES`, `resolveEventColor`, `colorFilter`, `DEFAULT_FILTERS`, `makeFieldFilter`, `NO_COLOR`.

### Changed
- `--tss-primary` takes a lighter value (`#4d8ee8`) in the dark theme, because the light value only reaches 3.75:1 on a dark surface.
- Several previously hardcoded colours, shadows and the dialog backdrop are now `--tss-*` tokens, so they can be themed.
- Filtering happens before overlap layout, so hiding one of two overlapping events widens the other back to full width.
- Demo app adds a **Dark mode** toggle, a `color` field in the editor, and sample events in a range of colours.

## [0.1.0] - 2026-09-23

### Added
- Bare-bones React + Vite app (`toomstack-scheduler`) hosting the scheduler demo.
- `ToomstackScheduler` component in `src/ToomstackScheduler/` (self-contained, future npm package).
- Views: Day, Work Week, Week, Month.
- Toolbar: Today, Previous/Next, date range label, view switcher.
- Double-click an empty slot (or a month day) to open the **New Event** editor, prefilled with the slot's start/end.
- Double-click an event to open the **Edit Event** editor.
- Editor fields: Name, Email, Phone Number, Address, Start, End. Includes validation (required fields, end after start).
- Configurable editor fields through the `fields` prop (text, email, tel, url, number, textarea, select, checkbox, datetime).
- Delete from the event's × button, the Delete key, or the editor, always with a confirmation dialog.
- Drag to move events (across time and days) and drag the bottom edge to resize, with 15-minute snapping.
- Side-by-side layout for overlapping events.
- Business-hours / full-day toggle with off-hours shading, and a current-time indicator.
- Month view with "+N more", and a click on a day to open it in Day view.
- Keyboard support: Enter to edit, Delete/Backspace to delete, Esc to close dialogs.
- Read-only mode (`editable={false}`).
- Theming through `--tss-*` CSS variables. All classes are prefixed `tss-`.
- Exports: `ToomstackScheduler`, `DEFAULT_FIELDS`, `dateUtils`, `VERSION`.
- Demo app saves events to `localStorage`.
