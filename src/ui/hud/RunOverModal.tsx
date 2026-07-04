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
  const lastSubmit = useSessionStore((s) => s.lastSubmit)
  if (phase !== 'over' || !summary) return null

  // Strictly BEAT the pre-run best — a tie is celebrated separately (nothing new was submitted).
  const newBest = summary.wave > summary.prevBestWave && summary.wave > 0
  const tiedBest = summary.wave === summary.prevBestWave && summary.wave > 0

  // The leaderboard line reflects what submitScore actually DID (no more claiming success blindly).
  const submitLine =
    lastSubmit === 'posting'
      ? 'Posting to the global leaderboard…'
      : lastSubmit === 'posted'
        ? '🏆 Submitted to the global leaderboard!'
        : lastSubmit === 'failed'
          ? "Couldn't post your score — it'll retry when you open Ranks."
          : null // idle / already-posted → nothing to announce

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-shrine-abyss/85 backdrop-blur-sm">
      <div className="flex flex-col items-center text-center">
        <div className="banner-ribbon px-12 pb-6 pt-3">
          <h2 className="font-pixel text-3xl font-bold">Olympus has fallen</h2>
        </div>
        <p className="mt-2 text-sm text-shrine-marble/60">The monsters have stormed the gates… this time.</p>
      </div>
      <div className="flex gap-8 font-pixel text-center">
        <Stat label="Wave reached" value={`${summary.wave}`} highlight={newBest} pop />
        <Stat label="Favor earned" value={`+${summary.favor}`} pop />
        <Stat label="Best wave" value={`${summary.bestWave}`} pop />
      </div>
      {newBest && (
        <p className="num-pop font-pixel text-base font-bold text-amber-300 [text-shadow:0_0_10px_rgba(245,208,97,0.6)]">
          🏆👑 NEW BEST WAVE 👑🏆
        </p>
      )}
      {tiedBest && <p className="text-sm font-bold text-amber-300">Tied your best wave!</p>}
      {newBest && isSupabaseConfigured && (
        isGuest ? (
          <p className="text-xs text-shrine-marble/70">🔗 Link an account (top-left) to post this to the leaderboard.</p>
        ) : (
          submitLine && <p className="text-xs text-shrine-marble/70">{submitLine}</p>
        )
      )}
      <div className="flex flex-wrap justify-center gap-x-7 gap-y-3 font-pixel text-center">
        <Stat label="Kills" value={`${summary.kills}`} small />
        <Stat label="Bosses slain" value={`${summary.bossesKilled}`} small highlight={summary.bossesKilled > 0} />
        <Stat label="Gold earned" value={`🪙${summary.goldEarned}`} small />
        <Stat label="Gold spent" value={`🪙${summary.goldSpent}`} small />
        <Stat label="Towers built" value={`${summary.towersBuilt}`} small />
      </div>
      {summary.worstWaveLives > 0 && (
        <p className="text-xs text-shrine-marble/60">
          Bloodiest wave: <span className="font-bold text-rose-300">Wave {summary.worstWave}</span> (−{summary.worstWaveLives} lives)
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={openLeaderboard}
          className="arcade-raise arcade-bevel font-pixel rounded-full bg-shrine-stone px-6 py-2.5 text-base font-bold text-amber-200 shadow-lg"
        >
          🏆 Ranks
        </button>
        <button
          onClick={openPantheon}
          className="arcade-raise arcade-bevel font-pixel rounded-full bg-shrine-stone px-6 py-2.5 text-base font-bold text-amber-200 shadow-lg"
        >
          🏛️ Pantheon
        </button>
        <button
          onClick={playAgain}
          className="pixel-btn pixel-btn--gold arcade-raise font-pixel rounded-full bg-amber-400 px-8 py-2.5 text-base font-bold text-slate-900 shadow-lg shadow-amber-500/30"
        >
          ⚔️ Play again
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value, highlight, small, pop }: { label: string; value: string; highlight?: boolean; small?: boolean; pop?: boolean }) {
  return (
    <div className="flex flex-col">
      <span
        key={pop ? value : undefined}
        className={`${pop ? 'num-pop' : ''} ${small ? 'text-xl' : 'text-3xl'} font-bold ${highlight ? 'text-amber-300' : 'text-shrine-marble'}`}
      >
        {value}
      </span>
      <span className="text-xs uppercase tracking-wide text-shrine-marble/50">{label}</span>
    </div>
  )
}
