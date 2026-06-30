// Pure 8-direction facing helpers for pixel sprites. No engine/React/zustand deps → unit-testable.
// Screen space convention: +x = east (right), +y = south (down). An angle is atan2(dy, dx).

export type Dir8 =
  | 'south'
  | 'south-east'
  | 'east'
  | 'north-east'
  | 'north'
  | 'north-west'
  | 'west'
  | 'south-west'

export const DIR8_ALL: readonly Dir8[] = [
  'south',
  'south-east',
  'east',
  'north-east',
  'north',
  'north-west',
  'west',
  'south-west',
]

// Bins every 45° starting at east, going clockwise on screen (where +y points down, so the first
// quarter-turn lands on south). Index = round(angle / 45°) mod 8.
const BY_BIN: readonly Dir8[] = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east']

/** Nearest of the 8 compass directions for a screen-space heading angle (radians, from atan2(dy, dx)). */
export function dir8(angleRad: number): Dir8 {
  let bin = Math.round((angleRad / (Math.PI * 2)) * 8) % 8
  if (bin < 0) bin += 8
  return BY_BIN[bin]
}

/** The direction a sprite at `from` should face to look toward `to` (screen space). */
export function dirToTarget(from: { x: number; y: number }, to: { x: number; y: number }): Dir8 {
  return dir8(Math.atan2(to.y - from.y, to.x - from.x))
}

/** Texture key for a creature's static directional rotation, e.g. dirKey('zeus','south') → 'zeus_south'. */
export function dirKey(base: string, dir: Dir8): string {
  return `${base}_${dir}`
}

/** Texture key for one animation frame, e.g. frameKey('skeleton','walk','south',2) → 'skeleton_walk_south_2'. */
export function frameKey(base: string, anim: string, dir: Dir8, frame: number): string {
  return `${base}_${anim}_${dir}_${frame}`
}
