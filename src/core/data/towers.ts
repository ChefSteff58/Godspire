import type { TargetingMode } from '../systems/targeting'

// The god roster grows across M5. Built so far: Zeus (hitscan), Apollo (piercing projectile),
// Demeter (money farm — deals no damage; pays gold each wave).
export type GodKind = 'zeus' | 'apollo' | 'demeter'

export interface TowerStats {
  name: string
  blurb: string
  icon: string
  cost: number // gold to place one
  range: number // px in the 960×540 logical space
  damage: number
  fireRate: number // shots per second
  footprint: number // placement radius (spacing + dead-zone clearance)
  defaultTargeting: TargetingMode
  color: number
  attack: 'hitscan' | 'projectile'
  pierce?: number // projectile only: extra enemies passed through
  projectileSpeed?: number // projectile only: px/sec
}

export const TOWER_STATS: Record<GodKind, TowerStats> = {
  zeus: {
    name: 'Zeus',
    blurb: 'Chain bolt to the lead foe.',
    icon: '⚡',
    cost: 200,
    range: 135,
    damage: 5,
    fireRate: 1.5,
    footprint: 20,
    defaultTargeting: 'first',
    color: 0xf5d061,
    attack: 'hitscan',
  },
  apollo: {
    name: 'Apollo',
    blurb: 'Piercing sun-arrow, long range.',
    icon: '🏹',
    cost: 250,
    range: 210,
    damage: 8,
    fireRate: 0.9,
    footprint: 18,
    defaultTargeting: 'first',
    color: 0xffcf6b,
    attack: 'projectile',
    pierce: 2,
    projectileSpeed: 1400,
  },
  demeter: {
    name: 'Demeter',
    blurb: 'Harvests gold each wave. Deals no damage.',
    icon: '🌾',
    cost: 300,
    range: 90,
    damage: 0, // a farm, not a fighter — skipped in the fire loop
    fireRate: 0,
    footprint: 22,
    defaultTargeting: 'first',
    color: 0x6abe53,
    attack: 'hitscan',
  },
}

export const GOD_ORDER: readonly GodKind[] = ['zeus', 'apollo', 'demeter']

/** Fraction of a tower's cost refunded when sold (BTD6-style). */
export const SELL_REFUND_RATE = 0.7
export function sellValue(god: GodKind): number {
  return Math.floor(TOWER_STATS[god].cost * SELL_REFUND_RATE)
}
