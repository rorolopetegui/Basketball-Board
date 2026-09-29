# LBABoard — notes for coding agents

The product contract is `docs/SPEC.md`. Read the section for the part you are changing before you edit.

## Commands

- `npm test` — Vitest (jsdom). Tests sit next to the code as `*.test.ts` / `*.test.tsx`.
- `npm run typecheck` — `tsc -b`.
- `npm run lint` — oxlint.
- `npm run build` — typecheck + single-file build into `dist/index.html`.

## Conventions

- `src/game/*` is pure TypeScript: no React, no DOM, no `Date.now()`. Time comes in as a parameter (`at`/`now`).
- Test time-dependent UI with `vi.useFakeTimers()` and `vi.setSystemTime()`; never sleep in tests.
- Import `it`, `expect`, `vi`, `describe` from `vitest` (globals are off).
- UI text in Spanish; identifiers and comments in English.
- No new runtime dependencies. No network requests, external fonts or asset files: the build must stay one
  self-contained HTML file.
