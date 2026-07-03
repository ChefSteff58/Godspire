// The molten floor under the Tartarus cliffs (M10-S3) — RENDER truth only. Lava cells are still
// chasm for placement (nothing builds there); this module just decides which chasm turns molten.
//
// Approach: flood-fill the chasm vertices into 8-CONNECTED components and turn whole components
// molten when they're big (≥ MIN_COMPONENT verts) and near Tartarus (within LAVA_RIFT_RADIUS of
// the rift). Whole-blob replacement is what makes the Wang render conflict-free: with
// 8-connectivity, any two chasm corners of one cell are in the same component, so a cell is
// either all-lava-chasm or all-ash-chasm — never mixed — and both tilesets share the same stone
// upper base, so cliff lips are pixel-identical either way.

import { stonePredicate, RIFT, TERRAIN_TILE_PX } from './terrain'

export const LAVA_RIFT_RADIUS = 480
export const MIN_COMPONENT = 6

const COLS = 31 // lattice vertices 0..30 (30 cells)
const ROWS = 18 // lattice vertices 0..17 (17 cells)

const key = (vx: number, vy: number) => vy * 64 + vx

let cache: ReadonlySet<number> | null = null

/** The set of lattice-vertex keys (vy*64+vx) whose chasm is molten. Deterministic, memoized. */
export function lavaVertexSet(): ReadonlySet<number> {
  if (cache) return cache
  const stone = stonePredicate()
  const chasm = (vx: number, vy: number) =>
    vx >= 0 && vx < COLS && vy >= 0 && vy < ROWS && !stone(vx * TERRAIN_TILE_PX, vy * TERRAIN_TILE_PX)

  const seen = new Set<number>()
  const lava = new Set<number>()
  for (let vx = 0; vx < COLS; vx++) {
    for (let vy = 0; vy < ROWS; vy++) {
      if (!chasm(vx, vy) || seen.has(key(vx, vy))) continue
      // flood-fill this component (8-connected)
      const component: [number, number][] = []
      const stack: [number, number][] = [[vx, vy]]
      seen.add(key(vx, vy))
      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!
        component.push([cx, cy])
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue
            const nx = cx + dx
            const ny = cy + dy
            if (chasm(nx, ny) && !seen.has(key(nx, ny))) {
              seen.add(key(nx, ny))
              stack.push([nx, ny])
            }
          }
        }
      }
      // molten iff big enough AND the component reaches into Tartarus's reach
      const nearRift = component.some(
        ([cx, cy]) => Math.hypot(cx * TERRAIN_TILE_PX - RIFT.x, cy * TERRAIN_TILE_PX - RIFT.y) <= LAVA_RIFT_RADIUS,
      )
      if (component.length >= MIN_COMPONENT && nearRift) {
        for (const [cx, cy] of component) lava.add(key(cx, cy))
      }
    }
  }
  cache = lava
  return lava
}

/** Is the lattice vertex at world (x, y) molten chasm? (Render callers only.) */
export function isLavaVertex(x: number, y: number): boolean {
  const vx = Math.round(x / TERRAIN_TILE_PX)
  const vy = Math.round(y / TERRAIN_TILE_PX)
  return lavaVertexSet().has(key(vx, vy))
}
