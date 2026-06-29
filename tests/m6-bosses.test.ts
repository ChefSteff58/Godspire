import { describe, it, expect } from 'vitest'
import { waveSpec } from '../src/core/systems/waveManager'
import { bossForWave, bossOccurrence, bossScaledStats, BOSS_ROSTER, bossById } from '../src/core/data/bosses'
import { createEnemy, damageEnemy, applySlow, advanceEnemy, onDeath } from '../src/core/entities/enemy'

describe('boss cadence (every 20 waves, cycling)', () => {
  it('no boss except on a multiple of 20', () => {
    expect(bossForWave(9)).toBeNull()
    expect(bossForWave(10)).toBeNull() // every-10 is an elite surge, but bosses are every 20
    expect(bossForWave(19)).toBeNull()
    expect(bossForWave(0)).toBeNull()
    expect(bossForWave(20)).not.toBeNull()
  })

  it('cycles the roster in order and repeats', () => {
    expect(bossForWave(20)!.id).toBe('nemean')
    expect(bossForWave(40)!.id).toBe('minotaur')
    expect(bossForWave(60)!.id).toBe('cyclops')
    expect(bossForWave(80)!.id).toBe('nemean') // wraps back, now occurrence 3
  })

  it('occurrence counts up every 20 waves', () => {
    expect(bossOccurrence(20)).toBe(0)
    expect(bossOccurrence(40)).toBe(1)
    expect(bossOccurrence(80)).toBe(3)
  })
})

describe('boss scaling (stronger each recurrence)', () => {
  it('a later occurrence of the same boss is much tougher', () => {
    const nemean = bossById('nemean')
    const early = bossScaledStats(nemean, 0, 25, 50) // ~wave 20 base
    const late = bossScaledStats(nemean, 3, 476, 50) // ~wave 80 base (wraps to nemean)
    expect(late.hp).toBeGreaterThan(early.hp * 3)
    expect(late.bounty).toBeGreaterThan(early.bounty) // reward scales too
    expect(late.damageCap!).toBeGreaterThan(early.damageCap!) // cap stays relevant vs rising DPS
    expect(early.leakWeight).toBe(late.leakWeight) // leak cost is FIXED (never a late one-shot)
  })
})

describe('boss injection into the wave spec', () => {
  it('appends exactly one boss as the LAST group on a boss wave', () => {
    const spec = waveSpec(20)
    const last = spec.groups[spec.groups.length - 1]
    expect(last.kind).toBe('boss')
    expect(last.count).toBe(1)
    expect(last.bossId).toBe('nemean')
    expect(spec.groups.filter((g) => g.kind === 'boss')).toHaveLength(1)
  })

  it('a non-boss wave has no boss group', () => {
    expect(waveSpec(19).groups.some((g) => g.kind === 'boss')).toBe(false)
    expect(waveSpec(21).groups.some((g) => g.kind === 'boss')).toBe(false)
  })
})

describe('Nemean damage cap (in damageEnemy)', () => {
  const boss = () => {
    const e = createEnemy('boss')
    e.bossId = 'nemean'
    e.hp = 1000
    e.maxHp = 1000
    e.armor = 10
    e.damageCap = 80
    return e
  }

  it('clamps a huge single hit to the cap, then subtracts armor', () => {
    const e = boss()
    damageEnemy(e, 5000) // capped to 80, minus armor 10 → 70
    expect(e.hp).toBe(930)
  })

  it('a sub-cap hit takes full (post-armor) damage', () => {
    const e = boss()
    damageEnemy(e, 50) // under the cap → max(1, 50-10) = 40
    expect(e.hp).toBe(960)
  })

  it('is never literally unkillable (min-1 floor still applies)', () => {
    const e = boss()
    damageEnemy(e, 5) // max(1, min(5,80)-10) = max(1,-5) = 1
    expect(e.hp).toBe(999)
  })

  it('normal enemies are unaffected (no damageCap)', () => {
    const skel = createEnemy('skeleton')
    skel.hp = 100
    damageEnemy(skel, 30)
    expect(skel.hp).toBe(70)
  })
})

