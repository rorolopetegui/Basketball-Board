import type { Clock } from './clock'
import { MAX_CLOCK_RATE, MIN_CLOCK_RATE, type GameState, type Settings, type Team } from './game'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function parseClock(value: unknown): Clock | null {
  if (!isPlainObject(value)) return null
  if (!isFiniteNumber(value.remainingMs) || value.remainingMs < 0) return null
  if (value.startedAt !== null && !isFiniteNumber(value.startedAt)) return null
  return { remainingMs: value.remainingMs, startedAt: value.startedAt as number | null }
}

function parseTeam(value: unknown): Team | null {
  if (!isPlainObject(value)) return null
  if (typeof value.name !== 'string') return null
  if (typeof value.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(value.color)) return null
  if (!isFiniteNumber(value.score) || value.score < 0) return null
  if (!isFiniteNumber(value.fouls) || value.fouls < 0) return null
  return { name: value.name, color: value.color, score: value.score, fouls: value.fouls }
}

function parseSettings(value: unknown): Settings | null {
  if (!isPlainObject(value)) return null
  const { periodMinutes, overtimeMinutes, clockRate = 1 } = value
  if (!isFiniteNumber(periodMinutes) || periodMinutes < 1 || periodMinutes > 20) return null
  if (!isFiniteNumber(overtimeMinutes) || overtimeMinutes < 1 || overtimeMinutes > 10) return null
  // Games saved before the clock speed existed have no clockRate: they run at real time.
  if (!isFiniteNumber(clockRate) || clockRate < MIN_CLOCK_RATE || clockRate > MAX_CLOCK_RATE) return null
  return { periodMinutes, overtimeMinutes, clockRate }
}

export function parseGame(value: unknown): GameState | null {
  if (!isPlainObject(value)) return null
  if (value.version !== 1) return null
  const period = value.period
  if (typeof period !== 'number' || !Number.isInteger(period) || period < 1) return null
  const teams = value.teams
  if (!isPlainObject(teams)) return null
  const home = parseTeam(teams.home)
  const away = parseTeam(teams.away)
  if (home === null || away === null) return null
  const game = parseClock(value.game)
  const shot = parseClock(value.shot)
  const settings = parseSettings(value.settings)
  if (game === null || shot === null || settings === null) return null
    return { version: 1, teams: { home, away }, period, game, shot, settings }
}
