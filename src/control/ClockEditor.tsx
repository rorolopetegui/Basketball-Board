import { useState, type FormEvent } from 'react'
import { parseClockInput } from '../game/format'

interface ClockEditorProps {
  /** What is edited, for the accessible names: "tiempo de juego", "posesión". */
  name: string
  /** The value on display, offered as the starting text. */
  current: string
  onSet: (ms: number) => void
}

/** A pencil that opens a small form to type an exact time ("4:30", "45", "12.5"), e.g. to match the court clock. */
export function ClockEditor({ name, current, onSet }: ClockEditorProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)

  if (draft === null) {
    return (
      <button
        type="button"
        className="btn btn--icon"
        aria-label={`Editar ${name}`}
        title={`Editar ${name}`}
        onClick={() => {
          setDraft(current)
          setInvalid(false)
        }}
      >
        ✎
      </button>
    )
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const ms = parseClockInput(draft)
    if (ms === null) {
      setInvalid(true)
      return
    }
    onSet(ms)
    setDraft(null)
  }

  return (
    <form className="clock-editor" onSubmit={submit}>
      <input
        autoFocus
        inputMode="decimal"
        aria-label={`Valor de ${name}`}
        aria-invalid={invalid}
        value={draft}
        onFocus={(event) => event.target.select()}
        onChange={(event) => {
          setDraft(event.target.value)
          setInvalid(false)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setDraft(null)
        }}
      />
      <button type="submit" className="btn">
        OK
      </button>
      <button type="button" className="btn" onClick={() => setDraft(null)}>
        Cancelar
      </button>
      {invalid && (
        <span role="alert" className="clock-editor__error">
          Escribilo así: 4:30, 45 o 12.5
        </span>
      )}
    </form>
  )
}
