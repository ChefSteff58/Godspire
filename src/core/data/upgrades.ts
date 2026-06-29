// ── src/core/data ── the Pantheon upgrade trees. Pure data + pure fold helpers.
//
// Each god has TWO paths (A / B), each with THREE tiers, bought in order. Cross-path rule
// (BTD6-style): one path is your "main" (up to tier 3); the OTHER is a "secondary" capped at
// tier 1 — so at most one path may exceed tier 1. Each path is a clear strategic commitment.
//
// M5-start scope: only STAT-based effects ship (damage / fire-rate / range / pierce / proj-speed
// multipliers + Demeter income). The marquee mechanics each path builds toward — Zeus's chain,
// Apollo's burn — arrive with their engine primitives; the tiers below are their stat foundation.

import type { GodKind } from './towers'
import { TOWER_STATS } from './towers'
import type { Tower } from '../entities/tower'

export type UpgradePathKey = 'A' | 'B'

export interface UpgradeEffect {
  damageMul?: number
  fireRateMul?: number
  rangeMul?: number
  pierceAdd?: number
  projectileSpeedMul?: number
  /** Demeter: flat gold added to this farm's per-wave payout. */
  incomePerWaveAdd?: number
  /** Demeter: gold-per-wave that scales with the wave number (× wave). */
  incomeWaveScaleAdd?: number
  /** Grants anti-air (the Zeus Stormcaller tier — "the storm reaches the sky"). */
  grantsAir?: boolean
  /** Hephaestus: extra spike-trap charges. */
  maxChargesAdd?: number
}

export interface UpgradeTier {
  name: string
  cost: number
  desc: string
  effect: UpgradeEffect
}

export interface UpgradePath {
  name: string
  blurb: string
  tiers: readonly [UpgradeTier, UpgradeTier, UpgradeTier]
}

export interface GodUpgrades {
  A: UpgradePath
  B: UpgradePath
}

