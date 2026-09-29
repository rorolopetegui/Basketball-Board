import { isRunning, setClock, startClock, stopClock, remaining, type Clock } from './clock'

export const SHOT_FULL_MS = 24_000
export const SHOT_SHORT_MS = 14_000
export const MAX_NAME_LENGTH = 12

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
  | { type: 'resetShot'; at: number; ms: number }
  | { type: 'score'; at: number; team: TeamId; points: 1 | 2 | 3 }
  | { type: 'foul'; at: number; team: TeamId; delta: 1 | -1 }
  | { type: 'adjustGame'; at: number; deltaMs: number }
  | { type: 'adjustShot'; at: number; deltaMs: number }
  | { type: 'nextPeriod'; at: number }
  | { type: 'setTeam'; at: number; team: TeamId; name?: string; color?: string }
  | { type: 'setSettings'; at: number; periodMinutes?: number; overtimeMinutes?: number }
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

export function settle(state: GameState, now: number): GameState {
  if (state.game.startedAt === null) return state
  let stopAt = state.game.startedAt + state.game.remainingMs
  if (state.shot.startedAt !== null) {
    stopAt = Math.min(stopAt, state.shot.startedAt + state.shot.remainingMs)
  }
  if (stopAt > now) return state
  return { ...state, game: stopClock(state.game, stopAt), shot: stopClock(state.shot, stopAt) }
}

export function shotClockVisible(state: GameState, now: number): boolean {
  return remaining(state.shot, now) <= remaining(state.game, now)
}

export function reduce(state: GameState, action: Action): GameState {
  const settled = settle(state, action.at)
  switch (action.type) {
    case 'tick':
      return settled
    case 'toggleRunning': {
      if (isRunning(settled.game)) {
        return {
          ...settled,
          game: stopClock(settled.game, action.at),
          shot: stopClock(settled.shot, action.at),
        }
      }
      if (remaining(settled.game, action.at) === 0) return settled
      const shot =
        remaining(settled.shot, action.at) > 0 ? startClock(settled.shot, action.at) : settled.shot
      return { ...settled, game: startClock(settled.game, action.at), shot }
    }
    case 'resetShot':
      return { ...settled, shot: setClock(settled.shot, action.ms, action.at) }
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
      if (isRunning(settled.shot)) return settled
      const ms = Math.min(SHOT_FULL_MS, Math.max(0, settled.shot.remainingMs + action.deltaMs))
      return { ...settled, shot: { ...settled.shot, remainingMs: ms } }
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
        settings.periodMinutes = Math.min(20, Math.max(1, Math.round(action.periodMinutes)))
      }
      if (action.overtimeMinutes !== undefined && Number.isFinite(action.overtimeMinutes)) {
        settings.overtimeMinutes = Math.min(10, Math.max(1, Math.round(action.overtimeMinutes)))
      }
      let game = settled.game
      const oldLength = periodLengthMs(settled, settled.period)
      if (!isRunning(game) && game.remainingMs === oldLength) {
        game = { ...game, remainingMs: periodLengthMs({ ...settled, settings }, settled.period) }
      }
      return { ...settled, settings, game }
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
