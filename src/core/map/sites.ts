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
  /** EASTER EGG: one god has a special bond with this place (a tighter inner radius). */
  easterEgg?: { god: string; rangeMul: number; radius: number }
}

export const SITES: readonly Site[] = [
  {
    id: 'sacred_olive',
    label: 'Sacred Olive of Athena',
    lore: "Athena's first gift still grows here — gods in its shade strike swifter.",
    pos: { x: 770, y: 110 }, // the olive grove's center (rect 724,87 92×46 — its own grass)
    radius: 110,
    effect: { fireRateMul: 1.08 },
    // the easter egg: it is HER tree — Athena standing close to the trunk sees further
    easterEgg: { god: 'athena', rangeMul: 1.15, radius: 70 },
  },
]

/** Multiplicative fold of every site covering `pos` (+ per-god easter eggs at a tighter radius).
 *  Small on purpose (≤ +8-15% one stat). `radiusMul` grows every site's reach (M11 Blessed Grove). */
export function siteBuffAt(pos: Vec2, god?: string, radiusMul = 1): { fireRateMul: number; rangeMul: number } {
  let fireRateMul = 1
  let rangeMul = 1
  for (const s of SITES) {
    const d = Math.hypot(pos.x - s.pos.x, pos.y - s.pos.y)
    if (d <= s.radius * radiusMul) fireRateMul *= s.effect.fireRateMul ?? 1
    if (s.easterEgg && god === s.easterEgg.god && d <= s.easterEgg.radius * radiusMul) rangeMul *= s.easterEgg.rangeMul
  }
  return { fireRateMul, rangeMul }
}
