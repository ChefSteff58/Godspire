import { describe, expect, it } from 'vitest'
import { arcPoints, boltPoints, boltMaxDeviation } from '../src/game/render/fx'

/** Deterministic LCG so bolt shapes are reproducible under test. */
function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

const FROM = { x: 100, y: 100 }
const TO = { x: 300, y: 220 }

describe('boltPoints', () => {
  it('endpoints are NEVER displaced (muzzle → target always connects)', () => {
    const b = boltPoints(FROM, TO, 4, 0.22, lcg(7))
    expect(b.main[0]).toEqual(FROM)
    expect(b.main[b.main.length - 1]).toEqual(TO)
  })

  it('depth d yields 2^d + 1 main points', () => {
    for (const d of [1, 2, 3, 4]) {
      const b = boltPoints(FROM, TO, d, 0.22, lcg(11))
      expect(b.main.length).toBe(2 ** d + 1)
    }
  })

  it('is deterministic under an injected rand', () => {
    const a = boltPoints(FROM, TO, 4, 0.22, lcg(42))
    const b = boltPoints(FROM, TO, 4, 0.22, lcg(42))
    expect(a).toEqual(b)
  })

  it('spawns 1–2 forks, each anchored ON a main point', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const b = boltPoints(FROM, TO, 4, 0.22, lcg(seed))
      expect(b.forks.length).toBeGreaterThanOrEqual(1)
      expect(b.forks.length).toBeLessThanOrEqual(2)
      for (const fork of b.forks) {
        expect(b.main).toContainEqual(fork[0])
        expect(fork.length).toBeGreaterThan(2) // a fork is a tiny bolt, not a bare line
      }
    }
  })

  it('stays inside a sane corridor around the strike line', () => {
    const dist = Math.hypot(TO.x - FROM.x, TO.y - FROM.y)
    for (let seed = 1; seed <= 30; seed++) {
      const b = boltPoints(FROM, TO, 4, 0.22, lcg(seed * 13))
      expect(boltMaxDeviation(b, FROM, TO)).toBeLessThan(dist * 0.4)
    }
  })

  it('clamps degenerate inputs (depth 0 / negative) to a real bolt', () => {
    const b = boltPoints(FROM, TO, 0, 0.22, lcg(3))
    expect(b.main.length).toBe(3) // clamped to depth 1
    expect(b.main[0]).toEqual(FROM)
    expect(b.main[2]).toEqual(TO)
  })

  it('zero-length strikes do not blow up (NaN guard)', () => {
    const b = boltPoints(FROM, FROM, 4, 0.22, lcg(5))
    for (const p of b.main) {
      expect(Number.isFinite(p.x)).toBe(true)
      expect(Number.isFinite(p.y)).toBe(true)
    }
  })
})

describe('arcPoints (bounded tessellation for the crescent wave)', () => {
  it('returns n+1 points, endpoints exactly on the arc bounds', () => {
    const pts = arcPoints(0, 0, 100, 0, Math.PI / 2, 20)
    expect(pts.length).toBe(21)
    expect(pts[0].x).toBeCloseTo(100)
    expect(pts[0].y).toBeCloseTo(0)
    expect(pts[20].x).toBeCloseTo(0)
    expect(pts[20].y).toBeCloseTo(100)
  })

  it('every point sits ON the circle', () => {
    const pts = arcPoints(50, -20, 75, -0.8, 1.3, 16)
    for (const p of pts) {
      expect(Math.hypot(p.x - 50, p.y + 20)).toBeCloseTo(75)
    }
  })

  it('clamps degenerate n to a drawable minimum', () => {
    expect(arcPoints(0, 0, 10, 0, 1, 0).length).toBe(3)
  })
})
