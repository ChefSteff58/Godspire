import { describe, expect, it } from 'vitest'
import { canPlace, pointInPoly } from '../src/core/map/placement'
import { OBSTACLES } from '../src/core/map/obstacles'

// The Lake of Styx polygon (M9-S2): the road-ringed central pocket. These tests pin the poly
// obstacle machinery — point-in-poly, edge dilation in obstacleHit, and the water exemption.

const styx = OBSTACLES.find((o) => o.id === 'styx')!
const pts = styx.shape.kind === 'poly' ? styx.shape.points : []

describe('the Lake of Styx is a polygon', () => {
  it('exists, is water, and has a real ring of points', () => {
    expect(styx.terrain).toBe('water')
    expect(styx.shape.kind).toBe('poly')
    expect(pts.length).toBeGreaterThanOrEqual(5)
  })
})

describe('pointInPoly', () => {
  it('the pocket interior is inside; the map corners are not', () => {
    expect(pointInPoly({ x: 590, y: 330 }, pts)).toBe(true) // mid-lake
    expect(pointInPoly({ x: 100, y: 100 }, pts)).toBe(false)
    expect(pointInPoly({ x: 900, y: 500 }, pts)).toBe(false)
  })

  it('points just across an edge flip inside/outside', () => {
    // straddle the east tip vertex (709,333) horizontally
    expect(pointInPoly({ x: 700, y: 333 }, pts)).toBe(true)
    expect(pointInPoly({ x: 715, y: 333 }, pts)).toBe(false)
  })
})

describe('the lake in canPlace', () => {
  // isolate the obstacle rule: far-away path + all ground buildable
  const farPath = [
    { x: -500, y: -500 },
    { x: -400, y: -500 },
  ]
  const ctx = { path: farPath, ground: () => true }

  it('a land god rejects INSIDE the pocket with reason "obstacle"', () => {
    expect(canPlace({ x: 590, y: 330 }, 16, ctx)).toEqual({ ok: false, reason: 'obstacle' })
  })

  it('edge dilation: a footprint overhanging the shoreline still rejects', () => {
    // just outside the SE edge, footprint 16 → overlaps the water
    expect(canPlace({ x: 690, y: 355 }, 16, ctx)).toEqual({ ok: false, reason: 'obstacle' })
  })

  it('clear of the dilated edge places fine', () => {
    expect(canPlace({ x: 760, y: 480 }, 16, ctx).ok).toBe(true)
  })

  it('Poseidon (terrain water) owns the whole pocket', () => {
    expect(canPlace({ x: 590, y: 330 }, 16, { ...ctx, terrain: 'water' as const }).ok).toBe(true)
    expect(canPlace({ x: 500, y: 300 }, 16, { ...ctx, terrain: 'water' as const }).ok).toBe(true)
  })

  it('Frozen Styx (M11): the boon flag lets ANY god build on the lake', () => {
    expect(canPlace({ x: 590, y: 330 }, 16, ctx).ok).toBe(false) // normally blocked
    expect(canPlace({ x: 590, y: 330 }, 16, { ...ctx, frozenStyxBuildable: true }).ok).toBe(true)
    expect(canPlace({ x: 500, y: 300 }, 16, { ...ctx, frozenStyxBuildable: true }).ok).toBe(true)
  })

  it('points across the road from the pocket are unaffected by the lake', () => {
    // uses the REAL path/obstacles/terrain: assert the lake obstacle is not what fires there
    const r = canPlace({ x: 300, y: 350 }, 16, { ground: () => true })
    if (!r.ok) expect(r.reason).not.toBe('obstacle')
  })
})
