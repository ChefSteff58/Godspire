import { useGameStore } from '../../state/gameStore'

/**
 * The build-phase rhythm: the player starts each wave manually. Wave 1 reads "Begin the siege";
 * during a wave the button is replaced by a status pill so it can't double-fire.
 */
export function WaveControls() {
  const phase = useGameStore((s) => s.phase)
  const wave = useGameStore((s) => s.wave)
  const canStartWave = useGameStore((s) => s.canStartWave)
  const draftOpen = useGameStore((s) => s.draftOptions !== null)
  const autoStart = useGameStore((s) => s.autoStart)
  const requestStartWave = useGameStore((s) => s.requestStartWave)

  if (phase === 'over' || draftOpen) return null

  const label = wave === 0 ? '⚔️ Begin the siege' : `▶ Start Wave ${wave + 1}`

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
      {canStartWave ? (
        autoStart ? (
          // Auto is on: show it's about to fire (so it never LOOKS stalled), but still let the
          // player start immediately. Drafts every 5 waves intentionally pause this.
          <button
            onClick={requestStartWave}
            className="pointer-events-auto rounded-full bg-amber-400/90 px-5 py-2 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/30 transition hover:bg-amber-300"
          >
            ⏱ Auto-starting Wave {wave + 1}… · start now
          </button>
        ) : (
          <button
            onClick={requestStartWave}
            className="pointer-events-auto rounded-full bg-amber-400 px-6 py-2 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/30 transition hover:bg-amber-300"
          >
            {label}
          </button>
        )
      ) : (
        <span className="rounded-full bg-black/70 px-5 py-2 text-sm font-medium text-slate-300">
          {phase === 'spawning' ? `Wave ${wave} incoming…` : `Wave ${wave} — clear the field`}
        </span>
      )}
    </div>
  )
}
