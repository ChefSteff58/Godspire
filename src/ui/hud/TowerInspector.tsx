import { useGameStore, type SelectedTowerPath } from '../../state/gameStore'
import { TOWER_STATS } from '../../core/data/towers'
import { hasSprite, spriteUrl } from '../../game/assets/manifest'
import { godHex } from '../kit/godColor'
import type { TargetingMode } from '../../core/systems/targeting'

const TARGET_MODES: { mode: TargetingMode; label: string; title: string }[] = [
  { mode: 'first', label: 'First', title: 'Target the foe furthest along the path (closest to Olympus)' },
  { mode: 'last', label: 'Last', title: 'Target the foe least far along (newest into the field)' },
  { mode: 'closest', label: 'Close', title: 'Target the foe nearest this god' },
  { mode: 'strongest', label: 'Strong', title: 'Target the foe with the most health' },
]

/** Appears when a placed tower is selected: target priority, its two upgrade paths + a Sell button.
 *  Arcade-Shrine restyle (M9-S5): element-colored identity, chunky bevels, big tier squares. */
export function TowerInspector() {
  const sel = useGameStore((s) => s.selectedTower)
  const gold = useGameStore((s) => s.gold)
  const upgradeTower = useGameStore((s) => s.upgradeTower)
  const sellTower = useGameStore((s) => s.sellTower)
  const setTargeting = useGameStore((s) => s.setTargeting)
  if (!sel) return null
  const stats = TOWER_STATS[sel.god]
  const hex = godHex(sel.god)

  return (
    <div className="pixel-panel arcade-bevel pointer-events-auto absolute bottom-4 left-4 z-10 flex w-80 flex-col gap-2 rounded-lg bg-shrine-abyss/95 p-3 shadow-xl">
      <div className="flex items-center gap-2">
        {/* 40px portrait on the god's element backplate */}
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded"
          style={{ background: `${hex}2e` }}
        >
          {hasSprite(sel.god) ? (
            <img src={spriteUrl(sel.god)} alt={stats.name} className="h-9 w-9 object-contain [image-rendering:pixelated]" />
          ) : (
            <span className="text-2xl leading-none">{stats.icon}</span>
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-pixel whitespace-nowrap text-sm font-bold text-slate-100">{stats.name}</span>
          {/* element underline — the god's color carries through the panel */}
          <span className="mt-0.5 h-[3px] w-16 rounded" style={{ background: hex }} />
        </span>
        <button
          onClick={sellTower}
          title="Sell this tower"
          className="pixel-btn pixel-btn--red arcade-raise font-pixel rounded bg-blood px-2.5 py-1 text-xs font-bold text-white"
        >
          Sell 🪙{sel.sellValue}
        </button>
      </div>
      {sel.targets && !sel.canHitAir && (
        <p className="text-[11px] text-rose-300/90">🪶 Cannot target fliers — pair with Apollo or Hermes.</p>
      )}
      {sel.detectsInnate && (
        <p className="text-[11px] text-sky-300/90">👁 Reveals hidden (camo) foes for nearby gods.</p>
      )}
      {sel.targets && (
        <div className="flex items-center gap-1">
          <span className="font-pixel mr-0.5 text-[11px] font-bold uppercase tracking-wide text-shrine-marble/60">Target</span>
          {TARGET_MODES.map(({ mode, label, title }) => (
            <button
              key={mode}
              title={title}
              onClick={() => setTargeting(mode)}
              style={sel.targeting === mode ? { background: hex, color: '#101423' } : undefined}
              className={`arcade-raise flex-1 rounded px-1.5 py-1 text-[11px] font-bold ${
                sel.targeting === mode ? '' : 'bg-shrine-slab text-shrine-marble/75 hover:bg-shrine-stone'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <PathRow info={sel.pathA} gold={gold} hex={hex} onUpgrade={() => upgradeTower('A')} />
      <PathRow info={sel.pathB} gold={gold} hex={hex} onUpgrade={() => upgradeTower('B')} />
    </div>
  )
}

function PathRow({ info, gold, hex, onUpgrade }: { info: SelectedTowerPath; gold: number; hex: string; onUpgrade: () => void }) {
  const affordable = info.nextCost !== null && gold >= info.nextCost

  return (
    <div className="arcade-bevel flex flex-col gap-1.5 rounded bg-black/30 p-2">
      <div className="flex items-center justify-between">
        <span className="font-pixel text-xs font-bold text-slate-200">{info.name}</span>
        {/* chunky 8px tier squares — read at a glance, BTD6-style */}
        <span className="flex items-center gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-[2px]"
              style={{ background: i < info.tier ? hex : '#ffffff22', boxShadow: i < info.tier ? `0 0 4px ${hex}88` : undefined }}
            />
          ))}
        </span>
      </div>
      {info.nextName === null ? (
        <span className="font-pixel text-xs font-bold text-emerald-400">★ Path complete</span>
      ) : info.locked ? (
        <span className="text-xs text-slate-500/80 [text-shadow:0_1px_0_rgba(255,255,255,0.06)]">
          🔒 Capped — the other path is this god's main
        </span>
      ) : (
        <button
          onClick={onUpgrade}
          disabled={!affordable}
          className={`arcade-raise flex flex-col rounded px-2 py-1.5 text-left ${
            affordable
              ? 'pixel-btn pixel-btn--gold arcade-bevel bg-amber-500/90 text-slate-900'
              : 'cursor-not-allowed bg-shrine-slab text-shrine-marble/40'
          }`}
        >
          <span className="flex items-center justify-between text-xs font-bold">
            <span className="font-pixel flex items-center gap-1">
              {info.nextName}
              {info.nextSpecial && (
                <span className="rounded bg-black/40 px-1 py-0.5 text-[8px] font-bold tracking-wide text-amber-300">
                  {info.nextSpecial}
                </span>
              )}
            </span>
            <span className="font-pixel num-pop" key={info.nextCost}>
              🪙{info.nextCost}
            </span>
          </span>
          <span className="text-[11px] opacity-80">{info.nextDesc}</span>
        </button>
      )}
    </div>
  )
}
