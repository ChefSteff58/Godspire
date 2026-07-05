import { describe, it, expect } from 'vitest'
import { selectTarget } from '../src/core/systems/targeting'
import { createEnemy, damageEnemy, onDeath, applySlow, advanceEnemy, SPLIT_DEPTH_CAP, type Enemy } from '../src/core/entities/enemy'
import { enemyCounts, waveSpec, wavePreview, enemyHpMul, enemyCount, weightAt, isEliteWave, COUNT_CEILING } from '../src/core/systems/waveManager'
import { TOWER_STATS } from '../src/core/data/towers'

const posOf = (e: Enemy) => ({ x: e.pathT * 100, y: 0 })
const at = (kind: Parameters<typeof createEnemy>[0], pathT: number): Enemy => {
  const e = createEnemy(kind)
  e.pathT = pathT
  return e
}

describe('flying / anti-air gate', () => {
  const tower = { pos: { x: 0, y: 0 }, range: 1000 }

  it('a ground-only tower (canHitAir:false) cannot acquire a flying enemy', () => {
    const harpy = at('harpy', 0.3)
    expect(selectTarget({ ...tower, canHitAir: false }, [harpy], posOf)).toBeNull()
  })

  it('an anti-air tower (canHitAir:true) can acquire it', () => {
    const harpy = at('harpy', 0.3)
    expect(selectTarget({ ...tower, canHitAir: true }, [harpy], posOf)).toBe(harpy)
  })

  it('an unspecified tower can hit anything (undefined ≠ false)', () => {
    const harpy = at('harpy', 0.3)
    expect(selectTarget(tower, [harpy], posOf)).toBe(harpy)
  })

  it('a ground-only tower still targets ground enemies past a flier', () => {
    const harpy = at('harpy', 0.9)
    const skeleton = at('skeleton', 0.4)
    expect(selectTarget({ ...tower, canHitAir: false }, [harpy, skeleton], posOf, 'first')).toBe(skeleton)
  })

  it('the tower DATA declares the flags explicitly (Zeus must be false, not undefined)', () => {
    // Regression guard: the fire loop passes TOWER_STATS[god].canHitAir, and the gate is `=== false`,
    // so an undefined Zeus flag would let Zeus hit air. Both must be set.
    expect(TOWER_STATS.zeus.canHitAir).toBe(false)
    expect(TOWER_STATS.apollo.canHitAir).toBe(true)
  })
})

describe('stealth / detection gate', () => {
  const tower = { pos: { x: 0, y: 0 }, range: 1000 }

  it('a non-detector cannot acquire a stealth enemy; a detector can', () => {
    const gorgon = at('gorgon', 0.3)
    expect(createEnemy('gorgon').stealth).toBe(true)
    expect(selectTarget(tower, [gorgon], posOf)).toBeNull() // no canDetect
    expect(selectTarget({ ...tower, canDetect: true }, [gorgon], posOf)).toBe(gorgon)
  })

  it('detection does not break targeting of normal enemies', () => {
    const skel = at('skeleton', 0.3)
    expect(selectTarget(tower, [skel], posOf)).toBe(skel)
  })
})

describe('flat armor', () => {
  it('subtracts armor with a min-1 floor (never unkillable)', () => {
    const talos = createEnemy('talos') // armor 6
    talos.hp = 100
    expect(damageEnemy(talos, 8)).toBe(false)
    expect(talos.hp).toBe(98) // 8 − 6 = 2
    talos.hp = 100
    damageEnemy(talos, 5) // 5 − 6 → floored to 1
    expect(talos.hp).toBe(99)
  })

  it('unarmored enemies take full damage', () => {
    const shade = createEnemy('shade')
    shade.hp = 10
    expect(damageEnemy(shade, 4)).toBe(false)
    expect(shade.hp).toBe(6)
  })
})

describe('Hydra splits (onDeath)', () => {
  it('a Hydra leaves 2 children at its death point with reduced stats', () => {
    const hydra = createEnemy('hydra')
    hydra.maxHp = 100
    hydra.pathT = 0.5
    hydra.bounty = 9
    const kids = onDeath(hydra)
    expect(kids).toHaveLength(2)
    expect(kids[0].kind).toBe('hydra')
    expect(kids[0].splitDepth).toBe(1)
    expect(kids[0].spawnAtT).toBe(0.5)
    expect(kids[0].hp).toBe(45) // 0.45 × maxHp
    expect(kids[0].bounty).toBeLessThan(9)
  })

  it('terminates at the depth cap — one root yields exactly 7 bodies', () => {
    let bodies = 1 // the root
    const expand = (e: Enemy) => {
      for (const desc of onDeath(e)) {
        bodies++
        const child = createEnemy('hydra')
        child.splitDepth = desc.splitDepth ?? 0
        child.maxHp = desc.hp
        expand(child)
      }
    }
    expand(createEnemy('hydra'))
    expect(bodies).toBe(7) // 1 → 2 → 4
    expect(SPLIT_DEPTH_CAP).toBe(2)
  })

  it('non-splitters leave nothing', () => {
    expect(onDeath(createEnemy('shade'))).toEqual([])
    expect(onDeath(createEnemy('talos'))).toEqual([])
  })
})

