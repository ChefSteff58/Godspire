import type { Vec2 } from '../../core/types'
import { distToPolyline } from '../../core/map/placement'

/**
 * Pure 2-corner Wang tiling for the FIXED map (no Phaser imports — unit-tested in plain Node, like
 * `facing.ts`). A PixelLab topdown tileset is 16 tiles, one per combination of which of a cell's four
 * corners sit on the "upper" terrain. We sample a predicate at every grid vertex, build the corner
 * mask per cell, and hand GameScene a flat list of placements to stamp as static Images.
 *
 * Corner bit order (FIXED, documented): NW=8, NE=4, SE=2, SW=1.
 */
export type CornerMask = number // 0..15

export interface TilePlacement {
  col: number
  row: number
  /** World px of the cell's top-left corner (col*tilePx, row*tilePx). */
  x: number
  y: number
  mask: CornerMask
}

/** Evaluate one cell: sample the predicate at its 4 corner vertices. */
export function cornerMask(
  col: number,
  row: number,
  tilePx: number,
  isUpper: (x: number, y: number) => boolean,
): CornerMask {
  const x0 = col * tilePx
  const y0 = row * tilePx
  const x1 = x0 + tilePx
  const y1 = y0 + tilePx
  let mask = 0
  if (isUpper(x0, y0)) mask |= 8 // NW
  if (isUpper(x1, y0)) mask |= 4 // NE
  if (isUpper(x1, y1)) mask |= 2 // SE
  if (isUpper(x0, y1)) mask |= 1 // SW
  return mask
}

/** The full grid: cols×rows placements (every cell, including solid mask 0 and 15). */
export function layoutWangTiles(
  cols: number,
  rows: number,
  tilePx: number,
  isUpper: (x: number, y: number) => boolean,
): TilePlacement[] {
  const out: TilePlacement[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      out.push({ col, row, x: col * tilePx, y: row * tilePx, mask: cornerMask(col, row, tilePx, isUpper) })
    }
  }
  return out
}

/** Road-corridor predicate: within `halfWidth` px of the path polyline (upper = road). */
export function roadPredicate(path: readonly Vec2[], halfWidth: number): (x: number, y: number) => boolean {
  return (x, y) => distToPolyline({ x, y }, path) <= halfWidth
}

/**
 * Deterministic sin-hash in [0,1) — the same idiom as GameScene.seeded, duplicated here so this
 * module stays Phaser-free. Identical inputs give identical patterns on every boot (a hard
 * requirement: the map must not reshuffle between sessions).
 */
function seeded(n: number): number {
  const v = Math.sin(n * 9871.123) * 43758.5453
  return v - Math.floor(v)
}

/**
 * Ground-variance predicate: low-frequency deterministic value noise deciding "upper" (stone) vs
 * "lower" (ash) patches, with a radial bias pulling terrain toward ash near `biasCenter` (the
 * Tartarus rift) — one 16-tile set buys an organic, story-flavored field instead of 510 clones.
 * Sampling is snapped to the vertex grid so all four cells sharing a vertex agree on it.
 */
export function groundPatchPredicate(
  seed: number,
  biasCenter: Vec2,
  biasRadius: number,
  tilePx = 32,
): (x: number, y: number) => boolean {
  return (x, y) => {
    const vx = Math.round(x / tilePx)
    const vy = Math.round(y / tilePx)
    // two octaves of smoothed value noise over the vertex lattice
    const n1 = seeded(seed + vx * 13.37 + vy * 7.77)
    const n2 = seeded(seed * 1.7 + Math.floor(vx / 3) * 31.7 + Math.floor(vy / 3) * 17.3)
    const noise = n1 * 0.35 + n2 * 0.65 // low-frequency dominates → patches, not confetti
    const d = Math.hypot(x - biasCenter.x, y - biasCenter.y)
    const ashBias = Math.max(0, 1 - d / biasRadius) * 0.45 // near the rift, ash wins more often
    return noise - ashBias > 0.38 // tuned threshold: ~stone-dominant field with real ash pockets
  }
}

/**
 * mask → tile index in the DOWNLOADED tileset files (`tile_<set>_<idx>.png`). PixelLab's on-disk
 * index ↔ corner convention is confirmed at import time against the example-map render; if it
 * differs from identity, remap HERE and nowhere else. Must always be a 16-permutation.
 */
export const WANG_TILE_FOR_MASK: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
