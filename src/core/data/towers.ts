import type { TargetingMode } from '../systems/targeting'

// The god roster grows to 6 in M5. M2.5 ships Zeus (hitscan) + Apollo (piercing projectile).
export type GodKind = 'zeus' | 'apollo'

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
}

export const GOD_ORDER: readonly GodKind[] = ['zeus', 'apollo']
