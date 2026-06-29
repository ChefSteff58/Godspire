import { useGameStore } from '../../state/gameStore'
import { useSessionStore } from '../../state/sessionStore'
import { PANTHEON_NODES } from '../../core/progress/skillTree'
import { canUnlock, availablePoints, levelForFavor, xpForLevel } from '../../core/progress/rules'
import type { PlayerProgress, SkillBranch, SkillNode } from '../../core/progress/types'

const BRANCHES: { key: SkillBranch; name: string; icon: string; color: string }[] = [
  { key: 'war', name: 'War', icon: '⚔️', color: 'text-rose-300' },
  { key: 'harvest', name: 'Harvest', icon: '🌾', color: 'text-emerald-300' },
  { key: 'wisdom', name: 'Wisdom', icon: '🦉', color: 'text-sky-300' },
]

/** The Pantheon skill tree — spend Favor between runs on permanent buffs. Pauses the run while open. */
export function PantheonTreePanel() {
  const open = useGameStore((s) => s.pantheonOpen)
  const close = useGameStore((s) => s.closePantheon)
  const progress = useSessionStore((s) => s.progress)
  const unlockNode = useSessionStore((s) => s.unlockNode)
  if (!open) return null

  const points = availablePoints(progress)
  const level = levelForFavor(progress.favor)
  const toNext = Math.max(0, xpForLevel(level + 1) - progress.favor)

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center gap-5 overflow-auto bg-slate-950/92 p-6 backdrop-blur-sm">
      <div className="flex w-full max-w-4xl items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-amber-300">🏛️ The Pantheon</h2>
          <p className="text-xs text-slate-400">Spend Favor on permanent blessings — they apply on your next run.</p>
        </div>
        <div className="flex items-center gap-5">
          <Pip value={`◆ ${points}`} label="Points" gold />
          <Pip value={`Lv ${level}`} label={`${toNext} Favor to next`} />
          <button
            onClick={close}
            className="rounded-full bg-amber-400 px-6 py-2 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/30 transition hover:bg-amber-300"
          >
            Done
          </button>
        </div>
      </div>

      <div className="grid w-full max-w-4xl grid-cols-3 gap-4">
        {BRANCHES.map((b) => (
          <div key={b.key} className="flex flex-col gap-2">
            <h3 className={`text-center text-sm font-bold uppercase tracking-wide ${b.color}`}>
              {b.icon} {b.name}
            </h3>
            {PANTHEON_NODES.filter((n) => n.branch === b.key)
              .slice()
              .sort((a, c) => (a.tier ?? 0) - (c.tier ?? 0))
              .map((node) => (
                <NodeCard key={node.id} node={node} progress={progress} onUnlock={() => void unlockNode(node.id)} />
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function Pip({ value, label, gold }: { value: string; label: string; gold?: boolean }) {
  return (
    <div className="text-center">
      <div className={`text-xl font-bold ${gold ? 'text-amber-300' : 'text-slate-100'}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  )
}

function NodeCard({ node, progress, onUnlock }: { node: SkillNode; progress: PlayerProgress; onUnlock: () => void }) {
  const owned = progress.unlockedNodes.includes(node.id)
  const available = canUnlock(node.id, progress)
  const prereqsMet = (node.prerequisites ?? []).every((p) => progress.unlockedNodes.includes(p))
  const state = owned ? 'owned' : available ? 'available' : prereqsMet ? 'unaffordable' : 'locked'

  const cls = {
    owned: 'border-amber-400/70 bg-amber-500/15',
    available: 'cursor-pointer border-sky-400/60 bg-sky-500/15 hover:bg-sky-500/25',
    unaffordable: 'border-white/10 bg-black/30 opacity-70',
    locked: 'border-white/5 bg-black/40 opacity-50',
  }[state]

  return (
    <button
      onClick={state === 'available' ? onUnlock : undefined}
      disabled={state !== 'available'}
      className={`flex flex-col gap-0.5 rounded border p-2 text-left transition ${cls}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-100">{node.name}</span>
        <span className={`shrink-0 text-[11px] font-bold ${owned ? 'text-amber-300' : 'text-slate-300'}`}>
          {owned ? '✓ owned' : `◆ ${node.cost}`}
        </span>
      </div>
      <span className="text-[11px] text-slate-400">{node.description}</span>
      {state === 'locked' && <span className="text-[10px] text-slate-600">🔒 unlock the node above first</span>}
      {state === 'unaffordable' && <span className="text-[10px] text-slate-600">Need more Favor points</span>}
    </button>
  )
}
