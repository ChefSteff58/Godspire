// Pure enemy model + the M4 roster. Five data-driven kinds, each with ONE crisp trait → counter:
// shade (swarm), skeleton (baseline), harpy (FLYING → Apollo only), talos (ARMOR → big hits),
// hydra (SPLITS → pierce/AoE). Gorgon-kin (stealth) / Satyr (fast) / Cyclops (tanky) are deferred
// until their counter-gods (detection / slow) exist.

import { bossById, type BossId } from '../data/bosses'

export type EnemyKind = 'shade' | 'skeleton' | 'harpy' | 'talos' | 'hydra' | 'satyr' | 'gorgon' | 'boss'

export interface Enemy {
  id: string
  kind: EnemyKind
  /** Progress along the path, 0 (Tartarus) → 1 (Olympus). */
  pathT: number
  /** Movement speed in px/sec along the path. */
  speed: number
  hp: number
  maxHp: number
  /** Gold awarded on death. */
  bounty: number
  /** Lives Olympus loses if this enemy leaks. */
  leakWeight: number
  /** Airborne — only towers with `canHitAir` can target it. */
  flying: boolean
  /** Flat damage reduction per hit (Talos). */
  armor: number
  /** How many times this lineage has already split (Hydra). */
  splitDepth: number
  /** Speed multiplier from a slow effect (1 = normal; Aphrodite drops it). */
  slowMul: number
  /** Milliseconds left on the current slow (it lifts to 1 when this hits 0). */
  slowTimerMs: number
  /** Hidden — single-target towers can't target it unless a detector (Athena) is near. */
  stealth: boolean
  /** Set on boss enemies — selects the archetype in BOSS_ROSTER for visuals + mechanics. */
  bossId?: BossId
  /** Nemean: no single hit may exceed this (applied before armor in damageEnemy). */
  damageCap?: number
  /** Minotaur: fraction of a slow's strength resisted (1 = immune, 0/undefined = full slow). */
  slowResist?: number
  /** Minotaur: ignores Poseidon knockback. */
  knockbackImmune?: boolean
  /** Minotaur: periodic speed-burst params (set at spawn from the roster). */
  charge?: { periodMs: number; burstMul: number; durationMs: number }
  /** Charge runtime state: ms to the next burst, ms left in the current burst, the un-charged speed. */
  chargeTimerMs?: number
  chargeActiveMs?: number
  baseSpeed?: number
}

/** What to spawn. The scene creates the Enemy (traits derived from kind) + overrides these. */
export interface SpawnDesc {
  kind: EnemyKind
  hp: number
  speed: number
  bounty: number
  leakWeight: number
  /** Hydra children carry their lineage depth + birth point (mid-path). */
  splitDepth?: number
  spawnAtT?: number
  /** Boss spawns carry their archetype + mechanic overrides. */
  bossId?: BossId
  damageCap?: number
  armor?: number
}

/** Per-kind identity color (the damage-state ramp darkens within a kind, so hue = kind). */
export const ENEMY_BASE_COLOR: Record<EnemyKind, number> = {
  shade: 0x9d6bd6,
  skeleton: 0xe8e4d8,
  harpy: 0x5fd0e0,
  talos: 0x8a8f9c,
  hydra: 0x7ac74f,
  satyr: 0xc9e265,
  gorgon: 0x6a8a6a,
  boss: 0xd9a441, // fallback — the real color comes from BOSS_ROSTER (see enemyColor)
}

/** Per-kind base radius (px) — the glance cue + the collision/HP-ring size. */
export const ENEMY_RADIUS: Record<EnemyKind, number> = {
  shade: 7,
  skeleton: 10,
  harpy: 9,
  talos: 15,
  hydra: 12,
  satyr: 8,
  gorgon: 11,
  boss: 26, // fallback — the real radius comes from BOSS_ROSTER (see enemyRadius)
}

/** Per-kind sprite stroke (a metallic ring reads as armor, a bright ring as airborne). */
export const ENEMY_STROKE: Record<EnemyKind, number> = {
  shade: 0xc9a8ee,
  skeleton: 0xb8b0a0,
  harpy: 0xffffff,
  talos: 0x3a3d44,
  hydra: 0x3f7a2a,
  satyr: 0x8fae3a,
  gorgon: 0x9fd09f,
  boss: 0xfff1c0, // fallback — the real stroke comes from BOSS_ROSTER (see enemyStroke)
}

