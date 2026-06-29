import type { TargetingMode } from '../systems/targeting'

// The god roster grows across M5. Built so far: Zeus (hitscan), Apollo (piercing projectile),
// Demeter (money farm — deals no damage; pays gold each wave), Hermes (mobile anti-air).
export type GodKind = 'zeus' | 'apollo' | 'demeter' | 'hermes'

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
  /** Can target FLYING enemies (Harpies). Base anti-air; upgrades can also grant it. */
  canHitAir?: boolean
  /** Mobile gods (Hermes) orbit their placed point; pos updates each frame. */
  mobile?: { orbitRadius: number; angularSpeed: number }
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
    canHitAir: false, // ground-only — whiffs Harpies (the anti-air lesson)
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
    canHitAir: true, // the lone anti-air — his arrows strike flying foes
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
    canHitAir: false, // a farm; never fires anyway
  },
  hermes: {
    name: 'Hermes',
    blurb: 'Winged scout — orbits and strikes foes from the air.',
    icon: '🪽',
    cost: 275,
    range: 120,
    damage: 3,
    fireRate: 3, // fast, low-damage darts
    footprint: 16,
    defaultTargeting: 'first',
    color: 0xc7b3ff,
    attack: 'hitscan',
    canHitAir: true, // the dedicated anti-air specialist
    mobile: { orbitRadius: 50, angularSpeed: 1.6 }, // ~4s loop around the placed point
  },
}

export const GOD_ORDER: readonly GodKind[] = ['zeus', 'apollo', 'demeter', 'hermes']

/** Fraction of a tower's cost refunded when sold (BTD6-style). */
export const SELL_REFUND_RATE = 0.7
export function sellValue(god: GodKind): number {
  return Math.floor(TOWER_STATS[god].cost * SELL_REFUND_RATE)
}
