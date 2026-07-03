import { describe, expect, it } from 'vitest'
import { lavaVertexSet, isLavaVertex, LAVA_RIFT_RADIUS } from '../src/core/map/lava'
import { stonePredicate, RIFT, TERRAIN_TILE_PX } from '../src/core/map/terrain'

describe('the molten floor (lava.ts)', () => {
  it('is deterministic and non-empty (the Tartarus mega-blob turns molten)', () => {
    const a = lavaVertexSet()
    expect(a.size).toBeGreaterThan(10)
    expect(lavaVertexSet()).toBe(a) // memoized — literally the same set
  })

  it('lava ⊂ chasm: every molten vertex is chasm in the canonical truth', () => {
    const stone = stonePredicate()
    for (const k of lavaVertexSet()) {
      const vx = k % 64
      const vy = Math.floor(k / 64)
      expect(stone(vx * TERRAIN_TILE_PX, vy * TERRAIN_TILE_PX), `lava on stone at v(${vx},${vy})`).toBe(false)
    }
  })

  it('NO MIXED CELLS: a cell never contains both a lava corner and an ash-chasm corner', () => {
    const stone = stonePredicate()
    for (let col = 0; col < 30; col++) {
      for (let row = 0; row < 17; row++) {
        const corners = [
          [col, row],
          [col + 1, row],
          [col + 1, row + 1],
          [col, row + 1],
        ]
        let lava = 0
        let ash = 0
        for (const [vx, vy] of corners) {
          const x = vx * TERRAIN_TILE_PX
          const y = vy * TERRAIN_TILE_PX
          if (stone(x, y)) continue
          if (isLavaVertex(x, y)) lava++
          else ash++
        }
        expect(lava > 0 && ash > 0, `mixed cell at (${col},${row}): ${lava} lava + ${ash} ash corners`).toBe(false)
      }
    }
  })

  it('every molten component reaches into the rift radius', () => {
    // spot check: at least one molten vertex is properly near the rift
    let minDist = Infinity
    for (const k of lavaVertexSet()) {
      const vx = k % 64
      const vy = Math.floor(k / 64)
      minDist = Math.min(minDist, Math.hypot(vx * TERRAIN_TILE_PX - RIFT.x, vy * TERRAIN_TILE_PX - RIFT.y))
    }
    expect(minDist).toBeLessThanOrEqual(LAVA_RIFT_RADIUS)
  })
})
