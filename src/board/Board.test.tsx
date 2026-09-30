import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initialGame, type GameState } from '../game/game'
import { Board } from './Board'

const mockUseBoardState = vi.fn()

vi.mock('../sync/link', () => ({
  useBoardState: () => mockUseBoardState(),
}))

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = initialGame()
  return {
    ...base,
    ...overrides,
    teams: { ...base.teams, ...(overrides.teams ?? {}) },
    settings: { ...base.settings, ...(overrides.settings ?? {}) },
  }
}

describe('Board', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(100_000)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sets document.title to the board title', () => {
    mockUseBoardState.mockReturnValue(makeState())
    render(<Board />)
    expect(document.title).toBe('LBABoard — Tablero')
  })

  it('shows team names, scores, period label, and formatted clocks', () => {
    const state = makeState({
      teams: {
        home: { name: 'Pumas', color: '#ff6600', score: 75, fouls: 2 },
        away: { name: 'Leones', color: '#0066ff', score: 72, fouls: 3 },
      },
      period: 3,
      game: { remainingMs: 300_000, startedAt: null },
      shot: { remainingMs: 24_000, startedAt: null },
    })
    mockUseBoardState.mockReturnValue(state)
    render(<Board />)

    expect(screen.getByText('PUMAS')).toBeInTheDocument()
    expect(screen.getByText('LEONES')).toBeInTheDocument()
    expect(screen.getByText('CUARTO 3')).toBeInTheDocument()

    const scores = screen.getAllByText(/^75$|^72$/)
    expect(scores).toHaveLength(2)

    expect(screen.getByText('5:00')).toBeInTheDocument()
    expect(screen.getByText('24')).toBeInTheDocument()

    const bars = document.querySelectorAll('.team-bar')
    expect(bars).toHaveLength(2)
    expect((bars[0] as HTMLElement).style.backgroundColor).toBe('rgb(255, 102, 0)')
    expect((bars[1] as HTMLElement).style.backgroundColor).toBe('rgb(0, 102, 255)')
  })

  it('hides the shot clock when shotClockVisible is false', () => {
    const state = makeState({
      game: { remainingMs: 10_000, startedAt: null },
      shot: { remainingMs: 24_000, startedAt: null },
    })
    mockUseBoardState.mockReturnValue(state)
    render(<Board />)

    expect(document.querySelector('.shot-clock')).toBeNull()
  })

  it('shows FALTAS per team and applies alert class at 4+ fouls and 0 clock', () => {
    const state = makeState({
      teams: {
        home: { name: 'LOCAL', color: '#1f6feb', score: 0, fouls: 4 },
        away: { name: 'VISITA', color: '#d73a49', score: 0, fouls: 2 },
      },
      game: { remainingMs: 0, startedAt: null },
      shot: { remainingMs: 24_000, startedAt: null },
    })
    mockUseBoardState.mockReturnValue(state)
    render(<Board />)

    expect(screen.getByText('FALTAS 4')).toBeInTheDocument()
    expect(screen.getByText('FALTAS 2')).toBeInTheDocument()

    const foulsEls = document.querySelectorAll('.fouls')
    expect(foulsEls[0].className).toContain('alert')
    expect(foulsEls[1].className).not.toContain('alert')

    const gameClock = document.querySelector('.game-clock')
    expect(gameClock?.className).toContain('alert')
    expect(screen.getByText('0.0')).toBeInTheDocument()
  })

  it('advances the displayed game clock when the clock is running', () => {
    const T = 100_000
    const state = makeState({
      game: { remainingMs: 600_000, startedAt: T },
      shot: { remainingMs: 24_000, startedAt: T },
    })
    mockUseBoardState.mockReturnValue(state)
    render(<Board />)

    expect(screen.getByText('10:00')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('9:59')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(screen.getByText('9:55')).toBeInTheDocument()
  })

  it('toggles fullscreen on double click and fades the hint after 4 s', () => {
    const requestSpy = vi.fn()
    const exitSpy = vi.fn()
    Object.defineProperty(document.documentElement, 'requestFullscreen', { value: requestSpy, configurable: true })
    Object.defineProperty(document, 'exitFullscreen', { value: exitSpy, configurable: true })

    mockUseBoardState.mockReturnValue(makeState())
    const { container } = render(<Board />)
    const board = container.querySelector('.board')!

    expect(screen.getByText('Doble clic: pantalla completa')).toBeInTheDocument()

    act(() => {
      fireEvent.doubleClick(board)
    })
    expect(requestSpy).toHaveBeenCalledOnce()
    expect(exitSpy).not.toHaveBeenCalled()

    Object.defineProperty(document, 'fullscreenElement', { get: () => document.documentElement, configurable: true })
    act(() => {
      fireEvent.doubleClick(board)
    })
    expect(exitSpy).toHaveBeenCalledOnce()
    expect(requestSpy).toHaveBeenCalledOnce()

    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(screen.queryByText('Doble clic: pantalla completa')).not.toBeInTheDocument()
  })
})
