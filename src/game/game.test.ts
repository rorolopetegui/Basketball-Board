import { describe, expect, it } from 'vitest'
import { initialGame, periodLengthMs, reduce, settle, shotClockVisible, type Action, type GameState } from './game'

function runningState(at: number, gameMs = 600_000, shotMs = 24_000): GameState {
  return {
    ...initialGame(),
    game: { remainingMs: gameMs, startedAt: at },
    shot: { remainingMs: shotMs, startedAt: at },
  }
}

describe('initialGame', () => {
  it('creates the default state', () => {
    expect(initialGame()).toEqual({
      version: 1,
      teams: {
        home: { name: 'LOCAL', color: '#1f6feb', score: 0, fouls: 0 },
        away: { name: 'VISITA', color: '#d73a49', score: 0, fouls: 0 },
      },
      period: 1,
      game: { remainingMs: 600_000, startedAt: null },
      shot: { remainingMs: 24_000, startedAt: null },
      settings: { periodMinutes: 10, overtimeMinutes: 5 },
    })
  })

  it('accepts custom settings and teams', () => {
    const state = initialGame(
      { periodMinutes: 12, overtimeMinutes: 2 },
      { home: { name: 'OSASUNA', color: '#a00' } },
    )
    expect(state.settings).toEqual({ periodMinutes: 12, overtimeMinutes: 2 })
    expect(state.game.remainingMs).toBe(12 * 60_000)
    expect(state.teams.home).toEqual({ name: 'OSASUNA', color: '#a00', score: 0, fouls: 0 })
    expect(state.teams.away.name).toBe('VISITA')
  })
})

describe('periodLengthMs', () => {
  it('uses period minutes for periods 1-4 and overtime minutes from 5 on', () => {
    const state = initialGame({ periodMinutes: 10, overtimeMinutes: 5 })
    expect(periodLengthMs(state, 1)).toBe(600_000)
    expect(periodLengthMs(state, 4)).toBe(600_000)
    expect(periodLengthMs(state, 5)).toBe(300_000)
    expect(periodLengthMs(state, 6)).toBe(300_000)
  })
})

describe('toggleRunning', () => {
  it('starts game and shot clocks from a stopped state', () => {
    const next = reduce(initialGame(), { type: 'toggleRunning', at: 1_000 })
    expect(next.game.startedAt).toBe(1_000)
    expect(next.shot.startedAt).toBe(1_000)
  })

  it('starts only the game clock when the shot clock has no remaining time', () => {
    const state = { ...initialGame(), shot: { remainingMs: 0, startedAt: null } }
    const next = reduce(state, { type: 'toggleRunning', at: 1_000 })
    expect(next.game.startedAt).toBe(1_000)
    expect(next.shot.startedAt).toBeNull()
  })

  it('is a no-op when the game clock is stopped with 0 remaining', () => {
    const state = { ...initialGame(), game: { remainingMs: 0, startedAt: null } }
    expect(reduce(state, { type: 'toggleRunning', at: 1_000 })).toBe(state)
  })

  it('stops both clocks and freezes their remaining time', () => {
    const state = runningState(1_000)
    const next = reduce(state, { type: 'toggleRunning', at: 4_000 })
    expect(next.game).toEqual({ remainingMs: 597_000, startedAt: null })
    expect(next.shot).toEqual({ remainingMs: 21_000, startedAt: null })
  })
})

describe('resetShot', () => {
  it('sets the shot clock to ms while stopped', () => {
    const next = reduce(initialGame(), { type: 'resetShot', at: 1_000, ms: 14_000 })
    expect(next.shot).toEqual({ remainingMs: 14_000, startedAt: null })
  })

  it('re-starts a running shot clock from now', () => {
    const next = reduce(runningState(1_000), { type: 'resetShot', at: 5_000, ms: 24_000 })
    expect(next.shot).toEqual({ remainingMs: 24_000, startedAt: 5_000 })
  })
})

