import { useGameStore } from '../../state/gameStore'
import { GOD_ORDER, TOWER_STATS } from '../../core/data/towers'
import { hasSprite, spriteUrl } from '../../game/assets/manifest'

/**
 * The tower shop — Arcade-Shrine (M9-S5, de-colored + big-portrait pass 2026-07-05): 8 chunky cards,
 * BIG portraits (the god fills the box, head-to-feet), FULL god names that never truncate, bouncy
 * hover. No element color-coding (user call). Fit: header ~22 + 8×62 cards + 7×2 gaps + padding —
 * the rail column flexes to the canvas height and is overflow-hidden, so it never crops the field.
 */
export function RightRail() {
  const placingGod = useGameStore((s) => s.placingGod)
  const beginPlacing = useGameStore((s) => s.beginPlacing)
  const cancelPlacing = useGameStore((s) => s.cancelPlacing)
  const gold = useGameStore((s) => s.gold)

  return (
    <aside className="flex w-60 shrink-0 flex-col gap-0.5 overflow-hidden border-l border-white/10 bg-shrine-abyss/90 p-2">
      <h3 className="font-pixel px-1 pb-0.5 text-xs font-bold uppercase tracking-wide text-shrine-gold">
        Gods
      </h3>
      {GOD_ORDER.map((god, i) => {
        const stats = TOWER_STATS[god]
        const active = placingGod === god
        const affordable = gold >= stats.cost
        const nudge = affordable && !active && gold > 600 // hoarding (~3× the cheapest god) → nudge to spend
        return (
          <button
            key={god}
            onClick={() => (active ? cancelPlacing() : beginPlacing(god))}
            disabled={!affordable && !active}
            title={`${stats.blurb} — hotkey ${i + 1}; shift-click the map to place several`}
            style={active ? { boxShadow: '0 0 10px 1px #f5d06188' } : nudge ? { boxShadow: '0 0 8px 1px #f5d06155' } : undefined}
            className={`arcade-bevel arcade-raise relative flex h-[62px] items-center gap-2 overflow-hidden rounded-md pr-2 text-left ${nudge ? 'node-breathe ' : ''}${
              active
                ? 'bg-amber-400/90 text-slate-900'
                : affordable
                  ? 'bg-shrine-stone text-shrine-marble'
                  : 'cursor-not-allowed bg-shrine-slab/50 text-shrine-marble/40'
            }`}
          >
            {/* BIG portrait — the god fills the box, head-to-feet. The sprite is zoomed inside an
                overflow-hidden frame to eat its transparent padding (no element-colored backplate). */}
            <span
              className={`relative flex h-[58px] w-[58px] shrink-0 items-center justify-center overflow-hidden rounded ${affordable || active ? '' : 'grayscale'}`}
            >
              {hasSprite(god) ? (
                <img
                  src={spriteUrl(god)}
                  alt={stats.name}
                  className="h-full w-full scale-[1.32] object-contain [image-rendering:pixelated]"
                />
              ) : (
                <span className="text-3xl leading-none">{stats.icon}</span>
              )}
              {stats.canHitAir && (
                <span className="absolute -right-0.5 -top-0.5 rounded-bl bg-black/70 px-0.5 text-[9px] leading-tight" title="Strikes flying foes">
                  🪶
                </span>
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
                    active ? 'bg-slate-900/20 text-slate-800' : 'bg-black/40 text-shrine-marble/50'
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
