import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { isRunning, remaining, type Clock } from '../game/clock'
import { formatGameClock, formatShotClock, periodLabel } from '../game/format'
import {
  initialGame,
  reduce,
  SHOT_FULL_MS,
  SHOT_SHORT_MS,
  shotClockVisible,
  type Command,
  type GameState,
} from '../game/game'
import { playBuzzer } from '../audio/buzzer'
import { loadGame, useControlLink } from '../sync/link'
import { useNow } from '../useNow'
import { SHORTCUTS, useShortcuts } from './shortcuts'
import { TeamPanel } from './TeamPanel'
import './Control.css'

const TICK_MS = 50
const MUTED_KEY = 'lbaboard.muted'
const MAX_PERIOD_MINUTES = 20
const MAX_OVERTIME_MINUTES = 10
const CONFIRM_NEXT_PERIOD = 'El reloj no llegó a 0. ¿Pasar al período siguiente?'
const CONFIRM_NEW_GAME = '¿Empezar un partido nuevo? Se borran el marcador, las faltas y el reloj.'

function loadMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTED_KEY) === 'true'
  } catch {
    return false
  }
}

function saveMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTED_KEY, String(muted))
  } catch {
    // Without storage the setting only lasts until the window closes.
  }
}

function minuteOptions(max: number) {
  return Array.from({ length: max }, (_, index) => (
    <option key={index + 1} value={index + 1}>
      {index + 1}
    </option>
  ))
}

/** A running clock stopped because it reached 0: the buzzer moment (a manual stop or pause is not one). */
function ranOut(before: Clock, after: Clock): boolean {
  return isRunning(before) && !isRunning(after) && after.remainingMs === 0
}

function clockRanOut(before: GameState, after: GameState): boolean {
  return ranOut(before.game, after.game) || ranOut(before.shot, after.shot)
}

function Stepper({ label, onStep, disabled }: { label: string; onStep: (ms: number) => void; disabled: boolean }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <span className="stepper__label">{label}</span>
      <button type="button" aria-label={`${label} −1 s`} disabled={disabled} onClick={() => onStep(-1000)}>
        −1 s
      </button>
      <button type="button" aria-label={`${label} +1 s`} disabled={disabled} onClick={() => onStep(1000)}>
        +1 s
      </button>
    </div>
  )
}

export function Control() {
  const [state, dispatch] = useReducer(reduce, undefined, () => loadGame() ?? initialGame())
  const [muted, setMuted] = useState(loadMuted)
  const { openBoard } = useControlLink(state)
  const running = isRunning(state.game)
  const shotRunning = isRunning(state.shot)
  const now = useNow(running)
  const gameMs = remaining(state.game, now)
  const shotMs = remaining(state.shot, now)

  const send = useCallback((command: Command) => dispatch({ ...command, at: Date.now() }), [])
  useShortcuts(send)

  useEffect(() => {
    document.title = 'LBABoard — Mesa de control'
  }, [])

  // The reducer stops the clocks at the exact expiry instant; ticking only makes that visible promptly.
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => send({ type: 'tick' }), TICK_MS)
    return () => window.clearInterval(id)
  }, [running, send])

  const previous = useRef(state)
  useEffect(() => {
    if (clockRanOut(previous.current, state) && !muted) playBuzzer()
    previous.current = state
  }, [state, muted])

  const toggleMuted = () => {
    saveMuted(!muted)
    setMuted(!muted)
  }

  const nextPeriod = () => {
    if (gameMs > 0 && !window.confirm(CONFIRM_NEXT_PERIOD)) return
    send({ type: 'nextPeriod' })
  }

  const newGame = () => {
    if (window.confirm(CONFIRM_NEW_GAME)) send({ type: 'newGame' })
  }

  return (
    <div className="control">
      <header className="control__top">
        <h1 className="control__title">LBABoard</h1>
        <button type="button" className="btn btn--primary" onClick={openBoard}>
          Abrir tablero
        </button>
        <span className="control__spacer" />
        <button type="button" className="btn" onClick={toggleMuted}>
          Sonido: {muted ? 'no' : 'sí'}
        </button>
        <button type="button" className="btn btn--danger" onClick={newGame}>
          Nuevo partido
        </button>
      </header>

      <main className="control__main">
        <TeamPanel teamId="home" team={state.teams.home} onCommand={send} />

        <section className="clock-panel" aria-label="Relojes">
          <div className="clock-panel__period">{periodLabel(state.period)}</div>
          <div className={`clock-panel__game${gameMs <= 0 ? ' alert' : ''}`}>{formatGameClock(gameMs)}</div>
          <button
            type="button"
            className={`btn btn--start${running ? ' btn--stop' : ''}`}
            onClick={() => send({ type: 'toggleRunning' })}
          >
            {running ? 'Detener' : 'Iniciar'}
          </button>
          <div className="clock-panel__shot-row">
            <div
              data-testid="shot-clock"
              className={`clock-panel__shot${shotMs <= 0 ? ' alert' : ''}${shotClockVisible(state, now) ? '' : ' off'}`}
              title={shotClockVisible(state, now) ? undefined : 'Apagado: queda menos tiempo de juego'}
            >
              {formatShotClock(shotMs)}
            </div>
            <button type="button" className="btn btn--shot" onClick={() => send({ type: 'resetShot', ms: SHOT_FULL_MS })}>
              24
            </button>
            <button type="button" className="btn btn--shot" onClick={() => send({ type: 'resetShot', ms: SHOT_SHORT_MS })}>
              14
            </button>
          </div>
          <button
            type="button"
            className="btn btn--shot-toggle"
            disabled={!running || (!shotRunning && shotMs <= 0)}
            onClick={() => send({ type: 'toggleShot' })}
          >
            {running && !shotRunning && shotMs > 0 ? 'Reanudar posesión' : 'Pausar posesión'}
          </button>
          <div className="clock-panel__adjust">
            <Stepper label="Juego" disabled={running} onStep={(deltaMs) => send({ type: 'adjustGame', deltaMs })} />
            <Stepper label="Posesión" disabled={running} onStep={(deltaMs) => send({ type: 'adjustShot', deltaMs })} />
          </div>
          <button type="button" className="btn" disabled={running} onClick={nextPeriod}>
            Siguiente período
          </button>
        </section>

        <TeamPanel teamId="away" team={state.teams.away} onCommand={send} />
      </main>

      <footer className="control__footer">
        <div className="settings">
          <label>
            Minutos por cuarto
            <select
              value={state.settings.periodMinutes}
              onChange={(event) => send({ type: 'setSettings', periodMinutes: Number(event.target.value) })}
            >
              {minuteOptions(MAX_PERIOD_MINUTES)}
            </select>
          </label>
          <label>
            Minutos por tiempo extra
            <select
              value={state.settings.overtimeMinutes}
              onChange={(event) => send({ type: 'setSettings', overtimeMinutes: Number(event.target.value) })}
            >
              {minuteOptions(MAX_OVERTIME_MINUTES)}
            </select>
          </label>
        </div>
        <ul className="legend" aria-label="Atajos de teclado">
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.code}>
              <kbd>{shortcut.key}</kbd> {shortcut.label}
            </li>
          ))}
        </ul>
      </footer>
    </div>
  )
}