export const UPGRADES: Record<GodKind, GodUpgrades> = {
  zeus: {
    A: {
      name: 'Stormcaller',
      blurb: 'Rapid, wide bolts — the storm-mage line (builds toward chain lightning).',
      tiers: [
        { name: 'Forked Spark', cost: 130, desc: '+40% fire rate, +10% range', effect: { fireRateMul: 1.4, rangeMul: 1.1 } },
        { name: 'Storm Caller', cost: 240, desc: '+30% fire rate, +20% damage · strikes flying foes', effect: { fireRateMul: 1.3, damageMul: 1.2, rangeMul: 1.1, grantsAir: true } },
        { name: 'Wrath of the Sky', cost: 650, desc: '+40% fire rate, +40% damage, +20% range', effect: { fireRateMul: 1.4, damageMul: 1.4, rangeMul: 1.2 } },
      ],
    },
    B: {
      name: 'Tyrant',
      blurb: 'Slow, apocalyptic single hits — the boss/tank deleter.',
      tiers: [
        { name: 'Heavy Bolt', cost: 160, desc: '×3 damage, −40% fire rate, +20% range', effect: { damageMul: 3, fireRateMul: 0.6, rangeMul: 1.2 } },
        { name: 'Smite', cost: 320, desc: '+100% damage, +15% range', effect: { damageMul: 2, rangeMul: 1.15 } },
        { name: 'Bolt of the Titanomachy', cost: 800, desc: '+120% damage, +30% range', effect: { damageMul: 2.2, rangeMul: 1.3 } },
      ],
    },
  },
  apollo: {
    A: {
      name: 'Sunlance',
      blurb: 'More pierce, faster arrows — rake whole columns of swarm & splits.',
      tiers: [
        { name: 'Long Draw', cost: 160, desc: '+2 pierce, +40% arrow speed', effect: { pierceAdd: 2, projectileSpeedMul: 1.4 } },
        { name: 'Noon Volley', cost: 300, desc: '+2 pierce, +30% fire rate', effect: { pierceAdd: 2, fireRateMul: 1.3 } },
        { name: 'Solar Spear', cost: 720, desc: '+6 pierce, +30% damage', effect: { pierceAdd: 6, damageMul: 1.3 } },
      ],
    },
    B: {
      name: 'Plague-Ender',
      blurb: 'Heavy single arrows — the anti-tank line (builds toward a burning DoT).',
      tiers: [
        { name: 'Fever Arrow', cost: 190, desc: '+70% damage', effect: { damageMul: 1.7 } },
        { name: 'Sun-Sickness', cost: 360, desc: '+60% damage, +10% fire rate', effect: { damageMul: 1.6, fireRateMul: 1.1 } },
        { name: 'Wrath of the Plague', cost: 760, desc: '+100% damage', effect: { damageMul: 2 } },
      ],
    },
  },
  demeter: {
    A: {
      name: 'Cornucopia',
      blurb: 'Steady, reliable passive income — plant it and get richer.',
      tiers: [
        { name: 'Fertile Fields', cost: 200, desc: '+50 gold per wave', effect: { incomePerWaveAdd: 50 } },
        { name: 'Bountiful Harvest', cost: 360, desc: '+100 gold per wave', effect: { incomePerWaveAdd: 100 } },
        { name: 'Horn of Plenty', cost: 700, desc: '+220 gold per wave', effect: { incomePerWaveAdd: 220 } },
      ],
    },
    B: {
      name: 'Vault of Plutus',
      blurb: 'Speculative wealth that scales with the wave — pays off late.',
      tiers: [
        { name: 'Seed Capital', cost: 220, desc: '+5 gold × wave, each wave', effect: { incomeWaveScaleAdd: 5 } },
        { name: 'Compound Growth', cost: 420, desc: '+9 gold × wave, each wave', effect: { incomeWaveScaleAdd: 9 } },
        { name: 'Wealth of the Underworld', cost: 820, desc: '+16 gold × wave, each wave', effect: { incomeWaveScaleAdd: 16 } },
      ],
    },
  },
  hermes: {
    A: {
      name: 'Strafing Ace',
      blurb: 'A wide, hard-hitting warplane — covers the map with heavy strafing runs.',
      tiers: [
        { name: 'War Plane', cost: 150, desc: '+25% range, +30% damage', effect: { rangeMul: 1.25, damageMul: 1.3 } },
        { name: 'Dive Bomber', cost: 300, desc: '+20% range, +50% damage', effect: { rangeMul: 1.2, damageMul: 1.5 } },
        { name: 'Sky Sovereign', cost: 720, desc: '+25% range, +60% damage', effect: { rangeMul: 1.25, damageMul: 1.6 } },
      ],
    },
    B: {
      name: "Hermes' Escort",
      blurb: 'A rapid hovering gunship — a wall of darts over one chokepoint.',
      tiers: [
        { name: 'Twin Guns', cost: 160, desc: '+35% fire rate', effect: { fireRateMul: 1.35 } },
        { name: 'Gunship', cost: 320, desc: '+35% fire rate, +20% damage', effect: { fireRateMul: 1.35, damageMul: 1.2 } },
        { name: 'Storm of Arrows', cost: 700, desc: '+45% fire rate, +30% damage', effect: { fireRateMul: 1.45, damageMul: 1.3 } },
      ],
    },
  },
  hephaestus: {
    A: {
      name: 'Caltrop Forge',
      blurb: 'A bigger, deadlier stockpile — pure end-of-track leak insurance.',
      tiers: [
        { name: 'Sharpened Spikes', cost: 150, desc: '+50% damage, +4 trap charges', effect: { damageMul: 1.5, maxChargesAdd: 4 } },
        { name: 'Bronze Caltrops', cost: 300, desc: '+60% damage, +6 charges', effect: { damageMul: 1.6, maxChargesAdd: 6 } },
        { name: 'Mountain of Iron', cost: 700, desc: '+80% damage, +10 charges', effect: { damageMul: 1.8, maxChargesAdd: 10 } },
      ],
    },
    B: {
      name: 'Line of Automatons',
      blurb: 'A relentless forge — spikes faster so the trap never runs dry.',
      tiers: [
        { name: 'Stoked Bellows', cost: 160, desc: '+60% production, +20% damage', effect: { fireRateMul: 1.6, damageMul: 1.2 } },
        { name: 'Automaton Crew', cost: 320, desc: '+50% production, +30% damage', effect: { fireRateMul: 1.5, damageMul: 1.3 } },
        { name: 'Forge of the Gods', cost: 720, desc: '+60% production, +50% damage', effect: { fireRateMul: 1.6, damageMul: 1.5 } },
      ],
    },
  },
}

