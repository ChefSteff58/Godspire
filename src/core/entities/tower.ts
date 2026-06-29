import type { Vec2 } from '../types'
import type { TargetingMode } from '../systems/targeting'
import type { GodKind } from '../data/towers'
import { TOWER_STATS } from '../data/towers'

export interface Tower {
  id: string
  god: GodKind
  pos: Vec2
  range: number // BASE stat (effective stats come from towerEffectiveStats once upgraded)
  damage: number
  fireRate: number // shots per second
  cooldown: number // seconds until the next shot (counts down to 0)
  targeting: TargetingMode
  /** Tiers bought on each upgrade path (0–3). */
  pathA: number
  pathB: number
}

let nextId = 1

export function createTower(god: GodKind, pos: Vec2): Tower {
  const s = TOWER_STATS[god]
  return {
    id: `t${nextId++}`,
    god,
    pos: { x: pos.x, y: pos.y },
    range: s.range,
    damage: s.damage,
    fireRate: s.fireRate,
    cooldown: 0,
    targeting: s.defaultTargeting,
    pathA: 0,
    pathB: 0,
  }
}
