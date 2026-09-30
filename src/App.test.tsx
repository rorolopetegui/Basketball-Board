import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'

vi.mock('./board/Board', () => ({ Board: () => <div data-testid="board" /> }))
vi.mock('./control/Control', () => ({ Control: () => <div data-testid="control" /> }))
import App from './App'

afterEach(() => {
  window.location.hash = ''
})

describe('App', () => {
  it('renders the app title', () => {
    render(<App />)
    expect(screen.getByTestId('control')).toBeInTheDocument()
  })

  it('renders Control by default', () => {
    render(<App />)
    expect(screen.getByTestId('control')).toBeInTheDocument()
    expect(screen.queryByTestId('board')).not.toBeInTheDocument()
  })

  it('renders Board when hash is #board', () => {
    window.location.hash = '#board'
    render(<App />)
    expect(screen.getByTestId('board')).toBeInTheDocument()
    expect(screen.queryByTestId('control')).not.toBeInTheDocument()
  })

  it('switches to Board on hashchange', () => {
    render(<App />)
    expect(screen.getByTestId('control')).toBeInTheDocument()
    act(() => {
      window.location.hash = '#board'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.getByTestId('board')).toBeInTheDocument()
    expect(screen.queryByTestId('control')).not.toBeInTheDocument()
  })

  it('switches back to Control when hash is cleared', () => {
    window.location.hash = '#board'
    render(<App />)
    expect(screen.getByTestId('board')).toBeInTheDocument()
    act(() => {
      window.location.hash = ''
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.getByTestId('control')).toBeInTheDocument()
    expect(screen.queryByTestId('board')).not.toBeInTheDocument()
  })
})
