import { useEffect } from 'react'
import { GameScreen } from './ui/screens/GameScreen'
import { useSessionStore } from './state/sessionStore'

export default function App() {
  // Boot the session (guest-first auth + load/merge progress) once on startup.
  useEffect(() => {
    void useSessionStore.getState().boot()
  }, [])

  return <GameScreen />
}
