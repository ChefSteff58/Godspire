import { describe, expect, it } from 'vitest'
import {
  stonePredicate,
  grassPredicate,
  terrainAt,
  isBuildableGround,
  RIFT,
  GATE,
  TERRAIN_TILE_PX,
} from '../src/core/map/terrain'
import { canPlace } from '../src/core/map/placement'
import { OBSTACLES } from '../src/core/map/obstacles'

/** Sample a predicate's true-fraction over lattice vertices inside a disc. */
function fractionInDisc(pred: (x: number, y: number) => boolean, cx: number, cy: number, r: number): number {
  let hit = 0
  let total = 0
  for (let vx = 0; vx <= 30; vx++) {
    for (let vy = 0; vy <= 17; vy++) {
      const x = vx * TERRAIN_TILE_PX
      const y = vy * TERRAIN_TILE_PX
      if (Math.hypot(x - cx, y - cy) > r) continue
      total++
      if (pred(x, y)) hit++
    }
  }
  return total ? hit / total : 0
}

describe('terrain determinism', () => {
  it('identical predicates across constructions', () => {
    const a = stonePredicate()
    const b = stonePredicate()
    const ga = grassPredicate()
    const gb = grassPredicate()
    for (let vx = 0; vx <= 30; vx++) {
      for (let vy = 0; vy <= 17; vy++) {
        const x = vx * TERRAIN_TILE_PX
        const y = vy * TERRAIN_TILE_PX
        expect(a(x, y)).toBe(b(x, y))
        expect(ga(x, y)).toBe(gb(x, y))
      }
    }
  })
})

describe('grass ⊂ stone (subset by construction)', () => {
  it('grass never grows on chasm', () => {
    const stone = stonePredicate()
    const grass = grassPredicate()
    for (let vx = 0; vx <= 30; vx++) {
      for (let vy = 0; vy <= 17; vy++) {
        const x = vx * TERRAIN_TILE_PX
        const y = vy * TERRAIN_TILE_PX
        if (grass(x, y)) expect(stone(x, y)).toBe(true)
      }
    }
  })
})

describe('the 3-band gradient', () => {
  const stone = stonePredicate()
  const grass = grassPredicate()

  it('chasm concentrates near the rift, not the gate', () => {
    const chasmNearRift = 1 - fractionInDisc(stone, RIFT.x, RIFT.y, 180)
    const chasmNearGate = 1 - fractionInDisc(stone, GATE.x, GATE.y, 180)
    expect(chasmNearRift).toBeGreaterThan(chasmNearGate)
    expect(chasmNearGate).toBeLessThan(0.1) // ground holds firm by Olympus
  })

  it('grass grows toward the gate and dies toward the rift', () => {
    const grassNearGate = fractionInDisc(grass, GATE.x, GATE.y, 180)
    const grassMidfield = fractionInDisc(grass, 480, 270, 150)
    const grassNearRift = fractionInDisc(grass, RIFT.x, RIFT.y, 180)
    expect(grassNearGate).toBeGreaterThan(grassMidfield)
    expect(grassNearRift).toBeLessThan(0.05)
    expect(grassNearGate).toBeGreaterThan(0.3) // a real meadow by the gate
  })

  it('the field is a real mix (not one solid band)', () => {
    const stoneFrac = fractionInDisc(stone, 480, 270, 10_000)
    expect(stoneFrac).toBeGreaterThan(0.4)
    expect(stoneFrac).toBeLessThan(0.95)
  })
})

describe('terrainAt / isBuildableGround agreement', () => {
  it('terrainAt chasm ⇔ !isBuildableGround; stone/grass ⇔ buildable', () => {
    for (let vx = 0; vx <= 30; vx += 2) {
      for (let vy = 0; vy <= 17; vy += 2) {
        const x = vx * TERRAIN_TILE_PX
        const y = vy * TERRAIN_TILE_PX
        expect(isBuildableGround(x, y)).toBe(terrainAt(x, y) !== 'chasm')
      }
    }
  })
})

describe('cliffs in canPlace (the canonical map)', () => {
  it('a chasm vertex rejects with reason "cliff"', () => {
    // scan for a chasm vertex that is clear of road/obstacles so ONLY the cliff rule fires
    const stone = stonePredicate()
    let found: { x: number; y: number } | null = null
    for (let vx = 2; vx <= 28 && !found; vx++) {
      for (let vy = 2; vy <= 15 && !found; vy++) {
        const x = vx * TERRAIN_TILE_PX
        const y = vy * TERRAIN_TILE_PX
        if (stone(x, y)) continue
        const probe = canPlace({ x, y }, 16, { ground: () => true }) // all other rules with cliff bypassed
        if (probe.ok) found = { x, y }
      }
    }
    expect(found).not.toBeNull()
    expect(canPlace(found!, 16)).toEqual({ ok: false, reason: 'cliff' })
  })

  it('a stone vertex clear of everything places fine', () => {
    const stone = stonePredicate()
    let found: { x: number; y: number } | null = null
    for (let vx = 2; vx <= 28 && !found; vx++) {
      for (let vy = 2; vy <= 15 && !found; vy++) {
        const x = vx * TERRAIN_TILE_PX
        const y = vy * TERRAIN_TILE_PX
        if (!stone(x, y)) continue
        if (canPlace({ x, y }, 16).ok) found = { x, y }
      }
    }
    expect(found).not.toBeNull()
  })

  it('water placement (Poseidon) is exempt from the cliff rule', () => {
    // the lake pocket may sit over chasm vertices; terrain:'water' must skip the ground check
    const r = canPlace({ x: 100, y: 100 }, 16, {
      path: [{ x: -100, y: -100 }, { x: -90, y: -100 }], // far-away path — only the cliff rule could fire
      obstacles: [],
      ground: () => false, // everything is chasm…
      terrain: 'water', // …but water gods don't care
    })
    expect(r.ok).toBe(true)
  })
})

describe('the fixed obstacles stand on buildable ground', () => {
  it('columns, boulder, and olive anchors are not on chasm', () => {
    for (const o of OBSTACLES) {
      if (o.terrain === 'water') continue // the lake IS allowed over chasm
      const s = o.shape
      const cx = s.kind === 'circle' ? s.x : s.x + s.w / 2
      const cy = s.kind === 'circle' ? s.y : s.y + s.h / 2
      expect(isBuildableGround(cx, cy), `${o.id} at (${cx},${cy}) sits on chasm — nudge its coords`).toBe(true)
    }
  })
})
