import { describe, it, expect } from 'vitest'
import { canPlace, distToPolyline, PATH_HALF_WIDTH } from '../src/core/map/placement'
import {
  createProjectile,
  advanceProjectile,
  projectileDone,
} from '../src/core/entities/projectile'
import { damagedColor, damagedRadius, scaleColor } from '../src/core/entities/enemy'
import type { Vec2 } from '../src/core/types'

// A simple horizontal path at y=100 from x=0..200 for deterministic placement tests.
const PATH: Vec2[] = [
  { x: 0, y: 100 },
  { x: 200, y: 100 },
]
const BOUNDS = { w: 960, h: 540 }

describe('placement / dead zones', () => {
  it('distToPolyline measures distance to the nearest segment', () => {
    expect(distToPolyline({ x: 100, y: 100 }, PATH)).toBe(0)
    expect(distToPolyline({ x: 100, y: 160 }, PATH)).toBeCloseTo(60)
  })

  it('blocks building ON the path (the core bug fix)', () => {
    const r = canPlace({ x: 100, y: 100 }, 20, { path: PATH, bounds: BOUNDS, ground: () => true, obstacles: [] })
    expect(r).toEqual({ ok: false, reason: 'on-path' })
  })

  it('allows building in open ground off the path', () => {
    const r = canPlace({ x: 100, y: 300 }, 20, { path: PATH, bounds: BOUNDS, ground: () => true, obstacles: [] })
    expect(r.ok).toBe(true)
  })

  it('blocks building inside the path corridor buffer', () => {
    // just inside the corridor: dist 35 < 20 + 20 + 2 = 42
    const r = canPlace({ x: 100, y: 135 }, 20, { path: PATH, bounds: BOUNDS, ground: () => true, obstacles: [] })
    expect(r).toEqual({ ok: false, reason: 'on-path' })
    expect(PATH_HALF_WIDTH).toBe(20)
  })

  it('blocks overlapping an obstacle (and lets water gods onto water)', () => {
    const obstacles = [
      { id: 'pool', label: 'Pool', shape: { kind: 'circle' as const, x: 100, y: 300, r: 30 }, color: 0, terrain: 'water' as const },
    ]
    expect(canPlace({ x: 100, y: 300 }, 20, { path: PATH, bounds: BOUNDS, ground: () => true, obstacles })).toEqual({
      ok: false,
      reason: 'obstacle',
    })
    // a water god may build there
    expect(canPlace({ x: 100, y: 300 }, 20, { path: PATH, bounds: BOUNDS, ground: () => true, obstacles, terrain: 'water' }).ok).toBe(true)
  })

  it('blocks placing too close to another tower', () => {
    const towers = [{ pos: { x: 100, y: 300 }, footprint: 20 }]
    expect(canPlace({ x: 110, y: 300 }, 20, { path: PATH, bounds: BOUNDS, ground: () => true, obstacles: [], towers })).toEqual({
      ok: false,
      reason: 'too-close',
    })
  })

  it('blocks out-of-bounds', () => {
    expect(canPlace({ x: 5, y: 300 }, 20, { path: PATH, bounds: BOUNDS, ground: () => true, obstacles: [] })).toEqual({
      ok: false,
      reason: 'oob',
    })
  })
})

describe('projectiles', () => {
  it('flies straight along the aimed direction', () => {
    const p = createProjectile({ x: 0, y: 0 }, { x: 1, y: 0 }, 100, 8, 2)
    expect(p.vx).toBeCloseTo(100)
    expect(p.vy).toBeCloseTo(0)
    expect(p.pierceLeft).toBe(2)
    advanceProjectile(p, 0.5)
    expect(p.pos.x).toBeCloseTo(50)
  })

  it('expires when out of pierces or off-bounds', () => {
    const p = createProjectile({ x: 0, y: 0 }, { x: 1, y: 0 }, 100, 8, 2)
    p.pierceLeft = -1
    expect(projectileDone(p, BOUNDS)).toBe(true)
    const q = createProjectile({ x: 0, y: 0 }, { x: 1, y: 0 }, 100, 8, 2)
    q.pos.x = 1000
    expect(projectileDone(q, BOUNDS)).toBe(true)
  })
})

describe('enemy damage-state visuals', () => {
  it('darkens toward black as HP drops, keeping full color at full HP', () => {
    expect(damagedColor(0xffffff, 1)).toBe(0xffffff)
    expect(damagedColor(0xffffff, 0)).toBeLessThan(0xffffff)
    expect(scaleColor(0xffffff, 1)).toBe(0xffffff)
  })

  it('shrinks radius as HP drops', () => {
    expect(damagedRadius(10, 1)).toBeCloseTo(10)
    expect(damagedRadius(10, 0)).toBeCloseTo(6)
    expect(damagedRadius(10, 0.5)).toBeLessThan(10)
  })
})
