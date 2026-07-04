import type { TargetingMode } from '../systems/targeting'

// The full v1 roster (M5). Zeus, Apollo, Demeter, Hermes (mobile anti-air), Hephaestus (spike
// factory), Poseidon (AoE + knockback), Aphrodite (slow aura), Athena (buff aura + detection).
export type GodKind = 'zeus' | 'apollo' | 'demeter' | 'hermes' | 'hephaestus' | 'poseidon' | 'aphrodite' | 'athena'

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
  /** Slow-aura gods (Aphrodite): slows up to `maxTargets` foes in range (the lead ones), not all. */
  slowAura?: { mul: number; refreshMs: number; maxTargets: number }
  /** Support gods (Athena): buff nearby gods' damage/fire-rate + grant stealth detection. */
  auraBuff?: { damageMul: number; fireRateMul: number; detect: boolean }
}

export const TOWER_STATS: Record<GodKind, TowerStats> = {
  zeus: {
    name: 'Zeus',
    blurb: 'Hurls sky-splitting bolts at the lead foe.',
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
    damage: 4, // 3 left Hermes 1.8-3.3× under Apollo per gold in the shared anti-air role
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
    splash: { radius: 55, knockback: 0.018 }, // pathT fraction (~40px) — 0.03 near-stalled heavies at base
    requiresWater: true,
  },
  aphrodite: {
    name: 'Aphrodite',
    blurb: 'Charms the lead foes — they fall in love and crawl. Limited targets. No damage.',
    icon: '💘',
    cost: 220,
    range: 150,
    damage: 0, // pure control — slows, doesn't shoot
    fireRate: 1, // unused
    footprint: 18,
    defaultTargeting: 'first',
    color: 0xff6fae,
    attack: 'hitscan',
    canHitAir: false,
    // charms a STABLE set of the lead 5 foes (not the whole lane); a short refresh so a foe she
    // releases recovers its speed almost immediately (≤250ms) — the rest stay truly unaffected.
    slowAura: { mul: 0.55, refreshMs: 250, maxTargets: 5 },
  },
  athena: {
    name: 'Athena',
    blurb: 'War-council — buffs nearby gods and reveals hidden foes. No damage.',
    icon: '🦉',
    cost: 320,
    range: 110, // the buff + detection radius
    damage: 0, // pure support
    fireRate: 1, // unused
    footprint: 18,
    defaultTargeting: 'first',
    color: 0xd9c879,
    attack: 'hitscan',
    canHitAir: false,
    auraBuff: { damageMul: 1.15, fireRateMul: 1.1, detect: true },
  },
}

export const GOD_ORDER: readonly GodKind[] = ['zeus', 'apollo', 'demeter', 'hermes', 'hephaestus', 'poseidon', 'aphrodite', 'athena']

/** Fraction of a tower's invested gold refunded when sold (BTD6-style). */
export const SELL_REFUND_RATE = 0.7
/** Refund for selling a tower — a cut of TOTAL invested gold (placement + upgrades), not base cost.
 *  Structural param (not `Tower`) to keep data/ free of an entities/ import cycle. */
export function sellValue(tower: { invested: number }): number {
  return Math.floor(tower.invested * SELL_REFUND_RATE)
}
