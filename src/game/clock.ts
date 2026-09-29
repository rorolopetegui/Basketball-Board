export interface Clock {
  remainingMs: number
  startedAt: number | null
}

export function remaining(clock: Clock, now: number): number {
  if (clock.startedAt === null) return clock.remainingMs
  return Math.max(0, clock.remainingMs - (now - clock.startedAt))
}

export function isRunning(clock: Clock): boolean {
  return clock.startedAt !== null
}

export function startClock(clock: Clock, now: number): Clock {
  if (isRunning(clock) || remaining(clock, now) === 0) return clock
  return { remainingMs: clock.remainingMs, startedAt: now }
}

export function stopClock(clock: Clock, now: number): Clock {
  return { remainingMs: remaining(clock, now), startedAt: null }
}

export function setClock(clock: Clock, ms: number, now: number): Clock {
  if (isRunning(clock)) return { remainingMs: ms, startedAt: now }
  return { remainingMs: ms, startedAt: null }
}
