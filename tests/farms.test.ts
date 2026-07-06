import { describe, it, expect } from 'vitest'
import {
  adjacentCount, clusterMul, stackMul, demeterHerdPayout,
  CLUSTER_RADIUS, CLUSTER_CAP, CLUSTER_PER_NEIGHBOR,
} from '../src/core/economy/farms'
import { createTower } from '../src/core/entities/tower'
import { demeterIncome } from '../src/core/data/upgrades'
import type { Tower } from '../src/core/entities/tower'

// M12 S1 — the Demeter herd economics: cluster synergy + stacking diminishing returns (pure).

const farmAt = (x: number, y: number, pathA = 2, pathB = 5): Tower => {
  const t = createTower('demeter', { x, y })
  t.pathA = pathA
  t.pathB = pathB
  return t
}

describe('cluster geometry — adjacentCount', () => {
  it('counts only OTHER farms within CLUSTER_RADIUS', () => {
    const near = CLUSTER_RADIUS - 1
    // farm 0 near farm 1; farm 2 sits far from BOTH (isolated).
    const positions = [{ x: 0, y: 0 }, { x: near, y: 0 }, { x: 0, y: 500 }]
    expect(adjacentCount(positions, 0)).toBe(1) // farm 1 only (self excluded, far one excluded)
    expect(adjacentCount(positions, 2)).toBe(0) // the isolated farm has no neighbours in range
  })

  it('a lone farm has no neighbours', () => {
    expect(adjacentCount([{ x: 500, y: 500 }], 0)).toBe(0)
  })
})

describe('cluster bonus — clusterMul', () => {
  it('is +8% per adjacent farm', () => {
    expect(clusterMul(0)).toBe(1)
    expect(clusterMul(1)).toBeCloseTo(1 + CLUSTER_PER_NEIGHBOR)
    expect(clusterMul(2)).toBeCloseTo(1 + 2 * CLUSTER_PER_NEIGHBOR)
  })

  it('is hard-capped at +30% no matter how dense the cluster', () => {
    expect(clusterMul(100)).toBeCloseTo(1 + CLUSTER_CAP)
    expect(clusterMul(1000)).toBeCloseTo(1 + CLUSTER_CAP)
  })
})

describe('stacking DR — stackMul', () => {
  it('is 1.0 for a lone farm and shrinks as the herd grows', () => {
    expect(stackMul(1)).toBe(1)
    expect(stackMul(2)).toBeLessThan(1)
    expect(stackMul(4)).toBeLessThan(stackMul(2))
  })

  it('makes N farms worth strictly less than N lone farms (anti-spam)', () => {
    for (const n of [2, 3, 4, 8]) expect(n * stackMul(n)).toBeLessThan(n)
  })
})

describe('demeterHerdPayout — the whole herd priced together', () => {
  it('a lone farm just earns its base income (no cluster, no DR)', () => {
    const f = farmAt(100, 100)
    const [{ income }] = demeterHerdPayout([f], 30)
    expect(income).toBe(demeterIncome(f, 30))
  })

  it('clustered farms out-earn the same farms spread apart, but stay bounded', () => {
    const wave = 30
    const clustered = [farmAt(0, 0), farmAt(40, 0), farmAt(0, 40)] // all within radius
    const spread = [farmAt(0, 0), farmAt(1000, 0), farmAt(0, 1000)] // none adjacent
    const sum = (ps: { income: number }[]) => ps.reduce((s, p) => s + p.income, 0)
    const clusteredTotal = sum(demeterHerdPayout(clustered, wave))
    const spreadTotal = sum(demeterHerdPayout(spread, wave))
    expect(clusteredTotal).toBeGreaterThan(spreadTotal) // clustering pays
    expect(clusteredTotal).toBeLessThan(spreadTotal * (1 + CLUSTER_CAP) + 1) // …but only up to the cap
  })

  it('four stacked farms earn well under four lone farms (DR dominates spam)', () => {
    const wave = 40
    const lone = demeterHerdPayout([farmAt(0, 0)], wave)[0].income
    const spread = [farmAt(0, 0), farmAt(9e3, 0), farmAt(0, 9e3), farmAt(9e3, 9e3)] // no cluster bonus
    const fourTotal = demeterHerdPayout(spread, wave).reduce((s, p) => s + p.income, 0)
    expect(fourTotal).toBeLessThan(3 * lone)
  })
})
