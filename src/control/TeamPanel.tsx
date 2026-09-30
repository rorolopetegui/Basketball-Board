import { useState } from 'react'
import { MAX_NAME_LENGTH, type Command, type Team, type TeamId } from '../game/game'
import './Control.css'

interface TeamPanelProps {
  teamId: TeamId
  team: Team
  onCommand: (command: Command) => void
}

const SCORE_POINTS: ReadonlyArray<1 | 2 | 3 | -1> = [1, 2, 3, -1]
const FOUL_DELTAS: ReadonlyArray<1 | -1> = [1, -1]
const PENALTY_FOULS = 4

function signLabel(n: number): string {
  return n > 0 ? `+${n}` : `−${Math.abs(n)}`
}

/** The name field edits a draft: the game keeps the trimmed, non-empty name, which would otherwise swallow the
 *  space between two words and make the field impossible to clear while typing. */
function NameInput({ teamId, name, onCommand }: { teamId: TeamId; name: string; onCommand: TeamPanelProps['onCommand'] }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <input
      type="text"
      className="team-panel__name"
      value={draft ?? name}
      maxLength={MAX_NAME_LENGTH}
      aria-label={`Nombre ${name}`}
      onChange={(event) => {
        setDraft(event.target.value)
        onCommand({ type: 'setTeam', team: teamId, name: event.target.value })
      }}
      onBlur={() => setDraft(null)}
    />
  )
}

export function TeamPanel({ teamId, team, onCommand }: TeamPanelProps) {
  return (
    <section
      className={`team-panel team-panel--${teamId}`}
      aria-label={team.name}
      style={{ borderTopColor: team.color }}
    >
      <div className="team-panel__identity">
        <NameInput teamId={teamId} name={team.name} onCommand={onCommand} />
        <input
          type="color"
          className="team-panel__color"
          value={team.color}
          aria-label={`Color ${team.name}`}
          onChange={(event) => onCommand({ type: 'setTeam', team: teamId, color: event.target.value })}
        />
      </div>
      <div className="team-panel__score">{team.score}</div>
      <div className="team-panel__buttons">
        {SCORE_POINTS.map((points) => (
          <button
            key={points}
            type="button"
            className={`btn${points < 0 ? ' btn--minus' : ''}`}
            aria-label={`${team.name} ${signLabel(points)}`}
            onClick={() => onCommand({ type: 'score', team: teamId, points })}
          >
            {signLabel(points)}
          </button>
        ))}
      </div>
      <div className="team-panel__fouls-row">
        <span className="team-panel__fouls-label">Faltas</span>
        <span className={`team-panel__fouls${team.fouls >= PENALTY_FOULS ? ' alert' : ''}`}>{team.fouls}</span>
        {FOUL_DELTAS.map((delta) => (
          <button
            key={delta}
            type="button"
            className="btn"
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
