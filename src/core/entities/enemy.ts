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
}

let nextId = 1

export function createEnemy(kind: EnemyKind = 'shade'): Enemy {
  return { id: `e${nextId++}`, kind, pathT: 0, speed: 60, hp: 5, maxHp: 5 }
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
