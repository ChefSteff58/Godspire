// ── src/core/run ── the Fate Draft: 1-of-3 between waves. Pure & framework-agnostic.

import type { GodKind } from '../data/towers'
import type { Boon } from './boons'
import { BOON_POOL, RARITY_WEIGHT } from './boons'

/**
 * A draft card. M3 only ever emits `boon` (both gods start unlocked, and the tower-access decision
 * is TRADITIONAL — gods are gated by the skill tree, never per-run drafted). The `god` arm is kept
 * defined-but-UNUSED so the type/UI never need reshaping; do NOT flip it on.
 */
export type DraftOption =
  | { type: 'boon'; boon: Boon }
  | { type: 'god'; god: GodKind }

type Rng = () => number

/** Build a 3-card draft: 3 DISTINCT boons, sampled WEIGHTED by rarity (rarer = scarcer). Pure. */
export function generateDraft(_wave: number, rng: Rng = Math.random): DraftOption[] {
  const pool = BOON_POOL.slice()
  const picks: Boon[] = []
  for (let n = 0; n < 3 && pool.length > 0; n++) {
    const total = pool.reduce((s, b) => s + RARITY_WEIGHT[b.rarity], 0)
    let r = rng() * total
    let idx = 0
    for (let i = 0; i < pool.length; i++) {
      r -= RARITY_WEIGHT[pool[i].rarity]
      if (r <= 0) { idx = i; break }
    }
    picks.push(pool[idx])
    pool.splice(idx, 1) // distinct: don't draw the same card twice
  }
  return picks.map((boon) => ({ type: 'boon', boon }))
}

/** The wave at which the NEXT draft fires — a Fate Draft every 5 waves (5, 10, 15, …). */
export function scheduleNextDraft(wave: number, _rng: Rng = Math.random): number {
  return Math.max(0, Math.floor(wave)) + 5
}
