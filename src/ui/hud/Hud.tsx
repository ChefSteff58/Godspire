import { useGameStore } from '../../state/gameStore'
import { AccountBadge } from '../account/AccountBadge'
import { TowerShop } from '../TowerShop'

/**
 * React HUD overlay. Root is pointer-events-none so map clicks reach the Phaser canvas;
 * interactive controls re-enable pointer events themselves.
 */
export function Hud() {
  const elapsed = useGameStore((s) => s.elapsed)
  const kills = useGameStore((s) => s.kills)
  const showDebug = useGameStore((s) => s.showDebug)
  const toggleDebug = useGameStore((s) => s.toggleDebug)
  const placingGod = useGameStore((s) => s.placingGod)

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4">
      <div className="flex items-start justify-between">
        <AccountBadge />
        <div className="flex items-center gap-2 font-mono text-sm text-slate-300">
          <span className="rounded bg-black/40 px-3 py-1">💀 {kills}</span>
          <span className="rounded bg-black/40 px-3 py-1">⏳ {elapsed}s</span>
          <button
            onClick={toggleDebug}
            className={`pointer-events-auto rounded px-3 py-1 transition ${
              showDebug ? 'bg-amber-400 text-slate-900' : 'bg-black/40 text-slate-300 hover:bg-black/60'
            }`}
          >
            debug
          </button>
        </div>
      </div>

      {placingGod && (
        <div className="flex justify-center">
          <span className="rounded-full bg-black/60 px-4 py-1 text-sm text-amber-200">
            Click the map to place {placingGod} · Esc to cancel
          </span>
        </div>
      )}

      <TowerShop />
    </div>
  )
}
