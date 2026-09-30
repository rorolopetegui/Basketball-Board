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

  it('stops only the shot clock when it runs out (running time) and sounds the buzzer once', () => {
    renderWith()
    fireEvent.click(button('Iniciar'))
    advance(25_000)
    expect(button('Detener')).toBeInTheDocument()
    expect(screen.getByText('9:35')).toBeInTheDocument()
    expect(screen.getByTestId('shot-clock')).toHaveTextContent('0.0')
    expect(playBuzzer).toHaveBeenCalledTimes(1)
    advance(5_000)
    expect(screen.getByText('9:30')).toBeInTheDocument()
    expect(screen.getByTestId('shot-clock')).toHaveTextContent('0.0')
    expect(playBuzzer).toHaveBeenCalledTimes(1)
    fireEvent.click(button('24'))
    advance(1_000)
    expect(screen.getByTestId('shot-clock')).toHaveTextContent('23')
  })

  it('pauses and resumes the shot clock on its own while the game clock runs', () => {
    renderWith()
    expect(button('Pausar posesión')).toBeDisabled()
    fireEvent.click(button('Iniciar'))
    advance(2_000)
    fireEvent.click(button('Pausar posesión'))
    advance(3_000)
    expect(screen.getByTestId('shot-clock')).toHaveTextContent('22')
    expect(screen.getByText('9:55')).toBeInTheDocument()
    expect(playBuzzer).not.toHaveBeenCalled()
    fireEvent.keyDown(window, { code: 'KeyC' })
    advance(2_000)
    expect(screen.getByTestId('shot-clock')).toHaveTextContent('20')
    fireEvent.click(button('Detener'))
    expect(button('Pausar posesión')).toBeDisabled()
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

  it('sets the game clock to a typed time with the pencil, also while it runs', () => {
    renderWith()
    fireEvent.click(button('Editar tiempo de juego'))
    const input = screen.getByLabelText('Valor de tiempo de juego')
    expect(input).toHaveValue('10:00')
    fireEvent.change(input, { target: { value: '4:30' } })
    fireEvent.submit(input)
    expect(screen.getByText('4:30')).toBeInTheDocument()
    expect(screen.queryByLabelText('Valor de tiempo de juego')).not.toBeInTheDocument()

    fireEvent.click(button('Iniciar'))
    advance(2_000)
    fireEvent.click(button('Editar tiempo de juego'))
    fireEvent.change(screen.getByLabelText('Valor de tiempo de juego'), { target: { value: '3:00' } })
    fireEvent.click(button('OK'))
    advance(1_000)
    expect(screen.getByText('2:59')).toBeInTheDocument()
    expect(button('Detener')).toBeInTheDocument()
  })

  it('explains the format of a time it cannot read, and Escape cancels', () => {
    renderWith()
    fireEvent.click(button('Editar tiempo de juego'))
    const input = screen.getByLabelText('Valor de tiempo de juego')
    fireEvent.change(input, { target: { value: '4:75' } })
    fireEvent.submit(input)
    expect(screen.getByRole('alert')).toHaveTextContent('4:30, 45 o 12.5')
    expect(screen.getByText('10:00')).toBeInTheDocument()
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryByLabelText('Valor de tiempo de juego')).not.toBeInTheDocument()
    expect(button('Editar tiempo de juego')).toBeInTheDocument()
  })

  it('does not treat typing in the editor as shortcuts', () => {
    renderWith()
    fireEvent.click(button('Editar tiempo de juego'))
    const input = screen.getByLabelText('Valor de tiempo de juego')
    fireEvent.keyDown(input, { code: 'Space' })
    fireEvent.keyDown(input, { code: 'KeyQ' })
    expect(button('Iniciar')).toBeInTheDocument()
    expect(loadGame()?.teams.home.score).toBe(0)
  })

  it('sets the shot clock to a typed time with its pencil', () => {
    renderWith()
    fireEvent.click(button('Editar posesión'))
    const input = screen.getByLabelText('Valor de posesión')
    expect(input).toHaveValue('24')
    fireEvent.change(input, { target: { value: '12,5' } })
    fireEvent.submit(input)
    expect(screen.getByTestId('shot-clock')).toHaveTextContent('12')
    expect(loadGame()?.shot.remainingMs).toBe(12_500)
  })

  it('changes the clock speed in 0.5 % steps, and the clocks follow it', () => {
    renderWith()
    const speed = screen.getByRole('group', { name: 'Velocidad de los relojes' })
    expect(speed).toHaveTextContent('100,0 %')
    expect(button('Normal')).toBeDisabled()
    fireEvent.click(button('Velocidad +0,5 %'))
    expect(speed).toHaveTextContent('100,5 %')
    for (let i = 0; i < 19; i++) fireEvent.click(button('Velocidad +0,5 %'))
    expect(speed).toHaveTextContent('110,0 %')
    fireEvent.click(button('Iniciar'))
    advance(10_000)
    expect(screen.getByText('9:49')).toBeInTheDocument()
    expect(screen.getByTestId('shot-clock')).toHaveTextContent('13')
    fireEvent.click(button('Normal'))
    expect(speed).toHaveTextContent('100,0 %')
    advance(10_000)
    expect(screen.getByText('9:39')).toBeInTheDocument()
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
    expect(loadGame()?.settings).toEqual({ periodMinutes: 12, overtimeMinutes: 3, clockRate: 1 })
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
