// ── src/core/progress ── PURE meta-progression model.
// No phaser / react / zustand / supabase imports (enforced by tests/core-purity.test.ts).

export const PROGRESS_SCHEMA_VERSION = 1

/**
 * The lifetime account save. Mirrors the `player_progress` DB row — GAMEPLAY ONLY.
 * Identity (display name, guest flag) lives in the auth/profiles layer, NOT here,
 * so there's a single source of truth for "what is my name."
 */
export interface PlayerProgress {
  schemaVersion: number
  /** Lifetime meta-XP, monotonic. Drives the account level. */
  favor: number
  /** Ids of purchased Pantheon Tree nodes (the jsonb column). */
  unlockedNodes: string[]
  settings: PlayerSettings
  stats: PlayerStats
  /** ISO8601, CLIENT-set — the single-clock tiebreaker for mergeProgress. */
  updatedAt: string
}

export interface PlayerSettings {
  muted: boolean
}

export interface PlayerStats {
  runsPlayed: number
  bestWave: number
  totalKills: number
}

/** Lean run summary handed in when a run ends. Boss/god-variety terms arrive with those systems. */
export interface RunResult {
  waveReached: number
  victory: boolean
  kills: number
}

/** Run-start buffs the engine reads. Derived from unlocked nodes; NEVER persisted. */
export interface Modifiers {
  startingGold: number
  startingLives: number
  towerDamageMul: number
}

// ── Skill tree (placeholder content for M0.5; full tree + prereqs/tiers land in M6.5) ──
export type SkillBranch = 'war' | 'harvest' | 'wisdom'

export type NodeEffect =
  | { kind: 'startingGoldAdd'; value: number }
  | { kind: 'startingLivesAdd'; value: number }
  | { kind: 'towerDamageMul'; value: number }

/** A Pantheon Tree node. (prerequisites/tier graph come with the tree UI in M6.5.) */
export interface SkillNode {
  id: string
  branch: SkillBranch
  name: string
  description: string
  cost: number
  effect: NodeEffect
}
