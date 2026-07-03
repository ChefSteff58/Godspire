// Deterministic map decor scatter (M9-S4) — pure math, no Phaser. GameScene stamps the result;
// the same seed gives the same map dressing every boot (players learn the field, not re-roll it).

import type { Vec2 } from '../../core/types'
import type { TerrainKind } from '../../core/map/terrain'
import { RIFT, GATE } from '../../core/map/terrain'
import { distToPolyline, pointInPoly, PATH_HALF_WIDTH } from '../../core/map/placement'
import type { Obstacle } from '../../core/map/obstacles'

export interface DecorPlacement {
  key: string
  x: number
  y: number
  sizePx: number
}

export interface DecorKeys {
  /** Grim keys (bones, a lost shield) — biased toward the Tartarus half of the field. */
  grim: string[]
  /** Neutral stone-field keys (stumps, rocks, a shrine). */
  stone: string[]
  /** Grass keys (tufts) — only ever placed on grass terrain. */
  grass: string[]
}

/** Deterministic sin-hash in [0,1) — the scatter must not change between boots. */
function seeded(n: number): number {
  const v = Math.sin(n * 9871.123) * 43758.5453
  return v - Math.floor(v)
}

function clearOfObstacle(p: Vec2, o: Obstacle, margin: number): boolean {
  const s = o.shape
  if (s.kind === 'circle') return Math.hypot(p.x - s.x, p.y - s.y) > s.r + margin
  if (s.kind === 'poly') {
    if (pointInPoly(p, s.points)) return false
    // cheap edge clearance: vertex distance is a good-enough proxy for small margins
    for (const v of s.points) if (Math.hypot(p.x - v.x, p.y - v.y) < margin) return false
    return true
  }
  return p.x < s.x - margin || p.x > s.x + s.w + margin || p.y < s.y - margin || p.y > s.y + s.h + margin
}

/**
 * Scatter ~`target` decor pieces over the buildable field: off the road (+18px), outside
 * obstacles (+16px), away from the rift/gate set pieces (100px), ≥40px apart. Grim pieces
 * (bones, shields) bias toward the Tartarus half; tufts only grow on grass.
 */
export function scatterDecor(
  seed: number,
  target: number,
  isBuildable: (x: number, y: number) => boolean,
  terrainAt: (x: number, y: number) => TerrainKind,
  path: readonly Vec2[],
  obstacles: readonly Obstacle[],
  keys: DecorKeys,
  bounds = { w: 960, h: 540 },
): DecorPlacement[] {
  const out: DecorPlacement[] = []
  const stoneKeys = [...keys.grim, ...keys.stone]
  if (stoneKeys.length === 0 && keys.grass.length === 0) return out

  for (let i = 0; i < 600 && out.length < target; i++) {
    const x = 24 + seeded(seed + i * 5 + 1) * (bounds.w - 48)
    const y = 24 + seeded(seed + i * 5 + 2) * (bounds.h - 48)
    if (!isBuildable(x, y)) continue
    if (distToPolyline({ x, y }, path) <= PATH_HALF_WIDTH + 18) continue
    if (Math.hypot(x - RIFT.x, y - RIFT.y) < 100 || Math.hypot(x - GATE.x, y - GATE.y) < 100) continue
    if (!obstacles.every((o) => clearOfObstacle({ x, y }, o, 16))) continue
    if (out.some((d) => Math.hypot(d.x - x, d.y - y) < 40)) continue

    const terrain = terrainAt(x, y)
    let pool: string[]
    if (terrain === 'grass' && keys.grass.length > 0) {
      pool = keys.grass
    } else {
      // the Tartarus half (rift side) skews grim: bones and battle-loss where the enemies pour in
      const grimBias = x < bounds.w * 0.45 ? 0.65 : 0.2
      pool = keys.grim.length > 0 && seeded(seed + i * 5 + 3) < grimBias ? keys.grim : keys.stone
      if (pool.length === 0) pool = stoneKeys
    }
    if (pool.length === 0) continue
    const key = pool[Math.floor(seeded(seed + i * 5 + 4) * pool.length) % pool.length]
    const sizePx = 16 + Math.floor(seeded(seed + i * 5 + 5) * 13) // 16–28px, small next to 84px creatures
    out.push({ key, x: Math.round(x), y: Math.round(y), sizePx })
  }
  return out
}