/** Intrinsic traits per kind (the wave manager scales hp/speed/bounty; these stay fixed). */
const ENEMY_TRAITS: Record<EnemyKind, { flying: boolean; armor: number; stealth: boolean }> = {
  shade: { flying: false, armor: 0, stealth: false },
  skeleton: { flying: false, armor: 0, stealth: false },
  harpy: { flying: true, armor: 0, stealth: false },
  talos: { flying: false, armor: 6, stealth: false },
  hydra: { flying: false, armor: 0, stealth: false },
  satyr: { flying: false, armor: 0, stealth: false },
  gorgon: { flying: false, armor: 0, stealth: true },
  boss: { flying: false, armor: 0, stealth: false }, // boss armor comes from its mechanic (set at spawn)
}

/** A boss reads its visuals from BOSS_ROSTER; everything else from the per-kind records. */
export function enemyRadius(e: Enemy): number {
  return e.kind === 'boss' && e.bossId ? bossById(e.bossId).radius : ENEMY_RADIUS[e.kind]
}
export function enemyColor(e: Enemy): number {
  return e.kind === 'boss' && e.bossId ? bossById(e.bossId).color : ENEMY_BASE_COLOR[e.kind]
}
export function enemyStroke(e: Enemy): number {
  return e.kind === 'boss' && e.bossId ? bossById(e.bossId).stroke : ENEMY_STROKE[e.kind]
}

let nextId = 1

export function createEnemy(kind: EnemyKind = 'shade'): Enemy {
  // Base stats; the wave manager mutates hp/speed/bounty/leakWeight per wave. Traits derive from kind.
  const t = ENEMY_TRAITS[kind]
  return {
    id: `e${nextId++}`,
    kind,
    pathT: 0,
    speed: 60,
    hp: 10,
    maxHp: 10,
    bounty: 4,
    leakWeight: 1,
    flying: t.flying,
    armor: t.armor,
    splitDepth: 0,
    slowMul: 1,
    slowTimerMs: 0,
    stealth: t.stealth,
  }
}

/**
 * Advance an enemy along the path by `dtSeconds` (scaled by any active slow). Mutates `pathT`.
 * Returns true if it reached the end (leaked into Olympus) this step.
 */
export function advanceEnemy(enemy: Enemy, dtSeconds: number, pathLength: number): boolean {
  tickCharge(enemy, dtSeconds) // Minotaur speed bursts (mutates enemy.speed)
  if (enemy.slowTimerMs > 0) {
    enemy.slowTimerMs -= dtSeconds * 1000
    if (enemy.slowTimerMs <= 0) enemy.slowMul = 1 // slow lifts
  }
  enemy.pathT += (enemy.speed * enemy.slowMul * dtSeconds) / pathLength
  if (enemy.pathT >= 1) {
    enemy.pathT = 1
    return true
  }
  return false
}

/** Minotaur charge: every `periodMs`, sprint at `burstMul` for `durationMs`, then settle to base. */
function tickCharge(enemy: Enemy, dtSeconds: number): void {
  if (!enemy.charge || enemy.baseSpeed === undefined) return
  const dtMs = dtSeconds * 1000
  if (enemy.chargeActiveMs && enemy.chargeActiveMs > 0) {
    enemy.chargeActiveMs -= dtMs
    if (enemy.chargeActiveMs <= 0) enemy.speed = enemy.baseSpeed // burst over
    return
  }
  enemy.chargeTimerMs = (enemy.chargeTimerMs ?? enemy.charge.periodMs) - dtMs
  if (enemy.chargeTimerMs <= 0) {
    enemy.chargeActiveMs = enemy.charge.durationMs
    enemy.chargeTimerMs = enemy.charge.periodMs
    enemy.speed = enemy.baseSpeed * enemy.charge.burstMul // CHARGE!
  }
}

