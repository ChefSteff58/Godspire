// ── src/core/run ── the Fate Draft: 1-of-3 between waves. Pure & framework-agnostic.

import type { GodKind } from '../data/towers'
import type { Boon } from './boons'
import { BOON_POOL, RARITY_WEIGHT } from './boons'

/**
 * A draft card. M3 only ever emits `boon` (both gods start unlocked, and the tower-access decision
 * is TRADITIONAL — gods are gated by the skill tree, never per-run drafted). The `god` arm is kept
 * defined-but-UNUSED so the type/UI never need reshaping; do NOT flip it on.
 */
export type DraftOption =
  | { type: 'boon'; boon: Boon }
  | { type: 'god'; god: GodKind }

type Rng = () => number

/** Legendaries are gated to deeper runs so an early legendary can't trivialize the teach zone (M11). */
export const LEGENDARY_MIN_WAVE = 15

/** Build a draft: `count` DISTINCT boons, sampled WEIGHTED by rarity (rarer = scarcer). Pure. */
export function generateDraft(
  wave: number,
  rng: Rng = Math.random,
  count = 3,
  exclude?: (b: Boon) => boolean,
  owned?: ReadonlyMap<string, number>,
): DraftOption[] {
  const pool = BOON_POOL.filter(
    (b) => !exclude?.(b) && (b.rarity !== 'legendary' || Math.floor(wave) >= LEGENDARY_MIN_WAVE),
  )
  // Rarity odds ESCALATE with depth so the 6th draft of a run reads as a reward, not a rerun of the
  // 1st (fleet playtest: deep drafts were all-common). Already-owned boons are down-weighted (not
  // banned) so repeats become rare-but-possible instead of "the deck forgot I was there".
  const depthMul = 1 + Math.max(0, Math.floor(wave)) / 25
  const weightOf = (b: Boon): number => {
    const rarityW = b.rarity === 'common' ? RARITY_WEIGHT.common : RARITY_WEIGHT[b.rarity] * depthMul
    const ownedN = owned?.get(b.id) ?? 0
    return rarityW * 0.3 ** ownedN
  }
  const picks: Boon[] = []
  for (let n = 0; n < count && pool.length > 0; n++) {
    const total = pool.reduce((s, b) => s + weightOf(b), 0)
    let r = rng() * total
    let idx = 0
    for (let i = 0; i < pool.length; i++) {
      r -= weightOf(pool[i])
      if (r <= 0) { idx = i; break }
    }
    picks.push(pool[idx])
    pool.splice(idx, 1) // distinct: don't draw the same card twice in ONE draft
  }
  return picks.map((boon) => ({ type: 'boon', boon }))
}

/** The wave at which the NEXT draft fires — a Fate Draft every 5 waves (5, 10, 15, …). */
export function scheduleNextDraft(wave: number, _rng: Rng = Math.random): number {
  return Math.max(0, Math.floor(wave)) + 5
}

/**
 * M11 FATE BARGAIN — offered right before a boss (waves 19/39/…): each card binds a CURSE (a permanent
 * enemy buff) to a REWARD (a permanent boon). Picking one applies BOTH; "Walk Away" declines cleanly.
 * These are gambles, not draws — always the same 3 + decline, no rarity weighting or reroll.
 */
const FATE_BARGAINS: readonly Boon[] = [
  {
    id: 'bargain-trial-of-strength', name: 'Trial of Strength', bargain: true,
    curse: 'All enemies gain +20% HP', reward: 'All gods deal +30% damage',
    desc: 'Enemies +20% HP; all gods +30% damage — rest of run.',
    flavor: 'Strength is just a problem you have not hit hard enough yet.',
    icon: '⚖️', rarity: 'epic', category: 'syn',
    effect: { kind: 'composite', effects: [{ kind: 'enemyHpMul', value: 1.2 }, { kind: 'towerDamageMul', value: 1.3 }] },
  },
  {
    id: 'bargain-swift-doom', name: 'Swift Doom', bargain: true,
    curse: 'All enemies move +15% faster', reward: 'All gods fire +25% faster',
    desc: 'Enemies +15% speed; all gods +25% fire rate — rest of run.',
    flavor: 'Everyone runs. Some of you also shoot.',
    icon: '🌀', rarity: 'epic', category: 'syn',
    effect: { kind: 'composite', effects: [{ kind: 'enemySpeedMul', value: 1.15 }, { kind: 'fireRateMul', value: 1.25 }] },
  },
  {
    id: 'bargain-golden-toll', name: 'The Golden Toll', bargain: true,
    curse: 'All enemies gain +15% HP', reward: '+50% boss bounty & +350 gold now',
    desc: 'Enemies +15% HP; +50% boss bounty (rest of run) and +350 gold now.',
    flavor: 'The Fates take a cut. They always take a cut.',
    icon: '🏛️', rarity: 'epic', category: 'eco',
    effect: { kind: 'composite', effects: [{ kind: 'enemyHpMul', value: 1.15 }, { kind: 'bossBountyMul', value: 1.5 }, { kind: 'goldGrant', value: 350 }] },
  },
]

const BARGAIN_DECLINE: Boon = {
  id: 'bargain-decline', name: 'Walk Away', bargain: true,
  curse: 'No curse', reward: 'No gift',
  desc: 'Decline the bargain — the wave proceeds untouched.',
  flavor: 'Wisdom is knowing when the Fates are hustling you.',
  icon: '🚪', rarity: 'common', category: 'util',
  effect: { kind: 'composite', effects: [] }, // a clean no-op
}

/** The Fate Bargain set-piece: the 3 curse/reward gambles + a Walk Away, offered before a boss. */
export function generateFateBargain(_wave: number, _rng: Rng = Math.random): DraftOption[] {
  return [...FATE_BARGAINS, BARGAIN_DECLINE].map((boon) => ({ type: 'boon', boon }))
}
