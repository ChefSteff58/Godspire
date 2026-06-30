import { describe, it, expect } from 'vitest'
import { dir8, dirToTarget, dirKey, frameKey } from '../src/game/render/facing'

describe('dir8 — screen-space (+y is down)', () => {
  it('maps the four cardinals', () => {
    expect(dir8(0)).toBe('east')
    expect(dir8(Math.PI / 2)).toBe('south')
    expect(dir8(Math.PI)).toBe('west')
    expect(dir8(-Math.PI / 2)).toBe('north')
  })
  it('maps the four diagonals', () => {
    expect(dir8(Math.PI / 4)).toBe('south-east')
    expect(dir8(-Math.PI / 4)).toBe('north-east')
    expect(dir8((3 * Math.PI) / 4)).toBe('south-west')
    expect(dir8((-3 * Math.PI) / 4)).toBe('north-west')
  })
  it('wraps angles beyond ±π', () => {
    expect(dir8(2 * Math.PI)).toBe('east')
    expect(dir8(-Math.PI)).toBe('west')
  })
})

describe('dirToTarget', () => {
  it('points toward the target in screen space', () => {
    expect(dirToTarget({ x: 0, y: 0 }, { x: 10, y: 0 })).toBe('east')
    expect(dirToTarget({ x: 0, y: 0 }, { x: 0, y: 10 })).toBe('south')
    expect(dirToTarget({ x: 0, y: 0 }, { x: 0, y: -10 })).toBe('north')
    expect(dirToTarget({ x: 0, y: 0 }, { x: -10, y: -10 })).toBe('north-west')
  })
})

describe('texture key helpers', () => {
  it('builds rotation + frame keys', () => {
    expect(dirKey('zeus', 'south')).toBe('zeus_south')
    expect(frameKey('skeleton', 'walk', 'south', 2)).toBe('skeleton_walk_south_2')
  })
})
