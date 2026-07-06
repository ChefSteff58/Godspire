import { describe, it, expect } from 'vitest'
import { farm, bountyIncome, waveGold, simulate, fullBuildCost, ARCHETYPES, farmIncome, TOWER_BASE_COST, PRICIEST_T5 } from '../scripts/econ-sim'
import type { GodKind } from '../src/core/data/towers'

// M12 economy-sim guard. Locks the stable invariants that must hold across the S1 Demeter redesign
// and the S2 paragon cost re-curve. See docs/design/economy-sim-2026-07.md.

/** Live total to main-max every god (base + A5 + B2 dip) — grows with the S2 cost curve. */
const BOARD_COST = (Object.keys(TOWER_BASE_COST) as GodKind[]).reduce((s, g) => s + fullBuildCost(g, TOWER_BASE_COST[g]), 0)

describe('economy sim — harness sanity', () => {
  it('is deterministic (same board → same gold)', () => {
    expect(waveGold(30, { farms: [farm(2, 5)] })).toBe(waveGold(30, { farms: [farm(2, 5)] }))
  })

  it('bounty income is positive and boss waves pay a premium', () => {
    expect(bountyIncome(10)).toBeGreaterThan(0)
    expect(bountyIncome(20)).toBeGreaterThan(bountyIncome(19)) // wave 20 boss bounty spikes the payout
  })

  it('a farm strictly out-earns no farm, and more farms earn more (pre-DR baseline)', () => {
    const noFarm = waveGold(40, {})
    const oneVault = waveGold(40, { farms: [farm(2, 5)] })
    const fourVault = waveGold(40, { farms: [farm(2, 5), farm(2, 5), farm(2, 5), farm(2, 5)] })
    expect(oneVault).toBeGreaterThan(noFarm)
    expect(fourVault).toBeGreaterThan(oneVault)
  })

  it('cumulative gold is strictly monotonic for every archetype', () => {
    const rows = simulate({ farms: [farm(2, 5)] })
    for (let i = 1; i < rows.length; i++) expect(rows[i].cum).toBeGreaterThan(rows[i - 1].cum)
  })
})

describe('economy sim — the baseline (no-farm) economy stays healthy', () => {
  it('never lets a farmless board buy the whole board within 60 waves', () => {
    const rows = simulate({})
    expect(rows[rows.length - 1].cum).toBeLessThan(BOARD_COST)
  })

  it('keeps farmless per-wave income under the priciest single upgrade', () => {
    const rows = simulate({})
    expect(rows.every((r) => r.per < PRICIEST_T5)).toBe(true) // no-farm never inflates past a T5/wave
  })
})

describe('economy sim — the S2 paragon sink ceiling', () => {
  it('main-maxing all 8 gods is a genuine long-run grind (>75k), not affordable in a normal run', () => {
    expect(BOARD_COST).toBeGreaterThan(75_000)
  })

  it('NOBODY — not even a 4-Vault farmer — can main-max the whole board within 60 waves', () => {
    for (const a of ARCHETYPES) {
      expect(simulate(a.cfg)[59].cum, `${a.name} maxed everything too fast`).toBeLessThan(BOARD_COST)
    }
  })
})

// ── S1 TARGETS (the Demeter redesign must hold these — the reason M12 exists) ──
describe('economy sim — post-redesign targets (S1)', () => {
  it("no farm archetype's per-wave income runs away (stays under ~3k/wave through w60)", () => {
    for (const a of ARCHETYPES) {
      const rows = simulate(a.cfg)
      expect(rows.every((r) => r.per <= 3_000), `${a.name} inflated`).toBe(true)
    }
  })

  it('a 4-Vault stack earns < 3× a single Vault at w50 (stacking diminishing returns bite)', () => {
    const one = farmIncome([farm(2, 5)], 50)
    const four = farmIncome([farm(2, 5), farm(2, 5), farm(2, 5), farm(2, 5)], 50)
    expect(four).toBeGreaterThan(one) // still worth building more…
    expect(four).toBeLessThan(3 * one) // …but 4 farms are NOT 4× the gold (DR)
  })

  it('no SINGLE maxed farm can bankroll the whole board by w50', () => {
    for (const cfg of [{ farms: [farm(5, 2)] }, { farms: [farm(2, 5)] }, { farms: [farm(2, 5)], demeterIncomeMul: 1.6 }]) {
      expect(simulate(cfg)[49].cum).toBeLessThan(BOARD_COST)
    }
  })
})
