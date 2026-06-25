import { supabase } from '../supabase/client'
import type { PlayerProgress } from '../../core/progress/types'
import { migrateProgress } from '../../core/progress/rules'

interface ProgressRow {
  favor: number
  unlocked_nodes: unknown
  settings: unknown
  stats: unknown
  updated_at: string
}

function rowToProgress(row: ProgressRow): PlayerProgress {
  // migrateProgress coerces/validates everything, so a hand-edited or partial row can't crash us.
  return migrateProgress({
    favor: row.favor,
    unlockedNodes: row.unlocked_nodes,
    settings: row.settings,
    stats: row.stats,
    updatedAt: row.updated_at,
  })
}

export async function loadProgress(userId: string): Promise<PlayerProgress | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('player_progress')
    .select('favor, unlocked_nodes, settings, stats, updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return null
  return rowToProgress(data as ProgressRow)
}

/**
 * Upsert the player's progress. The client's `updatedAt` is stored verbatim (single-clock merge).
 * Last-writer-wins for M0.5; a multi-tab `updated_at` guard is a future refinement.
 */
export async function saveProgress(userId: string, p: PlayerProgress): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('player_progress').upsert({
    user_id: userId,
    favor: p.favor,
    unlocked_nodes: p.unlockedNodes,
    settings: p.settings,
    stats: p.stats,
    updated_at: p.updatedAt,
  })
  if (error) throw error
}
