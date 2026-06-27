import { useGameStore } from '../../state/gameStore'
import { GOD_ORDER, TOWER_STATS } from '../../core/data/towers'

/** The tower shop, as a reserved right-side column. Click a god to enter placement mode. */
export function RightRail() {
  const placingGod = useGameStore((s) => s.placingGod)
  const beginPlacing = useGameStore((s) => s.beginPlacing)

  return (
    <aside className="flex w-44 shrink-0 flex-col gap-2 overflow-y-auto border-l border-white/10 bg-slate-900/90 p-2">
      <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Gods</h3>
      {GOD_ORDER.map((god) => {
        const stats = TOWER_STATS[god]
        const active = placingGod === god
        return (
          <button
            key={god}
            onClick={() => beginPlacing(god)}
            title={stats.blurb}
            className={`flex items-center gap-2 rounded-lg p-2 text-left transition ${
              active ? 'bg-amber-400 text-slate-900' : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
            }`}
          >
            <span className="text-2xl leading-none">{stats.icon}</span>
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-bold">{stats.name}</span>
              <span className="truncate text-xs opacity-70">{stats.blurb}</span>
            </span>
          </button>
        )
      })}
    </aside>
  )
}
