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
  const phase = useGameStore((s) => s.phase)
  const nextWavePreview = useGameStore((s) => s.nextWavePreview)
  const showDebug = useGameStore((s) => s.showDebug)
  const toggleDebug = useGameStore((s) => s.toggleDebug)
  const openPantheon = useGameStore((s) => s.openPantheon)
  const openLeaderboard = useGameStore((s) => s.openLeaderboard)
  const quitToTitle = useGameStore((s) => s.quitToTitle)
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

  // One-shot explainer bubble the first time gate shields appear this session ("what is that 3?").
  const shieldSeen = useRef(false)
  const [shieldHint, setShieldHint] = useState(false)
  useEffect(() => {
    if (shieldCharges > 0 && !shieldSeen.current) {
      shieldSeen.current = true
      setShieldHint(true)
      const t = setTimeout(() => setShieldHint(false), 4200)
      return () => clearTimeout(t)
    }
  }, [shieldCharges])

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
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-shrine-abyss/90 px-3 py-2">
      <AccountBadge />
      <div className="flex items-center gap-2 font-pixel text-sm">
        <span
          className={`pixel-chip relative rounded px-3 py-1 transition-all duration-150 ${
            denied ? 'text-white' : paid ? 'scale-110 bg-black/40 text-amber-200' : 'bg-black/40 text-amber-300'
          }`}
        >
          {/* chip.png's opaque center paints over background classes — flash via a child overlay */}
          {denied && <span className="animate-pulse pointer-events-none absolute inset-0 rounded bg-red-500/60" />}
          <PixelIcon name="icon_gold" fallback="🪙" /> {gold}
        </span>
        <span
          className={`pixel-chip relative rounded px-3 py-1 transition-colors duration-150 ${
            hurt ? 'text-white' : 'bg-black/40 text-rose-300'
          }`}
        >
          {hurt && <span className="pointer-events-none absolute inset-0 rounded bg-red-500/60" />}
          <PixelIcon name="icon_heart" fallback="❤️" /> {lives}
        </span>
        {shieldCharges > 0 && (
          <span
            className="pixel-chip relative rounded bg-black/40 px-3 py-1 text-shrine-gold"
            title="Gate shields — each absorbs one leak before lives are lost"
          >
            <PixelIcon name="icon_shield" fallback="🛡️" />{' '}
            <span key={shieldCharges} className="num-pop">
              {shieldCharges}
            </span>
            <span className="ml-1 text-[10px] uppercase tracking-wide opacity-70">gate</span>
            {shieldHint && (
              <span className="absolute left-1/2 top-full z-20 mt-1 w-44 -translate-x-1/2 rounded bg-black/90 px-2 py-1 text-center text-[10px] normal-case text-shrine-marble shadow-lg">
                Gate shields — each absorbs one leak before Olympus loses lives
              </span>
            )}
          </span>
        )}
        <span className="pixel-chip rounded bg-black/40 px-3 py-1 text-shrine-marble/80">
          <PixelIcon name="icon_wave" fallback="🌊" /> Wave{' '}
          <span key={wave} className="num-pop">
            {wave}
          </span>
        </span>
        <span className="pixel-chip max-lg:hidden rounded bg-black/40 px-3 py-1 text-shrine-marble/60">
          <PixelIcon name="icon_skull" fallback="💀" /> {kills}
        </span>
        {/* pinned next-wave telegraph — the toast fades in 4.4s but the lesson stays while you build */}
        {nextWavePreview && phase === 'building' && (
          <span
            className={`pixel-chip animate-pulse rounded px-2.5 py-1 text-[11px] font-bold ${
              nextWavePreview.tone === 'boss'
                ? 'bg-amber-500/25 text-amber-200'
                : nextWavePreview.tone === 'debut'
                  ? 'bg-sky-500/20 text-sky-200'
                  : 'bg-orange-500/20 text-orange-200'
            }`}
          >
            {nextWavePreview.label}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <SpeedControls />
        <button
          onClick={openPantheon}
          title="Spend Favor on permanent blessings"
          className="pixel-btn arcade-raise font-pixel rounded bg-shrine-slab px-3 py-1 text-sm text-shrine-gold"
        >
          🏛️ Pantheon
        </button>
        <button
          onClick={openLeaderboard}
          title="Global leaderboard — highest wave survived"
          className="pixel-btn arcade-raise font-pixel rounded bg-shrine-slab px-3 py-1 text-sm text-shrine-gold"
        >
          🏆 Ranks
        </button>
        <button
          onClick={() => {
            if (window.confirm('Return to the title? This run will be abandoned.')) quitToTitle()
          }}
          title="Return to the title (abandons the run)"
          className="pixel-btn arcade-raise font-pixel rounded bg-shrine-slab px-3 py-1 text-sm text-shrine-gold"
        >
          🏠
        </button>
        {import.meta.env.DEV && (
          <button
            onClick={toggleDebug}
            className={`rounded px-3 py-1 text-sm transition ${
              showDebug ? 'bg-amber-400 text-slate-900' : 'bg-shrine-slab text-shrine-marble/60 hover:bg-shrine-stone'
            }`}
          >
            debug
          </button>
        )}
      </div>
    </div>
  )
}
