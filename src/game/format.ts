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

// "4:30", "4:30.5", "45", "45.3" or "45,3" (a Spanish keyboard types a comma), "120" (seconds).
const CLOCK_INPUT = /^(?:(\d{1,2}):([0-5]?\d)|(\d{1,4}))(?:[.,](\d))?$/

/** A time typed by the operator, in milliseconds; null when it is not one of the accepted forms. */
export function parseClockInput(text: string): number | null {
  const match = CLOCK_INPUT.exec(text.trim())
  if (!match) return null
  const [, minutes, seconds, onlySeconds, tenths] = match
  const totalSeconds = minutes !== undefined ? Number(minutes) * 60 + Number(seconds) : Number(onlySeconds)
  return totalSeconds * 1000 + Number(tenths ?? 0) * 100
}

/** A clock speed as the operator reads it: 1.005 → "100,5 %". */
export function formatClockRate(rate: number): string {
  return `${(rate * 100).toFixed(1).replace('.', ',')} %`
}

export function periodLabel(period: number): string {
  if (period <= 4) return `CUARTO ${period}`
  if (period === 5) return 'TIEMPO EXTRA'
  return `TIEMPO EXTRA ${period - 4}`
}
