import { useEffect, useState } from 'react'
import { Board } from './board/Board'
import { Control } from './control/Control'

export default function App() {
  const [hash, setHash] = useState(() => window.location.hash)

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return hash === '#board' ? <Board /> : <Control />
}
