import { useGameStore } from '../../state/gameStore'
import { PixelIcon } from '../kit/PixelIcon'
import type { Rarity } from '../../core/run/boons'

// Rarity → card accent: border ring, label color, backplate tint, and glow (Arcade-Shrine M9-S6).
// ringHex renders as an inline OUTLINE: Tailwind border-color utilities lose the cascade to the
// unlayered .pixel-* border shorthands, and inline box-shadow would clobber .arcade-bevel's stack.
const RARITY: Record<Rarity, { ringHex: string; text: string; label: string; plate: string; glow: string }> = {
  common: { ringHex: '#9aa4b566', text: 'text-rarity-common', label: 'Common', plate: '#9aa4b52e', glow: 'transparent' },
  rare: { ringHex: '#5aa2e880', text: 'text-rarity-rare', label: 'Rare', plate: '#5aa2e82e', glow: '#5aa2e855' },
  epic: { ringHex: '#d65ae880', text: 'text-rarity-epic', label: 'Epic', plate: '#d65ae82e', glow: '#d65ae855' },
  legendary: { ringHex: '#f5d06199', text: 'text-rarity-legendary', label: 'Legendary', plate: '#f5d0612e', glow: '#f5d06166' },
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
  const rerollDraft = useGameStore((s) => s.rerollDraft)
  const rerollCost = useGameStore((s) => s.rerollCost)
  const gold = useGameStore((s) => s.gold)
  const timerSec = useGameStore((s) => s.draftTimerSec)
  if (!options) return null

  const rerollFree = rerollCost === 0
  const canReroll = rerollFree || gold >= rerollCost

  const urgent = timerSec !== null && timerSec <= 5
  const frac = timerSec !== null ? Math.max(0, Math.min(1, timerSec / DRAFT_TIMER_FULL_SEC)) : 1

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-shrine-abyss/80 backdrop-blur-sm">
      <div className="text-center">
        <h2 className="font-pixel text-2xl font-bold text-amber-300">The Fates offer a boon</h2>
        <p className="text-sm text-shrine-marble/60">Choose one — the Fates weave it into the rest of your run.</p>
      </div>
      {timerSec !== null && (
        <div className="flex flex-col items-center gap-1">
          <span className={`font-pixel text-sm font-bold ${urgent ? 'animate-pulse text-red-400' : 'text-shrine-marble/70'}`}>
            {urgent ? `⚡ The Fates choose in ${timerSec}…` : `${timerSec}s`}
          </span>
          {/* the thread of fate: a spun gold strand that shortens — and frays red near the cut */}
          <div className="relative h-[5px] w-64 overflow-hidden rounded-full bg-shrine-stone">
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
              style={{
                animationDelay: `${i * 90}ms`,
                outline: `2px solid ${r.ringHex}`,
                outlineOffset: '-2px',
                boxShadow: b.rarity !== 'common' ? `0 0 14px 1px ${r.glow}` : undefined,
              }}
              className="pixel-panel arcade-bevel card-deal arcade-raise relative flex w-48 flex-col items-center gap-2 overflow-hidden rounded-xl bg-shrine-slab p-5 text-center"
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
              <span className="text-sm text-shrine-marble">{b.desc}</span>
              <span className="text-xs italic text-shrine-marble/50">{b.flavor}</span>
            </button>
          )
        })}
      </div>
      {/* Tempt the Fates — one free reroll per run, then escalating gold (M11). */}
      <button
        onClick={() => canReroll && rerollDraft()}
        disabled={!canReroll}
        title={rerollFree ? 'One free reroll this run' : 'Reroll for gold — cost rises each time'}
        className={`pixel-btn font-pixel text-sm font-bold ${
          canReroll ? 'pixel-btn--gold arcade-raise text-shrine-abyss' : 'cursor-not-allowed text-shrine-marble/40 opacity-60'
        }`}
      >
        🎲 Tempt the Fates — {rerollFree ? 'FREE' : `🪙${rerollCost}`}
      </button>
    </div>
  )
}
