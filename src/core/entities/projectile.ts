import type { Vec2 } from '../types'

/** A traveling projectile (Apollo's arrow). Flies straight in a fixed direction and pierces. */
export interface Projectile {
  id: string
  pos: Vec2
  vx: number // px/sec
  vy: number
  damage: number
  /** Remaining enemies it can still pass through (0 = hits one more then expires). */
  pierceLeft: number
  /** Ids already hit, so one projectile never double-hits the same enemy. */
  hitIds: string[]
  /** Seconds of life left before it expires. */
  life: number
  /** Whether this projectile may strike FLYING enemies (set from the firing tower). */
  canHitAir: boolean
}

let nextId = 1

/** Create a projectile from `from`, aimed along `dir` (need not be normalized). */
export function createProjectile(
  from: Vec2,
  dir: Vec2,
  speed: number,
  damage: number,
  pierce: number,
  canHitAir = false,
): Projectile {
  const len = Math.hypot(dir.x, dir.y) || 1
  return {
    id: `p${nextId++}`,
    pos: { x: from.x, y: from.y },
    vx: (dir.x / len) * speed,
    vy: (dir.y / len) * speed,
    damage,
    pierceLeft: pierce,
    hitIds: [],
    life: 2,
    canHitAir,
  }
}

/** Move the projectile forward by dt seconds. Mutates pos + life. */
export function advanceProjectile(p: Projectile, dtSeconds: number): void {
  p.pos.x += p.vx * dtSeconds
  p.pos.y += p.vy * dtSeconds
  p.life -= dtSeconds
}

/** True once the projectile should be removed (out of pierces, expired, or off-bounds). */
export function projectileDone(p: Projectile, bounds: { w: number; h: number }): boolean {
  return (
    p.pierceLeft < 0 ||
    p.life <= 0 ||
    p.pos.x < -24 ||
    p.pos.x > bounds.w + 24 ||
    p.pos.y < -24 ||
    p.pos.y > bounds.h + 24
  )
}
