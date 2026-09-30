import { fireEvent, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Command } from '../game/game'
import { SHORTCUTS, shortcutFor, useShortcuts } from './shortcuts'

function keydownOn(
  code: string,
  target: Element | null,
  init: KeyboardEventInit = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true, ...init })
  if (target !== null) target.dispatchEvent(event)
  return event
}

describe('SHORTCUTS', () => {
  it('maps every code to its command', () => {
    const byCode = new Map<string, Command>(SHORTCUTS.map((s) => [s.code, s.command]))
    expect(byCode.size).toBe(15)
    expect(byCode.get('Space')).toEqual({ type: 'toggleRunning' })
    expect(byCode.get('KeyZ')).toEqual({ type: 'resetShot', ms: 24_000 })
    expect(byCode.get('KeyX')).toEqual({ type: 'resetShot', ms: 14_000 })
    expect(byCode.get('KeyQ')).toEqual({ type: 'score', team: 'home', points: 1 })
    expect(byCode.get('KeyW')).toEqual({ type: 'score', team: 'home', points: 2 })
    expect(byCode.get('KeyE')).toEqual({ type: 'score', team: 'home', points: 3 })
    expect(byCode.get('KeyA')).toEqual({ type: 'score', team: 'home', points: -1 })
    expect(byCode.get('KeyU')).toEqual({ type: 'score', team: 'away', points: 1 })
    expect(byCode.get('KeyI')).toEqual({ type: 'score', team: 'away', points: 2 })
    expect(byCode.get('KeyO')).toEqual({ type: 'score', team: 'away', points: 3 })
    expect(byCode.get('KeyJ')).toEqual({ type: 'score', team: 'away', points: -1 })
    expect(byCode.get('KeyS')).toEqual({ type: 'foul', team: 'home', delta: 1 })
    expect(byCode.get('KeyD')).toEqual({ type: 'foul', team: 'home', delta: -1 })
    expect(byCode.get('KeyK')).toEqual({ type: 'foul', team: 'away', delta: 1 })
    expect(byCode.get('KeyL')).toEqual({ type: 'foul', team: 'away', delta: -1 })
  })

  it('gives every shortcut a key and a label', () => {
    for (const shortcut of SHORTCUTS) {
      expect(shortcut.key.length).toBeGreaterThan(0)
      expect(shortcut.label.length).toBeGreaterThan(0)
    }
  })
})

describe('shortcutFor', () => {
  it('returns the command of a mapped key', () => {
    const event = keydownOn('KeyQ', null)
    expect(shortcutFor(event)).toEqual({ type: 'score', team: 'home', points: 1 })
  })

  it('returns null for an unmapped key', () => {
    const event = keydownOn('KeyP', null)
    expect(shortcutFor(event)).toBeNull()
  })

  it('returns null when the target is an input, textarea, select or contenteditable', () => {
    const input = document.createElement('input')
    const textarea = document.createElement('textarea')
    const select = document.createElement('select')
    const editable = document.createElement('div')
    Object.defineProperty(editable, 'isContentEditable', { value: true })
    document.body.append(input, textarea, select, editable)
    expect(shortcutFor(keydownOn('KeyQ', input))).toBeNull()
    expect(shortcutFor(keydownOn('KeyQ', textarea))).toBeNull()
    expect(shortcutFor(keydownOn('KeyQ', select))).toBeNull()
    expect(shortcutFor(keydownOn('KeyQ', editable))).toBeNull()
    document.body.innerHTML = ''
  })

  it('returns null when Ctrl, Alt or Meta is held', () => {
    expect(shortcutFor(keydownOn('KeyQ', null, { ctrlKey: true }))).toBeNull()
    expect(shortcutFor(keydownOn('KeyQ', null, { altKey: true }))).toBeNull()
    expect(shortcutFor(keydownOn('KeyQ', null, { metaKey: true }))).toBeNull()
  })

  it('returns null for repeated keydown', () => {
    const event = keydownOn('KeyQ', null, { repeat: true })
    expect(shortcutFor(event)).toBeNull()
  })
})

