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

  it('the relocated columns stand on buildable ground (bottom-left stonefield)', () => {
    const cols = OBSTACLES.find((o) => o.id === 'columns')!
    if (cols.shape.kind === 'circle') {
      expect(cols.shape.x).toBe(110)
      expect(cols.shape.y).toBe(470)
      expect(isBuildableGround(cols.shape.x, cols.shape.y)).toBe(true)
    }
  })

  it('the olive itself anchors on buildable ground in its new grass pocket', () => {
    expect(isBuildableGround(olive.pos.x, olive.pos.y)).toBe(true)
  })

  it('Blessed Grove (M11 radiusMul) grows the blessing reach — fire-rate + easter-egg alike', () => {
    const justOut = { x: olive.pos.x + olive.radius + 20, y: olive.pos.y } // outside the normal radius
    expect(siteBuffAt(justOut, undefined, 1).fireRateMul).toBe(1) // no blessing normally
    expect(siteBuffAt(justOut, 'athena', 2).fireRateMul).toBeCloseTo(1.08) // ×2 reach now covers it
    const eggOut = { x: olive.pos.x + olive.easterEgg!.radius + 10, y: olive.pos.y }
    expect(siteBuffAt(eggOut, 'athena', 1).rangeMul).toBe(1)
    expect(siteBuffAt(eggOut, 'athena', 2).rangeMul).toBeCloseTo(1.15) // egg radius grows too
  })

  it("EASTER EGG: it is HER tree — Athena near the trunk sees +15% further", () => {
    const egg = olive.easterEgg!
    expect(egg.god).toBe('athena')
    // inside the tight inner radius: Athena gets the range gift, others get nothing
    const near = { x: olive.pos.x + egg.radius - 1, y: olive.pos.y }
    expect(siteBuffAt(near, 'athena').rangeMul).toBeCloseTo(1.15)
    expect(siteBuffAt(near, 'zeus').rangeMul).toBe(1)
    expect(siteBuffAt(near).rangeMul).toBe(1)
    // outside the inner radius (still inside the fire-rate blessing): no range gift
    const far = { x: olive.pos.x + egg.radius + 5, y: olive.pos.y }
    expect(siteBuffAt(far, 'athena').rangeMul).toBe(1)
    expect(siteBuffAt(far, 'athena').fireRateMul).toBeCloseTo(1.08)
  })
})
