// The Lake of Styx — ONE polygon truth for placement (the styx obstacle), terrain (the shore
// force-stone clause), and render (the water Wang layer). Pure math; imports nothing but types
// so terrain.ts and obstacles.ts can both consume it without cycles.

import type { Vec2 } from '../types'

/** The lake's shoreline polygon — EXPANDED to fill the pocket (M10 refine): 16 points, each
 *  pushed radially until ~24px from the road centerline so the water tucks under the road's
 *  buffer band nearly everywhere (flush by construction, no square-peg margins). */
export const STYX_POINTS: readonly Vec2[] = [
  { x: 498, y: 278 },
  { x: 522, y: 269 },
  { x: 556, y: 255 },
  { x: 608, y: 235 },
  { x: 642, y: 270 },
  { x: 654, y: 285 },
  { x: 670, y: 292 },
  { x: 690, y: 313 },
  { x: 709, y: 333 },
  { x: 676, y: 363 },
  { x: 634, y: 394 },
  { x: 554, y: 416 }, // clamped — the raw push escaped through the pocket's south opening
  { x: 489, y: 400 },
  { x: 480, y: 365 },
  { x: 472, y: 334 },
  { x: 461, y: 301 },
]

// local point-in-poly + edge distance — deliberately NOT imported from placement.ts
// (placement → terrain → water would cycle)
function pip(p: Vec2, pts: readonly Vec2[]): boolean {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i]
    const b = pts[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

function distToEdge(p: Vec2, pts: readonly Vec2[]): number {
  let min = Infinity
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[j]
    const b = pts[i]
    const abx = b.x - a.x
    const aby = b.y - a.y
    const len2 = abx * abx + aby * aby || 1
    let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2
    t = Math.max(0, Math.min(1, t))
    min = Math.min(min, Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t)))
  }
  return min
}

/** Is this point open water? (The render predicate for the styx Wang layer.) */
export function waterAt(x: number, y: number): boolean {
  return pip({ x, y }, STYX_POINTS)
}

/**
 * Inside the lake OR within `pad` px of its shoreline. terrain.ts force-stones this region so
 * chasm can NEVER touch water — the water→stone Wang set is then correct at every boundary
 * (its only transition is to stone), and the shore ring becomes genuinely buildable ground.
 */
export function nearStyxShore(x: number, y: number, pad = 48): boolean {
  const p = { x, y }
  return pip(p, STYX_POINTS) || distToEdge(p, STYX_POINTS) <= pad
}