describe('Minotaur CC-resist (in applySlow)', () => {
  it('a slow is weakened by slowResist (Minotaur shrugs off half)', () => {
    const e = createEnemy('boss')
    e.bossId = 'minotaur'
    e.slowResist = 0.5
    applySlow(e, 0.55, 600) // Aphrodite's slow → blended toward 1 by the resisted half
    expect(e.slowMul).toBeCloseTo(0.775) // 1 - (1-0.55)*(1-0.5)
  })

  it('slowResist 1 = fully immune; undefined = full slow (normal enemies unaffected)', () => {
    const immune = createEnemy('boss')
    immune.slowResist = 1
    applySlow(immune, 0.5, 600)
    expect(immune.slowMul).toBe(1) // no slow lands

    const normal = createEnemy('skeleton')
    applySlow(normal, 0.5, 600)
    expect(normal.slowMul).toBe(0.5) // unchanged behavior
  })
})

describe('Minotaur charge (in advanceEnemy)', () => {
  it('sprints at burstMul during the window, then settles back to base speed', () => {
    const e = createEnemy('boss')
    e.bossId = 'minotaur'
    e.speed = 50
    e.baseSpeed = 50
    e.charge = { periodMs: 1000, burstMul: 2, durationMs: 400 }
    e.chargeTimerMs = 1000
    const big = 1e9 // huge path length so it never leaks during the test
    advanceEnemy(e, 0.5, big) // 500ms in: timer 1000→500, no burst yet
    expect(e.speed).toBe(50)
    advanceEnemy(e, 0.6, big) // 1100ms total: timer crosses 0 → CHARGE
    expect(e.speed).toBe(100) // 50 × 2
    advanceEnemy(e, 0.5, big) // 500ms into the 400ms burst → it ends
    expect(e.speed).toBe(50)
  })

  it('a non-charging enemy is untouched by the tick', () => {
    const e = createEnemy('skeleton')
    e.speed = 60
    advanceEnemy(e, 0.1, 1e9)
    expect(e.speed).toBe(60)
  })
})

describe('Cyclops on-death adds (in onDeath)', () => {
  it('a slain Cyclops bursts into adds at its death point', () => {
    const e = createEnemy('boss')
    e.bossId = 'cyclops'
    e.maxHp = 3000
    e.pathT = 0.6
    const adds = onDeath(e)
    expect(adds).toHaveLength(4) // BOSS_ROSTER cyclops.mechanic.onDeathAdds
    expect(adds.every((a) => a.kind === 'skeleton')).toBe(true)
    expect(adds.every((a) => a.spawnAtT === 0.6)).toBe(true) // born where the brute fell
    expect(adds[0].hp).toBeGreaterThan(0)
    expect(adds[0].hp).toBeLessThan(e.maxHp) // adds are chaff, not a second boss
  })

  it('non-add bosses (Nemean / Minotaur) leave nothing behind', () => {
    const nem = createEnemy('boss'); nem.bossId = 'nemean'
    const min = createEnemy('boss'); min.bossId = 'minotaur'
    expect(onDeath(nem)).toEqual([])
    expect(onDeath(min)).toEqual([])
  })

  it('Hydra split is unchanged (regression)', () => {
    const h = createEnemy('hydra')
    h.maxHp = 100
    expect(onDeath(h)).toHaveLength(2)
    expect(onDeath(createEnemy('shade'))).toEqual([])
  })
})

describe('roster integrity', () => {
  it('has the 3 archetypes with required visuals + mechanics', () => {
    expect(BOSS_ROSTER.map((b) => b.id)).toEqual(['nemean', 'minotaur', 'cyclops'])
    for (const b of BOSS_ROSTER) {
      expect(b.radius).toBeGreaterThan(15) // bigger than any normal enemy
      expect(b.leakWeight).toBeGreaterThan(10) // a leak is a disaster
      expect(b.bounty).toBeGreaterThan(50) // killing it pays well
    }
  })
})
