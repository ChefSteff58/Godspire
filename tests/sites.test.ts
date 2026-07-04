import { describe, expect, it } from 'vitest'
import { SITES, siteBuffAt } from '../src/core/map/sites'
import { isBuildableGround } from '../src/core/map/terrain'
import { OBSTACLES } from '../src/core/map/obstacles'

describe('sacred sites (the Olive of Athena)', () => {
  const olive = SITES.find((s) => s.id === 'sacred_olive')!

  it('the site anchors on the olive grove obstacle center', () => {
    const grove = OBSTACLES.find((o) => o.id === 'olive')!
    expect(grove.shape.kind).toBe('rect')
    if (grove.shape.kind === 'rect') {
      expect(olive.pos.x).toBe(grove.shape.x + grove.shape.w / 2)
      expect(olive.pos.y).toBe(grove.shape.y + grove.shape.h / 2)
    }
  })

  it('blesses inside the radius, exactly nothing outside it', () => {
    expect(siteBuffAt({ x: olive.pos.x, y: olive.pos.y }).fireRateMul).toBeCloseTo(1.08)
    expect(siteBuffAt({ x: olive.pos.x + olive.radius - 1, y: olive.pos.y }).fireRateMul).toBeCloseTo(1.08)
    expect(siteBuffAt({ x: olive.pos.x + olive.radius + 1, y: olive.pos.y }).fireRateMul).toBe(1)
    expect(siteBuffAt({ x: 0, y: 0 }).fireRateMul).toBe(1)
  })

  it('the blessing stays SMALL (≤ +10% — sites season, they do not carry)', () => {
    for (const s of SITES) {
      expect(s.effect.fireRateMul ?? 1).toBeLessThanOrEqual(1.1)
    }
  })

  it('the relocated columns stand on buildable ground', () => {
    const cols = OBSTACLES.find((o) => o.id === 'columns')!
    if (cols.shape.kind === 'circle') {
      expect(cols.shape.x).toBe(770)
      expect(isBuildableGround(cols.shape.x, cols.shape.y)).toBe(true)
    }
  })
})
