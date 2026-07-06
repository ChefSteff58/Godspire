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
  // ── M11 build-defining boons (applied as a DYNAMIC fire-time factor from live run state) ──
  /** Monotheist: ×N to all damage while exactly ONE god type is fielded (1 = inactive). */
  monotheistMul: number
  /** Full Pantheon: +this per DISTINCT god fielded (0 = inactive). */
  pantheonPerGod: number
  /** Vengeance: +this per life Olympus has lost this run (0 = inactive). */
  vengeancePerLife: number
  /** Blessed Grove: ×reach of every Sacred Site's buff radius (1 = unchanged). */
  siteRadiusMul: number
  // ── M11 Fate Bargain CURSES (enemy buffs, read at spawn / on kill; 1 = no curse) ──
  /** Every enemy's HP ×this. */
  enemyHpMul: number
  /** Every enemy's walk speed ×this. */
  enemySpeedMul: number
  /** A boss kill pays bounty ×this (a Bargain REWARD, but rides the same layer). */
  bossBountyMul: number
}

// SpawnDesc moved to core/entities/enemy.ts (it's enemy-shaped, and onDeath returns it).
