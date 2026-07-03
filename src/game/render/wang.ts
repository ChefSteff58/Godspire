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
 * The terrain noise itself lives in CORE now (src/core/map/terrain.ts) — cliffs became GAMEPLAY in
 * M9, so placement and rendering must share one deterministic truth. This module keeps the Wang
 * tiling machinery; re-export the canonical predicates for render callers.
 */
export { stonePredicate, grassPredicate, terrainAt, isBuildableGround } from '../../core/map/terrain'

/**
 * mask → tile index in the DOWNLOADED tileset files (`tile_<set>_<idx>.png`). PixelLab's on-disk
 * index ↔ corner convention is confirmed at import time against the example-map render; if it
 * differs from identity, remap HERE and nowhere else. Must always be a 16-permutation.
 */
export const WANG_TILE_FOR_MASK: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
