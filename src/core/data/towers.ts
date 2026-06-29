import type { TargetingMode } from '../systems/targeting'

// The god roster grows across M5. Built so far: Zeus, Apollo, Demeter, Hermes (mobile anti-air),
// Hephaestus (deployable spike factory), Poseidon (water-gated AoE + knockback).
export type GodKind = 'zeus' | 'apollo' | 'demeter' | 'hermes' | 'hephaestus' | 'poseidon'

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
  /** Deployable gods (Hephaestus) stock a spike trap on the path instead of shooting. */
  deployable?: { maxCharges: number; hitRadius: number }
  /** AoE gods (Poseidon): each shot damages all ground foes in a radius + knocks them back. */
  splash?: { radius: number; knockback: number }
  /** Must be placed on water terrain (the Styx pool) — Poseidon. */
  requiresWater?: boolean
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
  hephaestus: {
    name: 'Hephaestus',
    blurb: 'Forges spike traps on the path — last-line leak insurance.',
    icon: '🔨',
    cost: 230,
    range: 110, // how far from his forge he can reach the path
    damage: 8, // per-charge spike damage
    fireRate: 0.6, // charges produced per second
    footprint: 18,
    defaultTargeting: 'first',
    color: 0xc8763a,
    attack: 'hitscan', // unused — he deploys traps, doesn't shoot
    canHitAir: false,
    deployable: { maxCharges: 6, hitRadius: 18 },
  },
  poseidon: {
    name: 'Poseidon',
    blurb: 'Tidal slam — area damage + knockback. Must build on water.',
    icon: '🔱',
    cost: 300,
    range: 150,
    damage: 8,
    fireRate: 0.8,
    footprint: 20,
    defaultTargeting: 'first',
    color: 0x2f8fd0,
    attack: 'hitscan', // unused — splash overrides
    canHitAir: false,
    splash: { radius: 55, knockback: 0.03 },
    requiresWater: true,
  },
}

export const GOD_ORDER: readonly GodKind[] = ['zeus', 'apollo', 'demeter', 'hermes', 'hephaestus', 'poseidon']

/** Fraction of a tower's cost refunded when sold (BTD6-style). */
export const SELL_REFUND_RATE = 0.7
export function sellValue(god: GodKind): number {
  return Math.floor(TOWER_STATS[god].cost * SELL_REFUND_RATE)
}
