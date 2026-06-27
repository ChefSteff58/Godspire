// Greek-themed obstacle DEAD ZONES — no-build areas placed in build pockets to force real
// placement decisions on the otherwise-open Beginner map. Pure data; rendered by GameScene.

export type ObstacleShape =
  | { kind: 'circle'; x: number; y: number; r: number }
  | { kind: 'rect'; x: number; y: number; w: number; h: number }

export interface Obstacle {
  id: string
  label: string
  shape: ObstacleShape
  color: number
  /** Future hook: water gods (Poseidon) may build here; land gods may not. */
  terrain?: 'water'
}

export const OBSTACLES: readonly Obstacle[] = [
  // Ruined columns — deny the inside corner of the lower-left opener pocket.
  { id: 'columns', label: 'Ruined Columns', shape: { kind: 'circle', x: 150, y: 360, r: 24 }, color: 0x7a7d88 },
  // Boulder — sits in the lower-mid field, forcing tower spacing.
  { id: 'boulder', label: 'Boulder', shape: { kind: 'circle', x: 560, y: 490, r: 26 }, color: 0x4a4a52 },
  // Pool of Styx — contests the central crossroads pocket (water hook for Poseidon later).
  { id: 'styx', label: 'Pool of Styx', shape: { kind: 'circle', x: 590, y: 320, r: 30 }, color: 0x2f6f8c, terrain: 'water' },
  // Olive grove — breaks up the open top-left field.
  { id: 'olive', label: 'Olive Grove', shape: { kind: 'rect', x: 215, y: 95, w: 96, h: 46 }, color: 0x4a6b2f },
]
