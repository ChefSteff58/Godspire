// ── src/core/run ── the Fate Draft's boon pool + how boons fold into run modifiers. Pure.
//
// This is the M3.5 "ship-now" tranche distilled from the boon design pass: globals (offense /
// economy / defense / utility), Zeus/Apollo per-god boons, and two synergy cards. Every boon
// here works on the M3 engine with NO tower-internal change — per-god boons for the unbuilt gods
// and mechanic-dependent boons (slow, crit, DoT, pierce…) land alongside those gods in M4/M5.

import type { GodKind } from '../data/towers'
import { GOD_ORDER } from '../data/towers'
import type { Modifiers } from '../progress/types'
import type { RunModifiers } from './types'

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'
export type BoonCategory = 'eco' | 'off' | 'def' | 'util' | 'syn' | 'core'

export type BoonEffect =
  // ── immediate (applied by the controller the instant the boon is picked) ──
  | { kind: 'goldGrant'; value: number }
  | { kind: 'livesGrant'; value: number } // heals (clamped to max); negative can end the run
  | { kind: 'maxLivesAdd'; value: number } // raise the lives cap AND heal that much
  | { kind: 'gateShield'; value: number } // gain N shield charges — each absorbs one leak
  | { kind: 'secondWind' } // once: survive the first defeat at 25 lives
  // ── persistent (folded into RunModifiers, read at fire-time) ──
  | { kind: 'goldPerKillAdd'; value: number }
  | { kind: 'towerDamageMul'; value: number }
  | { kind: 'godDamageMul'; god: GodKind; value: number }
  | { kind: 'fireRateMul'; value: number }
  // ── M11 per-god signature effects (each amps ONE god's mechanic; single-god → no key) ──
  | { kind: 'demeterIncomeMul'; value: number } // Demeter farm payout
  | { kind: 'knockbackMul'; value: number } // Poseidon splash knockback
  | { kind: 'auraRangeMul'; value: number } // Athena aura radius
  | { kind: 'charmTargetsAdd'; value: number } // Aphrodite simultaneous charms
  | { kind: 'spikeChargesAdd'; value: number } // Hephaestus spike charges
  // ── combinators ──
  | { kind: 'composite'; effects: BoonEffect[] }
  | { kind: 'coinflipFold'; win: BoonEffect; lose: BoonEffect } // 50/50 on pick

export interface Boon {
  id: string
  name: string
  desc: string // what it does (mechanical)
  flavor: string // witty Greek tone
  icon: string
  rarity: Rarity
  category: BoonCategory
  effect: BoonEffect
}

/** Draft draw-weight by rarity — rarer cards surface less often, so legendaries feel special. */
export const RARITY_WEIGHT: Record<Rarity, number> = { common: 100, rare: 45, epic: 18, legendary: 6 }

// Soft caps so an endless run can't compound multiplicative boons into a broken state
// (the #1 balance risk the design critique flagged). Generous — power fantasy still allowed.
export const FIRE_RATE_CAP = 3
export const GOD_DAMAGE_CAP = 4 // a single god can quadruple, not compound forever
export const TOWER_DAMAGE_CAP = 12
// M11 per-god signature-mul caps (endless-run safety; adds like charm/spike are naturally bounded)
export const DEMETER_INCOME_CAP = 4
export const KNOCKBACK_CAP = 4
export const AURA_RANGE_CAP = 3

