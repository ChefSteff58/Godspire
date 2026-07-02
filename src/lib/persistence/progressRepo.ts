import { supabase } from '../supabase/client'
import type { PlayerProgress } from '../../core/progress/types'
import { migrateProgress, EPOCH } from '../../core/progress/rules'

export interface ProgressRow {
  favor: number
  unlocked_nodes: unknown
  settings: unknown
  stats: unknown
  updated_at: string
}

function isEmptyObject(v: unknown): boolean {
  return !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0
}

/** Exported for tests (pure row → save mapping). */
export function rowToProgress(row: ProgressRow): PlayerProgress {
  // A PRISTINE trigger-created row (every column at its schema default) must LOSE merges even if
  // an older schema stamped it now() at signup — otherwise a fresh anon row wipes real local
  // progress. A real settings-only save has settings = {muted:…}, so requiring ALL four defaults
  // never misclassifies one. New schemas stamp these rows 'epoch' at insert; this covers old rows.
  const pristine =
    row.favor === 0 &&
    Array.isArray(row.unlocked_nodes) &&
    row.unlocked_nodes.length === 0 &&
    isEmptyObject(row.stats) &&
    isEmptyObject(row.settings)
  // migrateProgress coerces/validates everything, so a hand-edited or partial row can't crash us.
  return migrateProgress({
    favor: row.favor,
    unlockedNodes: row.unlocked_nodes,
    settings: row.settings,
    stats: row.stats,
    updatedAt: pristine ? EPOCH : row.updated_at,
  })
}

export async function loadProgress(userId: string): Promise<PlayerProgress | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('player_progress')
    .select('favor, unlocked_nodes, settings, stats, updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  // A failed QUERY must not read as "no cloud row" — that would let boot's reconcile upsert
  // wipe the real save. Throw (boot's try/catch goes offline without reconciling); null is
  // reserved for a genuinely absent row.
  if (error) throw error
  if (!data) return null
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
