import { useGameStore } from '../../state/gameStore'

/**
 * Build-phase rhythm. The FIRST wave always waits for a manual "Begin the siege" (time to lay
 * opening towers). After that, with auto-start on (the default) rounds chain silently — no
 * between-round prompt; the player tracks the wave counter up top (BTD6 auto-play). With auto
 * off, the manual "Start Wave N" button returns and a status pill marks an in-progress wave.
 */
export function WaveControls() {
  const phase = useGameStore((s) => s.phase)
  const wave = useGameStore((s) => s.wave)
  const canStartWave = useGameStore((s) => s.canStartWave)
  const draftOpen = useGameStore((s) => s.draftOptions !== null)
  const autoStart = useGameStore((s) => s.autoStart)
  const requestStartWave = useGameStore((s) => s.requestStartWave)

  if (phase === 'over' || draftOpen) return null
  // Auto-flow once the siege is underway: nothing to show — rounds start themselves.
  if (autoStart && wave >= 1) return null

  if (canStartWave) {
    const label = wave === 0 ? '⚔️ Begin the siege' : `▶ Start Wave ${wave + 1}`
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center">
        <button
          onClick={requestStartWave}
          className="pixel-btn pixel-btn--gold font-pixel pointer-events-auto rounded-full bg-amber-400 px-6 py-2 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/30 transition hover:bg-amber-300"
        >
          {label}
        </button>
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
      <span className="rounded-full bg-black/70 px-5 py-2 text-sm font-medium text-shrine-marble/70">
        {phase === 'spawning' ? `Wave ${wave} incoming…` : `Wave ${wave} — clear the field`}
      </span>
    </div>
  )
}
