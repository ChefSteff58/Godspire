// Greek-themed obstacle DEAD ZONES — no-build areas placed in the build pockets to force real
// placement decisions on the otherwise-open map. Pure data; rendered (as props) by GameScene.

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
  // Ruined columns — upper-left build pocket.
  { id: 'columns', label: 'Ruined Columns', shape: { kind: 'circle', x: 90, y: 210, r: 24 }, color: 0x7a7d88 },
  // Boulder — right-side pocket, forces tower spacing on the approach to Olympus.
  { id: 'boulder', label: 'Boulder', shape: { kind: 'circle', x: 720, y: 200, r: 26 }, color: 0x4a4a52 },
  // Lake of Styx — FILLS the central pocket (2026-07-02 art direction: a real lake, not a pond).
  // Land gods lose most of the pocket; Poseidon gains a real domain (he builds on water).
  { id: 'styx', label: 'Lake of Styx', shape: { kind: 'circle', x: 590, y: 320, r: 60 }, color: 0x2f6f8c, terrain: 'water' },
  // Olive grove — upper-center pocket (nudged south in M9: the old anchor landed on a chasm cell
  // once cliffs became gameplay; the sacred tree needs solid ground).
  { id: 'olive', label: 'Olive Grove', shape: { kind: 'rect', x: 355, y: 180, w: 92, h: 46 }, color: 0x4a6b2f },
]
