import { useState } from 'react'
import { useSessionStore } from '../../state/sessionStore'
import { levelForFavor } from '../../core/progress/rules'
import { AccountPanel } from './AccountPanel'

/** The always-visible account chip (top-left of the HUD). Opens the account panel. */
export function AccountBadge() {
  const [open, setOpen] = useState(false)
  const displayName = useSessionStore((s) => s.displayName)
  const isGuest = useSessionStore((s) => s.isGuest)
  const favor = useSessionStore((s) => s.progress.favor)
  const level = levelForFavor(favor)

  return (
    <div className="pointer-events-auto">
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-black/50 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/10 backdrop-blur transition hover:bg-black/70"
      >
        <span>{isGuest ? '🏺' : '⚡'}</span>
        <span className="font-semibold">{displayName}</span>
        <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-xs font-bold text-amber-300">
          Lv {level}
        </span>
        {isGuest && <span className="text-xs text-slate-400">Guest</span>}
      </button>
      {open && <AccountPanel onClose={() => setOpen(false)} />}
    </div>
  )
}
