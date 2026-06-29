import { useGameStore } from '../../state/gameStore'
import { useSessionStore } from '../../state/sessionStore'
import { isSupabaseConfigured } from '../../lib/supabase/client'

/** Shown when Olympus falls. Banks Favor by highest wave; one tap to start a fresh run. */
export function RunOverModal() {
  const phase = useGameStore((s) => s.phase)
  const summary = useGameStore((s) => s.runSummary)
  const playAgain = useGameStore((s) => s.playAgain)
  const openPantheon = useGameStore((s) => s.openPantheon)
  const openLeaderboard = useGameStore((s) => s.openLeaderboard)
  const isGuest = useSessionStore((s) => s.isGuest)
  if (phase !== 'over' || !summary) return null

  const newBest = summary.wave >= summary.bestWave && summary.wave > 0

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-slate-950/85 backdrop-blur-sm">
      <div className="text-center">
        <h2 className="font-serif text-3xl font-bold text-rose-400">Olympus has fallen</h2>
        <p className="text-sm text-slate-400">The monsters have stormed the gates… this time.</p>
      </div>
      <div className="flex gap-8 font-mono text-center">
        <Stat label="Wave reached" value={`${summary.wave}`} highlight={newBest} />
        <Stat label="Favor earned" value={`+${summary.favor}`} />
        <Stat label="Best wave" value={`${summary.bestWave}`} />
      </div>
      {newBest && <p className="text-sm font-bold text-amber-300">🏆 New best wave!</p>}
      {newBest && isSupabaseConfigured && (
        <p className="text-xs text-slate-300">
          {isGuest ? '🔗 Link an account (top-left) to post this to the leaderboard.' : '🏆 Submitted to the global leaderboard!'}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-x-7 gap-y-3 font-mono text-center">
        <Stat label="Kills" value={`${summary.kills}`} small />
        <Stat label="Bosses slain" value={`${summary.bossesKilled}`} small highlight={summary.bossesKilled > 0} />
        <Stat label="Gold earned" value={`🪙${summary.goldEarned}`} small />
        <Stat label="Gold spent" value={`🪙${summary.goldSpent}`} small />
        <Stat label="Towers built" value={`${summary.towersBuilt}`} small />
      </div>
      {summary.worstWaveLives > 0 && (
        <p className="text-xs text-slate-400">
          Bloodiest wave: <span className="font-bold text-rose-300">Wave {summary.worstWave}</span> (−{summary.worstWaveLives} lives)
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={openLeaderboard}
          className="rounded-full bg-slate-700 px-6 py-2.5 text-base font-bold text-amber-200 shadow-lg transition hover:bg-slate-600"
        >
          🏆 Ranks
        </button>
        <button
          onClick={openPantheon}
          className="rounded-full bg-slate-700 px-6 py-2.5 text-base font-bold text-amber-200 shadow-lg transition hover:bg-slate-600"
        >
          🏛️ Pantheon
        </button>
        <button
          onClick={playAgain}
          className="rounded-full bg-amber-400 px-8 py-2.5 text-base font-bold text-slate-900 shadow-lg shadow-amber-500/30 transition hover:bg-amber-300"
        >
          ⚔️ Play again
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value, highlight, small }: { label: string; value: string; highlight?: boolean; small?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className={`${small ? 'text-xl' : 'text-3xl'} font-bold ${highlight ? 'text-amber-300' : 'text-slate-100'}`}>{value}</span>
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
    </div>
  )
}
