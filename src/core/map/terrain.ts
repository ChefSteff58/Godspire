// ── src/core/map ── the map's TERRAIN TRUTH: which ground is chasm, stone, or grass.
//
// Pure math (zero imports beyond core). This moved here from src/game/render/wang.ts when cliffs
// became GAMEPLAY (M9): the render layer stamps tiles from these predicates AND placement rejects
// chasm cells from the same functions — one deterministic noise field, pixel-perfect agreement,
// and a map players can learn (it never reshuffles between sessions).

import type { Vec2 } from '../types'
import { OLYMPUS_PATH } from './path'
import { nearStyxShore } from './water'

/** Canonical terrain constants — the single source for render, placement, and tests. */
export const TERRAIN_SEED = 7
export const TERRAIN_TILE_PX = 32
export const RIFT_BIAS_RADIUS = 300
/** How far the gate's civilizing influence reaches (stone bonus + grass growth).
 *  380 → 420 at the 2026-07-03 S1 gate ("the grass adds exactly the vibe — let's get a little more"). */
export const GATE_BIAS_RADIUS = 420
/** The gate anchor IS the path's end — but the RIFT is PINNED: M10-S4 moved the spawn waypoint
 *  into the hellmouth bowl, and re-anchoring the noise there would reshuffle the ENTIRE map
 *  (every tile, both inpainted patches). The terrain scar stays where Tartarus tore it open. */
export const RIFT: Vec2 = { x: -30, y: 120 }
export const GATE: Vec2 = OLYMPUS_PATH[OLYMPUS_PATH.length - 1]

export type TerrainKind = 'chasm' | 'stone' | 'grass'

/** The Sacred Olive's LIFE HALO: Athena's first gift keeps a lush ring of buildable meadow around
 *  itself even as the rest of the map crumbles to chasm. Center mirrors sites.ts `sacred_olive`. */
export const OLIVE_CENTER: Vec2 = { x: 770, y: 110 }
export const OLIVE_HALO_RADIUS = 74
export function withinOliveHalo(x: number, y: number): boolean {
  return Math.hypot(x - OLIVE_CENTER.x, y - OLIVE_CENTER.y) <= OLIVE_HALO_RADIUS
}

/** Deterministic sin-hash in [0,1) — identical inputs give identical patterns on every boot. */
function seeded(n: number): number {
  const v = Math.sin(n * 9871.123) * 43758.5453
  return v - Math.floor(v)
}

/**
 * Band 1/2 boundary: buildable ground (stone-or-grass) vs CHASM. Two-octave value noise over the
 * 32px vertex lattice, pulled toward chasm near the rift and toward solid stone near the gate —
 * cliffs frame where the enemies pour in and all but vanish by Olympus.
 */
export function stonePredicate(
  seed = TERRAIN_SEED,
  riftCenter: Vec2 = RIFT,
  riftRadius = RIFT_BIAS_RADIUS,
  gateCenter: Vec2 = GATE,
  gateRadius = GATE_BIAS_RADIUS,
  tilePx = TERRAIN_TILE_PX,
): (x: number, y: number) => boolean {
  return (x, y) => {
    // The Lake of Styx + its shore ring is ALWAYS solid stone (M10-S2): chasm may never touch
    // water (the water→stone Wang set only knows one transition), and the shoreline becomes
    // genuinely buildable ground — render and placement share this one truth.
    if (nearStyxShore(x, y)) return true
    if (withinOliveHalo(x, y)) return true // the Sacred Olive's life halo — always solid ground
    const vx = Math.round(x / tilePx)
    const vy = Math.round(y / tilePx)
    // two octaves of smoothed value noise over the vertex lattice (low frequency dominates → patches)
    const n1 = seeded(seed + vx * 13.37 + vy * 7.77)
    const n2 = seeded(seed * 1.7 + Math.floor(vx / 3) * 31.7 + Math.floor(vy / 3) * 17.3)
    const noise = n1 * 0.35 + n2 * 0.65
    const dRift = Math.hypot(x - riftCenter.x, y - riftCenter.y)
    const dGate = Math.hypot(x - gateCenter.x, y - gateCenter.y)
    const chasmBias = Math.max(0, 1 - dRift / riftRadius) * 0.45 // near the rift, the world crumbles
    const stoneBias = Math.max(0, 1 - dGate / gateRadius) * 0.3 // near the gate, ground holds firm
    return noise - chasmBias + stoneBias > 0.38
  }
}

/**
 * Band 2/3 boundary: GRASS — a strict subset of stone BY CONSTRUCTION (grass only grows where the
 * ground is buildable), with independent noise octaves and a strong bias toward the Olympus gate.
 */
export function grassPredicate(
  seed = TERRAIN_SEED,
  riftCenter: Vec2 = RIFT,
  riftRadius = RIFT_BIAS_RADIUS,
  gateCenter: Vec2 = GATE,
  gateRadius = GATE_BIAS_RADIUS,
  tilePx = TERRAIN_TILE_PX,
): (x: number, y: number) => boolean {
  const stone = stonePredicate(seed, riftCenter, riftRadius, gateCenter, gateRadius, tilePx)
  return (x, y) => {
    if (!stone(x, y)) return false
    if (withinOliveHalo(x, y)) return true // lush grass rings the Sacred Olive even amid the crumble
    const vx = Math.round(x / tilePx)
    const vy = Math.round(y / tilePx)
    const g1 = seeded(seed * 3.1 + vx * 11.13 + vy * 5.71)
    const g2 = seeded(seed * 5.3 + Math.floor(vx / 3) * 23.9 + Math.floor(vy / 3) * 13.1)
    const gnoise = g1 * 0.35 + g2 * 0.65
    const grassBias = Math.max(0, 1 - Math.hypot(x - gateCenter.x, y - gateCenter.y) / gateRadius) * 0.5
    return gnoise + grassBias > 0.64 // grass-dominant by the gate, tufty midfield, none near the rift (0.72→0.68→0.64: M10 "more grass on the Olympus side")
  }
}

// canonical, memoized instances (the lattice is only ~31×18 vertices)
const stoneCanonical = stonePredicate()
const grassCanonical = grassPredicate()
const buildableMemo = new Map<number, boolean>()

/** THE placement contract: stone and grass build; chasm doesn't. Memoized per lattice vertex. */
export function isBuildableGround(x: number, y: number): boolean {
  // evaluate at the SNAPPED lattice vertex, not the raw point — otherwise the cached answer for a
  // cell depends on which pixel in it was queried first (and can contradict the rendered tile)
  const vx = Math.round(x / TERRAIN_TILE_PX)
  const vy = Math.round(y / TERRAIN_TILE_PX)
  const key = vy * 64 + vx
  const hit = buildableMemo.get(key)
  if (hit !== undefined) return hit
  const v = stoneCanonical(vx * TERRAIN_TILE_PX, vy * TERRAIN_TILE_PX)
  buildableMemo.set(key, v)
  return v
}

/** What the canonical map is at a point (render/decor read this; placement reads isBuildableGround). */
export function terrainAt(x: number, y: number): TerrainKind {
  if (!stoneCanonical(x, y)) return 'chasm'
  return grassCanonical(x, y) ? 'grass' : 'stone'
}
