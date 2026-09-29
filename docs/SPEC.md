# LBABoard v2 — specification

A basketball scoreboard for amateur games. One person at the scorer's table runs the **control window** on a
laptop; the **board window** is shown on a TV or projector (extended display). It must cost nothing to run:
the build is a single `index.html` that works by double-click (`file://`), offline, or from any static host.

Rules follow FIBA: 4 quarters, overtimes, 24/14-second shot clock, team fouls per quarter.

## 1. Architecture

```
src/
  game/clock.ts        Clock type and pure clock functions
  game/format.ts       display strings for clocks and periods
  game/game.ts         GameState, Action, initialGame(), reduce(), settle(), shotClockVisible()
  game/validate.ts     parseGame(unknown): GameState | null
  sync/link.ts         messages between windows + localStorage persistence
  board/Board.tsx      board window (read-only view)
  control/Control.tsx  control window (all inputs)
  control/shortcuts.ts keyboard shortcut table and handler
  audio/buzzer.ts      Web Audio buzzer
  useNow.ts            React hook: current time, re-rendering while clocks run
  App.tsx              picks the view from the URL hash
```

- `src/game/*` is pure TypeScript: no React, no DOM, never calls `Date.now()`. Time is always a parameter.
- The control window owns the state. The board only displays what it receives.
- Tests live next to the code as `*.test.ts` / `*.test.tsx` (Vitest + Testing Library, jsdom). Import `it`,
  `expect`, `vi` from `vitest` (globals are off).
- UI text is Spanish. Code, identifiers and comments are English.
- No runtime dependencies beyond React. No network requests, no external fonts or assets.

## 2. Game model (`src/game`)

### 2.1 Clock (`clock.ts`)

```ts
export interface Clock {
  remainingMs: number        // when running: remaining at startedAt; when stopped: the frozen value
  startedAt: number | null   // epoch ms (Date.now() of the caller) when it started; null when stopped
}
export function remaining(clock: Clock, now: number): number   // never below 0
export function isRunning(clock: Clock): boolean
export function startClock(clock: Clock, now: number): Clock    // no-op if running or remaining is 0
export function stopClock(clock: Clock, now: number): Clock     // freezes remaining(clock, now)
export function setClock(clock: Clock, ms: number, now: number): Clock // keeps running/stopped state
```

`remaining = startedAt === null ? remainingMs : max(0, remainingMs - (now - startedAt))`.
`setClock` on a running clock restarts the count from `now`: `{ remainingMs: ms, startedAt: now }`.
Clocks are timestamps, not counters: a window that reloads, or a board that renders late, still shows the
exact time.

### 2.2 State (`game.ts`)

```ts
export type TeamId = 'home' | 'away'
export interface Team { name: string; color: string; score: number; fouls: number }
export interface Settings { periodMinutes: number; overtimeMinutes: number }
export interface GameState {
  version: 1
  teams: Record<TeamId, Team>
  period: number             // 1–4 are quarters, 5 is the first overtime, 6 the second, ...
  game: Clock
  shot: Clock
  settings: Settings
}
export const SHOT_FULL_MS = 24_000
export const SHOT_SHORT_MS = 14_000
export const MAX_NAME_LENGTH = 12
export function initialGame(
  settings?: Partial<Settings>,
  teams?: Partial<Record<TeamId, Pick<Team, 'name' | 'color'>>>,
): GameState
```

Defaults: home `{ name: 'LOCAL', color: '#1f6feb' }`, away `{ name: 'VISITA', color: '#d73a49' }`,
`periodMinutes: 10`, `overtimeMinutes: 5`, period 1, game clock = period length stopped, shot clock 24 s
stopped, scores and fouls 0.

`periodLengthMs(state, period)` = `periodMinutes` for periods 1–4, `overtimeMinutes` for 5+.

### 2.3 Actions

Every action carries `at: number` (epoch ms, taken by the caller with `Date.now()`), so `reduce` stays pure.

