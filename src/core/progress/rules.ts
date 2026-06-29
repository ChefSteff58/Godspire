import type { PlayerProgress, RunResult, Modifiers, SkillNode } from './types'
import { PROGRESS_SCHEMA_VERSION } from './types'
import { PANTHEON_NODES } from './skillTree'

const EPOCH = '1970-01-01T00:00:00.000Z'

// Favor reward constants (first-pass, tunable).
const FAVOR_PER_WAVE = 10
const FAVOR_WIN_BONUS = 200
const FAVOR_PER_KILL = 1
const FAVOR_PER_BOSS = 50 // slaying a boss is a milestone

// Level curve constants. xpForLevel(level) = BASE_XP*(level-1) + GROWTH*(level-1)^2.
const BASE_XP = 100
const GROWTH = 25

/** A fresh, empty save. `now` defaults to the epoch so any real save beats it in a merge. */
export function emptyProgress(now: string = EPOCH): PlayerProgress {
  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    favor: 0,
    unlockedNodes: [],
    settings: { muted: false },
    stats: { runsPlayed: 0, bestWave: 0, totalKills: 0, bossesKilled: 0, totalGoldSpent: 0, totalTowersBuilt: 0 },
    updatedAt: now,
  }
}

/** Cumulative Favor required to have REACHED `level`. Level 1 = 0. */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level)) - 1
  return BASE_XP * l + GROWTH * l * l
}

/** Highest level fully paid for by `favor`. */
export function levelForFavor(favor: number): number {
  let level = 1
  while (xpForLevel(level + 1) <= favor) level++
  return level
}

/** Total skill points granted by level — 1 per level after the first. */
export function totalPoints(favor: number): number {
  return levelForFavor(favor) - 1
}

/** Points already spent on the given unlocked nodes. */
export function spentPoints(
  unlockedNodes: string[],
  nodes: readonly SkillNode[] = PANTHEON_NODES,
): number {
  return unlockedNodes.reduce((sum, id) => sum + (nodes.find((n) => n.id === id)?.cost ?? 0), 0)
}

/** Unspent skill points available right now (DERIVED, never stored). */
export function availablePoints(
  progress: PlayerProgress,
  nodes: readonly SkillNode[] = PANTHEON_NODES,
): number {
  return totalPoints(progress.favor) - spentPoints(progress.unlockedNodes, nodes)
}

export function favorFromRun(run: RunResult): number {
  return (
    FAVOR_PER_WAVE * Math.max(0, Math.floor(run.waveReached)) +
    (run.victory ? FAVOR_WIN_BONUS : 0) +
    FAVOR_PER_KILL * Math.max(0, Math.floor(run.kills)) +
    FAVOR_PER_BOSS * Math.max(0, Math.floor(run.bossesKilled ?? 0))
  )
}

/** Apply a finished run. Returns a NEW progress object (input untouched) + a summary. */
export function applyRunRewards(
  prev: PlayerProgress,
  run: RunResult,
  now: string,
): { progress: PlayerProgress; favorGained: number; levelsGained: number } {
  const favorGained = favorFromRun(run)
  const beforeLevel = levelForFavor(prev.favor)
  const favor = prev.favor + favorGained
  const afterLevel = levelForFavor(favor)
  const progress: PlayerProgress = {
    ...prev,
    favor,
    stats: {
      runsPlayed: prev.stats.runsPlayed + 1,
      bestWave: Math.max(prev.stats.bestWave, Math.max(0, Math.floor(run.waveReached))),
      totalKills: prev.stats.totalKills + Math.max(0, Math.floor(run.kills)),
      bossesKilled: prev.stats.bossesKilled + Math.max(0, Math.floor(run.bossesKilled ?? 0)),
      totalGoldSpent: prev.stats.totalGoldSpent + Math.max(0, Math.floor(run.goldSpent ?? 0)),
      totalTowersBuilt: prev.stats.totalTowersBuilt + Math.max(0, Math.floor(run.towersBuilt ?? 0)),
    },
    updatedAt: now,
  }
  return { progress, favorGained, levelsGained: afterLevel - beforeLevel }
}

