import { describe, expect, it } from 'vitest'
import { initialGame, type GameState } from './game'
import { parseGame } from './validate'

function runningGame(): GameState {
  return {
    version: 1,
    teams: {
      home: { name: 'RIV', color: '#112233', score: 5, fouls: 2 },
      away: { name: 'UNP', color: '#aabbcc', score: 3, fouls: 0 },
    },
    period: 3,
    game: { remainingMs: 599_000, startedAt: 1_000 },
    shot: { remainingMs: 13_950, startedAt: 1_200 },
    settings: { periodMinutes: 12, overtimeMinutes: 5 },
  }
}

describe('parseGame', () => {
  it('accepts the initial state', () => {
    expect(parseGame(initialGame())).toEqual(initialGame())
  })

  it('accepts a state with running clocks and nonzero scores', () => {
    const state = runningGame()
    expect(parseGame(state)).toEqual(state)
  })

  it('rejects non-object values', () => {
    expect(parseGame(null)).toBeNull()
    expect(parseGame(undefined)).toBeNull()
    expect(parseGame(42)).toBeNull()
    expect(parseGame('state')).toBeNull()
    expect(parseGame([1, 2])).toBeNull()
    expect(parseGame({})).toBeNull()
  })

  it('requires version exactly 1', () => {
    expect(parseGame({ ...initialGame(), version: 2 })).toBeNull()
    expect(parseGame({ ...initialGame(), version: '1' })).toBeNull()
    expect(parseGame({ ...initialGame(), version: null })).toBeNull()
  })

  it('requires complete teams', () => {
    const base = initialGame()
    expect(parseGame({ ...base, teams: null })).toBeNull()
    expect(parseGame({ ...base, teams: { home: base.teams.home } })).toBeNull()
    expect(parseGame({ ...base, teams: { away: base.teams.away } })).toBeNull()
    const extra = { ...base, teams: { ...base.teams, extra: 1 } }
    expect(parseGame(extra)).not.toBeNull()
  })

  it('validates team fields', () => {
    const base = runningGame()
    const { home } = base.teams
    expect(parseGame({ ...base, teams: { ...base.teams, home: { ...home, name: 7 } } })).toBeNull()
    expect(parseGame({ ...base, teams: { ...base.teams, home: { ...home, name: null } } })).toBeNull()
    expect(parseGame({ ...base, teams: { ...base.teams, home: { ...home, name: '' } } })).not.toBeNull()
    expect(parseGame({ ...base, teams: { ...base.teams, home: { ...home, color: 'rojo' } } })).toBeNull()
    expect(parseGame({ ...base, teams: { ...base.teams, home: { ...home, color: '#abc' } } })).toBeNull()
    expect(parseGame({ ...base, teams: { ...base.teams, home: { ...home, color: '#abc123' } } })).not.toBeNull()
    expect(parseGame({ ...base, teams: { ...base.teams, home: { ...home, color: '#GGGGGG' } } })).toBeNull()
    expect(parseGame({ ...base, teams: { ...base.teams, home: { ...home, score: -1 } } })).toBeNull()
    expect(parseGame({ ...base, teams: { ...base.teams, home: { ...home, score: NaN } } })).toBeNull()
    expect(parseGame({ ...base, teams: { ...base.teams, home: { ...home, score: Infinity } } })).toBeNull()
    expect(parseGame({ ...base, teams: { ...base.teams, home: { ...home, fouls: -0.5 } } })).toBeNull()
    expect(parseGame({ ...base, teams: { ...base.teams, home: { ...home, fouls: '2' } } })).toBeNull()
  })

  it('validates the period', () => {
    const base = initialGame()
    expect(parseGame({ ...base, period: 0 })).toBeNull()
    expect(parseGame({ ...base, period: -2 })).toBeNull()
    expect(parseGame({ ...base, period: 1.5 })).toBeNull()
    expect(parseGame({ ...base, period: '1' })).toBeNull()
    expect(parseGame({ ...base, period: 5 })).not.toBeNull()
  })

  it('validates clocks', () => {
    const base = initialGame()
    expect(parseGame({ ...base, game: null })).toBeNull()
    expect(parseGame({ ...base, shot: null })).toBeNull()
    expect(parseGame({ ...base, game: { ...base.game, remainingMs: -1 } })).toBeNull()
    expect(parseGame({ ...base, game: { ...base.game, remainingMs: NaN } })).toBeNull()
    expect(parseGame({ ...base, game: { ...base.game, remainingMs: Infinity } })).toBeNull()
    expect(parseGame({ ...base, game: { ...base.game, remainingMs: '60' } })).toBeNull()
    expect(parseGame({ ...base, game: { ...base.game, startedAt: 'now' } })).toBeNull()
    expect(parseGame({ ...base, game: { ...base.game, startedAt: true } })).toBeNull()
    expect(parseGame({ ...base, game: { ...base.game, startedAt: undefined } })).toBeNull()
    expect(parseGame({ ...base, game: { ...base.game, startedAt: null } })).not.toBeNull()
    expect(parseGame({ ...base, shot: { remainingMs: 0, startedAt: null } })).not.toBeNull()
  })

  it('validates settings ranges', () => {
    const base = initialGame()
    expect(parseGame({ ...base, settings: null })).toBeNull()
    expect(parseGame({ ...base, settings: 0 })).toBeNull()
    expect(parseGame({ ...base, settings: { periodMinutes: 0, overtimeMinutes: 5 } })).toBeNull()
    expect(parseGame({ ...base, settings: { periodMinutes: 21, overtimeMinutes: 5 } })).toBeNull()
    expect(parseGame({ ...base, settings: { periodMinutes: 12, overtimeMinutes: 0 } })).toBeNull()
    expect(parseGame({ ...base, settings: { periodMinutes: 12, overtimeMinutes: 11 } })).toBeNull()
    expect(parseGame({ ...base, settings: { periodMinutes: NaN, overtimeMinutes: 5 } })).toBeNull()
    expect(parseGame({ ...base, settings: { periodMinutes: '12', overtimeMinutes: 5 } })).toBeNull()
    expect(parseGame({ ...base, settings: { periodMinutes: 1, overtimeMinutes: 1 } })).not.toBeNull()
    expect(parseGame({ ...base, settings: { periodMinutes: 20, overtimeMinutes: 10 } })).not.toBeNull()
  })
})
