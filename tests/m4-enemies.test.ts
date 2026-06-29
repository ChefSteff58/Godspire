import { describe, it, expect } from 'vitest'
import { selectTarget } from '../src/core/systems/targeting'
import { createEnemy, damageEnemy, onDeath, applySlow, advanceEnemy, SPLIT_DEPTH_CAP, type Enemy } from '../src/core/entities/enemy'
import { enemyCounts, waveSpec } from '../src/core/systems/waveManager'
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
  })

  it('shares partition the count budget exactly (no extra bodies)', () => {
    for (const w of [1, 3, 6, 9, 12, 20]) {
      const c = enemyCounts(w)
      const total = Object.values(c).reduce((s, n) => s + n, 0)
      expect(total).toBe(waveSpec(w).groups.reduce((s, g) => s + g.count, 0))
    }
  })

  it('Talos and Hydra stay a capped minority in blended waves', () => {
    const c = enemyCounts(20) // well past all debuts
    const total = Object.values(c).reduce((s, n) => s + n, 0)
    expect(c.talos).toBeLessThanOrEqual(Math.ceil(total * 0.25))
    expect(c.hydra).toBeLessThanOrEqual(Math.ceil(total * 0.15))
  })
})