describe('score', () => {
  it('adds points to the team score', () => {
    const next = reduce(initialGame(), { type: 'score', at: 0, team: 'home', points: 2 })
    expect(next.teams.home.score).toBe(2)
    expect(next.teams.away.score).toBe(0)
  })
})

describe('foul', () => {
  it('increments and decrements the team foul count', () => {
    const up = reduce(initialGame(), { type: 'foul', at: 0, team: 'away', delta: 1 })
    expect(up.teams.away.fouls).toBe(1)
    const down = reduce(up, { type: 'foul', at: 0, team: 'away', delta: -1 })
    expect(down.teams.away.fouls).toBe(0)
  })

  it('never goes below 0', () => {
    const next = reduce(initialGame(), { type: 'foul', at: 0, team: 'home', delta: -1 })
    expect(next.teams.home.fouls).toBe(0)
  })

  it('has no upper limit', () => {
    let state = initialGame()
    for (let i = 0; i < 5; i++) {
      state = reduce(state, { type: 'foul', at: 0, team: 'home', delta: 1 })
    }
    expect(state.teams.home.fouls).toBe(5)
  })
})

describe('adjustGame', () => {
  it('is ignored while the game clock is running', () => {
    const state = runningState(0)
    expect(reduce(state, { type: 'adjustGame', at: 1_000, deltaMs: 5_000 })).toBe(state)
  })

  it('adjusts the stopped game clock clamped to [0, period length]', () => {
    const state = initialGame()
    const up = reduce(state, { type: 'adjustGame', at: 0, deltaMs: 100_000 })
    expect(up.game.remainingMs).toBe(600_000)
    const down = reduce(state, { type: 'adjustGame', at: 0, deltaMs: -700_000 })
    expect(down.game.remainingMs).toBe(0)
    const mid = reduce(state, { type: 'adjustGame', at: 0, deltaMs: -90_000 })
    expect(mid.game).toEqual({ remainingMs: 510_000, startedAt: null })
  })
})

describe('adjustShot', () => {
  it('is ignored while the shot clock is running', () => {
    const state = runningState(0)
    expect(reduce(state, { type: 'adjustShot', at: 1_000, deltaMs: -5_000 })).toBe(state)
  })

  it('adjusts the stopped shot clock clamped to [0, 24000]', () => {
    const state = { ...initialGame(), shot: { remainingMs: 20_000, startedAt: null } }
    expect(reduce(state, { type: 'adjustShot', at: 0, deltaMs: 10_000 }).shot.remainingMs).toBe(24_000)
    expect(reduce(state, { type: 'adjustShot', at: 0, deltaMs: -30_000 }).shot.remainingMs).toBe(0)
    expect(reduce(state, { type: 'adjustShot', at: 0, deltaMs: -5_000 }).shot.remainingMs).toBe(15_000)
  })
})

describe('nextPeriod', () => {
  it('is ignored while the game clock is running', () => {
    const state = runningState(0)
    expect(reduce(state, { type: 'nextPeriod', at: 1_000 })).toBe(state)
  })

  it('advances the period with a full game and shot clock, stopped', () => {
    const next = reduce(initialGame(), { type: 'nextPeriod', at: 0 })
    expect(next.period).toBe(2)
    expect(next.game).toEqual({ remainingMs: 600_000, startedAt: null })
    expect(next.shot).toEqual({ remainingMs: 24_000, startedAt: null })
  })

  it('resets team fouls when entering periods 2, 3 and 4', () => {
    const state = {
      ...initialGame(),
      teams: {
        home: { name: 'LOCAL', color: '#1f6feb', score: 1, fouls: 4 },
        away: { name: 'VISITA', color: '#d73a49', score: 2, fouls: 3 },
      },
    }
    const next = reduce(state, { type: 'nextPeriod', at: 0 })
    expect(next.teams.home.fouls).toBe(0)
    expect(next.teams.away.fouls).toBe(0)
    expect(next.teams.home.score).toBe(1)
  })

  it('keeps fouls when entering overtime', () => {
    const state = {
      ...initialGame(),
      period: 4,
      teams: {
        home: { name: 'LOCAL', color: '#1f6feb', score: 1, fouls: 4 },
        away: { name: 'VISITA', color: '#d73a49', score: 2, fouls: 3 },
      },
    }
    const next = reduce(state, { type: 'nextPeriod', at: 0 })
    expect(next.period).toBe(5)
    expect(next.game.remainingMs).toBe(300_000)
    expect(next.teams.home.fouls).toBe(4)
    expect(next.teams.away.fouls).toBe(3)
  })
})