/** Apply a slow (the strongest active one wins), weakened by the enemy's slowResist. */
export function applySlow(enemy: Enemy, mul: number, durationMs: number): void {
  const resist = enemy.slowResist ?? 0 // 0 = no resistance (full slow), 1 = immune
  // no-resist fast path keeps normal enemies EXACT (the blend below would add float drift)
  const eff = resist === 0 ? mul : 1 - (1 - mul) * (1 - resist)
  if (eff < enemy.slowMul) {
    // stronger slow takes over on its OWN duration (not an extension of a weaker one's)
    enemy.slowMul = eff
    enemy.slowTimerMs = durationMs
  } else if (eff === enemy.slowMul) {
    // equal strength refreshes the timer
    enemy.slowTimerMs = Math.max(enemy.slowTimerMs, durationMs)
  }
  // A WEAKER slow never refreshes a stronger slow's timer — otherwise a weak aura's per-frame
  // re-apply would hold one brief deep slow forever. When the strong slow expires, the weak
  // aura re-applies within one refresh tick, giving true strongest-ACTIVE-wins semantics.
}

/**
 * Apply damage, reduced by flat armor. Mutates hp. Returns true if the enemy died (hp ≤ 0).
 * The `max(1, …)` floor guarantees armored enemies are never literally unkillable, while big
 * single hits (Zeus Tyrant) shrug off armor and rapid weak shots crater against it.
 */
export function damageEnemy(enemy: Enemy, amount: number): boolean {
  // A boss damage cap (Nemean) clamps the INCOMING hit first, THEN armor subtracts, THEN the
  // min-1 floor — so one huge bolt can't one-shot it, but it's still never literally unkillable.
  const capped = enemy.damageCap !== undefined ? Math.min(amount, enemy.damageCap) : amount
  const dealt = Math.max(1, capped - enemy.armor)
  enemy.hp -= dealt
  return enemy.hp <= 0
}

/** How many times a Hydra lineage may split (1 root → 2 → 4, then stop = 7 bodies total). */
export const SPLIT_DEPTH_CAP = 2

/** What an enemy leaves behind when it dies. Hydra → 2 children; Cyclops → a burst of adds. Pure. */
export function onDeath(enemy: Enemy): SpawnDesc[] {
  // Cyclops: shatter into a handful of wave-appropriate adds at the death point (reuses this same
  // SpawnDesc pipeline as Hydra — killEnemy spawns them BEFORE settle, so the clear-gate holds).
  if (enemy.kind === 'boss' && enemy.bossId) {
    const adds = bossById(enemy.bossId).mechanic.onDeathAdds
    if (!adds) return []
    const addHp = Math.max(1, Math.round(enemy.maxHp * 0.04))
    return Array.from({ length: adds }, (): SpawnDesc => ({
      kind: 'skeleton',
      hp: addHp,
      speed: 70,
      bounty: 4,
      leakWeight: 2,
      spawnAtT: enemy.pathT,
    }))
  }
  if (enemy.kind !== 'hydra' || enemy.splitDepth >= SPLIT_DEPTH_CAP) return []
  const childHp = Math.max(1, Math.round(enemy.maxHp * 0.45))
  const child = (): SpawnDesc => ({
    kind: 'hydra',
    hp: childHp,
    speed: enemy.speed * 1.15,
    bounty: Math.max(1, Math.round(enemy.bounty * 0.4)),
    leakWeight: Math.max(1, Math.round(enemy.leakWeight * 0.5)), // weaker bodies cost fewer lives
    splitDepth: enemy.splitDepth + 1,
    spawnAtT: enemy.pathT,
  })
  return [child(), child()]
}

// ── damage-state visuals (pure) — the enemy darkens + shrinks as it loses HP,
//    keeping its kind identity while reading damage at a glance (Bloons-ish) ──

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

/** Multiply each RGB channel of a 0xRRGGBB color by k. */
export function scaleColor(hex: number, k: number): number {
  const r = Math.round(((hex >> 16) & 0xff) * k)
  const g = Math.round(((hex >> 8) & 0xff) * k)
  const b = Math.round((hex & 0xff) * k)
  return (r << 16) | (g << 8) | b
}

/** Darkened color for an enemy at HP fraction `frac` (1 = full → base color, 0 = ~black). */
export function damagedColor(base: number, frac: number): number {
  return scaleColor(base, 0.35 + 0.65 * clamp01(frac))
}

/** Shrunken radius for an enemy at HP fraction `frac`. */
export function damagedRadius(baseRadius: number, frac: number): number {
  return baseRadius * (0.6 + 0.4 * clamp01(frac))
}
