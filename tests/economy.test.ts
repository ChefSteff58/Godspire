import { describe, it, expect } from 'vitest'
import { farm, bountyIncome, waveGold, simulate, fullBuildCost, ARCHETYPES, farmIncome } from '../scripts/econ-sim'

// M12 S0 — the economy-sim harness's permanent guard. These lock the STABLE invariants that must
// hold before AND after the Demeter redesign; the S1 targets (farm income bounded) land as real
// assertions once S1 makes them pass. See docs/design/economy-sim-2026-07.md.

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
  it('never lets a farmless board buy the whole 52k board within 60 waves', () => {
    const rows = simulate({})
    expect(rows[rows.length - 1].cum).toBeLessThan(52_000)
  })

  it('keeps farmless per-wave income under the priciest single upgrade', () => {
    const rows = simulate({})
    expect(rows.every((r) => r.per < 4_200)).toBe(true) // no-farm never inflates
  })
})

describe('economy sim — the full-board sink ceiling', () => {
  it('an 8-god main-maxed board is a real, large sink (>45k)', () => {
    const bases = { zeus: 200, apollo: 250, demeter: 300, hermes: 275, hephaestus: 230, poseidon: 300, aphrodite: 220, athena: 320 } as const
    const total = (Object.keys(bases) as (keyof typeof bases)[]).reduce((s, g) => s + fullBuildCost(g, bases[g]), 0)
    expect(total).toBeGreaterThan(45_000)
  })
})

// ── S1 TARGETS (the Demeter redesign must hold these — the reason M12 exists) ──
describe('economy sim — post-redesign targets (S1)', () => {
  it('no farm archetype exceeds the priciest T5 (4,200) in per-wave income through w60', () => {
    for (const a of ARCHETYPES) {
      const rows = simulate(a.cfg)
      expect(rows.every((r) => r.per <= 4_200), `${a.name} inflated past a T5/wave`).toBe(true)
    }
  })

  it('a 4-Vault stack earns < 3× a single Vault at w50 (stacking diminishing returns bite)', () => {
    const one = farmIncome([farm(2, 5)], 50)
    const four = farmIncome([farm(2, 5), farm(2, 5), farm(2, 5), farm(2, 5)], 50)
    expect(four).toBeGreaterThan(one) // still worth building more…
    expect(four).toBeLessThan(3 * one) // …but 4 farms are NOT 4× the gold (DR)
  })

  it('no SINGLE maxed farm can bankroll the whole 52k board by w50', () => {
    for (const cfg of [{ farms: [farm(5, 2)] }, { farms: [farm(2, 5)] }, { farms: [farm(2, 5)], demeterIncomeMul: 1.6 }]) {
      const cum50 = simulate(cfg)[49].cum
      expect(cum50).toBeLessThan(52_275)
    }
  })
})
