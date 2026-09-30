import { useCallback, useEffect, useRef, useState } from 'react'
import { initialGame, type GameState } from '../game/game'
import { parseGame } from '../game/validate'

export type LinkMessage =
  | { app: 'lbaboard'; kind: 'state'; state: GameState }
  | { app: 'lbaboard'; kind: 'hello' }

export const STORAGE_KEY = 'lbaboard.game'

export function saveGame(state: GameState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be blocked (private mode); the app keeps working without persistence.
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return null
    return parseGame(JSON.parse(raw))
  } catch {
    return null
  }
}

export function isMessage(data: unknown): data is LinkMessage {
  if (typeof data !== 'object' || data === null) return false
  const message = data as { app?: unknown; kind?: unknown; state?: unknown }
  if (message.app !== 'lbaboard') return false
  if (message.kind === 'hello') return true
  if (message.kind === 'state') return parseGame(message.state) !== null
  return false
}

export function useBoardState(): GameState {
  const [state, setState] = useState<GameState>(() => loadGame() ?? initialGame())
  const greetedRef = useRef(false)

  useEffect(() => {
    const opener = window.opener
    if (opener != null && !greetedRef.current) {
      greetedRef.current = true
      const message: LinkMessage = { app: 'lbaboard', kind: 'hello' }
      opener.postMessage(message, '*')
    }
    const onMessage = (event: MessageEvent) => {
      if (isMessage(event.data) && event.data.kind === 'state') {
        setState(event.data.state)
      }
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      const next = loadGame()
      if (next !== null) setState(next)
    }
    window.addEventListener('message', onMessage)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('message', onMessage)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return state
}

export function useControlLink(state: GameState): { openBoard: () => void } {
  const boardRef = useRef<Window | null>(null)
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
    saveGame(state)
    const board = boardRef.current
    if (board !== null) {
      const message: LinkMessage = { app: 'lbaboard', kind: 'state', state }
      board.postMessage(message, '*')
    }
  }, [state])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (isMessage(event.data) && event.data.kind === 'hello') {
        const source = event.source as Window | null
        if (source !== null && typeof source.postMessage === 'function') {
          const message: LinkMessage = { app: 'lbaboard', kind: 'state', state: stateRef.current }
          source.postMessage(message, '*')
        }
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const openBoard = useCallback(() => {
    const board = boardRef.current
    if (board !== null && !board.closed) {
      board.focus()
      return
    }
    const url = `${window.location.href.split('#')[0]}#board`
    boardRef.current = window.open(url, 'lbaboard-board', 'popup,width=1280,height=720')
  }, [])

  return { openBoard }
}
