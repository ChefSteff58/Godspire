import { useGameStore, type SelectedTowerPath } from '../../state/gameStore'
import { TOWER_STATS } from '../../core/data/towers'

/** Appears when a placed tower is selected: its two upgrade paths + a Sell button. */
export function TowerInspector() {
  const sel = useGameStore((s) => s.selectedTower)
  const gold = useGameStore((s) => s.gold)
  const upgradeTower = useGameStore((s) => s.upgradeTower)
  const sellTower = useGameStore((s) => s.sellTower)
  if (!sel) return null
  const stats = TOWER_STATS[sel.god]

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 z-10 flex w-80 flex-col gap-2 rounded-lg border border-white/10 bg-slate-900/95 p-3 shadow-xl">
      <div className="flex items-center gap-2">
        <span className="text-3xl leading-none">{stats.icon}</span>
        <span className="flex-1 text-sm font-bold text-slate-100">{stats.name}</span>
        <button
          onClick={sellTower}
          title="Sell this tower"
          className="rounded bg-rose-600 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-rose-500"
        >
          Sell 🪙{sel.sellValue}
        </button>
      </div>
      <PathRow info={sel.pathA} gold={gold} onUpgrade={() => upgradeTower('A')} />
      <PathRow info={sel.pathB} gold={gold} onUpgrade={() => upgradeTower('B')} />
    </div>
  )
}

function PathRow({ info, gold, onUpgrade }: { info: SelectedTowerPath; gold: number; onUpgrade: () => void }) {
  const dots = [0, 1, 2].map((i) => (i < info.tier ? '●' : '○')).join(' ')
  const affordable = info.nextCost !== null && gold >= info.nextCost

  return (
    <div className="flex flex-col gap-1.5 rounded bg-black/30 p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-200">{info.name}</span>
        <span className="font-mono text-xs tracking-widest text-amber-300">{dots}</span>
      </div>
      {info.nextName === null ? (
        <span className="text-xs font-semibold text-emerald-400">★ Path complete</span>
      ) : info.locked ? (
        <span className="text-xs text-slate-500">🔒 Commit to the other path to unlock</span>
      ) : (
        <button
          onClick={onUpgrade}
          disabled={!affordable}
          className={`flex flex-col rounded px-2 py-1.5 text-left transition ${
            affordable ? 'bg-amber-500/90 text-slate-900 hover:bg-amber-400' : 'cursor-not-allowed bg-slate-800 text-slate-500'
          }`}
        >
          <span className="flex items-center justify-between text-xs font-bold">
            <span>{info.nextName}</span>
            <span>🪙{info.nextCost}</span>
          </span>
          <span className="text-[11px] opacity-80">{info.nextDesc}</span>
        </button>
      )}
    </div>
  )
}
