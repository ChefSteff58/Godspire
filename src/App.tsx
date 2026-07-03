import { useEffect } from 'react'
import { GameScreen } from './ui/screens/GameScreen'
import { TitleScreen } from './ui/screens/TitleScreen'
import { PantheonTreePanel } from './ui/hud/PantheonTreePanel'
import { LeaderboardOverlay } from './ui/hud/LeaderboardOverlay'
import { useGameStore } from './state/gameStore'
import { useSessionStore } from './state/sessionStore'

export default function App() {
  const gamePhase = useGameStore((s) => s.gamePhase)

  // Boot the session (guest-first auth + load/merge progress) once on startup — it resolves while
  // the player sits on the title, so PreloadScene's session gate is a cold-click edge case only.
  useEffect(() => {
    void useSessionStore.getState().boot()
  }, [])

  return (
    <div className="relative h-dvh w-full">
      {gamePhase === 'title' ? <TitleScreen /> : <GameScreen />}
      {/* Mounted at the ROOT so the Pantheon + Ranks open from the title too (they need only the
          session, not a running game). During a run they now cover the full window — a modal's job. */}
      <PantheonTreePanel />
      <LeaderboardOverlay />
    </div>
  )
}
