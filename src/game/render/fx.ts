// Pure attack-FX geometry (M9-S3) — no Phaser imports, unit-tested like facing.ts/wang.ts.
// GameScene renders these shapes; the math lives here so the look is deterministic under test.

import type { Vec2 } from '../../core/types'

export interface Bolt {
  /** The main strike: from → to through 2^depth-1 displaced midpoints. */
  main: Vec2[]
  /** 1–2 short side-forks, each starting ON a main point and dying out in the strike direction. */
  forks: Vec2[][]
}

/**
 * Fractal lightning by midpoint displacement: split every segment at its middle and shove the
 * midpoint perpendicular to the segment by ±jitter·segmentLength, `depth` times. Endpoints are
 * NEVER displaced — the bolt always connects muzzle to target. `rand` is injectable for tests.
 */
function displace(from: Vec2, to: Vec2, depth: number, jitter: number, rand: () => number): Vec2[] {
  let pts: Vec2[] = [
    { x: from.x, y: from.y },
    { x: to.x, y: to.y },
  ]
  for (let i = 0; i < depth; i++) {
    const next: Vec2[] = [pts[0]]
    for (let j = 1; j < pts.length; j++) {
      const a = pts[j - 1]
      const b = pts[j]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.hypot(dx, dy) || 1
      // unit perpendicular; displacement shrinks with each subdivision (len already halves)
      const off = (rand() - 0.5) * 2 * jitter * len
      next.push({ x: (a.x + b.x) / 2 + (-dy / len) * off, y: (a.y + b.y) / 2 + (dx / len) * off }, b)
    }
    pts = next
  }
  return pts
}

export function boltPoints(
  from: Vec2,
  to: Vec2,
  depth = 4,
  jitter = 0.22,
  rand: () => number = Math.random,
): Bolt {
  const d = Math.max(1, Math.min(6, Math.floor(depth)))
  const pts = displace(from, to, d, jitter, rand)

  // side-forks: short decaying branches off interior points, deviating 0.4–0.9 rad from the strike
  const forks: Vec2[][] = []
  const strikeAng = Math.atan2(to.y - from.y, to.x - from.x)
  const dist = Math.hypot(to.x - from.x, to.y - from.y)
  const forkCount = 1 + (rand() < 0.45 ? 1 : 0)
  for (let f = 0; f < forkCount; f++) {
    // pick any interior main point (never an endpoint) to root the fork on
    const idx = 1 + Math.floor(rand() * (pts.length - 2))
    const start = pts[idx]
    const side = rand() < 0.5 ? -1 : 1
    const ang = strikeAng + side * (0.4 + rand() * 0.5)
    const forkLen = dist * (0.16 + rand() * 0.14)
    const end = { x: start.x + Math.cos(ang) * forkLen, y: start.y + Math.sin(ang) * forkLen }
    // a fork is a plain displaced wisp (fixed shallow depth) — it never spawns forks of its own
    forks.push(displace(start, end, 2, jitter, rand))
  }
  return { main: pts, forks }
}

/**
 * Bounded arc tessellation: N+1 points along a circular arc. Phaser's Graphics.arc() expands to
 * ~101 points per arc PER FRAME regardless of length — lineTo over these points costs a fraction
 * of that (the M9-S3 review's top perf finding). Pure + unit-tested.
 */
export function arcPoints(cx: number, cy: number, r: number, a0: number, a1: number, n = 20): Vec2[] {
  const steps = Math.max(2, Math.floor(n))
  const out: Vec2[] = []
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps
    out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
  }
  return out
}

/**
 * Max perpendicular distance of any main-bolt point from the straight strike line. TEST-ONLY
 * invariant check (see tests/fx.test.ts) that bolts stay in a sane corridor — nothing in the
 * render path calls this.
 */
export function boltMaxDeviation(bolt: Bolt, from: Vec2, to: Vec2): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len2 = dx * dx + dy * dy || 1
  let max = 0
  for (const p of bolt.main) {
    const t = ((p.x - from.x) * dx + (p.y - from.y) * dy) / len2
    const cx = from.x + dx * t
    const cy = from.y + dy * t
    max = Math.max(max, Math.hypot(p.x - cx, p.y - cy))
  }
  return max
}
