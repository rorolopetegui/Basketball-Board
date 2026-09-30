import { describe, expect, it } from 'vitest'
import { isRunning, remaining, setClock, startClock, stopClock } from './clock'

describe('remaining', () => {
  it('subtracts elapsed time from a running clock', () => {
    expect(remaining({ remainingMs: 10_000, startedAt: 1_000 }, 4_000)).toBe(7_000)
  })

  it('never goes below 0', () => {
    const clock = { remainingMs: 1_000, startedAt: 0 }
    expect(remaining(clock, 1_000)).toBe(0)
    expect(remaining(clock, 10_000)).toBe(0)
  })

  it('returns remainingMs for a stopped clock', () => {
    expect(remaining({ remainingMs: 12_345, startedAt: null }, 99_999)).toBe(12_345)
  })

  it('never exceeds remainingMs when read before the start time', () => {
    expect(remaining({ remainingMs: 300_000, startedAt: 50_000 }, 10_000)).toBe(300_000)
  })
})

describe('isRunning', () => {
  it('is true when startedAt is set and false when null', () => {
    expect(isRunning({ remainingMs: 0, startedAt: 0 })).toBe(true)
    expect(isRunning({ remainingMs: 0, startedAt: null })).toBe(false)
  })
})

describe('startClock', () => {
  it('returns the same clock when it is already running', () => {
    const clock = { remainingMs: 5_000, startedAt: 1_000 }
    expect(startClock(clock, 2_000)).toBe(clock)
  })

  it('returns the same clock when its remaining is 0', () => {
    const stopped = { remainingMs: 0, startedAt: null }
    expect(startClock(stopped, 1_000)).toBe(stopped)
    const exhausted = { remainingMs: 5_000, startedAt: 0 }
    expect(startClock(exhausted, 5_000)).toBe(exhausted)
  })

  it('starts a stopped clock with its remaining value from now', () => {
    expect(startClock({ remainingMs: 7_500, startedAt: null }, 1_234)).toEqual({
      remainingMs: 7_500,
      startedAt: 1_234,
    })
  })
})

describe('stopClock', () => {
  it('freezes remaining(clock, now) and sets startedAt to null', () => {
    expect(stopClock({ remainingMs: 10_000, startedAt: 1_000 }, 4_000)).toEqual({
      remainingMs: 7_000,
      startedAt: null,
    })
  })

  it('freezes at 0 once the clock has run out', () => {
    expect(stopClock({ remainingMs: 1_000, startedAt: 0 }, 5_000)).toEqual({
      remainingMs: 0,
      startedAt: null,
    })
  })
})

describe('setClock', () => {
  it('restarts the count from now on a running clock', () => {
    expect(setClock({ remainingMs: 3_000, startedAt: 1_000 }, 15_000, 7_000)).toEqual({
      remainingMs: 15_000,
      startedAt: 7_000,
    })
  })

  it('keeps a stopped clock stopped', () => {
    expect(setClock({ remainingMs: 3_000, startedAt: null }, 15_000, 7_000)).toEqual({
      remainingMs: 15_000,
      startedAt: null,
    })
  })
})
