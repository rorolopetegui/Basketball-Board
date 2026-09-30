import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { initialGame, type GameState } from '../game/game'
import { STORAGE_KEY, isMessage, loadGame, saveGame, useBoardState, useControlLink } from './link'

function setOpener(opener: unknown) {
  Object.defineProperty(window, 'opener', { value: opener, configurable: true, writable: true })
}

function fakeWindow(): Window {
  return { closed: false, postMessage: vi.fn(), focus: vi.fn() } as unknown as Window
}

function deliver(data: unknown, source?: unknown) {
  const event = new MessageEvent('message', { data })
  if (source !== undefined) {
    Object.defineProperty(event, 'source', { value: source, configurable: true })
  }
  window.dispatchEvent(event)
}

function fireStorage(key: string) {
  window.dispatchEvent(new StorageEvent('storage', { key }))
}

describe('saveGame / loadGame', () => {
  it('round-trips a state through localStorage', () => {
    const state = initialGame()
    saveGame(state)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(state))
    expect(loadGame()).toEqual(state)
  })

  it('returns null when nothing is stored', () => {
    window.localStorage.clear()
    expect(loadGame()).toBeNull()
  })

  it('returns null for malformed JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{nope')
    expect(loadGame()).toBeNull()
  })

  it('returns null for stored data that fails validation', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2 }))
    expect(loadGame()).toBeNull()
  })

  it('saveGame never throws when storage is blocked', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => saveGame(initialGame())).not.toThrow()
    spy.mockRestore()
  })

  it('loadGame returns null when storage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(loadGame()).toBeNull()
    spy.mockRestore()
  })
})

describe('isMessage', () => {
  it('rejects non-objects', () => {
    expect(isMessage(null)).toBe(false)
    expect(isMessage(42)).toBe(false)
    expect(isMessage('x')).toBe(false)
    expect(isMessage([1])).toBe(false)
  })

  it('rejects messages from other apps', () => {
    expect(isMessage({ app: 'other', kind: 'hello' })).toBe(false)
    expect(isMessage({ kind: 'hello' })).toBe(false)
  })

  it('accepts a hello message', () => {
    expect(isMessage({ app: 'lbaboard', kind: 'hello' })).toBe(true)
  })

  it('accepts a state whose payload validates', () => {
    expect(isMessage({ app: 'lbaboard', kind: 'state', state: initialGame() })).toBe(true)
  })

  it('rejects a state whose payload fails validation', () => {
    expect(isMessage({ app: 'lbaboard', kind: 'state', state: { version: 2 } })).toBe(false)
    expect(isMessage({ app: 'lbaboard', kind: 'state' })).toBe(false)
  })

  it('rejects unknown kinds', () => {
    expect(isMessage({ app: 'lbaboard', kind: 'bye' })).toBe(false)
  })
})

describe('useBoardState', () => {
  it('initializes from localStorage', () => {
    const state = initialGame()
    saveGame(state)
    const { result } = renderHook(() => useBoardState())
    expect(result.current).toEqual(state)
  })

  it('falls back to initialGame when nothing is stored', () => {
    window.localStorage.clear()
    const { result } = renderHook(() => useBoardState())
    expect(result.current).toEqual(initialGame())
  })

  it('greets the opener with hello once', () => {
    const opener = { postMessage: vi.fn() } as unknown as Window
    setOpener(opener)
    renderHook(() => useBoardState())
    expect(opener.postMessage).toHaveBeenCalledTimes(1)
    expect(opener.postMessage).toHaveBeenCalledWith({ app: 'lbaboard', kind: 'hello' }, '*')
  })

  it('does not greet when there is no opener', () => {
    setOpener(null)
    const { result } = renderHook(() => useBoardState())
    expect(result.current).toBeDefined()
  })

  it('applies a valid state message', () => {
    setOpener(null)
    window.localStorage.clear()
    const { result } = renderHook(() => useBoardState())
    const next = { ...initialGame(), period: 2 }
    act(() => {
      deliver({ app: 'lbaboard', kind: 'state', state: next })
    })
    expect(result.current).toEqual(next)
  })

  it('ignores messages that fail validation', () => {
    setOpener(null)
    window.localStorage.clear()
    const { result } = renderHook(() => useBoardState())
    const before = result.current
    act(() => {
      deliver({ app: 'lbaboard', kind: 'state', state: { version: 2 } })
      deliver({ app: 'other', kind: 'state', state: initialGame() })
      deliver({ app: 'lbaboard', kind: 'hello' })
    })
    expect(result.current).toEqual(before)
  })

  it('reloads from storage on the storage event for the game key', () => {
    setOpener(null)
    window.localStorage.clear()
    const { result } = renderHook(() => useBoardState())
    const next = { ...initialGame(), period: 4 }
    act(() => {
      saveGame(next)
      fireStorage(STORAGE_KEY)
    })
    expect(result.current).toEqual(next)
  })

  it('ignores the storage event for other keys', () => {
    setOpener(null)
    window.localStorage.clear()
    const { result } = renderHook(() => useBoardState())
    const before = result.current
    act(() => {
      window.localStorage.setItem('lbaboard.muted', 'true')
      fireStorage('lbaboard.muted')
    })
    expect(result.current).toEqual(before)
  })
})

describe('useControlLink', () => {
  it('saves the state to localStorage on mount', () => {
    setOpener(null)
    const state = initialGame()
    renderHook(() => useControlLink(state))
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(state))
  })

  it('saves and posts a state message on every change', () => {
    setOpener(null)
    const board = fakeWindow()
    const post = vi.spyOn(board, 'postMessage')
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(board)
    const stateA = initialGame()
    const { result, rerender } = renderHook((s: GameState) => useControlLink(s), { initialProps: stateA })
    act(() => {
      result.current.openBoard()
    })
    expect(openSpy).toHaveBeenCalled()
    const stateB = { ...stateA, period: 2 }
    rerender(stateB)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(stateB))
    const calls = post.mock.calls.map((c) => c[0])
    expect(calls.some((m) => m?.kind === 'state' && m.state === stateB)).toBe(true)
    openSpy.mockRestore()
  })

  it('answers hello with the current state to the sender', () => {
    setOpener(null)
    const source = fakeWindow()
    const post = vi.spyOn(source, 'postMessage')
    const state = { ...initialGame(), period: 3 }
    renderHook(() => useControlLink(state))
    act(() => {
      deliver({ app: 'lbaboard', kind: 'hello' }, source)
    })
    expect(post).toHaveBeenCalledWith({ app: 'lbaboard', kind: 'state', state }, '*')
  })

  it('openBoard opens the board URL the first time', () => {
    setOpener(null)
    const board = fakeWindow()
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(board)
    const { result } = renderHook(() => useControlLink(initialGame()))
    act(() => {
      result.current.openBoard()
    })
    expect(openSpy).toHaveBeenCalledOnce()
    const url = openSpy.mock.calls[0][0] as string
    expect(url.endsWith('#board')).toBe(true)
    openSpy.mockRestore()
  })

  it('openBoard focuses the board if it is still open', () => {
    setOpener(null)
    const board = fakeWindow()
    const focus = vi.spyOn(board, 'focus')
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(board)
    const { result } = renderHook(() => useControlLink(initialGame()))
    act(() => {
      result.current.openBoard()
    })
    act(() => {
      result.current.openBoard()
    })
    expect(openSpy).toHaveBeenCalledTimes(1)
    expect(focus).toHaveBeenCalledTimes(1)
    openSpy.mockRestore()
  })
})