```ts
export type Action =
  | { type: 'toggleRunning'; at: number }
  | { type: 'resetShot'; ms: 24_000 | 14_000; at: number }
  | { type: 'score'; team: TeamId; points: 1 | 2 | 3 | -1; at: number }
  | { type: 'foul'; team: TeamId; delta: 1 | -1; at: number }
  | { type: 'adjustGame'; deltaMs: number; at: number }
  | { type: 'adjustShot'; deltaMs: number; at: number }
  | { type: 'nextPeriod'; at: number }
  | { type: 'setTeam'; team: TeamId; name?: string; color?: string; at: number }
  | { type: 'setSettings'; periodMinutes?: number; overtimeMinutes?: number; at: number }
  | { type: 'newGame'; at: number }
  | { type: 'tick'; at: number }
export function reduce(state: GameState, action: Action): GameState

// An action before it is time-stamped; the UI and the shortcut table work with commands.
type WithoutAt<A> = A extends unknown ? Omit<A, 'at'> : never
export type Command = WithoutAt<Action>
```

"Running" always means the game clock is running (`isRunning(state.game)`).

`reduce` first applies `settle(state, action.at)` (2.4), then:

| Action | Effect |
|---|---|
| `toggleRunning` | Running → stop both clocks. Stopped with the game clock at 0 → nothing. Otherwise start the game clock, and the shot clock too if its remaining is above 0. |
| `resetShot` | Shot clock = `ms`. It keeps running if the game clock is running; otherwise it stays stopped. |
| `score` | `score = max(0, score + points)`. |
| `foul` | `fouls = max(0, fouls + delta)`. No upper limit. |
| `adjustGame` | Only while stopped (ignored while running). Game clock clamped to `[0, periodLengthMs(period)]`. |
| `adjustShot` | Only while stopped. Shot clock clamped to `[0, 24_000]`. |
| `nextPeriod` | Only while stopped. `period + 1`; game clock = the new period's length; shot clock = 24 s; both stopped. Team fouls reset to 0 when entering periods 2, 3 and 4. Entering an overtime (5+) keeps the fouls (FIBA: overtime fouls count as the 4th quarter). |
| `setTeam` | `name` is trimmed and cut to `MAX_NAME_LENGTH`; an empty name keeps the old one. `color` must be `#rrggbb`, otherwise ignored. |
| `setSettings` | Non-finite values are ignored; others are rounded to an integer and clamped: `periodMinutes` 1–20, `overtimeMinutes` 1–10. If the game clock is stopped and still equals the old length of the current period (the period has not started), it is set to the new length. |
| `newGame` | Back to period 1 with scores, fouls and clocks reset; keeps team names, colors and settings. |
| `tick` | Only the settle step. |

### 2.4 Settle (expiry)

`settle(state, now)`: when the game clock is running and a running clock has reached 0 by `now`, stop both
clocks **at the instant the first one reached 0**, not at `now`:

- expiry of a running clock = `startedAt + remainingMs`;
- `stopAt = min(expiry of the game clock, expiry of the shot clock if it is running)`, and it applies only
  when `stopAt <= now`;
- both clocks become `stopClock(clock, stopAt)`.

So when the shot clock expires first, the shot clock shows 0 and the game clock keeps the time it had at that
moment. When the game clock expires first (possible only while the shot clock is off, see 2.5), the game clock
shows 0. Otherwise `settle` returns the state unchanged (same object).

### 2.5 Shot clock off

`shotClockVisible(state, now)` is `remaining(shot, now) <= remaining(game, now)`. When less game time is left
than shot-clock time (for example a reset to 24 with 18 s left in the quarter) the board hides the shot clock.

## 3. Display format (`format.ts`)

All values are floored (a clock shows 0 only when it has run out, as on FIBA boards):

- `formatGameClock(ms)`: `ms >= 60_000` → `M:SS` (`600000 → "10:00"`, `599_999 → "9:59"`, `60_000 → "1:00"`);
  below one minute → seconds and tenths `S.t` (`59_999 → "59.9"`, `9_050 → "9.0"`, `50 → "0.0"`, `0 → "0.0"`).
- `formatShotClock(ms)`: `ms >= 5_000` → whole seconds (`24_000 → "24"`, `23_999 → "23"`, `5_000 → "5"`);
  below five seconds → `S.t` (`4_999 → "4.9"`, `0 → "0.0"`).
