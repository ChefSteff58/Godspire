import type { Vec2 } from '../types'
import { OLYMPUS_PATH } from './path'
import type { Obstacle } from './obstacles'
import { OBSTACLES } from './obstacles'
import { isBuildableGround } from './terrain'

export const PATH_HALF_WIDTH = 20 // tight to the walkable road so towers can hug the track
export const PLACEMENT_BUFFER = 2

export type PlaceReason = 'oob' | 'on-path' | 'cliff' | 'obstacle' | 'too-close'
export type PlaceResult = { ok: true } | { ok: false; reason: PlaceReason }

const OK: PlaceResult = { ok: true }

function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const len2 = abx * abx + aby * aby
  let t = len2 ? ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2 : 0
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t))
}

/** Shortest distance from a point to the path polyline. Pure. */
export function distToPolyline(p: Vec2, pts: readonly Vec2[] = OLYMPUS_PATH): number {
  let min = Infinity
  for (let i = 1; i < pts.length; i++) min = Math.min(min, distToSegment(p, pts[i - 1], pts[i]))
  return min
}

/** Ray-cast point-in-polygon (even-odd rule). Pure; exported for GameScene's water check. */
export function pointInPoly(p: Vec2, pts: readonly Vec2[]): boolean {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i]
    const b = pts[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside
    }
  }
  return inside
}

/** Shortest distance from a point to a polygon's edge loop (closes the ring itself). */
function distToPolyEdge(p: Vec2, pts: readonly Vec2[]): number {
  let min = Infinity
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    min = Math.min(min, distToSegment(p, pts[j], pts[i]))
  }
  return min
}

function obstacleHit(pos: Vec2, footprint: number, o: Obstacle): boolean {
  const s = o.shape
  if (s.kind === 'circle') return Math.hypot(pos.x - s.x, pos.y - s.y) < s.r + footprint
  if (s.kind === 'poly') return pointInPoly(pos, s.points) || distToPolyEdge(pos, s.points) < footprint
  const cx = Math.max(s.x, Math.min(pos.x, s.x + s.w))
  const cy = Math.max(s.y, Math.min(pos.y, s.y + s.h))
  return Math.hypot(pos.x - cx, pos.y - cy) < footprint
}

export interface PlaceCtx {
  path?: readonly Vec2[]
  obstacles?: readonly Obstacle[]
  towers?: readonly { pos: Vec2; footprint: number }[]
  bounds?: { w: number; h: number }
  /** A water god may build on water-terrain obstacles. */
  terrain?: 'water'
  /** Buildable-ground predicate (defaults to the canonical terrain noise — chasm cells reject). */
  ground?: (x: number, y: number) => boolean
}

/**
 * Can a tower with `footprint` be placed at `pos`? Pure & testable. Blocked when: off-bounds,
 * on the path corridor, on chasm ground (M9 cliffs — center-only check: the predicate is snapped
 * to the 32px lattice, so a ring test buys aliasing, not accuracy, and edge overhang reads as
 * "standing at the cliff lip"), overlapping an obstacle, or too close to another tower.
 */
export function canPlace(pos: Vec2, footprint: number, ctx: PlaceCtx = {}): PlaceResult {
  const path = ctx.path ?? OLYMPUS_PATH
  const obstacles = ctx.obstacles ?? OBSTACLES
  const towers = ctx.towers ?? []
  const bounds = ctx.bounds ?? { w: 960, h: 540 }
  const ground = ctx.ground ?? isBuildableGround

  if (pos.x < footprint || pos.x > bounds.w - footprint || pos.y < footprint || pos.y > bounds.h - footprint) {
    return { ok: false, reason: 'oob' }
  }
  if (distToPolyline(pos, path) < PATH_HALF_WIDTH + footprint + PLACEMENT_BUFFER) {
    return { ok: false, reason: 'on-path' }
  }
  // Poseidon (terrain:'water') is exempt — his lake may sit over chasm vertices; land gods are
  // blocked from the water by the obstacle check below anyway.
  if (ctx.terrain !== 'water' && !ground(pos.x, pos.y)) {
    return { ok: false, reason: 'cliff' }
  }
  for (const o of obstacles) {
    if (o.terrain === 'water' && ctx.terrain === 'water') continue
    if (obstacleHit(pos, footprint, o)) return { ok: false, reason: 'obstacle' }
  }
  for (const t of towers) {
    if (Math.hypot(t.pos.x - pos.x, t.pos.y - pos.y) < footprint + t.footprint + PLACEMENT_BUFFER) {
      return { ok: false, reason: 'too-close' }
    }
  }
  return OK
}