export const BASE_MODIFIERS: Modifiers = {
  startingGold: 650,
  startingLives: 100,
  towerDamageMul: 1,
}

/** Fold unlocked nodes into run-start modifiers. Unknown ids are ignored (never throws). */
export function deriveModifiers(
  unlockedNodes: string[],
  nodes: readonly SkillNode[] = PANTHEON_NODES,
): Modifiers {
  const mods: Modifiers = { ...BASE_MODIFIERS }
  for (const id of unlockedNodes) {
    const node = nodes.find((n) => n.id === id)
    if (!node) continue
    const e = node.effect
    if (e.kind === 'startingGoldAdd') mods.startingGold += e.value
    else if (e.kind === 'startingLivesAdd') mods.startingLives += e.value
    else if (e.kind === 'towerDamageMul') mods.towerDamageMul *= e.value
  }
  return mods
}

/**
 * Merge a local + cloud save. Last-writer-wins by single-clock `updatedAt`; `favor` and
 * `stats` are monotonic-max; `unlockedNodes` is taken WHOLE from the newer side (NEVER
 * unioned — a union would resurrect spent points). `level` is derived from favor, never merged.
 */
export function mergeProgress(
  local: PlayerProgress | null,
  cloud: PlayerProgress | null,
): PlayerProgress {
  if (!local && !cloud) return emptyProgress()
  if (!local) return cloud as PlayerProgress
  if (!cloud) return local
  const newer = local.updatedAt >= cloud.updatedAt ? local : cloud
  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    favor: Math.max(local.favor, cloud.favor),
    unlockedNodes: [...newer.unlockedNodes],
    settings: { ...newer.settings },
    stats: {
      runsPlayed: Math.max(local.stats.runsPlayed, cloud.stats.runsPlayed),
      bestWave: Math.max(local.stats.bestWave, cloud.stats.bestWave),
      totalKills: Math.max(local.stats.totalKills, cloud.stats.totalKills),
      bossesKilled: Math.max(local.stats.bossesKilled, cloud.stats.bossesKilled),
      totalGoldSpent: Math.max(local.stats.totalGoldSpent, cloud.stats.totalGoldSpent),
      totalTowersBuilt: Math.max(local.stats.totalTowersBuilt, cloud.stats.totalTowersBuilt),
    },
    updatedAt: newer.updatedAt,
  }
}

/** Coerce arbitrary / partial / corrupt input into a valid PlayerProgress. NEVER throws. */
export function migrateProgress(raw: unknown): PlayerProgress {
  try {
    if (!raw || typeof raw !== 'object') return emptyProgress()
    const r = raw as Record<string, unknown>
    const base = emptyProgress()
    const num = (v: unknown, d: number) =>
      typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d
    const stats = (r.stats ?? {}) as Record<string, unknown>
    const settings = (r.settings ?? {}) as Record<string, unknown>
    return {
      schemaVersion: PROGRESS_SCHEMA_VERSION,
      favor: num(r.favor, 0),
      unlockedNodes: Array.isArray(r.unlockedNodes)
        ? r.unlockedNodes.filter((x): x is string => typeof x === 'string')
        : [],
      settings: { muted: typeof settings.muted === 'boolean' ? settings.muted : false },
      stats: {
        runsPlayed: num(stats.runsPlayed, 0),
        bestWave: num(stats.bestWave, 0),
        totalKills: num(stats.totalKills, 0),
        bossesKilled: num(stats.bossesKilled, 0), // absent in old saves → 0
        totalGoldSpent: num(stats.totalGoldSpent, 0),
        totalTowersBuilt: num(stats.totalTowersBuilt, 0),
      },
      updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : base.updatedAt,
    }
  } catch {
    return emptyProgress()
  }
}
