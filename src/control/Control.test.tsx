import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { playBuzzer } from '../audio/buzzer'
import { initialGame, type GameState } from '../game/game'
import { loadGame, saveGame } from '../sync/link'
import { Control } from './Control'

vi.mock('../audio/buzzer', () => ({ playBuzzer: vi.fn() }))

const START = 1_000_000

function button(name: string | RegExp) {
  return screen.getByRole('button', { name })
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

function renderWith(state?: GameState) {
  if (state) saveGame(state)
  return render(<Control />)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(START)
  window.localStorage.clear()
  vi.mocked(playBuzzer).mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('Control', () => {
  it('sets the title and shows the period, game clock and shot clock', () => {
    renderWith()
    expect(document.title).toBe('LBABoard — Mesa de control')
    expect(screen.getByText('CUARTO 1')).toBeInTheDocument()
    expect(screen.getByText('10:00')).toBeInTheDocument()
    expect(screen.getByTestId('shot-clock')).toHaveTextContent('24')
  })

  it('restores the saved game', () => {
    const saved = initialGame()
    saved.teams.home.score = 41
    renderWith(saved)
    expect(screen.getByText('41')).toBeInTheDocument()
  })

  it('starts and stops the clocks, which count down while running', () => {
    renderWith()
    fireEvent.click(button('Iniciar'))
    advance(3_000)
    expect(screen.getByText('9:57')).toBeInTheDocument()
    expect(screen.getByTestId('shot-clock')).toHaveTextContent('21')
    fireEvent.click(button('Detener'))
    advance(5_000)
    expect(screen.getByText('9:57')).toBeInTheDocument()
    expect(button('Iniciar')).toBeInTheDocument()
  })

  it('resets the shot clock to 24 or 14 while running, and it keeps running', () => {
    renderWith()
    fireEvent.click(button('Iniciar'))
    advance(10_000)
    expect(button('24')).toBeEnabled()
    fireEvent.click(button('14'))
    advance(1_000)
    expect(screen.getByTestId('shot-clock')).toHaveTextContent('13')
    fireEvent.click(button('24'))
    advance(2_000)
    expect(screen.getByTestId('shot-clock')).toHaveTextContent('22')
  })

  it('adjusts both clocks by a second only while stopped', () => {
    renderWith()
    fireEvent.click(button('Juego −1 s'))
    expect(screen.getByText('9:59')).toBeInTheDocument()
    fireEvent.click(button('Posesión −1 s'))
    expect(screen.getByTestId('shot-clock')).toHaveTextContent('23')
    fireEvent.click(button('Iniciar'))
    for (const name of ['Juego −1 s', 'Juego +1 s', 'Posesión −1 s', 'Posesión +1 s', 'Siguiente período']) {
      expect(button(name)).toBeDisabled()
    }
  })

  it('stops both clocks when the shot clock runs out and sounds the buzzer once', () => {
    renderWith()
    fireEvent.click(button('Iniciar'))
    advance(25_000)
    expect(button('Iniciar')).toBeInTheDocument()
    expect(screen.getByText('9:36')).toBeInTheDocument()
    expect(screen.getByTestId('shot-clock')).toHaveTextContent('0.0')
    expect(playBuzzer).toHaveBeenCalledTimes(1)
    advance(5_000)
    expect(playBuzzer).toHaveBeenCalledTimes(1)
  })

  it('sounds the buzzer when the game clock runs out with the shot clock off', () => {
    const endOfQuarter = initialGame()
    endOfQuarter.game.remainingMs = 5_000
    endOfQuarter.shot.remainingMs = 14_000
    renderWith(endOfQuarter)
    expect(screen.getByTestId('shot-clock')).toHaveClass('off')
    fireEvent.click(button('Iniciar'))
    advance(6_000)
    expect(screen.getByText('0.0')).toBeInTheDocument()
    expect(playBuzzer).toHaveBeenCalledTimes(1)
  })

  it('does not sound the buzzer on a manual stop or when muted', () => {
    renderWith()
    fireEvent.click(button('Iniciar'))
    advance(1_000)
    fireEvent.click(button('Detener'))
    expect(playBuzzer).not.toHaveBeenCalled()

    fireEvent.click(button('Sonido: sí'))
    expect(window.localStorage.getItem('lbaboard.muted')).toBe('true')
    fireEvent.click(button('Iniciar'))
    advance(30_000)
    expect(playBuzzer).not.toHaveBeenCalled()
  })

  it('remembers the sound setting', () => {
    window.localStorage.setItem('lbaboard.muted', 'true')
    renderWith()
    fireEvent.click(button('Sonido: no'))
    expect(button('Sonido: sí')).toBeInTheDocument()
    expect(window.localStorage.getItem('lbaboard.muted')).toBe('false')
  })

  it('asks before moving to the next period while time remains', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderWith()
    fireEvent.click(button('Siguiente período'))
    expect(confirm).toHaveBeenCalledWith('El reloj no llegó a 0. ¿Pasar al período siguiente?')
    expect(screen.getByText('CUARTO 1')).toBeInTheDocument()
    confirm.mockReturnValue(true)
    fireEvent.click(button('Siguiente período'))
    expect(screen.getByText('CUARTO 2')).toBeInTheDocument()
  })

  it('moves to the next period without asking when the clock is at 0', () => {
    const confirm = vi.spyOn(window, 'confirm')
    const ended = initialGame()
    ended.game.remainingMs = 0
    renderWith(ended)
    fireEvent.click(button('Siguiente período'))
    expect(confirm).not.toHaveBeenCalled()
    expect(screen.getByText('CUARTO 2')).toBeInTheDocument()
  })

  it('starts a new game only when confirmed', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const saved = initialGame()
    saved.teams.away.score = 55
    renderWith(saved)
    fireEvent.click(button('Nuevo partido'))
    expect(confirm).toHaveBeenCalledWith('¿Empezar un partido nuevo? Se borran el marcador, las faltas y el reloj.')
    expect(screen.getByText('55')).toBeInTheDocument()
    confirm.mockReturnValue(true)
    fireEvent.click(button('Nuevo partido'))
    expect(screen.queryByText('55')).not.toBeInTheDocument()
  })

  it('changes the quarter and overtime length', () => {
    renderWith()
    fireEvent.change(screen.getByLabelText('Minutos por cuarto'), { target: { value: '12' } })
    expect(screen.getByText('12:00')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Minutos por tiempo extra'), { target: { value: '3' } })
    expect(loadGame()?.settings).toEqual({ periodMinutes: 12, overtimeMinutes: 3 })
  })

  it('scores, fouls and names teams from the team panels and the keyboard', () => {
    renderWith()
    fireEvent.click(button('LOCAL +3'))
    fireEvent.keyDown(window, { code: 'KeyI' })
    fireEvent.keyDown(window, { code: 'KeyK' })
    const state = loadGame()
    expect(state?.teams.home.score).toBe(3)
    expect(state?.teams.away.score).toBe(2)
    expect(state?.teams.away.fouls).toBe(1)
    fireEvent.keyDown(window, { code: 'Space' })
    expect(button('Detener')).toBeInTheDocument()
  })

  it('renders the shortcut legend and opens the board', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    renderWith()
    expect(screen.getByText('Posesión 24')).toBeInTheDocument()
    fireEvent.click(button('Abrir tablero'))
    expect(open).toHaveBeenCalledWith(expect.stringMatching(/#board$/), 'lbaboard-board', 'popup,width=1280,height=720')
  })
})
