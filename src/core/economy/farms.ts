// ── src/core/economy ── Demeter farm HERD economics (M12): cluster synergy + stacking
// diminishing returns. Pure & framework-agnostic. The per-farm base payout still comes
// from demeterIncome (upgrades.ts); this layer shapes how a WHOLE herd of farms earns:
//   • stacking DR  — every farm earns less as the herd grows (kills mindless farm-spam),
//   • cluster bonus — farms placed close together earn a capped bonus (rewards smart layout).
// The two pull against each other on purpose: spamming farms hits DR, but tightly clustering
// a few of them claws some back — a bounded spatial-optimisation puzzle, not a runaway.

import type { Vec2 } from '../types'
import type { Tower } from '../entities/tower'
import { demeterIncome } from '../data/upgrades'

/** Two farms within this pixel distance count as "adjacent" (cluster neighbours). */
export const CLUSTER_RADIUS = 120
/** Each adjacent farm adds this fraction to a farm's payout… */
export const CLUSTER_PER_NEIGHBOR = 0.08
/** …up to this hard cap — a tight cluster is worth at most +30%, never more. */
export const CLUSTER_CAP = 0.3
/** Diminishing-returns strength: the larger the herd, the less EACH farm earns. */
export const STACK_DR = 0.3

/** How many OTHER farms sit within CLUSTER_RADIUS of the farm at index `i`. Pure. */
export function adjacentCount(positions: readonly Vec2[], i: number): number {
  const p = positions[i]
  const r2 = CLUSTER_RADIUS * CLUSTER_RADIUS
  let n = 0
  for (let j = 0; j < positions.length; j++) {
    if (j === i) continue
    const dx = positions[j].x - p.x
    const dy = positions[j].y - p.y
    if (dx * dx + dy * dy <= r2) n++
  }
  return n
}

/** Cluster payout multiplier for a farm with `neighbors` adjacent farms — 1 … 1 + CLUSTER_CAP. Pure. */
export function clusterMul(neighbors: number): number {
  return 1 + Math.min(CLUSTER_CAP, CLUSTER_PER_NEIGHBOR * Math.max(0, neighbors))
}

/** Diminishing-returns multiplier applied to EVERY farm when `count` farms share the field. Pure.
 *  1 → 1.0, 2 → ~0.77, 3 → ~0.63, 4 → ~0.53 — symmetric, so no single farm is privileged. */
export function stackMul(count: number): number {
  return 1 / (1 + STACK_DR * Math.max(0, count - 1))
}

/** Every farm's payout at `wave`: base (demeterIncome) × cluster bonus × stacking DR. Pure.
 *  demeterIncomeMul (the Golden Harvest boon) is applied by the caller, AFTER this. */
export function demeterHerdPayout(farms: readonly Tower[], wave: number): { id: string; income: number }[] {
  const positions = farms.map((f) => f.pos)
  const stack = stackMul(farms.length)
  return farms.map((f, i) => ({
    id: f.id,
    income: Math.floor(demeterIncome(f, wave) * clusterMul(adjacentCount(positions, i)) * stack),
  }))
}
