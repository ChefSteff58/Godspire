import { useGameStore } from '../../state/gameStore'
import { PixelIcon } from '../kit/PixelIcon'
import type { Rarity } from '../../core/run/boons'

// Rarity → card accent: border ring, label color, backplate tint, and glow (Arcade-Shrine M9-S6).
const RARITY: Record<Rarity, { ring: string; text: string; label: string; plate: string; glow: string }> = {
  common: { ring: 'border-slate-500/40 hover:border-slate-300', text: 'text-slate-400', label: 'Common', plate: '#9aa4b52e', glow: 'transparent' },
  rare: { ring: 'border-sky-500/50 hover:border-sky-300', text: 'text-sky-300', label: 'Rare', plate: '#5aa2e82e', glow: '#5aa2e855' },
  epic: { ring: 'border-fuchsia-500/50 hover:border-fuchsia-300', text: 'text-fuchsia-300', label: 'Epic', plate: '#d65ae82e', glow: '#d65ae855' },
  legendary: { ring: 'border-amber-400/60 hover:border-amber-300', text: 'text-amber-300', label: 'Legendary', plate: '#f5d0612e', glow: '#f5d06166' },
}

/** The draft's full decision window (keep in sync with GameScene's DRAFT_TIMER_MS). */
const DRAFT_TIMER_FULL_SEC = 20

/**
 * The Fate Draft: pick 1 of 3 boons between waves. The sim is paused (timeScale 0) while this is
 * open; the overlay captures pointer events so a click can't fall through to the paused canvas and
 * queue a stray tower placement that would fire on un-pause. A wall-clock decision timer (driven by
 * GameScene) counts down — at zero the Fates pick for you, so an AFK player never blocks the run.
 * Arcade-Shrine (M9-S6): rarity-glow cards deal in with a spring stagger; legendary cards shine.
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
        <h2 className="font-pixel text-2xl font-bold text-amber-300">The Fates offer a boon</h2>
        <p className="text-sm text-slate-400">Choose one — it lasts the rest of the run.</p>
      </div>
      {timerSec !== null && (
        <div className="flex flex-col items-center gap-1">
          <span className={`font-pixel text-sm font-bold ${urgent ? 'animate-pulse text-red-400' : 'text-slate-300'}`}>
            {urgent ? `⚡ The Fates choose in ${timerSec}…` : `${timerSec}s`}
          </span>
          {/* the thread of fate: a spun gold strand that shortens — and frays red near the cut */}
          <div className="relative h-[5px] w-64 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-linear"
              style={{
                width: `${frac * 100}%`,
                background: urgent
                  ? 'linear-gradient(90deg, #e05a5a, #ff8a6a)'
                  : 'linear-gradient(90deg, #a97e22, #f5d061 60%, #ffecaa)',
                boxShadow: urgent ? '0 0 6px #e05a5a88' : '0 0 6px #f5d06155',
              }}
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
              style={{ animationDelay: `${i * 90}ms`, boxShadow: b.rarity !== 'common' ? `0 0 14px 1px ${r.glow}` : undefined }}
              className={`pixel-panel arcade-bevel card-deal arcade-raise relative flex w-48 flex-col items-center gap-2 overflow-hidden rounded-xl border bg-slate-900 p-5 text-center ${r.ring}`}
            >
              {b.rarity === 'legendary' && <span className="card-shine" />}
              <span className={`font-pixel text-[10px] font-bold uppercase tracking-wider ${r.text}`}>{r.label}</span>
              {/* 56px icon on a rarity backplate — generated glyph with the emoji as fallback */}
              <span
                className="flex h-16 w-16 items-center justify-center rounded-lg"
                style={{ background: r.plate }}
              >
                <PixelIcon name={`boon_${b.id}`} fallback={b.icon} sizeClass="h-14 w-14 text-4xl" />
              </span>
              <span className="font-pixel text-base font-bold text-amber-200">{b.name}</span>
              <span className="text-sm text-slate-200">{b.desc}</span>
              <span className="text-xs italic text-slate-500">{b.flavor}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
