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

  it('produces a continuous, in-bounds smooth path', () => {
    for (let t = 0; t <= 1; t += 0.1) {
      const p = path.getPointAt(t)
      expect(p.x).toBeGreaterThan(-80)
      expect(p.x).toBeLessThan(1080)
      expect(p.y).toBeGreaterThan(-40)
      expect(p.y).toBeLessThan(580)
    }
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

  it('spot-checks getPointAt on a known 3-segment path at t = 0, mid-segment values, and 1', () => {
    // Segments: (0,0)→(100,0)→(100,100)→(200,100), each 100 long → total 300.
    const p = new PathSystem([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ])
    expect(p.length).toBe(300)
    expect(p.getPointAt(0)).toEqual({ x: 0, y: 0 })
    const cases: [number, { x: number; y: number }][] = [
      [0.25, { x: 75, y: 0 }], // 75px in — mid first segment
      [1 / 3, { x: 100, y: 0 }], // exactly the first corner
      [0.5, { x: 100, y: 50 }], // mid second segment
      [0.75, { x: 125, y: 100 }], // a quarter into the third segment
      [5 / 6, { x: 150, y: 100 }], // mid third segment
    ]
    for (const [t, want] of cases) {
      const got = p.getPointAt(t)
      expect(got.x).toBeCloseTo(want.x, 9)
      expect(got.y).toBeCloseTo(want.y, 9)
    }
    expect(p.getPointAt(1)).toEqual({ x: 200, y: 100 })
  })

  it('binary-searched lookup matches a reference linear scan across the real map path', () => {
    // Oracle: the original pre-binary-search linear scan, rebuilt here over the same vertices.
    const cum = [0]
    let total = 0
    for (let i = 1; i < OLYMPUS_PATH.length; i++) {
      total += Math.hypot(
        OLYMPUS_PATH[i].x - OLYMPUS_PATH[i - 1].x,
        OLYMPUS_PATH[i].y - OLYMPUS_PATH[i - 1].y,
      )
      cum.push(total)
    }
    const linear = (t: number) => {
      const target = Math.max(0, Math.min(1, t)) * total
      for (let i = 1; i < cum.length; i++) {
        if (target <= cum[i]) {
          const segStart = cum[i - 1]
          const segLen = cum[i] - segStart || 1
          const f = (target - segStart) / segLen
          const a = OLYMPUS_PATH[i - 1]
          const b = OLYMPUS_PATH[i]
          return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }
        }
      }
      const last = OLYMPUS_PATH[OLYMPUS_PATH.length - 1]
      return { x: last.x, y: last.y }
    }
    for (const t of [0, 0.01, 0.1, 0.25, 1 / 3, 0.5, 0.618, 0.75, 0.9, 0.999, 1]) {
      const got = path.getPointAt(t)
      const want = linear(t)
      expect(got.x).toBeCloseTo(want.x, 9)
      expect(got.y).toBeCloseTo(want.y, 9)
    }
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
