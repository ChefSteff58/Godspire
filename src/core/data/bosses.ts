// ── src/core/data ── the boss roster. Pure data + pure helpers (no phaser/react/zustand,
// and NO imports from enemy.ts / waveManager.ts — this is a leaf module they both read).
//
// A boss headlines every 20th wave (first at wave 20), cycling the roster and growing stronger
// each recurrence. Each boss is ONE distinct BTD6-style mechanic mapped to an engine primitive:
//   Nemean Lion — a per-hit DAMAGE CAP (burst can't one-shot it → reward sustained DPS)
//   Minotaur    — CHARGE + CC-RESIST (slow weakened, knockback immune → you can't just lock it)
//   Cyclops     — a brute that bursts into ADDS on death (reuses the Hydra split pipeline)

export type BossId = 'nemean' | 'minotaur' | 'cyclops'

export interface BossMechanic {
  /** Nemean: no single hit may exceed this (applied BEFORE armor, so it's never unkillable). */
  damageCap?: number
  /** Flat armor granted on spawn (on top of the cap). */
  armorBonus?: number
  /** Minotaur: fraction of a slow's strength RESISTED — 1 = immune, 0 = full slow (0.5 = halved). */
  slowResist?: number
  /** Minotaur: ignores Poseidon knockback. */
  knockbackImmune?: boolean
  /** Minotaur: a periodic speed burst. */
  charge?: { periodMs: number; burstMul: number; durationMs: number }
  /** Cyclops: bursts into this many small adds on death. */
  onDeathAdds?: number
}

export interface BossArchetype {
  id: BossId
  name: string
  color: number
  stroke: number
  radius: number
  /** Multipliers on the wave's base HP / speed curve. */
  hpMul: number
  speedMul: number
  /** Base reward + per-leak cost (leakWeight does NOT scale — only HP/cap/bounty do). */
  bounty: number
  leakWeight: number
  telegraph: string
  mechanic: BossMechanic
}

// The roster grows one boss per M6 stage. Cadence cycles through it in order.
export const BOSS_ROSTER: readonly BossArchetype[] = [
  {
    id: 'nemean',
    name: 'Nemean Lion',
    color: 0xd9a441,
    stroke: 0xfff1c0,
    radius: 26,
    // 20 → 32 after the 2026-07-01 playtest ("still getting shredded") — his damage cap alone wasn't
    // holding against a wave-20 multi-tower board. Cap tightened 60 → 45 for the same reason: the
    // anti-burst identity has to bite. Full boss re-tune deferred until after the art pass.
    hpMul: 32,
    speedMul: 0.8,
    bounty: 120,
    leakWeight: 16,
    telegraph: 'The Nemean Lion prowls — its hide turns aside any single blow. Wear it down!',
    mechanic: { damageCap: 45, armorBonus: 4 },
  },
  {
    id: 'minotaur',
    name: 'Minotaur',
    color: 0x9c3b2e,
    stroke: 0xffb59c,
    radius: 26,
    hpMul: 18,
    speedMul: 0.85,
    bounty: 140,
    leakWeight: 18,
    telegraph: 'The Minotaur charges — slow and knockback wash off it. Out-damage it!',
    mechanic: { slowResist: 0.5, knockbackImmune: true, charge: { periodMs: 4500, burstMul: 2.4, durationMs: 1200 } },
  },
  {
    id: 'cyclops',
    name: 'Cyclops',
    color: 0x6b6f8a,
    stroke: 0xd6d9f0,
    radius: 30,
    hpMul: 20,
    speedMul: 0.65,
    bounty: 170,
    leakWeight: 22,
    telegraph: 'The Cyclops lumbers in — colossal, and it shatters into spawn when it falls.',
    mechanic: { onDeathAdds: 4 },
  },
]

const BOSS_PERIOD = 20 // a boss every 20 waves

/** Which boss (if any) headlines wave `n` — every 20th wave, cycling the roster. Pure. */
export function bossForWave(n: number): BossArchetype | null {
  const w = Math.floor(n)
  if (w <= 0 || w % BOSS_PERIOD !== 0) return null
  return BOSS_ROSTER[bossOccurrence(w) % BOSS_ROSTER.length]
}

/** 0-based index of how many bosses have appeared through wave `n` (0 at wave 20). Pure. */
export function bossOccurrence(n: number): number {
  return Math.max(0, Math.floor(n) / BOSS_PERIOD - 1)
}

export function bossById(id: BossId): BossArchetype {
  return BOSS_ROSTER.find((b) => b.id === id)!
}

/** The concrete spawn stats for a boss at a given occurrence — each recurrence is stronger. */
export interface BossSpawnStats {
  hp: number
  speed: number
  bounty: number
  leakWeight: number
  damageCap?: number
  armor?: number
}

/**
 * Scale a boss against the wave's base hp/speed (passed in to avoid a waveManager import cycle).
 * HP / damageCap / bounty grow with the occurrence so a recurring boss stays a real check; the
 * gentle ×1.05 wave curve alone wouldn't escalate them enough. leakWeight stays fixed (so a late
 * boss leak never one-shots a full life bar).
 */
export function bossScaledStats(
  boss: BossArchetype,
  occurrence: number,
  baseHp: number,
  baseSpeed: number,
): BossSpawnStats {
  const occ = Math.max(0, occurrence)
  // M6 Stage 4 softened this to 0.4 after a beatability sim, but the M8 Stage 3 pixel-review pass
  // found bosses far too easy against a gold-bought board and restored 0.6 alongside the
  // hpMul 20/18/20 bump. Verified vs late-boss DPS at waves 60/80.
  const hpScale = 1 + 0.6 * occ
  const capScale = 1 + 0.25 * occ
  const bountyScale = 1 + 0.3 * occ
  return {
    hp: Math.round(baseHp * boss.hpMul * hpScale),
    speed: Math.max(1, Math.round(baseSpeed * boss.speedMul)),
    bounty: Math.round(boss.bounty * bountyScale),
    leakWeight: boss.leakWeight,
    damageCap: boss.mechanic.damageCap !== undefined ? Math.round(boss.mechanic.damageCap * capScale) : undefined,
    armor: boss.mechanic.armorBonus,
  }
}
