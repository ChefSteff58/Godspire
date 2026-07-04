import { describe, it, expect } from 'vitest'
import { RunController } from '../src/game/run/RunController'
import { BOON_POOL } from '../src/core/run/boons'
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