export const BOON_POOL: readonly Boon[] = [
  // ── Economy ──
  { id: 'eco-midas-windfall', name: "Midas' Windfall", desc: '+300 gold, now.', flavor: 'Everything I touch turns to gold. Including this conversation.', icon: '🪙', rarity: 'common', category: 'eco', effect: { kind: 'goldGrant', value: 300 } },
  { id: 'eco-tithe-of-the-fallen', name: 'Tithe of the Fallen', desc: '+2 gold per kill.', flavor: 'Every monster pays a toll on the way to the Underworld.', icon: '💰', rarity: 'common', category: 'eco', effect: { kind: 'goldPerKillAdd', value: 2 } },
  { id: 'eco-coin-of-charon', name: 'Coin of Charon', desc: '+5 gold per kill.', flavor: "The ferryman's rates went up. Good thing your foes are paying.", icon: '⚱️', rarity: 'rare', category: 'eco', effect: { kind: 'goldPerKillAdd', value: 5 } },
  { id: 'eco-spoils-of-war', name: 'Spoils of War', desc: '+10 gold per kill.', flavor: "Don't loot the bodies — just leave them where you can reach.", icon: '🏺', rarity: 'epic', category: 'eco', effect: { kind: 'goldPerKillAdd', value: 10 } },
  { id: 'eco-favor-of-fortuna', name: 'Favor of Fortuna', desc: '+600 gold and +15 lives, now.', flavor: 'Lady Luck owed me. I collect in gold and in lives.', icon: '🍀', rarity: 'epic', category: 'eco', effect: { kind: 'composite', effects: [{ kind: 'goldGrant', value: 600 }, { kind: 'livesGrant', value: 15 }] } },

  // ── Offense (global) ──
  { id: 'off-divine-wrath', name: 'Divine Wrath', desc: 'All gods deal +15% damage.', flavor: 'When gods get angry, mortals get archaeology.', icon: '⚔️', rarity: 'common', category: 'off', effect: { kind: 'towerDamageMul', value: 1.15 } },
  { id: 'off-hermes-tempo', name: "Hermes' Tempo", desc: 'All gods fire +12% faster.', flavor: 'Fast feet, faster volleys, fastest excuses.', icon: '🪽', rarity: 'common', category: 'off', effect: { kind: 'fireRateMul', value: 1.12 } },
  { id: 'off-blood-of-titans', name: 'Blood of the Titans', desc: 'All gods deal +25% damage.', flavor: 'Titan blood: now with 25% more grudge.', icon: '🩸', rarity: 'rare', category: 'off', effect: { kind: 'towerDamageMul', value: 1.25 } },
  { id: 'off-twin-volley', name: 'Twin Volley', desc: 'All gods fire +25% faster.', flavor: 'Why fire once when twice is also an option?', icon: '🎯', rarity: 'rare', category: 'off', effect: { kind: 'fireRateMul', value: 1.25 } },
  { id: 'off-relentless-onslaught', name: 'Relentless Onslaught', desc: '+20% damage AND +20% fire rate.', flavor: 'Less aiming, more avalanche.', icon: '🌋', rarity: 'epic', category: 'off', effect: { kind: 'composite', effects: [{ kind: 'towerDamageMul', value: 1.2 }, { kind: 'fireRateMul', value: 1.2 }] } },
  { id: 'off-wrath-of-the-pantheon', name: 'Wrath of the Pantheon', desc: 'All gods deal +50% damage.', flavor: 'The whole family showed up. Run.', icon: '⛈️', rarity: 'legendary', category: 'off', effect: { kind: 'towerDamageMul', value: 1.5 } },

  // ── Per-god signatures — one for every god; each amps that god's REAL mechanic (M11 S2). ──
  { id: 'core-zeus-king-of-storms', name: 'King of Storms', desc: 'Zeus deals +30% damage.', flavor: "I don't throw bolts. I throw verdicts.", icon: '⚡', rarity: 'common', category: 'core', effect: { kind: 'godDamageMul', god: 'zeus', value: 1.3 } },
  { id: 'core-apollo-noon-glare', name: 'Noon Glare', desc: 'Apollo deals +30% damage.', flavor: 'Aim is just confidence with geometry.', icon: '☀️', rarity: 'common', category: 'core', effect: { kind: 'godDamageMul', god: 'apollo', value: 1.3 } },
  { id: 'core-demeter-golden-harvest', name: 'Golden Harvest', desc: 'Demeter farms pay +60% income.', flavor: 'She counts the harvest twice — once for you, once for spite.', icon: '🌾', rarity: 'rare', category: 'core', effect: { kind: 'demeterIncomeMul', value: 1.6 } },
  { id: 'core-poseidon-riptide', name: 'Riptide', desc: "Poseidon's waves knock foes +80% farther back.", flavor: "The tide doesn't push. It evicts.", icon: '🌊', rarity: 'rare', category: 'core', effect: { kind: 'knockbackMul', value: 1.8 } },
  { id: 'core-athena-far-sight', name: 'Far Sight', desc: "Athena's aura reaches +40% farther.", flavor: 'The owl sees the whole board. And it is judging your placement.', icon: '🦉', rarity: 'rare', category: 'core', effect: { kind: 'auraRangeMul', value: 1.4 } },
  { id: 'core-aphrodite-rapture', name: 'Rapture', desc: 'Aphrodite charms +2 more foes at once.', flavor: 'Two more hearts, utterly wrecked. She is not even trying.', icon: '💘', rarity: 'rare', category: 'core', effect: { kind: 'charmTargetsAdd', value: 2 } },
  { id: 'core-hephaestus-forge-everlasting', name: 'Forge Everlasting', desc: "Hephaestus's spikes gain +2 charges.", flavor: 'The forge never cools, and neither does the grudge underfoot.', icon: '🔨', rarity: 'common', category: 'core', effect: { kind: 'spikeChargesAdd', value: 2 } },
  { id: 'core-hermes-winged-heels', name: 'Winged Heels', desc: 'Hermes deals +30% damage.', flavor: 'Faster feet, harder hits, better one-liners.', icon: '🪽', rarity: 'common', category: 'core', effect: { kind: 'godDamageMul', god: 'hermes', value: 1.3 } },

  // ── Defense / survival ──
  { id: 'def-ambrosia-draught', name: 'Draught of Ambrosia', desc: '+20 lives, now.', flavor: "A sip of the gods' own brunch. Olympus exhales.", icon: '🍶', rarity: 'common', category: 'def', effect: { kind: 'livesGrant', value: 20 } },
  { id: 'def-aegis-of-athena', name: 'Aegis of Athena', desc: '+25 max lives (and heal 25).', flavor: 'She lends the shield. You still have to not die behind it.', icon: '🛡️', rarity: 'rare', category: 'def', effect: { kind: 'maxLivesAdd', value: 25 } },
  { id: 'def-bulwark-of-styx', name: 'Bulwark of Styx', desc: 'Gain an 8-charge gate shield — each leak burns a charge, not a life.', flavor: 'Dip Olympus in the river. Mind the one unprotected heel.', icon: '🌊', rarity: 'epic', category: 'def', effect: { kind: 'gateShield', value: 8 } },
  { id: 'def-second-wind-of-nike', name: 'Second Wind of Nike', desc: 'Once: when Olympus would fall, rise again at 25 lives.', flavor: 'Victory hates a loose end. Once, she refuses to let you lose.', icon: '🪶', rarity: 'legendary', category: 'def', effect: { kind: 'secondWind' } },

  // ── Utility ──
  { id: 'util-festival-of-dionysus', name: 'Festival of Dionysus', desc: 'All gods fire +35% faster.', flavor: 'Everybody drinks, everybody fights faster.', icon: '🍷', rarity: 'epic', category: 'util', effect: { kind: 'fireRateMul', value: 1.35 } },

  // ── Synergy / build-defining ──
  { id: 'syn-storm-front', name: 'Storm Front', desc: 'Zeus +35% damage and all gods +10% fire rate.', flavor: 'Zeus picks the target. Hermes picks the tempo.', icon: '🌩️', rarity: 'rare', category: 'syn', effect: { kind: 'composite', effects: [{ kind: 'godDamageMul', god: 'zeus', value: 1.35 }, { kind: 'fireRateMul', value: 1.1 }] } },
  { id: 'syn-gamblers-laurel', name: "Gambler's Laurel", desc: 'Coin flip: +120% all-god damage… or −20%.', flavor: "Heads, you're a legend. Tails, the Fates laughed.", icon: '🎲', rarity: 'legendary', category: 'syn', effect: { kind: 'coinflipFold', win: { kind: 'towerDamageMul', value: 2.2 }, lose: { kind: 'towerDamageMul', value: 0.8 } } },
]

