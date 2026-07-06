import { describe, it, expect } from 'vitest'
import {
  createLedger,
  canAfford,
  spend,
  earn,
  waveIncome,
  WAVE_INCOME_FLAT_BASE,
  WAVE_INCOME_PER_WAVE,
} from '../src/core/economy/ledger'
import { enemyHp, enemyCount, enemySpeed, waveSpec } from '../src/core/systems/waveManager'
import { foldRunModifiers, BOON_POOL, FIRE_RATE_CAP, DEMETER_INCOME_CAP, boonGod } from '../src/core/run/boons'
import { generateDraft, scheduleNextDraft } from '../src/core/run/draft'
import { GOD_ORDER } from '../src/core/data/towers'
import { BASE_MODIFIERS } from '../src/core/progress/rules'
import type { Modifiers } from '../src/core/progress/types'

describe('ledger', () => {
  it('spends only what it can afford', () => {
    const l = createLedger(250)
    expect(canAfford(l, 200)).toBe(true)
    expect(spend(l, 200)).toBe(true)
    expect(l.gold).toBe(50)
    expect(spend(l, 200)).toBe(false) // too poor, unchanged
    expect(l.gold).toBe(50)
  })

  it('earns non-negative gold and floors the start', () => {
    const l = createLedger(10.9)
    expect(l.gold).toBe(10)
    earn(l, 40)
    expect(l.gold).toBe(50)
    earn(l, -5) // ignored
    expect(l.gold).toBe(50)
  })

  it('waveIncome is flat-only in M3 (interest disabled)', () => {
    expect(waveIncome(1)).toBe(WAVE_INCOME_FLAT_BASE + WAVE_INCOME_PER_WAVE)
    expect(waveIncome(10)).toBe(WAVE_INCOME_FLAT_BASE + WAVE_INCOME_PER_WAVE * 10)
    // banked gold must NOT change the payout while interest is off
    expect(waveIncome(10, 99999)).toBe(waveIncome(10, 0))
  })
})

describe('wave scaling', () => {
  it('HP rises gently now (×1.05 tail), not the old runaway compounding', () => {
    expect(enemyHp(1)).toBe(10)
    for (let n = 2; n <= 60; n++) expect(enemyHp(n)).toBeGreaterThanOrEqual(enemyHp(n - 1))
    expect(enemyHp(40)).toBeLessThan(enemyHp(1) * 15) // ~×11.7 by w40 (piecewise: 1.055 to w20, 1.075 after) — still far below the old ×84
  })

  it('count grows on a sqrt curve under a hard ceiling', () => {
    expect(enemyCount(1)).toBe(8)
    for (let n = 2; n <= 60; n++) expect(enemyCount(n)).toBeGreaterThanOrEqual(enemyCount(n - 1))
    expect(enemyCount(40)).toBeLessThanOrEqual(45) // capped — never an instant lag-bomb
  })

  it('speed rises but is hard-capped at 2× base', () => {
    expect(enemySpeed(1)).toBeGreaterThan(0)
    for (let n = 1; n <= 300; n++) expect(enemySpeed(n)).toBeLessThanOrEqual(120)
    expect(enemySpeed(300)).toBe(120)
  })

  it('waveSpec returns groups whose total count matches the budget', () => {
    const s = waveSpec(7)
    expect(s.wave).toBe(7)
    const total = s.groups.reduce((sum, g) => sum + g.count, 0)
    expect(total).toBe(enemyCount(7))
    expect(s.groups.every((g) => g.count > 0)).toBe(true)
  })
})

