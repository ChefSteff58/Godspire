import { useGameStore } from '../../state/gameStore'
import { useSessionStore } from '../../state/sessionStore'
import { PANTHEON_NODES } from '../../core/progress/skillTree'
import { canUnlock, availablePoints, levelForFavor, xpForLevel } from '../../core/progress/rules'
import { PixelIcon } from '../kit/PixelIcon'
import type { PlayerProgress, SkillBranch, SkillNode } from '../../core/progress/types'

// Branch identity: carved banner gradient + connector/accent color (Arcade-Shrine M9-S6).
const BRANCHES: { key: SkillBranch; name: string; icon: string; text: string; hex: string; banner: string }[] = [
  { key: 'war', name: 'War', icon: '⚔️', text: 'text-rose-300', hex: '#e06c5a', banner: 'linear-gradient(180deg, #6b2b22, #3d1712)' },
  { key: 'harvest', name: 'Harvest', icon: '🌾', text: 'text-emerald-300', hex: '#6abe53', banner: 'linear-gradient(180deg, #2b4a22, #14290f)' },
  { key: 'wisdom', name: 'Wisdom', icon: '🦉', text: 'text-sky-300', hex: '#7fb3e0', banner: 'linear-gradient(180deg, #24405c, #101f30)' },
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
    <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center gap-5 overflow-auto bg-shrine-abyss/92 p-6 backdrop-blur-sm">
      <div className="flex w-full max-w-4xl items-center justify-between gap-4">
        <div>
          <h2 className="font-pixel text-2xl font-bold text-amber-300">🏛️ The Pantheon</h2>
          <p className="text-xs text-shrine-marble/60">Spend Favor on permanent blessings — they apply on your next run.</p>
        </div>
        <div className="flex items-center gap-5">
          <Pip value={`◆ ${points}`} label="Points" gold />
          <Pip value={`Lv ${level}`} label={`${toNext} Favor to next`} />
          <button
            onClick={close}
            className="pixel-btn pixel-btn--gold arcade-raise font-pixel rounded-full bg-amber-400 px-6 py-2 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/30"
          >
            Done
          </button>
        </div>
      </div>

      <div className="grid w-full max-w-4xl grid-cols-3 gap-4">
        {BRANCHES.map((b) => (
          <div key={b.key} className="flex flex-col gap-0">
            {/* carved branch banner */}
            <div
              className="banner-ribbon arcade-bevel mb-2 pb-4 pt-2 text-center"
              style={{ background: b.banner, color: '#e7e3d8' }}
            >
              <h3 className={`font-pixel text-sm font-bold uppercase tracking-wide ${b.text}`}>
                {b.icon} {b.name}
              </h3>
            </div>
            {PANTHEON_NODES.filter((n) => n.branch === b.key)
              .slice()
              .sort((a, c) => (a.tier ?? 0) - (c.tier ?? 0))
              .map((node, i, arr) => (
                <div key={node.id} className="flex flex-col items-stretch">
                  {/* tier connector: gold when the chain is owned, branch color when reachable, slate when locked */}
                  {i > 0 && <Connector node={node} prev={arr[i - 1]} progress={progress} hex={b.hex} />}
                  <NodeCard node={node} progress={progress} hex={b.hex} onUnlock={() => void unlockNode(node.id)} />
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function Connector({ node, prev, progress, hex }: { node: SkillNode; prev: SkillNode; progress: PlayerProgress; hex: string }) {
  const bothOwned = progress.unlockedNodes.includes(node.id) && progress.unlockedNodes.includes(prev.id)
  const reachable = (node.prerequisites ?? []).every((p) => progress.unlockedNodes.includes(p))
  const color = bothOwned ? '#f5d061' : reachable ? hex : '#33415588'
  return <span className="mx-auto h-3 w-[3px] rounded" style={{ background: color }} />
}

function Pip({ value, label, gold }: { value: string; label: string; gold?: boolean }) {
  return (
    <div className="text-center">
      <div className={`font-pixel text-xl font-bold ${gold ? 'text-amber-300' : 'text-shrine-marble'}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-shrine-marble/50">{label}</div>
    </div>
  )
}

function NodeCard({ node, progress, hex, onUnlock }: { node: SkillNode; progress: PlayerProgress; hex: string; onUnlock: () => void }) {
  const owned = progress.unlockedNodes.includes(node.id)
  const available = canUnlock(node.id, progress)
  const prereqsMet = (node.prerequisites ?? []).every((p) => progress.unlockedNodes.includes(p))
  const state = owned ? 'owned' : available ? 'available' : prereqsMet ? 'unaffordable' : 'locked'

  const cls = {
    owned: 'border-amber-400/70 bg-amber-500/15',
    available: 'node-breathe cursor-pointer border-sky-400/60 bg-sky-500/15 hover:bg-sky-500/25',
    unaffordable: 'border-white/10 bg-black/30 opacity-70',
    locked: 'border-white/5 bg-black/40 opacity-50 [text-shadow:0_1px_0_rgba(255,255,255,0.05)]',
  }[state]

  return (
    <button
      onClick={state === 'available' ? onUnlock : undefined}
      disabled={state !== 'available'}
      className={`arcade-bevel flex items-center gap-2 rounded border p-2 text-left transition ${cls}`}
    >
      {/* node glyph on a branch-tinted backplate (emoji ◆ fallback until its PNG lands) */}
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded ${state === 'locked' ? 'grayscale' : ''}`}
        style={{ background: `${hex}26` }}
      >
        <PixelIcon name={`node_${node.id}`} fallback="◆" sizeClass="h-9 w-9 text-lg" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center justify-between gap-2">
          <span className="font-pixel text-xs font-bold text-shrine-marble">{node.name}</span>
          <span className={`font-pixel shrink-0 text-[11px] font-bold ${owned ? 'text-amber-300' : 'text-shrine-marble/70'}`}>
            {owned ? '✓' : `◆ ${node.cost}`}
          </span>
        </span>
        <span className="text-[11px] text-shrine-marble/60">{node.description}</span>
        {state === 'locked' && <span className="text-[10px] text-shrine-marble/40">🔒 unlock the node above first</span>}
        {state === 'unaffordable' && <span className="text-[10px] text-shrine-marble/40">Need more Favor points</span>}
      </span>
    </button>
  )
}
