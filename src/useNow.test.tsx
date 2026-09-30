import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNow } from './useNow'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useNow', () => {
  it('returns the current time', () => {
    const { result } = renderHook(() => useNow(true))
    expect(result.current).toBe(1767225600000)
  })

  it('advances every 50 ms when active', () => {
    const { result } = renderHook(() => useNow(true))
    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current).toBe(1767225600050)
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(result.current).toBe(1767225600200)
  })

  it('uses a custom interval', () => {
    const { result } = renderHook(() => useNow(true, 1000))
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current).toBe(1767225601000)
  })

  it('does not advance when inactive', () => {
    const { result } = renderHook(() => useNow(false))
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current).toBe(1767225600000)
  })

  it('starts ticking when it becomes active', () => {
    const { result, rerender } = renderHook((active: boolean) => useNow(active), { initialProps: false })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current).toBe(1767225600000)
    rerender(true)
    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current).toBe(1767225600550)
  })

  it('clears the interval on unmount', () => {
    const { unmount } = renderHook(() => useNow(true))
    unmount()
    expect(() => act(() => vi.advanceTimersByTime(5000))).not.toThrow()
  })
})
