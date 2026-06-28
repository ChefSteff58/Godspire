import { useGameStore } from '../../state/gameStore'

/** Pause + a single 1×/3× fast-forward toggle (3× = BTD6 baseline). */
export function SpeedControls() {
  const timeScale = useGameStore((s) => s.timeScale)
  const setSpeed = useGameStore((s) => s.setSpeed)
  const paused = timeScale === 0
  const fast = timeScale === 3

  return (
    <div className="flex overflow-hidden rounded ring-1 ring-white/10">
      <button
        onClick={() => setSpeed(paused ? 1 : 0)}
        title={paused ? 'Resume' : 'Pause'}
        className={`px-2.5 py-1 text-sm transition ${
          paused ? 'bg-amber-400 text-slate-900' : 'bg-black/40 text-slate-300 hover:bg-black/60'
        }`}
      >
        {paused ? '▶' : '⏸'}
      </button>
      <button
        onClick={() => setSpeed(fast ? 1 : 3)}
        title="Fast-forward (3×)"
        className={`px-2.5 py-1 text-sm transition ${
          fast ? 'bg-amber-400 text-slate-900' : 'bg-black/40 text-slate-300 hover:bg-black/60'
        }`}
      >
        ⏩
      </button>
    </div>
  )
}
