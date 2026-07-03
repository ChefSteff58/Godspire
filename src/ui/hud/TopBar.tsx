import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../state/gameStore'
import { AccountBadge } from '../account/AccountBadge'
import { SpeedControls } from './SpeedControls'
import { PixelIcon } from '../kit/PixelIcon'

export function TopBar() {
  const gold = useGameStore((s) => s.gold)
  const lives = useGameStore((s) => s.lives)
  const shieldCharges = useGameStore((s) => s.shieldCharges)
  const wave = useGameStore((s) => s.wave)
  const kills = useGameStore((s) => s.kills)
  const showDebug = useGameStore((s) => s.showDebug)
  const toggleDebug = useGameStore((s) => s.toggleDebug)
  const openPantheon = useGameStore((s) => s.openPantheon)
  const openLeaderboard = useGameStore((s) => s.openLeaderboard)
  const goldDeniedTick = useGameStore((s) => s.goldDeniedTick)

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

  // Shake the gold chip red on a can't-afford click ("that's why nothing happened")…
  const [denied, setDenied] = useState(false)
  useEffect(() => {
    if (goldDeniedTick === 0) return
    setDenied(true)
    const t = setTimeout(() => setDenied(false), 300)
    return () => clearTimeout(t)
  }, [goldDeniedTick])
  // …and pulse it gently whenever gold ARRIVES, so kills/harvests/income register peripherally.
  const prevGold = useRef(gold)
  const [paid, setPaid] = useState(false)
  useEffect(() => {
    if (gold > prevGold.current) {
      setPaid(true)
      const t = setTimeout(() => setPaid(false), 220)
      prevGold.current = gold
      return () => clearTimeout(t)
    }
    prevGold.current = gold
  }, [gold])

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-slate-900/90 px-3 py-2">
      <AccountBadge />
      <div className="flex items-center gap-2 font-pixel text-sm">
        <span
          className={`pixel-chip rounded px-3 py-1 transition-all duration-150 ${
            denied ? 'animate-pulse bg-red-500 text-white' : paid ? 'scale-110 bg-black/40 text-amber-200' : 'bg-black/40 text-amber-300'
          }`}
        >
          <PixelIcon name="icon_gold" fallback="🪙" /> {gold}
        </span>
        <span
          className={`pixel-chip rounded px-3 py-1 transition-colors duration-150 ${
            hurt ? 'bg-red-500 text-white' : 'bg-black/40 text-rose-300'
          }`}
        >
          <PixelIcon name="icon_heart" fallback="❤️" /> {lives}
        </span>
        {shieldCharges > 0 && (
          <span className="pixel-chip rounded bg-black/40 px-3 py-1 text-sky-300" title="Gate shield — absorbs leaks">
            <PixelIcon name="icon_shield" fallback="🛡️" /> {shieldCharges}
          </span>
        )}
        <span className="pixel-chip rounded bg-black/40 px-3 py-1 text-slate-300">
          <PixelIcon name="icon_wave" fallback="🌊" /> Wave {wave}
        </span>
        <span className="pixel-chip rounded bg-black/40 px-3 py-1 text-slate-400">
          <PixelIcon name="icon_skull" fallback="💀" /> {kills}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <SpeedControls />
        <button
          onClick={openPantheon}
          title="Spend Favor on permanent upgrades"
          className="rounded bg-black/40 px-3 py-1 text-sm text-amber-300 transition hover:bg-black/60"
        >
          🏛️ Pantheon
        </button>
        <button
          onClick={openLeaderboard}
          title="Global leaderboard — highest wave survived"
          className="rounded bg-black/40 px-3 py-1 text-sm text-amber-300 transition hover:bg-black/60"
        >
          🏆 Ranks
        </button>
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