- `periodLabel(period)`: 1–4 → `"CUARTO 1"` … `"CUARTO 4"`; 5 → `"TIEMPO EXTRA"`; 6+ → `"TIEMPO EXTRA 2"`,
  `"TIEMPO EXTRA 3"`, …

## 4. Validation (`validate.ts`)

`parseGame(value: unknown): GameState | null` accepts only a complete, well-typed `GameState` with
`version: 1` (finite numbers, non-negative scores/fouls/remaining, period ≥ 1, `startedAt` number or null,
string names, `#rrggbb` colors, settings in range). Anything else returns `null`. Every state that arrives
from another window or from localStorage goes through it: that input is untrusted.

## 5. Sync between windows (`sync/link.ts`)

Two windows of the same `index.html`: the control window (no hash) and the board window (`#board`).

- Messages: `{ app: 'lbaboard', kind: 'state', state: GameState }` and `{ app: 'lbaboard', kind: 'hello' }`.
  Anything without `app === 'lbaboard'` is ignored; a `state` whose `parseGame` fails is ignored.
- **Control → board:** on every state change the control window saves the state to localStorage (key
  `lbaboard.game`) and posts a `state` message to the board window it opened (if open), with target origin
  `'*'` (a `file://` page has origin `null`; the payload is only scoreboard data).
- **Board start-up:** the board reads `lbaboard.game` from localStorage for an immediate picture, then sends
  `hello` to `window.opener` (when present). The control window answers `hello` with a `state` message to
  `event.source`.
- **Board updates:** the board accepts `state` messages (`message` event) and also listens to the `storage`
  event for `lbaboard.game`, which covers a board opened by hand in another tab of the same origin.
- **Control start-up:** the control window restores `lbaboard.game` (falls back to `initialGame()`), so a
  reload in the middle of a game keeps score and clocks — running clocks continue correctly because they are
  timestamps.
- localStorage can throw (private mode, blocked storage): wrap every access in try/catch; the app keeps
  working without persistence.

API:

```ts
export type LinkMessage =
  | { app: 'lbaboard'; kind: 'state'; state: GameState }
  | { app: 'lbaboard'; kind: 'hello' }
export const STORAGE_KEY = 'lbaboard.game'
export function saveGame(state: GameState): void          // never throws
export function loadGame(): GameState | null              // parseGame of the stored JSON; null on any failure
export function isMessage(data: unknown): data is LinkMessage  // a 'state' message must pass parseGame
export function useBoardState(): GameState                // board side: storage + hello + message/storage events
export function useControlLink(state: GameState): { openBoard: () => void }
```

`useControlLink` keeps the board window returned by `window.open` in a ref (no module-level state), saves and
posts on every state change, answers `hello`, and `openBoard()` opens the board or focuses it if it is still
open (see 7). Effects must be safe under React StrictMode (subscribe and unsubscribe symmetrically).

## 6. Board window (`#board`)

Read-only, built for a 16:9 screen seen from far away; everything scales with the viewport (`vw`/`vh`/
`min()`), no scrollbars, dark background.

```
 ┌─────────────────────────────────────────────────────────┐
 │ ▌LOCAL                    CUARTO 2               VISITA▐ │
 │                                                          │
 │    87                      9:42                     85   │
 │                             14                           │
 │ FALTAS 3                                       FALTAS 4  │
 └─────────────────────────────────────────────────────────┘
```

- Team names in upper case with a bar/accent in the team color; scores very large; the game clock is the
  largest element, amber digits, centered; the shot clock under it (hidden when `shotClockVisible` is false).
- Digits use `font-variant-numeric: tabular-nums` so they do not jump.
- Team fouls: `FALTAS n`, in the alert color when `n >= 4` (the team is in penalty: the next foul gives free
  throws).
- The shot clock turns to the alert color when it shows 0; the game clock too when it shows 0.
- Double-click toggles fullscreen (Fullscreen API). A hint "Doble clic: pantalla completa" is shown at start
  and fades out after about 4 s.
- `document.title` = `"LBABoard — Tablero"`.
- The board re-renders about 20 times per second while a clock runs (`useNow`), computing the displayed time
  from the state and its own clock; it never mutates the state.
- `useNow(active: boolean, intervalMs = 50): number` returns `Date.now()` and, while `active`, re-renders every
  `intervalMs` (cleared when inactive or unmounted).

