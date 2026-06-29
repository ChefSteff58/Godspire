import type { SkillNode } from './types'

/**
 * The Pantheon Tree (M6.5) — 3 branches × 6 nodes, tiered with prerequisite chains. Favor → account
 * level → Knowledge Points; spend points here between runs for permanent run-start buffs.
 * Keeps the 3 original M0.5 node ids (war_dmg_1 / harvest_gold_1 / wisdom_life_1) as the tier-1 roots.
 */
export const PANTHEON_NODES: readonly SkillNode[] = [
  // ── War (offense) ──
  { id: 'war_dmg_1', branch: 'war', tier: 1, name: "Ares' Edge", description: '+5% tower damage.', cost: 1, effect: { kind: 'towerDamageMul', value: 1.05 } },
  { id: 'war_rate_1', branch: 'war', tier: 1, name: 'Battle Fury', description: '+6% fire rate.', cost: 1, effect: { kind: 'fireRateMul', value: 1.06 } },
  { id: 'war_dmg_2', branch: 'war', tier: 2, name: 'Spartan Discipline', description: '+8% tower damage.', cost: 2, prerequisites: ['war_dmg_1'], effect: { kind: 'towerDamageMul', value: 1.08 } },
  { id: 'war_rate_2', branch: 'war', tier: 2, name: 'Relentless Assault', description: '+10% fire rate.', cost: 2, prerequisites: ['war_rate_1'], effect: { kind: 'fireRateMul', value: 1.1 } },
  { id: 'war_dmg_3', branch: 'war', tier: 3, name: 'Wrath of Olympus', description: '+12% tower damage.', cost: 3, prerequisites: ['war_dmg_2'], effect: { kind: 'towerDamageMul', value: 1.12 } },
  { id: 'war_boss', branch: 'war', tier: 4, name: 'Titan-Slayer', description: '+30% damage vs bosses.', cost: 4, prerequisites: ['war_dmg_3'], effect: { kind: 'bossDamageMul', value: 1.3 } },

  // ── Harvest (economy) ──
  { id: 'harvest_gold_1', branch: 'harvest', tier: 1, name: "Demeter's Bounty", description: '+150 starting gold.', cost: 1, effect: { kind: 'startingGoldAdd', value: 150 } },
  { id: 'harvest_income_1', branch: 'harvest', tier: 1, name: 'Cornucopia', description: '+10% wave income.', cost: 1, effect: { kind: 'incomeMul', value: 1.1 } },
  { id: 'harvest_gold_2', branch: 'harvest', tier: 2, name: 'Fertile Start', description: '+250 starting gold.', cost: 2, prerequisites: ['harvest_gold_1'], effect: { kind: 'startingGoldAdd', value: 250 } },
  { id: 'harvest_kill_1', branch: 'harvest', tier: 2, name: 'Spoils of War', description: '+1 gold per kill.', cost: 2, prerequisites: ['harvest_gold_1'], effect: { kind: 'goldPerKillAdd', value: 1 } },
  { id: 'harvest_income_2', branch: 'harvest', tier: 3, name: 'Horn of Plenty', description: '+18% wave income.', cost: 3, prerequisites: ['harvest_income_1'], effect: { kind: 'incomeMul', value: 1.18 } },
  { id: 'harvest_kill_2', branch: 'harvest', tier: 3, name: 'Golden Tribute', description: '+2 gold per kill.', cost: 3, prerequisites: ['harvest_kill_1'], effect: { kind: 'goldPerKillAdd', value: 2 } },

  // ── Wisdom (survival + utility) ──
  { id: 'wisdom_life_1', branch: 'wisdom', tier: 1, name: 'Aegis of Athena', description: '+10 starting lives.', cost: 1, effect: { kind: 'startingLivesAdd', value: 10 } },
  { id: 'wisdom_shield_1', branch: 'wisdom', tier: 1, name: 'Gate Wards', description: 'Start with 3 gate-shields.', cost: 2, effect: { kind: 'startingShieldAdd', value: 3 } },
  { id: 'wisdom_life_2', branch: 'wisdom', tier: 2, name: 'Olympian Resolve', description: '+20 starting lives.', cost: 2, prerequisites: ['wisdom_life_1'], effect: { kind: 'startingLivesAdd', value: 20 } },
  { id: 'wisdom_shield_2', branch: 'wisdom', tier: 2, name: 'Bulwark of Styx', description: 'Start with 5 more gate-shields.', cost: 3, prerequisites: ['wisdom_shield_1'], effect: { kind: 'startingShieldAdd', value: 5 } },
  { id: 'wisdom_draft', branch: 'wisdom', tier: 3, name: 'Favor of the Fates', description: 'Fate Draft shows +1 option.', cost: 3, prerequisites: ['wisdom_life_1'], effect: { kind: 'draftOptionsAdd', value: 1 } },
  { id: 'wisdom_secondwind', branch: 'wisdom', tier: 4, name: 'Breath of Nike', description: 'Start each run with a Second Wind.', cost: 4, prerequisites: ['wisdom_life_2'], effect: { kind: 'secondWindStart' } },
]

export function getNode(
  id: string,
  nodes: readonly SkillNode[] = PANTHEON_NODES,
): SkillNode | undefined {
  return nodes.find((n) => n.id === id)
}
