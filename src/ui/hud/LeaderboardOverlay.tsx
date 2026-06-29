import { useEffect, useState } from 'react'
import { useGameStore } from '../../state/gameStore'
import { useSessionStore } from '../../state/sessionStore'
import { isSupabaseConfigured } from '../../lib/supabase/client'
import { fetchLeaderboard, rankScores, type RankedScore } from '../../lib/supabase/leaderboard'

/**
 * The global leaderboard — highest wave survived, one row per player. Self-contained + portable so
 * it can later drop into a home-base / main-menu screen. Pauses the run while open.
 */
export function LeaderboardOverlay() {
  const open = useGameStore((s) => s.leaderboardOpen)
  const close = useGameStore((s) => s.closeLeaderboard)
  const userId = useSessionStore((s) => s.userId)
  const isGuest = useSessionStore((s) => s.isGuest)
  const [rows, setRows] = useState<RankedScore[] | null>(null) // null = still loading

  useEffect(() => {
    if (!open || !isSupabaseConfigured) return
    let alive = true
    setRows(null)
    void fetchLeaderboard('endless', 200).then((raw) => {
      if (alive) setRows(rankScores(raw).slice(0, 25))
    })
    return () => {
      alive = false
    }
  }, [open])

  if (!open) return null

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center gap-4 overflow-auto bg-slate-950/92 p-6 backdrop-blur-sm">
      <div className="flex w-full max-w-2xl items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-amber-300">🏆 Leaderboard</h2>
          <p className="text-xs text-slate-400">Highest wave survived · Endless</p>
        </div>
        <button
          onClick={close}
          className="rounded-full bg-amber-400 px-6 py-2 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/30 transition hover:bg-amber-300"
        >
          Done
        </button>
      </div>

      {!isSupabaseConfigured ? (
        <Msg>The leaderboard needs the online backend — you're playing offline.</Msg>
      ) : (
        <div className="flex w-full max-w-2xl flex-col gap-3">
          {isGuest && (
            <div className="rounded-lg border border-sky-400/40 bg-sky-500/10 px-4 py-2 text-center text-sm text-sky-200">
              🔗 Link an account (top-left badge) to post your score and claim a spot.
            </div>
          )}
          {rows === null ? (
            <Msg>Loading…</Msg>
          ) : rows.length === 0 ? (
            <Msg>No scores yet — be the first to plant your banner on Olympus!</Msg>
          ) : (
            <ol className="flex flex-col gap-1">
              {rows.map((r) => {
                const me = !!userId && r.user_id === userId
                return (
                  <li
                    key={`${r.user_id ?? 'anon'}-${r.created_at}`}
                    className={`flex items-center gap-3 rounded px-3 py-2 ${me ? 'border border-amber-400/70 bg-amber-500/15' : 'bg-black/30'}`}
                  >
                    <span className={`w-9 text-right font-mono text-sm font-bold ${r.rank <= 3 ? 'text-amber-300' : 'text-slate-500'}`}>
                      {medal(r.rank)}
                    </span>
                    <span className="flex-1 truncate text-sm text-slate-100">
                      {r.player_name}
                      {me && <span className="text-amber-300"> (you)</span>}
                    </span>
                    <span className="font-mono text-sm font-bold text-rose-300">Wave {r.highest_wave}</span>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}

function Msg({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-sm text-slate-400">{children}</p>
}

function medal(rank: number): string {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`
}
