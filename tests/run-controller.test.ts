import { describe, it, expect } from 'vitest'
import { RunController } from '../src/game/run/RunController'
import { BOON_POOL, boonGod } from '../src/core/run/boons'
import { deriveModifiers } from '../src/core/progress/rules'
import type { Modifiers } from '../src/core/progress/types'

const META: Modifiers = { startingGold: 650, startingLives: 100, towerDamageMul: 1 }
const boon = (id: string) => BOON_POOL.find((b) => b.id === id)!

/** Force a specific boon to be the only draft option, then pick it. */
function pick(run: RunController, id: string) {
  run.draft = [{ type: 'boon', boon: boon(id) }]
  run.pickDraft(0)
}

describe('RunController — boon effects', () => {
  it('gate shield absorbs leaks before lives are touched', () => {
    const run = new RunController(() => 0.5)
    run.start(META)
    pick(run, 'def-bulwark-of-styx') // gateShield 8 (fleet retune: epic must out-defend the common)
    expect(run.snapshot().shieldCharges).toBe(8)
    for (let i = 0; i < 8; i++) expect(run.onLeak(1)).toBe(false) // absorbed
    expect(run.lives).toBe(100)
    expect(run.snapshot().shieldCharges).toBe(0)
    expect(run.onLeak(1)).toBe(true) // now a real life is lost
    expect(run.lives).toBe(99)
  })

  it('second wind catches the first lethal leak, then lets the run end', () => {
    const run = new RunController(() => 0.5)
    run.start(META)
    pick(run, 'def-second-wind-of-nike')
    run.onLeak(100) // would be lethal
    expect(run.lives).toBe(25) // saved
    expect(run.phase).toBe('building')
    run.onLeak(25) // no more second wind
    expect(run.lives).toBe(0)
    expect(run.phase).toBe('over')
  })

  it('maxLivesAdd raises the cap and heals; livesGrant never overheals', () => {
    const run = new RunController(() => 0.5)
    run.start(META)
    pick(run, 'def-ambrosia-draught') // livesGrant 20 at full health → no overheal
    expect(run.lives).toBe(100)
    pick(run, 'def-aegis-of-athena') // maxLivesAdd 25 (fleet retune)
    expect(run.maxLives).toBe(125)
    expect(run.lives).toBe(125)
  })

  it('composite applies every sub-effect (gold + lives)', () => {
    const run = new RunController(() => 0.5)
    run.start(META)
    run.onLeak(50) // lives 50 so the heal is visible
    const goldBefore = run.snapshot().gold
    pick(run, 'eco-favor-of-fortuna') // +600 gold, +15 lives (fleet retune)
    expect(run.snapshot().gold).toBe(goldBefore + 600)
    expect(run.lives).toBe(65)
  })

  it('coinflipFold resolves deterministically from the rng (win vs lose)', () => {
    const win = new RunController(() => 0.4) // < 0.5 → win
    win.start(META)
    pick(win, 'syn-gamblers-laurel')
    expect(win.effectiveDamage('zeus', 10)).toBeCloseTo(22) // ×2.2 (fleet retune: legendary variance premium)

    const lose = new RunController(() => 0.6) // ≥ 0.5 → lose
    lose.start(META)
    pick(lose, 'syn-gamblers-laurel')
    expect(lose.effectiveDamage('zeus', 10)).toBeCloseTo(8) // ×0.8
  })

  it('persistent boons re-fold live and reach fire-time damage', () => {
    const run = new RunController(() => 0.5)
    run.start(META)
    expect(run.effectiveDamage('zeus', 10)).toBe(10)
    pick(run, 'core-zeus-king-of-storms') // godDamageMul zeus 1.3
    expect(run.effectiveDamage('zeus', 10)).toBeCloseTo(13)
    expect(run.effectiveDamage('apollo', 10)).toBe(10) // unaffected
  })
})

