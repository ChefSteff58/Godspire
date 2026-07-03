import { useGameStore } from '../../state/gameStore'
import type { Rarity } from '../../core/run/boons'

// Rarity → card accent (border + label color). Rarer cards read as more special.
const RARITY: Record<Rarity, { ring: string; text: string; label: string }> = {
  common: { ring: 'border-slate-500/40 hover:border-slate-300', text: 'text-slate-400', label: 'Common' },
  rare: { ring: 'border-sky-500/50 hover:border-sky-300', text: 'text-sky-300', label: 'Rare' },
  epic: { ring: 'border-fuchsia-500/50 hover:border-fuchsia-300', text: 'text-fuchsia-300', label: 'Epic' },
  legendary: { ring: 'border-amber-400/60 hover:border-amber-300', text: 'text-amber-300', label: 'Legendary' },
}

/** The draft's full decision window (keep in sync with GameScene's DRAFT_TIMER_MS). */
const DRAFT_TIMER_FULL_SEC = 20

/**
 * The Fate Draft: pick 1 of 3 boons between waves. The sim is paused (timeScale 0) while this is
 * open; the overlay captures pointer events so a click can't fall through to the paused canvas and
 * queue a stray tower placement that would fire on un-pause. A wall-clock decision timer (driven by
 * GameScene) counts down — at zero the Fates pick for you, so an AFK player never blocks the run.
 */
export function FateDraftModal() {
  const options = useGameStore((s) => s.draftOptions)
  const pickDraft = useGameStore((s) => s.pickDraft)
  const timerSec = useGameStore((s) => s.draftTimerSec)
  if (!options) return null

  const urgent = timerSec !== null && timerSec <= 5
  const frac = timerSec !== null ? Math.max(0, Math.min(1, timerSec / DRAFT_TIMER_FULL_SEC)) : 1

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-slate-950/80 backdrop-blur-sm">
      <div className="text-center">
        <h2 className="font-serif text-2xl font-bold text-amber-300">The Fates offer a boon</h2>
        <p className="text-sm text-slate-400">Choose one — it lasts the rest of the run.</p>
      </div>
      {timerSec !== null && (
        <div className="flex flex-col items-center gap-1">
          <span className={`font-mono text-sm font-bold ${urgent ? 'animate-pulse text-red-400' : 'text-slate-300'}`}>
            {urgent ? `⚡ The Fates choose in ${timerSec}…` : `${timerSec}s`}
          </span>
          <div className="h-1.5 w-64 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${urgent ? 'bg-red-500' : 'bg-amber-400'}`}
              style={{ width: `${frac * 100}%` }}
            />
          </div>
        </div>
      )}
      <div className="flex gap-4">
        {options.map((opt, i) => {
          if (opt.type !== 'boon') return null
          const b = opt.boon
          const r = RARITY[b.rarity]
          return (
            <button
              key={b.id}
              onClick={() => pickDraft(i)}
              className={`pixel-panel flex w-48 flex-col items-center gap-2 rounded-xl border bg-slate-900 p-5 text-center transition hover:-translate-y-1 hover:bg-slate-800 ${r.ring}`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider ${r.text}`}>{r.label}</span>
              <span className="text-4xl leading-none">{b.icon}</span>
              <span className="font-serif text-lg font-bold text-amber-200">{b.name}</span>
              <span className="text-sm text-slate-200">{b.desc}</span>
              <span className="text-xs italic text-slate-500">{b.flavor}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
