import { supabase } from './client'

// ── src/lib/supabase ── the global leaderboard repo. Mirrors progressRepo's pattern: every call is
// best-effort — returns a value on failure and NEVER throws, so the run-over screen can't crash on a
// flaky network / unconfigured backend. WHO may submit is decided by the caller (account-required).

export type LeaderboardMode = 'standard' | 'hard' | 'endless'

export interface ScoreRow {
  player_name: string
  highest_wave: number
  user_id: string | null
  created_at: string
}

export interface RankedScore extends ScoreRow {
  rank: number
}

/** Submit one score row. Returns `{ ok }` — never throws. (The board is insert-only by RLS.) */
export async function submitScore(
  userId: string,
  playerName: string,
  highestWave: number,
  mode: LeaderboardMode = 'endless',
): Promise<{ ok: boolean }> {
  if (!supabase) return { ok: false }
  try {
    const { error } = await supabase.from('scores').insert({
      user_id: userId,
      player_name: playerName.trim().slice(0, 32) || 'Mortal',
      highest_wave: Math.max(0, Math.min(1000, Math.floor(highestWave))),
      score: 0,
      mode,
    })
    return { ok: !error }
  } catch {
    return { ok: false }
  }
}

/** Fetch raw score rows for a mode (public read). Returns `[]` on error / offline. */
export async function fetchLeaderboard(mode: LeaderboardMode = 'endless', limit = 200): Promise<ScoreRow[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('player_name, highest_wave, user_id, created_at')
      .eq('mode', mode)
      .order('highest_wave', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limit)
    if (error || !data) return []
    return data as ScoreRow[]
  } catch {
    return []
  }
}

/**
 * Collapse append-only rows to ONE entry per player (their best wave), sorted desc, ranked 1..N.
 * Pure + unit-tested. Rows with no user_id (orphaned by account deletion) are each kept individually.
 * Ties break by earliest submission (the player who reached the wave first ranks higher).
 */
export function rankScores(rows: readonly ScoreRow[]): RankedScore[] {
  const bestByUser = new Map<string, ScoreRow>()
  const orphans: ScoreRow[] = []
  for (const r of rows) {
    if (!r.user_id) {
      orphans.push(r)
      continue
    }
    const cur = bestByUser.get(r.user_id)
    if (!cur || r.highest_wave > cur.highest_wave) bestByUser.set(r.user_id, r)
  }
  const deduped = [...bestByUser.values(), ...orphans]
  deduped.sort((a, b) => b.highest_wave - a.highest_wave || a.created_at.localeCompare(b.created_at))
  return deduped.map((r, i) => ({ ...r, rank: i + 1 }))
}
