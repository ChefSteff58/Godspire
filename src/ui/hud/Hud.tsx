import { useGameStore } from '../../state/gameStore'
import { AccountBadge } from '../account/AccountBadge'

/**
 * React HUD overlay. Root is pointer-events-none so clicks fall through to the Phaser canvas;
 * interactive controls (the account badge/panel) re-enable pointer events themselves.
 */
export function Hud() {
  const elapsed = useGameStore((s) => s.elapsed)

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4">
      <div className="flex items-start justify-between">
        <AccountBadge />
        <span className="rounded bg-black/40 px-3 py-1 font-mono text-sm text-slate-300">
          ⏳ seal held: {elapsed}s
        </span>
      </div>
    </div>
  )
}
