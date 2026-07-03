// Greek-themed obstacle DEAD ZONES — no-build areas placed in the build pockets to force real
// placement decisions on the otherwise-open map. Pure data; rendered (as props) by GameScene.

import type { Vec2 } from '../types'

export type ObstacleShape =
  | { kind: 'circle'; x: number; y: number; r: number }
  | { kind: 'rect'; x: number; y: number; w: number; h: number }
  /** An arbitrary convex-ish polygon (the Lake of Styx traces the road-ringed pocket). */
  | { kind: 'poly'; points: readonly Vec2[] }

export interface Obstacle {
  id: string
  label: string
  shape: ObstacleShape
  color: number
  /** Future hook: water gods (Poseidon) may build here; land gods may not. */
  terrain?: 'water'
}

export const OBSTACLES: readonly Obstacle[] = [
  // Ruined columns — upper-left build pocket.
  { id: 'columns', label: 'Ruined Columns', shape: { kind: 'circle', x: 90, y: 210, r: 24 }, color: 0x7a7d88 },
  // Boulder — right-side pocket, forces tower spacing on the approach to Olympus.
  { id: 'boulder', label: 'Boulder', shape: { kind: 'circle', x: 720, y: 200, r: 26 }, color: 0x4a4a52 },
  // Lake of Styx — FILLS the road-ringed central pocket (2026-07-03: the user wants the WHOLE
  // pocket). Land gods lose the pocket entirely; Poseidon gains a real domain (he builds on
  // water). Points RETRACED to the inpainted shoreline (obj_styx_patch alpha, 12-angle ring →
  // 8 vertices) so the placement footprint IS the visible water.
  {
    id: 'styx',
    label: 'Lake of Styx',
    shape: {
      kind: 'poly',
      points: [
        { x: 498, y: 278 },
        { x: 565, y: 275 },
        { x: 627, y: 283 },
        { x: 670, y: 292 },
        { x: 709, y: 333 },
        { x: 628, y: 386 },
        { x: 506, y: 386 },
        { x: 480, y: 333 },
      ],
    },
    color: 0x2f6f8c,
    terrain: 'water',
  },
  // Olive grove — upper-center pocket (nudged south in M9: the old anchor landed on a chasm cell
  // once cliffs became gameplay; the sacred tree needs solid ground).
  { id: 'olive', label: 'Olive Grove', shape: { kind: 'rect', x: 355, y: 180, w: 92, h: 46 }, color: 0x4a6b2f },
]
