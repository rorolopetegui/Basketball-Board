import { useEffect, useState } from 'react'

/** The time of the last tick, re-rendering every `intervalMs` while `active`. It can lag real time by up to one
 *  interval (e.g. right after a start); `remaining()` never lets that lag show more time than a clock had. */
export function useNow(active: boolean, intervalMs = 50): number {
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => {
      setNow(Date.now())
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [active, intervalMs])

  return now
}
