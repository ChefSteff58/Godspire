import { useGameStore } from '../../state/gameStore'
import { TOWER_STATS } from '../../core/data/towers'

/** Floating hint over the canvas while placing a tower. */
export function PlacingHint() {
  const placingGod = useGameStore((s) => s.placingGod)
  if (!placingGod) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
      <span className="rounded-full bg-black/70 px-4 py-1 text-sm text-amber-200">
        Click to place {TOWER_STATS[placingGod].name}{' '}
        {TOWER_STATS[placingGod].requiresWater ? 'on the waters of the Styx' : 'on open ground'} · ⇧-click to keep
        placing · Esc to cancel
      </span>
    </div>
  )
}
