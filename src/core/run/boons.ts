// ── src/core/run ── the Fate Draft's boon pool + how boons fold into run modifiers. Pure.
//
// M3 scope (pre-mortem cut): only effects with ONE real wiring site ship. Two are immediate
// grants (gold/lives) the RunController applies on pick; the rest are persistent multipliers
// folded into RunModifiers. Deferred to M5 (touch tower internals): build discount, +pierce,
// +chain (chaining isn't implemented yet, so a "bolts chain" boon would be a lie).

import type { GodKind } from '../data/towers'
import type { Modifiers } from '../progress/types'
import type { RunModifiers } from './types'

export type BoonEffect =
  | { kind: 'goldGrant'; value: number } // immediate: +gold now
  | { kind: 'livesGrant'; value: number } // immediate: +lives now
  | { kind: 'goldPerKillAdd'; value: number } // persistent: +gold per kill
  | { kind: 'towerDamageMul'; value: number } // persistent: all gods × damage
  | { kind: 'godDamageMul'; god: GodKind; value: number } // persistent: one god × damage
  | { kind: 'fireRateMul'; value: number } // persistent: all gods × fire rate

export interface Boon {
  id: string
  name: string
  description: string
  icon: string
  effect: BoonEffect
}

/** True for boons that change RunModifiers (vs. one-time grants the controller applies directly). */
export function isPersistentBoon(boon: Boon): boolean {
  const k = boon.effect.kind
  return k === 'goldPerKillAdd' || k === 'towerDamageMul' || k === 'godDamageMul' || k === 'fireRateMul'
}

/** The 6 effect-kinds the engine honors today (godDamage spans Zeus + Apollo → 7 boons). */
export const BOON_POOL: readonly Boon[] = [
  { id: 'midas', name: 'Midas Touch', icon: '🪙', description: '+150 gold, right now.', effect: { kind: 'goldGrant', value: 150 } },
  { id: 'ambrosia', name: 'Ambrosia', icon: '❤️', description: 'Restore 25 lives to Olympus.', effect: { kind: 'livesGrant', value: 25 } },
  { id: 'tribute', name: 'Tribute', icon: '💰', description: '+2 gold for every kill.', effect: { kind: 'goldPerKillAdd', value: 2 } },
  { id: 'wrath', name: 'Divine Wrath', icon: '⚔️', description: 'All gods deal 15% more damage.', effect: { kind: 'towerDamageMul', value: 1.15 } },
  { id: 'haste', name: "Hermes' Haste", icon: '🪽', description: 'All gods fire 15% faster.', effect: { kind: 'fireRateMul', value: 1.15 } },
  { id: 'zeus-fury', name: "Zeus's Fury", icon: '⚡', description: 'Zeus deals 30% more damage.', effect: { kind: 'godDamageMul', god: 'zeus', value: 1.3 } },
  { id: 'apollo-aim', name: "Apollo's Aim", icon: '🏹', description: 'Apollo deals 30% more damage.', effect: { kind: 'godDamageMul', god: 'apollo', value: 1.3 } },
]

/** A fresh RunModifiers seeded from the meta save (before any boon). */
export function baseRunModifiers(meta: Modifiers): RunModifiers {
  return {
    towerDamageMul: meta.towerDamageMul,
    fireRateMul: 1,
    goldPerKillBonus: 0,
    godDamageMul: { zeus: 1, apollo: 1 },
  }
}

/**
 * Fold the meta modifiers + the run's active (persistent) boons into RunModifiers. Pure — returns
 * a NEW object and never mutates `meta`. Immediate-grant boons are ignored here (the controller
 * applies them when picked); pass only persistent boons or the whole list (grants are skipped).
 */
export function foldRunModifiers(meta: Modifiers, boons: readonly Boon[]): RunModifiers {
  const rm = baseRunModifiers(meta)
  for (const b of boons) {
    const e = b.effect
    if (e.kind === 'goldPerKillAdd') rm.goldPerKillBonus += e.value
    else if (e.kind === 'towerDamageMul') rm.towerDamageMul *= e.value
    else if (e.kind === 'fireRateMul') rm.fireRateMul *= e.value
    else if (e.kind === 'godDamageMul') rm.godDamageMul[e.god] *= e.value
  }
  return rm
}