/** A fresh RunModifiers seeded from the meta save (before any boon). godDamageMul covers every god. */
export function baseRunModifiers(meta: Modifiers): RunModifiers {
  const godDamageMul = {} as Record<GodKind, number>
  for (const g of GOD_ORDER) godDamageMul[g] = 1
  // Seed run modifiers from the meta skill tree (defensive `?? default` so a partial meta is safe).
  return {
    towerDamageMul: meta.towerDamageMul,
    fireRateMul: meta.fireRateMul ?? 1,
    goldPerKillBonus: meta.goldPerKillAdd ?? 0,
    godDamageMul,
    bossDamageMul: meta.bossDamageMul ?? 1,
    incomeMul: meta.incomeMul ?? 1,
    demeterIncomeMul: 1,
    knockbackMul: 1,
    auraRangeMul: 1,
    charmTargetsAdd: 0,
    spikeChargesAdd: 0,
  }
}

/** The god a boon is TIED to (its per-god signature), or null for a global/meta boon. Drives the
 * dead-card filter — a per-god boon for a god you haven't fielded is dropped from the draft. */
export function boonGod(b: Boon): GodKind | null {
  switch (b.effect.kind) {
    case 'godDamageMul': return b.effect.god
    case 'demeterIncomeMul': return 'demeter'
    case 'knockbackMul': return 'poseidon'
    case 'auraRangeMul': return 'athena'
    case 'charmTargetsAdd': return 'aphrodite'
    case 'spikeChargesAdd': return 'hephaestus'
    default: return null
  }
}

