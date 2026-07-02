import { useGameStore } from '../../state/gameStore'
import { GOD_ORDER, TOWER_STATS } from '../../core/data/towers'
import { hasSprite, spriteUrl } from '../../game/assets/manifest'

/** The tower shop, as a reserved right-side column. Click a god to enter placement mode. */
export function RightRail() {
  const placingGod = useGameStore((s) => s.placingGod)
  const beginPlacing = useGameStore((s) => s.beginPlacing)
  const cancelPlacing = useGameStore((s) => s.cancelPlacing)
  const gold = useGameStore((s) => s.gold)

  return (
    <aside className="flex w-44 shrink-0 flex-col gap-2 overflow-y-auto border-l border-white/10 bg-slate-900/90 p-2">
      <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Gods</h3>
      <p className="px-1 text-[11px] leading-tight text-slate-500">
        Click a god (or press its number), then click the map. Shift-click places several.
      </p>
      {GOD_ORDER.map((god, i) => {
        const stats = TOWER_STATS[god]
        const active = placingGod === god
        const affordable = gold >= stats.cost
        return (
          <button
            key={god}
            onClick={() => (active ? cancelPlacing() : beginPlacing(god))}
            disabled={!affordable && !active}
            title={`${stats.blurb} — hotkey ${i + 1}`}
            className={`flex items-center gap-2 rounded-lg p-2 text-left transition ${
              active
                ? 'bg-amber-400 text-slate-900'
                : affordable
                  ? 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                  : 'cursor-not-allowed bg-slate-800/40 text-slate-500'
            }`}
          >
            {hasSprite(god) ? (
              <img
                src={spriteUrl(god)}
                alt={stats.name}
                className="h-12 w-12 shrink-0 object-contain [image-rendering:pixelated]"
              />
            ) : (
              <span className="text-2xl leading-none">{stats.icon}</span>
            )}
            <span className="flex min-w-0 flex-col">
              <span className="flex items-center gap-1 text-sm font-bold">
                <span className={`mr-0.5 rounded px-1 text-[10px] font-mono ${active ? 'bg-slate-900/20 text-slate-800' : 'bg-black/40 text-slate-400'}`}>
                  {i + 1}
                </span>
                {stats.name}
                <span className={active ? 'text-slate-800' : 'text-amber-300'}>🪙{stats.cost}</span>
              </span>
              <span className="truncate text-xs opacity-70">{stats.blurb}</span>
            </span>
          </button>
        )
      })}
    </aside>
  )
}