export interface FoldedUpgrades {
  damageMul: number
  fireRateMul: number
  rangeMul: number
  pierceAdd: number
  projectileSpeedMul: number
  incomePerWaveAdd: number
  incomeWaveScaleAdd: number
  grantsAir: boolean
  maxChargesAdd: number
}

/** Accumulate every purchased tier's effects (paths multiply for muls, add for adds). Pure. */
export function foldUpgrades(god: GodKind, pathATier: number, pathBTier: number): FoldedUpgrades {
  const f: FoldedUpgrades = { damageMul: 1, fireRateMul: 1, rangeMul: 1, pierceAdd: 0, projectileSpeedMul: 1, incomePerWaveAdd: 0, incomeWaveScaleAdd: 0, grantsAir: false, maxChargesAdd: 0 }
  const applyPath = (path: UpgradePathKey, tier: number) => {
    const p = UPGRADES[god]?.[path]
    if (!p) return
    for (let i = 0; i < tier && i < p.tiers.length; i++) {
      const e = p.tiers[i].effect
      f.damageMul *= e.damageMul ?? 1
      f.fireRateMul *= e.fireRateMul ?? 1
      f.rangeMul *= e.rangeMul ?? 1
      f.pierceAdd += e.pierceAdd ?? 0
      f.projectileSpeedMul *= e.projectileSpeedMul ?? 1
      f.incomePerWaveAdd += e.incomePerWaveAdd ?? 0
      f.incomeWaveScaleAdd += e.incomeWaveScaleAdd ?? 0
      f.grantsAir = f.grantsAir || (e.grantsAir ?? false)
      f.maxChargesAdd += e.maxChargesAdd ?? 0
    }
  }
  applyPath('A', pathATier)
  applyPath('B', pathBTier)
  return f
}

export interface EffectiveStats {
  damage: number
  fireRate: number
  range: number
  pierce: number
  projectileSpeed: number
  /** Can this tower (base + upgrades) strike flying enemies? */
  canHitAir: boolean
  /** Hephaestus: spike-trap charge capacity (base + upgrades). */
  maxCharges: number
}

/** A tower's combat stats after its upgrades (base × folded multipliers). Pure. */
export function towerEffectiveStats(tower: Tower): EffectiveStats {
  const base = TOWER_STATS[tower.god]
  const f = foldUpgrades(tower.god, tower.pathA, tower.pathB)
  return {
    damage: base.damage * f.damageMul,
    fireRate: base.fireRate * f.fireRateMul,
    range: base.range * f.rangeMul,
    pierce: (base.pierce ?? 0) + f.pierceAdd,
    projectileSpeed: (base.projectileSpeed ?? 500) * f.projectileSpeedMul,
    canHitAir: (base.canHitAir ?? false) || f.grantsAir,
    maxCharges: (base.deployable?.maxCharges ?? 0) + f.maxChargesAdd,
  }
}

export const DEMETER_BASE_INCOME = 50

/** Gold a Demeter farm pays out when a wave clears (0 for non-Demeter towers). Pure. */
export function demeterIncome(tower: Tower, wave: number): number {
  if (tower.god !== 'demeter') return 0
  const f = foldUpgrades('demeter', tower.pathA, tower.pathB)
  return Math.floor(DEMETER_BASE_INCOME + f.incomePerWaveAdd + f.incomeWaveScaleAdd * Math.max(0, wave))
}

/** The next purchasable tier on a path, or null if maxed. */
export function nextTier(god: GodKind, path: UpgradePathKey, currentTier: number): UpgradeTier | null {
  if (currentTier >= 3) return null
  return UPGRADES[god]?.[path]?.tiers[currentTier] ?? null
}

/**
 * Cross-path rule: a path can be upgraded if it isn't maxed AND buying it wouldn't create a
 * SECOND path above tier 1 (one main to 3, one secondary capped at 1).
 */
export function canUpgradePath(tower: Tower, path: UpgradePathKey): boolean {
  const cur = path === 'A' ? tower.pathA : tower.pathB
  const other = path === 'A' ? tower.pathB : tower.pathA
  if (cur >= 3) return false
  if (cur >= 1 && other >= 2) return false // the other path is already the main beyond tier 1
  return true
}
