import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import {
  initialGame,
  reduce,
  shotClockVisible,
  SHOT_FULL_MS,
  SHOT_SHORT_MS,
  type Command,
} from '../game/game'
import { isRunning, remaining } from '../game/clock'
import { formatGameClock, formatShotClock, periodLabel } from '../game/format'
import { useControlLink, loadGame } from '../sync/link'
import { useNow } from '../useNow'
import { useShortcuts, SHORTCUTS } from './shortcuts'
import { TeamPanel } from './TeamPanel'
import { playBuzzer } from '../audio/buzzer'
import './Control.css'

export function Control() {
  const [state, dispatch] = useReducer(reduce, undefined, () => loadGame() ?? initialGame())
  const [muted, setMuted] = useState(() => window.localStorage.getItem('lbaboard.muted') === 'true')
  const { openBoard } = useControlLink(state)

  const running = isRunning(state.game) || isRunning(state.shot)
  const now = useNow(running, 50)

  const gameMs = remaining(state.game, now)
  const shotMs = remaining(state.shot, now)
  const showShot = shotClockVisible(state, now)

  useEffect(() => {
    document.title = 'LBABoard — Mesa de control'
  }, [])

  const send = useCallback((command: Command) => {
    dispatch({ ...command, at: Date.now() })
  }, [])

  useShortcuts(send)

  const prevGameMs = useRef<number | null>(null)
  const prevShotMs = useRef<number | null>(null)
  useEffect(() => {
    if (!muted) {
      if (prevGameMs.current !== null && prevGameMs.current > 0 && gameMs <= 0) playBuzzer()
      if (prevShotMs.current !== null && prevShotMs.current > 0 && shotMs <= 0) playBuzzer()
    }
    prevGameMs.current = gameMs
    prevShotMs.current = shotMs
  }, [gameMs, shotMs, muted])

  const toggleMuted = () => {
    const next = !muted
    setMuted(next)
    window.localStorage.setItem('lbaboard.muted', String(next))
  }

  const handleNextPeriod = () => {
    if (running) return
    if (gameMs > 0 && !window.confirm('El reloj no llegó a 0. ¿Pasar al período siguiente?')) return
    send({ type: 'nextPeriod' })
  }

  const handleNewGame = () => {
    if (!window.confirm('¿Empezar un partido nuevo? Se borran el marcador, las faltas y el reloj.')) return
    send({ type: 'newGame' })
  }

  return (
    <div className="control">
      <header className="control__top">
        <h1 className="control__title">LBABoard</h1>
        <span className="control__period">{periodLabel(state.period)}</span>
        <button type="button" className="control__btn" onClick={openBoard}>
          Abrir tablero
        </button>
      </header>

      <div className="control__clocks">
        <div className={`control__clock control__clock--game${gameMs <= 0 ? ' alert' : ''}`}>
          {formatGameClock(gameMs)}
        </div>
        {showShot && (
          <div data-testid="shot-clock" className={`control__clock control__clock--shot${shotMs <= 0 ? ' alert' : ''}`}>
            {formatShotClock(shotMs)}
          </div>
        )}
      </div>

      <div className="control__buttons">
        <button type="button" className="control__btn" onClick={() => send({ type: 'toggleRunning' })}>
          {running ? 'Detener' : 'Iniciar'}
        </button>
        <button
          type="button"
          className="control__btn"
          disabled={running}
          onClick={() => send({ type: 'resetShot', ms: SHOT_FULL_MS })}
        >
          24
        </button>
        <button
          type="button"
          className="control__btn"
          disabled={running}
          onClick={() => send({ type: 'resetShot', ms: SHOT_SHORT_MS })}
        >
          14
        </button>
        <button
          type="button"
          className="control__btn"
          disabled={running}
          onClick={() => send({ type: 'adjustGame', deltaMs: -1000 })}
        >
          −1 s
        </button>
        <button
          type="button"
          className="control__btn"
          disabled={running}
          onClick={() => send({ type: 'adjustGame', deltaMs: 1000 })}
        >
          +1 s
        </button>
        <button type="button" className="control__btn" disabled={running} onClick={handleNextPeriod}>
          Siguiente período
        </button>
        <button type="button" className="control__btn control__btn--danger" onClick={handleNewGame}>
          Nuevo partido
        </button>
      </div>

      <div className="control__teams">
        <TeamPanel teamId="home" team={state.teams.home} onCommand={send} />
        <TeamPanel teamId="away" team={state.teams.away} onCommand={send} />
      </div>

      <div className="control__settings">
        <button type="button" className="control__btn" onClick={toggleMuted}>
          Sonido: {muted ? 'no' : 'sí'}
        </button>
        <label className="control__setting">
          Minutos por período
          <input
            type="number"
            min={1}
            value={state.settings.periodMinutes}
            onChange={(event) => {
              const v = Number(event.target.value)
              if (Number.isFinite(v) && v >= 1) send({ type: 'setSettings', periodMinutes: v })
            }}
          />
        </label>
        <label className="control__setting">
          Minutos de prórroga
          <input
            type="number"
            min={1}
            value={state.settings.overtimeMinutes}
            onChange={(event) => {
              const v = Number(event.target.value)
              if (Number.isFinite(v) && v >= 1) send({ type: 'setSettings', overtimeMinutes: v })
            }}
          />
        </label>
      </div>

      <footer className="control__legend">
        {SHORTCUTS.map((s) => (
          <span key={s.code} className="control__legend-item">
            <kbd>{s.key}</kbd> {s.label}
          </span>
        ))}
      </footer>
    </div>
  )
}
