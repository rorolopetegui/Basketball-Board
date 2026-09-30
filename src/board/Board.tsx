import { useEffect, useState } from 'react'
import { useBoardState } from '../sync/link'
import { useNow } from '../useNow'
import { isRunning } from '../game/clock'
import { formatGameClock, formatShotClock, periodLabel } from '../game/format'
import { gameRemaining, shotClockVisible, shotRemaining, type Team } from '../game/game'
import './Board.css'

const PENALTY_FOULS = 4
const HINT_MS = 4000

function toggleFullscreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen?.()
  } else {
    void document.documentElement.requestFullscreen?.()
  }
}

function TeamColumn({ team, side }: { team: Team; side: 'home' | 'away' }) {
  return (
    <section className={`board-team board-team--${side}`}>
      <div className="team-bar" style={{ backgroundColor: team.color }} />
      <div className="team-name">{team.name.toUpperCase()}</div>
      <div className="score">{team.score}</div>
      <div className={`fouls${team.fouls >= PENALTY_FOULS ? ' alert' : ''}`}>FALTAS {team.fouls}</div>
    </section>
  )
}

export function Board() {
  const state = useBoardState()
  const now = useNow(isRunning(state.game) || isRunning(state.shot))
  const gameMs = gameRemaining(state, now)
  const shotMs = shotRemaining(state, now)
  const [showHint, setShowHint] = useState(true)

  useEffect(() => {
    document.title = 'LBABoard — Tablero'
    const id = window.setTimeout(() => setShowHint(false), HINT_MS)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <div className="board" onDoubleClick={toggleFullscreen}>
      <TeamColumn team={state.teams.home} side="home" />
      <section className="board-center">
        <div className="period">{periodLabel(state.period)}</div>
        <div className={`game-clock${gameMs <= 0 ? ' alert' : ''}`}>{formatGameClock(gameMs)}</div>
        <div className="shot-slot">
          {shotClockVisible(state, now) && (
            <div className={`shot-clock${shotMs <= 0 ? ' alert' : ''}`}>{formatShotClock(shotMs)}</div>
          )}
        </div>
      </section>
      <TeamColumn team={state.teams.away} side="away" />
      {showHint && <div className="fullscreen-hint">Doble clic: pantalla completa</div>}
    </div>
  )
}
