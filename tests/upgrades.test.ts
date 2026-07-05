import { describe, it, expect } from 'vitest'
import {
  foldUpgrades,
  towerEffectiveStats,
  auraBuff,
  demeterIncome,
  nextTier,
  canUpgradePath,
} from '../src/core/data/upgrades'
import { createTower, type Tower } from '../src/core/entities/tower'
import { TOWER_STATS } from '../src/core/data/towers'

const tower = (god: 'zeus' | 'apollo' | 'demeter' | 'hermes' | 'hephaestus' | 'poseidon' | 'aphrodite' | 'athena', a = 0, b = 0): Tower => {
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

describe('Hephaestus deployable', () => {
  it('has a base trap capacity that the Caltrop Forge path grows', () => {
    expect(TOWER_STATS.hephaestus.deployable?.maxCharges).toBe(6)
    expect(towerEffectiveStats(tower('hephaestus')).maxCharges).toBe(6)
    expect(towerEffectiveStats(tower('hephaestus', 1, 0)).maxCharges).toBe(6 + 4) // Sharpened Spikes
    expect(towerEffectiveStats(tower('hephaestus', 2, 0)).maxCharges).toBe(6 + 4 + 6) // + Bronze Caltrops
  })

  it('non-deployable gods report 0 capacity', () => {
    expect(towerEffectiveStats(tower('zeus')).maxCharges).toBe(0)
  })
})

describe('Poseidon AoE', () => {
  it('has a base blast + knockback that the Tsunami path widens', () => {
    expect(TOWER_STATS.poseidon.splash?.radius).toBe(55)
    expect(TOWER_STATS.poseidon.requiresWater).toBe(true)
    const base = towerEffectiveStats(tower('poseidon'))
    expect(base.splashRadius).toBe(55)
    expect(base.knockback).toBeCloseTo(0.018) // retuned 2026-07: 0.03 (~66px/hit) near-stalled heavies
    const t1 = towerEffectiveStats(tower('poseidon', 1, 0)) // Breaker Wave: +30% radius, +30% knockback
    expect(t1.splashRadius).toBeCloseTo(55 * 1.3)
    expect(t1.knockback).toBeCloseTo(0.018 * 1.3)
  })

  it('non-AoE gods report 0 splash', () => {
    expect(towerEffectiveStats(tower('zeus')).splashRadius).toBe(0)
  })
})

describe('Aphrodite slow aura', () => {
  it('Winter (B) deepens the slow, floored so foes never fully stop', () => {
    expect(TOWER_STATS.aphrodite.slowAura?.mul).toBe(0.55)
    expect(towerEffectiveStats(tower('aphrodite')).slowMul).toBeCloseTo(0.55)
    expect(towerEffectiveStats(tower('aphrodite', 0, 1)).slowMul).toBeCloseTo(0.55 * 0.7) // First Frost
    expect(towerEffectiveStats(tower('aphrodite', 0, 3)).slowMul).toBeGreaterThanOrEqual(0.15) // floored
  })

  it('charms a capped crowd; Glue & Charm (A) widens the cap, not the depth', () => {
    expect(TOWER_STATS.aphrodite.slowAura?.maxTargets).toBe(5)
    expect(towerEffectiveStats(tower('aphrodite')).slowTargets).toBe(5)
    expect(towerEffectiveStats(tower('aphrodite', 1, 0)).slowTargets).toBe(5 + 2) // Sticky Heart
    expect(towerEffectiveStats(tower('aphrodite', 2, 0)).slowTargets).toBe(5 + 2 + 3) // + Sweet Nothings
    // Path A no longer deepens the slow — it stays at base while only the cap grows
    expect(towerEffectiveStats(tower('aphrodite', 2, 0)).slowMul).toBeCloseTo(0.55)
  })
})

describe('Athena support aura', () => {
  it('buffs nearby gods + detects, and the Wisdom path scales the damage buff', () => {
    const base = auraBuff(tower('athena'))!
    expect(base.detect).toBe(true)
    expect(base.damageMul).toBeCloseTo(1.15)
    expect(auraBuff(tower('athena', 1, 0))!.damageMul).toBeCloseTo(1.15 * 1.2) // Battle Hymn
  })

  it('non-support gods have no aura', () => {
    expect(auraBuff(tower('zeus'))).toBeNull()
  })
})

describe('demeterIncome', () => {
  it('is zero for non-Demeter towers', () => {
    expect(demeterIncome(tower('zeus'), 10)).toBe(0)
  })

  it('Cornucopia adds flat per-wave gold (wave-independent)', () => {
    const d = tower('demeter', 2, 0) // +20 +45 (nerf 2026-07-05: base 20, Cornucopia 20/45)
    expect(demeterIncome(d, 1)).toBe(20 + 65)
    expect(demeterIncome(d, 20)).toBe(20 + 65)
  })

  it('Vault scales with the wave number', () => {
    const d = tower('demeter', 0, 1) // Seed Capital: +2 × wave (nerf 2026-07-05: base 20, Vault 2/3/4)
    expect(demeterIncome(d, 10)).toBe(20 + 2 * 10)
    expect(demeterIncome(d, 20)).toBe(20 + 2 * 20)
  })
})
