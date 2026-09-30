import { useEffect, useRef } from 'react'
import { SHOT_FULL_MS, SHOT_SHORT_MS, type Command } from '../game/game'

export interface Shortcut {
  code: string
  key: string
  label: string
  command: Command
}

export const SHORTCUTS: readonly Shortcut[] = [
  { code: 'Space', key: 'Espacio', label: 'Iniciar / detener', command: { type: 'toggleRunning' } },
  { code: 'KeyZ', key: 'Z', label: 'Posesión 24', command: { type: 'resetShot', ms: SHOT_FULL_MS } },
  { code: 'KeyX', key: 'X', label: 'Posesión 14', command: { type: 'resetShot', ms: SHOT_SHORT_MS } },
  { code: 'KeyQ', key: 'Q', label: 'Local +1', command: { type: 'score', team: 'home', points: 1 } },
  { code: 'KeyW', key: 'W', label: 'Local +2', command: { type: 'score', team: 'home', points: 2 } },
  { code: 'KeyE', key: 'E', label: 'Local +3', command: { type: 'score', team: 'home', points: 3 } },
  { code: 'KeyA', key: 'A', label: 'Local -1', command: { type: 'score', team: 'home', points: -1 } },
  { code: 'KeyU', key: 'U', label: 'Visita +1', command: { type: 'score', team: 'away', points: 1 } },
  { code: 'KeyI', key: 'I', label: 'Visita +2', command: { type: 'score', team: 'away', points: 2 } },
  { code: 'KeyO', key: 'O', label: 'Visita +3', command: { type: 'score', team: 'away', points: 3 } },
  { code: 'KeyJ', key: 'J', label: 'Visita -1', command: { type: 'score', team: 'away', points: -1 } },
  { code: 'KeyS', key: 'S', label: 'Falta local +1', command: { type: 'foul', team: 'home', delta: 1 } },
  { code: 'KeyD', key: 'D', label: 'Falta local -1', command: { type: 'foul', team: 'home', delta: -1 } },
  { code: 'KeyK', key: 'K', label: 'Falta visita +1', command: { type: 'foul', team: 'away', delta: 1 } },
  { code: 'KeyL', key: 'L', label: 'Falta visita -1', command: { type: 'foul', team: 'away', delta: -1 } },
]

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

function hasModifiers(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.altKey || event.metaKey
}

export function shortcutFor(event: KeyboardEvent): Command | null {
  if (isTypingTarget(event.target)) return null
  if (hasModifiers(event)) return null
  if (event.repeat) return null
  const shortcut = SHORTCUTS.find((s) => s.code === event.code)
  return shortcut ? shortcut.command : null
}

export function useShortcuts(onCommand: (command: Command) => void): void {
  const onCommandRef = useRef(onCommand)
  useEffect(() => {
    onCommandRef.current = onCommand
  })
  useEffect(() => {
    // Space is claimed on keydown (auto-repeat included, or holding it scrolls the page) and on keyup (where a
    // focused button would otherwise activate), unless the user is typing.
    const claimSpace = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !isTypingTarget(event.target) && !hasModifiers(event)) event.preventDefault()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      claimSpace(event)
      const command = shortcutFor(event)
      if (command !== null) onCommandRef.current(command)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', claimSpace)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', claimSpace)
    }
  }, [])
}
