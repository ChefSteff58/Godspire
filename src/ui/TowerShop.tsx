import { useGameStore } from '../state/gameStore'
import { GOD_ORDER, TOWER_STATS } from '../core/data/towers'

/** Bottom-center shop. Click a god to enter placement mode (M3 adds gold costs). */
export function TowerShop() {
  const placingGod = useGameStore((s) => s.placingGod)
  const beginPlacing = useGameStore((s) => s.beginPlacing)

  return (
    <div className="flex justify-center">
      <div className="pointer-events-auto flex gap-2 rounded-xl bg-black/50 p-2 ring-1 ring-white/10 backdrop-blur">
        {GOD_ORDER.map((god) => {
          const stats = TOWER_STATS[god]
          const active = placingGod === god
          return (
            <button
              key={god}
              onClick={() => beginPlacing(god)}
              title={stats.blurb}
              className={`flex w-20 flex-col items-center rounded-lg px-3 py-2 transition ${
                active ? 'bg-amber-400 text-slate-900' : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
              }`}
            >
              <span className="text-xl">⚡</span>
              <span className="text-xs font-semibold">{stats.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
