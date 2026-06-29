// ── src/core/run ── per-RUN state shapes (one roguelike run). Pure & framework-agnostic.
// Distinct from src/core/progress (the persisted, cross-run meta save).

import type { GodKind } from '../data/towers'

/** The wave lifecycle. `over` = Olympus has fallen (run ended). */
export type RunPhase = 'building' | 'spawning' | 'clearing' | 'over'

/**
 * Run-scoped multipliers folded from the meta skill tree + drafted boons. Recomputed live as
 * boons are picked. NEVER persisted and NEVER mutates the meta `Modifiers` (save-format territory).
 * `towerDamageMul` is read at FIRE-TIME (not baked at placement) so re-folds reach existing towers.
 */
export interface RunModifiers {
  towerDamageMul: number
  fireRateMul: number
  /** Extra gold per kill, ADDED on top of an enemy's base bounty. */
  goldPerKillBonus: number
  godDamageMul: Record<GodKind, number>
}

// SpawnDesc moved to core/entities/enemy.ts (it's enemy-shaped, and onDeath returns it).
