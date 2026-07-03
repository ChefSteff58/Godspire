import { useGameStore } from '../../state/gameStore'
import { GOD_ORDER, TOWER_STATS } from '../../core/data/towers'
import { hasSprite, spriteUrl } from '../../game/assets/manifest'
import { godHex } from '../kit/godColor'

/**
 * The tower shop — Arcade-Shrine redesign (M9-S5): 8 chunky cards, 56px portraits on
 * element-colored backplates, FULL god names that never truncate, bouncy hover. Fit math:
 * header ~22 + 8×60 cards + 7×2 gaps + padding 16 = 532 ≤ 540px canvas column.
 */
export function RightRail() {
  const placingGod = useGameStore((s) => s.placingGod)
  const beginPlacing = useGameStore((s) => s.beginPlacing)
  const cancelPlacing = useGameStore((s) => s.cancelPlacing)
  const gold = useGameStore((s) => s.gold)

  return (
    <aside className="flex w-60 shrink-0 flex-col gap-0.5 overflow-hidden border-l border-white/10 bg-slate-900/90 p-2">
      <h3 className="font-pixel px-1 pb-0.5 text-xs font-bold uppercase tracking-wide text-shrine-gold">
        Gods
      </h3>
      {GOD_ORDER.map((god, i) => {
        const stats = TOWER_STATS[god]
        const active = placingGod === god
        const affordable = gold >= stats.cost
        const hex = godHex(god)
        return (
          <button
            key={god}
            onClick={() => (active ? cancelPlacing() : beginPlacing(god))}
            disabled={!affordable && !active}
            title={`${stats.blurb} — hotkey ${i + 1}; shift-click the map to place several`}
            style={active ? { boxShadow: `0 0 10px 1px ${hex}66` } : undefined}
            className={`arcade-bevel arcade-raise relative flex h-[60px] items-center gap-2 overflow-hidden rounded-md pr-2 text-left ${
              active
                ? 'bg-amber-400/90 text-slate-900'
                : affordable
                  ? 'bg-slate-800 text-slate-100'
                  : 'cursor-not-allowed bg-slate-800/40 text-slate-500'
            }`}
          >
            {/* element strip — the god's color reads before the name does */}
            <span className="h-full w-[3px] shrink-0" style={{ background: hex }} />
            {/* 56px portrait on an element-tinted backplate */}
            <span
              className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded ${affordable || active ? '' : 'grayscale'}`}
              style={{ background: `${hex}${active ? '55' : '2e'}` }}
            >
              {hasSprite(god) ? (
                <img
                  src={spriteUrl(god)}
                  alt={stats.name}
                  className="h-[50px] w-[50px] object-contain [image-rendering:pixelated]"
                />
              ) : (
                <span className="text-2xl leading-none">{stats.icon}</span>
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
              {/* FULL name, own line, never truncated ("we absolutely cannot have abbreviated god names") */}
              <span className="font-pixel whitespace-nowrap text-[13px] font-bold leading-none">{stats.name}</span>
              <span className="flex items-center gap-1.5">
                <span
                  className={`font-pixel text-[11px] font-bold leading-none ${
                    active ? 'text-slate-800' : affordable ? 'text-amber-300' : 'text-rose-400'
                  }`}
                >
                  🪙{stats.cost}
                </span>
                <span
                  className={`rounded px-1 font-mono text-[10px] leading-tight ${
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
    </aside>
  )
}
