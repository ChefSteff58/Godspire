import { useGameStore } from '../../state/gameStore'
import { useSessionStore } from '../../state/sessionStore'

/**
 * Player preferences — a ROOT overlay (mirrors PantheonTreePanel) that opens from the title or in-game
 * and pauses the run while shown. Each control persists immediately via sessionStore.setSetting
 * (localStorage + best-effort cloud). Audio is off the roadmap, so `muted` is intentionally not shown.
 */
export function SettingsPanel() {
  const open = useGameStore((s) => s.settingsOpen)
  const close = useGameStore((s) => s.closeSettings)
  const settings = useSessionStore((s) => s.progress.settings)
  const setSetting = useSessionStore((s) => s.setSetting)
  if (!open) return null

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center gap-5 overflow-auto bg-shrine-abyss/92 p-6 backdrop-blur-sm">
      <div className="flex w-full max-w-md items-center justify-between gap-4">
        <div>
          <h2 className="font-pixel text-2xl font-bold text-amber-300">⚙️ Settings</h2>
          <p className="text-xs text-shrine-marble/60">Your preferences save to your account.</p>
        </div>
        <button
          onClick={close}
          className="pixel-btn pixel-btn--gold arcade-raise font-pixel rounded-full bg-amber-400 px-6 py-2 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/30"
        >
          Done
        </button>
      </div>

      <div className="flex w-full max-w-md flex-col gap-3">
        <Row title="Game speed" desc="How fast runs start. You can still change speed mid-run.">
          <Segmented
            options={[
              { label: 'Normal', value: 1 },
              { label: 'Fast ⏩', value: 3 },
            ]}
            value={settings.defaultSpeed}
            onChange={(v) => void setSetting('defaultSpeed', v as 1 | 3)}
          />
        </Row>

        <Row title="Reduced motion" desc="Cut screen shake and flashes. Applies on your next run.">
          <Toggle on={settings.reducedMotion} onChange={(v) => void setSetting('reducedMotion', v)} />
        </Row>
        {/* Colorblind mode is deferred: this game reads identity from sprite SILHOUETTE, and its colors
            live in the Phaser canvas + inline hexes (not CSS theme vars), so a real colorblind pass means
            recoloring the sprite/enemy palette — its own task, not a UI toggle. The reserved settings
            field stays so that pass is a pure add. */}
      </div>
    </div>
  )
}

/** One labelled preference row — title + explanation on the left, the control on the right. */
function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="pixel-chip arcade-bevel flex items-center justify-between gap-4 rounded-xl bg-black/30 p-4">
      <div className="min-w-0">
        <div className="font-pixel text-sm font-bold text-shrine-marble">{title}</div>
        <div className="mt-0.5 text-xs text-shrine-marble/55">{desc}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

/** A two-tone on/off pill switch. */
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`arcade-raise relative h-7 w-12 rounded-full transition-colors ${
        on ? 'bg-amber-400' : 'bg-shrine-stone'
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
          on ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  )
}

/** A segmented single-choice control (used for the 1×/3× speed pick). */
function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex overflow-hidden rounded-lg ring-1 ring-white/10">
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={`font-pixel px-3 py-1.5 text-xs font-bold transition-colors ${
            value === o.value
              ? 'bg-amber-400 text-slate-900'
              : 'bg-shrine-stone text-shrine-marble/70 hover:text-shrine-marble'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