describe('createEnemy traits', () => {
  it('derives flying/armor from kind', () => {
    expect(createEnemy('harpy').flying).toBe(true)
    expect(createEnemy('talos').armor).toBe(6)
    expect(createEnemy('shade').flying).toBe(false)
    expect(createEnemy('shade').armor).toBe(0)
    expect(createEnemy('satyr').flying).toBe(false) // fast, not flying
  })
})

describe('slow status (Aphrodite)', () => {
  it('slows movement, then lifts after its duration', () => {
    const e = createEnemy('skeleton')
    e.speed = 100
    applySlow(e, 0.5, 500)
    expect(e.slowMul).toBe(0.5)
    advanceEnemy(e, 0.1, 1000) // 100 × 0.5 × 0.1 / 1000 = 0.005 (half of unslowed 0.01)
    expect(e.pathT).toBeCloseTo(0.005)
    for (let i = 0; i < 6; i++) advanceEnemy(e, 0.1, 1000) // past the 500ms duration
    expect(e.slowMul).toBe(1)
  })

  it('keeps the strongest active slow', () => {
    const e = createEnemy('skeleton')
    applySlow(e, 0.6, 500)
    applySlow(e, 0.3, 500)
    expect(e.slowMul).toBe(0.3)
  })

  it('a weaker slow refreshing does NOT extend a stronger slow (which expires, then the weak one applies)', () => {
    const e = createEnemy('skeleton')
    applySlow(e, 0.3, 300) // one brief touch of a deep slow
    applySlow(e, 0.6, 1000) // a weaker aura's refresh — must not hold the 0.3 alive
    expect(e.slowMul).toBe(0.3)
    expect(e.slowTimerMs).toBe(300) // NOT ratcheted to 1000
    advanceEnemy(e, 0.4, 1000) // 400ms > 300ms → the strong slow lifts
    expect(e.slowMul).toBe(1)
    applySlow(e, 0.6, 250) // the weaker aura re-applies within one refresh tick
    expect(e.slowMul).toBe(0.6)
  })
})

describe('wavePreview', () => {
  it('flags the debut kind on a teaching wave (6 → harpy)', () => {
    expect(wavePreview(6)).toEqual({ debutKind: 'harpy', bossId: null, elite: false })
  })

  it('flags the boss on a boss wave (20 → nemean, which is also an elite 10th wave)', () => {
    expect(wavePreview(20)).toEqual({ debutKind: null, bossId: 'nemean', elite: true })
  })

  it('flags an elite legion on non-boss 10th waves', () => {
    expect(wavePreview(30)).toEqual({ debutKind: null, bossId: null, elite: true })
  })

  it('a plain wave has no callouts', () => {
    expect(wavePreview(7)).toEqual({ debutKind: null, bossId: null, elite: false })
  })
})

describe('leak weight by kind (threat, NOT wave-scaled)', () => {
  const leakOf = (wave: number, kind: string) => waveSpec(wave).groups.find((g) => g.kind === kind)?.leakWeight

  it('stronger kinds cost more lives — a Harpy/Talos leak hurts far more than a Shade', () => {
    const w = 20 // all of shade/skeleton/harpy/talos present
    expect(leakOf(w, 'shade')).toBe(1)
    expect(leakOf(w, 'harpy')).toBeGreaterThan(leakOf(w, 'shade')!) // harpy >> shade (the user's example)
    expect(leakOf(w, 'talos')).toBeGreaterThan(leakOf(w, 'harpy')!) // armored juggernaut costs the most
  })

  it('does NOT change with the wave number (same kind = same cost early and late)', () => {
    expect(leakOf(9, 'talos')).toBe(leakOf(40, 'talos')) // a Talos costs the same at w9 and w40
    expect(leakOf(6, 'harpy')).toBe(leakOf(30, 'harpy'))
  })

  it('Hydra split-children inherit a REDUCED leak weight (weaker bodies)', () => {
    const hydra = createEnemy('hydra')
    hydra.leakWeight = 4
    hydra.maxHp = 100
    const kids = onDeath(hydra)
    expect(kids[0].leakWeight).toBe(2) // round(4 × 0.5)
  })
})

