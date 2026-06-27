import { useGameStore } from '../../state/gameStore'
import { AccountBadge } from '../account/AccountBadge'
import { SpeedControls } from './SpeedControls'

export function TopBar() {
  const elapsed = useGameStore((s) => s.elapsed)
  const kills = useGameStore((s) => s.kills)
  const showDebug = useGameStore((s) => s.showDebug)
  const toggleDebug = useGameStore((s) => s.toggleDebug)

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-slate-900/90 px-3 py-2">
      <AccountBadge />
      <div className="flex items-center gap-2 font-mono text-sm text-slate-300">
        <span className="rounded bg-black/40 px-3 py-1">💀 {kills}</span>
        <span className="rounded bg-black/40 px-3 py-1">⏳ {elapsed}s</span>
      </div>
      <div className="flex items-center gap-2">
        <SpeedControls />
        <button
          onClick={toggleDebug}
          className={`rounded px-3 py-1 text-sm transition ${
            showDebug ? 'bg-amber-400 text-slate-900' : 'bg-black/40 text-slate-300 hover:bg-black/60'
          }`}
        >
          debug
        </button>
      </div>
    </div>
  )
}
