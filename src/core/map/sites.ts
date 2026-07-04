// SACRED SITES (M10-S6) — positional blessings woven into the map's lore. Pure data + math,
// mirroring obstacles.ts: sites BUFF towers standing inside their radius, they never block
// placement (the obstacle layer still owns dead zones). GameScene folds siteBuffAt() into
// effective fire stats at fire time, exactly like auras — so the buff is live, never baked.

import type { Vec2 } from '../types'

export interface Site {
  id: string
  label: string
  /** The hover-lore line — this is a story beat, not a tooltip afterthought. */
  lore: string
  pos: Vec2
  radius: number
  effect: { fireRateMul?: number }
}

export const SITES: readonly Site[] = [
  {
    id: 'sacred_olive',
    label: 'Sacred Olive of Athena',
    lore: "Athena's first gift still grows here — gods in its shade strike swifter.",
    pos: { x: 401, y: 203 }, // the olive grove's center (rect 355,180 92×46)
    radius: 110,
    effect: { fireRateMul: 1.08 },
  },
]

/** Multiplicative fold of every site covering `pos`. Small on purpose (≤ +8-10% one stat). */
export function siteBuffAt(pos: Vec2): { fireRateMul: number } {
  let fireRateMul = 1
  for (const s of SITES) {
    if (Math.hypot(pos.x - s.pos.x, pos.y - s.pos.y) <= s.radius) {
      fireRateMul *= s.effect.fireRateMul ?? 1
    }
  }
  return { fireRateMul }
}