/**
 * Fold the meta modifiers + the run's active PERSISTENT effects into RunModifiers. Pure — returns
 * a NEW object and never mutates `meta`. The controller flattens composite/coinflip into leaf
 * persistent effects before they reach here, so only the 4 leaf kinds are handled. Soft-capped.
 */
export function foldRunModifiers(meta: Modifiers, effects: readonly BoonEffect[]): RunModifiers {
  const rm = baseRunModifiers(meta)
  for (const e of effects) {
    if (e.kind === 'goldPerKillAdd') rm.goldPerKillBonus += e.value
    else if (e.kind === 'towerDamageMul') rm.towerDamageMul *= e.value
    else if (e.kind === 'fireRateMul') rm.fireRateMul *= e.value
    else if (e.kind === 'godDamageMul') rm.godDamageMul[e.god] = (rm.godDamageMul[e.god] ?? 1) * e.value
    else if (e.kind === 'demeterIncomeMul') rm.demeterIncomeMul *= e.value
    else if (e.kind === 'knockbackMul') rm.knockbackMul *= e.value
    else if (e.kind === 'auraRangeMul') rm.auraRangeMul *= e.value
    else if (e.kind === 'charmTargetsAdd') rm.charmTargetsAdd += e.value
    else if (e.kind === 'spikeChargesAdd') rm.spikeChargesAdd += e.value
  }
  rm.fireRateMul = Math.min(rm.fireRateMul, FIRE_RATE_CAP)
  rm.towerDamageMul = Math.min(rm.towerDamageMul, TOWER_DAMAGE_CAP)
  for (const g of Object.keys(rm.godDamageMul) as (keyof typeof rm.godDamageMul)[]) {
    rm.godDamageMul[g] = Math.min(rm.godDamageMul[g], GOD_DAMAGE_CAP) // per-god boons compound in endless too
  }
  rm.demeterIncomeMul = Math.min(rm.demeterIncomeMul, DEMETER_INCOME_CAP)
  rm.knockbackMul = Math.min(rm.knockbackMul, KNOCKBACK_CAP)
  rm.auraRangeMul = Math.min(rm.auraRangeMul, AURA_RANGE_CAP)
  return rm
}
