import { useGameStore } from '../../state/gameStore'

/**
 * React HUD overlay. The root is pointer-events-none so clicks fall through to the
 * Phaser canvas; only real controls re-enable pointer events.
 */
export function Hud() {
  const elapsed = useGameStore((s) => s.elapsed)
  const pulses = useGameStore((s) => s.pulses)
  const requestPulse = useGameStore((s) => s.requestPulse)

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4">
      <div className="flex justify-between font-mono text-sm text-slate-300">
        <span className="rounded bg-black/40 px-3 py-1">⏳ seal held: {elapsed}s</span>
        <span className="rounded bg-black/40 px-3 py-1">⚡ pulses: {pulses}</span>
      </div>
      <div className="flex justify-center">
        <button
          onClick={requestPulse}
          className="pointer-events-auto rounded-lg bg-amber-400/90 px-5 py-2 font-semibold text-slate-900 shadow-lg transition hover:bg-amber-300 active:scale-95"
        >
          Pulse Olympus ⚡
        </button>
      </div>
    </div>
  )
}
