// Greek-themed obstacle DEAD ZONES — no-build areas placed in the build pockets to force real
// placement decisions on the otherwise-open map. Pure data; rendered (as props) by GameScene.

import type { Vec2 } from '../types'
import { STYX_POINTS } from './water'

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
  // M10 refine: the columns yield their grassy stage to the Sacred Olive and settle in the
  // bottom-left stonefield — ruins scattered where the lava floor gnaws at the world's rim.
  { id: 'columns', label: 'Ruined Columns', shape: { kind: 'circle', x: 78, y: 470, r: 24 }, color: 0x7a7d88 }, // 2026-07-08: nudged further into the bottom-left corner
  // (the mid-field boulder was removed 2026-07-08 — the stray grey rock read as clutter by the olive)
  // Lake of Styx — FILLS the road-ringed central pocket (2026-07-03: the user wants the WHOLE
  // pocket). Land gods lose the pocket entirely; Poseidon gains a real domain (he builds on
  // water). Points RETRACED to the inpainted shoreline (obj_styx_patch alpha, 12-angle ring →
  // 8 vertices) so the placement footprint IS the visible water.
  {
    id: 'styx',
    label: 'Lake of Styx',
    shape: { kind: 'poly', points: STYX_POINTS },
    color: 0x2f6f8c,
    terrain: 'water',
  },
  // The Sacred Olive — M10 refine: moved to its OWN space in the grass on the Olympus approach
  // (verified grass + buildable at its center). Athena's tree deserves a meadow, not a roadside.
  { id: 'olive', label: 'Olive Grove', shape: { kind: 'rect', x: 814, y: 137, w: 92, h: 46 }, color: 0x4a6b2f }, // 2026-07-08: moved into the grass beside the Olympus exit
]
