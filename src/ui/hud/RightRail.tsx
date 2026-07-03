import { useGameStore } from '../../state/gameStore'
import { GOD_ORDER, TOWER_STATS } from '../../core/data/towers'
import { hasSprite, spriteUrl } from '../../game/assets/manifest'

/**
 * The tower shop, as a reserved right-side column. Click a god to enter placement mode.
 * Sized so ALL eight gods fit the 540px canvas column with no scrollbar (compact rows; the
 * blurb lives in the tooltip + the TowerInspector, not the card).
 */
export function RightRail() {
  const placingGod = useGameStore((s) => s.placingGod)
  const beginPlacing = useGameStore((s) => s.beginPlacing)
  const cancelPlacing = useGameStore((s) => s.cancelPlacing)
  const gold = useGameStore((s) => s.gold)

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-1.5 overflow-hidden border-l border-white/10 bg-slate-900/90 p-2">
      <h3 className="font-pixel px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Gods</h3>
      {GOD_ORDER.map((god, i) => {
        const stats = TOWER_STATS[god]
        const active = placingGod === god
        const affordable = gold >= stats.cost
        return (
          <button
            key={god}
            onClick={() => (active ? cancelPlacing() : beginPlacing(god))}
            disabled={!affordable && !active}
            title={`${stats.blurb} — hotkey ${i + 1}; shift-click the map to place several`}
            className={`pixel-card flex items-center gap-2 rounded-lg px-1.5 py-1 text-left transition ${
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
                className="h-9 w-9 shrink-0 object-contain [image-rendering:pixelated]"
              />
            ) : (
              <span className="text-xl leading-none">{stats.icon}</span>
            )}
            <span className="flex min-w-0 flex-1 items-center justify-between gap-1">
              <span className="font-pixel truncate text-sm font-bold">{stats.name}</span>
              <span className="flex items-center gap-1">
                <span className={`text-[11px] font-semibold ${active ? 'text-slate-800' : 'text-amber-300'}`}>
                  {stats.cost}
                </span>
                <span
                  className={`rounded px-1 text-[10px] font-mono ${
                    active ? 'bg-slate-900/20 text-slate-800' : 'bg-black/40 text-slate-500'
                  }`}
                >
                  {i + 1}
                </span>
              </span>
            </span>
          </button>
        )
      })}
      <p className="mt-auto px-1 text-[10px] leading-tight text-slate-500">
        Press a number or click a god, then click the map. Shift-click places several.
      </p>
    </aside>
  )
}