describe('setTeam', () => {
  it('trims and truncates the name to 12 characters', () => {
    const next = reduce(initialGame(), { type: 'setTeam', at: 0, team: 'home', name: '   OSASUNA BASKET   ' })
    expect(next.teams.home.name).toBe('OSASUNA BASK')
  })

  it('keeps the old name when the new one is empty after trimming', () => {
    const next = reduce(initialGame(), { type: 'setTeam', at: 0, team: 'home', name: '   ' })
    expect(next.teams.home.name).toBe('LOCAL')
  })

  it('applies valid colors and ignores invalid ones', () => {
    const ok = reduce(initialGame(), { type: 'setTeam', at: 0, team: 'away', color: '#ff8800' })
    expect(ok.teams.away.color).toBe('#ff8800')
    const bad = reduce(initialGame(), { type: 'setTeam', at: 0, team: 'away', color: 'nope' })
    expect(bad.teams.away.color).toBe('#d73a49')
  })
})

describe('setSettings', () => {
  it('ignores non-finite values', () => {
    const next = reduce(initialGame(), {
      type: 'setSettings',
      at: 0,
      periodMinutes: Number.NaN,
      overtimeMinutes: Infinity,
    })
    expect(next.settings).toEqual({ periodMinutes: 10, overtimeMinutes: 5 })
  })

  it('rounds and clamps minutes', () => {
    const next = reduce(initialGame(), { type: 'setSettings', at: 0, periodMinutes: 25, overtimeMinutes: 0.4 })
    expect(next.settings).toEqual({ periodMinutes: 20, overtimeMinutes: 1 })
    const low = reduce(initialGame(), { type: 'setSettings', at: 0, periodMinutes: -3, overtimeMinutes: 15 })
    expect(low.settings).toEqual({ periodMinutes: 1, overtimeMinutes: 10 })
  })

  it('resets an untouched stopped game clock to the new period length', () => {
    const next = reduce(initialGame(), { type: 'setSettings', at: 0, periodMinutes: 12 })
    expect(next.game.remainingMs).toBe(720_000)
  })

  it('does not touch a game clock that already differs from the period length', () => {
    const state = { ...initialGame(), game: { remainingMs: 300_000, startedAt: null } }
    const next = reduce(state, { type: 'setSettings', at: 0, periodMinutes: 12 })
    expect(next.game.remainingMs).toBe(300_000)
  })

  it('does not touch a running game clock', () => {
    const next = reduce(runningState(1_000), { type: 'setSettings', at: 2_000, periodMinutes: 12 })
    expect(next.game).toEqual({ remainingMs: 600_000, startedAt: 1_000 })
  })
})

describe('newGame', () => {
  it('resets period, scores, fouls and clocks but keeps names, colors and settings', () => {
    const state: GameState = {
      ...initialGame({ periodMinutes: 8 }),
      period: 3,
      game: { remainingMs: 123_000, startedAt: null },
      shot: { remainingMs: 7_000, startedAt: null },
      teams: {
        home: { name: 'ROJA', color: '#c00', score: 11, fouls: 4 },
        away: { name: 'AZUL', color: '#00c', score: 9, fouls: 2 },
      },
    }
    const next = reduce(state, { type: 'newGame', at: 0 })
    expect(next.period).toBe(1)
    expect(next.game).toEqual({ remainingMs: 480_000, startedAt: null })
    expect(next.shot).toEqual({ remainingMs: 24_000, startedAt: null })
    expect(next.teams.home).toEqual({ name: 'ROJA', color: '#c00', score: 0, fouls: 0 })
    expect(next.teams.away).toEqual({ name: 'AZUL', color: '#00c', score: 0, fouls: 0 })
  })
})

