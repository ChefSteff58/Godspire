import { useState } from 'react'
import { useSessionStore } from '../../state/sessionStore'
import { isSupabaseConfigured } from '../../lib/supabase/client'
import { levelForFavor, xpForLevel, availablePoints } from '../../core/progress/rules'

/** The account popover: progress, display name, cloud sign-in, and a dev "simulate run" button. */
export function AccountPanel({ onClose }: { onClose: () => void }) {
  const displayName = useSessionStore((s) => s.displayName)
  const isGuest = useSessionStore((s) => s.isGuest)
  const progress = useSessionStore((s) => s.progress)
  const status = useSessionStore((s) => s.status)
  const syncState = useSessionStore((s) => s.syncState)
  const applyRun = useSessionStore((s) => s.applyRun)
  const setDisplayName = useSessionStore((s) => s.setDisplayName)
  const linkEmail = useSessionStore((s) => s.linkEmail)
  const linkGoogle = useSessionStore((s) => s.linkGoogle)
  const signOut = useSessionStore((s) => s.signOut)

  const [name, setName] = useState(displayName)
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const level = levelForFavor(progress.favor)
  const points = availablePoints(progress)
  const floor = xpForLevel(level)
  const ceil = xpForLevel(level + 1)
  const pct = Math.min(100, Math.round(((progress.favor - floor) / Math.max(1, ceil - floor)) * 100))

  const syncLabel =
    status === 'offline'
      ? 'Saved on this device'
      : syncState === 'saving'
        ? 'Saving…'
        : syncState === 'error'
          ? 'Sync error — saved locally'
          : 'Saved ✓'

  async function onLinkEmail() {
    if (!email.trim()) return
    const res = await linkEmail(email.trim())
    setMsg(res.ok ? 'Check your email for a sign-in link.' : (res.error ?? 'Could not send link.'))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="pixel-panel arcade-bevel w-full max-w-sm rounded-2xl bg-shrine-slab p-6 text-shrine-marble shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-pixel text-lg font-bold text-amber-300">Your Account</h2>
          <button onClick={onClose} className="text-shrine-marble/60 hover:text-shrine-marble">
            ✕
          </button>
        </div>

        <div className="pixel-chip arcade-bevel mb-4 rounded-xl bg-black/30 p-4">
          <div className="flex items-baseline justify-between">
            <span className="font-pixel text-xl font-bold text-amber-300">Level {level}</span>
            <span className="text-sm text-shrine-marble/60">
              {points} Favor point{points === 1 ? '' : 's'}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-shrine-abyss">
            <div
              className="h-full bg-shrine-gold transition-all"
              style={{ width: `${pct}%`, boxShadow: '0 0 6px #f5d06188' }}
            />
          </div>
          <div className="mt-1 text-xs text-shrine-marble/60">
            {progress.favor} Favor · best wave {progress.stats.bestWave} · {progress.stats.runsPlayed} runs
          </div>
        </div>

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-shrine-marble/60">
          Display name
        </label>
        <div className="mb-4 flex gap-2">
          <input
            value={name}
            maxLength={32}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-lg bg-shrine-abyss px-3 py-2 text-sm text-shrine-marble ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          />
          <button
            onClick={() => void setDisplayName(name)}
            className="pixel-btn pixel-btn--gold arcade-raise font-pixel rounded bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-900"
          >
            Save
          </button>
        </div>

        {!isSupabaseConfigured ? (
          <p className="mb-4 rounded-lg bg-black/30 p-3 text-xs text-shrine-marble/60">
            Cloud sync isn't set up yet — your progress is saved on this device.
          </p>
        ) : isGuest ? (
          <div className="pixel-chip arcade-bevel mb-4 rounded-lg bg-black/30 p-3">
            <p className="font-pixel mb-1 text-sm font-semibold text-amber-200">Claim your throne ⚡</p>
            <p className="mb-3 text-xs text-shrine-marble/60">
              Save your progress across devices. (As a guest, clearing your browser loses it.)
            </p>
            <div className="flex gap-2">
              <input
                value={email}
                placeholder="you@example.com"
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-lg bg-shrine-abyss px-3 py-2 text-sm text-shrine-marble ring-1 ring-white/10 placeholder:text-shrine-marble/40 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              />
              <button
                onClick={() => void onLinkEmail()}
                className="pixel-btn pixel-btn--gold arcade-raise font-pixel rounded bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Link
              </button>
            </div>
            <button
              onClick={() => void linkGoogle()}
              className="arcade-raise mt-2 w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200"
            >
              Continue with Google
            </button>
            {msg && <p className="mt-2 text-xs text-amber-300">{msg}</p>}
          </div>
        ) : (
          <button
            onClick={() => void signOut()}
            className="pixel-btn arcade-raise mb-4 w-full rounded-lg bg-shrine-stone px-3 py-2 text-sm text-shrine-marble/80"
          >
            Sign out
          </button>
        )}

        {import.meta.env.DEV && (
          <div className="rounded-lg border border-dashed border-shrine-stone p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-shrine-marble/50">Dev</p>
            <button
              onClick={() =>
                void applyRun({
                  waveReached: 5 + Math.floor(Math.random() * 15),
                  victory: Math.random() < 0.3,
                  kills: 10 + Math.floor(Math.random() * 40),
                })
              }
              className="pixel-btn arcade-raise w-full rounded bg-shrine-stone px-3 py-2 text-sm font-semibold text-shrine-gold"
            >
              Simulate run (+Favor)
            </button>
          </div>
        )}
        <p className="mt-2 text-center text-xs text-shrine-marble/50">{syncLabel}</p>
      </div>
    </div>
  )
}
