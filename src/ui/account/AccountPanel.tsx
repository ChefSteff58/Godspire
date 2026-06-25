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
        className="w-full max-w-sm rounded-2xl bg-slate-900 p-6 text-slate-100 shadow-2xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl text-amber-300">Your Account</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            ✕
          </button>
        </div>

        <div className="mb-4 rounded-xl bg-slate-800/60 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-300">Level {level}</span>
            <span className="text-sm text-slate-400">
              {points} skill point{points === 1 ? '' : 's'}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700">
            <div className="h-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {progress.favor} Favor · best wave {progress.stats.bestWave} · {progress.stats.runsPlayed} runs
          </div>
        </div>

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Display name
        </label>
        <div className="mb-4 flex gap-2">
          <input
            value={name}
            maxLength={32}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          />
          <button
            onClick={() => void setDisplayName(name)}
            className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-300"
          >
            Save
          </button>
        </div>

        {!isSupabaseConfigured ? (
          <p className="mb-4 rounded-lg bg-slate-800/60 p-3 text-xs text-slate-400">
            Cloud sync isn't set up yet — your progress is saved on this device.
          </p>
        ) : isGuest ? (
          <div className="mb-4 rounded-lg bg-slate-800/60 p-3">
            <p className="mb-1 text-sm font-semibold text-amber-200">Claim your throne ⚡</p>
            <p className="mb-3 text-xs text-slate-400">
              Save your progress across devices. (As a guest, clearing your browser loses it.)
            </p>
            <div className="flex gap-2">
              <input
                value={email}
                placeholder="you@example.com"
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              />
              <button
                onClick={() => void onLinkEmail()}
                className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-300"
              >
                Link
              </button>
            </div>
            <button
              onClick={() => void linkGoogle()}
              className="mt-2 w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200"
            >
              Continue with Google
            </button>
            {msg && <p className="mt-2 text-xs text-amber-300">{msg}</p>}
          </div>
        ) : (
          <button
            onClick={() => void signOut()}
            className="mb-4 w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-300 ring-1 ring-white/10 hover:bg-slate-700"
          >
            Sign out
          </button>
        )}

        <div className="rounded-lg border border-dashed border-slate-700 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Dev</p>
          <button
            onClick={() =>
              void applyRun({
                waveReached: 5 + Math.floor(Math.random() * 15),
                victory: Math.random() < 0.3,
                kills: 10 + Math.floor(Math.random() * 40),
              })
            }
            className="w-full rounded-lg bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
          >
            Simulate run (+Favor)
          </button>
          <p className="mt-2 text-center text-xs text-slate-500">{syncLabel}</p>
        </div>
      </div>
    </div>
  )
}
