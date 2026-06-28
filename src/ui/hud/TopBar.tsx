import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../state/gameStore'
import { AccountBadge } from '../account/AccountBadge'
import { SpeedControls } from './SpeedControls'

export function TopBar() {
  const gold = useGameStore((s) => s.gold)
  const lives = useGameStore((s) => s.lives)
  const wave = useGameStore((s) => s.wave)
  const kills = useGameStore((s) => s.kills)
  const showDebug = useGameStore((s) => s.showDebug)
  const toggleDebug = useGameStore((s) => s.toggleDebug)

  // Flash the lives chip red on any leak — the leak is the game's only negative feedback.
  const prevLives = useRef(lives)
  const [hurt, setHurt] = useState(false)
  useEffect(() => {
    if (lives < prevLives.current) {
      setHurt(true)
      const t = setTimeout(() => setHurt(false), 280)
      prevLives.current = lives
      return () => clearTimeout(t)
    }
    prevLives.current = lives
  }, [lives])

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-slate-900/90 px-3 py-2">
      <AccountBadge />
      <div className="flex items-center gap-2 font-mono text-sm">
        <span className="rounded bg-black/40 px-3 py-1 text-amber-300">🪙 {gold}</span>
        <span
          className={`rounded px-3 py-1 transition-colors duration-150 ${
            hurt ? 'bg-red-500 text-white' : 'bg-black/40 text-rose-300'
          }`}
        >
          ❤️ {lives}
        </span>
        <span className="rounded bg-black/40 px-3 py-1 text-slate-300">🌊 Wave {wave}</span>
        <span className="rounded bg-black/40 px-3 py-1 text-slate-400">💀 {kills}</span>
      </div>
      <div className="flex items-center gap-2">
        <SpeedControls />
        <button
          onClick={toggleDebug}
          className={`rounded px-3 py-1 text-sm transition ${
            showDebug ? 'bg-amber-400 text-slate-900' : 'bg-black/40 text-slate-300 hover:bg-black/60'
          }`}
        >
          debug
        </button>
      </div>
    </div>
  )
}