describe('settle', () => {
  it('stops both clocks at the shot expiry instant when the shot clock runs out first', () => {
    const state = runningState(0)
    const next = settle(state, 30_000)
    expect(next.game).toEqual({ remainingMs: 576_000, startedAt: null })
    expect(next.shot).toEqual({ remainingMs: 0, startedAt: null })
  })

  it('stops both clocks at the game expiry instant when the game clock runs out first', () => {
    const state = runningState(0, 18_000, 24_000)
    const next = settle(state, 20_000)
    expect(next.game).toEqual({ remainingMs: 0, startedAt: null })
    expect(next.shot).toEqual({ remainingMs: 6_000, startedAt: null })
  })

  it('stops the game clock alone when the shot clock is stopped', () => {
    const state = { ...runningState(0, 18_000), shot: { remainingMs: 6_000, startedAt: null } }
    const next = settle(state, 20_000)
    expect(next.game).toEqual({ remainingMs: 0, startedAt: null })
    expect(next.shot).toEqual({ remainingMs: 6_000, startedAt: null })
  })

  it('returns the same state when no running clock has expired', () => {
    const state = runningState(0)
    expect(settle(state, 10_000)).toBe(state)
    const stopped = initialGame()
    expect(settle(stopped, 100_000)).toBe(stopped)
  })
})

describe('reduce applies settle before the action', () => {
  it('settles an expired running clock and then acts on the stopped state', () => {
    const state = runningState(0, 18_000, 24_000)
    const next = reduce(state, { type: 'score', at: 20_000, team: 'home', points: 2 })
    expect(next.game).toEqual({ remainingMs: 0, startedAt: null })
    expect(next.shot).toEqual({ remainingMs: 6_000, startedAt: null })
    expect(next.teams.home.score).toBe(2)
  })

  it('tick only settles', () => {
    const state = runningState(0, 18_000, 24_000)
    expect(reduce(state, { type: 'tick', at: 20_000 })).toEqual(settle(state, 20_000))
  })
})

describe('shotClockVisible', () => {
  it('is true when the shot clock remaining is less than or equal to the game clock remaining', () => {
    const stopped = initialGame()
    expect(shotClockVisible(stopped, 0)).toBe(true)

    const running = runningState(0, 100_000, 24_000)
    expect(shotClockVisible(running, 0)).toBe(true)
    expect(shotClockVisible(running, 90_000)).toBe(true) // shot 0 <= game 10_000

    const gameSmaller = runningState(0, 10_000, 24_000)
    expect(shotClockVisible(gameSmaller, 0)).toBe(false)
  })
})

describe('Action exhaustiveness', () => {
  it('reduces every action type without throwing', () => {
    const actions: Action[] = [
      { type: 'tick', at: 0 },
      { type: 'toggleRunning', at: 0 },
      { type: 'resetShot', at: 0, ms: 14_000 },
      { type: 'score', at: 0, team: 'home', points: 3 },
      { type: 'foul', at: 0, team: 'away', delta: 1 },
      { type: 'adjustGame', at: 0, deltaMs: 1_000 },
      { type: 'adjustShot', at: 0, deltaMs: -1_000 },
      { type: 'nextPeriod', at: 0 },
      { type: 'setTeam', at: 0, team: 'home', name: 'X', color: '#123456' },
      { type: 'setSettings', at: 0, periodMinutes: 10, overtimeMinutes: 5 },
      { type: 'newGame', at: 0 },
    ]
    for (const action of actions) {
      expect(() => reduce(initialGame(), action)).not.toThrow()
    }
  })
})
