import { useGameStore } from '../../state/gameStore'

/** Pause · 1×/3× fast-forward · AUTO (auto-start each wave). */
export function SpeedControls() {
  const timeScale = useGameStore((s) => s.timeScale)
  const setSpeed = useGameStore((s) => s.setSpeed)
  const autoStart = useGameStore((s) => s.autoStart)
  const toggleAutoStart = useGameStore((s) => s.toggleAutoStart)
  // While a pause overlay is up the sim is force-paused by GameScene regardless of timeScale — the
  // speed buttons are disabled so ▶ can't misrepresent a forced pause as a player pause.
  const overlayPause = useGameStore((s) => s.pantheonOpen || s.leaderboardOpen || s.draftOptions !== null)
  const paused = timeScale === 0
  const fast = timeScale === 3

  return (
    <div className={`flex overflow-hidden rounded ring-1 ring-white/10 ${overlayPause ? 'pointer-events-none opacity-40' : ''}`}>
      <button
        onClick={() => setSpeed(paused ? 1 : 0)}
        disabled={overlayPause}
        title={paused ? 'Resume' : 'Pause'}
        className={`px-2.5 py-1 text-sm transition ${
          paused ? 'bg-amber-400 text-slate-900' : 'bg-black/40 text-slate-300 hover:bg-black/60'
        }`}
      >
        {paused ? '▶' : '⏸'}
      </button>
      <button
        onClick={() => setSpeed(fast ? 1 : 3)}
        disabled={overlayPause}
        title="Fast-forward (3×)"
        className={`px-2.5 py-1 text-sm transition ${
          fast ? 'bg-amber-400 text-slate-900' : 'bg-black/40 text-slate-300 hover:bg-black/60'
        }`}
      >
        ⏩
      </button>
      <button
        onClick={toggleAutoStart}
        disabled={overlayPause}
        title="Auto-start each wave"
        className={`px-2.5 py-1 text-xs font-bold transition ${
          autoStart ? 'bg-amber-400 text-slate-900' : 'bg-black/40 text-slate-300 hover:bg-black/60'
        }`}
      >
        AUTO
      </button>
    </div>
  )
}
