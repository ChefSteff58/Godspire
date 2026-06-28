// ── src/core/run ── the Fate Draft: 1-of-3 between waves. Pure & framework-agnostic.

import type { GodKind } from '../data/towers'
import type { Boon } from './boons'
import { BOON_POOL } from './boons'

/**
 * A draft card. M3 only ever emits `boon` (both gods start unlocked). The `god` arm is defined so
 * M5 can flip on the god-slot roll without reshaping the type or the draft UI.
 */
export type DraftOption =
  | { type: 'boon'; boon: Boon }
  | { type: 'god'; god: GodKind }

type Rng = () => number

/** Build a 3-card draft. Boons-only in M3; 3 DISTINCT picks from the pool. Pure given `rng`. */
export function generateDraft(_wave: number, rng: Rng = Math.random): DraftOption[] {
  const pool = BOON_POOL.slice()
  // Fisher–Yates shuffle, then take 3.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = pool[i]
    pool[i] = pool[j]
    pool[j] = tmp
  }
  return pool.slice(0, 3).map((boon) => ({ type: 'boon', boon }))
}

/** The wave at which the NEXT draft fires — every 3–5 waves (jittered). Never before wave 1. */
export function scheduleNextDraft(wave: number, rng: Rng = Math.random): number {
  return Math.max(1, Math.floor(wave)) + 3 + Math.floor(rng() * 3) // +3..+5
}
