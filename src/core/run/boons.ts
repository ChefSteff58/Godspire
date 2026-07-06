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
  | { kind: 'earlyAscension' } // M11: scene-handled — ascend a random fielded god early (+ buff it)
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
  // ── M11 long-shot procs (all towers; rolled per shot in the fire loop) ──
  | { kind: 'critChance'; chance: number; mult: number } // % of shots deal ×mult
  | { kind: 'chainChance'; chance: number } // % of shots leap to a 2nd foe
  | { kind: 'instakillChance'; chance: number } // % chance to slay a non-boss outright
  | { kind: 'camoRevealChance'; chance: number } // % chance per acquisition to see a hidden foe
  // ── M11 build-defining (a dynamic fire-time factor from live run state; folded as flags/rates) ──
  | { kind: 'monotheistMul'; value: number } // ×dmg while exactly one god fielded
  | { kind: 'pantheonPerGod'; value: number } // +dmg per distinct god fielded
  | { kind: 'vengeancePerLife'; value: number } // +dmg per life lost this run
  // ── M11 map-altering ──
  | { kind: 'frozenStyx' } // scene+run: the lake ices over → buildable ground this run
  | { kind: 'siteRadiusMul'; value: number } // Blessed Grove: grow every Sacred Site's reach
  // ── M11 Fate Bargain curses (enemy buffs, folded into the run then read at spawn / on kill) ──
  | { kind: 'enemyHpMul'; value: number }
  | { kind: 'enemySpeedMul'; value: number }
  | { kind: 'bossBountyMul'; value: number }
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
  // ── M11 Fate Bargain only: a curse/reward gamble card (rendered split red/gold) ──
  bargain?: boolean
  curse?: string // the price (red)
  reward?: string // the boon (gold)
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
// M11 proc-chance caps — stacking copies can't guarantee a proc (keeps long-shots long)
export const CRIT_CHANCE_CAP = 0.5
export const CHAIN_CHANCE_CAP = 0.5
export const INSTAKILL_CHANCE_CAP = 0.1
export const CAMO_REVEAL_CAP = 0.25
// M11 build-defining caps (the dynamic factor stacks with the damage caps, so keep its parts bounded)
export const MONOTHEIST_CAP = 3
export const PANTHEON_PER_GOD_CAP = 0.15
export const VENGEANCE_PER_LIFE_CAP = 0.05
export const SITE_RADIUS_CAP = 3

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

  // ── Long-shot procs (M11 S3): rare-but-electric per-shot rolls, all towers ──
  { id: 'proc-critical-favor', name: 'Critical Favor', desc: '10% of shots strike for ×3 damage.', flavor: 'Sometimes the Fates guide the blow. Sometimes they just enjoy the mess.', icon: '💥', rarity: 'epic', category: 'off', effect: { kind: 'critChance', chance: 0.1, mult: 3 } },
  { id: 'proc-reapers-cut', name: "Reaper's Cut", desc: '1% chance to instantly slay a non-boss foe.', flavor: "Atropos keeps shears for exactly this. She's not picky about when.", icon: '☠️', rarity: 'epic', category: 'off', effect: { kind: 'instakillChance', chance: 0.01 } },
  { id: 'proc-arc-of-olympus', name: 'Arc of Olympus', desc: '5% of shots leap to a second nearby foe.', flavor: 'One bolt, two verdicts. Efficiency is a virtue on Olympus.', icon: '⚡', rarity: 'rare', category: 'off', effect: { kind: 'chainChance', chance: 0.05 } },
  { id: 'proc-all-seeing-eye', name: 'All-Seeing Eye', desc: 'Every tower gets a small chance to glimpse hidden (camo) foes.', flavor: 'Now and then, the whole pantheon looks the same way at once. Hide from that.', icon: '👁️', rarity: 'legendary', category: 'util', effect: { kind: 'camoRevealChance', chance: 0.03 } },

  // ── Build-defining (M11 S4): a dynamic damage factor from your live roster / how badly it's going ──
  { id: 'syn-monotheist', name: 'Monotheist', desc: 'While you field only ONE god, that god deals ×2 damage.', flavor: 'Pick a favorite. Commit to the bit. The others will understand. They will not.', icon: '🔱', rarity: 'legendary', category: 'syn', effect: { kind: 'monotheistMul', value: 2 } },
  { id: 'syn-full-pantheon', name: 'Full Pantheon', desc: '+6% all-god damage for each DIFFERENT god you field.', flavor: 'A quarrel of gods is still, technically, a team.', icon: '🏛️', rarity: 'epic', category: 'syn', effect: { kind: 'pantheonPerGod', value: 0.06 } },
  { id: 'syn-vengeance', name: 'Vengeance', desc: '+2% damage for every life Olympus has lost this run.', flavor: 'Nothing sharpens a god like a grudge and a body count.', icon: '💢', rarity: 'rare', category: 'syn', effect: { kind: 'vengeancePerLife', value: 0.02 } },

  // ── Visual / transform (M11 S5): boons you can SEE happen on the field ──
  { id: 'vis-early-ascension', name: 'Early Ascension', desc: 'A random god you field ascends now (+30% damage).', flavor: 'Skip the paperwork. Straight to godhood.', icon: '🌟', rarity: 'rare', category: 'core', effect: { kind: 'earlyAscension' } },
  { id: 'vis-golden-age', name: 'Golden Age', desc: 'Olympus blazes gold: all gods +12% damage and +12% fire rate.', flavor: 'For one shining age, everything the light touches is yours. The light touches everything.', icon: '🌅', rarity: 'epic', category: 'off', effect: { kind: 'composite', effects: [{ kind: 'towerDamageMul', value: 1.12 }, { kind: 'fireRateMul', value: 1.12 }] } },

  // ── Map-altering (M11 S6): run-long changes to the battlefield itself ──
  { id: 'map-frozen-styx', name: 'Frozen Styx', desc: 'The Lake of Styx ices over — build on it for the rest of the run.', flavor: 'Even the river of the dead can be told to hold still. Briefly. Rudely.', icon: '❄️', rarity: 'rare', category: 'util', effect: { kind: 'frozenStyx' } },
  { id: 'map-blessed-grove', name: 'Blessed Grove', desc: "The Sacred Olive's blessing reaches twice as far.", flavor: 'Athena waters her tree. It has opinions about property lines now.', icon: '🌳', rarity: 'epic', category: 'util', effect: { kind: 'siteRadiusMul', value: 2 } },
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
    critChance: 0,
    critMult: 1,
    chainChance: 0,
    instakillChance: 0,
    camoRevealChance: 0,
    monotheistMul: 1,
    pantheonPerGod: 0,
    vengeancePerLife: 0,
    siteRadiusMul: 1,
    enemyHpMul: 1,
    enemySpeedMul: 1,
    bossBountyMul: 1,
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
    else if (e.kind === 'critChance') { rm.critChance += e.chance; rm.critMult = Math.max(rm.critMult, e.mult) }
    else if (e.kind === 'chainChance') rm.chainChance += e.chance
    else if (e.kind === 'instakillChance') rm.instakillChance += e.chance
    else if (e.kind === 'camoRevealChance') rm.camoRevealChance += e.chance
    else if (e.kind === 'monotheistMul') rm.monotheistMul = Math.max(rm.monotheistMul, e.value)
    else if (e.kind === 'pantheonPerGod') rm.pantheonPerGod += e.value
    else if (e.kind === 'vengeancePerLife') rm.vengeancePerLife += e.value
    else if (e.kind === 'siteRadiusMul') rm.siteRadiusMul *= e.value
    else if (e.kind === 'enemyHpMul') rm.enemyHpMul *= e.value
    else if (e.kind === 'enemySpeedMul') rm.enemySpeedMul *= e.value
    else if (e.kind === 'bossBountyMul') rm.bossBountyMul *= e.value
  }
  rm.fireRateMul = Math.min(rm.fireRateMul, FIRE_RATE_CAP)
  rm.towerDamageMul = Math.min(rm.towerDamageMul, TOWER_DAMAGE_CAP)
  for (const g of Object.keys(rm.godDamageMul) as (keyof typeof rm.godDamageMul)[]) {
    rm.godDamageMul[g] = Math.min(rm.godDamageMul[g], GOD_DAMAGE_CAP) // per-god boons compound in endless too
  }
  rm.demeterIncomeMul = Math.min(rm.demeterIncomeMul, DEMETER_INCOME_CAP)
  rm.knockbackMul = Math.min(rm.knockbackMul, KNOCKBACK_CAP)
  rm.auraRangeMul = Math.min(rm.auraRangeMul, AURA_RANGE_CAP)
  rm.critChance = Math.min(rm.critChance, CRIT_CHANCE_CAP)
  rm.chainChance = Math.min(rm.chainChance, CHAIN_CHANCE_CAP)
  rm.instakillChance = Math.min(rm.instakillChance, INSTAKILL_CHANCE_CAP)
  rm.camoRevealChance = Math.min(rm.camoRevealChance, CAMO_REVEAL_CAP)
  rm.monotheistMul = Math.min(rm.monotheistMul, MONOTHEIST_CAP)
  rm.pantheonPerGod = Math.min(rm.pantheonPerGod, PANTHEON_PER_GOD_CAP)
  rm.vengeancePerLife = Math.min(rm.vengeancePerLife, VENGEANCE_PER_LIFE_CAP)
  rm.siteRadiusMul = Math.min(rm.siteRadiusMul, SITE_RADIUS_CAP)
  return rm
}
