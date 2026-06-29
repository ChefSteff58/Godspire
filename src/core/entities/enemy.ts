// Pure enemy model + the M4 roster. Five data-driven kinds, each with ONE crisp trait → counter:
// shade (swarm), skeleton (baseline), harpy (FLYING → Apollo only), talos (ARMOR → big hits),
// hydra (SPLITS → pierce/AoE). Gorgon-kin (stealth) / Satyr (fast) / Cyclops (tanky) are deferred
// until their counter-gods (detection / slow) exist.

export type EnemyKind = 'shade' | 'skeleton' | 'harpy' | 'talos' | 'hydra' | 'satyr'

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
}

/** Per-kind identity color (the damage-state ramp darkens within a kind, so hue = kind). */
export const ENEMY_BASE_COLOR: Record<EnemyKind, number> = {
  shade: 0x9d6bd6,
  skeleton: 0xe8e4d8,
  harpy: 0x5fd0e0,
  talos: 0x8a8f9c,
  hydra: 0x7ac74f,
  satyr: 0xc9e265,
}

/** Per-kind base radius (px) — the glance cue + the collision/HP-ring size. */
export const ENEMY_RADIUS: Record<EnemyKind, number> = {
  shade: 7,
  skeleton: 10,
  harpy: 9,
  talos: 15,
  hydra: 12,
  satyr: 8,
}

/** Per-kind sprite stroke (a metallic ring reads as armor, a bright ring as airborne). */
export const ENEMY_STROKE: Record<EnemyKind, number> = {
  shade: 0xc9a8ee,
  skeleton: 0xb8b0a0,
  harpy: 0xffffff,
  talos: 0x3a3d44,
  hydra: 0x3f7a2a,
  satyr: 0x8fae3a,
}

/** Intrinsic traits per kind (the wave manager scales hp/speed/bounty; these stay fixed). */
const ENEMY_TRAITS: Record<EnemyKind, { flying: boolean; armor: number }> = {
  shade: { flying: false, armor: 0 },
  skeleton: { flying: false, armor: 0 },
  harpy: { flying: true, armor: 0 },
  talos: { flying: false, armor: 6 },
  hydra: { flying: false, armor: 0 },
  satyr: { flying: false, armor: 0 },
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
  }
}

/**
 * Advance an enemy along the path by `dtSeconds` (scaled by any active slow). Mutates `pathT`.
 * Returns true if it reached the end (leaked into Olympus) this step.
 */
export function advanceEnemy(enemy: Enemy, dtSeconds: number, pathLength: number): boolean {
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

/** Apply a slow (the strongest active one wins) and refresh its duration. */
export function applySlow(enemy: Enemy, mul: number, durationMs: number): void {
  enemy.slowMul = Math.min(enemy.slowMul, mul)
  enemy.slowTimerMs = Math.max(enemy.slowTimerMs, durationMs)
}

/**
 * Apply damage, reduced by flat armor. Mutates hp. Returns true if the enemy died (hp ≤ 0).
 * The `max(1, …)` floor guarantees armored enemies are never literally unkillable, while big
 * single hits (Zeus Tyrant) shrug off armor and rapid weak shots crater against it.
 */
export function damageEnemy(enemy: Enemy, amount: number): boolean {
  const dealt = Math.max(1, amount - enemy.armor)
  enemy.hp -= dealt
  return enemy.hp <= 0
}

/** How many times a Hydra lineage may split (1 root → 2 → 4, then stop = 7 bodies total). */
export const SPLIT_DEPTH_CAP = 2

/** What an enemy leaves behind when it dies. Hydra → 2 smaller children at the death point. Pure. */
export function onDeath(enemy: Enemy): SpawnDesc[] {
  if (enemy.kind !== 'hydra' || enemy.splitDepth >= SPLIT_DEPTH_CAP) return []
  const childHp = Math.max(1, Math.round(enemy.maxHp * 0.45))
  const child = (): SpawnDesc => ({
    kind: 'hydra',
    hp: childHp,
    speed: enemy.speed * 1.15,
    bounty: Math.max(1, Math.round(enemy.bounty * 0.4)),
    leakWeight: enemy.leakWeight,
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
