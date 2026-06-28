import { describe, it, expect } from 'vitest'
import { RunController } from '../src/game/run/RunController'
import { BOON_POOL } from '../src/core/run/boons'
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
    pick(run, 'def-bulwark-of-styx') // gateShield 5
    expect(run.snapshot().shieldCharges).toBe(5)
    for (let i = 0; i < 5; i++) expect(run.onLeak(1)).toBe(false) // absorbed
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
    pick(run, 'def-aegis-of-athena') // maxLivesAdd 15
    expect(run.maxLives).toBe(115)
    expect(run.lives).toBe(115)
  })

  it('composite applies every sub-effect (gold + lives)', () => {
    const run = new RunController(() => 0.5)
    run.start(META)
    run.onLeak(50) // lives 50 so the heal is visible
    const goldBefore = run.snapshot().gold
    pick(run, 'eco-favor-of-fortuna') // +350 gold, +10 lives
    expect(run.snapshot().gold).toBe(goldBefore + 350)
    expect(run.lives).toBe(60)
  })

  it('coinflipFold resolves deterministically from the rng (win vs lose)', () => {
    const win = new RunController(() => 0.4) // < 0.5 → win
    win.start(META)
    pick(win, 'syn-gamblers-laurel')
    expect(win.effectiveDamage('zeus', 10)).toBeCloseTo(18) // ×1.8

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
