import { describe, it, expect } from 'vitest'
import { canUnlock, deriveModifiers, emptyProgress } from '../src/core/progress/rules'
import { foldRunModifiers } from '../src/core/run/boons'
import { generateDraft } from '../src/core/run/draft'
import type { PlayerProgress } from '../src/core/progress/types'

const rich = (over: Partial<PlayerProgress> = {}): PlayerProgress => ({
  ...emptyProgress('2020-01-01T00:00:00.000Z'),
  favor: 1_000_000, // plenty of Knowledge Points
  ...over,
})

describe('canUnlock (prereqs + affordability + ownership)', () => {
  it('a prereq-free root is unlockable; its child is gated until the root is owned', () => {
    expect(canUnlock('war_dmg_1', rich())).toBe(true)
    expect(canUnlock('war_dmg_2', rich())).toBe(false) // needs war_dmg_1
    expect(canUnlock('war_dmg_2', rich({ unlockedNodes: ['war_dmg_1'] }))).toBe(true)
  })

  it('refuses an already-owned node and an unknown id', () => {
    expect(canUnlock('war_dmg_1', rich({ unlockedNodes: ['war_dmg_1'] }))).toBe(false)
    expect(canUnlock('does_not_exist', rich())).toBe(false)
  })

  it('refuses when the player lacks the points', () => {
    expect(canUnlock('war_dmg_1', rich({ favor: 0 }))).toBe(false) // 0 points < cost 1
  })

  it('the 4-cost capstone needs its whole chain', () => {
    expect(canUnlock('war_boss', rich({ unlockedNodes: ['war_dmg_3'] }))).toBe(true)
    expect(canUnlock('war_boss', rich({ unlockedNodes: ['war_dmg_1', 'war_dmg_2'] }))).toBe(false)
  })
})

describe('deriveModifiers folds every M6.5 effect kind', () => {
  it('multipliers compound, adds sum, flags set', () => {
    const m = deriveModifiers([
      'war_rate_1', // fireRate 1.06
      'war_boss', // bossDamage 1.30
      'harvest_income_1', // income 1.10
      'harvest_kill_1', // +1 gold/kill
      'wisdom_shield_1', // +3 shields
      'wisdom_draft', // +1 draft option
      'wisdom_secondwind', // second wind
    ])
    expect(m.fireRateMul).toBeCloseTo(1.06)
    expect(m.bossDamageMul).toBeCloseTo(1.5) // Titan-Slayer buffed 1.3→1.5 (fleet retune)
    expect(m.incomeMul).toBeCloseTo(1.1)
    expect(m.goldPerKillAdd).toBe(1)
    expect(m.startingShield).toBe(3)
    expect(m.draftBonusOptions).toBe(1)
    expect(m.secondWindStart).toBe(true)
  })

  it('an empty tree is the base (no buffs)', () => {
    const m = deriveModifiers([])
    expect(m.fireRateMul).toBe(1)
    expect(m.bossDamageMul).toBe(1)
    expect(m.secondWindStart).toBe(false)
  })
})

describe('meta → RunModifiers bridge (foldRunModifiers)', () => {
  it('seeds fire-rate, gold-per-kill, boss damage, and income from the meta', () => {
    const meta = deriveModifiers(['war_rate_2', 'war_boss', 'harvest_kill_2', 'harvest_income_2'])
    const rm = foldRunModifiers(meta, [])
    expect(rm.fireRateMul).toBeCloseTo(1.1)
    expect(rm.goldPerKillBonus).toBe(2)
    expect(rm.bossDamageMul).toBeCloseTo(1.5)
    expect(rm.incomeMul).toBeCloseTo(1.18)
  })
})

describe('Fate Draft luck (generateDraft count)', () => {
  it('defaults to 3 and honors a larger count', () => {
    expect(generateDraft(5, () => 0.5)).toHaveLength(3)
    expect(generateDraft(5, () => 0.5, 4)).toHaveLength(4)
    expect(generateDraft(5, () => 0.5, 4).every((d) => d.type === 'boon')).toBe(true)
  })
})
