import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { type Team, type TeamId } from '../game/game'
import { TeamPanel } from './TeamPanel'

const LOCAL: Team = { name: 'LOCAL', color: '#1f6feb', score: 75, fouls: 2 }

function setup(teamId: TeamId = 'home', team: Team = LOCAL) {
  const onCommand = vi.fn()
  render(<TeamPanel teamId={teamId} team={team} onCommand={onCommand} />)
  return { onCommand }
}

describe('TeamPanel', () => {
  it('renders the name, color, score and fouls', () => {
    setup()
    expect((screen.getByLabelText('Nombre LOCAL') as HTMLInputElement).value).toBe('LOCAL')
    expect((screen.getByLabelText('Color LOCAL') as HTMLInputElement).value).toBe('#1f6feb')
    expect(screen.getByText('75')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('limits the name input to 12 characters', () => {
    setup()
    expect((screen.getByLabelText('Nombre LOCAL') as HTMLInputElement).maxLength).toBe(12)
  })

  it('sends setTeam when the name changes', () => {
    const { onCommand } = setup()
    fireEvent.change(screen.getByLabelText('Nombre LOCAL'), { target: { value: 'PUMAS' } })
    expect(onCommand).toHaveBeenCalledWith({ type: 'setTeam', team: 'home', name: 'PUMAS' })
  })

  it('keeps what is typed (spaces, an empty field) until the field loses focus', () => {
    const { onCommand } = setup()
    const input = screen.getByLabelText('Nombre LOCAL') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'LOS ' } })
    expect(input.value).toBe('LOS ')
    expect(onCommand).toHaveBeenLastCalledWith({ type: 'setTeam', team: 'home', name: 'LOS ' })
    fireEvent.change(input, { target: { value: '' } })
    expect(input.value).toBe('')
    fireEvent.blur(input)
    expect(input.value).toBe('LOCAL')
  })

  it('marks the team fouls from 4 on', () => {
    setup('home', { ...LOCAL, fouls: 4 })
    expect(screen.getByText('4')).toHaveClass('alert')
  })

  it('sends setTeam when the color changes', () => {
    const { onCommand } = setup()
    fireEvent.change(screen.getByLabelText('Color LOCAL'), { target: { value: '#00ff00' } })
    expect(onCommand).toHaveBeenCalledWith({ type: 'setTeam', team: 'home', color: '#00ff00' })
  })

  it('sends score commands with team-named accessible buttons', () => {
    const { onCommand } = setup()
    fireEvent.click(screen.getByLabelText('LOCAL +1'))
    expect(onCommand).toHaveBeenCalledWith({ type: 'score', team: 'home', points: 1 })
    fireEvent.click(screen.getByLabelText('LOCAL +2'))
    expect(onCommand).toHaveBeenCalledWith({ type: 'score', team: 'home', points: 2 })
    fireEvent.click(screen.getByLabelText('LOCAL +3'))
    expect(onCommand).toHaveBeenCalledWith({ type: 'score', team: 'home', points: 3 })
    fireEvent.click(screen.getByLabelText('LOCAL −1'))
    expect(onCommand).toHaveBeenCalledWith({ type: 'score', team: 'home', points: -1 })
  })

  it('sends foul commands with team-named accessible buttons', () => {
    const { onCommand } = setup()
    fireEvent.click(screen.getByLabelText('LOCAL falta +1'))
    expect(onCommand).toHaveBeenCalledWith({ type: 'foul', team: 'home', delta: 1 })
    fireEvent.click(screen.getByLabelText('LOCAL falta −1'))
    expect(onCommand).toHaveBeenCalledWith({ type: 'foul', team: 'home', delta: -1 })
  })

  it('targets the away team when teamId is away', () => {
    const { onCommand } = setup('away', { name: 'VISITA', color: '#d73a49', score: 68, fouls: 5 })
    fireEvent.click(screen.getByLabelText('VISITA +2'))
    expect(onCommand).toHaveBeenCalledWith({ type: 'score', team: 'away', points: 2 })
    fireEvent.change(screen.getByLabelText('Nombre VISITA'), { target: { value: 'TIGRES' } })
    expect(onCommand).toHaveBeenCalledWith({ type: 'setTeam', team: 'away', name: 'TIGRES' })
  })
})
