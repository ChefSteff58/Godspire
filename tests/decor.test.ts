import { describe, expect, it } from 'vitest'
import { scatterDecor } from '../src/game/render/decor'
import { isBuildableGround, terrainAt, RIFT, GATE } from '../src/core/map/terrain'
import { distToPolyline, pointInPoly, PATH_HALF_WIDTH } from '../src/core/map/placement'
import { OLYMPUS_PATH } from '../src/core/map/path'
import { OBSTACLES } from '../src/core/map/obstacles'

const KEYS = {
  grim: ['obj_decor_bones', 'obj_decor_shield'],
  stone: ['obj_decor_stump', 'obj_decor_rock1', 'obj_decor_rock2', 'obj_decor_shrine'],
  grass: ['obj_decor_tuft1', 'obj_decor_tuft2'],
}

const scatter = () => scatterDecor(7, 16, isBuildableGround, terrainAt, OLYMPUS_PATH, OBSTACLES, KEYS)

describe('scatterDecor', () => {
  it('is deterministic: same seed, same dressing, every boot', () => {
    expect(scatter()).toEqual(scatter())
  })

  it('hits a real target count on the actual map', () => {
    const d = scatter()
    expect(d.length).toBeGreaterThanOrEqual(10)
    expect(d.length).toBeLessThanOrEqual(16)
  })

  it('every piece obeys ALL placement constraints', () => {
    for (const p of scatter()) {
      expect(isBuildableGround(p.x, p.y), `${p.key} on chasm at (${p.x},${p.y})`).toBe(true)
      expect(distToPolyline({ x: p.x, y: p.y }, OLYMPUS_PATH)).toBeGreaterThan(PATH_HALF_WIDTH + 17)
      expect(Math.hypot(p.x - RIFT.x, p.y - RIFT.y)).toBeGreaterThanOrEqual(100)
      expect(Math.hypot(p.x - GATE.x, p.y - GATE.y)).toBeGreaterThanOrEqual(100)
      for (const o of OBSTACLES) {
        if (o.shape.kind === 'poly') expect(pointInPoly({ x: p.x, y: p.y }, o.shape.points)).toBe(false)
      }
      expect(p.sizePx).toBeGreaterThanOrEqual(16)
      expect(p.sizePx).toBeLessThanOrEqual(28)
    }
  })

  it('pieces keep their distance from each other (≥40px)', () => {
    const d = scatter()
    for (let i = 0; i < d.length; i++) {
      for (let j = i + 1; j < d.length; j++) {
        expect(Math.hypot(d[i].x - d[j].x, d[i].y - d[j].y)).toBeGreaterThanOrEqual(40)
      }
    }
  })

  it('tufts only grow on grass; grim pieces skew toward the rift half', () => {
    const d = scatterDecor(7, 40, isBuildableGround, terrainAt, OLYMPUS_PATH, OBSTACLES, KEYS)
    for (const p of d) {
      if (p.key.includes('tuft')) expect(terrainAt(p.x, p.y)).toBe('grass')
    }
    const grim = d.filter((p) => KEYS.grim.includes(p.key))
    if (grim.length >= 4) {
      const westGrim = grim.filter((p) => p.x < 480).length
      expect(westGrim).toBeGreaterThanOrEqual(grim.length / 2)
    }
  })

  it('returns nothing when no art keys exist (missing PNGs never break the map)', () => {
    expect(scatterDecor(7, 16, isBuildableGround, terrainAt, OLYMPUS_PATH, OBSTACLES, { grim: [], stone: [], grass: [] })).toEqual([])
  })
})
