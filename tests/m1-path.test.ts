import { describe, it, expect } from 'vitest'
import { PathSystem, OLYMPUS_PATH } from '../src/core/map/path'
import { createEnemy, advanceEnemy } from '../src/core/entities/enemy'

describe('PathSystem', () => {
  const path = new PathSystem(OLYMPUS_PATH)

  it('has a positive total length', () => {
    expect(path.length).toBeGreaterThan(0)
  })

  it('t=0 is the first waypoint, t=1 is the last', () => {
    expect(path.getPointAt(0)).toEqual({ ...OLYMPUS_PATH[0] })
    expect(path.getPointAt(1)).toEqual({ ...OLYMPUS_PATH[OLYMPUS_PATH.length - 1] })
  })

  it('clamps out-of-range t to the endpoints', () => {
    expect(path.getPointAt(-5)).toEqual({ ...OLYMPUS_PATH[0] })
    expect(path.getPointAt(5)).toEqual({ ...OLYMPUS_PATH[OLYMPUS_PATH.length - 1] })
  })

  it('moves up the screen overall (Tartarus → Olympus, y decreases)', () => {
    expect(path.getPointAt(0.9).y).toBeLessThan(path.getPointAt(0.1).y)
  })

  it('interpolates the midpoint of a straight two-point path', () => {
    const p = new PathSystem([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ])
    expect(p.length).toBe(100)
    expect(p.getPointAt(0.5)).toEqual({ x: 50, y: 0 })
  })

  it('throws on fewer than 2 waypoints', () => {
    expect(() => new PathSystem([{ x: 0, y: 0 }])).toThrow()
  })
})

describe('advanceEnemy', () => {
  it('advances pathT by speed*dt/length', () => {
    const e = createEnemy()
    e.speed = 100
    const leaked = advanceEnemy(e, 1, 1000) // 100/1000 = 0.1
    expect(e.pathT).toBeCloseTo(0.1)
    expect(leaked).toBe(false)
  })

  it('clamps to 1 and reports a leak at the end', () => {
    const e = createEnemy()
    e.pathT = 0.95
    e.speed = 100
    const leaked = advanceEnemy(e, 1, 100) // +1.0 → clamps
    expect(e.pathT).toBe(1)
    expect(leaked).toBe(true)
  })
})