## 7. Control window (no hash)

For a laptop screen (≥ 1280×720). `document.title` = `"LBABoard — Mesa de control"`.

- **Top bar:** `Abrir tablero` (opens or focuses `location.href` without hash + `#board` with
  `window.open(url, 'lbaboard-board', 'popup,width=1280,height=720')`), `Nuevo partido` (asks
  `window.confirm('¿Empezar un partido nuevo? Se borran el marcador, las faltas y el reloj.')`), a sound
  toggle (`Sonido: sí` / `Sonido: no`, remembered in localStorage key `lbaboard.muted`).
- **Clock panel:** the game clock, shot clock and period as on the board (smaller); `Iniciar` / `Detener`
  button; `24` and `14` buttons; `−1 s` / `+1 s` for the game clock and for the shot clock (disabled while
  running); `Siguiente período` (disabled while running; when the game clock is above 0 it asks
  `window.confirm('El reloj no llegó a 0. ¿Pasar al período siguiente?')`).
- **Two team panels** (home left, away right): name input (max 12 characters), color input
  (`<input type="color">`), score with `+1` `+2` `+3` `−1` buttons, team fouls with `+1` `−1` buttons.
- **Settings:** minutes per quarter and per overtime (number inputs).
- **Shortcut legend** listing the table below.
- State: `useReducer(reduce, …)` initialised from `loadGame() ?? initialGame()`; the UI sends `Command`s and a
  small `send(command)` stamps `at: Date.now()` before dispatching.
- The control window sends `tick` about 20 times per second while running. When an update turns the game
  clock from running to stopped and the new state has the game clock or the shot clock at 0 (a clock ran out,
  not a manual stop), it plays the buzzer unless muted.
- Every button has an accessible name (its visible text, or `aria-label` naming the team, e.g.
  `aria-label="LOCAL +2"`).

### 7.1 Keyboard shortcuts (`control/shortcuts.ts`)

Matched on `KeyboardEvent.code`, so they work on any keyboard layout:

| Key | Action | Key | Action |
|---|---|---|---|
| `Space` | start / stop | | |
| `KeyZ` | shot clock 24 | `KeyX` | shot clock 14 |
| `KeyQ` `KeyW` `KeyE` | home +1 / +2 / +3 | `KeyU` `KeyI` `KeyO` | away +1 / +2 / +3 |
| `KeyA` | home −1 point | `KeyJ` | away −1 point |
| `KeyS` / `KeyD` | home foul +1 / −1 | `KeyK` / `KeyL` | away foul +1 / −1 |

- Ignored when the event target is an `input`, `textarea`, `select` or content-editable element, when Ctrl,
  Alt or Meta is held, and on auto-repeat (`event.repeat`).
- `Space` calls `preventDefault()` on keydown **and keyup**, so a focused button is never also clicked (a
  button activates on the keyup of Space) and the page does not scroll.
- API:

```ts
export interface Shortcut { code: string; key: string; label: string; command: Command }
export const SHORTCUTS: readonly Shortcut[]        // `key` is what the legend shows: 'Espacio', 'Z', 'Q', ...
export function shortcutFor(event: KeyboardEvent): Command | null  // applies the ignore rules above
export function useShortcuts(onCommand: (command: Command) => void): void  // window keydown + keyup listeners
```

  The legend in the control window is rendered from `SHORTCUTS`.

## 8. Buzzer (`audio/buzzer.ts`)

`playBuzzer()`: a ~1 s harsh tone through the Web Audio API (for example two detuned square/sawtooth
oscillators around 220 Hz with a short fade-out). Creates the `AudioContext` lazily and reuses it; does
nothing when Web Audio is unavailable (jsdom). No audio files.

## 9. App (`App.tsx`)

`location.hash === '#board'` renders `<Board />`, anything else `<Control />`. React to `hashchange`.

## 10. Build and delivery

- `npm run build` → `dist/index.html`, one file with everything inlined (`vite-plugin-singlefile`). It must
  work opened by double-click and when hosted (GitHub Pages / Vercel, both free).
- `npm test`, `npm run typecheck`, `npm run lint` must pass.