describe('foldRunModifiers', () => {
  const meta: Modifiers = { ...BASE_MODIFIERS, towerDamageMul: 1.2 }
  const fx = (id: string) => BOON_POOL.find((b) => b.id === id)!.effect

  it('seeds from the meta tree and stacks persistent leaf effects', () => {
    const rm = foldRunModifiers(meta, [
      fx('off-divine-wrath'), // towerDamageMul 1.15
      fx('core-zeus-king-of-storms'), // godDamageMul zeus 1.3
      fx('eco-tithe-of-the-fallen'), // goldPerKillAdd 2
    ])
    expect(rm.towerDamageMul).toBeCloseTo(1.2 * 1.15)
    expect(rm.godDamageMul.zeus).toBeCloseTo(1.3)
    expect(rm.godDamageMul.apollo).toBe(1)
    expect(rm.goldPerKillBonus).toBe(2)
  })

  it('does NOT mutate the persisted meta modifiers', () => {
    const before = { ...meta }
    foldRunModifiers(meta, [fx('off-divine-wrath'), fx('eco-tithe-of-the-fallen')])
    expect(meta).toEqual(before)
  })

  it('soft-caps multiplicative fire-rate so an endless run cannot break', () => {
    const haste = fx('util-festival-of-dionysus') // fireRateMul 1.35
    const rm = foldRunModifiers(BASE_MODIFIERS, Array(20).fill(haste))
    expect(rm.fireRateMul).toBe(FIRE_RATE_CAP)
  })

  it('folds the M11 per-god signature effects to their run modifiers', () => {
    const rm = foldRunModifiers(BASE_MODIFIERS, [
      fx('core-demeter-golden-harvest'), // demeterIncomeMul 1.6
      fx('core-poseidon-riptide'), // knockbackMul 1.8
      fx('core-athena-far-sight'), // auraRangeMul 1.4
      fx('core-aphrodite-rapture'), // charmTargetsAdd 2
      fx('core-hephaestus-forge-everlasting'), // spikeChargesAdd 2
    ])
    expect(rm.demeterIncomeMul).toBeCloseTo(1.6)
    expect(rm.knockbackMul).toBeCloseTo(1.8)
    expect(rm.auraRangeMul).toBeCloseTo(1.4)
    expect(rm.charmTargetsAdd).toBe(2)
    expect(rm.spikeChargesAdd).toBe(2)
  })

  it('soft-caps the per-god muls so endless stacking cannot break (adds stay uncapped)', () => {
    const rm = foldRunModifiers(BASE_MODIFIERS, Array(10).fill(fx('core-demeter-golden-harvest')))
    expect(rm.demeterIncomeMul).toBe(DEMETER_INCOME_CAP)
  })
})

describe('boonGod — per-god dead-card filter (M11)', () => {
  const g = (id: string) => boonGod(BOON_POOL.find((b) => b.id === id)!)

  it('maps every per-god signature boon to its god, and globals to null', () => {
    expect(g('core-zeus-king-of-storms')).toBe('zeus')
    expect(g('core-apollo-noon-glare')).toBe('apollo')
    expect(g('core-demeter-golden-harvest')).toBe('demeter')
    expect(g('core-poseidon-riptide')).toBe('poseidon')
    expect(g('core-athena-far-sight')).toBe('athena')
    expect(g('core-aphrodite-rapture')).toBe('aphrodite')
    expect(g('core-hephaestus-forge-everlasting')).toBe('hephaestus')
    expect(g('core-hermes-winged-heels')).toBe('hermes')
    expect(g('off-divine-wrath')).toBeNull() // a global boon belongs to no god
  })

  it('every god in the roster now has at least one signature boon', () => {
    const covered = new Set(BOON_POOL.map(boonGod).filter(Boolean))
    for (const god of GOD_ORDER) expect(covered.has(god)).toBe(true)
  })
})

describe('draft', () => {
  // deterministic RNG cycling through a fixed sequence
  const seq = (values: number[]) => {
    let i = 0
    return () => values[i++ % values.length]
  }

  it('offers exactly 3 DISTINCT boons, none before wave 1', () => {
    const opts = generateDraft(5, seq([0.1, 0.4, 0.7, 0.2, 0.9]))
    expect(opts).toHaveLength(3)
    expect(opts.every((o) => o.type === 'boon')).toBe(true)
    const ids = opts.map((o) => (o.type === 'boon' ? o.boon.id : ''))
    expect(new Set(ids).size).toBe(3)
  })

  it('schedules the next draft every 5 waves', () => {
    expect(scheduleNextDraft(0)).toBe(5)
    expect(scheduleNextDraft(10)).toBe(15)
  })

  it('gates legendaries behind wave 15 (protects the teach zone)', () => {
    const legendaryIds = new Set(BOON_POOL.filter((b) => b.rarity === 'legendary').map((b) => b.id))
    expect(legendaryIds.size).toBeGreaterThan(0)
    // Draw the WHOLE pool (count = pool size) so eligibility, not luck, decides what surfaces.
    const idsAt = (w: number) =>
      new Set(generateDraft(w, seq([0.5, 0.1, 0.9, 0.3]), BOON_POOL.length).map((o) => (o.type === 'boon' ? o.boon.id : '')))
    const early = idsAt(14)
    expect([...legendaryIds].some((id) => early.has(id))).toBe(false) // none before w15
    const deep = idsAt(15)
    expect([...legendaryIds].every((id) => deep.has(id))).toBe(true) // all eligible at w15
  })
})
