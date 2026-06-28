import type { Vec2 } from '../types'

// Hand-designed CORNER waypoints — crisp straight lanes you can line with towers, joined by
// softly ROUNDED corners (BTD6 "Monkey Meadow" feel). Turn-heavy + uses the whole map; the
// inside of each bend is a deliberate build pocket. Enters off the left, exits off the right.
const WAYPOINTS: readonly Vec2[] = [
  { x: -30, y: 120 }, // enter left
  { x: 210, y: 110 },
  { x: 300, y: 270 },
  { x: 150, y: 365 },
  { x: 255, y: 485 },
  { x: 475, y: 440 },
  { x: 430, y: 280 }, // hairpin back up
  { x: 615, y: 205 },
  { x: 745, y: 345 },
  { x: 590, y: 455 },
  { x: 805, y: 490 },
  { x: 915, y: 320 },
  { x: 1000, y: 205 }, // exit right
]

const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y })
const len = (a: Vec2): number => Math.hypot(a.x, a.y) || 1

/**
 * Turn a crisp corner-polyline into a dense polyline whose straight runs stay straight but whose
 * corners are rounded by `radius` (a quadratic fillet through each interior vertex). Pure.
 */
export function roundCorners(wp: readonly Vec2[], radius = 30, perCorner = 7): Vec2[] {
  if (wp.length < 3) return wp.map((p) => ({ x: p.x, y: p.y }))
  const out: Vec2[] = [{ x: wp[0].x, y: wp[0].y }]
  for (let i = 1; i < wp.length - 1; i++) {
    const a = wp[i - 1]
    const c = wp[i]
    const b = wp[i + 1]
    const da = sub(a, c)
    const db = sub(b, c)
    const r = Math.min(radius, len(da) / 2, len(db) / 2)
    const p1 = { x: c.x + (da.x / len(da)) * r, y: c.y + (da.y / len(da)) * r }
    const p2 = { x: c.x + (db.x / len(db)) * r, y: c.y + (db.y / len(db)) * r }
    out.push(p1)
    for (let j = 1; j < perCorner; j++) {
      const t = j / perCorner
      const u = 1 - t
      out.push({
        x: u * u * p1.x + 2 * u * t * c.x + t * t * p2.x,
        y: u * u * p1.y + 2 * u * t * c.y + t * t * p2.y,
      })
    }
    out.push(p2)
  }
  out.push({ x: wp[wp.length - 1].x, y: wp[wp.length - 1].y })
  return out
}

/** The one v1 map path — crisp lanes with rounded corners, in the 960×540 logical space. */
export const OLYMPUS_PATH: readonly Vec2[] = roundCorners(WAYPOINTS)

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

function lerp(a: Vec2, b: Vec2, f: number): Vec2 {
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }
}

/**
 * Pure geometry over a polyline. Answers "where is progress t (0..1)?" and "which way is
 * the unit facing?" Precomputes cumulative segment lengths so lookups are cheap.
 */
export class PathSystem {
  readonly waypoints: readonly Vec2[]
  readonly length: number
  private readonly cumulative: number[]

  constructor(waypoints: readonly Vec2[]) {
    if (waypoints.length < 2) throw new Error('PathSystem needs at least 2 waypoints')
    this.waypoints = waypoints
    this.cumulative = [0]
    let total = 0
    for (let i = 1; i < waypoints.length; i++) {
      total += dist(waypoints[i - 1], waypoints[i])
      this.cumulative.push(total)
    }
    this.length = total
  }

  /** World position at progress `t` in [0,1] (clamped). */
  getPointAt(t: number): Vec2 {
    const target = Math.max(0, Math.min(1, t)) * this.length
    for (let i = 1; i < this.cumulative.length; i++) {
      if (target <= this.cumulative[i]) {
        const segStart = this.cumulative[i - 1]
        const segLen = this.cumulative[i] - segStart || 1
        return lerp(this.waypoints[i - 1], this.waypoints[i], (target - segStart) / segLen)
      }
    }
    const last = this.waypoints[this.waypoints.length - 1]
    return { x: last.x, y: last.y }
  }

  /** Facing angle (radians) — direction of travel at progress `t`. */
  getAngleAt(t: number): number {
    const target = Math.max(0, Math.min(1, t)) * this.length
    for (let i = 1; i < this.cumulative.length; i++) {
      if (target <= this.cumulative[i]) {
        const a = this.waypoints[i - 1]
        const b = this.waypoints[i]
        return Math.atan2(b.y - a.y, b.x - a.x)
      }
    }
    const a = this.waypoints[this.waypoints.length - 2]
    const b = this.waypoints[this.waypoints.length - 1]
    return Math.atan2(b.y - a.y, b.x - a.x)
  }
}
