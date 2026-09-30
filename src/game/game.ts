import { expiresAt, isRunning, remaining, setClock, startClock, stopClock, type Clock } from './clock'

export const SHOT_FULL_MS = 24_000
export const SHOT_SHORT_MS = 14_000
export const MAX_NAME_LENGTH = 12
/** Clock speed range and step (see `clock.ts`): 80 %–120 % of real time in steps of 0.5 %. */
export const MIN_CLOCK_RATE = 0.8
export const MAX_CLOCK_RATE = 1.2
export const CLOCK_RATE_STEP = 0.005

export type TeamId = 'home' | 'away'

export interface Team {
  name: string
  color: string
  score: number
  fouls: number
}

export interface Settings {
  periodMinutes: number
  overtimeMinutes: number
  clockRate: number
}

export interface GameState {
  version: 1
  teams: Record<TeamId, Team>
  period: number
  game: Clock
  shot: Clock
  settings: Settings
}

export type Action =
  | { type: 'tick'; at: number }
  | { type: 'toggleRunning'; at: number }
  | { type: 'toggleShot'; at: number }
  | { type: 'resetShot'; at: number; ms: number }
  | { type: 'score'; at: number; team: TeamId; points: 1 | 2 | 3 | -1 }
  | { type: 'foul'; at: number; team: TeamId; delta: 1 | -1 }
  | { type: 'adjustGame'; at: number; deltaMs: number }
  | { type: 'adjustShot'; at: number; deltaMs: number }
  | { type: 'setGame'; at: number; ms: number }
  | { type: 'setShot'; at: number; ms: number }
  | { type: 'nextPeriod'; at: number }
  | { type: 'setTeam'; at: number; team: TeamId; name?: string; color?: string }
  | { type: 'setSettings'; at: number; periodMinutes?: number; overtimeMinutes?: number; clockRate?: number }
  | { type: 'newGame'; at: number }

type WithoutAt<A> = A extends unknown ? Omit<A, 'at'> : never
export type Command = WithoutAt<Action>

export function periodLengthMs(state: Pick<GameState, 'settings'>, period: number): number {
  const minutes = period <= 4 ? state.settings.periodMinutes : state.settings.overtimeMinutes
  return minutes * 60_000
}

export function initialGame(
  settings: Partial<Settings> = {},
  teams: Partial<Record<TeamId, Pick<Team, 'name' | 'color'>>> = {},
): GameState {
  const resolved: Settings = {
    periodMinutes: settings.periodMinutes ?? 10,
    overtimeMinutes: settings.overtimeMinutes ?? 5,
    clockRate: settings.clockRate ?? 1,
  }
  const state: GameState = {
    version: 1,
    teams: {
      home: { name: 'LOCAL', color: '#1f6feb', score: 0, fouls: 0 },
      away: { name: 'VISITA', color: '#d73a49', score: 0, fouls: 0 },
    },
    period: 1,
    game: { remainingMs: 0, startedAt: null },
    shot: { remainingMs: SHOT_FULL_MS, startedAt: null },
    settings: resolved,
  }
  state.game = { remainingMs: periodLengthMs(state, state.period), startedAt: null }
  for (const id of ['home', 'away'] as const) {
    const custom = teams[id]
    if (custom) {
      state.teams[id] = { ...state.teams[id], name: custom.name, color: custom.color }
    }
  }
  return state
}

/** What the game clock shows at `now`, at the configured clock speed. */
export function gameRemaining(state: GameState, now: number): number {
  return remaining(state.game, now, state.settings.clockRate)
}

/** What the shot clock shows at `now`, at the configured clock speed. */
export function shotRemaining(state: GameState, now: number): number {
  return remaining(state.shot, now, state.settings.clockRate)
}

function stopBoth(state: GameState, at: number): GameState {
  const rate = state.settings.clockRate
  return { ...state, game: stopClock(state.game, at, rate), shot: stopClock(state.shot, at, rate) }
}

/** Stops the clocks that ran out by `now`, each at the instant it reached 0. The shot clock stops alone (FIBA running
 *  time: the game clock goes on until the official stops it); when the game clock runs out, both stop. */
export function settle(state: GameState, now: number): GameState {
  const rate = state.settings.clockRate
  const shotEnd = expiresAt(state.shot, rate)
  const gameEnd = expiresAt(state.game, rate)
  let { game, shot } = state
  if (shotEnd !== null && shotEnd <= now && (gameEnd === null || shotEnd <= gameEnd)) {
    shot = { remainingMs: 0, startedAt: null }
  }
  if (gameEnd !== null && gameEnd <= now) {
    game = { remainingMs: 0, startedAt: null }
    shot = stopClock(shot, gameEnd, rate)
  }
  return game === state.game && shot === state.shot ? state : { ...state, game, shot }
}

export function shotClockVisible(state: GameState, now: number): boolean {
  return shotRemaining(state, now) <= gameRemaining(state, now)
}

