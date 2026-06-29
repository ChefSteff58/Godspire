import type { Vec2 } from '../types'
import type { Enemy } from '../entities/enemy'

export type TargetingMode = 'first' | 'last' | 'closest' | 'strongest'

interface Targeter {
  pos: Vec2
  range: number
  /** If `false`, the tower cannot acquire FLYING enemies. Undefined = can hit anything. */
  canHitAir?: boolean
}

function dist2(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

/**
 * Pick a target for a tower among the enemies within its range. Pure: positions are resolved
 * by the caller's `posOf` (so this never needs Phaser or the path). Returns null if none in range.
 *  - first    : furthest along the path (closest to Olympus) — the BTD6 default
 *  - last     : least far along
 *  - closest  : nearest to the tower
 *  - strongest: most hp
 */
export function selectTarget(
  tower: Targeter,
  enemies: readonly Enemy[],
  posOf: (e: Enemy) => Vec2,
  mode: TargetingMode = 'first',
): Enemy | null {
  const r2 = tower.range * tower.range
  let best: Enemy | null = null
  let bestKey = 0
  for (const e of enemies) {
    // ground-only towers can't acquire fliers (=== false so an unspecified caller can hit anything)
    if (e.flying && tower.canHitAir === false) continue
    const d2 = dist2(tower.pos, posOf(e))
    if (d2 > r2) continue
    const key =
      mode === 'first' ? e.pathT : mode === 'last' ? -e.pathT : mode === 'strongest' ? e.hp : -d2
    if (best === null || key > bestKey) {
      best = e
      bestKey = key
    }
  }
  return best
}
