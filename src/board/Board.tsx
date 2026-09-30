import { useEffect, useState } from 'react'
import { useBoardState } from '../sync/link'
import { useNow } from '../useNow'
import { isRunning, remaining } from '../game/clock'
import { formatGameClock, formatShotClock, periodLabel } from '../game/format'
import { shotClockVisible } from '../game/game'
import './Board.css'

export function Board() {
  const state = useBoardState()
  const { home, away } = state.teams
  const now = useNow(isRunning(state.game) || isRunning(state.shot), 50)

  const gameMs = remaining(state.game, now)
  const shotMs = remaining(state.shot, now)
  const showShot = shotClockVisible(state, now)

  const [showHint, setShowHint] = useState(true)
  useEffect(() => {
    document.title = 'LBABoard — Tablero'
    const id = setTimeout(() => setShowHint(false), 4000)
    return () => clearTimeout(id)
  }, [])

  const handleDoubleClick = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void document.documentElement.requestFullscreen()
    }
  }

  return (
    <div className="board" onDoubleClick={handleDoubleClick}>
      <div className="board-top">
        <div className="team team-home">
          <div className="team-bar" style={{ backgroundColor: home.color }} />
          <span className="team-name">{home.name.toUpperCase()}</span>
        </div>
        <div className="period">{periodLabel(state.period)}</div>
        <div className="team team-away">
          <span className="team-name">{away.name.toUpperCase()}</span>
          <div className="team-bar" style={{ backgroundColor: away.color }} />
        </div>
      </div>
      <div className="board-middle">
        <div className="score">{home.score}</div>
        <div className="clocks">
          <div className={`game-clock${gameMs <= 0 ? ' alert' : ''}`}>
            {formatGameClock(gameMs)}
          </div>
          {showShot && (
            <div className={`shot-clock${shotMs <= 0 ? ' alert' : ''}`}>
              {formatShotClock(shotMs)}
            </div>
          )}
        </div>
        <div className="score">{away.score}</div>
      </div>
      <div className="board-bottom">
        <div className={`fouls${home.fouls >= 4 ? ' alert' : ''}`}>FALTAS {home.fouls}</div>
        <div className={`fouls${away.fouls >= 4 ? ' alert' : ''}`}>FALTAS {away.fouls}</div>
      </div>
      {showHint && <div className="fullscreen-hint">Doble clic: pantalla completa</div>}
    </div>
  )
}