describe('wave composition', () => {
  it('early waves are Shade-only, Skeleton joins at w3', () => {
    const c1 = enemyCounts(1)
    expect(c1.skeleton).toBe(0)
    expect(c1.shade).toBeGreaterThan(0)
    expect(enemyCounts(3).skeleton).toBeGreaterThan(0) // skeleton debut
  })

  it('a debut wave guarantees ≥1 of the new kind', () => {
    expect(enemyCounts(6).harpy).toBeGreaterThanOrEqual(1) // Harpy debut
    expect(enemyCounts(9).talos).toBeGreaterThanOrEqual(1) // Talos debut
    expect(enemyCounts(12).hydra).toBeGreaterThanOrEqual(1) // Hydra debut
    expect(enemyCounts(15).satyr).toBeGreaterThanOrEqual(1) // Satyr debut
    expect(enemyCounts(18).gorgon).toBeGreaterThanOrEqual(1) // Gorgon-kin debut
  })

  it('the CHAFF shares partition the count budget exactly (the boss is the only extra body)', () => {
    for (const w of [1, 3, 6, 9, 12, 20]) {
      const c = enemyCounts(w)
      const total = Object.values(c).reduce((s, n) => s + n, 0)
      // the boss (every 20th wave) is a deliberate +1 on top of the partitioned chaff budget
      const chaff = waveSpec(w).groups.filter((g) => g.kind !== 'boss').reduce((s, g) => s + g.count, 0)
      expect(total).toBe(chaff)
    }
  })

  it('heavies stay capped, but the cap RISES with the wave (no longer a hard 0.25/0.15)', () => {
    const c = enemyCounts(25) // non-elite, well past all debuts; cap ≈ 0.25+0.004·25 = 0.35
    const total = Object.values(c).reduce((s, n) => s + n, 0)
    expect(c.talos).toBeLessThanOrEqual(Math.ceil(total * 0.37))
    expect(c.hydra).toBeLessThanOrEqual(Math.ceil(total * 0.37))
  })
})

describe('difficulty model — Type-Carried Hybrid', () => {
  it('HP is a GENTLE tail now (×1.05), not the old runaway ×1.12 compounding', () => {
    expect(enemyHpMul(1)).toBe(1)
    expect(enemyHpMul(40)).toBeLessThan(15) // piecewise ≈ 11.7 (1.055^19·1.075^20) — bends post-w20, still far below the old 84
    expect(enemyHpMul(20)).toBeGreaterThan(enemyHpMul(10)) // still rising
  })

  it('count grows on a sqrt curve under a hard ceiling', () => {
    expect(enemyCount(1)).toBe(8)
    expect(enemyCount(1000)).toBe(COUNT_CEILING) // flattens — frame budget stays bounded
    let prev = 0
    for (const w of [1, 5, 10, 20, 30, 50, 100]) {
      expect(enemyCount(w)).toBeGreaterThanOrEqual(prev) // monotonic
      expect(enemyCount(w)).toBeLessThanOrEqual(COUNT_CEILING)
      prev = enemyCount(w)
    }
  })

  it('composition DRIFTS: chaff decays, heavies climb', () => {
    expect(weightAt('shade', 1)).toBeGreaterThan(weightAt('shade', 30)) // chaff falls off
    expect(weightAt('talos', 30)).toBeGreaterThan(weightAt('talos', 9)) // heavies rise
    expect(weightAt('gorgon', 40)).toBeGreaterThan(weightAt('gorgon', 18))
  })

  it('per-kind HP is a ladder — a Talos is the tankiest body at every wave, a Shade the flimsiest', () => {
    const hpOf = (wave: number, kind: string) => waveSpec(wave).groups.find((g) => g.kind === kind)?.hp
    const w = 20
    expect(hpOf(w, 'talos')!).toBeGreaterThan(hpOf(w, 'skeleton')!)
    expect(hpOf(w, 'skeleton')!).toBeGreaterThan(hpOf(w, 'shade')!)
    expect(hpOf(w, 'hydra')!).toBeGreaterThan(hpOf(w, 'harpy')!)
  })

  it('every 10th wave is an elite legion — heavier than its neighbor', () => {
    expect(isEliteWave(20)).toBe(true)
    expect(isEliteWave(19)).toBe(false)
    const heavyShare = (wave: number) => {
      const c = enemyCounts(wave)
      const total = Object.values(c).reduce((s, n) => s + n, 0)
      return (c.talos + c.hydra + c.gorgon) / total
    }
    expect(heavyShare(20)).toBeGreaterThan(heavyShare(19)) // the legion spike reads
  })
})
