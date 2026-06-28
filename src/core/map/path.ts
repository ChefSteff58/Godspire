import type { Vec2 } from '../types'

// Control points for the map: a longer, curvy route with one self-crossing CROSSROADS
// (a tower at the X covers both lanes). Smoothed into a dense polyline via Catmull-Rom so the
// road is rounded, not rigid. Enters off the top-left, exits off the right edge.
const CONTROL_POINTS: readonly Vec2[] = [
  { x: -40, y: 140 }, // enter top-left
  { x: 250, y: 190 },
  { x: 430, y: 380 }, // the down-right diagonal that gets crossed later
  { x: 640, y: 470 },
  { x: 790, y: 360 },
  { x: 720, y: 190 }, // up the right side
  { x: 500, y: 120 }, // left across the top
  { x: 320, y: 235 }, // come back down-left → crosses the earlier diagonal ≈ the crossroads
  { x: 300, y: 430 },
  { x: 490, y: 495 },
  { x: 700, y: 450 },
  { x: 880, y: 320 },
  { x: 1000, y: 220 }, // exit right
]

function catmullRom(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const t2 = t * t
  const t3 = t2 * t
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  }
}

/** Smooth a set of control points into a dense polyline (Catmull-Rom). Pure. */
export function buildSmoothPath(ctrl: readonly Vec2[], perSpan = 14): Vec2[] {
  const pts: Vec2[] = []
  const n = ctrl.length
  for (let i = 0; i < n - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)]
    const p1 = ctrl[i]
    const p2 = ctrl[i + 1]
    const p3 = ctrl[Math.min(n - 1, i + 2)]
    for (let j = 0; j < perSpan; j++) pts.push(catmullRom(p0, p1, p2, p3, j / perSpan))
  }
  pts.push({ x: ctrl[n - 1].x, y: ctrl[n - 1].y })
  return pts
}

/** The one v1 map path — a dense, smooth, self-crossing polyline in the 960×540 logical space. */
export const OLYMPUS_PATH: readonly Vec2[] = buildSmoothPath(CONTROL_POINTS)

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
