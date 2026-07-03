import { describe, expect, it } from 'vitest'
import { STYX_POINTS, waterAt, nearStyxShore } from '../src/core/map/water'
import { stonePredicate, TERRAIN_TILE_PX } from '../src/core/map/terrain'
import { pointInPoly } from '../src/core/map/placement'
import { OBSTACLES } from '../src/core/map/obstacles'

// M10-S2: the water Wang layer's correctness rests on ONE invariant — chasm never touches water.

describe('the one polygon truth', () => {
  it('the styx obstacle uses THE SAME points object as water.ts', () => {
    const styx = OBSTACLES.find((o) => o.id === 'styx')!
    expect(styx.shape.kind).toBe('poly')
    if (styx.shape.kind === 'poly') expect(styx.shape.points).toBe(STYX_POINTS)
  })

  it('waterAt agrees with placement pointInPoly everywhere on the lattice', () => {
    for (let vx = 0; vx <= 30; vx++) {
      for (let vy = 0; vy <= 17; vy++) {
        const x = vx * TERRAIN_TILE_PX
        const y = vy * TERRAIN_TILE_PX
        expect(waterAt(x, y)).toBe(pointInPoly({ x, y }, STYX_POINTS))
      }
    }
  })
})

describe('the no-seam invariant (water never meets chasm)', () => {
  it('every lattice vertex of every cell containing a water corner is STONE', () => {
    const stone = stonePredicate()
    for (let col = 0; col < 30; col++) {
      for (let row = 0; row < 17; row++) {
        const corners = [
          [col, row],
          [col + 1, row],
          [col + 1, row + 1],
          [col, row + 1],
        ].map(([vx, vy]) => ({ x: vx * TERRAIN_TILE_PX, y: vy * TERRAIN_TILE_PX }))
        if (!corners.some((c) => waterAt(c.x, c.y))) continue
        // this cell renders a water-set tile — ALL its corners must be stone in the canonical truth
        for (const c of corners) {
          expect(stone(c.x, c.y), `chasm at (${c.x},${c.y}) touches a water cell`).toBe(true)
        }
      }
    }
  })

  it('nearStyxShore covers the polygon and its pad, deterministically', () => {
    expect(nearStyxShore(590, 330)).toBe(true) // mid-lake
    expect(nearStyxShore(709 + 40, 333)).toBe(true) // inside the 48px pad off the east tip
    expect(nearStyxShore(100, 100)).toBe(false)
    expect(nearStyxShore(590, 330)).toBe(nearStyxShore(590, 330))
  })

  it('the shore clause did not flood the map (stone stays a mix)', () => {
    const stone = stonePredicate()
    let stoneCount = 0
    let total = 0
    for (let vx = 0; vx <= 30; vx++) {
      for (let vy = 0; vy <= 17; vy++) {
        total++
        if (stone(vx * TERRAIN_TILE_PX, vy * TERRAIN_TILE_PX)) stoneCount++
      }
    }
    expect(stoneCount / total).toBeGreaterThan(0.4)
    expect(stoneCount / total).toBeLessThan(0.95)
  })
})
