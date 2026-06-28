import { useGameStore } from '../../state/gameStore'

/**
 * The Fate Draft: pick 1 of 3 boons between waves. The sim is paused (timeScale 0) while this is
 * open; the overlay captures pointer events so a click can't fall through to the paused canvas and
 * queue a stray tower placement that would fire on un-pause.
 */
export function FateDraftModal() {
  const options = useGameStore((s) => s.draftOptions)
  const pickDraft = useGameStore((s) => s.pickDraft)
  if (!options) return null

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-slate-950/80 backdrop-blur-sm">
      <div className="text-center">
        <h2 className="font-serif text-2xl font-bold text-amber-300">The Fates offer a boon</h2>
        <p className="text-sm text-slate-400">Choose one — it lasts the rest of the run.</p>
      </div>
      <div className="flex gap-4">
        {options.map((opt, i) => {
          if (opt.type !== 'boon') return null
          const b = opt.boon
          return (
            <button
              key={b.id}
              onClick={() => pickDraft(i)}
              className="flex w-44 flex-col items-center gap-3 rounded-xl border border-amber-400/30 bg-slate-900 p-5 text-center transition hover:-translate-y-1 hover:border-amber-400 hover:bg-slate-800"
            >
              <span className="text-4xl leading-none">{b.icon}</span>
              <span className="font-serif text-lg font-bold text-amber-200">{b.name}</span>
              <span className="text-xs text-slate-300">{b.description}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
