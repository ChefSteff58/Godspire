import type { SkillNode } from './types'

/**
 * M0.5 placeholder nodes — one prereq-free, tier-1 node per branch. Enough to prove a save
 * round-trips through jsonb and that deriveModifiers produces real run-start buffs.
 * The full ~30-node tree (with prerequisites/tiers) and its UI arrive in M6.5.
 */
export const PANTHEON_NODES: readonly SkillNode[] = [
  {
    id: 'war_dmg_1',
    branch: 'war',
    name: "Ares' Edge",
    description: '+5% tower damage.',
    cost: 1,
    effect: { kind: 'towerDamageMul', value: 1.05 },
  },
  {
    id: 'harvest_gold_1',
    branch: 'harvest',
    name: "Demeter's Bounty",
    description: '+150 starting gold.',
    cost: 1,
    effect: { kind: 'startingGoldAdd', value: 150 },
  },
  {
    id: 'wisdom_life_1',
    branch: 'wisdom',
    name: 'Aegis of Athena',
    description: '+1 starting life.',
    cost: 1,
    effect: { kind: 'startingLivesAdd', value: 1 },
  },
]

export function getNode(
  id: string,
  nodes: readonly SkillNode[] = PANTHEON_NODES,
): SkillNode | undefined {
  return nodes.find((n) => n.id === id)
}