describe('useShortcuts', () => {
  it('sends the mapped command on keydown', () => {
    const onCommand = vi.fn()
    renderHook(() => useShortcuts(onCommand))
    fireEvent.keyDown(window, { code: 'KeyQ' })
    fireEvent.keyUp(window, { code: 'KeyQ' })
    expect(onCommand).toHaveBeenCalledTimes(1)
    expect(onCommand).toHaveBeenCalledWith({ type: 'score', team: 'home', points: 1 })
  })

  it('sends nothing for unmapped or ignored keys', () => {
    const onCommand = vi.fn()
    renderHook(() => useShortcuts(onCommand))
    fireEvent.keyDown(window, { code: 'KeyP' })
    fireEvent.keyDown(window, { code: 'KeyQ', ctrlKey: true })
    fireEvent.keyDown(window, { code: 'KeyQ', repeat: true })
    expect(onCommand).not.toHaveBeenCalled()
  })

  it('does not prevent the default of mapped keys other than Space', () => {
    renderHook(() => useShortcuts(vi.fn()))
    const event = new KeyboardEvent('keydown', { code: 'KeyQ', bubbles: true, cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  it('prevents the default of Space on keydown and keyup', () => {
    const onCommand = vi.fn()
    renderHook(() => useShortcuts(onCommand))
    const down = new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true, cancelable: true })
    const up = new KeyboardEvent('keyup', { code: 'Space', key: ' ', bubbles: true, cancelable: true })
    window.dispatchEvent(down)
    window.dispatchEvent(up)
    expect(down.defaultPrevented).toBe(true)
    expect(up.defaultPrevented).toBe(true)
    expect(onCommand).toHaveBeenCalledTimes(1)
    expect(onCommand).toHaveBeenCalledWith({ type: 'toggleRunning' })
  })

  it('claims a held Space (auto-repeat) without toggling again', () => {
    const onCommand = vi.fn()
    renderHook(() => useShortcuts(onCommand))
    const repeat = new KeyboardEvent('keydown', { code: 'Space', key: ' ', repeat: true, bubbles: true, cancelable: true })
    window.dispatchEvent(repeat)
    expect(repeat.defaultPrevented).toBe(true)
    expect(onCommand).not.toHaveBeenCalled()
  })

  it('does not activate a focused button when Space is pressed', () => {
    const onClick = vi.fn()
    const onCommand = vi.fn()
    render(
      <button onClick={onClick}>Detener</button>,
    )
    renderHook(() => useShortcuts(onCommand))
    const button = screen.getByRole('button')
    button.focus()
    const down = new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true, cancelable: true })
    const up = new KeyboardEvent('keyup', { code: 'Space', key: ' ', bubbles: true, cancelable: true })
    button.dispatchEvent(down)
    button.dispatchEvent(up)
    expect(down.defaultPrevented).toBe(true)
    expect(up.defaultPrevented).toBe(true)
    expect(onCommand).toHaveBeenCalledTimes(1)
    expect(onCommand).toHaveBeenCalledWith({ type: 'toggleRunning' })
    expect(onClick).not.toHaveBeenCalled()
  })

  it('ignores Space typed inside an input', () => {
    const onCommand = vi.fn()
    renderHook(() => useShortcuts(onCommand))
    const input = document.createElement('input')
    document.body.appendChild(input)
    const down = new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true, cancelable: true })
    const up = new KeyboardEvent('keyup', { code: 'Space', key: ' ', bubbles: true, cancelable: true })
    input.dispatchEvent(down)
    input.dispatchEvent(up)
    expect(onCommand).not.toHaveBeenCalled()
    expect(down.defaultPrevented).toBe(false)
    expect(up.defaultPrevented).toBe(false)
    input.remove()
  })
})
