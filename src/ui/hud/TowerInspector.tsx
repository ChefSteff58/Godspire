import { useGameStore } from '../../state/gameStore'
import { TOWER_STATS } from '../../core/data/towers'

/** Appears when a placed tower is selected (clicked): shows it + a Sell button. */
export function TowerInspector() {
  const sel = useGameStore((s) => s.selectedTower)
  const sellTower = useGameStore((s) => s.sellTower)
  if (!sel) return null
  const stats = TOWER_STATS[sel.god]

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 z-10 flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900/95 p-3 shadow-lg">
      <span className="text-3xl leading-none">{stats.icon}</span>
      <div className="flex flex-col">
        <span className="text-sm font-bold text-slate-100">{stats.name}</span>
        <span className="text-xs text-slate-400">
          range {stats.range} · dmg {stats.damage}
        </span>
      </div>
      <button
        onClick={sellTower}
        title="Sell this tower"
        className="ml-1 rounded bg-rose-600 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-rose-500"
      >
        Sell 🪙{sel.sellValue}
      </button>
    </div>
  )
}
