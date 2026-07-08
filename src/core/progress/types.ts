// ── src/core/progress ── PURE meta-progression model.
// No phaser / react / zustand / supabase imports (enforced by tests/core-purity.test.ts).

export const PROGRESS_SCHEMA_VERSION = 2

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
  /** Reserved audio slot — audio is off the roadmap, so nothing reads this yet (kept for merge/migrate). */
  muted: boolean
  /** Speed a run STARTS at — 1× (normal) or 3× (fast). Replaces startGame's hardcoded 1×. */
  defaultSpeed: 1 | 3
  /** Force-cut camera shake/flash regardless of the OS prefers-reduced-motion setting (ORs with it). */
  reducedMotion: boolean
  /** Reserved for a future colorblind pass — a real one recolors the SPRITE/enemy palette (identity is
   *  carried by silhouette + Phaser hexes, not CSS), so it's its own task; no UI reads this yet. */
  colorblind: boolean
}

export interface PlayerStats {
  runsPlayed: number
  bestWave: number
  totalKills: number
  /** Lifetime bosses slain (M6). */
  bossesKilled: number
  /** Lifetime gold spent on towers + upgrades. */
  totalGoldSpent: number
  /** Lifetime tower placements. */
  totalTowersBuilt: number
}

/** Run summary handed in when a run ends. The M6 stat terms are optional (older callers omit them). */
export interface RunResult {
  waveReached: number
  victory: boolean
  kills: number
  bossesKilled?: number
  goldSpent?: number
  goldEarned?: number
  towersBuilt?: number
  /** The wave on which the most lives were lost (for the end-of-run "bloodiest wave"). */
  worstWave?: number
  worstWaveLives?: number
}

/** Run-start buffs the engine reads. Derived from unlocked nodes; NEVER persisted. */
export interface Modifiers {
  startingGold: number
  startingLives: number
  towerDamageMul: number
  // ── M6.5 Pantheon additions ──
  fireRateMul: number
  /** Bonus damage vs bosses (applied at hit-time). */
  bossDamageMul: number
  /** Multiplier on per-wave income. */
  incomeMul: number
  /** Extra gold per kill. */
  goldPerKillAdd: number
  /** Gate-shield charges the run starts with. */
  startingShield: number
  /** Start each run with a Second Wind armed. */
  secondWindStart: boolean
  /** Extra options shown in each Fate Draft. */
  draftBonusOptions: number
}

// ── Skill tree (placeholder content for M0.5; full tree + prereqs/tiers land in M6.5) ──
export type SkillBranch = 'war' | 'harvest' | 'wisdom'

export type NodeEffect =
  | { kind: 'startingGoldAdd'; value: number }
  | { kind: 'startingLivesAdd'; value: number }
  | { kind: 'towerDamageMul'; value: number }
  // ── M6.5 ──
  | { kind: 'fireRateMul'; value: number }
  | { kind: 'bossDamageMul'; value: number }
  | { kind: 'incomeMul'; value: number }
  | { kind: 'goldPerKillAdd'; value: number }
  | { kind: 'startingShieldAdd'; value: number }
  | { kind: 'draftOptionsAdd'; value: number }
  | { kind: 'secondWindStart' }

/** A Pantheon Tree node. */
export interface SkillNode {
  id: string
  branch: SkillBranch
  name: string
  description: string
  cost: number
  effect: NodeEffect
  /** Node ids that must be unlocked before this one (M6.5). */
  prerequisites?: string[]
  /** Row within the branch column, for the tree UI layout (1-based). */
  tier?: number
}
