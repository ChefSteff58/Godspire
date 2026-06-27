import { useGameStore } from '../../state/gameStore'

const SPEEDS = [0, 1, 2, 3] // 0 = pause; 3× is BTD6's fast-forward baseline

export function SpeedControls() {
  const timeScale = useGameStore((s) => s.timeScale)
  const setSpeed = useGameStore((s) => s.setSpeed)

  return (
    <div className="flex overflow-hidden rounded ring-1 ring-white/10">
      {SPEEDS.map((sp) => (
        <button
          key={sp}
          onClick={() => setSpeed(sp)}
          title={sp === 0 ? 'Pause' : `${sp}× speed`}
          className={`px-2.5 py-1 text-sm transition ${
            timeScale === sp ? 'bg-amber-400 text-slate-900' : 'bg-black/40 text-slate-300 hover:bg-black/60'
          }`}
        >
          {sp === 0 ? '⏸' : `${sp}×`}
        </button>
      ))}
    </div>
  )
}
