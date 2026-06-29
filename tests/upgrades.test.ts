import { describe, it, expect } from 'vitest'
import {
  foldUpgrades,
  towerEffectiveStats,
  demeterIncome,
  nextTier,
  canUpgradePath,
} from '../src/core/data/upgrades'
import { createTower, type Tower } from '../src/core/entities/tower'
import { TOWER_STATS } from '../src/core/data/towers'

const tower = (god: 'zeus' | 'apollo' | 'demeter' | 'hermes', a = 0, b = 0): Tower => {
  const t = createTower(god, { x: 0, y: 0 })
  t.pathA = a
  t.pathB = b
  return t
}

describe('foldUpgrades', () => {
  it('multiplies stat muls and adds pierce across purchased tiers', () => {
    const f = foldUpgrades('zeus', 2, 0) // Stormcaller T1 + T2
    expect(f.fireRateMul).toBeCloseTo(1.4 * 1.3)
    expect(f.damageMul).toBeCloseTo(1.2)
    const a = foldUpgrades('apollo', 1, 0) // Long Draw: +2 pierce
    expect(a.pierceAdd).toBe(2)
  })

  it('starts at identity for an un-upgraded tower', () => {
    const f = foldUpgrades('zeus', 0, 0)
    expect(f).toMatchObject({ damageMul: 1, fireRateMul: 1, rangeMul: 1, pierceAdd: 0 })
  })
})

describe('towerEffectiveStats', () => {
  it('applies upgrades to the base stats', () => {
    const z = tower('zeus', 1, 0) // Forked Spark: +40% fire rate, +10% range
    const eff = towerEffectiveStats(z)
    expect(eff.fireRate).toBeCloseTo(1.5 * 1.4)
    expect(eff.range).toBeCloseTo(135 * 1.1)
    expect(eff.damage).toBe(5) // unchanged at tier 1
  })

  it('Apollo Sunlance adds pierce', () => {
    expect(towerEffectiveStats(tower('apollo', 1, 0)).pierce).toBe(2 + 2)
  })
})

describe('cross-path rule (one main, one secondary capped at tier 1)', () => {
  it('allows either path from scratch', () => {
    expect(canUpgradePath(tower('zeus', 0, 0), 'A')).toBe(true)
    expect(canUpgradePath(tower('zeus', 0, 0), 'B')).toBe(true)
  })

  it('a maxed main still permits the other path to tier 1, then locks it', () => {
    expect(canUpgradePath(tower('zeus', 3, 0), 'B')).toBe(true) // secondary to tier 1 is fine
    expect(canUpgradePath(tower('zeus', 3, 1), 'B')).toBe(false) // can't push the secondary past 1
    expect(canUpgradePath(tower('zeus', 3, 0), 'A')).toBe(false) // main already maxed
  })

  it('blocks a second path from exceeding tier 1', () => {
    expect(canUpgradePath(tower('zeus', 2, 1), 'B')).toBe(false)
    expect(canUpgradePath(tower('zeus', 2, 1), 'A')).toBe(true) // main can still climb
  })

  it('nextTier returns null once a path is maxed', () => {
    expect(nextTier('zeus', 'A', 3)).toBeNull()
    expect(nextTier('zeus', 'A', 0)?.name).toBe('Forked Spark')
  })
})

describe('anti-air (canHitAir)', () => {
  it('Hermes is anti-air at base; Apollo too; Zeus/Demeter are not', () => {
    expect(towerEffectiveStats(tower('hermes')).canHitAir).toBe(true)
    expect(towerEffectiveStats(tower('apollo')).canHitAir).toBe(true)
    expect(towerEffectiveStats(tower('zeus')).canHitAir).toBe(false)
    expect(towerEffectiveStats(tower('demeter')).canHitAir).toBe(false)
  })

  it('the Zeus Stormcaller "Storm Caller" tier GRANTS anti-air', () => {
    expect(foldUpgrades('zeus', 1, 0).grantsAir).toBe(false) // only Forked Spark bought
    expect(foldUpgrades('zeus', 2, 0).grantsAir).toBe(true) // through Storm Caller
    expect(towerEffectiveStats(tower('zeus', 2, 0)).canHitAir).toBe(true)
    // the OTHER path (Tyrant) never grants air
    expect(towerEffectiveStats(tower('zeus', 0, 3)).canHitAir).toBe(false)
  })

  it('Hermes orbits a fixed center (mobile config present)', () => {
    expect(TOWER_STATS.hermes.mobile?.orbitRadius).toBeGreaterThan(0)
    const h = createTower('hermes', { x: 100, y: 200 })
    expect(h.center).toEqual({ x: 100, y: 200 })
    expect(h.orbitPhase).toBe(0)
  })
})

describe('demeterIncome', () => {
  it('is zero for non-Demeter towers', () => {
    expect(demeterIncome(tower('zeus'), 10)).toBe(0)
  })

  it('Cornucopia adds flat per-wave gold (wave-independent)', () => {
    const d = tower('demeter', 2, 0) // +50 +100
    expect(demeterIncome(d, 1)).toBe(50 + 150)
    expect(demeterIncome(d, 20)).toBe(50 + 150)
  })

  it('Vault scales with the wave number', () => {
    const d = tower('demeter', 0, 1) // Seed Capital: +5 × wave
    expect(demeterIncome(d, 10)).toBe(50 + 5 * 10)
    expect(demeterIncome(d, 20)).toBe(50 + 5 * 20)
  })
})
