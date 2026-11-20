# Boxing Coach

A boxing coach in your pocket: a local-first PWA that calls combinations out loud, runs bag rounds and drills, and tracks which combinations you have mastered. Live at <https://alexanderop.github.io/boxing-coach/>.

It started as a copy of the [workout timer](https://github.com/alexanderop/workoutTimer) and keeps that app's timer engine, design system and Effect, Dexie, testing and offline-first patterns.

## Features

- A library of thirty combinations in learning order, each with an animation, the hand for every punch, and the gym's number shorthand
- A level per combination and drill: new, learning, known
- Bag rounds with a voice coach that calls combinations by name or by number, from your own list or a fixed level
- Ready-made programs (Classic 6, Beginner 3) with a theme per round
- Eight drills: jump rope, footwork, defense, shadow boxing and bag rounds
- Workout history, presets, result notes and session details
- English and German UI with light, dark, and system themes
- On-device IndexedDB storage plus validated JSON backup and restore
- Installable PWA that works offline with no account or backend

## Quickstart

```bash
pnpm install
pnpm dev
```

## Quality gates

```bash
pnpm check
pnpm test
pnpm test:a11y
pnpm test:visual
pnpm test:e2e
pnpm test:mutation
pnpm build
pnpm size-limit
```

`pnpm check` runs formatting, linting, type checking, dead-code analysis, unit tests, and architecture tests. The browser suites cover the timer journey, persisted recovery, accessibility, visual baselines, and the production service worker.

## Project map

```text
spec/smartwod-timer-clone/  Product specification and reference archive
src/features/timer/         Timer domain, feedback, and mode UI
src/db/                     Dexie schema, repositories, converters, and backup
src/stores/                 Shared reactive timer data
src/views/                  Route-level timer, history, preset, and settings pages
src/__tests__/              Unit, browser, a11y, architecture, and visual tests
test/e2e/                   Production-build BDD scenarios
```

The architectural boundaries are enforced by tests and lint rules. Feature code owns product behavior, the database layer owns storage, and views compose both without bypassing those seams. More detail is available in [`docs/`](docs/index.md).

## Stack

Vue 3.5 · TypeScript · Vite · Tailwind CSS · Effect · Dexie · Vue Router · vue-i18n · Zod · Vitest · Playwright · vite-plugin-pwa

## Privacy

Workout data stays on the device unless the user explicitly exports a backup. There are no accounts, analytics, advertisements, or network-dependent product features.

## License

[MIT](LICENSE)
