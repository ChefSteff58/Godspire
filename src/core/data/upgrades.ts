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
  /** Poseidon: blast radius / knockback multipliers. */
  splashRadiusMul?: number
  knockbackMul?: number
  /** Aphrodite: multiply the slow mul (<1 deepens the slow; floored so foes never fully stop). */
  slowMulMul?: number
  /** Aphrodite: extra foes the charm can hold at once (the Glue & Charm path widens the crowd cap). */
  slowTargetsAdd?: number
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
        { name: 'Forked Spark', cost: 130, desc: 'The storm grows eager — quicker bolts that reach farther.', effect: { fireRateMul: 1.4, rangeMul: 1.1 } },
        { name: 'Thunderhead', cost: 240, desc: 'The storm climbs to the clouds — now strikes flying foes, harder and quicker.', effect: { fireRateMul: 1.3, damageMul: 1.2, rangeMul: 1.1, grantsAir: true } },
        { name: 'Wrath of the Sky', cost: 520, desc: 'A ceaseless tempest — faster, fiercer, and reaching far across the field.', effect: { fireRateMul: 1.6, damageMul: 1.4, rangeMul: 1.2 } },
      ],
    },
    B: {
      name: 'Tyrant',
      blurb: 'Slow, apocalyptic single hits — the boss/tank deleter.',
      tiers: [
        { name: 'Heavy Bolt', cost: 160, desc: 'One titanic bolt — triples the wound, but the sky charges slowly.', effect: { damageMul: 3, fireRateMul: 0.6, rangeMul: 1.2 } },
        { name: 'Smite', cost: 320, desc: "A god's judgment falls — doubles the blast and reaches farther.", effect: { damageMul: 2, rangeMul: 1.15 } },
        { name: 'Bolt of the Titanomachy', cost: 800, desc: 'The bolt that felled the Titans — annihilates whatever it strikes.', effect: { damageMul: 2.2, rangeMul: 1.3 } },
      ],
    },
  },
  apollo: {
    A: {
      name: 'Sunlance',
      blurb: 'More pierce, faster arrows — rake whole columns of swarm & splits.',
      tiers: [
        { name: 'Long Draw', cost: 160, desc: 'A longer draw — arrows scream through 2 more foes in a line.', effect: { pierceAdd: 2, projectileSpeedMul: 1.4 } },
        { name: 'Noon Volley', cost: 300, desc: 'The sun at its zenith — pierces 2 more and looses noticeably quicker.', effect: { pierceAdd: 2, fireRateMul: 1.3 } },
        { name: 'Solar Spear', cost: 720, desc: 'A spear of pure daylight — skewers a whole column (+6 pierce) and hits harder.', effect: { pierceAdd: 6, damageMul: 1.3 } },
      ],
    },
    B: {
      name: 'Plague-Ender',
      blurb: 'Heavy single arrows — the anti-tank line (builds toward a burning DoT).',
      tiers: [
        { name: 'Fever Arrow', cost: 190, desc: 'Each arrow festers in the wound — far heavier single hits.', effect: { damageMul: 1.7 } },
        { name: 'Sun-Sickness', cost: 360, desc: 'Sunstroke sets in — heavier blows, loosed a touch faster.', effect: { damageMul: 1.6, fireRateMul: 1.1 } },
        { name: 'Wrath of the Plague', cost: 760, desc: 'A killing fever — doubles the wound on the toughest foe.', effect: { damageMul: 2 } },
      ],
    },
  },
  demeter: {
    A: {
      name: 'Cornucopia',
      blurb: 'Steady, reliable passive income — plant it and get richer.',
      tiers: [
        { name: 'Fertile Fields', cost: 200, desc: 'Tilled and sown — a dependable +20 gold every wave.', effect: { incomePerWaveAdd: 20 } },
        { name: 'Bountiful Harvest', cost: 360, desc: 'The fields overflow — +45 gold harvested every wave.', effect: { incomePerWaveAdd: 45 } },
        { name: 'Horn of Plenty', cost: 700, desc: 'A cornucopia that never empties — +95 gold every wave.', effect: { incomePerWaveAdd: 95 } },
      ],
    },
    B: {
      name: 'Vault of Plutus',
      blurb: 'Speculative wealth that scales with the wave — pays off late.',
      tiers: [
        { name: 'Seed Capital', cost: 220, desc: 'Plant gold to grow gold — the payout swells with the wave (+2×wave).', effect: { incomeWaveScaleAdd: 2 } },
        { name: 'Compound Growth', cost: 420, desc: 'Interest upon interest — +3×wave heaped on each harvest.', effect: { incomeWaveScaleAdd: 3 } },
        { name: 'Wealth of the Underworld', cost: 820, desc: 'Plutus throws open the vault — +4×wave, riches that snowball late.', effect: { incomeWaveScaleAdd: 4 } },
      ],
    },
  },
  hermes: {
    A: {
      name: 'Strafing Ace',
      blurb: 'A wide, hard-hitting warplane — covers the map with heavy strafing runs.',
      tiers: [
        { name: 'Wings of War', cost: 150, desc: 'Wider sweeps on mightier wings — more reach, heavier darts each pass.', effect: { rangeMul: 1.25, damageMul: 1.3 } },
        { name: 'Screaming Dive', cost: 300, desc: 'He folds his wings and falls like judgment — punishing hits across the field.', effect: { rangeMul: 1.2, damageMul: 1.5 } },
        { name: 'Sky Sovereign', cost: 720, desc: 'Master of the skies — devastating strafes that rule the whole map.', effect: { rangeMul: 1.25, damageMul: 1.6 } },
      ],
    },
    B: {
      name: "Hermes' Escort",
      blurb: 'A rapid hovering gunship — a wall of darts over one chokepoint.',
      tiers: [
        { name: 'Twin Caducei', cost: 160, desc: 'A second serpent-staff joins the volley — a faster stream of darts.', effect: { fireRateMul: 1.35 } },
        { name: 'Hovering Sentinel', cost: 320, desc: 'He holds the air over one lane — rapid, harder-hitting fire.', effect: { fireRateMul: 1.35, damageMul: 1.2 } },
        { name: 'Storm of Arrows', cost: 700, desc: 'An unbroken wall of darts — nothing crosses the chokepoint.', effect: { fireRateMul: 1.45, damageMul: 1.3 } },
      ],
    },
  },
  hephaestus: {
    A: {
      name: 'Caltrop Forge',
      blurb: 'A bigger, deadlier stockpile — pure end-of-track leak insurance.',
      tiers: [
        { name: 'Sharpened Spikes', cost: 150, desc: 'Honed to a needlepoint — deadlier spikes and a deeper stockpile (+4).', effect: { damageMul: 1.5, maxChargesAdd: 4 } },
        { name: 'Bronze Caltrops', cost: 300, desc: 'Cast-bronze barbs — harder hits and a fat reserve (+6) under the path.', effect: { damageMul: 1.6, maxChargesAdd: 6 } },
        { name: 'Mountain of Iron', cost: 700, desc: 'An iron mountain of caltrops — brutal and all but bottomless (+10).', effect: { damageMul: 1.8, maxChargesAdd: 10 } },
      ],
    },
    B: {
      name: 'Line of Automatons',
      blurb: 'A relentless forge — spikes faster so the trap never runs dry.',
      tiers: [
        { name: 'Stoked Bellows', cost: 160, desc: 'The bellows roar — traps forged faster and hitting harder.', effect: { fireRateMul: 1.6, damageMul: 1.2 } },
        { name: 'Automaton Crew', cost: 320, desc: 'Bronze automatons stamp out spikes — the line never thins.', effect: { fireRateMul: 1.5, damageMul: 1.3 } },
        { name: 'Forge of the Gods', cost: 720, desc: 'The divine forge blazes — an endless torrent of fresh spikes.', effect: { fireRateMul: 1.6, damageMul: 1.5 } },
      ],
    },
  },
  poseidon: {
    A: {
      name: 'Tsunami',
      blurb: 'Wider blasts and harder knockback — mass crowd control on the straights.',
      tiers: [
        { name: 'Breaker Wave', cost: 200, desc: 'A breaking wave — a wider slam that hurls foes back down the path.', effect: { splashRadiusMul: 1.3, knockbackMul: 1.3, damageMul: 1.2 } },
        { name: 'Storm Surge', cost: 380, desc: 'The surge rises — bigger blasts shove the whole crowd downhill.', effect: { splashRadiusMul: 1.25, knockbackMul: 1.3, damageMul: 1.3 } },
        { name: 'Wrath of the Deep', cost: 820, desc: "The sea's full fury — sweeps the lane and flings survivors far back.", effect: { splashRadiusMul: 1.3, knockbackMul: 1.4, damageMul: 1.4 } },
      ],
    },
    B: {
      name: 'Maelstrom',
      blurb: 'Relentless torpedoes — hits harder and faster (the tank-cracker).',
      tiers: [
        { name: 'Spear of the Tides', cost: 200, desc: 'The tide sharpens to a point — far heavier impacts on whatever it catches.', effect: { damageMul: 1.6 } },
        { name: 'Wrath from Below', cost: 380, desc: 'The seafloor answers — harder, quicker slams from the deep.', effect: { damageMul: 1.5, fireRateMul: 1.3 } },
        { name: 'Kraken Rising', cost: 800, desc: 'The Kraken wakes — crushing, relentless strikes from the deep.', effect: { damageMul: 1.8, fireRateMul: 1.3 } },
      ],
    },
  },
  aphrodite: {
    A: {
      name: 'Glue & Charm',
      blurb: 'Charms a bigger crowd — holds far more of the lane spellbound at once.',
      tiers: [
        { name: 'Sticky Heart', cost: 140, desc: 'Love spreads — the charm holds 2 more foes, and the field widens.', effect: { rangeMul: 1.2, slowTargetsAdd: 2 } },
        { name: 'Sweet Nothings', cost: 260, desc: 'Whispered promises — captivate 3 more foes across a wider field.', effect: { rangeMul: 1.2, slowTargetsAdd: 3 } },
        { name: 'Irresistible', cost: 600, desc: 'None resist her — charms 4 more in a sweeping field of love.', effect: { rangeMul: 1.25, slowTargetsAdd: 4 } },
      ],
    },
    B: {
      name: 'Winter Aphrodite',
      blurb: 'Cold-hearted — a near-freeze that pins the charmed few in place.',
      tiers: [
        { name: 'First Frost', cost: 160, desc: 'A cold shoulder — the charmed slow to a deep crawl.', effect: { slowMulMul: 0.7 } },
        { name: 'Hard Freeze', cost: 320, desc: 'Ice takes hold — a near-stop that reaches a little farther.', effect: { slowMulMul: 0.6, rangeMul: 1.1 } },
        { name: 'Eternal Winter', cost: 700, desc: 'Endless winter — the charmed are all but frozen where they stand.', effect: { slowMulMul: 0.5, rangeMul: 1.15 } },
      ],
    },
  },
  athena: {
    A: {
      name: 'Wisdom of War',
      blurb: 'Her counsel turns lethal — every blade in the war-council cuts deeper.',
      tiers: [
        { name: 'Battle Hymn', cost: 200, desc: 'A war-hymn rallies the council — nearby gods strike +20% harder.', effect: { damageMul: 1.2 } },
        { name: 'Phalanx Doctrine', cost: 360, desc: 'Drilled formation — the damage blessing on the aura deepens.', effect: { damageMul: 1.25 } },
        { name: 'Aegis of Victory', cost: 760, desc: "Victory's aegis — every blade inside the aura hits its hardest.", effect: { damageMul: 1.3 } },
      ],
    },
    B: {
      name: 'Strategist',
      blurb: 'The war-room that sees all — wider reach + a faster, sharper council.',
      tiers: [
        { name: 'Watchtower', cost: 180, desc: 'Raised watchtowers — a wider aura and a quicker-acting council.', effect: { rangeMul: 1.25, fireRateMul: 1.1 } },
        { name: "All-Seeing Aegis", cost: 340, desc: 'Nothing escapes her gaze — broader reach and a sharper tempo.', effect: { rangeMul: 1.2, fireRateMul: 1.15 } },
        { name: 'Grand Strategy', cost: 720, desc: 'Total command — the widest, fastest war-council on the field.', effect: { rangeMul: 1.25, fireRateMul: 1.2 } },
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
  splashRadiusMul: number
  knockbackMul: number
  slowMulMul: number
  slowTargetsAdd: number
}

/** Accumulate every purchased tier's effects (paths multiply for muls, add for adds). Pure. */
export function foldUpgrades(god: GodKind, pathATier: number, pathBTier: number): FoldedUpgrades {
  const f: FoldedUpgrades = { damageMul: 1, fireRateMul: 1, rangeMul: 1, pierceAdd: 0, projectileSpeedMul: 1, incomePerWaveAdd: 0, incomeWaveScaleAdd: 0, grantsAir: false, maxChargesAdd: 0, splashRadiusMul: 1, knockbackMul: 1, slowMulMul: 1, slowTargetsAdd: 0 }
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
      f.splashRadiusMul *= e.splashRadiusMul ?? 1
      f.knockbackMul *= e.knockbackMul ?? 1
      f.slowMulMul *= e.slowMulMul ?? 1
      f.slowTargetsAdd += e.slowTargetsAdd ?? 0
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
  /** Poseidon: AoE blast radius + per-hit knockback (base × upgrades). */
  splashRadius: number
  knockback: number
  /** Aphrodite: slow speed-multiplier applied to foes in range (floored so they never fully stop). */
  slowMul: number
  /** Aphrodite: how many foes the charm field can hold at once (base cap + upgrades). */
  slowTargets: number
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
    splashRadius: (base.splash?.radius ?? 0) * f.splashRadiusMul,
    knockback: (base.splash?.knockback ?? 0) * f.knockbackMul,
    slowMul: Math.max(0.15, (base.slowAura?.mul ?? 1) * f.slowMulMul), // floor: foes always creep
    slowTargets: (base.slowAura?.maxTargets ?? 0) + f.slowTargetsAdd,
  }
}

/** Athena's support buff (or null for non-support gods). Her damage/fire-rate tiers scale the aura. */
export function auraBuff(tower: Tower): { damageMul: number; fireRateMul: number; detect: boolean } | null {
  const base = TOWER_STATS[tower.god].auraBuff
  if (!base) return null
  const f = foldUpgrades(tower.god, tower.pathA, tower.pathB)
  return {
    damageMul: base.damageMul * f.damageMul,
    fireRateMul: base.fireRateMul * f.fireRateMul,
    detect: base.detect,
  }
}

export const DEMETER_BASE_INCOME = 20 // stopgap nerf (was 50) — full redesign in M12

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
