import type { Vec2 } from '../types'

/**
 * The one v1 map path, in the 960×540 logical game space. Enemies march from the
 * Underworld (bottom) up the winding road to the Gates of Olympus (top). Authored as
 * DATA (not baked into art) so movement is testable and the map is swappable later.
 */
export const OLYMPUS_PATH: readonly Vec2[] = [
  { x: 480, y: 528 }, // Tartarus mouth (bottom)
  { x: 180, y: 450 },
  { x: 760, y: 372 },
  { x: 220, y: 286 },
  { x: 740, y: 208 },
  { x: 430, y: 120 },
  { x: 490, y: 18 }, // Gates of Olympus (top)
]

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