describe('RunController — per-god signature boons (M11 S2)', () => {
  it('a signature boon folds through to its mechanic getter', () => {
    const run = new RunController(() => 0.5)
    run.start(META)
    expect(run.demeterIncomeMul).toBe(1)
    pick(run, 'core-demeter-golden-harvest') // demeterIncomeMul 1.6
    expect(run.demeterIncomeMul).toBeCloseTo(1.6)
    expect(run.knockbackMul).toBe(1) // other gods' knobs untouched
    pick(run, 'core-poseidon-riptide')
    expect(run.knockbackMul).toBeCloseTo(1.8)
  })

  it('the draft never offers a signature boon for a god not on the field', () => {
    let i = 0
    const rng = () => [0.05, 0.3, 0.55, 0.8, 0.95, 0.2, 0.65, 0.42, 0.11, 0.73][i++ % 10]
    const run = new RunController(rng)
    run.start({ ...META, startingGold: 999999 }) // rich enough to reroll freely
    run.builtGods = new Set(['zeus']) // only Zeus fielded
    run.draft = [{ type: 'boon', boon: boon('off-divine-wrath') }]
    const seen = new Set<string>()
    for (let k = 0; k < 40; k++) {
      run.rerollDraft() // regenerates via draftExclude (which uses boonGod)
      for (const o of run.draft!) if (o.type === 'boon') seen.add(o.boon.id)
    }
    const forbidden = BOON_POOL.filter((b) => { const g = boonGod(b); return g !== null && g !== 'zeus' })
    for (const b of forbidden) expect(seen.has(b.id)).toBe(false) // dead cards never surface
  })
})

describe('RunController — build-defining boons (M11 S4)', () => {
  it('Monotheist ×2 only while exactly one god is fielded', () => {
    const run = new RunController(() => 0.5)
    run.start(META)
    run.builtGods = new Set(['zeus'])
    pick(run, 'syn-monotheist')
    expect(run.effectiveDamage('zeus', 10)).toBeCloseTo(20) // devotion → ×2
    run.builtGods = new Set(['zeus', 'apollo']) // a second god breaks it
    expect(run.effectiveDamage('zeus', 10)).toBeCloseTo(10)
    run.builtGods = new Set() // no towers at all → no bonus
    expect(run.effectiveDamage('zeus', 10)).toBeCloseTo(10)
  })

  it('Full Pantheon scales with the number of DISTINCT gods fielded', () => {
    const run = new RunController(() => 0.5)
    run.start(META)
    pick(run, 'syn-full-pantheon') // +6% per distinct god
    run.builtGods = new Set(['zeus'])
    expect(run.effectiveDamage('zeus', 100)).toBeCloseTo(106)
    run.builtGods = new Set(['zeus', 'apollo', 'demeter'])
    expect(run.effectiveDamage('zeus', 100)).toBeCloseTo(118) // ×(1 + 0.06×3)
  })

  it('Vengeance grows damage as Olympus bleeds lives (comeback)', () => {
    const run = new RunController(() => 0.5)
    run.start(META) // 100 lives
    pick(run, 'syn-vengeance') // +2% per life lost
    expect(run.effectiveDamage('zeus', 100)).toBeCloseTo(100) // no lives lost yet
    run.onLeak(10)
    expect(run.effectiveDamage('zeus', 100)).toBeCloseTo(120) // ×(1 + 0.02×10)
  })

  it('the build factor stacks multiplicatively with a per-god damage boon', () => {
    const run = new RunController(() => 0.5)
    run.start(META)
    run.builtGods = new Set(['zeus'])
    pick(run, 'syn-monotheist') // ×2
    pick(run, 'core-zeus-king-of-storms') // godDamageMul zeus 1.3
    expect(run.effectiveDamage('zeus', 10)).toBeCloseTo(26) // 10 × 1.3 × 2
  })
})

