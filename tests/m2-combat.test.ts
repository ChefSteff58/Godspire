import { describe, it, expect } from 'vitest'
import { selectTarget } from '../src/core/systems/targeting'
import { createEnemy, damageEnemy, type Enemy } from '../src/core/entities/enemy'
import { createTower } from '../src/core/entities/tower'

// Resolve enemy positions along a horizontal line: x = pathT * 100, y = 0.
const posOf = (e: Enemy) => ({ x: e.pathT * 100, y: 0 })

function enemyAt(pathT: number, hp = 10): Enemy {
  const e = createEnemy()
  e.pathT = pathT
  e.hp = hp
  return e
}

describe('selectTarget', () => {
  const tower = { pos: { x: 0, y: 0 }, range: 50 } // reaches x ≤ 50, i.e. pathT ≤ 0.5

  it('returns null when no enemy is in range', () => {
    expect(selectTarget(tower, [enemyAt(0.8)], posOf)).toBeNull()
    expect(selectTarget(tower, [], posOf)).toBeNull()
  })

  it("'first' picks the enemy furthest along the path that is in range", () => {
    const a = enemyAt(0.1)
    const b = enemyAt(0.4)
    const c = enemyAt(0.9) // out of range
    expect(selectTarget(tower, [a, b, c], posOf, 'first')).toBe(b)
  })

  it("'closest' picks the nearest in-range enemy", () => {
    const a = enemyAt(0.1)
    const b = enemyAt(0.4)
    expect(selectTarget(tower, [a, b], posOf, 'closest')).toBe(a)
  })

  it("'strongest' picks the highest-hp in-range enemy", () => {
    const a = enemyAt(0.2, 5)
    const b = enemyAt(0.3, 20)
    expect(selectTarget(tower, [a, b], posOf, 'strongest')).toBe(b)
  })
})

describe('damageEnemy', () => {
  it('reduces hp and reports death at or below 0', () => {
    const e = enemyAt(0.5, 10)
    expect(damageEnemy(e, 4)).toBe(false)
    expect(e.hp).toBe(6)
    expect(damageEnemy(e, 6)).toBe(true)
    expect(e.hp).toBeLessThanOrEqual(0)
  })
})

describe('createTower', () => {
  it('builds a Zeus with stats from the data table', () => {
    const t = createTower('zeus', { x: 10, y: 20 })
    expect(t.god).toBe('zeus')
    expect(t.pos).toEqual({ x: 10, y: 20 })
    expect(t.range).toBeGreaterThan(0)
    expect(t.damage).toBeGreaterThan(0)
    expect(t.cooldown).toBe(0)
    expect(t.targeting).toBe('first')
  })
})
