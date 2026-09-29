function secondsAndTenths(ms: number): string {
  const total = Math.floor(ms)
  return `${Math.floor(total / 1000)}.${Math.floor(total / 100) % 10}`
}

export function formatGameClock(ms: number): string {
  if (ms >= 60_000) {
    const minutes = Math.floor(ms / 60_000)
    const seconds = Math.floor(ms / 1000) % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }
  return secondsAndTenths(ms)
}

export function formatShotClock(ms: number): string {
  if (ms >= 5_000) return String(Math.floor(ms / 1000))
  return secondsAndTenths(ms)
}

export function periodLabel(period: number): string {
  if (period <= 4) return `CUARTO ${period}`
  if (period === 5) return 'TIEMPO EXTRA'
  return `TIEMPO EXTRA ${period - 4}`
}