describe('RunController — draft reroll (M11)', () => {
  const openDraft = (run: RunController) => {
    run.draft = [{ type: 'boon', boon: boon('off-divine-wrath') }]
  }

  it('the first reroll of a run is free; further rerolls cost escalating gold', () => {
    const run = new RunController(() => 0.5)
    run.start(META)
    openDraft(run)
    expect(run.snapshot().rerollCost).toBe(0) // the run's one free reroll
    const gold0 = run.snapshot().gold
    expect(run.rerollDraft()).toBe(true)
    expect(run.snapshot().gold).toBe(gold0) // free — nothing charged

    const cost1 = run.snapshot().rerollCost
    expect(cost1).toBeGreaterThan(0)
    expect(run.rerollDraft()).toBe(true)
    expect(run.snapshot().gold).toBe(gold0 - cost1) // charged

    const cost2 = run.snapshot().rerollCost
    expect(cost2).toBeGreaterThan(cost1) // each paid reroll costs more
  })

  it('a reroll you cannot afford is a no-op (draft + gold unchanged)', () => {
    const run = new RunController(() => 0.5)
    run.start({ ...META, startingGold: 40 })
    openDraft(run)
    expect(run.rerollDraft()).toBe(true) // spend the free one
    const draftAfterFree = run.draft
    expect(run.snapshot().rerollCost).toBeGreaterThan(40) // the paid cost exceeds our purse
    expect(run.rerollDraft()).toBe(false) // too poor
    expect(run.draft).toBe(draftAfterFree) // cards unchanged
    expect(run.snapshot().gold).toBe(40) // not charged
  })

  it('rerolling with no draft open is a no-op', () => {
    const run = new RunController(() => 0.5)
    run.start(META)
    run.draft = null
    expect(run.rerollDraft()).toBe(false)
  })

  it('the free reroll resets on a new run', () => {
    const run = new RunController(() => 0.5)
    run.start(META)
    openDraft(run)
    run.rerollDraft() // burn the free one
    expect(run.snapshot().rerollCost).toBeGreaterThan(0)
    run.start(META) // new run
    openDraft(run)
    expect(run.snapshot().rerollCost).toBe(0) // free again
  })
})

describe('RunController — Pantheon meta buffs at run start (M6.5)', () => {
  it('seeds starting gold/lives/shields + arms Second Wind from the unlocked tree', () => {
    const meta = deriveModifiers([
      'harvest_gold_1', 'harvest_gold_2', // +150 +250 gold
      'wisdom_life_1', 'wisdom_life_2', // +10 +20 lives
      'wisdom_shield_1', // +3 shields
      'wisdom_secondwind', // start with a Second Wind
    ])
    const run = new RunController(() => 0.5)
    run.start(meta)
    const s = run.snapshot()
    expect(s.gold).toBe(650 + 150 + 250)
    expect(s.lives).toBe(100 + 10 + 20)
    expect(s.shieldCharges).toBe(3)
    // burn the 3 gate-shields (each eats one leak), THEN Breath of Nike catches the lethal one
    run.onLeak(1)
    run.onLeak(1)
    run.onLeak(1)
    expect(run.snapshot().shieldCharges).toBe(0)
    expect(run.lives).toBe(130) // shields absorbed, no life lost
    run.onLeak(99999)
    expect(run.lives).toBe(25)
  })

  it('exposes the boss-damage multiplier from Titan-Slayer', () => {
    const meta = deriveModifiers(['war_boss'])
    const run = new RunController(() => 0.5)
    run.start(meta)
    expect(run.bossDamageMul).toBeCloseTo(1.5)
  })
})

describe('RunController — end-of-run stats (M6)', () => {
  it('tallies gold spent, towers built, bosses killed, and gold earned', () => {
    const run = new RunController(() => 0.5)
    run.start(META)
    run.purchase(200) // affordable from the 650 start
    run.purchase(100)
    run.onTowerBuilt()
    run.onTowerBuilt()
    run.onKill(10, false)
    run.onKill(120, true) // a boss
    const s = run.runStats()
    expect(s.goldSpent).toBe(300)
    expect(s.towersBuilt).toBe(2)
    expect(s.bossesKilled).toBe(1)
    expect(s.goldEarned).toBeGreaterThanOrEqual(130) // the two bounties
  })

  it('records the bloodiest wave (most lives lost), finalized at run end', () => {
    const run = new RunController(() => 0.5)
    run.start(META)
    run['beginWave'](2)
    run.onLeak(60) // 60 lost on wave 2 (the bloodiest)
    run['beginWave'](3) // finalizes wave 2 → worst so far (60)
    run.onLeak(40) // lethal on wave 3 (40 lives left → only 40 ACTUAL lost, < 60) → run ends
    expect(run.phase).toBe('over')
    const s = run.runStats()
    expect(s.worstWave).toBe(2)
    expect(s.worstWaveLives).toBe(60)
  })
})
