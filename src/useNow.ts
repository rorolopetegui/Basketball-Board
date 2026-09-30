import { useEffect, useState } from 'react'

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
