export interface Clock {
  remainingMs: number
  startedAt: number | null
}

// `rate` is how many clock milliseconds pass per real millisecond: 1 is real time, 1.03 a clock 3 % fast (the
// board can match a court clock that is not exact).

export function remaining(clock: Clock, now: number, rate = 1): number {
  if (clock.startedAt === null) return clock.remainingMs
  // A reading taken before the start (a stale timestamp) must not show more time than the clock had.
  const elapsed = Math.max(0, now - clock.startedAt) * rate
  return Math.max(0, clock.remainingMs - elapsed)
}

/** The real time at which a running clock reaches 0; null when stopped. */
export function expiresAt(clock: Clock, rate = 1): number | null {
  return clock.startedAt === null ? null : clock.startedAt + clock.remainingMs / rate
}

export function isRunning(clock: Clock): boolean {
  return clock.startedAt !== null
}

export function startClock(clock: Clock, now: number): Clock {
  if (isRunning(clock) || remaining(clock, now) === 0) return clock
  return { remainingMs: clock.remainingMs, startedAt: now }
}

export function stopClock(clock: Clock, now: number, rate = 1): Clock {
  return { remainingMs: remaining(clock, now, rate), startedAt: null }
}

export function setClock(clock: Clock, ms: number, now: number): Clock {
  if (isRunning(clock)) return { remainingMs: ms, startedAt: now }
  return { remainingMs: ms, startedAt: null }
}
