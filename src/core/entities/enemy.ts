// Pure enemy model. M1 has only the "shade" placeholder; the full roster + traits arrive in M4.

export type EnemyKind = 'shade'

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
}

/** Each enemy kind's identity color + base radius (placeholder art). */
export const ENEMY_BASE_COLOR: Record<EnemyKind, number> = { shade: 0x9d6bd6 }
export const ENEMY_BASE_RADIUS = 10

let nextId = 1

export function createEnemy(kind: EnemyKind = 'shade'): Enemy {
  // Base stats; the wave manager mutates hp/speed/bounty per wave (we never re-signature this fn).
  return { id: `e${nextId++}`, kind, pathT: 0, speed: 60, hp: 10, maxHp: 10, bounty: 4, leakWeight: 1 }
}

/**
 * Advance an enemy along the path by `dtSeconds`. Mutates `pathT`.
 * Returns true if it reached the end (leaked into Olympus) this step.
 */
export function advanceEnemy(enemy: Enemy, dtSeconds: number, pathLength: number): boolean {
  enemy.pathT += (enemy.speed * dtSeconds) / pathLength
  if (enemy.pathT >= 1) {
    enemy.pathT = 1
    return true
  }
  return false
}

/** Apply damage. Mutates hp. Returns true if the enemy died (hp ≤ 0). */
export function damageEnemy(enemy: Enemy, amount: number): boolean {
  enemy.hp -= amount
  return enemy.hp <= 0
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
