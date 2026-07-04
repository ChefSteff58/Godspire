import { useGameStore } from '../../state/gameStore'

/** DEV-only tuning cheats (the two we need to test economy + the late-game wall). */
export function DevPanel() {
  if (!import.meta.env.DEV) return null
  return <DevPanelInner />
}

function DevPanelInner() {
  const invincible = useGameStore((s) => s.invincible)
  const cheatGold = useGameStore((s) => s.cheatGold)
  const cheatInvincible = useGameStore((s) => s.cheatInvincible)

  return (
    <div className="pointer-events-auto absolute left-2 top-2 z-10 flex gap-1.5 rounded bg-black/60 p-1.5 text-xs">
      <button
        onClick={cheatGold}
        className="rounded bg-shrine-slab px-2 py-1 text-amber-300 transition hover:bg-shrine-stone"
      >
        +1000🪙
      </button>
      <button
        onClick={cheatInvincible}
        className={`rounded px-2 py-1 transition ${
          invincible ? 'bg-emerald-500 text-slate-900' : 'bg-shrine-slab text-shrine-marble/70 hover:bg-shrine-stone'
        }`}
      >
        {invincible ? 'invincible ✓' : 'invincible'}
      </button>
    </div>
  )
}
