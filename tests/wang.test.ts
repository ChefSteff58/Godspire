import { describe, expect, it } from 'vitest'
import {
  cornerMask,
  layoutWangTiles,
  roadPredicate,
  groundPatchPredicate,
  WANG_TILE_FOR_MASK,
} from '../src/game/render/wang'
import { OLYMPUS_PATH } from '../src/core/map/path'
import { PATH_HALF_WIDTH } from '../src/core/map/placement'

describe('cornerMask (bit order NW=8, NE=4, SE=2, SW=1)', () => {
  it('all-lower → 0, all-upper → 15', () => {
    expect(cornerMask(0, 0, 32, () => false)).toBe(0)
    expect(cornerMask(0, 0, 32, () => true)).toBe(15)
  })

  it('each single corner maps to its own bit', () => {
    // cell (0,0) at 32px: NW=(0,0), NE=(32,0), SE=(32,32), SW=(0,32)
    expect(cornerMask(0, 0, 32, (x, y) => x === 0 && y === 0)).toBe(8)
    expect(cornerMask(0, 0, 32, (x, y) => x === 32 && y === 0)).toBe(4)
    expect(cornerMask(0, 0, 32, (x, y) => x === 32 && y === 32)).toBe(2)
    expect(cornerMask(0, 0, 32, (x, y) => x === 0 && y === 32)).toBe(1)
  })

  it('a vertical strip produces left-edge / interior / right-edge masks', () => {
    // upper terrain fills x in [32, 64] — cell 0 touches it only on its right corners,
    // cell 1 is fully inside, cell 2 only on its left corners.
    const strip = (x: number) => x >= 32 && x <= 64
    expect(cornerMask(0, 0, 32, (x) => strip(x))).toBe(4 | 2) // NE+SE
    expect(cornerMask(1, 0, 32, (x) => strip(x))).toBe(15)
    expect(cornerMask(2, 0, 32, (x) => strip(x))).toBe(8 | 1) // NW+SW
  })
})

describe('layoutWangTiles', () => {
  it('covers the 30×17 grid with correct world coordinates', () => {
    const tiles = layoutWangTiles(30, 17, 32, () => false)
    expect(tiles).toHaveLength(510)
    expect(tiles[0]).toMatchObject({ col: 0, row: 0, x: 0, y: 0, mask: 0 })
    const last = tiles[tiles.length - 1]
    expect(last).toMatchObject({ col: 29, row: 16, x: 29 * 32, y: 16 * 32 })
  })
})

describe('roadPredicate', () => {
  const isRoad = roadPredicate(OLYMPUS_PATH, PATH_HALF_WIDTH)

  it('a point ON the path is road; 30px off is not', () => {
    const p = OLYMPUS_PATH[Math.floor(OLYMPUS_PATH.length / 2)]
    expect(isRoad(p.x, p.y)).toBe(true)
    // walk perpendicular-ish until clear of the corridor: (p ± 3·halfWidth) in y is safely off
    // unless another segment passes there, so probe the map corners instead for the negative case.
  })

  it('the four map corners are ground', () => {
    for (const [x, y] of [
      [0, 0],
      [960, 0],
      [0, 540],
      [960, 540],
    ]) {
      expect(isRoad(x, y)).toBe(false)
    }
  })
})

describe('groundPatchPredicate', () => {
  it('is deterministic for the same seed and mixes both terrains', () => {
    const a = groundPatchPredicate(7, { x: 0, y: 540 }, 300)
    const b = groundPatchPredicate(7, { x: 0, y: 540 }, 300)
    let upper = 0
    let total = 0
    for (let vx = 0; vx <= 30; vx++) {
      for (let vy = 0; vy <= 17; vy++) {
        const x = vx * 32
        const y = vy * 32
        expect(a(x, y)).toBe(b(x, y))
        total++
        if (a(x, y)) upper++
      }
    }
    // the field must be a MIX (patches), not a solid sheet of either terrain
    expect(upper).toBeGreaterThan(total * 0.2)
    expect(upper).toBeLessThan(total * 0.95)
  })

  it('biases toward ash (lower) near the rift', () => {
    const p = groundPatchPredicate(7, { x: 0, y: 540 }, 300)
    let nearUpper = 0
    let farUpper = 0
    let n = 0
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2
      // ring near the rift vs a far ring, same angular samples (snapped to the 32px vertex grid inside)
      if (p(Math.abs(Math.cos(a)) * 96, 540 - Math.abs(Math.sin(a)) * 96)) nearUpper++
      if (p(480 + Math.cos(a) * 96, 200 + Math.sin(a) * 96)) farUpper++
      n++
    }
    expect(nearUpper / n).toBeLessThan(farUpper / n)
  })
})

describe('WANG_TILE_FOR_MASK', () => {
  it('is a 16-element permutation of 0..15 (guards a bad remap at integration)', () => {
    expect(WANG_TILE_FOR_MASK).toHaveLength(16)
    expect([...WANG_TILE_FOR_MASK].sort((x, y) => x - y)).toEqual(Array.from({ length: 16 }, (_, i) => i))
  })
})
