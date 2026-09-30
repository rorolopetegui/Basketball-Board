import { MAX_NAME_LENGTH, type Command, type Team, type TeamId } from '../game/game'
import './Control.css'

interface TeamPanelProps {
  teamId: TeamId
  team: Team
  onCommand: (command: Command) => void
}

const SCORE_POINTS: ReadonlyArray<1 | 2 | 3 | -1> = [1, 2, 3, -1]
const FOUL_DELTAS: ReadonlyArray<1 | -1> = [1, -1]

function signLabel(n: number): string {
  return n > 0 ? `+${n}` : `−${Math.abs(n)}`
}

export function TeamPanel({ teamId, team, onCommand }: TeamPanelProps) {
  return (
    <section className={`team-panel team-panel--${teamId}`} aria-label={team.name}>
      <div className="team-panel__row">
        <input
          type="text"
          className="team-panel__name"
          value={team.name}
          maxLength={MAX_NAME_LENGTH}
          aria-label={`Nombre ${team.name}`}
          onChange={(event) => onCommand({ type: 'setTeam', team: teamId, name: event.target.value })}
        />
        <input
          type="color"
          className="team-panel__color"
          value={team.color}
          aria-label={`Color ${team.name}`}
          onChange={(event) => onCommand({ type: 'setTeam', team: teamId, color: event.target.value })}
        />
      </div>
      <div className="team-panel__row">
        <span className="team-panel__score">{team.score}</span>
        {SCORE_POINTS.map((points) => (
          <button
            key={points}
            type="button"
            className="team-panel__btn"
            aria-label={`${team.name} ${signLabel(points)}`}
            onClick={() => onCommand({ type: 'score', team: teamId, points })}
          >
            {signLabel(points)}
          </button>
        ))}
      </div>
      <div className="team-panel__row">
        <span className="team-panel__fouls-label">Faltas</span>
        <span className="team-panel__fouls">{team.fouls}</span>
        {FOUL_DELTAS.map((delta) => (
          <button
            key={delta}
            type="button"
            className="team-panel__btn"
            aria-label={`${team.name} falta ${signLabel(delta)}`}
            onClick={() => onCommand({ type: 'foul', team: teamId, delta })}
          >
            {signLabel(delta)}
          </button>
        ))}
      </div>
    </section>
  )
}
