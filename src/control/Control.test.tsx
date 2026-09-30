import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Control } from './Control'

vi.mock('../audio/buzzer', () => ({ playBuzzer: vi.fn() }))
import { playBuzzer } from '../audio/buzzer'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
  window.localStorage.clear()
  vi.mocked(playBuzzer).mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Control', () => {
  it('sets the document title', () => {
    render(<Control />)
    expect(document.title).toBe('LBABoard — Mesa de control')
  })

  it('shows the period label', () => {
    render(<Control />)
    expect(screen.getByText('CUARTO 1')).toBeInTheDocument()
  })

  it('shows Iniciar button when not running', () => {
    render(<Control />)
    expect(screen.getByRole('button', { name: 'Iniciar' })).toBeInTheDocument()
  })

  it('shows Detener button when running', () => {
    render(<Control />)
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar' }))
    expect(screen.getByRole('button', { name: 'Detener' })).toBeInTheDocument()
  })

  it('disables shot and adjust buttons while running', () => {
    render(<Control />)
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar' }))
    expect(screen.getByRole('button', { name: '24' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '14' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '−1 s' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '+1 s' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Siguiente período' })).toBeDisabled()
  })

  it('enables shot and adjust buttons when stopped', () => {
    render(<Control />)
    expect(screen.getByRole('button', { name: '24' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '14' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '−1 s' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '+1 s' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Siguiente período' })).toBeEnabled()
  })

  it('shows game clock at 10:00 initially', () => {
    render(<Control />)
    expect(screen.getByText('10:00')).toBeInTheDocument()
  })

  it('shows shot clock at 24 initially', () => {
    render(<Control />)
    expect(screen.getByTestId('shot-clock')).toHaveTextContent('24')
  })

  it('toggles sound and persists to localStorage', () => {
    render(<Control />)
    const btn = screen.getByRole('button', { name: /Sonido/ })
    expect(btn).toHaveTextContent('Sonido: sí')
    fireEvent.click(btn)
    expect(btn).toHaveTextContent('Sonido: no')
    expect(window.localStorage.getItem('lbaboard.muted')).toBe('true')
    fireEvent.click(btn)
    expect(btn).toHaveTextContent('Sonido: sí')
    expect(window.localStorage.getItem('lbaboard.muted')).toBe('false')
  })

  it('shows settings inputs with default values', () => {
    render(<Control />)
    const periodInput = screen.getByLabelText(/Minutos por período/) as HTMLInputElement
    expect(periodInput).toHaveValue(10)
    const otInput = screen.getByLabelText(/Minutos de prórroga/) as HTMLInputElement
    expect(otInput).toHaveValue(5)
  })

  it('renders shortcut legend items', () => {
    render(<Control />)
    expect(screen.getByText('Iniciar / detener')).toBeInTheDocument()
    expect(screen.getByText('Reloj de balón 24')).toBeInTheDocument()
    expect(screen.getByText('Reloj de balón 14')).toBeInTheDocument()
  })

  it('shows confirm dialog for next period when game clock has time remaining', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<Control />)
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente período' }))
    expect(confirmSpy).toHaveBeenCalledWith(
      'El reloj no llegó a 0. ¿Pasar al período siguiente?',
    )
    confirmSpy.mockRestore()
  })

  it('does not show confirm for next period when game clock is zero', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<Control />)
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar' }))
    vi.advanceTimersByTime(600_000)
    fireEvent.click(screen.getByRole('button', { name: 'Detener' }))
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente período' }))
    expect(confirmSpy).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('shows confirm dialog for new game', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<Control />)
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo partido' }))
    expect(confirmSpy).toHaveBeenCalledWith(
      '¿Empezar un partido nuevo? Se borran el marcador, las faltas y el reloj.',
    )
    confirmSpy.mockRestore()
  })

  it('renders Abrir tablero button', () => {
    render(<Control />)
    expect(screen.getByRole('button', { name: 'Abrir tablero' })).toBeInTheDocument()
  })
})
