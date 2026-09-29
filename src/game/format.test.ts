import { describe, expect, it } from 'vitest'
import { formatGameClock, formatShotClock, periodLabel } from './format'

describe('formatGameClock', () => {
  it('shows M:SS at one minute and above', () => {
    expect(formatGameClock(600_000)).toBe('10:00')
    expect(formatGameClock(599_999)).toBe('9:59')
    expect(formatGameClock(60_000)).toBe('1:00')
  })

  it('shows seconds and tenths below one minute', () => {
    expect(formatGameClock(59_999)).toBe('59.9')
    expect(formatGameClock(9_050)).toBe('9.0')
    expect(formatGameClock(50)).toBe('0.0')
    expect(formatGameClock(0)).toBe('0.0')
  })

  it('floors values', () => {
    expect(formatGameClock(65_999)).toBe('1:05')
    expect(formatGameClock(9_999)).toBe('9.9')
  })
})

describe('formatShotClock', () => {
  it('shows whole seconds at five seconds and above', () => {
    expect(formatShotClock(24_000)).toBe('24')
    expect(formatShotClock(23_999)).toBe('23')
    expect(formatShotClock(5_000)).toBe('5')
  })

  it('shows seconds and tenths below five seconds', () => {
    expect(formatShotClock(4_999)).toBe('4.9')
    expect(formatShotClock(0)).toBe('0.0')
  })
})

describe('periodLabel', () => {
  it('labels quarters 1-4', () => {
    expect(periodLabel(1)).toBe('CUARTO 1')
    expect(periodLabel(2)).toBe('CUARTO 2')
    expect(periodLabel(3)).toBe('CUARTO 3')
    expect(periodLabel(4)).toBe('CUARTO 4')
  })

  it('labels overtimes', () => {
    expect(periodLabel(5)).toBe('TIEMPO EXTRA')
    expect(periodLabel(6)).toBe('TIEMPO EXTRA 2')
    expect(periodLabel(7)).toBe('TIEMPO EXTRA 3')
  })
})
