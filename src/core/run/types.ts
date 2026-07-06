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
  /** Bonus damage vs bosses (meta only; applied at hit-time). */
  bossDamageMul: number
  /** Per-wave income multiplier (meta only). */
  incomeMul: number
  // ── M11 per-god signature boons (each amps ONE god's real mechanic; single-god, so no key) ──
  /** Demeter: farm harvest payout ×. */
  demeterIncomeMul: number
  /** Poseidon: splash knockback distance ×. */
  knockbackMul: number
  /** Athena: aura radius ×. */
  auraRangeMul: number
  /** Aphrodite: extra simultaneous charm targets (+N). */
  charmTargetsAdd: number
  /** Hephaestus: extra spike-trap charges (+N). */
  spikeChargesAdd: number
  // ── M11 long-shot procs (per-shot RNG rolled in the fire loop; all towers) ──
  /** Chance [0..1] a shot deals ×critMult damage. */
  critChance: number
  critMult: number
  /** Chance [0..1] a shot chains to a second nearby foe. */
  chainChance: number
  /** Chance [0..1] a shot instantly slays a NON-boss. */
  instakillChance: number
  /** Chance [0..1] a normally camo-blind tower glimpses a hidden foe this acquisition. */
  camoRevealChance: number
}

// SpawnDesc moved to core/entities/enemy.ts (it's enemy-shaped, and onDeath returns it).
