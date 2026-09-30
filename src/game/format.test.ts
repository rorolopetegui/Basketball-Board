import { describe, expect, it } from 'vitest'
import { formatClockRate, formatGameClock, formatShotClock, parseClockInput, periodLabel } from './format'

describe('parseClockInput', () => {
  it('reads minutes:seconds, seconds and tenths (with a dot or a comma)', () => {
    expect(parseClockInput('4:30')).toBe(270_000)
    expect(parseClockInput('10:00')).toBe(600_000)
    expect(parseClockInput('0:07.2')).toBe(7_200)
    expect(parseClockInput(' 4:05 ')).toBe(245_000)
    expect(parseClockInput('45')).toBe(45_000)
    expect(parseClockInput('45.3')).toBe(45_300)
    expect(parseClockInput('12,5')).toBe(12_500)
    expect(parseClockInput('120')).toBe(120_000)
  })

  it('reads back what the clocks display (the editor starts with it)', () => {
    expect(parseClockInput('9:59')).toBe(599_000)
    expect(parseClockInput('59.9')).toBe(59_900)
    expect(parseClockInput('0.0')).toBe(0)
    expect(parseClockInput('24')).toBe(24_000)
    expect(parseClockInput('4.9')).toBe(4_900)
  })

  it('rejects anything else', () => {
    for (const text of ['', 'abc', '4:75', '4:', ':30', '1:2:3', '4.30.1', '-5', '4:30.55', '12345']) {
      expect(parseClockInput(text)).toBeNull()
    }
  })
})

describe('formatClockRate', () => {
  it('shows the speed as a percentage with a decimal comma', () => {
    expect(formatClockRate(1)).toBe('100,0 %')
    expect(formatClockRate(1.005)).toBe('100,5 %')
    expect(formatClockRate(0.97)).toBe('97,0 %')
  })
})

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