/** Re-bases running clocks at `at` so a speed change only affects the time still to run. */
function withClockRate(state: GameState, clockRate: number, at: number): GameState {
  const oldRate = state.settings.clockRate
  if (clockRate === oldRate) return state
  const rebase = (clock: Clock) => (isRunning(clock) ? setClock(clock, remaining(clock, at, oldRate), at) : clock)
  return { ...state, game: rebase(state.game), shot: rebase(state.shot), settings: { ...state.settings, clockRate } }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Clamped to the allowed range and snapped to the 0.5 % step (1.005, not 1.0050000000000001). */
function normalizeClockRate(rate: number): number {
  const steps = Math.round(clamp(rate, MIN_CLOCK_RATE, MAX_CLOCK_RATE) / CLOCK_RATE_STEP)
  return Number((steps * CLOCK_RATE_STEP).toFixed(3))
}

export function reduce(state: GameState, action: Action): GameState {
  const settled = settle(state, action.at)
  switch (action.type) {
    case 'tick':
      return settled
    case 'toggleRunning': {
      if (isRunning(settled.game)) return stopBoth(settled, action.at)
      if (remaining(settled.game, action.at) === 0) return settled
      const shot =
        remaining(settled.shot, action.at) > 0 ? startClock(settled.shot, action.at) : settled.shot
      return { ...settled, game: startClock(settled.game, action.at), shot }
    }
    case 'toggleShot': {
      // Pauses or resumes the shot clock alone; it only ever runs while the game clock does.
      if (!isRunning(settled.game)) return settled
      const shot = isRunning(settled.shot)
        ? stopClock(settled.shot, action.at, settled.settings.clockRate)
        : startClock(settled.shot, action.at)
      return shot === settled.shot ? settled : { ...settled, shot }
    }
    case 'resetShot':
      // The shot clock follows the game clock: after a violation it sits stopped at 0 while the game clock may
      // already be running again, and a reset must start it.
      return {
        ...settled,
        shot: { remainingMs: action.ms, startedAt: isRunning(settled.game) ? action.at : null },
      }
    case 'score': {
      const team = settled.teams[action.team]
      return {
        ...settled,
        teams: {
          ...settled.teams,
          [action.team]: { ...team, score: Math.max(0, team.score + action.points) },
        },
      }
    }
    case 'foul': {
      const team = settled.teams[action.team]
      return {
        ...settled,
        teams: {
          ...settled.teams,
          [action.team]: { ...team, fouls: Math.max(0, team.fouls + action.delta) },
        },
      }
    }
    case 'adjustGame': {
      if (isRunning(settled.game)) return settled
      const ms = Math.min(
        periodLengthMs(settled, settled.period),
        Math.max(0, settled.game.remainingMs + action.deltaMs),
      )
      return { ...settled, game: { ...settled.game, remainingMs: ms } }
    }
    case 'adjustShot': {
      if (isRunning(settled.game)) return settled
      const ms = Math.min(SHOT_FULL_MS, Math.max(0, settled.shot.remainingMs + action.deltaMs))
      return { ...settled, shot: { ...settled.shot, remainingMs: ms } }
    }
    case 'setGame': {
      // Also while running, to match a court clock without stopping: the clock goes on from the new value.
      if (!Number.isFinite(action.ms)) return settled
      const ms = clamp(action.ms, 0, periodLengthMs(settled, settled.period))
      return { ...settled, game: setClock(settled.game, ms, action.at) }
    }
    case 'setShot': {
      // Like a 24/14 reset with any value: the shot clock runs if and only if the game clock runs.
      if (!Number.isFinite(action.ms)) return settled
      const ms = clamp(action.ms, 0, SHOT_FULL_MS)
      return { ...settled, shot: { remainingMs: ms, startedAt: isRunning(settled.game) ? action.at : null } }
    }
    case 'nextPeriod': {
      if (isRunning(settled.game)) return settled
      const period = settled.period + 1
      const resetFouls = period >= 2 && period <= 4
      return {
        ...settled,
        period,
        game: { remainingMs: periodLengthMs(settled, period), startedAt: null },
        shot: { remainingMs: SHOT_FULL_MS, startedAt: null },
        teams: resetFouls
          ? {
              home: { ...settled.teams.home, fouls: 0 },
              away: { ...settled.teams.away, fouls: 0 },
            }
          : settled.teams,
      }
    }
    case 'setTeam': {
      const team = settled.teams[action.team]
      let name = team.name
      if (action.name !== undefined) {
        const trimmed = action.name.trim().slice(0, MAX_NAME_LENGTH)
        if (trimmed !== '') name = trimmed
      }
      let color = team.color
      if (action.color !== undefined && /^#[0-9a-f]{6}$/i.test(action.color)) {
        color = action.color
      }
      if (name === team.name && color === team.color) return settled
      return {
        ...settled,
        teams: { ...settled.teams, [action.team]: { ...team, name, color } },
      }
    }
    case 'setSettings': {
      const settings = { ...settled.settings }
      if (action.periodMinutes !== undefined && Number.isFinite(action.periodMinutes)) {
        settings.periodMinutes = clamp(Math.round(action.periodMinutes), 1, 20)
      }
      if (action.overtimeMinutes !== undefined && Number.isFinite(action.overtimeMinutes)) {
        settings.overtimeMinutes = clamp(Math.round(action.overtimeMinutes), 1, 10)
      }
      let game = settled.game
      const oldLength = periodLengthMs(settled, settled.period)
      if (!isRunning(game) && game.remainingMs === oldLength) {
        game = { ...game, remainingMs: periodLengthMs({ ...settled, settings }, settled.period) }
      }
      const next = { ...settled, settings, game }
      if (action.clockRate === undefined || !Number.isFinite(action.clockRate)) return next
      return withClockRate(next, normalizeClockRate(action.clockRate), action.at)
    }
    case 'newGame':
      return {
        ...settled,
        period: 1,
        game: { remainingMs: periodLengthMs(settled, 1), startedAt: null },
        shot: { remainingMs: SHOT_FULL_MS, startedAt: null },
        teams: {
          home: { ...settled.teams.home, score: 0, fouls: 0 },
          away: { ...settled.teams.away, score: 0, fouls: 0 },
        },
      }
  }
}
